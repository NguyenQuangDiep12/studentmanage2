<?php

// Giờ Việt Nam cho các mốc thời gian đăng ký, điểm danh
date_default_timezone_set('Asia/Ho_Chi_Minh');

// Cảnh báo/lỗi PHP không được in lẫn vào JSON (làm frontend không đọc được message): chỉ ghi log
ini_set('display_errors', '0');
ini_set('log_errors', '1');
// Gom mọi output in dở để Response::json() xóa đi trước khi trả JSON
ob_start();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../app/config/database.php';
require_once __DIR__ . '/../app/core/Response.php';
require_once __DIR__ . '/../app/core/Request.php';
require_once __DIR__ . '/../app/core/AuthService.php';
require_once __DIR__ . '/../app/core/Academic.php';

$routes = require __DIR__ . '/../routes.php';

$method = $_SERVER['REQUEST_METHOD'];
$path = rtrim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');

$routeKey = $method . ' ' . $path;

if (!isset($routes[$routeKey])) {
    Response::json([
        'success' => false,
        'message' => 'Endpoint không tồn tại: ' . $routeKey
    ], 404);
}

$handler = $routes[$routeKey];

if (str_contains($handler, '@')) {
    [$controllerPath, $action] = explode('@', $handler);
} else {
    $controllerPath = $handler;
    $action = 'handle';
}

$controllerFile = __DIR__ . '/../app/module/' . $controllerPath . '.php';

if (!file_exists($controllerFile)) {
    Response::json([
        'success' => false,
        'message' => 'Không tìm thấy bộ điều khiển: ' . $controllerPath
    ], 500);
}

require_once $controllerFile;

$className = basename($controllerPath);

if (!class_exists($className)) {
    Response::json([
        'success' => false,
        'message' => 'Không tìm thấy lớp điều khiển: ' . $className
    ], 500);
}

try {
    $controller = new $className();

    if (!method_exists($controller, $action)) {
        Response::json([
            'success' => false,
            'message' => "Phương thức {$action} không tồn tại trên {$className}"
        ], 500);
    }

    $controller->$action();
} catch (Throwable $e) {
    error_log((string) $e);

    Response::json([
        'success' => false,
        'message' => 'Đã xảy ra lỗi máy chủ.'
    ], 500);
}
