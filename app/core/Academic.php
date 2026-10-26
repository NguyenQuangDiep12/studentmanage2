<?php

/**
 * Các phép tính nghiệp vụ học vụ dùng chung giữa các module.
 */
class Academic
{
    public const DK_ACTIVE = ['Đã đăng ký', 'da_dang_ky'];
    public const DD_CO_MAT = 'co_mat';
    public const DD_VANG_MAT = 'vang_mat';

    // RULE-CREDIT-03: quy tắc dữ liệu số tín chỉ của một môn học (cấu hình)
    public const TIN_CHI_MIN = 1;
    public const TIN_CHI_MAX = 10;

    // RULE-CREDIT-08: 1 tiết = 50 phút. LT: 15 giờ/TC -> 15*60/50 = 18 tiết; TH/thảo luận: 30 giờ/TC -> 30*60/50 = 36 tiết.
    // Thời gian tự học không tính. Đổi hằng số nếu quy định chính thức của trường khác.
    public const PHUT_MOI_TIET = 50;
    public const TIET_MOI_TC_LY_THUYET = 18;
    public const TIET_MOI_TC_THUC_HANH = 36;

    // RULE-TKB-01, RULE-TKB-02: 13 tiết/ngày
    public const SO_TIET_NGAY = 13;

    // RULE-XL-09: quy định của trường cho phép rút ngắn buổi cuối còn đúng số tiết còn thiếu
    public const CHO_PHEP_RUT_NGAN_BUOI_CUOI = true;

    // Giới hạn số tín chỉ đăng ký mỗi học kỳ (quy định có sẵn trong hệ thống cũ, đổi tại đây nếu quy chế khác)
    public const MAX_TIN_CHI_HOC_KY = 24;

    /**
     * RULE-18.11: Quy tắc chọn điểm của học phần học lại khi tính GPA.
     *  'cao_nhat'    : lấy lần học có điểm hệ 10 cao nhất (bằng nhau thì lấy lần sau)
     *  'lan_gan_nhat': lấy lần học gần nhất đã có điểm tổng kết
     * Đổi giá trị này nếu quy chế đào tạo của trường quy định khác.
     */
    public const RETAKE_POLICY = 'cao_nhat';

    /**
     * Chọn đúng một lần học đã có điểm cho mỗi học phần (theo mon_hoc_id).
     * $rows phải sắp theo thứ tự thời gian; trả về các khóa (index) được chọn.
     */
    public static function chonLanHoc(array $rows): array
    {
        $pick = [];
        foreach ($rows as $i => $r) {
            if ($r['diem_he_10'] === null) {
                continue;
            }
            $mid = $r['mon_hoc_id'];
            if (!isset($pick[$mid])) {
                $pick[$mid] = $i;
                continue;
            }
            if (self::RETAKE_POLICY === 'lan_gan_nhat'
                || (float) $r['diem_he_10'] >= (float) $rows[$pick[$mid]]['diem_he_10']) {
                $pick[$mid] = $i;
            }
        }

        return array_values($pick);
    }

    /** SQL IN (...) cho trạng thái đăng ký chưa hủy */
    public static function activeDkSql(string $column = 'trang_thai'): string
    {
        return $column . " IN ('Đã đăng ký', 'da_dang_ky')";
    }

    /**
     * RULE-CREDIT-08, RULE-CREDIT-09: công thức duy nhất quy đổi tín chỉ -> số tiết trên lớp,
     * dùng chung cho mọi API (backend luôn tự tính, không nhận số tiết từ frontend).
     */
    public static function tinhSoTiet(int $tcLyThuyet, int $tcThucHanh): array
    {
        $lt = $tcLyThuyet * self::TIET_MOI_TC_LY_THUYET;
        $th = $tcThucHanh * self::TIET_MOI_TC_THUC_HANH;

        return ['so_tiet_ly_thuyet' => $lt, 'so_tiet_thuc_hanh' => $th, 'so_tiet' => $lt + $th];
    }

