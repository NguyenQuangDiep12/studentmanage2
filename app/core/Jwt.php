<?php
class Jwt
{
    private static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    public static function create(array $payload, int $ttl = 3600): string
    {
        $secret = getenv('JWT_SECRET');

        if (!$secret) {
            throw new RuntimeException('Chưa cấu hình JWT_SECRET.');
        }

        $now = time();

        $payload['iat'] = $now;
        $payload['exp'] = $now + $ttl;

        $header = [
            'typ' => 'JWT',
            'alg' => 'HS256'
        ];

        $headerEncoded = self::base64UrlEncode(
            json_encode($header)
        );

        $payloadEncoded = self::base64UrlEncode(
            json_encode($payload, JSON_UNESCAPED_UNICODE)
        );

        $data = $headerEncoded . '.' . $payloadEncoded;

        $signature = hash_hmac(
            'sha256',
            $data,
            $secret,
            true
        );

        return $data . '.' . self::base64UrlEncode($signature);
    }
}