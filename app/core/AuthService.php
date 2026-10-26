<?php

require_once __DIR__ . '/Jwt.php';

class AuthService
{
    private PDO $db;
    public function __construct(PDO $db)
    {
        $this->db = $db;
    }
    public function login(
        string $maDinhDanh,
        string $password
    ): ?array {
        $sql = '
            SELECT id, ma_dinh_danh, password,
                   ho_ten, vai_tro, trang_thai
            FROM users
            WHERE ma_dinh_danh = :ma_dinh_danh
            LIMIT 1
        ';
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'ma_dinh_danh' => $maDinhDanh
        ]);
        $user = $stmt->fetch();
        if (!$user || !password_verify($password, $user['password'])) {
            return null;
        }
        // Điều chỉnh điều kiện này theo giá trị trang_thai
        // thực tế trong database của bạn.
        if (
            isset($user['trang_thai']) &&
            !in_array(
                $user['trang_thai'],
                ['hoat_dong', 'active'],
                true
            )
        ) {
            throw new DomainException('Tài khoản đã bị vô hiệu hóa.');
        }
        $token = Jwt::create([
            'sub' => (int) $user['id'],
            'ma_dinh_danh' => $user['ma_dinh_danh'],
            'vai_tro' => $user['vai_tro']
        ]);
        return [
            'access_token' => $token,
            'token_type' => 'Bearer',
            'expires_in' => 3600,
            'user' => [
                'id' => (int) $user['id'],
                'ma_dinh_danh' => $user['ma_dinh_danh'],
                'ho_ten' => $user['ho_ten'],
                'vai_tro' => $user['vai_tro']
            ]
        ];
    }
}