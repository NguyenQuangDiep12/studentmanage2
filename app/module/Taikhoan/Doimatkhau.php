<?php

require_once dirname(__DIR__, 2) . '/config/database.php';
require_once dirname(__DIR__, 2) . '/core/Response.php';
require_once dirname(__DIR__, 2) . '/core/Request.php';
require_once dirname(__DIR__, 2) . '/core/AuthService.php';

class Doimatkhau
{
    /**
     * POST /api/taikhoan/doi-mat-khau
     * Header: Authorization: Bearer <token>
     * Body: { old_password, new_password }
     * RULE-23: Phải đăng nhập, đúng mật khẩu hiện tại, mật khẩu mới hợp lệ.
     */
    public function handle(): void
    {
        Request::requireMethod('POST');

        $db = Database::connect();
        $user = AuthService::requireUser($db);

        $oldPassword = Request::input('old_password', '');
        $newPassword = Request::input('new_password', '');

        if (
            !is_string($oldPassword) ||
            !is_string($newPassword) ||
            $oldPassword === '' ||
            $newPassword === ''
        ) {
            Response::json([
                'success' => false,
                'message' => 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới.'
            ], 422);
        }

        $confirm = Request::input('confirm_password');
        if ($confirm !== null && $confirm !== $newPassword) {
            Response::json(['success' => false, 'message' => 'Xác nhận mật khẩu mới không khớp.'], 422);
        }

        $error = self::validateNewPassword($newPassword);
        if ($error !== null) {
            Response::json(['success' => false, 'message' => $error], 422);
        }

        if ($oldPassword === $newPassword) {
            Response::json([
                'success' => false,
                'message' => 'Mật khẩu mới không được trùng mật khẩu cũ.'
            ], 422);
        }

        $stmt = $db->prepare('SELECT password FROM users WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $user['id']]);
        $current = $stmt->fetchColumn();

        if ($current === false || $oldPassword !== $current) {
            Response::json([
                'success' => false,
                'message' => 'Mật khẩu hiện tại không đúng.'
            ], 400);
        }

        $db->prepare('UPDATE users SET password = :password WHERE id = :id')
            ->execute([':password' => $newPassword, ':id' => $user['id']]);

        Response::json([
            'success' => true,
            'message' => 'Đổi mật khẩu thành công.'
        ]);
    }

    /** Điều kiện hợp lệ của mật khẩu mới (dùng chung cho quên mật khẩu) */
    public static function validateNewPassword(string $password): ?string
    {
        if (mb_strlen($password) < 6) {
            return 'Mật khẩu mới phải có ít nhất 6 ký tự.';
        }

        if (mb_strlen($password) > 64) {
            return 'Mật khẩu mới không được vượt quá 64 ký tự.';
        }

        if (preg_match('/\s/', $password)) {
            return 'Mật khẩu mới không được chứa khoảng trắng.';
        }

        return null;
    }
}