    /** RULE-TKB-03: Số tiết của một buổi/lịch = tiết kết thúc - tiết bắt đầu + 1 (RULE-11.6) */
    public static function soTiet(array $row): int
    {
        return max(0, (int) $row['tiet_ket_thuc'] - (int) $row['tiet_bat_dau'] + 1);
    }

    /**
     * Sinh các ngày học thực tế từ một lịch học (RULE-11.2, RULE-11.7).
     * thu: 2 = Thứ 2 ... 7 = Thứ 7, 8 = Chủ nhật.
     */
    public static function sessionDates(array $lich, ?string $from = null, ?string $to = null): array
    {
        $start = new DateTime($lich['ngay_bat_dau']);
        $end = new DateTime($lich['ngay_ket_thuc']);

        if ($from !== null && new DateTime($from) > $start) {
            $start = new DateTime($from);
        }
        if ($to !== null && new DateTime($to) < $end) {
            $end = new DateTime($to);
        }

        $targetIsoDay = ((int) $lich['thu'] === 8) ? 7 : ((int) $lich['thu'] - 1); // ISO: 1 = Thứ 2
        $dates = [];

        $cur = clone $start;
        while ((int) $cur->format('N') !== $targetIsoDay && $cur <= $end) {
            $cur->modify('+1 day');
        }

        while ($cur <= $end) {
            $dates[] = $cur->format('Y-m-d');
            $cur->modify('+7 days');
        }

        return $dates;
    }

    /**
     * RULE-XL-01..10: xếp buổi học theo tổng số tiết của môn.
     * $schedules: các lịch trong tuần (thu, tiet_bat_dau, tiet_ket_thuc, ngay_bat_dau, ngay_ket_thuc, key).
     * $fixed:     buổi đã điểm danh "key|ngay" => số tiết, giữ nguyên và tính vào tổng (RULE-XL-11).
     * $busy:      buổi của lớp khác cùng giảng viên/phòng theo ngày: ngay => [[tbd, tkt, mô tả], ...] (RULE-XD-01).
     * Trả về ['buoi', 'bo_qua', 'tong_tiet_mon', 'da_xep', 'con_thieu', 'nguyen_nhan'].
     */
    public static function planBuoiHoc(array $schedules, int $tongTiet, array $fixed = [], array $busy = []): array
    {
        // RULE-XL-02, RULE-XL-03, RULE-XL-08: chỉ các ngày thuộc thứ đã chọn, trong khoảng ngày (học kỳ), theo thời gian
        $slots = [];
        foreach ($schedules as $s) {
            foreach (self::sessionDates($s) as $ngay) {
                $slots[] = ['key' => $s['key'], 'thu' => (int) $s['thu'], 'ngay_hoc' => $ngay,
                            'tiet_bat_dau' => (int) $s['tiet_bat_dau'], 'tiet_ket_thuc' => (int) $s['tiet_ket_thuc']];
            }
        }
        usort($slots, fn($a, $b) => [$a['ngay_hoc'], $a['tiet_bat_dau']] <=> [$b['ngay_hoc'], $b['tiet_bat_dau']]);

        // RULE-XL-01: tổng số tiết cần xếp; buổi đã điểm danh đã tính trước
        $conLai = $tongTiet - array_sum($fixed);
        $buoi = [];
        $boQua = [];
        $dungVi = null;
        foreach ($slots as $sl) {
            $fk = $sl['key'] . '|' . $sl['ngay_hoc'];
            if (isset($fixed[$fk])) {
                $sl['co_dinh'] = true;            // RULE-XL-11: buổi đã điểm danh giữ nguyên
                $buoi[] = $sl;
                continue;
            }
            // RULE-XL-07: dừng khi đủ tổng số tiết
            if ($conLai <= 0 || $dungVi !== null) {
                continue;
            }
            $n = $sl['tiet_ket_thuc'] - $sl['tiet_bat_dau'] + 1;
            if ($n > $conLai) {
                if (!self::CHO_PHEP_RUT_NGAN_BUOI_CUOI) {
                    // RULE-XL-09: không được rút ngắn -> dừng, báo số tiết còn thiếu
                    $dungVi = 'Buổi cuối cần ' . $conLai . ' tiết nhưng quy định không cho rút ngắn buổi học.';
                    continue;
                }
                // RULE-XL-09: buổi cuối chỉ lấy đúng số tiết còn thiếu, không kéo dài
                $sl['tiet_ket_thuc'] = $sl['tiet_bat_dau'] + $conLai - 1;
                $n = $conLai;
            }
            // RULE-XL-04, RULE-XD-02: cùng ngày thực tế và khoảng tiết giao nhau thì xung đột
            $xd = null;
            foreach ($busy[$sl['ngay_hoc']] ?? [] as [$bTbd, $bTkt, $moTa]) {
                if ($sl['tiet_bat_dau'] <= $bTkt && $bTbd <= $sl['tiet_ket_thuc']) {
                    $xd = $moTa;
                    break;
                }
            }
            if ($xd !== null) {
                // RULE-XL-06, RULE-THIEU-01: bỏ qua ngày xung đột, xét ngày tiếp theo
                $boQua[] = ['ngay_hoc' => $sl['ngay_hoc'], 'thu' => $sl['thu'],
                            'tiet_bat_dau' => $sl['tiet_bat_dau'], 'tiet_ket_thuc' => $sl['tiet_ket_thuc'], 'ly_do' => $xd];
                continue;
            }
            // RULE-XL-05: tạo buổi và cộng số tiết đã xếp
            $sl['co_dinh'] = false;
            $buoi[] = $sl;
            $conLai -= $n;
        }
        foreach ($buoi as &$b) {
            $b['so_tiet'] = $b['tiet_ket_thuc'] - $b['tiet_bat_dau'] + 1;   // RULE-TKB-03
        }
        unset($b);

        // RULE-XL-10, RULE-THIEU-04: số tiết đã xếp, còn thiếu và nguyên nhân chính
        $nguyenNhan = [];
        if ($conLai > 0) {
            if ($dungVi !== null) {
                $nguyenNhan[] = $dungVi;
            }
            if ($boQua) {
                $nguyenNhan[] = count($boQua) . ' ngày bị bỏ qua do trùng lịch giảng viên/phòng học';
            }
            if ($dungVi === null) {
                $nguyenNhan[] = 'hết ngày học hợp lệ của các thứ đã chọn trong học kỳ';
            }
        }

        return [
            'buoi' => $buoi,
            'bo_qua' => $boQua,
            'tong_tiet_mon' => $tongTiet,
            'da_xep' => array_sum(array_column($buoi, 'so_tiet')),
            'con_thieu' => max(0, $conLai),
            'nguyen_nhan' => $nguyenNhan,
        ];
    }

