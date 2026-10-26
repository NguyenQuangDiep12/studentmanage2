<?php

require_once dirname(__DIR__, 2) . '/config/database.php';
require_once dirname(__DIR__, 2) . '/core/Response.php';
require_once dirname(__DIR__, 2) . '/core/Request.php';
require_once __DIR__ . '/Doimatkhau.php';

class Quenmatkhau
{
    /**
     * POST /api/taikhoan/quen-mat-khau
     * Body: { ma_dinh_danh, email, new_password, confirm_password }
     * RULE-22: Xác minh danh tính bằng mã định danh (mã SV / mã GV)
     * kết hợp email đã đăng ký trong hồ sơ, đúng mới cho đặt lại mật khẩu.
     */
    public function handle(): void
    {
        Request::requireMethod('POST');

        $maDinhDanh = Request::str(Request::input('ma_dinh_danh'));
        $email = Request::str(Request::input('email'));
        $newPassword = Request::input('new_password', '');

        if ($maDinhDanh === '' || $email === '' || !is_string($newPassword) || $newPassword === '') {
            Response::json([
                'success' => false,
                'message' => 'Vui lòng nhập mã sinh viên / mã giảng viên, email đã đăng ký và mật khẩu mới.'
            ], 422);
        }

        $confirm = Request::input('confirm_password');
        if ($confirm !== null && $confirm !== $newPassword) {
            Response::json(['success' => false, 'message' => 'Xác nhận mật khẩu mới không khớp.'], 422);
        }

        $error = Doimatkhau::validateNewPassword($newPassword);
        if ($error !== null) {
            Response::json(['success' => false, 'message' => $error], 422);
        }

        $db = Database::connect();

        $stmt = $db->prepare('
            SELECT id, email
            FROM users
            WHERE ma_dinh_danh = :ma
            LIMIT 1
        ');
        $stmt->execute([':ma' => $maDinhDanh]);
        $user = $stmt->fetch();

        // Không tiết lộ tài khoản nào tồn tại: cùng một thông báo cho mọi trường hợp sai
        if (
            !$user ||
            empty($user['email']) ||
            mb_strtolower(trim($user['email'])) !== mb_strtolower($email)
        ) {
            Response::json([
                'success' => false,
                'message' => 'Xác minh không thành công: mã định danh hoặc email đăng ký không khớp.'
            ], 400);
        }

        $db->prepare('UPDATE users SET password = :password WHERE id = :id')
            ->execute([':password' => $newPassword, ':id' => $user['id']]);

        Response::json([
            'success' => true,
            'message' => 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.'
        ]);
    }
}
