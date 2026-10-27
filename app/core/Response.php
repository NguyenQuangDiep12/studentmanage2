<?php

class Response
{
    public static function json(array $data, int $status = 200): void
    {
        // Bỏ mọi nội dung đã in trước đó (cảnh báo PHP, echo thừa) để phản hồi luôn là JSON hợp lệ
        while (ob_get_level() > 0) {
            ob_end_clean();
        }

        http_response_code($status);

        header('Content-Type: application/json; charset=utf-8');

        echo json_encode(
            $data,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        );

        exit;
    }
}