    /**
     * RULE-XD-01: buổi học của các lớp học phần đang mở khác có cùng giảng viên hoặc cùng phòng,
     * gom theo ngày: ngay => [[tbd, tkt, mô tả]]. Lớp cũ chưa sinh buổi được bổ sung trước.
     */
    public static function busySlots(PDO $db, ?int $selfId, string $phong, ?int $gvId, string $tu, string $den): array
    {
        $lops = $db->prepare("SELECT id FROM lop_hoc_phan WHERE trang_thai = 'Đang mở' AND id != :self");
        $lops->execute([':self' => $selfId ?? 0]);
        foreach ($lops->fetchAll(PDO::FETCH_COLUMN) as $lopId) {
            self::ensureBuoiHocForLop($db, (int) $lopId);
        }

        $stmt = $db->prepare("
            SELECT b.ngay_hoc, b.tiet_bat_dau, b.tiet_ket_thuc, l.ma_lop_hoc_phan, l.phong_hoc, l.giang_vien_user_id
            FROM buoi_hoc b
            INNER JOIN lich_hoc lh ON lh.id = b.lich_hoc_id
            INNER JOIN lop_hoc_phan l ON l.id = lh.lop_hoc_phan_id
            WHERE l.trang_thai = 'Đang mở' AND l.id != :self
              AND b.ngay_hoc BETWEEN :tu AND :den
              AND (UPPER(l.phong_hoc) = UPPER(:phong) OR l.giang_vien_user_id = :gv)
        ");
        $stmt->execute([':self' => $selfId ?? 0, ':tu' => $tu, ':den' => $den, ':phong' => $phong, ':gv' => $gvId ?? 0]);

        $busy = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $o) {
            $loai = strcasecmp((string) $o['phong_hoc'], $phong) === 0
                ? 'phòng ' . $o['phong_hoc'] . ' đã có lớp ' . $o['ma_lop_hoc_phan']
                : 'giảng viên đã dạy lớp ' . $o['ma_lop_hoc_phan'];
            $busy[$o['ngay_hoc']][] = [(int) $o['tiet_bat_dau'], (int) $o['tiet_ket_thuc'],
                                       $loai . ' (tiết ' . $o['tiet_bat_dau'] . '-' . $o['tiet_ket_thuc'] . ')'];
        }

        return $busy;
    }

