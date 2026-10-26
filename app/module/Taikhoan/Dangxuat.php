<?php

require_once dirname(__DIR__, 2) . '/config/database.php';
require_once dirname(__DIR__, 2) . '/core/Response.php';
require_once dirname(__DIR__, 2) . '/core/AuthService.php';

class Dangxuat
{
    /**
     * POST /api/taikhoan/dang-xuat
     * RULE-26: Thu hồi access token hiện tại, token không dùng lại được nữa.
     */
    public function handle(): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            header('Allow: POST');

            Response::json([
                'success' => false,
                'message' => 'Phương thức không được hỗ trợ.'
            ], 405);
        }

        $db = Database::connect();
        $payload = AuthService::tokenPayload($db);

        if ($payload !== null) {
            Jwt::revoke($payload, $db);
        }

        Response::json([
            'success' => true,
            'message' => 'Đăng xuất thành công.'
        ]);
    }
}
