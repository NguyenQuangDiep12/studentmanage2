<?php

require_once dirname(__DIR__, 2) . '/config/database.php';
require_once dirname(__DIR__, 2) . '/core/Response.php';

class Doimatkhau
{
    public function handle(): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            header('Allow: POST');

            Response::json([
                'message' => 'Phương thức không được hỗ trợ.'
            ], 405);
        }

        $input = json_decode(
            file_get_contents('php://input'),
            true
        );

        if (!is_array($input)) {
            Response::json([
                'message' => 'Dữ liệu JSON không hợp lệ.'
            ], 400);
        }

        $maDinhDanh = trim($input['ma_dinh_danh'] ?? '');
        $oldPassword = $input['old_password'] ?? '';
        $newPassword = $input['new_password'] ?? '';

        if (
            $maDinhDanh === '' ||
            !is_string($oldPassword) ||
            !is_string($newPassword) ||
            $oldPassword === '' ||
            $newPassword === ''
        ) {
            Response::json([
                'message' => 'Vui lòng nhập đầy đủ thông tin.'
            ], 422);
        }

        if (strlen($newPassword) < 6) {
            Response::json([
                'message' => 'Mật khẩu mới phải có ít nhất 6 ký tự.'
            ], 422);
        }

        if ($oldPassword === $newPassword) {
            Response::json([
                'message' => 'Mật khẩu mới không được trùng mật khẩu cũ.'
            ], 422);
        }

        try {
            $db = Database::connect();

            $stmt = $db->prepare(
                'SELECT id, password
                 FROM users
                 WHERE ma_dinh_danh = :ma_dinh_danh
                 LIMIT 1'
            );

            $stmt->execute([
                ':ma_dinh_danh' => $maDinhDanh
            ]);

            $user = $stmt->fetch();

            if (
                !$user ||
                !password_verify($oldPassword, $user['password'])
            ) {
                Response::json([
                    'message' => 'Mã định danh hoặc mật khẩu cũ không đúng.'
                ], 400);
            }

            $newHash = password_hash(
                $newPassword,
                PASSWORD_DEFAULT
            );

            $update = $db->prepare(
                'UPDATE users
                 SET password = :password
                 WHERE id = :id'
            );

            $update->execute([
                ':password' => $newHash,
                ':id' => $user['id']
            ]);

            Response::json([
                'message' => 'Đổi mật khẩu thành công.'
            ]);
        } catch (Throwable $e) {
            error_log((string) $e);

            Response::json([
                'message' => 'Đã xảy ra lỗi máy chủ.'
            ], 500);
        }
    }
}