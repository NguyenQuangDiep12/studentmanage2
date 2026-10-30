<?php

require_once dirname(__DIR__, 2) . '/config/database.php';
require_once dirname(__DIR__, 2) . '/core/Response.php';
require_once dirname(__DIR__, 2) . '/core/Request.php';
require_once dirname(__DIR__, 2) . '/core/AuthService.php';
require_once dirname(__DIR__, 2) . '/core/Academic.php';

/**
 * Quản lý thông tin sinh viên và giảng viên (RULE-24, RULE-25)
 */
class Quanlytaikhoan
{
    private PDO $db;

    private const ROLES = ['sinh_vien', 'giang_vien', 'admin'];
    private const DEFAULT_PASSWORD = '123456';

    public function __construct()
    {
        $this->db = Database::connect();
    }

    /** GET /api/taikhoan/me — hồ sơ người dùng đang đăng nhập */
    public function me(): void
    {
        $user = AuthService::requireUser($this->db);

        Response::json([
            'success' => true,
            'data' => $this->findUser((int) $user['id'])
        ]);
    }

    /** GET /api/taikhoan/danh-muc — khoa và lớp sinh viên phục vụ form/bộ lọc */
    public function danhMuc(): void
    {
        AuthService::requireUser($this->db, ['admin']);

        $khoa = $this->db->query('SELECT id, ma_khoa, ten_khoa FROM khoa ORDER BY ma_khoa')->fetchAll();
        $lop = $this->db->query('
            SELECT l.id, l.ma_lop, l.ten_lop, l.khoa_hoc, l.chuong_trinh_id, ct.ten_chuong_trinh
            FROM lop_sinh_vien l
            LEFT JOIN chuong_trinh_dao_tao ct ON ct.id = l.chuong_trinh_id
            ORDER BY l.ma_lop
        ')->fetchAll();

        Response::json([
            'success' => true,
            'data' => ['khoa' => $khoa, 'lop_sinh_vien' => $lop]
        ]);
    }

    /**
     * GET /api/taikhoan/users?vai_tro=sinh_vien|giang_vien&search=&trang_thai=&lop_sinh_vien_id=&khoa_id=
     * RULE-24.1, RULE-25.1
     */
    public function index(): void
    {
        AuthService::requireUser($this->db, ['admin']);

        $sql = $this->baseSelect() . ' WHERE 1 = 1';
        $params = [];

        $vaiTro = Request::str(Request::query('vai_tro', ''));
        if ($vaiTro !== '') {
            $sql .= ' AND u.vai_tro IN (:vt, :vt_alias)';
            $params[':vt'] = $vaiTro;
            $params[':vt_alias'] = $vaiTro === 'sinh_vien' ? 'student' : ($vaiTro === 'giang_vien' ? 'lecturer' : $vaiTro);
        }

        $trangThai = Request::str(Request::query('trang_thai', ''));
        if ($trangThai === 'Hoạt động') {
            $sql .= " AND (u.trang_thai IS NULL OR u.trang_thai IN ('hoat_dong', 'active', 'Hoạt động'))";
        } elseif ($trangThai === 'Đã khóa') {
            $sql .= " AND u.trang_thai IS NOT NULL AND u.trang_thai NOT IN ('hoat_dong', 'active', 'Hoạt động')";
        }

        $lopId = Request::int(Request::query('lop_sinh_vien_id'));
        if ($lopId > 0) {
            $sql .= ' AND u.lop_sinh_vien_id = :lop';
            $params[':lop'] = $lopId;
        }

        $khoaId = Request::int(Request::query('khoa_id'));
        if ($khoaId > 0) {
            $sql .= ' AND u.khoa_id = :khoa';
            $params[':khoa'] = $khoaId;
        }

        $search = Request::str(Request::query('search', ''));
        if ($search !== '') {
            $sql .= ' AND (u.ma_dinh_danh LIKE :s1 OR u.ho_ten LIKE :s2 OR u.so_dien_thoai LIKE :s3 OR u.email LIKE :s4)';
            $kw = '%' . $search . '%';
            $params += [':s1' => $kw, ':s2' => $kw, ':s3' => $kw, ':s4' => $kw];
        }

        $sql .= ' ORDER BY u.id DESC';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $list = array_map([$this, 'present'], $stmt->fetchAll());

        Response::json([
            'success' => true,
            'total' => count($list),
            'data' => $list
        ]);
    }

    /** GET /api/taikhoan/user?id= */
    public function show(): void
    {
        AuthService::requireUser($this->db, ['admin']);

        $user = $this->findUser(Request::int(Request::query('id')));

        if (!$user) {
            Response::json(['success' => false, 'message' => 'Không tìm thấy tài khoản.'], 404);
        }

        Response::json(['success' => true, 'data' => $user]);
    }

    /** POST /api/taikhoan/users — thêm sinh viên / giảng viên */
    public function store(): void
    {
        Request::requireMethod('POST');
        AuthService::requireUser($this->db, ['admin']);

        $data = $this->validate(Request::body(), null);

        $password = Request::input('password', '');
        $password = is_string($password) && $password !== '' ? $password : self::DEFAULT_PASSWORD;
        if (mb_strlen($password) < 6) {
            Response::json(['success' => false, 'message' => 'Mật khẩu khởi tạo phải có ít nhất 6 ký tự.'], 422);
        }

        $data['password'] = $password;
        $data['created_at'] = date('Y-m-d H:i:s');

        $cols = array_keys($data);
        $sql = 'INSERT INTO users (' . implode(', ', $cols) . ') VALUES (:' . implode(', :', $cols) . ')';
        $this->db->prepare($sql)->execute($this->bind($data));

        $id = (int) $this->db->lastInsertId();

        Response::json([
            'success' => true,
            'message' => 'Thêm tài khoản thành công.',
            'data' => $this->findUser($id)
        ], 201);
    }

    /** PUT /api/taikhoan/users — sửa thông tin (body có id) */
    public function update(): void
    {
        Request::requireMethod('PUT', 'POST');
        $admin = AuthService::requireUser($this->db, ['admin']);

        $id = Request::int(Request::input('id'));
        $existing = $this->rawUser($id);

        if (!$existing) {
            Response::json(['success' => false, 'message' => 'Không tìm thấy tài khoản.'], 404);
        }

        // Trường không gửi lên thì giữ giá trị hiện tại
        $merged = array_merge(
            array_intersect_key($existing, array_flip([
                'ho_ten', 'ngay_sinh', 'gioi_tinh', 'email', 'so_dien_thoai', 'dia_chi', 'lop_sinh_vien_id', 'khoa_id', 'trang_thai'
            ])),
            Request::body()
        );
        $data = $this->validate($merged, $existing);

        if ($id === (int) $admin['id'] && $data['trang_thai'] !== AuthService::ACTIVE) {
            Response::json(['success' => false, 'message' => 'Không thể tự khóa tài khoản đang đăng nhập.'], 422);
        }

        // Mã định danh (mã đăng nhập) và vai trò không thay đổi khi sửa
        unset($data['ma_dinh_danh'], $data['vai_tro']);

        $sets = implode(', ', array_map(fn($c) => "{$c} = :{$c}", array_keys($data)));
        $params = $this->bind($data);
        $params[':id'] = $id;

        $this->db->prepare("UPDATE users SET {$sets} WHERE id = :id")->execute($params);

        Response::json([
            'success' => true,
            'message' => 'Cập nhật thông tin tài khoản thành công.',
            'data' => $this->findUser($id)
        ]);
    }

    /** POST /api/taikhoan/users/trang-thai — body { id, trang_thai: "Hoạt động" | "Đã khóa" } (RULE-24.5, 25.5) */
    public function changeStatus(): void
    {
        Request::requireMethod('POST', 'PUT');
        $admin = AuthService::requireUser($this->db, ['admin']);

        $id = Request::int(Request::input('id'));
        $user = $this->rawUser($id);

        if (!$user) {
            Response::json(['success' => false, 'message' => 'Không tìm thấy tài khoản.'], 404);
        }

        $status = $this->parseStatus(Request::input('trang_thai'));
        if ($status === null) {
            Response::json(['success' => false, 'message' => 'Trạng thái không hợp lệ (Hoạt động hoặc Đã khóa).'], 422);
        }

        if ($id === (int) $admin['id'] && $status !== AuthService::ACTIVE) {
            Response::json(['success' => false, 'message' => 'Không thể tự khóa tài khoản đang đăng nhập.'], 422);
        }

        $this->db->prepare('UPDATE users SET trang_thai = :tt WHERE id = :id')
            ->execute([':tt' => $status, ':id' => $id]);

        Response::json([
            'success' => true,
            'message' => 'Đã chuyển trạng thái tài khoản sang: ' . AuthService::statusLabel($status),
            'data' => $this->findUser($id)
        ]);
    }

    /** POST /api/taikhoan/users/dat-lai-mat-khau — body { id } */
    public function resetPassword(): void
    {
        Request::requireMethod('POST');
        AuthService::requireUser($this->db, ['admin']);

        $id = Request::int(Request::input('id'));
        if (!$this->rawUser($id)) {
            Response::json(['success' => false, 'message' => 'Không tìm thấy tài khoản.'], 404);
        }

        $this->db->prepare('UPDATE users SET password = :p WHERE id = :id')
            ->execute([':p' => self::DEFAULT_PASSWORD, ':id' => $id]);

        Response::json([
            'success' => true,
            'message' => 'Đặt lại mật khẩu thành công! Mật khẩu mới là ' . self::DEFAULT_PASSWORD
        ]);
    }

    /** GET /api/taikhoan/thong-ke — số liệu bảng điều khiển */
    public function thongKe(): void
    {
        AuthService::requireUser($this->db);

        $count = fn(string $sql) => (int) $this->db->query($sql)->fetchColumn();

        $avg = $this->db->query('SELECT AVG(diem_tong_ket) FROM diem WHERE diem_tong_ket IS NOT NULL')->fetchColumn();

        $students = $this->db->query("
            SELECT u.ma_dinh_danh, u.ho_ten, u.trang_thai, l.ma_lop
            FROM users u
            LEFT JOIN lop_sinh_vien l ON l.id = u.lop_sinh_vien_id
            WHERE u.vai_tro IN ('sinh_vien', 'student')
            ORDER BY u.id DESC
            LIMIT 5
        ")->fetchAll();
        foreach ($students as &$s) {
            $s['trang_thai'] = AuthService::statusLabel($s['trang_thai']);
        }
        unset($s);

        $classes = $this->db->query("
            SELECT lhp.id, lhp.ma_lop_hoc_phan, lhp.si_so_toi_da, lhp.trang_thai, lhp.thoi_gian_mo_dang_ky, lhp.thoi_gian_dong_dang_ky, mh.ten_mon_hoc,
                   (SELECT COUNT(*) FROM dang_ky_hoc_phan dk
                     WHERE dk.lop_hoc_phan_id = lhp.id AND " . Academic::activeDkSql('dk.trang_thai') . ") AS si_so_hien_tai
            FROM lop_hoc_phan lhp
            INNER JOIN mon_hoc mh ON mh.id = lhp.mon_hoc_id
            ORDER BY si_so_hien_tai DESC, lhp.id DESC
            LIMIT 5
        ")->fetchAll();
        $classes = array_map([Academic::class, 'ganTrangThaiDangKy'], $classes);

        Response::json([
            'success' => true,
            'data' => [
                'tong_sinh_vien' => $count("SELECT COUNT(*) FROM users WHERE vai_tro IN ('sinh_vien', 'student')"),
                'tong_nguoi_dung' => $count('SELECT COUNT(*) FROM users'),
                'tong_giang_vien' => $count("SELECT COUNT(*) FROM users WHERE vai_tro IN ('giang_vien', 'lecturer')"),
                'tong_mon_hoc' => $count("SELECT COUNT(*) FROM mon_hoc"),
                'tong_lop_hoc_phan' => $count('SELECT COUNT(*) FROM lop_hoc_phan'),
                'tong_dang_ky' => $count('SELECT COUNT(*) FROM dang_ky_hoc_phan WHERE ' . Academic::activeDkSql()),
                'tong_kien_nghi' => $count('SELECT COUNT(*) FROM kien_nghi'),
                'tong_tin_tuc' => $count("SELECT COUNT(*) FROM tin_tuc WHERE trang_thai = 'Công khai'"),
                'diem_trung_binh' => $avg === null || $avg === false ? null : round((float) $avg, 1),
                'sinh_vien_moi' => $students,
                'lop_noi_bat' => $classes,
            ]
        ]);
    }

    // ------------------------------------------------------------------

    private function baseSelect(): string
    {
        return '
            SELECT u.id, u.ma_dinh_danh, u.ho_ten, u.vai_tro, u.ngay_sinh, u.gioi_tinh,
                   u.email, u.so_dien_thoai, u.dia_chi, u.lop_sinh_vien_id, u.khoa_id, u.trang_thai, u.created_at,
                   l.ma_lop, l.ten_lop, l.khoa_hoc, ct.id AS chuong_trinh_id, ct.ten_chuong_trinh,
                   k.ma_khoa, k.ten_khoa,
                   (SELECT COUNT(*) FROM lop_hoc_phan lhp
                     WHERE lhp.giang_vien_user_id = u.id AND lhp.trang_thai != \'Đã hủy\') AS so_lop_dang_mo
            FROM users u
            LEFT JOIN lop_sinh_vien l ON l.id = u.lop_sinh_vien_id
            LEFT JOIN chuong_trinh_dao_tao ct ON ct.id = l.chuong_trinh_id
            LEFT JOIN khoa k ON k.id = u.khoa_id
        ';
    }

    private function findUser(int $id): ?array
    {
        $stmt = $this->db->prepare($this->baseSelect() . ' WHERE u.id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();

        return $row ? $this->present($row) : null;
    }

    private function rawUser(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }
        $stmt = $this->db->prepare('SELECT * FROM users WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);

        return $stmt->fetch() ?: null;
    }

    private function present(array $u): array
    {
        $u['id'] = (int) $u['id'];
        $u['vai_tro'] = AuthService::normalizeRole($u['vai_tro']);
        $u['trang_thai_code'] = $u['trang_thai'];
        $u['trang_thai'] = AuthService::statusLabel($u['trang_thai']);
        $u['lop_sinh_vien_id'] = $u['lop_sinh_vien_id'] !== null ? (int) $u['lop_sinh_vien_id'] : null;
        $u['khoa_id'] = $u['khoa_id'] !== null ? (int) $u['khoa_id'] : null;

        return $u;
    }

    private function parseStatus($value): ?string
    {
        $v = Request::str($value);

        if (in_array($v, ['Hoạt động', 'hoat_dong', 'active'], true)) {
            return AuthService::ACTIVE;
        }
        if (in_array($v, ['Đã khóa', 'da_khoa', 'locked'], true)) {
            return AuthService::LOCKED;
        }

        return null;
    }

    private function bind(array $data): array
    {
        $params = [];
        foreach ($data as $k => $v) {
            $params[':' . $k] = $v;
        }

        return $params;
    }

    /**
     * RULE-24.3, 25.3: kiểm tra hợp lệ; RULE-24.4, 25.4: không trùng mã định danh (mã dùng để đăng nhập).
     */
    private function validate(array $in, ?array $existing): array
    {
        $isEdit = $existing !== null;
        $errors = [];

        $ma = $isEdit ? $existing['ma_dinh_danh'] : strtoupper(Request::str($in['ma_dinh_danh'] ?? ''));
        $vaiTro = $isEdit ? AuthService::normalizeRole($existing['vai_tro']) : Request::str($in['vai_tro'] ?? '');

        $hoTen = Request::str($in['ho_ten'] ?? '');
        $ngaySinh = Request::str($in['ngay_sinh'] ?? '');
        $gioiTinh = Request::str($in['gioi_tinh'] ?? '');
        $email = Request::str($in['email'] ?? '');
        $phone = Request::str($in['so_dien_thoai'] ?? '');
        $diaChi = Request::str($in['dia_chi'] ?? '');
        $lopId = Request::int($in['lop_sinh_vien_id'] ?? 0);
        $khoaId = Request::int($in['khoa_id'] ?? 0);

        $status = array_key_exists('trang_thai', $in)
            ? $this->parseStatus($in['trang_thai'])
            : ($isEdit ? ($existing['trang_thai'] ?: AuthService::ACTIVE) : AuthService::ACTIVE);

        if (!$isEdit) {
            if (!preg_match('/^[A-Z0-9_.-]{3,31}$/', $ma)) { // [Lỗi gieo #01]
                $errors[] = 'Mã sinh viên / mã giảng viên bắt buộc, 3-30 ký tự gồm chữ, số, dấu _ . -';
            }
            if (!in_array($vaiTro, self::ROLES, true)) {
                $errors[] = 'Vai trò không hợp lệ.';
            }
        }

        if ($hoTen === '' || mb_strlen($hoTen) > 101) { // [Lỗi gieo #02]
            $errors[] = 'Họ và tên bắt buộc và không quá 100 ký tự.';
        }

        if ($ngaySinh !== '') {
            $d = DateTime::createFromFormat('Y-m-d', $ngaySinh);
            if (!$d || $d->format('Y-m-d') !== $ngaySinh) {
                $errors[] = 'Ngày sinh không hợp lệ (định dạng YYYY-MM-DD).';
            } elseif ($ngaySinh >= date('Y-m-d')) {
                $errors[] = 'Ngày sinh phải trước ngày hiện tại.';
            }
        }

        if ($gioiTinh !== '' && !in_array($gioiTinh, ['Nam', 'Nữ', 'Khác'], true)) {
            $errors[] = 'Giới tính không hợp lệ.';
        }

        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'Email không đúng định dạng.';
        }

        if ($phone !== '' && !preg_match('/^0\d{8,10}$/', $phone)) { // [Lỗi gieo #03]
            $errors[] = 'Số điện thoại phải gồm 10-11 chữ số và bắt đầu bằng 0.';
        }

        if ($status === null) {
            $errors[] = 'Trạng thái không hợp lệ.';
        }

        if ($vaiTro === 'sinh_vien') {
            if ($lopId <= 0 || !$this->exists('lop_sinh_vien', $lopId)) {
                $errors[] = 'Vui lòng chọn lớp sinh viên sinh hoạt hợp lệ cho sinh viên.';
            }
        }

        if ($vaiTro === 'giang_vien') {
            if ($khoaId <= 0 || !$this->exists('khoa', $khoaId)) {
                $errors[] = 'Vui lòng chọn khoa trực thuộc hợp lệ cho giảng viên.';
            }
        }

        if ($errors) {
            Response::json(['success' => false, 'message' => $errors[0], 'errors' => $errors], 422);
        }

        if (!$isEdit) {
            // RULE-24.4, 25.4: mã định danh dùng để đăng nhập nên không được trùng
            $dup = $this->db->prepare('SELECT 1 FROM users WHERE UPPER(ma_dinh_danh) = UPPER(:ma) LIMIT 1');
            $dup->execute([':ma' => $ma]);

            if ($dup->fetchColumn()) {
                Response::json(['success' => false, 'message' => 'Mã định danh "' . $ma . '" đã tồn tại trong hệ thống!'], 409);
            }
        }

        return [
            'ma_dinh_danh' => $ma,
            'vai_tro' => $vaiTro,
            'ho_ten' => $hoTen,
            'ngay_sinh' => $ngaySinh !== '' ? $ngaySinh : null,
            'gioi_tinh' => $gioiTinh !== '' ? $gioiTinh : null,
            'email' => $email !== '' ? $email : null,
            'so_dien_thoai' => $phone !== '' ? $phone : null,
            'dia_chi' => $diaChi !== '' ? $diaChi : null,
            'lop_sinh_vien_id' => $vaiTro === 'sinh_vien' ? $lopId : null,
            'khoa_id' => $vaiTro === 'giang_vien' ? $khoaId : null,
            'trang_thai' => $status,
        ];
    }

    private function exists(string $table, int $id): bool
    {
        $stmt = $this->db->prepare("SELECT 1 FROM {$table} WHERE id = :id");
        $stmt->execute([':id' => $id]);

        return $stmt->fetchColumn() !== false;
    }
}
