<?php
require_once dirname(__DIR__, 2) . '/config/database.php';
require_once dirname(__DIR__, 2) . '/core/Response.php';
require_once dirname(__DIR__, 2) . '/core/AuthService.php';

class Dangnhap
{
    public function handle(): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            header('Allow: POST');

            Response::json([
                'success' => false,
                'message' => 'Phương thức không được hỗ trợ.'
            ], 405);
        }

        $input = json_decode(
            file_get_contents('php://input'),
            true
        );

        if (!is_array($input)) {
            Response::json([
                'success' => false,
                'message' => 'Dữ liệu JSON không hợp lệ.'
            ], 400);
        }

        $maDinhDanh = trim($input['ma_dinh_danh'] ?? '');
        $password = $input['password'] ?? '';

        if ($maDinhDanh === '' || !is_string($password) || $password === '') {
            Response::json([
                'success' => false,
                'message' => 'Vui lòng nhập mã sinh viên / mã giảng viên và mật khẩu.'
            ], 422);
        }

        try {
            $db = Database::connect();
            $authService = new AuthService($db);

            $result = $authService->login(
                $maDinhDanh,
                $password
            );

            if ($result === null) {
                Response::json([
                    'success' => false,
                    'message' => 'Mã sinh viên / mã giảng viên hoặc mật khẩu không đúng.'
                ], 401);
            }

            Response::json([
                'success' => true,
                'message' => 'Đăng nhập thành công.',
                'data' => $result
            ]);
        } catch (DomainException $e) {
            Response::json([
                'success' => false,
                'message' => $e->getMessage()
            ], 403);
        } catch (Throwable $e) {
            error_log((string) $e);

            Response::json([
                'success' => false,
                'message' => 'Đã xảy ra lỗi máy chủ.'
            ], 500);
        }
    }
}
