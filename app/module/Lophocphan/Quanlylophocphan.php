<?php

require_once dirname(__DIR__, 2) . '/config/database.php';
require_once dirname(__DIR__, 2) . '/core/Response.php';
require_once dirname(__DIR__, 2) . '/core/Request.php';
require_once dirname(__DIR__, 2) . '/core/AuthService.php';
require_once dirname(__DIR__, 2) . '/core/Academic.php';

/**
 * Quản lý lớp học phần: thêm, sửa, xóa, tìm kiếm; thiết lập sĩ số và lịch học (RULE-11)
 */
class Quanlylophocphan
{
    private PDO $db;

    private const STATUSES = ['Đang mở', 'Đã đóng', 'Đã hủy'];
    private const SI_SO_MIN = 5;
    private const SI_SO_MAX = 150;
    private const TIET_MAX = Academic::SO_TIET_NGAY; // RULE-TKB-02: tiết 1-13

    public function __construct()
    {
        $this->db = Database::connect();
    }

    /** GET /api/lophocphan?hoc_ky=&nam_hoc=&trang_thai=&search=&mon_hoc_id= */
    public function index(): void
    {
        $user = AuthService::requireUser($this->db, ['admin', 'giang_vien']);

        $sql = $this->baseSelect() . ' WHERE 1 = 1';
        $params = [];

        // Giảng viên chỉ thấy lớp mình phụ trách
        if ($user['vai_tro'] === 'giang_vien') {
            $sql .= ' AND lhp.giang_vien_user_id = :gv';
            $params[':gv'] = $user['id'];
        }

        $hk = Request::int(Request::query('hoc_ky'));
        if ($hk > 0) {
            $sql .= ' AND lhp.hoc_ky = :hk';
            $params[':hk'] = $hk;
        }

        $nh = Request::str(Request::query('nam_hoc', ''));
        if ($nh !== '') {
            $sql .= ' AND lhp.nam_hoc = :nh';
            $params[':nh'] = $nh;
        }

        // RULE-08: lọc theo 2 trạng thái đăng ký (mo | dong), tính theo thời gian mở/đóng
        $tt = Request::str(Request::query('trang_thai', ''));
        if ($tt === 'mo' || $tt === 'dong') {
            $sql .= ($tt === 'mo' ? ' AND ' : ' AND NOT ') . Academic::dangMoDkSql('lhp');
            $params[':now_dk'] = $params[':now_dk2'] = date('Y-m-d H:i:s');
        }

        $mh = Request::int(Request::query('mon_hoc_id'));
        if ($mh > 0) {
            $sql .= ' AND lhp.mon_hoc_id = :mh';
            $params[':mh'] = $mh;
        }

        $search = Request::str(Request::query('search', ''));
        if ($search !== '') {
            $sql .= ' AND (lhp.ma_lop_hoc_phan LIKE :s1 OR mh.ten_mon_hoc LIKE :s2 OR mh.ma_mon_hoc LIKE :s3 OR gv.ho_ten LIKE :s4)';
            $kw = '%' . $search . '%';
            $params += [':s1' => $kw, ':s2' => $kw, ':s3' => $kw, ':s4' => $kw];
        }

        $sql .= ' ORDER BY lhp.nam_hoc DESC, lhp.hoc_ky DESC, lhp.ma_lop_hoc_phan';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $list = array_map([$this, 'present'], $stmt->fetchAll());

        Response::json(['success' => true, 'total' => count($list), 'data' => $list]);
    }

