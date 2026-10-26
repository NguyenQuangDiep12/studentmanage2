<?php

require_once __DIR__ . '/Jwt.php';
require_once __DIR__ . '/Response.php';

class AuthService
{
    // Trạng thái tài khoản lưu trong DB và nhãn hiển thị
    public const ACTIVE = 'hoat_dong';
    public const LOCKED = 'da_khoa';

    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    /**
     * RULE-21: Đăng nhập bằng mã định danh (mã sinh viên / mã giảng viên) + mật khẩu.
     */
    public function login(
        string $maDinhDanh,
        string $password
    ): ?array {
        $sql = '
            SELECT id, ma_dinh_danh, password,
                   ho_ten, vai_tro, lop_sinh_vien_id, khoa_id, trang_thai
            FROM users
            WHERE ma_dinh_danh = :ma_dinh_danh
            LIMIT 1
        ';
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'ma_dinh_danh' => $maDinhDanh
        ]);
        $user = $stmt->fetch();
        if (!$user || $password !== $user['password']) {
            return null;
        }

        if (!self::isActive($user['trang_thai'] ?? null)) {
            throw new DomainException('Tài khoản đã bị vô hiệu hóa.');
        }

        // Chuẩn hóa vai trò cho giao diện và hệ thống
        $vaiTro = self::normalizeRole($user['vai_tro']);

        $token = Jwt::create([
            'sub' => (int) $user['id'],
            'ma_dinh_danh' => $user['ma_dinh_danh'],
            'vai_tro' => $vaiTro
        ]);

        return [
            'access_token' => $token,
            'token_type' => 'Bearer',
            'expires_in' => 3600,
            'user' => [
                'id' => (int) $user['id'],
                'ma_dinh_danh' => $user['ma_dinh_danh'],
                'ho_ten' => $user['ho_ten'],
                'vai_tro' => $vaiTro,
                'lop_sinh_vien_id' => $user['lop_sinh_vien_id'] ?? null,
                'khoa_id' => $user['khoa_id'] ?? null
            ]
        ];
    }

    public static function normalizeRole(?string $role): string
    {
        if ($role === 'student') {
            return 'sinh_vien';
        }

        if ($role === 'lecturer') {
            return 'giang_vien';
        }

        return (string) $role;
    }

    public static function isActive(?string $trangThai): bool
    {
        // Dữ liệu cũ không có trạng thái được coi là đang hoạt động
        if ($trangThai === null || $trangThai === '') {
            return true;
        }

        return in_array($trangThai, ['hoat_dong', 'active', 'Hoạt động'], true);
    }

    public static function statusLabel(?string $trangThai): string
    {
        return self::isActive($trangThai) ? 'Hoạt động' : 'Đã khóa';
    }

    /**
     * RULE-26.3: Lấy access token từ header "Authorization: Bearer <token>" (RFC 6750).
     * - Lấy giá trị header đầu tiên KHÁC RỖNG (Apache có thể đặt HTTP_AUTHORIZATION = "" rồi để giá trị thật
     *   ở REDIRECT_HTTP_AUTHORIZATION sau khi rewrite qua .htaccess; toán tử ?? không bỏ qua chuỗi rỗng).
     * - Header phải bắt đầu đúng bằng "Bearer " và chỉ chứa một token dạng JWT (3 phần base64url) - không chấp nhận
     *   "Basic ...", "xBearer ...", hay token kèm chuỗi thừa phía sau.
     */
    public static function bearerToken(): ?string
    {
        $header = '';
        foreach (['HTTP_AUTHORIZATION', 'REDIRECT_HTTP_AUTHORIZATION'] as $key) {
            if (!empty($_SERVER[$key])) {
                $header = (string) $_SERVER[$key];
                break;
            }
        }

        if ($header === '' && function_exists('getallheaders')) {
            foreach (getallheaders() as $name => $value) {
                if (strtolower($name) === 'authorization' && $value !== '') {
                    $header = (string) $value;
                    break;
                }
            }
        }

        if (preg_match('/^\s*Bearer[ \t]+([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\s*$/i', $header, $m)) {
            return $m[1];
        }

        return null;
    }

    /** Trả payload token hợp lệ, chưa bị thu hồi; ngược lại null. */
    public static function tokenPayload(PDO $db): ?array
    {
        $token = self::bearerToken();

        if ($token === null) {
            return null;
        }

        $payload = Jwt::verify($token);

        if ($payload === null || Jwt::isRevoked($payload['jti'], $db)) {
            return null;
        }

        return $payload;
    }

    /**
     * Xác thực request (RULE-26.3) và kiểm tra vai trò.
     * Trả về bản ghi user (không có password) nếu hợp lệ.
     */
    public static function requireUser(PDO $db, array $roles = []): array
    {
        $payload = self::tokenPayload($db);

        if ($payload === null) {
            // RFC 6750: phản hồi 401 kèm WWW-Authenticate cho biết cần Bearer token / token không hợp lệ
            header(self::bearerToken() === null
                ? 'WWW-Authenticate: Bearer realm="api"'
                : 'WWW-Authenticate: Bearer realm="api", error="invalid_token"');
            Response::json([
                'success' => false,
                'message' => 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.'
            ], 401);
        }

        $stmt = $db->prepare('SELECT * FROM users WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => (int) $payload['sub']]);
        $user = $stmt->fetch();

        if (!$user) {
            header('WWW-Authenticate: Bearer realm="api", error="invalid_token"');
            Response::json([
                'success' => false,
                'message' => 'Tài khoản không tồn tại.'
            ], 401);
        }

        if (!self::isActive($user['trang_thai'] ?? null)) {
            Response::json([
                'success' => false,
                'message' => 'Tài khoản đã bị vô hiệu hóa.'
            ], 403);
        }

        unset($user['password']);
        $user['id'] = (int) $user['id'];
        $user['vai_tro'] = self::normalizeRole($user['vai_tro']);

        if ($roles && !in_array($user['vai_tro'], $roles, true)) {
            Response::json([
                'success' => false,
                'message' => 'Bạn không có quyền thực hiện chức năng này.'
            ], 403);
        }

        return $user;
    }
}
