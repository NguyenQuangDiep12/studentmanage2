<?php

require_once dirname(__DIR__, 2) . '/config/database.php';
require_once dirname(__DIR__, 2) . '/core/Response.php';
require_once dirname(__DIR__, 2) . '/core/Request.php';
require_once dirname(__DIR__, 2) . '/core/AuthService.php';
require_once dirname(__DIR__, 2) . '/core/Academic.php';

/**
 * Cơ cấu đào tạo: Khoa, Chuyên ngành, Chương trình đào tạo (CTĐT),
 * môn học trong CTĐT, Nhóm tự chọn (RULE-01 → RULE-07) và Lớp sinh viên.
 */
class Quanlycocau
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connect();
    }

    // ==================================================================
    // ĐỌC DỮ LIỆU
    // ==================================================================

    /** GET /api/cocaudaotao/tong-quan — toàn bộ danh mục cho trang quản trị */
    public function tongQuan(): void
    {
        AuthService::requireUser($this->db, ['admin']);

        $khoa = $this->db->query('
            SELECT k.*,
                   (SELECT COUNT(*) FROM chuyen_nganh cn WHERE cn.khoa_id = k.id) AS so_chuyen_nganh,
                   (SELECT COUNT(*) FROM users u WHERE u.khoa_id = k.id) AS so_giang_vien
            FROM khoa k ORDER BY k.ma_khoa
        ')->fetchAll();

        $chuyenNganh = $this->db->query('
            SELECT cn.*, k.ma_khoa, k.ten_khoa,
                   (SELECT COUNT(*) FROM chuong_trinh_dao_tao c WHERE c.chuyen_nganh_id = cn.id) AS so_ctdt
            FROM chuyen_nganh cn
            LEFT JOIN khoa k ON k.id = cn.khoa_id
            ORDER BY cn.ma_chuyen_nganh
        ')->fetchAll();

        $ctdt = $this->db->query('
            SELECT c.*, cn.ma_chuyen_nganh, cn.ten_chuyen_nganh, k.ten_khoa,
                   (SELECT COUNT(*) FROM chi_tiet_chuong_trinh_dao_tao ct WHERE ct.chuong_trinh_id = c.id) AS so_mon_bat_buoc,
                   (SELECT COALESCE(SUM(mh.so_tin_chi), 0) FROM chi_tiet_chuong_trinh_dao_tao ct
                      INNER JOIN mon_hoc mh ON mh.id = ct.mon_hoc_id WHERE ct.chuong_trinh_id = c.id) AS tin_chi_bat_buoc,
                   (SELECT COUNT(*) FROM nhom_tu_chon n WHERE n.chuong_trinh_id = c.id) AS so_nhom_tu_chon,
                   (SELECT COUNT(*) FROM lop_sinh_vien l WHERE l.chuong_trinh_id = c.id) AS so_lop
            FROM chuong_trinh_dao_tao c
            LEFT JOIN chuyen_nganh cn ON cn.id = c.chuyen_nganh_id
            LEFT JOIN khoa k ON k.id = cn.khoa_id
            ORDER BY c.ma_chuong_trinh
        ')->fetchAll();

        $nhom = $this->db->query('
            SELECT n.*, c.ma_chuong_trinh, c.ten_chuong_trinh
            FROM nhom_tu_chon n
            LEFT JOIN chuong_trinh_dao_tao c ON c.id = n.chuong_trinh_id
            ORDER BY c.ma_chuong_trinh, n.ma_nhom
        ')->fetchAll();

        $monStmt = $this->db->prepare('
            SELECT ctn.id, ctn.mon_hoc_id, mh.ma_mon_hoc, mh.ten_mon_hoc, mh.so_tin_chi
            FROM chi_tiet_nhom_tu_chon ctn
            INNER JOIN mon_hoc mh ON mh.id = ctn.mon_hoc_id
            WHERE ctn.nhom_tu_chon_id = :id
            ORDER BY mh.ma_mon_hoc
        ');
        foreach ($nhom as &$n) {
            $monStmt->execute([':id' => $n['id']]);
            $n['mon_hoc'] = $monStmt->fetchAll();
            $n['tong_tin_chi_nhom'] = array_sum(array_column($n['mon_hoc'], 'so_tin_chi'));
        }
        unset($n);

        $lop = $this->db->query("
            SELECT l.*, c.ma_chuong_trinh, c.ten_chuong_trinh,
                   (SELECT COUNT(*) FROM users u WHERE u.lop_sinh_vien_id = l.id
                      AND u.vai_tro IN ('sinh_vien', 'student')) AS so_sinh_vien
            FROM lop_sinh_vien l
            LEFT JOIN chuong_trinh_dao_tao c ON c.id = l.chuong_trinh_id
            ORDER BY l.ma_lop
        ")->fetchAll();

        // RULE-HK-01: danh sách học kỳ đã khai báo (kèm số tuần, cảnh báo dữ liệu)
        $hocKy = $this->hocKyRows();

        Response::json([
            'success' => true,
            'data' => [
                'hoc_ky' => $hocKy,
                'khoa' => $khoa,
                'chuyen_nganh' => $chuyenNganh,
                'chuong_trinh_dao_tao' => $ctdt,
                'nhom_tu_chon' => $nhom,
                'lop_sinh_vien' => $lop,
            ]
        ]);
    }

    /** GET /api/cocaudaotao/ds-ctdt — danh sách CTĐT cho ô chọn (mọi vai trò) */
    public function dsCtdt(): void
    {
        $user = AuthService::requireUser($this->db);

        $list = $this->db->query('
            SELECT c.id, c.ma_chuong_trinh, c.ten_chuong_trinh, c.thoi_gian_dao_tao,
                   cn.ten_chuyen_nganh, k.ten_khoa
            FROM chuong_trinh_dao_tao c
            LEFT JOIN chuyen_nganh cn ON cn.id = c.chuyen_nganh_id
            LEFT JOIN khoa k ON k.id = cn.khoa_id
            ORDER BY c.ma_chuong_trinh
        ')->fetchAll();

        $macDinh = null;
        if ($user['vai_tro'] === 'sinh_vien') {
            $macDinh = $this->ctdtCuaSinhVien((int) $user['id'])['chuong_trinh_id'] ?? null;
        }

        Response::json(['success' => true, 'mac_dinh' => $macDinh, 'data' => $list]);
    }

    /**
     * GET /api/cocaudaotao/khung-chuong-trinh?chuong_trinh_id=
     * Khung CTĐT nhóm theo học kỳ - năm học, kèm nhóm tự chọn (RULE-01 → RULE-07).
     * Sinh viên: mặc định CTĐT của lớp mình, có cột "Đã học" theo kết quả đạt.
     */
    public function khungChuongTrinh(): void
    {
        $user = AuthService::requireUser($this->db);
        $isSv = $user['vai_tro'] === 'sinh_vien';

        $svInfo = $isSv ? $this->ctdtCuaSinhVien((int) $user['id']) : null;
        $ctdtId = Request::int(Request::query('chuong_trinh_id'));
        if ($ctdtId <= 0 && $svInfo) {
            $ctdtId = (int) $svInfo['chuong_trinh_id'];
        }

        $stmt = $this->db->prepare('
            SELECT c.*, cn.ma_chuyen_nganh, cn.ten_chuyen_nganh, k.ten_khoa
            FROM chuong_trinh_dao_tao c
            LEFT JOIN chuyen_nganh cn ON cn.id = c.chuyen_nganh_id
            LEFT JOIN khoa k ON k.id = cn.khoa_id
            WHERE c.id = :id
        ');
        $stmt->execute([':id' => $ctdtId]);
        $ctdt = $stmt->fetch();

        if (!$ctdt) {
            Response::json(['success' => false, 'message' => 'Vui lòng chọn chương trình đào tạo hợp lệ.'], 404);
        }

        // Kết quả học tập của sinh viên (chỉ khi xem đúng CTĐT của mình)
        $daHoc = [];
        $dangHoc = [];
        $namBatDau = null;
        if ($isSv && $svInfo && (int) $svInfo['chuong_trinh_id'] === $ctdtId) {
            [$daHoc, $dangHoc] = $this->tinhTrangHoc((int) $user['id']);
            if (preg_match('/^(\d{4})/', (string) $svInfo['khoa_hoc'], $m)) {
                $namBatDau = (int) $m[1];
            }
        }

        $rows = $this->db->prepare('
            SELECT ct.id, ct.hoc_ky, ct.nam_hoc, mh.id AS mon_hoc_id, mh.ma_mon_hoc, mh.ten_mon_hoc,
                   mh.so_tin_chi, mh.so_tiet, mh.so_tiet_ly_thuyet, mh.so_tiet_thuc_hanh, mh.so_tin_chi_ly_thuyet, mh.so_tin_chi_thuc_hanh
            FROM chi_tiet_chuong_trinh_dao_tao ct
            INNER JOIN mon_hoc mh ON mh.id = ct.mon_hoc_id
            WHERE ct.chuong_trinh_id = :id
            ORDER BY ct.nam_hoc, ct.hoc_ky, mh.ma_mon_hoc
        ');
        $rows->execute([':id' => $ctdtId]);

        $hocKy = [];
        foreach ($rows->fetchAll() as $r) {
            $key = $r['nam_hoc'] . '-' . $r['hoc_ky'];
            if (!isset($hocKy[$key])) {
                $nam = (int) $r['nam_hoc'];
                $hocKy[$key] = [
                    'hoc_ky' => (int) $r['hoc_ky'],
                    'nam_thu' => $nam,
                    'tieu_de' => 'Học kỳ ' . $r['hoc_ky'] . ' - ' . ($namBatDau
                        ? 'Năm học ' . ($namBatDau + $nam - 1) . ' - ' . ($namBatDau + $nam)
                        : 'Năm thứ ' . $nam),
                    'tong_tin_chi' => 0,
                    'mon_hoc' => [],
                ];
            }
            $r['bat_buoc'] = true;
            $r['da_hoc'] = isset($daHoc[$r['mon_hoc_id']]);
            $r['dang_hoc'] = isset($dangHoc[$r['mon_hoc_id']]);
            $hocKy[$key]['tong_tin_chi'] += (int) $r['so_tin_chi'];
            $hocKy[$key]['mon_hoc'][] = $r;
        }

        $nhomStmt = $this->db->prepare('SELECT * FROM nhom_tu_chon WHERE chuong_trinh_id = :id ORDER BY ma_nhom');
        $nhomStmt->execute([':id' => $ctdtId]);
        $monNhom = $this->db->prepare('
            SELECT ctn.id, mh.id AS mon_hoc_id, mh.ma_mon_hoc, mh.ten_mon_hoc, mh.so_tin_chi, mh.so_tiet,
                   mh.so_tiet_ly_thuyet, mh.so_tiet_thuc_hanh, mh.so_tin_chi_ly_thuyet, mh.so_tin_chi_thuc_hanh
            FROM chi_tiet_nhom_tu_chon ctn
            INNER JOIN mon_hoc mh ON mh.id = ctn.mon_hoc_id
            WHERE ctn.nhom_tu_chon_id = :id
            ORDER BY mh.ma_mon_hoc
        ');

        $nhom = [];
        foreach ($nhomStmt->fetchAll() as $n) {
            $monNhom->execute([':id' => $n['id']]);
            $mons = $monNhom->fetchAll();
            $tcDat = 0;
            foreach ($mons as &$m) {
                $m['bat_buoc'] = false;
                $m['da_hoc'] = isset($daHoc[$m['mon_hoc_id']]);
                $m['dang_hoc'] = isset($dangHoc[$m['mon_hoc_id']]);
                if ($m['da_hoc']) {
                    $tcDat += (int) $m['so_tin_chi'];
                }
            }
            unset($m);
            $n['mon_hoc'] = $mons;
            $n['tin_chi_da_dat'] = $tcDat;
            $nhom[] = $n;
        }

        $tcBatBuoc = array_sum(array_column($hocKy, 'tong_tin_chi'));
        $tcTuChon = array_sum(array_map(fn($n) => (int) $n['so_tin_chi_toi_thieu'], $nhom));

        Response::json([
            'success' => true,
            'data' => [
                'chuong_trinh' => $ctdt,
                'xem_ket_qua' => $namBatDau !== null || ($isSv && $svInfo && (int) $svInfo['chuong_trinh_id'] === $ctdtId),
                'hoc_ky' => array_values($hocKy),
                'nhom_tu_chon' => $nhom,
                'tong_tin_chi_bat_buoc' => $tcBatBuoc,
                'tong_tin_chi_tu_chon_toi_thieu' => $tcTuChon,
                'tong_tin_chi_toan_khoa' => $tcBatBuoc + $tcTuChon,
            ]
        ]);
    }

    // ==================================================================
    // KHOA
    // ==================================================================

    /** POST /api/cocaudaotao/khoa  |  PUT (có id) */
    public function luuKhoa(): void
    {
        Request::requireMethod('POST', 'PUT');
        AuthService::requireUser($this->db, ['admin']);

        $id = Request::int(Request::input('id'));
        $ma = strtoupper(Request::str(Request::input('ma_khoa')));
        $ten = Request::str(Request::input('ten_khoa'));

        if (!preg_match('/^[A-Z0-9_-]{2,20}$/', $ma)) {
            $this->fail('Mã khoa bắt buộc, 2-20 ký tự gồm chữ, số, dấu _ -');
        }
        if ($ten === '' || mb_strlen($ten) > 150) {
            $this->fail('Tên khoa bắt buộc và không quá 150 ký tự.');
        }
        $this->checkUnique('khoa', 'ma_khoa', $ma, $id, 'Mã khoa');

        if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
            $this->mustExist('khoa', $id, 'khoa');
            $this->db->prepare('UPDATE khoa SET ma_khoa = :ma, ten_khoa = :ten WHERE id = :id')
                ->execute([':ma' => $ma, ':ten' => $ten, ':id' => $id]);
            Response::json(['success' => true, 'message' => 'Cập nhật khoa thành công!']);
        }

        $this->db->prepare('INSERT INTO khoa (ma_khoa, ten_khoa) VALUES (:ma, :ten)')
            ->execute([':ma' => $ma, ':ten' => $ten]);
        Response::json(['success' => true, 'message' => 'Thêm khoa thành công!'], 201);
    }

    /** DELETE /api/cocaudaotao/khoa?id= */
    public function xoaKhoa(): void
    {
        Request::requireMethod('DELETE');
        AuthService::requireUser($this->db, ['admin']);
        $id = Request::int(Request::query('id'));
        $this->mustExist('khoa', $id, 'khoa');

        $this->blockIf('SELECT COUNT(*) FROM chuyen_nganh WHERE khoa_id = :id', $id, 'Không thể xóa! Khoa đang có %d chuyên ngành trực thuộc.');
        $this->blockIf('SELECT COUNT(*) FROM users WHERE khoa_id = :id', $id, 'Không thể xóa! Khoa đang có %d giảng viên.');

        $this->db->prepare('DELETE FROM khoa WHERE id = :id')->execute([':id' => $id]);
        Response::json(['success' => true, 'message' => 'Đã xóa khoa thành công!']);
    }

    // ==================================================================
    // CHUYÊN NGÀNH
    // ==================================================================

    /** POST /api/cocaudaotao/chuyen-nganh  |  PUT (có id) */
    public function luuChuyenNganh(): void
    {
        Request::requireMethod('POST', 'PUT');
        AuthService::requireUser($this->db, ['admin']);

        $id = Request::int(Request::input('id'));
        $ma = strtoupper(Request::str(Request::input('ma_chuyen_nganh')));
        $ten = Request::str(Request::input('ten_chuyen_nganh'));
        $khoaId = Request::int(Request::input('khoa_id'));

        if (!preg_match('/^[A-Z0-9_-]{2,20}$/', $ma)) {
            $this->fail('Mã chuyên ngành bắt buộc, 2-20 ký tự gồm chữ, số, dấu _ -');
        }
        if ($ten === '' || mb_strlen($ten) > 150) {
            $this->fail('Tên chuyên ngành bắt buộc và không quá 150 ký tự.');
        }
        if (!$this->exists('khoa', $khoaId)) {
            $this->fail('Vui lòng chọn khoa hợp lệ.');
        }
        $this->checkUnique('chuyen_nganh', 'ma_chuyen_nganh', $ma, $id, 'Mã chuyên ngành');

        $params = [':ma' => $ma, ':ten' => $ten, ':khoa' => $khoaId];

        if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
            $this->mustExist('chuyen_nganh', $id, 'chuyên ngành');
            $params[':id'] = $id;
            $this->db->prepare('UPDATE chuyen_nganh SET ma_chuyen_nganh = :ma, ten_chuyen_nganh = :ten, khoa_id = :khoa WHERE id = :id')
                ->execute($params);
            Response::json(['success' => true, 'message' => 'Cập nhật chuyên ngành thành công!']);
        }

        $this->db->prepare('INSERT INTO chuyen_nganh (ma_chuyen_nganh, ten_chuyen_nganh, khoa_id) VALUES (:ma, :ten, :khoa)')
            ->execute($params);
        Response::json(['success' => true, 'message' => 'Thêm chuyên ngành thành công!'], 201);
    }

    /** DELETE /api/cocaudaotao/chuyen-nganh?id= */
    public function xoaChuyenNganh(): void
    {
        Request::requireMethod('DELETE');
        AuthService::requireUser($this->db, ['admin']);
        $id = Request::int(Request::query('id'));
        $this->mustExist('chuyen_nganh', $id, 'chuyên ngành');

        $this->blockIf('SELECT COUNT(*) FROM chuong_trinh_dao_tao WHERE chuyen_nganh_id = :id', $id, 'Không thể xóa! Chuyên ngành đang có %d chương trình đào tạo.');

        $this->db->prepare('DELETE FROM chuyen_nganh WHERE id = :id')->execute([':id' => $id]);
        Response::json(['success' => true, 'message' => 'Đã xóa chuyên ngành thành công!']);
    }

    // ==================================================================
    // CHƯƠNG TRÌNH ĐÀO TẠO
    // ==================================================================

    /** POST /api/cocaudaotao/ctdt  |  PUT (có id) */
    public function luuCtdt(): void
    {
        Request::requireMethod('POST', 'PUT');
        AuthService::requireUser($this->db, ['admin']);

        $id = Request::int(Request::input('id'));
        $ma = strtoupper(Request::str(Request::input('ma_chuong_trinh')));
        $ten = Request::str(Request::input('ten_chuong_trinh'));
        $thoiGian = Request::str(Request::input('thoi_gian_dao_tao', '4 năm'));
        $cnId = Request::int(Request::input('chuyen_nganh_id'));

        if (!preg_match('/^[A-Z0-9_-]{2,30}$/', $ma)) {
            $this->fail('Mã chương trình bắt buộc, 2-30 ký tự gồm chữ, số, dấu _ -');
        }
        if ($ten === '' || mb_strlen($ten) > 200) {
            $this->fail('Tên chương trình bắt buộc và không quá 200 ký tự.');
        }
        if (!preg_match('/^[1-6]( năm)?$/u', $thoiGian)) {
            $this->fail('Thời gian đào tạo phải từ 1 đến 6 năm (VD: 4 năm).');
        }
        if (!$this->exists('chuyen_nganh', $cnId)) {
            $this->fail('Vui lòng chọn chuyên ngành hợp lệ.');
        }
        $this->checkUnique('chuong_trinh_dao_tao', 'ma_chuong_trinh', $ma, $id, 'Mã chương trình');

        $soNam = (int) $thoiGian;
        $params = [':ma' => $ma, ':ten' => $ten, ':tg' => $soNam . ' năm', ':cn' => $cnId];

        if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
            $this->mustExist('chuong_trinh_dao_tao', $id, 'chương trình đào tạo');

            $max = $this->db->prepare('SELECT MAX(nam_hoc) FROM chi_tiet_chuong_trinh_dao_tao WHERE chuong_trinh_id = :id');
            $max->execute([':id' => $id]);
            if ((int) $max->fetchColumn() > $soNam) {
                $this->fail('Không thể rút ngắn thời gian đào tạo vì khung chương trình đang có môn ở năm thứ ' . $max->fetchColumn() . '.');
            }

            $params[':id'] = $id;
            $this->db->prepare('
                UPDATE chuong_trinh_dao_tao
                SET ma_chuong_trinh = :ma, ten_chuong_trinh = :ten, thoi_gian_dao_tao = :tg, chuyen_nganh_id = :cn
                WHERE id = :id
            ')->execute($params);
            Response::json(['success' => true, 'message' => 'Cập nhật chương trình đào tạo thành công!']);
        }

        $this->db->prepare('
            INSERT INTO chuong_trinh_dao_tao (ma_chuong_trinh, ten_chuong_trinh, thoi_gian_dao_tao, chuyen_nganh_id)
            VALUES (:ma, :ten, :tg, :cn)
        ')->execute($params);
        Response::json(['success' => true, 'message' => 'Thêm chương trình đào tạo thành công!', 'id' => (int) $this->db->lastInsertId()], 201);
    }

    /** DELETE /api/cocaudaotao/ctdt?id= */
    public function xoaCtdt(): void
    {
        Request::requireMethod('DELETE');
        AuthService::requireUser($this->db, ['admin']);
        $id = Request::int(Request::query('id'));
        $this->mustExist('chuong_trinh_dao_tao', $id, 'chương trình đào tạo');

        $this->blockIf('SELECT COUNT(*) FROM lop_sinh_vien WHERE chuong_trinh_id = :id', $id, 'Không thể xóa! Có %d lớp sinh viên đang học theo chương trình này.');
        $this->blockIf('SELECT COUNT(*) FROM chi_tiet_chuong_trinh_dao_tao WHERE chuong_trinh_id = :id', $id, 'Không thể xóa! Khung chương trình đang có %d môn học, hãy gỡ các môn trước.');
        $this->blockIf('SELECT COUNT(*) FROM nhom_tu_chon WHERE chuong_trinh_id = :id', $id, 'Không thể xóa! Chương trình đang có %d nhóm tự chọn, hãy xóa các nhóm trước.');

        $this->db->prepare('DELETE FROM chuong_trinh_dao_tao WHERE id = :id')->execute([':id' => $id]);
        Response::json(['success' => true, 'message' => 'Đã xóa chương trình đào tạo thành công!']);
    }

    /**
     * POST /api/cocaudaotao/ctdt/mon — thêm môn bắt buộc vào khung (RULE-01)
     * Body: { chuong_trinh_id, mon_hoc_id, hoc_ky (1-3), nam_hoc (năm thứ 1..n) }
     * PUT: { id, hoc_ky, nam_hoc } — đổi học kỳ / năm của môn trong khung
     */
    public function luuMonCtdt(): void
    {
        Request::requireMethod('POST', 'PUT');
        AuthService::requireUser($this->db, ['admin']);

        $isEdit = $_SERVER['REQUEST_METHOD'] === 'PUT';
        $hocKy = Request::int(Request::input('hoc_ky'));
        $namHoc = Request::int(Request::input('nam_hoc'));

        if ($isEdit) {
            $id = Request::int(Request::input('id'));
            $stmt = $this->db->prepare('SELECT * FROM chi_tiet_chuong_trinh_dao_tao WHERE id = :id');
            $stmt->execute([':id' => $id]);
            $row = $stmt->fetch();
            if (!$row) {
                $this->fail('Không tìm thấy môn học trong khung chương trình.', 404);
            }
            $ctdtId = (int) $row['chuong_trinh_id'];
            $monId = (int) $row['mon_hoc_id'];
        } else {
            $ctdtId = Request::int(Request::input('chuong_trinh_id'));
            $monId = Request::int(Request::input('mon_hoc_id'));
        }

        $ctdt = $this->getCtdt($ctdtId);
        $soNam = max(1, (int) $ctdt['thoi_gian_dao_tao']);

        if (!in_array($hocKy, [1, 2, 3], true)) {
            $this->fail('Học kỳ phải là 1, 2 hoặc 3 (học kỳ hè).');
        }
        if ($namHoc < 1 || $namHoc > $soNam) {
            $this->fail('Năm học phải từ năm thứ 1 đến năm thứ ' . $soNam . ' theo thời gian đào tạo.');
        }

        if (!$isEdit) {
            if (!$this->exists('mon_hoc', $monId)) {
                $this->fail('Vui lòng chọn môn học hợp lệ.');
            }
            $dup = $this->db->prepare('SELECT 1 FROM chi_tiet_chuong_trinh_dao_tao WHERE chuong_trinh_id = :c AND mon_hoc_id = :m');
            $dup->execute([':c' => $ctdtId, ':m' => $monId]);
            if ($dup->fetchColumn()) {
                $this->fail('Môn học này đã có trong khung chương trình.', 409);
            }
            $this->assertNotInElective($ctdtId, $monId);

            $this->db->prepare('
                INSERT INTO chi_tiet_chuong_trinh_dao_tao (chuong_trinh_id, mon_hoc_id, hoc_ky, nam_hoc)
                VALUES (:c, :m, :hk, :nh)
            ')->execute([':c' => $ctdtId, ':m' => $monId, ':hk' => $hocKy, ':nh' => $namHoc]);
            Response::json(['success' => true, 'message' => 'Đã thêm môn học vào khung chương trình!'], 201);
        }

        $this->db->prepare('UPDATE chi_tiet_chuong_trinh_dao_tao SET hoc_ky = :hk, nam_hoc = :nh WHERE id = :id')
            ->execute([':hk' => $hocKy, ':nh' => $namHoc, ':id' => $id]);
        Response::json(['success' => true, 'message' => 'Đã cập nhật học kỳ của môn trong khung chương trình!']);
    }

    /** DELETE /api/cocaudaotao/ctdt/mon?id= — gỡ môn khỏi khung */
    public function xoaMonCtdt(): void
    {
        Request::requireMethod('DELETE');
        AuthService::requireUser($this->db, ['admin']);
        $id = Request::int(Request::query('id'));
        $this->mustExist('chi_tiet_chuong_trinh_dao_tao', $id, 'môn học trong khung');

        $this->db->prepare('DELETE FROM chi_tiet_chuong_trinh_dao_tao WHERE id = :id')->execute([':id' => $id]);
        Response::json(['success' => true, 'message' => 'Đã gỡ môn học khỏi khung chương trình!']);
    }

    // ==================================================================
    // NHÓM TỰ CHỌN (RULE-02 → RULE-06)
    // ==================================================================

    /** POST /api/cocaudaotao/nhom-tu-chon  |  PUT (có id) */
    public function luuNhom(): void
    {
        Request::requireMethod('POST', 'PUT');
        AuthService::requireUser($this->db, ['admin']);

        $id = Request::int(Request::input('id'));
        $ma = strtoupper(Request::str(Request::input('ma_nhom')));
        $ten = Request::str(Request::input('ten_nhom'));
        $ctdtId = Request::int(Request::input('chuong_trinh_id'));
        $tc = Request::input('so_tin_chi_toi_thieu');

        if (!preg_match('/^[A-Z0-9_-]{2,20}$/', $ma)) {
            $this->fail('Mã nhóm bắt buộc, 2-20 ký tự gồm chữ, số, dấu _ -');
        }
        if ($ten === '' || mb_strlen($ten) > 150) {
            $this->fail('Tên nhóm bắt buộc và không quá 150 ký tự.');
        }
        $this->getCtdt($ctdtId);
        if (!is_numeric($tc) || (int) $tc != $tc || (int) $tc < 1 || (int) $tc > 60) {
            $this->fail('Số tín chỉ tối thiểu phải là số nguyên từ 1 đến 60.');
        }
        $this->checkUnique('nhom_tu_chon', 'ma_nhom', $ma, $id, 'Mã nhóm');

        $params = [':ma' => $ma, ':ten' => $ten, ':c' => $ctdtId, ':tc' => (int) $tc];

        if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
            $this->mustExist('nhom_tu_chon', $id, 'nhóm tự chọn');
            $params[':id'] = $id;
            $this->db->prepare('
                UPDATE nhom_tu_chon SET ma_nhom = :ma, ten_nhom = :ten, chuong_trinh_id = :c, so_tin_chi_toi_thieu = :tc
                WHERE id = :id
            ')->execute($params);
            Response::json(['success' => true, 'message' => 'Cập nhật nhóm tự chọn thành công!']);
        }

        $this->db->prepare('
            INSERT INTO nhom_tu_chon (ma_nhom, ten_nhom, chuong_trinh_id, so_tin_chi_toi_thieu)
            VALUES (:ma, :ten, :c, :tc)
        ')->execute($params);
        Response::json(['success' => true, 'message' => 'Thêm nhóm tự chọn thành công!'], 201);
    }

    /** DELETE /api/cocaudaotao/nhom-tu-chon?id= */
    public function xoaNhom(): void
    {
        Request::requireMethod('DELETE');
        AuthService::requireUser($this->db, ['admin']);
        $id = Request::int(Request::query('id'));
        $this->mustExist('nhom_tu_chon', $id, 'nhóm tự chọn');

        $this->blockIf('SELECT COUNT(*) FROM chi_tiet_nhom_tu_chon WHERE nhom_tu_chon_id = :id', $id, 'Không thể xóa! Nhóm đang có %d môn học, hãy gỡ các môn trước.');

        $this->db->prepare('DELETE FROM nhom_tu_chon WHERE id = :id')->execute([':id' => $id]);
        Response::json(['success' => true, 'message' => 'Đã xóa nhóm tự chọn thành công!']);
    }

    /** POST /api/cocaudaotao/nhom-tu-chon/mon — Body { nhom_tu_chon_id, mon_hoc_id } */
    public function themMonNhom(): void
    {
        Request::requireMethod('POST');
        AuthService::requireUser($this->db, ['admin']);

        $nhomId = Request::int(Request::input('nhom_tu_chon_id'));
        $monId = Request::int(Request::input('mon_hoc_id'));

        $stmt = $this->db->prepare('SELECT * FROM nhom_tu_chon WHERE id = :id');
        $stmt->execute([':id' => $nhomId]);
        $nhom = $stmt->fetch();
        if (!$nhom) {
            $this->fail('Không tìm thấy nhóm tự chọn.', 404);
        }
        if (!$this->exists('mon_hoc', $monId)) {
            $this->fail('Vui lòng chọn môn học hợp lệ.');
        }

        $ctdtId = (int) $nhom['chuong_trinh_id'];

        $req = $this->db->prepare('SELECT 1 FROM chi_tiet_chuong_trinh_dao_tao WHERE chuong_trinh_id = :c AND mon_hoc_id = :m');
        $req->execute([':c' => $ctdtId, ':m' => $monId]);
        if ($req->fetchColumn()) {
            $this->fail('Môn học đang là môn bắt buộc trong khung chương trình, không thể đưa vào nhóm tự chọn.', 409);
        }
        $this->assertNotInElective($ctdtId, $monId);

        $this->db->prepare('INSERT INTO chi_tiet_nhom_tu_chon (nhom_tu_chon_id, mon_hoc_id) VALUES (:n, :m)')
            ->execute([':n' => $nhomId, ':m' => $monId]);
        Response::json(['success' => true, 'message' => 'Đã thêm môn học vào nhóm ' . $nhom['ma_nhom'] . '!'], 201);
    }

    /** DELETE /api/cocaudaotao/nhom-tu-chon/mon?id= */
    public function xoaMonNhom(): void
    {
        Request::requireMethod('DELETE');
        AuthService::requireUser($this->db, ['admin']);
        $id = Request::int(Request::query('id'));
        $this->mustExist('chi_tiet_nhom_tu_chon', $id, 'môn học trong nhóm');

        $this->db->prepare('DELETE FROM chi_tiet_nhom_tu_chon WHERE id = :id')->execute([':id' => $id]);
        Response::json(['success' => true, 'message' => 'Đã gỡ môn học khỏi nhóm tự chọn!']);
    }

    // ==================================================================
    // LỚP SINH VIÊN
    // ==================================================================

    /** POST /api/cocaudaotao/lop-sinh-vien  |  PUT (có id) */
    public function luuLop(): void
    {
        Request::requireMethod('POST', 'PUT');
        AuthService::requireUser($this->db, ['admin']);

        $id = Request::int(Request::input('id'));
        $ma = strtoupper(Request::str(Request::input('ma_lop')));
        $ten = Request::str(Request::input('ten_lop'));
        $khoaHoc = Request::str(Request::input('khoa_hoc'));
        $ctdtId = Request::int(Request::input('chuong_trinh_id'));

        if (!preg_match('/^[A-Z0-9_-]{2,30}$/', $ma)) {
            $this->fail('Mã lớp bắt buộc, 2-30 ký tự gồm chữ, số, dấu _ -');
        }
        if ($ten === '' || mb_strlen($ten) > 150) {
            $this->fail('Tên lớp bắt buộc và không quá 150 ký tự.');
        }
        if (!preg_match('/^(\d{4})-(\d{4})$/', $khoaHoc, $m) || (int) $m[2] <= (int) $m[1]) {
            $this->fail('Khóa học không hợp lệ (VD: 2026-2030).');
        }
        $this->getCtdt($ctdtId);
        $this->checkUnique('lop_sinh_vien', 'ma_lop', $ma, $id, 'Mã lớp');

        $params = [':ma' => $ma, ':ten' => $ten, ':kh' => $khoaHoc, ':c' => $ctdtId];

        if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
            $this->mustExist('lop_sinh_vien', $id, 'lớp sinh viên');
            $params[':id'] = $id;
            $this->db->prepare('
                UPDATE lop_sinh_vien SET ma_lop = :ma, ten_lop = :ten, khoa_hoc = :kh, chuong_trinh_id = :c WHERE id = :id
            ')->execute($params);
            Response::json(['success' => true, 'message' => 'Cập nhật lớp sinh viên thành công!']);
        }

        $this->db->prepare('INSERT INTO lop_sinh_vien (ma_lop, ten_lop, khoa_hoc, chuong_trinh_id) VALUES (:ma, :ten, :kh, :c)')
            ->execute($params);
        Response::json(['success' => true, 'message' => 'Tạo lớp sinh viên thành công!'], 201);
    }

    /** DELETE /api/cocaudaotao/lop-sinh-vien?id= */
    public function xoaLop(): void
    {
        Request::requireMethod('DELETE');
        AuthService::requireUser($this->db, ['admin']);
        $id = Request::int(Request::query('id'));
        $this->mustExist('lop_sinh_vien', $id, 'lớp sinh viên');

        $this->blockIf('SELECT COUNT(*) FROM users WHERE lop_sinh_vien_id = :id', $id, 'Không thể xóa! Lớp này đang có %d sinh viên sinh hoạt.');

        $this->db->prepare('DELETE FROM lop_sinh_vien WHERE id = :id')->execute([':id' => $id]);
        Response::json(['success' => true, 'message' => 'Đã xóa lớp sinh viên thành công!']);
    }

    // ==================================================================
    // HỌC KỲ (RULE-HK)
    // ==================================================================

    /** POST /api/cocaudaotao/hoc-ky  |  PUT (có id) — quản trị viên khai báo học kỳ */
    public function luuHocKy(): void
    {
        Request::requireMethod('POST', 'PUT');
        AuthService::requireUser($this->db, ['admin']);   // RULE-DL-06

        $id = Request::int(Request::input('id'));
        $namHoc = Request::str(Request::input('nam_hoc'));
        $hk = Request::int(Request::input('hoc_ky'));
        $bd = Request::str(Request::input('ngay_bat_dau'));
        $kt = Request::str(Request::input('ngay_ket_thuc'));

        if (!preg_match('/^(\d{4})-(\d{4})$/', $namHoc, $m) || (int) $m[2] !== (int) $m[1] + 1) {
            $this->fail('Năm học không hợp lệ (VD: 2026-2027).');
        }
        if (!in_array($hk, [1, 2, 3], true)) {
            $this->fail('Học kỳ phải là 1, 2 hoặc 3.');
        }
        $isDate = function (string $d): bool {
            $x = DateTime::createFromFormat('!Y-m-d', $d);
            return $x && $x->format('Y-m-d') === $d;
        };
        if (!$isDate($bd) || !$isDate($kt)) {
            $this->fail('Ngày bắt đầu / kết thúc học kỳ không hợp lệ.');
        }
        // RULE-HK-02: ngày kết thúc phải lớn hơn ngày bắt đầu
        if ($kt <= $bd) {
            $this->fail('Ngày kết thúc học kỳ phải lớn hơn ngày bắt đầu.');
        }

        $dup = $this->db->prepare('SELECT id FROM hoc_ky WHERE nam_hoc = :nh AND hoc_ky = :hk AND id != :id');
        $dup->execute([':nh' => $namHoc, ':hk' => $hk, ':id' => $id]);
        if ($dup->fetchColumn()) {
            $this->fail('Học kỳ ' . $hk . ' năm học ' . $namHoc . ' đã được khai báo.', 409);
        }

        // RULE-HK-08: các học kỳ trong cùng năm học không được chồng ngày nhau
        $ov = $this->db->prepare('
            SELECT hoc_ky, ngay_bat_dau, ngay_ket_thuc FROM hoc_ky
            WHERE nam_hoc = :nh AND id != :id AND ngay_bat_dau <= :kt AND :bd <= ngay_ket_thuc
        ');
        $ov->execute([':nh' => $namHoc, ':id' => $id, ':bd' => $bd, ':kt' => $kt]);
        if ($o = $ov->fetch()) {
            $this->fail('Khoảng ngày ' . $this->ngay($bd) . ' → ' . $this->ngay($kt) . ' bị chồng với học kỳ ' . $o['hoc_ky'] . ' năm học ' . $namHoc
                . ' (' . $this->ngay($o['ngay_bat_dau']) . ' → ' . $this->ngay($o['ngay_ket_thuc']) . '). Các học kỳ trong cùng năm học không được trùng thời gian. Hãy sửa (hoặc xóa nếu chưa có lớp) học kỳ bị chồng trước.', 409);
        }

        $params = [':nh' => $namHoc, ':hk' => $hk, ':bd' => $bd, ':kt' => $kt];

        if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
            $old = $this->findHocKy($id);
            // RULE-HK-06: học kỳ đã có lớp học phần thì không đổi năm học / số học kỳ
            if (($old['nam_hoc'] !== $namHoc || (int) $old['hoc_ky'] !== $hk) && $this->soLopCuaHocKy((int) $old['hoc_ky'], $old['nam_hoc']) > 0) {
                $this->fail('Học kỳ đã có lớp học phần nên không thể đổi năm học / học kỳ.', 409);
            }
        }

        // RULE-HK-03: mọi buổi học của các lớp thuộc học kỳ phải nằm trong khoảng ngày khai báo
        $r = $this->buoiCuaHocKy($hk, $namHoc, $bd, $kt);
        if ((int) $r['ngoai'] > 0) {
            $this->fail('Có ' . $r['ngoai'] . ' buổi học của lớp học phần thuộc học kỳ này nằm ngoài khoảng ' . $this->ngay($bd) . ' → ' . $this->ngay($kt)
                . ' (các buổi đang diễn ra từ ' . $this->ngay($r['tu']) . ' đến ' . $this->ngay($r['den']) . '). Hãy chọn khoảng ngày bao trùm các buổi này.', 409);
        }

        if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
            $params[':id'] = $id;
            $this->db->prepare('UPDATE hoc_ky SET nam_hoc = :nh, hoc_ky = :hk, ngay_bat_dau = :bd, ngay_ket_thuc = :kt WHERE id = :id')
                ->execute($params);
            Response::json(['success' => true, 'message' => 'Cập nhật học kỳ thành công!']);
        }

        $this->db->prepare('INSERT INTO hoc_ky (nam_hoc, hoc_ky, ngay_bat_dau, ngay_ket_thuc) VALUES (:nh, :hk, :bd, :kt)')
            ->execute($params);
        Response::json(['success' => true, 'message' => 'Khai báo học kỳ thành công!'], 201);
    }

    /** DELETE /api/cocaudaotao/hoc-ky?id= */
    public function xoaHocKy(): void
    {
        Request::requireMethod('DELETE');
        AuthService::requireUser($this->db, ['admin']);
        $id = Request::int(Request::query('id'));
        $hk = $this->findHocKy($id);

        // RULE-HK-06: không xóa học kỳ đã có lớp học phần
        $n = $this->soLopCuaHocKy((int) $hk['hoc_ky'], $hk['nam_hoc']);
        if ($n > 0) {
            $this->fail('Không thể xóa! Học kỳ đang có ' . $n . ' lớp học phần.', 409);
        }

        $this->db->prepare('DELETE FROM hoc_ky WHERE id = :id')->execute([':id' => $id]);
        Response::json(['success' => true, 'message' => 'Đã xóa học kỳ thành công!']);
    }

    private function findHocKy(int $id): array
    {
        $s = $this->db->prepare('SELECT * FROM hoc_ky WHERE id = :id');
        $s->execute([':id' => $id]);
        $row = $s->fetch();
        if (!$row) {
            $this->fail('Không tìm thấy học kỳ.', 404);
        }

        return $row;
    }

    /** Khoảng ngày thực tế và số buổi nằm ngoài [bd, kt] của các lớp thuộc học kỳ */
    private function buoiCuaHocKy(int $hk, string $namHoc, string $bd, string $kt): array
    {
        $s = $this->db->prepare('
            SELECT MIN(b.ngay_hoc) AS tu, MAX(b.ngay_hoc) AS den, COUNT(b.id) AS tong,
                   COALESCE(SUM(CASE WHEN b.ngay_hoc < :bd OR b.ngay_hoc > :kt THEN 1 ELSE 0 END), 0) AS ngoai
            FROM buoi_hoc b INNER JOIN lich_hoc lh ON lh.id = b.lich_hoc_id
            INNER JOIN lop_hoc_phan l ON l.id = lh.lop_hoc_phan_id
            WHERE l.hoc_ky = :hk AND l.nam_hoc = :nh
        ');
        $s->execute([':bd' => $bd, ':kt' => $kt, ':hk' => $hk, ':nh' => $namHoc]);

        return $s->fetch();
    }

    private function ngay(?string $d): string
    {
        return $d ? date('d/m/Y', strtotime($d)) : '—';
    }

    /** Học kỳ kèm số tuần (RULE-HK-07) và cảnh báo dữ liệu (chồng lấn RULE-HK-08, buổi ngoài học kỳ RULE-HK-03) */
    private function hocKyRows(): array
    {
        $rows = $this->db->query('
            SELECT h.*,
                   (SELECT COUNT(*) FROM lop_hoc_phan l WHERE l.hoc_ky = h.hoc_ky AND l.nam_hoc = h.nam_hoc) AS so_lop_hoc_phan
            FROM hoc_ky h ORDER BY h.nam_hoc DESC, h.hoc_ky
        ')->fetchAll();

        foreach ($rows as &$h) {
            $h['so_tuan'] = Academic::soTuan($h['ngay_bat_dau'], $h['ngay_ket_thuc']);
            $b = $this->buoiCuaHocKy((int) $h['hoc_ky'], $h['nam_hoc'], $h['ngay_bat_dau'], $h['ngay_ket_thuc']);
            $h['buoi_tu'] = $b['tu'];
            $h['buoi_den'] = $b['den'];
            $h['so_buoi'] = (int) $b['tong'];
            $h['so_buoi_ngoai_hoc_ky'] = (int) $b['ngoai'];
            $h['canh_bao'] = [];
            if ($h['so_buoi_ngoai_hoc_ky'] > 0) {
                $h['canh_bao'][] = $h['so_buoi_ngoai_hoc_ky'] . ' buổi học nằm ngoài học kỳ (buổi thực tế ' . $this->ngay($b['tu']) . ' → ' . $this->ngay($b['den']) . ')';
            }
            foreach ($rows as $o) {
                if ($o['id'] !== $h['id'] && $o['nam_hoc'] === $h['nam_hoc']
                    && $o['ngay_bat_dau'] <= $h['ngay_ket_thuc'] && $h['ngay_bat_dau'] <= $o['ngay_ket_thuc']) {
                    $h['canh_bao'][] = 'Chồng thời gian với học kỳ ' . $o['hoc_ky'] . ' (' . $this->ngay($o['ngay_bat_dau']) . ' → ' . $this->ngay($o['ngay_ket_thuc']) . ')';
                }
            }
        }
        unset($h);

        return $rows;
    }

    /** GET /api/cocaudaotao/hoc-ky — danh sách học kỳ (quản trị viên) */
    public function dsHocKy(): void
    {
        AuthService::requireUser($this->db, ['admin']);
        Response::json(['success' => true, 'data' => $this->hocKyRows()]);
    }

    /** GET /api/cocaudaotao/hoc-ky/chi-tiet?id= — thông tin học kỳ + danh sách lớp học phần thuộc học kỳ */
    public function chiTietHocKy(): void
    {
        AuthService::requireUser($this->db, ['admin']);
        $id = Request::int(Request::query('id'));
        $this->findHocKy($id);
        $hk = array_values(array_filter($this->hocKyRows(), fn($h) => (int) $h['id'] === $id))[0];

        $s = $this->db->prepare("
            SELECT l.id, l.ma_lop_hoc_phan, l.phong_hoc, l.trang_thai, l.si_so_toi_da, l.thoi_gian_mo_dang_ky, l.thoi_gian_dong_dang_ky,
                   mh.ma_mon_hoc, mh.ten_mon_hoc, mh.so_tin_chi, mh.so_tiet, gv.ho_ten AS ten_giang_vien,
                   (SELECT COUNT(*) FROM dang_ky_hoc_phan dk WHERE dk.lop_hoc_phan_id = l.id AND " . Academic::activeDkSql('dk.trang_thai') . ") AS si_so_hien_tai,
                   (SELECT COUNT(*) FROM buoi_hoc b INNER JOIN lich_hoc lh ON lh.id = b.lich_hoc_id WHERE lh.lop_hoc_phan_id = l.id) AS so_buoi,
                   (SELECT COALESCE(SUM(b.tiet_ket_thuc - b.tiet_bat_dau + 1), 0) FROM buoi_hoc b INNER JOIN lich_hoc lh ON lh.id = b.lich_hoc_id WHERE lh.lop_hoc_phan_id = l.id) AS tong_tiet_da_xep,
                   (SELECT MIN(b.ngay_hoc) FROM buoi_hoc b INNER JOIN lich_hoc lh ON lh.id = b.lich_hoc_id WHERE lh.lop_hoc_phan_id = l.id) AS buoi_dau,
                   (SELECT MAX(b.ngay_hoc) FROM buoi_hoc b INNER JOIN lich_hoc lh ON lh.id = b.lich_hoc_id WHERE lh.lop_hoc_phan_id = l.id) AS buoi_cuoi
            FROM lop_hoc_phan l
            INNER JOIN mon_hoc mh ON mh.id = l.mon_hoc_id
            LEFT JOIN users gv ON gv.id = l.giang_vien_user_id
            WHERE l.hoc_ky = :hk AND l.nam_hoc = :nh
            ORDER BY l.ma_lop_hoc_phan
        ");
        $s->execute([':hk' => $hk['hoc_ky'], ':nh' => $hk['nam_hoc']]);
        $hk['lop_hoc_phan'] = array_map([Academic::class, 'ganTrangThaiDangKy'], $s->fetchAll());

        Response::json(['success' => true, 'data' => $hk]);
    }

    private function soLopCuaHocKy(int $hk, string $namHoc): int
    {
        $s = $this->db->prepare('SELECT COUNT(*) FROM lop_hoc_phan WHERE hoc_ky = :hk AND nam_hoc = :nh');
        $s->execute([':hk' => $hk, ':nh' => $namHoc]);

        return (int) $s->fetchColumn();
    }

    // ------------------------------------------------------------------

    /** Lớp sinh hoạt / CTĐT / khóa học của sinh viên */
    private function ctdtCuaSinhVien(int $userId): ?array
    {
        $stmt = $this->db->prepare('
            SELECT l.chuong_trinh_id, l.khoa_hoc
            FROM users u INNER JOIN lop_sinh_vien l ON l.id = u.lop_sinh_vien_id
            WHERE u.id = :id
        ');
        $stmt->execute([':id' => $userId]);

        return $stmt->fetch() ?: null;
    }

    /** [môn đã đạt, môn đang học] theo kết quả đăng ký chưa hủy */
    private function tinhTrangHoc(int $userId): array
    {
        $stmt = $this->db->prepare('
            SELECT lhp.mon_hoc_id, d.ket_qua, d.diem_tong_ket
            FROM dang_ky_hoc_phan dk
            INNER JOIN lop_hoc_phan lhp ON lhp.id = dk.lop_hoc_phan_id
            LEFT JOIN diem d ON d.dang_ky_id = dk.id
            WHERE dk.sinh_vien_user_id = :id AND ' . Academic::activeDkSql('dk.trang_thai'));
        $stmt->execute([':id' => $userId]);

        $daHoc = [];
        $dangHoc = [];
        foreach ($stmt->fetchAll() as $r) {
            if ($r['ket_qua'] === 'Đạt') {
                $daHoc[$r['mon_hoc_id']] = true;
            } elseif ($r['diem_tong_ket'] === null) {
                $dangHoc[$r['mon_hoc_id']] = true;
            }
        }

        return [$daHoc, $dangHoc];
    }

    /** Một môn chỉ thuộc tối đa một nhóm tự chọn trong cùng CTĐT */
    private function assertNotInElective(int $ctdtId, int $monId): void
    {
        $stmt = $this->db->prepare('
            SELECT n.ma_nhom FROM chi_tiet_nhom_tu_chon ctn
            INNER JOIN nhom_tu_chon n ON n.id = ctn.nhom_tu_chon_id
            WHERE n.chuong_trinh_id = :c AND ctn.mon_hoc_id = :m
        ');
        $stmt->execute([':c' => $ctdtId, ':m' => $monId]);
        $ma = $stmt->fetchColumn();

        if ($ma !== false) {
            $this->fail('Môn học đã thuộc nhóm tự chọn ' . $ma . ' của chương trình này.', 409);
        }
    }

    private function getCtdt(int $id): array
    {
        $stmt = $this->db->prepare('SELECT * FROM chuong_trinh_dao_tao WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        if (!$row) {
            $this->fail('Vui lòng chọn chương trình đào tạo hợp lệ.');
        }

        return $row;
    }

    private function exists(string $table, int $id): bool
    {
        if ($id <= 0) {
            return false;
        }
        $stmt = $this->db->prepare("SELECT 1 FROM {$table} WHERE id = :id");
        $stmt->execute([':id' => $id]);

        return $stmt->fetchColumn() !== false;
    }

    private function mustExist(string $table, int $id, string $label): void
    {
        if (!$this->exists($table, $id)) {
            $this->fail('Không tìm thấy ' . $label . '.', 404);
        }
    }

    private function checkUnique(string $table, string $col, string $value, int $selfId, string $label): void
    {
        $stmt = $this->db->prepare("SELECT 1 FROM {$table} WHERE UPPER({$col}) = UPPER(:v) AND id != :id");
        $stmt->execute([':v' => $value, ':id' => $selfId]);
        if ($stmt->fetchColumn()) {
            $this->fail($label . ' "' . $value . '" đã tồn tại!', 409);
        }
    }

    private function blockIf(string $sql, int $id, string $message): void
    {
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $id]);
        $n = (int) $stmt->fetchColumn();
        if ($n > 0) {
            $this->fail(sprintf($message, $n), 409);
        }
    }

    private function fail(string $message, int $status = 422): void
    {
        Response::json(['success' => false, 'message' => $message], $status);
    }
}
