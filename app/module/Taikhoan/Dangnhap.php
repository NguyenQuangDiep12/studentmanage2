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
        $password = $input['password'] ?? '';

        if ($maDinhDanh === '' || !is_string($password) || $password === '') {
            Response::json([
                'message' => 'Vui lòng nhập mã định danh và mật khẩu.'
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
                    'message' => 'Mã định danh hoặc mật khẩu không đúng.'
                ], 401);
            }

            Response::json([
                'message' => 'Đăng nhập thành công.',
                'data' => $result
            ]);
        } catch (DomainException $e) {
            Response::json([
                'message' => $e->getMessage()
            ], 403);
        } catch (Throwable $e) {
            error_log((string) $e);

            Response::json([
                'message' => 'Đã xảy ra lỗi máy chủ.'
            ], 500);
        }
    }
}