    /** GET /api/lophocphan/chi-tiet?id= — thông tin, lịch học, danh sách sinh viên */
    public function show(): void
    {
        $user = AuthService::requireUser($this->db, ['admin', 'giang_vien']);

        $lhp = $this->find(Request::int(Request::query('id')));
        if (!$lhp) {
            Response::json(['success' => false, 'message' => 'Không tìm thấy lớp học phần.'], 404);
        }
        $this->assertCanManage($user, $lhp, false);

        Academic::ensureBuoiHocForLop($this->db, (int) $lhp['id']);

        $lich = $this->db->prepare('
            SELECT lh.*, (SELECT COUNT(*) FROM buoi_hoc b WHERE b.lich_hoc_id = lh.id) AS so_buoi
            FROM lich_hoc lh WHERE lh.lop_hoc_phan_id = :id ORDER BY lh.thu, lh.tiet_bat_dau
        ');
        $lich->execute([':id' => $lhp['id']]);
        $lhp['lich_hoc'] = $lich->fetchAll();
        $lhp['tong_buoi'] = array_sum(array_column($lhp['lich_hoc'], 'so_buoi'));

        // Quản lý lịch học > Danh sách buổi học (RULE-DL-04, RULE-DL-07: cùng số thứ tự với TKB / điểm danh)
        $buoi = $this->db->prepare("
            SELECT b.id, b.ngay_hoc, b.tiet_bat_dau, b.tiet_ket_thuc, b.trang_thai, lh.thu,
                   (SELECT COUNT(*) FROM diem_danh dd WHERE dd.buoi_hoc_id = b.id) AS so_ban_ghi_diem_danh
            FROM buoi_hoc b INNER JOIN lich_hoc lh ON lh.id = b.lich_hoc_id
            WHERE lh.lop_hoc_phan_id = :id ORDER BY b.ngay_hoc, b.tiet_bat_dau, b.id
        ");
        $buoi->execute([':id' => $lhp['id']]);
        $stt = Academic::soThuTuBuoi($this->db, (int) $lhp['id']);
        $lhp['buoi_hoc'] = array_map(function ($b) use ($stt) {
            $b['so_thu_tu'] = $stt[(int) $b['id']] ?? null;
            $b['so_tiet'] = Academic::soTiet($b);
            return $b;
        }, $buoi->fetchAll());
        $lhp['tong_tiet_da_xep'] = array_sum(array_column($lhp['buoi_hoc'], 'so_tiet'));

        $sv = $this->db->prepare('
            SELECT dk.id AS dang_ky_id, dk.ngay_dang_ky, dk.trang_thai,
                   u.id AS sinh_vien_id, u.ma_dinh_danh, u.ho_ten, l.ma_lop
            FROM dang_ky_hoc_phan dk
            INNER JOIN users u ON u.id = dk.sinh_vien_user_id
            LEFT JOIN lop_sinh_vien l ON l.id = u.lop_sinh_vien_id
            WHERE dk.lop_hoc_phan_id = :id
            ORDER BY u.ma_dinh_danh
        ');
        $sv->execute([':id' => $lhp['id']]);
        $lhp['sinh_vien'] = $sv->fetchAll();

        Response::json(['success' => true, 'data' => $lhp]);
    }

    /**
     * GET /api/lophocphan/nam-hoc — học kỳ / năm học lấy từ dữ liệu (không gán cứng)
     *  - nam_hoc: các năm học đang có lớp học phần (+ năm học hiện tại theo ngày)
     *  - hoc_ky: khoảng ngày học thực tế của từng học kỳ (theo lịch học)
     *  - hien_tai: học kỳ đang diễn ra; nếu không có thì học kỳ gần nhất
     */
    public function namHoc(): void
    {
        AuthService::requireUser($this->db);

        $today = date('Y-m-d');
        $y = (int) date('Y');
        $namHienTai = (int) date('n') >= 8 ? $y . '-' . ($y + 1) : ($y - 1) . '-' . $y;

        $list = $this->db->query('SELECT DISTINCT nam_hoc FROM lop_hoc_phan WHERE nam_hoc IS NOT NULL')->fetchAll(PDO::FETCH_COLUMN);
        $namToi = ((int) substr($namHienTai, 0, 4) + 1) . '-' . ((int) substr($namHienTai, 0, 4) + 2);
        foreach ([$namHienTai, $namToi] as $nh) {
            if (!in_array($nh, $list, true)) {
                $list[] = $nh; // năm học hiện tại và năm kế tiếp để lập kế hoạch mở lớp
            }
        }
        rsort($list);

        // RULE-HK-01, RULE-HK-04: học kỳ lấy từ bảng hoc_ky (ngày do quản trị viên khai báo)
        $terms = $this->db->query('
            SELECT hoc_ky, nam_hoc, ngay_bat_dau AS bat_dau, ngay_ket_thuc AS ket_thuc, 1 AS da_khai_bao
            FROM hoc_ky
        ')->fetchAll();
        $declared = [];
        foreach ($terms as $term) {
            $declared[$term['hoc_ky'] . '|' . $term['nam_hoc']] = true;
            if (!in_array($term['nam_hoc'], $list, true)) {
                $list[] = $term['nam_hoc'];
            }
        }
        // Dữ liệu cũ: học kỳ có lớp nhưng chưa khai báo -> chỉ dùng để hiển thị TKB, không được mở lớp mới (RULE-DL-03)
        $legacy = $this->db->query('
            SELECT l.hoc_ky, l.nam_hoc, MIN(lh.ngay_bat_dau) AS bat_dau, MAX(lh.ngay_ket_thuc) AS ket_thuc, 0 AS da_khai_bao
            FROM lop_hoc_phan l
            INNER JOIN lich_hoc lh ON lh.lop_hoc_phan_id = l.id
            GROUP BY l.hoc_ky, l.nam_hoc
        ')->fetchAll();
        foreach ($legacy as $term) {
            if (!isset($declared[$term['hoc_ky'] . '|' . $term['nam_hoc']])) {
                $terms[] = $term;
            }
        }
        // RULE-HK-03, RULE-HK-07: số tuần theo một công thức; khoảng ngày thực tế của các buổi học trong học kỳ
        $buoiRange = $this->db->prepare('
            SELECT MIN(b.ngay_hoc) AS tu, MAX(b.ngay_hoc) AS den,
                   SUM(CASE WHEN b.ngay_hoc < :bd OR b.ngay_hoc > :kt THEN 1 ELSE 0 END) AS ngoai
            FROM buoi_hoc b INNER JOIN lich_hoc lh ON lh.id = b.lich_hoc_id
            INNER JOIN lop_hoc_phan l ON l.id = lh.lop_hoc_phan_id
            WHERE l.hoc_ky = :hk AND l.nam_hoc = :nh
        ');
        foreach ($terms as &$term) {
            $buoiRange->execute([':bd' => $term['bat_dau'], ':kt' => $term['ket_thuc'], ':hk' => $term['hoc_ky'], ':nh' => $term['nam_hoc']]);
            $r = $buoiRange->fetch();
            $term['so_tuan'] = Academic::soTuan($term['bat_dau'], $term['ket_thuc']);
            $term['buoi_tu'] = $r['tu'];
            $term['buoi_den'] = $r['den'];
            $term['so_buoi_ngoai_hoc_ky'] = (int) $r['ngoai'];
        }
        unset($term);
        usort($terms, fn($a, $b) => strcmp($a['bat_dau'], $b['bat_dau']));
        rsort($list);

        $hienTai = null;
        foreach ($terms as $term) {
            if ($term['bat_dau'] <= $today && $today <= $term['ket_thuc']) {
                $hienTai = $term;
            }
        }
        if (!$hienTai) {
            foreach ($terms as $term) {
                if ($term['bat_dau'] <= $today) {
                    $hienTai = $term; // học kỳ gần nhất đã bắt đầu
                }
            }
        }
        if (!$hienTai && $terms) {
            $hienTai = $terms[0]; // học kỳ sắp tới
        }

        Response::json([
            'success' => true,
            'data' => [
                'nam_hoc' => $list,
                'hoc_ky' => $terms,
                'hien_tai' => $hienTai
                    ? ['hoc_ky' => (int) $hienTai['hoc_ky'], 'nam_hoc' => $hienTai['nam_hoc']]
                    : ['hoc_ky' => 1, 'nam_hoc' => $namHienTai],
            ]
        ]);
    }

    /** GET /api/lophocphan/form-data — danh sách môn học & giảng viên đang hoạt động */
    public function formData(): void
    {
        $user = AuthService::requireUser($this->db, ['admin', 'giang_vien']);

        $mh = $this->db->query("
            SELECT id, ma_mon_hoc, ten_mon_hoc, so_tin_chi, so_tiet
            FROM mon_hoc ORDER BY ma_mon_hoc
        ")->fetchAll();

        if ($user['vai_tro'] === 'giang_vien') {
            // Giảng viên chỉ tạo / sửa lớp do mình phụ trách
            $gv = [['id' => $user['id'], 'ma_dinh_danh' => $user['ma_dinh_danh'], 'ho_ten' => $user['ho_ten']]];
        } else {
            $gv = $this->db->query("
                SELECT id, ma_dinh_danh, ho_ten FROM users
                WHERE vai_tro IN ('giang_vien', 'lecturer')
                  AND (trang_thai IS NULL OR trang_thai IN ('hoat_dong', 'active', 'Hoạt động'))
                ORDER BY ho_ten
            ")->fetchAll();
        }

        Response::json(['success' => true, 'data' => ['mon_hoc' => $mh, 'giang_vien' => $gv]]);
    }

    /** POST /api/lophocphan — tạo lớp học phần kèm lịch học (RULE-LHP-01) */
    public function store(): void
    {
        Request::requireMethod('POST');
        // RULE-LHP-03, RULE-DL-06: quản trị viên, giảng viên; sinh viên 403, chưa đăng nhập 401
        $user = AuthService::requireUser($this->db, ['admin', 'giang_vien']);

        $in = Request::body();
        if ($user['vai_tro'] === 'giang_vien') {
            // RULE-LHP-03: giảng viên tạo lớp thì lớp do chính giảng viên đó phụ trách
            $in['giang_vien_user_id'] = $user['id'];
        }

        $data = $this->validate($in, null);
        $schedules = $this->validateSchedules(Request::input('lich_hoc'), $data);
        // RULE-HL-01, RULE-THIEU-03: chỉ lưu khi xếp đủ tổng số tiết (đã tránh xung đột, RULE-XL-06)
        $this->requireDuTiet($this->planFor($data, $schedules, null));

        $dup = $this->db->prepare('SELECT 1 FROM lop_hoc_phan WHERE UPPER(ma_lop_hoc_phan) = UPPER(:ma)');
        $dup->execute([':ma' => $data['ma_lop_hoc_phan']]);
        if ($dup->fetchColumn()) {
            Response::json(['success' => false, 'message' => 'Mã lớp học phần "' . $data['ma_lop_hoc_phan'] . '" đã tồn tại!'], 409);
        }

        $this->db->beginTransaction();
        try {
            $this->db->prepare('
                INSERT INTO lop_hoc_phan (ma_lop_hoc_phan, mon_hoc_id, giang_vien_user_id, hoc_ky, nam_hoc,
                                          si_so_toi_da, phong_hoc, trang_thai, thoi_gian_mo_dang_ky, thoi_gian_dong_dang_ky)
                VALUES (:ma_lop_hoc_phan, :mon_hoc_id, :giang_vien_user_id, :hoc_ky, :nam_hoc,
                        :si_so_toi_da, :phong_hoc, :trang_thai, :thoi_gian_mo_dang_ky, :thoi_gian_dong_dang_ky)
            ')->execute($this->bind($data));

            $id = (int) $this->db->lastInsertId();
            foreach ($schedules as $s) {
                $this->insertSchedule($id, $s);
            }
            $plan = Academic::syncBuoiHocLop($this->db, $id);

            // RULE-HL-01, RULE-HL-05: kết quả ghi DB phải đủ tiết, nếu không hoàn tác toàn bộ
            if ($plan['con_thieu'] > 0) {
                throw new DomainException('Chưa lưu: ' . $this->planMessage($plan));
            }

            $this->db->commit();
        } catch (Throwable $e) {
            $this->db->rollBack();
            if ($e instanceof DomainException) {
                Response::json(['success' => false, 'message' => $e->getMessage()], 409);
            }
            throw $e;
        }

        Response::json([
            'success' => true,
            'message' => 'Tạo mới lớp học phần thành công! ' . $this->planMessage($plan),
            'xep_lich' => $this->planSummary($plan),
            'data' => $this->find($id)
        ], 201);
    }

    /** PUT /api/lophocphan — body có id; sửa thông tin, sĩ số và lịch học */
    public function update(): void
    {
        Request::requireMethod('PUT', 'POST');
        $user = AuthService::requireUser($this->db, ['admin', 'giang_vien']);

        $id = Request::int(Request::input('id'));
        $existing = $this->find($id);
        if (!$existing) {
            Response::json(['success' => false, 'message' => 'Không tìm thấy lớp học phần.'], 404);
        }
        $this->assertCanManage($user, $existing, true);

        $in = Request::body();
        if ($user['vai_tro'] === 'giang_vien') {
            // Giảng viên không được tự phân công lại lớp cho người khác
            $in['giang_vien_user_id'] = $existing['giang_vien_user_id'];
        }

        $data = $this->validate($in, $existing);
        $schedules = $this->validateSchedules(Request::input('lich_hoc'), $data);

        $siSoHienTai = (int) $existing['si_so_hien_tai'];
        if ($data['si_so_toi_da'] < $siSoHienTai) {
            Response::json([
                'success' => false,
                'message' => 'Không thể giảm sĩ số xuống ' . $data['si_so_toi_da'] . ' vì lớp hiện đã có ' . $siSoHienTai . ' sinh viên đăng ký!'
            ], 422);
        }

        $hasDk = $this->countDangKy($id) > 0;
        if ($hasDk && (
            (int) $data['mon_hoc_id'] !== (int) $existing['mon_hoc_id'] ||
            (int) $data['hoc_ky'] !== (int) $existing['hoc_ky'] ||
            $data['nam_hoc'] !== $existing['nam_hoc']
        )) {
            Response::json([
                'success' => false,
                'message' => 'Lớp đã có sinh viên đăng ký, không thể đổi môn học, học kỳ hoặc năm học.'
            ], 409);
        }

        // RULE-HL-01, RULE-THIEU-03: chỉ lưu khi xếp đủ tổng số tiết (giữ buổi đã điểm danh, RULE-XL-11)
        $this->requireDuTiet($this->planFor($data, $schedules, $id));

        $this->db->beginTransaction();
        try {
            $params = $this->bind($data);
            unset($params[':ma_lop_hoc_phan']);
            $params[':id'] = $id;

            $this->db->prepare('
                UPDATE lop_hoc_phan SET
                    mon_hoc_id = :mon_hoc_id, giang_vien_user_id = :giang_vien_user_id,
                    hoc_ky = :hoc_ky, nam_hoc = :nam_hoc, si_so_toi_da = :si_so_toi_da,
                    phong_hoc = :phong_hoc, trang_thai = :trang_thai,
                    thoi_gian_mo_dang_ky = :thoi_gian_mo_dang_ky, thoi_gian_dong_dang_ky = :thoi_gian_dong_dang_ky
                WHERE id = :id
            ')->execute($params);

            $this->syncSchedules($id, $schedules);
            $plan = Academic::syncBuoiHocLop($this->db, $id);

            // RULE-HL-01, RULE-HL-05: kết quả ghi DB phải đủ tiết, nếu không hoàn tác toàn bộ
            if ($plan['con_thieu'] > 0) {
                throw new DomainException('Chưa lưu: ' . $this->planMessage($plan));
            }

            // RULE-15.11: lịch học đổi -> tổng tiết đổi -> tính lại chuyên cần, tổng kết
            Academic::recalcLop($this->db, $id);

            $this->db->commit();
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            if ($e instanceof DomainException) {
                Response::json(['success' => false, 'message' => $e->getMessage()], 409);
            }
            throw $e;
        }

        Response::json([
            'success' => true,
            'message' => 'Cập nhật lớp học phần thành công! ' . $this->planMessage($plan),
            'xep_lich' => $this->planSummary($plan),
            'data' => $this->find($id)
        ]);
    }

    /** DELETE /api/lophocphan?id= */
    public function destroy(): void
    {
        Request::requireMethod('DELETE', 'POST');
        $user = AuthService::requireUser($this->db, ['admin', 'giang_vien']);

        $id = Request::int(Request::query('id', Request::input('id')));
        $lhp = $this->find($id);
        if (!$lhp) {
            Response::json(['success' => false, 'message' => 'Không tìm thấy lớp học phần.'], 404);
        }
        $this->assertCanManage($user, $lhp, true);

        $n = $this->countDangKy($id);
        if ($n > 0) {
            Response::json([
                'success' => false,
                'message' => 'Không thể xóa! Đã có ' . $n . ' sinh viên từng đăng ký lớp này (kể cả đã hủy). Vui lòng chuyển trạng thái lớp sang "Đã hủy"!'
            ], 409);
        }

        $this->db->beginTransaction();
        try {
            $this->db->prepare('DELETE FROM buoi_hoc WHERE lich_hoc_id IN (SELECT id FROM lich_hoc WHERE lop_hoc_phan_id = :id)')
                ->execute([':id' => $id]);
            $this->db->prepare('DELETE FROM lich_hoc WHERE lop_hoc_phan_id = :id')->execute([':id' => $id]);
            $this->db->prepare('DELETE FROM lop_hoc_phan WHERE id = :id')->execute([':id' => $id]);
            $this->db->commit();
        } catch (Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }

        Response::json(['success' => true, 'message' => 'Đã xóa lớp học phần ' . $lhp['ma_lop_hoc_phan'] . ' thành công!']);
    }

    // ------------------------------------------------------------------

    private function baseSelect(): string
    {
        return "
            SELECT lhp.*, mh.ma_mon_hoc, mh.ten_mon_hoc, mh.so_tin_chi, mh.so_tiet,
                   gv.ho_ten AS ten_giang_vien, gv.ma_dinh_danh AS ma_giang_vien,
                   (SELECT COUNT(*) FROM dang_ky_hoc_phan dk
                     WHERE dk.lop_hoc_phan_id = lhp.id AND " . Academic::activeDkSql('dk.trang_thai') . ") AS si_so_hien_tai
            FROM lop_hoc_phan lhp
            INNER JOIN mon_hoc mh ON mh.id = lhp.mon_hoc_id
            LEFT JOIN users gv ON gv.id = lhp.giang_vien_user_id
        ";
    }

    private function find(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }
        $stmt = $this->db->prepare($this->baseSelect() . ' WHERE lhp.id = :id');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();

        return $row ? $this->present($row) : null;
    }

    private function present(array $l): array
    {
        $l = Academic::ganTrangThaiDangKy($l);
        $l['id'] = (int) $l['id'];
        $l['hoc_ky'] = (int) $l['hoc_ky'];
        $l['si_so_toi_da'] = (int) $l['si_so_toi_da'];
        $l['si_so_hien_tai'] = (int) $l['si_so_hien_tai'];
        $l['giang_vien_user_id'] = $l['giang_vien_user_id'] !== null ? (int) $l['giang_vien_user_id'] : null;

        $stmt = $this->db->prepare('SELECT * FROM lich_hoc WHERE lop_hoc_phan_id = :id ORDER BY thu, tiet_bat_dau');
        $stmt->execute([':id' => $l['id']]);
        $l['lich_hoc'] = $stmt->fetchAll();

        return $l;
    }

    private function assertCanManage(array $user, array $lhp, bool $write): void
    {
        if ($user['vai_tro'] === 'admin') {
            return;
        }
        if ((int) $lhp['giang_vien_user_id'] !== (int) $user['id']) {
            Response::json([
                'success' => false,
                'message' => $write
                    ? 'Bạn chỉ được chỉnh sửa lớp học phần do mình phụ trách.'
                    : 'Bạn chỉ được xem lớp học phần do mình phụ trách.'
            ], 403);
        }
    }

    private function countDangKy(int $id): int
    {
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM dang_ky_hoc_phan WHERE lop_hoc_phan_id = :id');
        $stmt->execute([':id' => $id]);

        return (int) $stmt->fetchColumn();
    }

    private function validDate(string $d): bool
    {
        $dt = DateTime::createFromFormat('Y-m-d', $d);

        return $dt && $dt->format('Y-m-d') === $d;
    }

    private function validate(array $in, ?array $existing): array
    {
        $errors = [];

        $ma = $existing ? $existing['ma_lop_hoc_phan'] : strtoupper(Request::str($in['ma_lop_hoc_phan'] ?? ''));
        $monHocId = Request::int($in['mon_hoc_id'] ?? 0);
        $gvRaw = $in['giang_vien_user_id'] ?? null;
        $gvId = ($gvRaw === null || $gvRaw === '') ? null : Request::int($gvRaw);
        $hk = Request::int($in['hoc_ky'] ?? 0);
        $nh = Request::str($in['nam_hoc'] ?? '');
        $siSo = $in['si_so_toi_da'] ?? null;
        $phong = strtoupper(Request::str($in['phong_hoc'] ?? ''));
        // Trạng thái lớp không còn nhập tay (RULE-08: chỉ còn trạng thái đăng ký tính theo thời gian) - giữ giá trị cũ
        $tt = $existing['trang_thai'] ?? 'Đang mở';
        if ($tt === 'Đã đóng') { $tt = 'Đang mở'; }
        $mo = Request::str($in['thoi_gian_mo_dang_ky'] ?? '');
        $dong = Request::str($in['thoi_gian_dong_dang_ky'] ?? '');

        if (!$existing && !preg_match('/^[A-Z0-9_-]{3,40}$/', $ma)) {
            $errors[] = 'Mã lớp học phần bắt buộc, 3-40 ký tự gồm chữ, số, dấu _ -';
        }

        $mh = null;
        if ($monHocId > 0) {
            $stmt = $this->db->prepare('SELECT * FROM mon_hoc WHERE id = :id');
            $stmt->execute([':id' => $monHocId]);
            $mh = $stmt->fetch();
        }
        if (!$mh) {
            $errors[] = 'Môn học không tồn tại.';
        } elseif ($mh['trang_thai'] !== 'Hoạt động' && (!$existing || (int) $existing['mon_hoc_id'] !== $monHocId)) {
            $errors[] = 'Môn học đang tạm ngưng, không thể mở lớp.';
        }

        if ($gvId !== null) {
            $stmt = $this->db->prepare("SELECT trang_thai FROM users WHERE id = :id AND vai_tro IN ('giang_vien', 'lecturer')");
            $stmt->execute([':id' => $gvId]);
            $gv = $stmt->fetch();
            if (!$gv) {
                $errors[] = 'Giảng viên phụ trách không hợp lệ.';
            } elseif (!AuthService::isActive($gv['trang_thai']) && (!$existing || (int) $existing['giang_vien_user_id'] !== $gvId)) {
                $errors[] = 'Tài khoản giảng viên đang bị khóa.';
            }
        }

        if (!in_array($hk, [1, 2, 3], true)) {
            $errors[] = 'Học kỳ không hợp lệ.';
        }
        if (!preg_match('/^(\d{4})-(\d{4})$/', $nh, $m) || (int) $m[2] !== (int) $m[1] + 1) {
            $errors[] = 'Năm học không hợp lệ (VD: 2026-2027).';
        }
        if (!is_numeric($siSo) || (int) $siSo != $siSo || (int) $siSo < self::SI_SO_MIN || (int) $siSo > self::SI_SO_MAX) {
            $errors[] = 'Sĩ số tối đa phải là số nguyên từ ' . self::SI_SO_MIN . ' đến ' . self::SI_SO_MAX . '.';
        }
        if ($phong === '' || mb_strlen($phong) > 20) {
            $errors[] = 'Phòng học bắt buộc và không quá 20 ký tự.';
        }
        if (!in_array($tt, self::STATUSES, true)) {
            $errors[] = 'Trạng thái lớp học phần không hợp lệ.';
        }

        // RULE-08: khoảng thời gian đăng ký
        $mo = substr($mo, 0, 10);
        $dong = substr($dong, 0, 10);
        if (!$this->validDate($mo) || !$this->validDate($dong)) {
            $errors[] = 'Vui lòng nhập ngày mở và ngày đóng đăng ký hợp lệ.';
        } elseif ($mo > $dong) {
            $errors[] = 'Ngày mở đăng ký phải trước hoặc bằng ngày đóng đăng ký!';
        }

        // RULE-DL-03, RULE-HK-01: lớp học phần tham chiếu học kỳ đã khai báo (lấy ngày bắt đầu / kết thúc)
        $term = null;
        if (!$errors) {
            $st = $this->db->prepare('SELECT * FROM hoc_ky WHERE hoc_ky = :hk AND nam_hoc = :nh');
            $st->execute([':hk' => $hk, ':nh' => $nh]);
            $term = $st->fetch();
            if (!$term) {
                $errors[] = 'Học kỳ ' . $hk . ' năm học ' . $nh . ' chưa được khai báo ngày bắt đầu / kết thúc. Quản trị viên khai báo tại Cơ cấu đào tạo > Học kỳ.';
            }
        }

        if ($errors) {
            Response::json(['success' => false, 'message' => $errors[0], 'errors' => $errors], 422);
        }

        return [
            'ngay_bat_dau_hk' => $term['ngay_bat_dau'],
            'ngay_ket_thuc_hk' => $term['ngay_ket_thuc'],
            'ma_lop_hoc_phan' => $ma,
            'mon_hoc_id' => $monHocId,
            'giang_vien_user_id' => $gvId,
            'hoc_ky' => $hk,
            'nam_hoc' => $nh,
            'si_so_toi_da' => (int) $siSo,
            'phong_hoc' => $phong,
            'trang_thai' => $tt,
            'thoi_gian_mo_dang_ky' => $mo . ' 00:00:00',
            'thoi_gian_dong_dang_ky' => $dong . ' 23:59:59',
        ];
    }

    /**
     * RULE-LHP-01: một hoặc nhiều thứ học, mỗi thứ có tiết bắt đầu / kết thúc.
     * RULE-HK-03, RULE-XL-08: khoảng ngày của mọi lịch = ngày bắt đầu / kết thúc học kỳ (không nhận ngày từ frontend).
     */
    private function validateSchedules($raw, array $data): array
    {
        if (!is_array($raw) || count($raw) === 0) {
            Response::json(['success' => false, 'message' => 'Lớp học phần phải có ít nhất một thứ học trong tuần.'], 422);
        }

        $list = [];
        foreach (array_values($raw) as $i => $s) {
            $n = $i + 1;
            if (!is_array($s)) {
                Response::json(['success' => false, 'message' => "Lịch học thứ {$n} không hợp lệ."], 422);
            }
            $thu = Request::int($s['thu'] ?? 0);
            $tbd = Request::int($s['tiet_bat_dau'] ?? 0);
            $tkt = Request::int($s['tiet_ket_thuc'] ?? 0);

            $msg = null;
            if ($thu < 2 || $thu > 8) {
                $msg = 'thứ học không hợp lệ (2-7 hoặc 8 = Chủ nhật)';
            } elseif ($tbd < 1 || $tkt > self::TIET_MAX || $tbd > $tkt) {
                // RULE-TKB-02, RULE-HL-04
                $msg = 'tiết bắt đầu/kết thúc phải trong khoảng 1-' . self::TIET_MAX . ' và tiết bắt đầu ≤ tiết kết thúc';
            }
            if ($msg !== null) {
                Response::json(['success' => false, 'message' => "Lịch học thứ {$n}: {$msg}."], 422);
            }

            $item = [
                'thu' => $thu,
                'tiet_bat_dau' => $tbd,
                'tiet_ket_thuc' => $tkt,
                'ngay_bat_dau' => $data['ngay_bat_dau_hk'],
                'ngay_ket_thuc' => $data['ngay_ket_thuc_hk'],
            ];

            if (!Academic::sessionDates($item)) {
                Response::json(['success' => false, 'message' => "Lịch học thứ {$n}: học kỳ không có ngày " . $this->thuLabel($thu) . ' nào.'], 422);
            }

            // RULE-XD-04: trong cùng lớp, hai lịch không trùng khung tiết cùng thứ
            foreach ($list as $j => $other) {
                if ($this->overlap($item, $other)) {
                    Response::json([
                        'success' => false,
                        'message' => 'Lịch học thứ ' . ($j + 1) . " và thứ {$n} bị trùng khung giờ trong cùng lớp."
                    ], 422);
                }
            }

            $list[] = $item;
        }

        return $list;
    }

    private function overlap(array $a, array $b): bool
    {
        return (int) $a['thu'] === (int) $b['thu']
            && $a['tiet_bat_dau'] <= $b['tiet_ket_thuc'] && $a['tiet_ket_thuc'] >= $b['tiet_bat_dau']
            && $a['ngay_bat_dau'] <= $b['ngay_ket_thuc'] && $a['ngay_ket_thuc'] >= $b['ngay_bat_dau'];
    }

    /** RULE-HL-01, RULE-THIEU-03, RULE-THIEU-04: không lưu khi chưa xếp đủ tiết; báo đã xếp, còn thiếu, nguyên nhân */
    private function requireDuTiet(array $plan): void
    {
        if ($plan['con_thieu'] > 0) {
            Response::json([
                'success' => false,
                'message' => 'Chưa lưu: ' . $this->planMessage($plan),
                'xep_lich' => $this->planSummary($plan),
            ], 422);
        }
    }

    /**
     * Kế hoạch buổi học cho dữ liệu đang nhập (chưa lưu). Khi sửa lớp, buổi đã điểm danh
     * của lịch giữ nguyên được tính vào tổng.
     */
    private function planFor(array $data, array $schedules, ?int $selfId): array
    {
        $key = fn(array $s) => implode('|', [(int) $s['thu'], (int) $s['tiet_bat_dau'], (int) $s['tiet_ket_thuc']]);
        foreach ($schedules as &$s) {
            $s['key'] = $key($s);
        }
        unset($s);

        $fixed = [];
        if ($selfId) {
            $stmt = $this->db->prepare("
                SELECT lh.thu, lh.tiet_bat_dau AS l_tbd, lh.tiet_ket_thuc AS l_tkt, lh.ngay_bat_dau, lh.ngay_ket_thuc,
                       b.ngay_hoc, b.tiet_bat_dau, b.tiet_ket_thuc
                FROM buoi_hoc b INNER JOIN lich_hoc lh ON lh.id = b.lich_hoc_id
                WHERE lh.lop_hoc_phan_id = :id
                  AND (b.trang_thai != 'Dự kiến' OR b.ngay_hoc < :today
                       OR EXISTS (SELECT 1 FROM diem_danh dd WHERE dd.buoi_hoc_id = b.id))
            ");
            // RULE-XL-11: buổi đã điểm danh hoặc đã diễn ra được giữ nguyên
            $stmt->execute([':id' => $selfId, ':today' => date('Y-m-d')]);
            foreach ($stmt->fetchAll() as $b) {
                $k = $key(['thu' => $b['thu'], 'tiet_bat_dau' => $b['l_tbd'], 'tiet_ket_thuc' => $b['l_tkt'],
                           'ngay_bat_dau' => $b['ngay_bat_dau'], 'ngay_ket_thuc' => $b['ngay_ket_thuc']]);
                $fixed[$k . '|' . $b['ngay_hoc']] = (int) $b['tiet_ket_thuc'] - (int) $b['tiet_bat_dau'] + 1;
            }
        }

        // RULE-XL-01: tổng số tiết lấy từ môn học
        $st = $this->db->prepare('SELECT so_tiet FROM mon_hoc WHERE id = :id');
        $st->execute([':id' => $data['mon_hoc_id']]);

        // RULE-XL-04, RULE-XD-01: buổi của lớp đang mở khác cùng giảng viên / phòng trong học kỳ
        $busy = $data['trang_thai'] === 'Đang mở'
            ? Academic::busySlots($this->db, $selfId, $data['phong_hoc'], $data['giang_vien_user_id'], $data['ngay_bat_dau_hk'], $data['ngay_ket_thuc_hk'])
            : [];

        return Academic::planBuoiHoc($schedules, (int) $st->fetchColumn(), $fixed, $busy);
    }

    /** POST /api/lophocphan/xem-truoc-lich — RULE-THIEU-06: lịch dự kiến để kiểm tra trước khi lưu (không ghi DB) */
    public function preview(): void
    {
        Request::requireMethod('POST');
        $user = AuthService::requireUser($this->db, ['admin', 'giang_vien']);   // RULE-DL-06

        $in = Request::body();
        $selfId = Request::int($in['id'] ?? 0) ?: null;
        $existing = null;
        if ($selfId) {
            $existing = $this->find($selfId);
            if (!$existing) {
                Response::json(['success' => false, 'message' => 'Không tìm thấy lớp học phần.'], 404);
            }
            $this->assertCanManage($user, $existing, true);
            if ($user['vai_tro'] === 'giang_vien') {
                $in['giang_vien_user_id'] = $existing['giang_vien_user_id'];
            }
        } elseif ($user['vai_tro'] === 'giang_vien') {
            $in['giang_vien_user_id'] = $user['id'];   // RULE-LHP-03
        }
        if (!$existing) {
            $in['ma_lop_hoc_phan'] = 'XEM-TRUOC';     // xem trước không phụ thuộc mã lớp (mã được kiểm tra khi lưu)
        }
        // Thời gian đăng ký (RULE-08) không ảnh hưởng xếp lịch: xem trước không bắt buộc, được kiểm tra khi lưu
        foreach (['thoi_gian_mo_dang_ky', 'thoi_gian_dong_dang_ky'] as $k) {
            if (!$this->validDate(substr(Request::str($in[$k] ?? ''), 0, 10))) {
                $in[$k] = date('Y-m-d');
            }
        }

        // Cùng bộ kiểm tra như khi lưu (môn, giảng viên, học kỳ đã khai báo, tiết 1-13...)
        $data = $this->validate($in, $existing);
        $schedules = $this->validateSchedules($in['lich_hoc'] ?? null, $data);
        $plan = $this->planFor($data, $schedules, $selfId);

        $mon = $this->db->prepare('SELECT id, ma_mon_hoc, ten_mon_hoc, so_tin_chi, so_tiet FROM mon_hoc WHERE id = :id');
        $mon->execute([':id' => $data['mon_hoc_id']]);

        foreach ($plan['buoi'] as &$b) {
            unset($b['key']);
        }
        unset($b);

        Response::json([
            'success' => true,
            'message' => $this->planMessage($plan),
            'data' => [
                'mon_hoc' => $mon->fetch(),
                'hoc_ky' => ['hoc_ky' => $data['hoc_ky'], 'nam_hoc' => $data['nam_hoc'],
                             'ngay_bat_dau' => $data['ngay_bat_dau_hk'], 'ngay_ket_thuc' => $data['ngay_ket_thuc_hk']],
                'tong_tiet_mon' => $plan['tong_tiet_mon'],
                'da_xep' => $plan['da_xep'],
                'con_thieu' => $plan['con_thieu'],
                'hop_le' => $plan['con_thieu'] === 0,          // RULE-HL-01
                'nguyen_nhan' => $plan['nguyen_nhan'],
                'so_buoi' => count($plan['buoi']),
                'buoi' => $plan['buoi'],
                'bo_qua' => $plan['bo_qua'],                   // RULE-XL-06: ngày bị bỏ qua do xung đột
            ]
        ]);
    }

    private function planMessage(array $plan): string
    {
        // RULE-XL-10, RULE-THIEU-04
        $msg = 'Đã xếp ' . count($plan['buoi']) . ' buổi, ' . $plan['da_xep'] . '/' . $plan['tong_tiet_mon'] . ' tiết.';
        if ($plan['bo_qua']) {
            $msg .= ' Bỏ qua ' . count($plan['bo_qua']) . ' ngày do trùng lịch giảng viên/phòng học.';
        }
        if ($plan['con_thieu'] > 0) {
            $msg .= ' Còn thiếu ' . $plan['con_thieu'] . ' tiết (nguyên nhân: ' . implode('; ', $plan['nguyen_nhan'])
                . '). Hãy thêm thứ học, đổi khung tiết hoặc phòng học rồi xếp lại (RULE-THIEU-05).';
        }

        return $msg;
    }

    private function planSummary(array $plan): array
    {
        return ['tong_tiet_mon' => $plan['tong_tiet_mon'], 'da_xep' => $plan['da_xep'],
                'con_thieu' => $plan['con_thieu'], 'so_buoi' => count($plan['buoi']),
                'so_ngay_bo_qua' => count($plan['bo_qua']), 'nguyen_nhan' => $plan['nguyen_nhan']];
    }

    private function insertSchedule(int $lhpId, array $s): int
    {
        $this->db->prepare('
            INSERT INTO lich_hoc (lop_hoc_phan_id, thu, tiet_bat_dau, tiet_ket_thuc, ngay_bat_dau, ngay_ket_thuc)
            VALUES (:lhp, :thu, :tbd, :tkt, :nbd, :nkt)
        ')->execute([
            ':lhp' => $lhpId,
            ':thu' => $s['thu'],
            ':tbd' => $s['tiet_bat_dau'],
            ':tkt' => $s['tiet_ket_thuc'],
            ':nbd' => $s['ngay_bat_dau'],
            ':nkt' => $s['ngay_ket_thuc'],
        ]);

        return (int) $this->db->lastInsertId();
    }

    /**
     * Đồng bộ lịch trong tuần khi sửa (so khớp theo thứ + khung tiết):
     *  - Lịch giữ nguyên: cập nhật khoảng ngày theo học kỳ (RULE-HK-03), giữ buổi đã điểm danh (RULE-XL-11)
     *  - Lịch bị bỏ: chỉ xóa nếu chưa có buổi học nào được điểm danh
     *  - Lịch mới: thêm; buổi học do Academic::syncBuoiHocLop xếp lại (RULE-XL)
     */
    private function syncSchedules(int $lhpId, array $schedules): void
    {
        $stmt = $this->db->prepare('SELECT * FROM lich_hoc WHERE lop_hoc_phan_id = :id');
        $stmt->execute([':id' => $lhpId]);
        $current = $stmt->fetchAll();

        $key = fn(array $s) => implode('|', [(int) $s['thu'], (int) $s['tiet_bat_dau'], (int) $s['tiet_ket_thuc']]);

        $newByKey = [];
        foreach ($schedules as $s) {
            $newByKey[$key($s)] = $s;
        }
        $curKeys = [];

        foreach ($current as $c) {
            $k = $key($c);
            $curKeys[] = $k;

            if (isset($newByKey[$k])) {
                $this->db->prepare('UPDATE lich_hoc SET ngay_bat_dau = :nbd, ngay_ket_thuc = :nkt WHERE id = :id')
                    ->execute([':nbd' => $newByKey[$k]['ngay_bat_dau'], ':nkt' => $newByKey[$k]['ngay_ket_thuc'], ':id' => $c['id']]);
                continue;
            }

            // RULE-XL-11: lịch đã có buổi điểm danh hoặc buổi đã diễn ra thì không xóa (không đổi lịch sử)
            $att = $this->db->prepare("
                SELECT COUNT(*) FROM buoi_hoc b
                WHERE b.lich_hoc_id = :id
                  AND (b.trang_thai != 'Dự kiến' OR b.ngay_hoc < :today
                       OR EXISTS (SELECT 1 FROM diem_danh dd WHERE dd.buoi_hoc_id = b.id))
            ");
            $att->execute([':id' => $c['id'], ':today' => date('Y-m-d')]);

            if ((int) $att->fetchColumn() > 0) {
                throw new DomainException(
                    'Không thể xóa/sửa lịch ' . $this->thuLabel((int) $c['thu']) . ' (Tiết ' . $c['tiet_bat_dau'] . '-' . $c['tiet_ket_thuc']
                    . ') vì đã có buổi học đã diễn ra hoặc đã điểm danh. Hãy giữ lịch này và thêm lịch mới nếu cần.'
                );
            }

            $this->db->prepare('DELETE FROM buoi_hoc WHERE lich_hoc_id = :id')->execute([':id' => $c['id']]);
            $this->db->prepare('DELETE FROM lich_hoc WHERE id = :id')->execute([':id' => $c['id']]);
        }

        foreach ($schedules as $s) {
            if (!in_array($key($s), $curKeys, true)) {
                $this->insertSchedule($lhpId, $s);
            }
        }
    }

    private function thuLabel(int $thu): string
    {
        return $thu === 8 ? 'Chủ nhật' : 'Thứ ' . $thu;
    }

    private function bind(array $data): array
    {
        $p = [];
        foreach ($data as $k => $v) {
            if (substr($k, -3) === '_hk') {
                continue;   // ngày học kỳ chỉ dùng để xếp lịch, không phải cột của lop_hoc_phan
            }
            $p[':' . $k] = $v;
        }

        return $p;
    }
}
