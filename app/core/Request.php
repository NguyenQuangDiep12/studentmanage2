<?php

require_once __DIR__ . '/Response.php';

class Request
{
    private static ?array $body = null;

    /**
     * Đọc body JSON (jQuery gửi contentType: application/json).
     * Nếu không phải JSON thì dùng $_POST (form-urlencoded).
     */
    public static function body(): array
    {
        if (self::$body !== null) {
            return self::$body;
        }

        $raw = file_get_contents('php://input');

        if ($raw !== false && trim($raw) !== '') {
            $data = json_decode($raw, true);

            if (!is_array($data)) {
                if (!empty($_POST)) {
                    return self::$body = $_POST;
                }

                Response::json([
                    'success' => false,
                    'message' => 'Dữ liệu JSON không hợp lệ.'
                ], 400);
            }

            return self::$body = $data;
        }

        return self::$body = $_POST ?: [];
    }

    public static function input(string $key, $default = null)
    {
        $body = self::body();

        return array_key_exists($key, $body) ? $body[$key] : $default;
    }

    public static function query(string $key, $default = null)
    {
        return array_key_exists($key, $_GET) ? $_GET[$key] : $default;
    }

    public static function str($value): string
    {
        return is_scalar($value) ? trim((string) $value) : '';
    }

    public static function int($value): int
    {
        return is_numeric($value) ? (int) $value : 0;
    }

    /** Trả null nếu rỗng, float nếu là số, false nếu không hợp lệ. */
    public static function score($value)
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (!is_numeric($value)) {
            return false;
        }

        return (float) $value;
    }

    public static function requireMethod(string ...$methods): void
    {
        if (!in_array($_SERVER['REQUEST_METHOD'], $methods, true)) {
            header('Allow: ' . implode(', ', $methods));

            Response::json([
                'success' => false,
                'message' => 'Phương thức không được hỗ trợ.'
            ], 405);
        }
    }
}
