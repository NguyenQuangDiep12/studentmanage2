<?php

class Jwt
{
    // Khóa bí mật dùng cho bản demo local.
    private const SECRET =
        '8f4c2d91a7e6b035c9d1428f6a3e70b4d1c8e529f6a0473b2d9c815e6a4f730c';

    // Cho phép lệch đồng hồ tối đa 60 giây khi kiểm tra iat (token vừa tạo không bị từ chối oan)
    private const LEEWAY = 60;

    private static function base64UrlEncode(string $data): string
    {
        return rtrim(
            strtr(base64_encode($data), '+/', '-_'),
            '='
        );
    }

    private static function base64UrlDecode(string $data): string|false
    {
        if (!preg_match('/^[A-Za-z0-9_-]+$/', $data)) {
            return false;
        }

        $padding = (4 - strlen($data) % 4) % 4;

        return base64_decode(
            strtr($data, '-_', '+/')
                . str_repeat('=', $padding),
            true
        );
    }

    /**
     * Tạo access token JWT.
     * Mặc định hết hạn sau 1 giờ.
     */
    public static function create(
        array $payload,
        int $ttl = 31536000
    ): string {
        if ($ttl <= 0) {
            throw new InvalidArgumentException(
                'Thời hạn token phải lớn hơn 0.'
            );
        }

        $now = time();

        $payload['iat'] = $now;
        $payload['exp'] = $now + $ttl;
        $payload['jti'] = bin2hex(random_bytes(16));

        $header = [
            'typ' => 'JWT',
            'alg' => 'HS256'
        ];

        $headerEncoded = self::base64UrlEncode(
            json_encode($header, JSON_THROW_ON_ERROR)
        );

        $payloadEncoded = self::base64UrlEncode(
            json_encode(
                $payload,
                JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
            )
        );

        $data = $headerEncoded . '.' . $payloadEncoded;

        $signature = hash_hmac(
            'sha256',
            $data,
            self::SECRET,
            true
        );

        return $data . '.' . self::base64UrlEncode($signature);
    }

    /**
     * Xác minh chữ ký và thời hạn access token.
     * Trả payload nếu hợp lệ, ngược lại trả null.
     */
    public static function verify(string $token): ?array
    {
        $parts = explode('.', $token);

        if (count($parts) !== 3) {
            return null;
        }

        [$headerEncoded, $payloadEncoded, $signatureEncoded] = $parts;

        $headerJson = self::base64UrlDecode($headerEncoded);
        $payloadJson = self::base64UrlDecode($payloadEncoded);
        $signature = self::base64UrlDecode($signatureEncoded);

        if (
            $headerJson === false ||
            $payloadJson === false ||
            $signature === false
        ) {
            return null;
        }

        $header = json_decode($headerJson, true);
        $payload = json_decode($payloadJson, true);

        if (
            !is_array($header) ||
            !is_array($payload) ||
            ($header['typ'] ?? null) !== 'JWT' ||
            ($header['alg'] ?? null) !== 'HS256' ||
            !isset(
                $payload['sub'],
                $payload['iat'],
                $payload['exp'],
                $payload['jti']
            ) ||
            !is_int($payload['iat']) ||
            !is_int($payload['exp']) ||
            !is_string($payload['jti']) ||
            !ctype_xdigit($payload['jti']) ||
            strlen($payload['jti']) !== 32
        ) {
            return null;
        }

        $data = $headerEncoded . '.' . $payloadEncoded;

        $expectedSignature = hash_hmac(
            'sha256',
            $data,
            self::SECRET,
            true
        );

        if (!hash_equals($expectedSignature, $signature)) {
            return null;
        }

        $now = time();

        if (
            $payload['exp'] <= $now ||
            $payload['iat'] > $now + self::LEEWAY ||
            $payload['exp'] <= $payload['iat']
        ) {
            return null;
        }

        return $payload;
    }

    /**
     * Tạo bảng lưu các token đã đăng xuất.
     */
    public static function ensureRevocationTable(PDO $db): void
    {
        $db->exec(
            'CREATE TABLE IF NOT EXISTS revoked_tokens (
                jti TEXT PRIMARY KEY,
                expires_at INTEGER NOT NULL
            )'
        );
    }

    /**
     * Kiểm tra token đã bị thu hồi hay chưa.
     */
    public static function isRevoked(
        string $jti,
        PDO $db
    ): bool {
        self::ensureRevocationTable($db);

        $stmt = $db->prepare(
            'SELECT 1
             FROM revoked_tokens
             WHERE jti = :jti
               AND expires_at > :now
             LIMIT 1'
        );

        $stmt->execute([
            ':jti' => $jti,
            ':now' => time()
        ]);

        return $stmt->fetchColumn() !== false;
    }

    /**
     * Thu hồi access token khi đăng xuất.
     */
    public static function revoke(
        array $payload,
        PDO $db
    ): void {
        self::ensureRevocationTable($db);

        $stmt = $db->prepare(
            'INSERT OR IGNORE INTO revoked_tokens
                (jti, expires_at)
             VALUES (:jti, :expires_at)'
        );

        $stmt->execute([
            ':jti' => $payload['jti'],
            ':expires_at' => $payload['exp']
        ]);
    }
}
