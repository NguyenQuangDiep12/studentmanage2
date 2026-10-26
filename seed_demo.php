<?php

require_once __DIR__ . '/app/config/database.php';

try {
    $db = Database::connect();

    $accounts = [
        [
            'ma_dinh_danh' => 'adminaccount1',
            'email' => 'admin1@sms.edu.vn',
            'password' => 'admin123',
            'ho_ten' => 'Quản trị viên Demo',
            'vai_tro' => 'admin',
            'trang_thai' => 'hoat_dong',
        ],
        [
            'ma_dinh_danh' => 'lectureraccount1',
            'email' => 'lecturer1@sms.edu.vn',
            'password' => 'lecturer123',
            'ho_ten' => 'Giảng viên Demo',
            'vai_tro' => 'lecturer',
            'trang_thai' => 'hoat_dong',
        ],
        [
            'ma_dinh_danh' => 'studentaccount1',
            'email' => 'student1@sms.edu.vn',
            'password' => 'student123',
            'ho_ten' => 'Sinh viên Demo',
            'vai_tro' => 'student',
            'trang_thai' => 'hoat_dong',
        ],
    ];

    $columns = $db->query('PRAGMA table_info(users)')
                  ->fetchAll(PDO::FETCH_ASSOC);

    $available = array_column($columns, 'name');

    foreach (['ma_dinh_danh', 'password', 'ho_ten', 'vai_tro'] as $column) {
        if (!in_array($column, $available, true)) {
            throw new RuntimeException(
                "Bảng users thiếu cột: {$column}"
            );
        }
    }

    $db->beginTransaction();

    foreach ($accounts as $account) {
        $idStmt = $db->prepare(
            'SELECT id FROM users
             WHERE ma_dinh_danh = :ma
             LIMIT 1'
        );
        $idStmt->execute([':ma' => $account['ma_dinh_danh']]);
        $existingId = $idStmt->fetchColumn();

        $data = [
            'ma_dinh_danh' => $account['ma_dinh_danh'],
            // Môi trường demo: lưu mật khẩu dạng văn bản (AGENTS.md mục 4)
            'password' => $account['password'],
            'email' => $account['email'],
            'ho_ten' => $account['ho_ten'],
            'vai_tro' => $account['vai_tro'],
            'trang_thai' => $account['trang_thai'],
        ];

        // Chỉ ghi các cột thực sự tồn tại trong database.
        $data = array_filter(
            $data,
            fn($value, $key) => in_array($key, $available, true),
            ARRAY_FILTER_USE_BOTH
        );

        if ($existingId !== false) {
            $sets = [];
            $params = [];

            foreach ($data as $column => $value) {
                $sets[] = "\"{$column}\" = :{$column}";
                $params[":{$column}"] = $value;
            }

            $params[':id'] = $existingId;

            $sql = 'UPDATE users SET '
                . implode(', ', $sets)
                . ' WHERE id = :id';

            $db->prepare($sql)->execute($params);
        } else {
            $fields = array_keys($data);
            $quotedFields = array_map(
                fn($field) => "\"{$field}\"",
                $fields
            );
            $placeholders = array_map(
                fn($field) => ':' . $field,
                $fields
            );

            $sql = 'INSERT INTO users ('
                . implode(', ', $quotedFields)
                . ') VALUES ('
                . implode(', ', $placeholders)
                . ')';

            $params = [];
            foreach ($data as $column => $value) {
                $params[':' . $column] = $value;
            }

            $db->prepare($sql)->execute($params);
        }

        echo 'Da seed: ' . $account['ma_dinh_danh'] . PHP_EOL;
    }

    $db->commit();
    echo PHP_EOL . 'Seed 3 tai khoan thanh cong.' . PHP_EOL;

} catch (Throwable $e) {
    if (isset($db) && $db instanceof PDO && $db->inTransaction()) {
        $db->rollBack();
    }

    http_response_code(500);
    echo 'Loi seed: ' . $e->getMessage() . PHP_EOL;
}
