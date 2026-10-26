<?php

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Trang gốc chuyển tới giao diện đăng nhập trong thư mục app
// (dùng redirect để các đường dẫn tương đối css/, js/, dashboard.html hoạt động đúng)
if ($path === '/' || $path === '/index.html') {
    header('Location: /app/index.html');
    return true;
}

// Chuyển các request API đến bộ định tuyến chính
if (str_starts_with($path, '/api/')) {
    require __DIR__ . '/public/index.php';
    return true;
}

// Phục vụ các file frontend tĩnh
$file = __DIR__ . $path;

if (is_file($file)) {
    return false;
}

http_response_code(404);
echo 'Not Found';
return true;