    /** Tổng số tiết khai báo của môn học thuộc lớp học phần */
    public static function soTietMonCuaLop(PDO $db, int $lopHocPhanId): int
    {
        $stmt = $db->prepare('SELECT mh.so_tiet FROM lop_hoc_phan l INNER JOIN mon_hoc mh ON mh.id = l.mon_hoc_id WHERE l.id = :id');
        $stmt->execute([':id' => $lopHocPhanId]);

        return (int) $stmt->fetchColumn();
    }

    /**
     * Đồng bộ buoi_hoc của lớp theo lịch trong tuần và tổng số tiết môn (RULE-XL, RULE-DL-04).
     * RULE-XL-11: sinh nhiều lần không tạo bản ghi trùng (so khớp lich|ngày|tiết).
     * - Buổi đã điểm danh luôn được giữ nguyên.
     * - $giuBuoiHienCo = true: giữ mọi buổi đang có, chỉ bổ sung phần còn thiếu (dùng khi đọc dữ liệu cũ).
     * - Buổi trùng khớp kế hoạch giữ nguyên id; buổi thừa (chưa điểm danh) bị xóa; buổi thiếu được thêm.
     * Trả về kết quả planBuoiHoc.
     */
    public static function syncBuoiHocLop(PDO $db, int $lopHocPhanId, bool $giuBuoiHienCo = false): array
    {
        $lichStmt = $db->prepare('SELECT * FROM lich_hoc WHERE lop_hoc_phan_id = :id');
        $lichStmt->execute([':id' => $lopHocPhanId]);
        $schedules = [];
        foreach ($lichStmt->fetchAll(PDO::FETCH_ASSOC) as $lh) {
            $lh['key'] = (int) $lh['id'];
            $schedules[] = $lh;
        }

        $bStmt = $db->prepare('
            SELECT b.*, (SELECT COUNT(*) FROM diem_danh dd WHERE dd.buoi_hoc_id = b.id) AS so_diem_danh
            FROM buoi_hoc b INNER JOIN lich_hoc lh ON lh.id = b.lich_hoc_id
            WHERE lh.lop_hoc_phan_id = :id
        ');
        $bStmt->execute([':id' => $lopHocPhanId]);
        $existing = $bStmt->fetchAll(PDO::FETCH_ASSOC);

        $fixed = [];
        foreach ($existing as $b) {
            if ($giuBuoiHienCo || (int) $b['so_diem_danh'] > 0 || $b['trang_thai'] !== 'Dự kiến') {
                $fixed[$b['lich_hoc_id'] . '|' . $b['ngay_hoc']] = (int) $b['tiet_ket_thuc'] - (int) $b['tiet_bat_dau'] + 1;
            }
        }

        // RULE-XD-01: chỉ lớp đang mở mới giữ phòng/giảng viên và cần tránh trùng
        $busy = [];
        $lop = $db->prepare('SELECT phong_hoc, giang_vien_user_id, trang_thai FROM lop_hoc_phan WHERE id = :id');
        $lop->execute([':id' => $lopHocPhanId]);
        $lopRow = $lop->fetch(PDO::FETCH_ASSOC);
        if ($lopRow && $lopRow['trang_thai'] === 'Đang mở' && $schedules && !$giuBuoiHienCo) {
            $busy = self::busySlots($db, $lopHocPhanId, (string) $lopRow['phong_hoc'],
                $lopRow['giang_vien_user_id'] !== null ? (int) $lopRow['giang_vien_user_id'] : null,
                min(array_column($schedules, 'ngay_bat_dau')), max(array_column($schedules, 'ngay_ket_thuc')));
        }

        $plan = self::planBuoiHoc($schedules, self::soTietMonCuaLop($db, $lopHocPhanId), $fixed, $busy);

        $target = [];
        foreach ($plan['buoi'] as $p) {
            $target[$p['key'] . '|' . $p['ngay_hoc'] . '|' . $p['tiet_bat_dau'] . '|' . $p['tiet_ket_thuc']] = $p;
        }

        $del = $db->prepare('DELETE FROM buoi_hoc WHERE id = :id');
        foreach ($existing as $b) {
            $fk = $b['lich_hoc_id'] . '|' . $b['ngay_hoc'];
            $k = $fk . '|' . $b['tiet_bat_dau'] . '|' . $b['tiet_ket_thuc'];
            if (isset($fixed[$fk])) {
                unset($target[$k]);
                foreach ($target as $tk => $tp) {          // buổi cố định giữ nguyên tiết đã có
                    if (strpos($tk, $fk . '|') === 0) {
                        unset($target[$tk]);
                    }
                }
                continue;
            }
            if (isset($target[$k])) {
                unset($target[$k]);                        // đã có đúng như kế hoạch
            } else {
                $del->execute([':id' => $b['id']]);        // buổi thừa / đổi tiết, chưa điểm danh
            }
        }

        $ins = $db->prepare("
            INSERT INTO buoi_hoc (lich_hoc_id, ngay_hoc, tiet_bat_dau, tiet_ket_thuc, trang_thai)
            VALUES (:lich_hoc_id, :ngay_hoc, :tbd, :tkt, 'Dự kiến')
        ");
        foreach ($target as $p) {
            $ins->execute([':lich_hoc_id' => $p['key'], ':ngay_hoc' => $p['ngay_hoc'],
                           ':tbd' => $p['tiet_bat_dau'], ':tkt' => $p['tiet_ket_thuc']]);
        }

        return $plan;
    }

    /** Lớp có lịch chưa sinh buổi học (dữ liệu cũ): bổ sung buổi, không xóa buổi đang có. */
    public static function ensureBuoiHocForLop(PDO $db, int $lopHocPhanId): void
    {
        $stmt = $db->prepare('
            SELECT COUNT(*)
            FROM lich_hoc lh
            WHERE lh.lop_hoc_phan_id = :id
              AND NOT EXISTS (SELECT 1 FROM buoi_hoc b WHERE b.lich_hoc_id = lh.id)
        ');
        $stmt->execute([':id' => $lopHocPhanId]);

        if ((int) $stmt->fetchColumn() > 0) {
            self::syncBuoiHocLop($db, $lopHocPhanId, true);
        }
    }

    /**
     * RULE-15.5 - 15.9: Điểm chuyên cần.
     * Tỷ lệ nghỉ = tiết nghỉ / tổng tiết môn * 100.
     * Cứ mỗi mức 2% hoàn chỉnh bị trừ 1 điểm (VD 8,33% -> trừ 4 -> 6 điểm),
     * tỷ lệ >= 20% thì bằng 0; kết quả luôn trong khoảng 0..10.
     * Chỉ backend tính, frontend hiển thị kết quả trả về.
     */
    public static function diemChuyenCan(int $tietNghi, int $tongTietMon): float
    {
        if ($tongTietMon <= 0 || $tietNghi <= 0) {
            return 10.0;
        }

        $tyLe = $tietNghi / $tongTietMon * 100;

        if ($tyLe >= 20) {
            return 0.0;
        }

        // Cộng sai số nhỏ để tránh lỗi làm tròn số thực (vd 4% / 2 = 1.9999)
        $soLanTru = (int) floor($tyLe / 2 + 1e-9);

        return (float) max(0, 10 - $soLanTru);
    }

    /** Tổng số tiết nghỉ của một đăng ký (RULE-15.2, RULE-15.6) */
    public static function tietNghi(PDO $db, int $dangKyId): int
    {
        $stmt = $db->prepare("
            SELECT COALESCE(SUM(b.tiet_ket_thuc - b.tiet_bat_dau + 1), 0)
            FROM diem_danh dd
            INNER JOIN buoi_hoc b ON b.id = dd.buoi_hoc_id
            WHERE dd.dang_ky_id = :dk
              AND dd.trang_thai = 'vang_mat'
        ");
        $stmt->execute([':dk' => $dangKyId]);

        return (int) $stmt->fetchColumn();
    }

    /** RULE-14.1: Điểm tổng kết = a*0.6 + b*0.3 + c*0.1 */
    public static function diemTongKet(?float $cuoiKy, ?float $giuaKy, ?float $chuyenCan): ?float
    {
        if ($cuoiKy === null || $giuaKy === null || $chuyenCan === null) {
            return null;
        }

        return round($cuoiKy * 0.6 + $giuaKy * 0.3 + $chuyenCan * 0.1, 2);
    }

    /** RULE-17: Quy đổi hệ 10 sang điểm chữ, hệ 4, xếp loại, kết quả */
    public static function quyDoi(?float $he10): array
    {
        if ($he10 === null) {
            return ['diem_chu' => null, 'diem_he_4' => null, 'xep_loai' => null, 'ket_qua' => null];
        }

        $d = round($he10, 1);

        if ($d >= 8.5) {
            return ['diem_chu' => 'A', 'diem_he_4' => 4.0, 'xep_loai' => 'Xuất sắc / Giỏi', 'ket_qua' => 'Đạt'];
        }
        if ($d >= 7.0) {
            return ['diem_chu' => 'B', 'diem_he_4' => 3.0, 'xep_loai' => 'Khá', 'ket_qua' => 'Đạt'];
        }
        if ($d >= 5.5) {
            return ['diem_chu' => 'C', 'diem_he_4' => 2.0, 'xep_loai' => 'Trung bình', 'ket_qua' => 'Đạt'];
        }
        if ($d >= 4.0) {
            return ['diem_chu' => 'D', 'diem_he_4' => 1.0, 'xep_loai' => 'Trung bình yếu', 'ket_qua' => 'Đạt'];
        }

        return ['diem_chu' => 'F', 'diem_he_4' => 0.0, 'xep_loai' => 'Kém', 'ket_qua' => 'Không đạt'];
    }

    /** Phân loại điểm trung bình học kỳ theo thang RULE-17 (hệ 10) */
    public static function phanLoai(?float $dtbHe10): ?string
    {
        return $dtbHe10 === null ? null : self::quyDoi($dtbHe10)['xep_loai'];
    }

    /**
     * Tính lại chuyên cần + tổng kết cho một đăng ký và lưu vào bảng diem
     * (chỉ khi đã có bản ghi điểm). RULE-14.2.
     */
    public static function recalcDiem(PDO $db, int $dangKyId): void
    {
        $stmt = $db->prepare('SELECT * FROM diem WHERE dang_ky_id = :dk');
        $stmt->execute([':dk' => $dangKyId]);
        $diem = $stmt->fetch();

        if (!$diem) {
            return;
        }

        self::saveDiem($db, $dangKyId, self::nullableFloat($diem['diem_giua_ky']), self::nullableFloat($diem['diem_cuoi_ky']));
    }

    /**
     * RULE-15.4: Tổng số tiết của môn học = tổng số tiết các buổi học
     * thuộc lịch học áp dụng cho lớp học phần.
     */
    public static function tongTietLop(PDO $db, int $lopHocPhanId): int
    {
        self::ensureBuoiHocForLop($db, $lopHocPhanId);

        $stmt = $db->prepare('
            SELECT COALESCE(SUM(b.tiet_ket_thuc - b.tiet_bat_dau + 1), 0)
            FROM buoi_hoc b
            INNER JOIN lich_hoc lh ON lh.id = b.lich_hoc_id
            WHERE lh.lop_hoc_phan_id = :id
        ');
        $stmt->execute([':id' => $lopHocPhanId]);

        return (int) $stmt->fetchColumn();
    }

    /** Tổng số tiết môn học theo lịch của lớp mà sinh viên đăng ký */
    public static function tongTietMon(PDO $db, int $dangKyId): int
    {
        $stmt = $db->prepare('SELECT lop_hoc_phan_id FROM dang_ky_hoc_phan WHERE id = :dk');
        $stmt->execute([':dk' => $dangKyId]);
        $lhpId = $stmt->fetchColumn();

        return $lhpId === false ? 0 : self::tongTietLop($db, (int) $lhpId);
    }

    /** RULE-15.11: tính lại chuyên cần / tổng kết cho toàn bộ sinh viên của lớp */
    public static function recalcLop(PDO $db, int $lopHocPhanId): void
    {
        $stmt = $db->prepare('
            SELECT d.dang_ky_id FROM diem d
            INNER JOIN dang_ky_hoc_phan dk ON dk.id = d.dang_ky_id
            WHERE dk.lop_hoc_phan_id = :id
        ');
        $stmt->execute([':id' => $lopHocPhanId]);

        foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $dkId) {
            self::recalcDiem($db, (int) $dkId);
        }
    }

    /**
     * Ghi điểm thành phần, tự tính chuyên cần từ điểm danh và điểm tổng kết.
     */
    public static function saveDiem(PDO $db, int $dangKyId, ?float $giuaKy, ?float $cuoiKy): array
    {
        $chuyenCan = self::diemChuyenCan(self::tietNghi($db, $dangKyId), self::tongTietMon($db, $dangKyId));
        $tongKet = self::diemTongKet($cuoiKy, $giuaKy, $chuyenCan);
        $he10 = $tongKet === null ? null : round($tongKet, 1);
        $qd = self::quyDoi($tongKet);
        $now = date('Y-m-d H:i:s');

        $params = [
            ':dk' => $dangKyId,
            ':cc' => $chuyenCan,
            ':gk' => $giuaKy,
            ':ck' => $cuoiKy,
            ':tk' => $tongKet,
            ':he10' => $he10,
            ':he4' => $qd['diem_he_4'],
            ':chu' => $qd['diem_chu'],
            ':kq' => $qd['ket_qua'],
            ':now' => $now,
        ];

        $db->prepare('
            INSERT INTO diem (dang_ky_id, diem_chuyen_can, diem_giua_ky, diem_cuoi_ky,
                              diem_tong_ket, diem_he_10, diem_he_4, diem_chu, ket_qua, updated_at)
            VALUES (:dk, :cc, :gk, :ck, :tk, :he10, :he4, :chu, :kq, :now)
            ON CONFLICT(dang_ky_id) DO UPDATE SET
                diem_chuyen_can = excluded.diem_chuyen_can,
                diem_giua_ky = excluded.diem_giua_ky,
                diem_cuoi_ky = excluded.diem_cuoi_ky,
                diem_tong_ket = excluded.diem_tong_ket,
                diem_he_10 = excluded.diem_he_10,
                diem_he_4 = excluded.diem_he_4,
                diem_chu = excluded.diem_chu,
                ket_qua = excluded.ket_qua,
                updated_at = excluded.updated_at
        ')->execute($params);

        return [
            'dang_ky_id' => $dangKyId,
            'diem_chuyen_can' => $chuyenCan,
            'diem_giua_ky' => $giuaKy,
            'diem_cuoi_ky' => $cuoiKy,
            'diem_tong_ket' => $tongKet,
            'diem_he_10' => $he10,
            'diem_he_4' => $qd['diem_he_4'],
            'diem_chu' => $qd['diem_chu'],
            'ket_qua' => $qd['ket_qua'],
            'updated_at' => $now,
        ];
    }

    public static function nullableFloat($v): ?float
    {
        return ($v === null || $v === '') ? null : (float) $v;
    }
}
