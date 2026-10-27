<?php

require_once dirname(__DIR__, 2) . '/config/database.php';
require_once dirname(__DIR__, 2) . '/core/Response.php';
require_once dirname(__DIR__, 2) . '/core/AuthService.php';
require_once dirname(__DIR__, 2) . '/core/Academic.php';

class Quanlydangky
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connect();
    }

    /**
     * Sinh viên đang đăng nhập (xác thực bằng JWT, không nhận id từ request).
     */
    private function getCurrentUser(): array
    {
        return AuthService::requireUser($this->db, ['sinh_vien']);
    }

    /**
     * Khoa của sinh viên: lớp sinh hoạt -> CTĐT -> chuyên ngành -> khoa.
     */
    private function khoaCuaSinhVien(int $sinhVienId): ?array
    {
        $stmt = $this->db->prepare('
            SELECT k.id, k.ma_khoa, k.ten_khoa
            FROM users u
            INNER JOIN lop_sinh_vien l ON l.id = u.lop_sinh_vien_id
            INNER JOIN chuong_trinh_dao_tao ct ON ct.id = l.chuong_trinh_id
            INNER JOIN chuyen_nganh cn ON cn.id = ct.chuyen_nganh_id
            INNER JOIN khoa k ON k.id = cn.khoa_id
            WHERE u.id = :id
        ');
        $stmt->execute([':id' => $sinhVienId]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Điều kiện SQL: môn học thuộc khoa (nằm trong CTĐT bắt buộc hoặc nhóm tự chọn
     * của một chương trình thuộc chuyên ngành của khoa).
     */
    private function monHocCuaKhoaSql(string $monHocColumn, string $param): string
    {
        return "{$monHocColumn} IN (
            SELECT ctct.mon_hoc_id
            FROM chi_tiet_chuong_trinh_dao_tao ctct
            INNER JOIN chuong_trinh_dao_tao ct1 ON ct1.id = ctct.chuong_trinh_id
            INNER JOIN chuyen_nganh cn1 ON cn1.id = ct1.chuyen_nganh_id
            WHERE cn1.khoa_id = {$param}_a
            UNION
            SELECT ctn.mon_hoc_id
            FROM chi_tiet_nhom_tu_chon ctn
            INNER JOIN nhom_tu_chon ntc ON ntc.id = ctn.nhom_tu_chon_id
            INNER JOIN chuong_trinh_dao_tao ct2 ON ct2.id = ntc.chuong_trinh_id
            INNER JOIN chuyen_nganh cn2 ON cn2.id = ct2.chuyen_nganh_id
            WHERE cn2.khoa_id = {$param}_b
        )";
    }

    /**
     * GET /api/dangkyhocphan/available
     * Danh sách lớp học phần mở đăng ký
     */
    public function available(): void
    {
        try {
            $user = $this->getCurrentUser();
            $sinhVienId = (int)$user['id'];

            $hocKy = (int)($_GET['hoc_ky'] ?? 0);
            $namHoc = trim((string)($_GET['nam_hoc'] ?? ''));
            if (!in_array($hocKy, [1, 2, 3], true) || !preg_match('/^\d{4}-\d{4}$/', $namHoc)) {
                Response::json(['success' => false, 'message' => 'Vui lòng chọn học kỳ và năm học hợp lệ.'], 422);
            }
            $search = trim($_GET['search'] ?? '');

            // Sinh viên chỉ thấy môn học thuộc khoa của mình
            $khoa = $this->khoaCuaSinhVien($sinhVienId);
            if (!$khoa) {
                Response::json([
                    'success' => true,
                    'khoa' => null,
                    'message' => 'Bạn chưa được phân lớp sinh hoạt / khoa nên chưa có học phần để đăng ký.',
                    'total' => 0,
                    'data' => []
                ]);
            }

            $sql = "
                SELECT lhp.*, 
                       mh.ten_mon_hoc, mh.so_tin_chi, mh.so_tiet,
                       u.ho_ten AS ten_giang_vien
                FROM lop_hoc_phan lhp
                INNER JOIN mon_hoc mh ON lhp.mon_hoc_id = mh.id
                LEFT JOIN users u ON lhp.giang_vien_user_id = u.id
                WHERE lhp.hoc_ky = :hoc_ky
                  AND lhp.nam_hoc = :nam_hoc
                  AND lhp.trang_thai != 'Đã hủy'
                  AND " . $this->monHocCuaKhoaSql('lhp.mon_hoc_id', ':khoa') . "
            ";

            if ($search !== '') {
                $sql .= " AND (lhp.ma_lop_hoc_phan LIKE :s1 OR mh.ten_mon_hoc LIKE :s2 OR u.ho_ten LIKE :s3)";
            }

            $stmt = $this->db->prepare($sql);
            $params = [
                ':hoc_ky' => $hocKy,
                ':nam_hoc' => $namHoc,
                ':khoa_a' => (int)$khoa['id'],
                ':khoa_b' => (int)$khoa['id']
            ];
            if ($search !== '') {
                $kw = '%' . $search . '%';
                $params[':s1'] = $kw;
                $params[':s2'] = $kw;
                $params[':s3'] = $kw;
            }
            $stmt->execute($params);
            $classes = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Lấy danh sách ID lớp học phần sinh viên đã đăng ký
            $registeredLhpIds = [];
            if ($sinhVienId > 0) {
                $dkStmt = $this->db->prepare("
                    SELECT lop_hoc_phan_id 
                    FROM dang_ky_hoc_phan 
                    WHERE sinh_vien_user_id = :sv_id 
                      AND trang_thai IN ('Đã đăng ký', 'da_dang_ky')
                ");
                $dkStmt->execute([':sv_id' => $sinhVienId]);
                $registeredLhpIds = $dkStmt->fetchAll(PDO::FETCH_COLUMN);
            }

            // Lấy lịch học và tính sĩ số từng lớp
            foreach ($classes as &$c) {
                $lhpId = (int)$c['id'];

                // Sĩ số hiện tại
                $ssStmt = $this->db->prepare("
                    SELECT COUNT(*) 
                    FROM dang_ky_hoc_phan 
                    WHERE lop_hoc_phan_id = :lhp_id 
                      AND trang_thai IN ('Đã đăng ký', 'da_dang_ky')
                ");
                $ssStmt->execute([':lhp_id' => $lhpId]);
                $c['si_so_hien_tai'] = (int)$ssStmt->fetchColumn();
                $c['is_full'] = $c['si_so_hien_tai'] >= (int)$c['si_so_toi_da'];

                // Trạng thái đã đăng ký
                $c['is_registered'] = in_array($lhpId, $registeredLhpIds, true);

                // Lịch học
                $lhStmt = $this->db->prepare("
                    SELECT * FROM lich_hoc WHERE lop_hoc_phan_id = :lhp_id ORDER BY thu, tiet_bat_dau
                ");
                $lhStmt->execute([':lhp_id' => $lhpId]);
                $c['lich_hoc'] = $lhStmt->fetchAll(PDO::FETCH_ASSOC);

                // Kiểm tra thời gian đăng ký (RULE-08)
                // Căn cứ theo trường nếu có trong lop_hoc_phan hoặc dang_ky_hoc_phan
                // RULE-08: thời gian đăng ký do nhà trường thiết lập trên từng lớp học phần
                $c['da_thiet_lap_thoi_gian'] = !empty($c['thoi_gian_mo_dang_ky']) && !empty($c['thoi_gian_dong_dang_ky']);

                $now = date('Y-m-d H:i:s');
                $c['is_open_time'] = $c['da_thiet_lap_thoi_gian']
                    && $now >= $c['thoi_gian_mo_dang_ky'] && $now <= $c['thoi_gian_dong_dang_ky'];
            }
            unset($c);

            Response::json([
                'success' => true,
                'khoa' => $khoa,
                'total' => count($classes),
                'data' => $classes
            ]);
        } catch (Throwable $e) {
            error_log((string)$e);
            Response::json([
                'success' => false,
                'message' => 'Lỗi máy chủ khi tải danh sách lớp học phần: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * GET /api/dangkyhocphan/registered
     * Danh sách lớp học phần đã đăng ký của sinh viên
     */
    public function registered(): void
    {
        try {
            $user = $this->getCurrentUser();
            $sinhVienId = (int)$user['id'];

            if ($sinhVienId <= 0) {
                Response::json([
                    'success' => false,
                    'message' => 'Vui lòng cung cấp mã sinh viên hoặc đăng nhập hợp lệ.'
                ], 401);
            }

            $sql = "
                SELECT dk.id AS dang_ky_id, dk.ngay_dang_ky, dk.trang_thai AS trang_thai_dk,
                       lhp.id AS lop_hoc_phan_id, lhp.ma_lop_hoc_phan, lhp.hoc_ky, lhp.nam_hoc,
                       lhp.phong_hoc, lhp.si_so_toi_da, lhp.thoi_gian_mo_dang_ky, lhp.thoi_gian_dong_dang_ky,
                       mh.id AS mon_hoc_id, mh.ma_mon_hoc, mh.ten_mon_hoc, mh.so_tin_chi,
                       u.ho_ten AS ten_giang_vien
                FROM dang_ky_hoc_phan dk
                INNER JOIN lop_hoc_phan lhp ON dk.lop_hoc_phan_id = lhp.id
                INNER JOIN mon_hoc mh ON lhp.mon_hoc_id = mh.id
                LEFT JOIN users u ON lhp.giang_vien_user_id = u.id
                WHERE dk.sinh_vien_user_id = :sv_id
            ";
            $params = [':sv_id' => $sinhVienId];
            if (!empty($_GET['hoc_ky'])) {
                $sql .= ' AND lhp.hoc_ky = :hk';
                $params[':hk'] = (int)$_GET['hoc_ky'];
            }
            if (!empty($_GET['nam_hoc'])) {
                $sql .= ' AND lhp.nam_hoc = :nh';
                $params[':nh'] = (string)$_GET['nam_hoc'];
            }
            $sql .= ' ORDER BY dk.id DESC';

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $list = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $totalCredits = 0;
            foreach ($list as &$item) {
                if (in_array($item['trang_thai_dk'], ['Đã đăng ký', 'da_dang_ky'], true)) {
                    $totalCredits += (int)$item['so_tin_chi'];
                }

                // Lịch học
                $lhStmt = $this->db->prepare("
                    SELECT * FROM lich_hoc WHERE lop_hoc_phan_id = :lhp_id ORDER BY thu, tiet_bat_dau
                ");
                $lhStmt->execute([':lhp_id' => $item['lop_hoc_phan_id']]);
                $item['lich_hoc'] = $lhStmt->fetchAll(PDO::FETCH_ASSOC);

                // RULE-08: cho giao diện biết có được hủy không và lý do (cùng điều kiện với API hủy)
                $lyDo = in_array($item['trang_thai_dk'], ['Đã đăng ký', 'da_dang_ky'], true)
                    ? $this->lyDoKhongTheHuy((int) $item['dang_ky_id'], $item) : 'Đã hủy';
                $item['co_the_huy'] = $lyDo === null;
                $item['ly_do_khong_huy'] = $lyDo;
            }
            unset($item);

            Response::json([
                'success' => true,
                'total_credits' => $totalCredits,
                'total' => count($list),
                'data' => $list
            ]);
        } catch (Throwable $e) {
            error_log((string)$e);
            Response::json([
                'success' => false,
                'message' => 'Lỗi máy chủ khi tải danh sách đăng ký: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * POST /api/dangkyhocphan/register
     * Đăng ký một lớp học phần và kiểm tra toàn bộ điều kiện nghiệp vụ
     */
    public function register(): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::json(['success' => false, 'message' => 'Phương thức không được hỗ trợ.'], 405);
        }

        $input = json_decode(file_get_contents('php://input'), true);
        if (!is_array($input)) {
            Response::json(['success' => false, 'message' => 'Dữ liệu JSON không hợp lệ.'], 400);
        }

        $user = $this->getCurrentUser();
        $sinhVienId = (int)$user['id'];
        $lhpId = (int)($input['lop_hoc_phan_id'] ?? 0);

        if ($sinhVienId <= 0 || $lhpId <= 0) {
            Response::json(['success' => false, 'message' => 'Thiếu thông tin sinh viên hoặc lớp học phần.'], 422);
        }

        try {
            // Lấy thông tin sinh viên
            $svStmt = $this->db->prepare('SELECT * FROM users WHERE id = :id LIMIT 1');
            $svStmt->execute([':id' => $sinhVienId]);
            $sv = $svStmt->fetch(PDO::FETCH_ASSOC);

            if (!$sv) {
                Response::json(['success' => false, 'message' => 'Không tìm thấy thông tin sinh viên.'], 404);
            }

            // Lấy thông tin lớp học phần và môn học
            $lhpStmt = $this->db->prepare("
                SELECT lhp.*, mh.ten_mon_hoc, mh.so_tin_chi
                FROM lop_hoc_phan lhp
                INNER JOIN mon_hoc mh ON lhp.mon_hoc_id = mh.id
                WHERE lhp.id = :id
                LIMIT 1
            ");
            $lhpStmt->execute([':id' => $lhpId]);
            $targetLHP = $lhpStmt->fetch(PDO::FETCH_ASSOC);

            if (!$targetLHP) {
                Response::json(['success' => false, 'message' => 'Lớp học phần không tồn tại.'], 404);
            }

            // 1. Kiểm tra môn học. Trạng thái đăng ký của lớp chỉ tính theo thời gian mở/đóng (RULE-08, bước 2)
            if ($targetLHP['trang_thai'] === 'Đã hủy') {
                Response::json(['success' => false, 'message' => 'Lớp học phần đang đóng đăng ký.'], 400);
            }

            // 2. RULE-08: Kiểm soát thời gian đăng ký học phần
            $now = date('Y-m-d H:i:s');
            $moDK = $targetLHP['thoi_gian_mo_dang_ky'];
            $dongDK = $targetLHP['thoi_gian_dong_dang_ky'];
            if (empty($moDK) || empty($dongDK)) {
                Response::json([
                    'success' => false,
                    'message' => 'Lớp học phần đang đóng đăng ký.'
                ], 400);
            }

            if ($now < $moDK || $now > $dongDK) {
                Response::json([
                    'success' => false,
                    'message' => 'Lớp học phần đang đóng đăng ký (thời gian đăng ký: ' . $moDK . ' đến ' . $dongDK . ').'
                ], 400);
            }

            // 3a. Chỉ được đăng ký môn học thuộc khoa của sinh viên
            $khoa = $this->khoaCuaSinhVien($sinhVienId);
            if (!$khoa) {
                Response::json([
                    'success' => false,
                    'message' => 'Bạn chưa được phân lớp sinh hoạt / khoa nên không thể đăng ký học phần.'
                ], 400);
            }
            $khoaStmt = $this->db->prepare('SELECT 1 WHERE ' . $this->monHocCuaKhoaSql(':mh', ':khoa'));
            $khoaStmt->execute([':mh' => $targetLHP['mon_hoc_id'], ':khoa_a' => $khoa['id'], ':khoa_b' => $khoa['id']]);
            if ($khoaStmt->fetchColumn() === false) {
                Response::json([
                    'success' => false,
                    'message' => 'Môn học "' . $targetLHP['ten_mon_hoc'] . '" không thuộc ' . $khoa['ten_khoa'] . ' (khoa của bạn), không thể đăng ký!'
                ], 403);
            }

            // 3. RULE-01 & CTĐT: Kiểm tra môn học có thuộc CTĐT của sinh viên không
            if (!empty($sv['lop_sinh_vien_id'])) {
                $lsvStmt = $this->db->prepare('SELECT chuong_trinh_id FROM lop_sinh_vien WHERE id = :id');
                $lsvStmt->execute([':id' => $sv['lop_sinh_vien_id']]);
                $ctdtId = $lsvStmt->fetchColumn();

                if ($ctdtId) {
                    // Kiểm tra môn bắt buộc
                    $checkReq = $this->db->prepare('
                        SELECT COUNT(*) FROM chi_tiet_chuong_trinh_dao_tao 
                        WHERE chuong_trinh_id = :ctdt_id AND mon_hoc_id = :mh_id
                    ');
                    $checkReq->execute([':ctdt_id' => $ctdtId, ':mh_id' => $targetLHP['mon_hoc_id']]);
                    $isInRequired = (int)$checkReq->fetchColumn() > 0;

                    // Kiểm tra môn tự chọn
                    $checkElec = $this->db->prepare('
                        SELECT COUNT(*) FROM chi_tiet_nhom_tu_chon ct
                        INNER JOIN nhom_tu_chon ntc ON ct.nhom_tu_chon_id = ntc.id
                        WHERE ntc.chuong_trinh_id = :ctdt_id AND ct.mon_hoc_id = :mh_id
                    ');
                    $checkElec->execute([':ctdt_id' => $ctdtId, ':mh_id' => $targetLHP['mon_hoc_id']]);
                    $isInElective = (int)$checkElec->fetchColumn() > 0;

                    if (!$isInRequired && !$isInElective) {
                        Response::json([
                            'success' => false,
                            'message' => 'Môn học "' . $targetLHP['ten_mon_hoc'] . '" không nằm trong khung chương trình đào tạo của bạn!'
                        ], 400);
                    }
                }
            }

            // 4. Kiểm tra sĩ số tối đa
            $ssStmt = $this->db->prepare("
                SELECT COUNT(*) FROM dang_ky_hoc_phan 
                WHERE lop_hoc_phan_id = :lhp_id AND trang_thai IN ('Đã đăng ký', 'da_dang_ky')
            ");
            $ssStmt->execute([':lhp_id' => $lhpId]);
            $currentSiSo = (int)$ssStmt->fetchColumn();

            if ($currentSiSo >= (int)$targetLHP['si_so_toi_da']) {
                Response::json([
                    'success' => false,
                    'message' => 'Đăng ký không thành công! Lớp học phần đã đủ sĩ số tối đa (' . $targetLHP['si_so_toi_da'] . ').'
                ], 400);
            }

            // Lấy danh sách lớp sinh viên đang đăng ký thành công trong kỳ này
            $myCurrentDkStmt = $this->db->prepare("
                SELECT dk.*, lhp.mon_hoc_id, lhp.ma_lop_hoc_phan, lhp.hoc_ky, lhp.nam_hoc, mh.so_tin_chi
                FROM dang_ky_hoc_phan dk
                INNER JOIN lop_hoc_phan lhp ON dk.lop_hoc_phan_id = lhp.id
                INNER JOIN mon_hoc mh ON lhp.mon_hoc_id = mh.id
                WHERE dk.sinh_vien_user_id = :sv_id 
                  AND dk.trang_thai IN ('Đã đăng ký', 'da_dang_ky')
            ");
            $myCurrentDkStmt->execute([':sv_id' => $sinhVienId]);
            $myActiveDks = $myCurrentDkStmt->fetchAll(PDO::FETCH_ASSOC);

            // 5. Kiểm tra trùng môn học trong kỳ
            foreach ($myActiveDks as $adk) {
                if ((int)$adk['hoc_ky'] === (int)$targetLHP['hoc_ky'] && $adk['nam_hoc'] === $targetLHP['nam_hoc']) {
                    if ((int)$adk['mon_hoc_id'] === (int)$targetLHP['mon_hoc_id']) {
                        Response::json([
                            'success' => false,
                            'message' => 'Bạn đã đăng ký môn học này trong kỳ (Lớp: ' . $adk['ma_lop_hoc_phan'] . ') rồi!'
                        ], 400);
                    }
                }
            }

            // 6. Kiểm tra giới hạn tín chỉ học kỳ (≤ 24 tín chỉ)
            $currentTotalTC = 0;
            foreach ($myActiveDks as $adk) {
                if ((int)$adk['hoc_ky'] === (int)$targetLHP['hoc_ky'] && $adk['nam_hoc'] === $targetLHP['nam_hoc']) {
                    $currentTotalTC += (int)$adk['so_tin_chi'];
                }
            }

            if ($currentTotalTC + (int)$targetLHP['so_tin_chi'] > Academic::MAX_TIN_CHI_HOC_KY) {
                Response::json([
                    'success' => false,
                    'message' => 'Vượt quá giới hạn đăng ký! Bạn đã đăng ký ' . $currentTotalTC . ' TC (tối đa ' . Academic::MAX_TIN_CHI_HOC_KY . ' TC/kỳ).'
                ], 400);
            }

            // 7. Kiểm tra trùng lịch học
            $targetLichStmt = $this->db->prepare('SELECT * FROM lich_hoc WHERE lop_hoc_phan_id = :lhp_id');
            $targetLichStmt->execute([':lhp_id' => $lhpId]);
            $targetLichList = $targetLichStmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($myActiveDks as $adk) {
                $regLichStmt = $this->db->prepare('SELECT * FROM lich_hoc WHERE lop_hoc_phan_id = :lhp_id');
                $regLichStmt->execute([':lhp_id' => $adk['lop_hoc_phan_id']]);
                $regLichList = $regLichStmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($targetLichList as $tLich) {
                    foreach ($regLichList as $rLich) {
                        if ((int)$tLich['thu'] === (int)$rLich['thu']) {
                            $periodOverlap = ((int)$tLich['tiet_bat_dau'] <= (int)$rLich['tiet_ket_thuc']) &&
                                             ((int)$tLich['tiet_ket_thuc'] >= (int)$rLich['tiet_bat_dau']);
                            $dateOverlap = ($tLich['ngay_bat_dau'] <= $rLich['ngay_ket_thuc']) &&
                                           ($tLich['ngay_ket_thuc'] >= $rLich['ngay_bat_dau']);

                            if ($periodOverlap && $dateOverlap) {
                                Response::json([
                                    'success' => false,
                                    'message' => 'Trùng lịch học vào Thứ ' . $tLich['thu'] . ' (Tiết ' . $tLich['tiet_bat_dau'] . '-' . $tLich['tiet_ket_thuc'] . ') với lớp ' . $adk['ma_lop_hoc_phan'] . '!'
                                ], 400);
                            }
                        }
                    }
                }
            }

            // 8. RÀNG BUỘC NHÓM MÔN TỰ CHỌN (RULE-02 → RULE-06)
            //    Lấy các nhóm của CTĐT sinh viên từ dữ liệu, thứ tự theo mã nhóm (A → B → C...).
            //    Muốn đăng ký môn thuộc một nhóm thì mọi nhóm đứng trước phải đạt đủ số tín chỉ tối thiểu.
            $ctdtSv = null;
            if (!empty($sv['lop_sinh_vien_id'])) {
                $q = $this->db->prepare('SELECT chuong_trinh_id FROM lop_sinh_vien WHERE id = :id');
                $q->execute([':id' => $sv['lop_sinh_vien_id']]);
                $ctdtSv = $q->fetchColumn() ?: null;
            }

            if ($ctdtSv) {
                $groupsStmt = $this->db->prepare('
                    SELECT id, ma_nhom, ten_nhom, so_tin_chi_toi_thieu
                    FROM nhom_tu_chon WHERE chuong_trinh_id = :c ORDER BY ma_nhom
                ');
                $groupsStmt->execute([':c' => $ctdtSv]);
                $groups = $groupsStmt->fetchAll(PDO::FETCH_ASSOC);

                $inGroup = $this->db->prepare('SELECT 1 FROM chi_tiet_nhom_tu_chon WHERE nhom_tu_chon_id = :n AND mon_hoc_id = :m');
                $targetIndex = null;
                foreach ($groups as $i => $g) {
                    $inGroup->execute([':n' => $g['id'], ':m' => $targetLHP['mon_hoc_id']]);
                    if ($inGroup->fetchColumn()) {
                        $targetIndex = $i;
                        break;
                    }
                }

                if ($targetIndex !== null && $targetIndex > 0) {
                    // Tín chỉ ĐẠT của sinh viên trong một nhóm (mỗi môn tính một lần)
                    $passedStmt = $this->db->prepare("
                        SELECT COALESCE(SUM(mh.so_tin_chi), 0) FROM mon_hoc mh
                        WHERE mh.id IN (
                            SELECT ct.mon_hoc_id FROM chi_tiet_nhom_tu_chon ct WHERE ct.nhom_tu_chon_id = :n
                        )
                        AND mh.id IN (
                            SELECT lhp.mon_hoc_id FROM dang_ky_hoc_phan dk
                            INNER JOIN lop_hoc_phan lhp ON lhp.id = dk.lop_hoc_phan_id
                            INNER JOIN diem d ON d.dang_ky_id = dk.id
                            WHERE dk.sinh_vien_user_id = :sv AND d.ket_qua = 'Đạt'
                              AND " . Academic::activeDkSql('dk.trang_thai') . "
                        )
                    ");

                    $thieu = [];
                    for ($i = 0; $i < $targetIndex; $i++) {
                        $g = $groups[$i];
                        $passedStmt->execute([':n' => $g['id'], ':sv' => $sinhVienId]);
                        $dat = (int)$passedStmt->fetchColumn();
                        if ($dat < (int)$g['so_tin_chi_toi_thieu']) {
                            $thieu[] = $g['ten_nhom'] . ' (' . $g['ma_nhom'] . '): đạt ' . $dat . '/' . $g['so_tin_chi_toi_thieu'] . ' TC';
                        }
                    }

                    if ($thieu) {
                        $target = $groups[$targetIndex];
                        Response::json([
                            'success' => false,
                            'message' => 'Chưa đủ điều kiện đăng ký môn thuộc ' . $target['ten_nhom'] . '. Cần hoàn thành nhóm tự chọn trước đó: ' . implode('; ', $thieu) . '.'
                        ], 400);
                    }
                }
            }

            // HỢP LỆ TOÀN BỘ -> Lưu vào bảng dang_ky_hoc_phan
            $this->db->beginTransaction();

            // Kiểm tra xem sinh viên từng đăng ký trước đó (và đã hủy) chưa
            $existStmt = $this->db->prepare('
                SELECT id FROM dang_ky_hoc_phan 
                WHERE sinh_vien_user_id = :sv_id AND lop_hoc_phan_id = :lhp_id 
                LIMIT 1
            ');
            $existStmt->execute([':sv_id' => $sinhVienId, ':lhp_id' => $lhpId]);
            $existingDkId = $existStmt->fetchColumn();

            $nowIso = date('c');
            if ($existingDkId !== false) {
                $upStmt = $this->db->prepare("
                    UPDATE dang_ky_hoc_phan 
                    SET trang_thai = 'Đã đăng ký', ngay_dang_ky = :ngay_dk
                    WHERE id = :id
                ");
                $upStmt->execute([':ngay_dk' => $nowIso, ':id' => $existingDkId]);

                // Xóa điểm cũ nếu có
                $this->db->prepare('DELETE FROM diem WHERE dang_ky_id = :dk_id')->execute([':dk_id' => $existingDkId]);
            } else {
                $insStmt = $this->db->prepare("
                    INSERT INTO dang_ky_hoc_phan 
                        (sinh_vien_user_id, lop_hoc_phan_id, ngay_dang_ky, thoi_gian_mo_dang_ky, thoi_gian_dong_dang_ky, trang_thai)
                    VALUES 
                        (:sv_id, :lhp_id, :ngay_dk, :mo_dk, :dong_dk, 'Đã đăng ký')
                ");
                $insStmt->execute([
                    ':sv_id' => $sinhVienId,
                    ':lhp_id' => $lhpId,
                    ':ngay_dk' => $nowIso,
                    ':mo_dk' => $moDK,
                    ':dong_dk' => $dongDK
                ]);
            }

            $this->db->commit();

            Response::json([
                'success' => true,
                'message' => 'Đăng ký học phần ' . $targetLHP['ma_lop_hoc_phan'] . ' thành công!'
            ]);
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log((string)$e);
            Response::json([
                'success' => false,
                'message' => 'Lỗi máy chủ khi đăng ký học phần: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * POST /api/dangkyhocphan/cancel
     * Hủy đăng ký học phần
     */
    public function cancel(): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            Response::json(['success' => false, 'message' => 'Phương thức không được hỗ trợ.'], 405);
        }

        $input = json_decode(file_get_contents('php://input'), true);
        if (!is_array($input)) {
            Response::json(['success' => false, 'message' => 'Dữ liệu JSON không hợp lệ.'], 400);
        }

        $user = $this->getCurrentUser();
        $sinhVienId = (int)$user['id'];
        $dkId = (int)($input['dang_ky_id'] ?? 0);

        if ($dkId <= 0) {
            Response::json(['success' => false, 'message' => 'Thiếu mã đăng ký học phần.'], 422);
        }

        try {
            $stmt = $this->db->prepare('SELECT * FROM dang_ky_hoc_phan WHERE id = :id LIMIT 1');
            $stmt->execute([':id' => $dkId]);
            $dk = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$dk) {
                Response::json(['success' => false, 'message' => 'Không tìm thấy bản ghi đăng ký.'], 404);
            }

            if ((int)$dk['sinh_vien_user_id'] !== $sinhVienId) {
                Response::json(['success' => false, 'message' => 'Bạn không có quyền hủy đăng ký của sinh viên khác.'], 403);
            }

            // Kiểm tra lớp học phần
            $lhpStmt = $this->db->prepare('SELECT * FROM lop_hoc_phan WHERE id = :id');
            $lhpStmt->execute([':id' => $dk['lop_hoc_phan_id']]);
            $lhp = $lhpStmt->fetch(PDO::FETCH_ASSOC);

            // RULE-08: lớp đang mở đăng ký thì hủy được, lớp đóng đăng ký thì không
            $lyDo = $this->lyDoKhongTheHuy($dkId, $lhp ?: []);
            if ($lyDo !== null) {
                Response::json(['success' => false, 'message' => 'Không thể hủy đăng ký: ' . $lyDo], 400);
            }

            // Cập nhật trạng thái 'Đã hủy'
            $upStmt = $this->db->prepare("UPDATE dang_ky_hoc_phan SET trang_thai = 'Đã hủy' WHERE id = :id");
            $upStmt->execute([':id' => $dkId]);

            Response::json([
                'success' => true,
                'message' => 'Đã hủy đăng ký thành công!'
            ]);
        } catch (Throwable $e) {
            error_log((string)$e);
            Response::json([
                'success' => false,
                'message' => 'Lỗi máy chủ khi hủy đăng ký: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * GET /api/dangkyhocphan/thoi-khoa-bieu?hoc_ky=1&nam_hoc=2026-2027&tu_ngay=2026-10-26
     * tu_ngay: một ngày bất kỳ trong tuần cần xem (hệ thống lấy Thứ 2 của tuần đó).
     * RULE-09: lọc theo học kỳ, năm học, tuần; SV chỉ lớp đã đăng ký chưa hủy, GV chỉ lớp phụ trách.
     * RULE-11: tính số tiết trong tuần và tổng số tiết dự kiến đã học đến hết tuần đang chọn.
     */
    public function thoiKhoaBieu(): void
    {
        $user = AuthService::requireUser($this->db);

        $hocKy = (int)($_GET['hoc_ky'] ?? 0);
        $namHoc = trim((string)($_GET['nam_hoc'] ?? ''));
        $tuNgay = trim((string)($_GET['tu_ngay'] ?? date('Y-m-d')));

        $d = DateTime::createFromFormat('!Y-m-d', $tuNgay);
        if (!in_array($hocKy, [1, 2, 3], true) || !preg_match('/^\d{4}-\d{4}$/', $namHoc) || !$d || $d->format('Y-m-d') !== $tuNgay) {
            Response::json([
                'success' => false,
                'message' => 'Vui lòng chọn học kỳ, năm học và ngày trong tuần hợp lệ (YYYY-MM-DD).'
            ], 422);
        }

        $weekStart = (clone $d)->modify('-' . ((int)$d->format('N') - 1) . ' days');
        $weekEnd = (clone $weekStart)->modify('+6 days');
        $ws = $weekStart->format('Y-m-d');
        $we = $weekEnd->format('Y-m-d');

        $sql = "
            SELECT lhp.id, lhp.ma_lop_hoc_phan, lhp.phong_hoc, lhp.hoc_ky, lhp.nam_hoc,
                   mh.ma_mon_hoc, mh.ten_mon_hoc, mh.so_tin_chi, gv.ho_ten AS ten_giang_vien
            FROM lop_hoc_phan lhp
            INNER JOIN mon_hoc mh ON mh.id = lhp.mon_hoc_id
            LEFT JOIN users gv ON gv.id = lhp.giang_vien_user_id
            WHERE lhp.hoc_ky = :hk AND lhp.nam_hoc = :nh
        ";
        $params = [':hk' => $hocKy, ':nh' => $namHoc];

        if ($user['vai_tro'] === 'sinh_vien') {
            $sql .= " AND EXISTS (SELECT 1 FROM dang_ky_hoc_phan dk
                                  WHERE dk.lop_hoc_phan_id = lhp.id
                                    AND dk.sinh_vien_user_id = :uid
                                    AND " . Academic::activeDkSql('dk.trang_thai') . ")";
            $params[':uid'] = $user['id'];
        } elseif ($user['vai_tro'] === 'giang_vien') {
            $sql .= ' AND lhp.giang_vien_user_id = :uid';
            $params[':uid'] = $user['id'];
        } else {
            // Quản trị viên xem toàn bộ lớp chưa hủy của học kỳ
            $sql .= " AND lhp.trang_thai != 'Đã hủy'";
        }

        $stmt = $this->db->prepare($sql . ' ORDER BY mh.ten_mon_hoc');
        $stmt->execute($params);
        $classes = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $buoiHoc = [];
        $tietTrongTuan = 0;
        $tietTichLuy = 0;
        $monTrongTuan = [];

        // RULE-09, RULE-DL-04, RULE-XL: hiển thị đúng các buổi học đã được xếp (buoi_hoc), mỗi buổi chiếm đúng tiết của buổi;
        // giờ học hiển thị ở frontend theo bảng 13 tiết cố định (RULE-TKB-04)
        $buoiStmt = $this->db->prepare('
            SELECT b.id, b.lich_hoc_id, b.ngay_hoc, b.tiet_bat_dau, b.tiet_ket_thuc
            FROM buoi_hoc b INNER JOIN lich_hoc lh ON lh.id = b.lich_hoc_id
            WHERE lh.lop_hoc_phan_id = :id AND b.ngay_hoc <= :den
        ');

        foreach ($classes as $c) {
            Academic::ensureBuoiHocForLop($this->db, (int)$c['id']);
            // RULE-DL-07: số thứ tự buổi lấy cùng nguồn với màn hình điểm danh
            $stt = Academic::soThuTuBuoi($this->db, (int)$c['id']);
            $buoiStmt->execute([':id' => $c['id'], ':den' => $we]);

            foreach ($buoiStmt->fetchAll(PDO::FETCH_ASSOC) as $b) {
                $soTiet = Academic::soTiet($b);
                $tietTichLuy += $soTiet;              // RULE-11.5: buổi trước hoặc trong tuần đang chọn

                if ($b['ngay_hoc'] < $ws) {
                    continue;
                }
                $iso = (int)(new DateTime($b['ngay_hoc']))->format('N');
                $tietTrongTuan += $soTiet;
                $monTrongTuan[$c['id']] = true;
                $buoiHoc[] = [
                    'lop_hoc_phan_id' => (int)$c['id'],
                    'lich_hoc_id' => (int)$b['lich_hoc_id'],
                    'ma_lop_hoc_phan' => $c['ma_lop_hoc_phan'],
                    'ma_mon_hoc' => $c['ma_mon_hoc'],
                    'ten_mon_hoc' => $c['ten_mon_hoc'],
                    'phong_hoc' => $c['phong_hoc'],
                    'ten_giang_vien' => $c['ten_giang_vien'],
                    'ngay_hoc' => $b['ngay_hoc'],
                    'buoi_hoc_id' => (int)$b['id'],
                    'so_thu_tu' => $stt[(int)$b['id']] ?? null,
                    'tong_so_buoi' => count($stt),
                    'thu' => $iso === 7 ? 8 : $iso + 1,
                    'tiet_bat_dau' => (int)$b['tiet_bat_dau'],
                    'tiet_ket_thuc' => (int)$b['tiet_ket_thuc'],
                    'so_tiet' => $soTiet,
                ];
            }
        }

        usort($buoiHoc, fn($a, $b) => [$a['ngay_hoc'], $a['tiet_bat_dau']] <=> [$b['ngay_hoc'], $b['tiet_bat_dau']]);

        Response::json([
            'success' => true,
            'data' => [
                'hoc_ky' => $hocKy,
                'nam_hoc' => $namHoc,
                'tuan_bat_dau' => $ws,
                'tuan_ket_thuc' => $we,
                'so_mon' => count($classes),
                'so_mon_trong_tuan' => count($monTrongTuan),
                'so_tiet_trong_tuan' => $tietTrongTuan,
                'tong_tiet_du_kien_da_hoc' => $tietTichLuy,
                'buoi_hoc' => $buoiHoc,
            ]
        ]);
    }

    /**
     * RULE-08 (hủy đăng ký): chỉ phụ thuộc trạng thái đăng ký của lớp.
     *  - Lớp "Đang mở đăng ký"  -> sinh viên hủy được.
     *  - Lớp "Đóng đăng ký"     -> không hủy được (chưa nhập thời gian, chưa tới ngày mở hoặc đã qua ngày đóng).
     * Trả null nếu được hủy, ngược lại trả lý do.
     */
    private function lyDoKhongTheHuy(int $dkId, array $lhp): ?string
    {
        if (!Academic::dangMoDangKy($lhp['thoi_gian_mo_dang_ky'] ?? null, $lhp['thoi_gian_dong_dang_ky'] ?? null)) {
            return 'lớp học phần đang đóng đăng ký.';
        }
        return null;
    }
}
