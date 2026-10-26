
<?php

require_once __DIR__ . '/../app/config/database.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $db = Database::connect();

    $result = $db->query('SELECT sqlite_version() AS version');
    $row = $result->fetch();

    http_response_code(200);

    echo json_encode([
        'success' => true,
        'message' => 'Ket noi SQLite thanh cong',
        'sqlite_version' => $row['version']
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => 'Khong the ket noi database'
    ], JSON_UNESCAPED_UNICODE);
}
