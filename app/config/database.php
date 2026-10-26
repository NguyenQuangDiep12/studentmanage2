<?php

class Database
{
    private static ?PDO $connection = null;

    public static function connect(): PDO
    {
        if (self::$connection === null) {
            $dbPath = dirname(__DIR__, 2) . '/database/app.db';

            self::$connection = new PDO('sqlite:' . $dbPath);

            self::$connection->setAttribute(
                PDO::ATTR_ERRMODE,
                PDO::ERRMODE_EXCEPTION
            );

            self::$connection->setAttribute(
                PDO::ATTR_DEFAULT_FETCH_MODE,
                PDO::FETCH_ASSOC
            );

            self::$connection->setAttribute(
                PDO::ATTR_EMULATE_PREPARES,
                false
            );

            self::$connection->exec('PRAGMA foreign_keys = ON');

            self::ensureSchema(self::$connection);
        }

        return self::$connection;
    }

    /**
     * Bổ sung các cột còn thiếu so với ERD / nghiệp vụ.
     * Chỉ dùng ALTER TABLE ... ADD COLUMN, không xóa hoặc đổi dữ liệu cũ.
     *  - lop_hoc_phan.thoi_gian_mo/dong_dang_ky (RULE-08: thời gian ĐK do nhà trường quy định)
     *  - diem.diem_chuyen_can/giua_ky/cuoi_ky  (RULE-14: điểm thành phần a, b, c)
     *  - mon_hoc.so_tiet_ly_thuyet/thuc_hanh   (tiết thành phần; NULL = chưa khai báo, không tự chia)
     *  - mon_hoc.so_tin_chi_ly_thuyet/thuc_hanh (RULE-CREDIT-08, RULE-DL-01; NULL = môn cũ chưa phân loại, RULE-CREDIT-11)
     *  - bảng hoc_ky (RULE-HK-01, RULE-DL-02): CREATE TABLE IF NOT EXISTS, không tự sinh dữ liệu
     */
    private static function ensureSchema(PDO $db): void
    {
        $required = [
            'mon_hoc' => [
                'so_tiet_ly_thuyet' => 'INTEGER',
                'so_tiet_thuc_hanh' => 'INTEGER',
                'so_tin_chi_ly_thuyet' => 'INTEGER',
                'so_tin_chi_thuc_hanh' => 'INTEGER',
            ],
            'lop_hoc_phan' => [
                'thoi_gian_mo_dang_ky' => 'TEXT',
                'thoi_gian_dong_dang_ky' => 'TEXT',
            ],
            'diem' => [
                'diem_chuyen_can' => 'REAL',
                'diem_giua_ky' => 'REAL',
                'diem_cuoi_ky' => 'REAL',
            ],
        ];

        // RULE-HK-01, RULE-HK-02: học kỳ có ngày bắt đầu < ngày kết thúc; mỗi (năm học, học kỳ) chỉ một dòng
        $db->exec("
            CREATE TABLE IF NOT EXISTS hoc_ky (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nam_hoc TEXT NOT NULL,
                hoc_ky INTEGER NOT NULL CHECK (hoc_ky IN (1, 2, 3)),
                ngay_bat_dau TEXT NOT NULL,
                ngay_ket_thuc TEXT NOT NULL,
                UNIQUE (nam_hoc, hoc_ky),
                CHECK (ngay_ket_thuc > ngay_bat_dau)
            )
        ");

        foreach ($required as $table => $columns) {
            $existing = array_column(
                $db->query('PRAGMA table_info(' . $table . ')')->fetchAll(),
                'name'
            );

            if (!$existing) {
                continue;
            }

            foreach ($columns as $column => $type) {
                if (!in_array($column, $existing, true)) {
                    $db->exec("ALTER TABLE {$table} ADD COLUMN {$column} {$type}");
                }
            }
        }
    }
}
