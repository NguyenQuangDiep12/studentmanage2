<?php

require_once dirname(__DIR__, 2) . '/core/Response.php';

class Dangxuat
{
    public function handle(): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            header('Allow: POST');

            Response::json([
                'message' => 'Phương thức không được hỗ trợ.'
            ], 405);
        }

        Response::json([
            'message' => 'Đăng xuất thành công.'
        ]);
    }
}