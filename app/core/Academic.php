<?php

/**
 * Các phép tính nghiệp vụ học vụ dùng chung giữa các module.
 */
class Academic
{
    public const DK_ACTIVE = ['Đã đăng ký', 'da_dang_ky'];

    /**
     * RULE-08 (RULE-DK-TT): lớp học phần chỉ có 2 trạng thái đăng ký.
     *  - Đang mở đăng ký: đã nhập thời gian mở + đóng và thời điểm hiện tại nằm trong khoảng đó.
     *  - Đóng đăng ký: mọi trường hợp còn lại (chưa nhập thời gian, chưa tới ngày mở, đã qua ngày đóng).
     * Hết hạn thì tự động đóng; không còn trạng thái "Đã đóng/Đã hủy/Hết hạn" nhập tay.
     */
    public const TT_DK_MO = 'Đang mở đăng ký';
    public const TT_DK_DONG = 'Đóng đăng ký';

    public static function dangMoDangKy(?string $mo, ?string $dong, ?string $now = null): bool
    {
        if (empty($mo) || empty($dong)) {
            return false;
        }
        $now = $now ?? date('Y-m-d H:i:s');
        return $now >= $mo && $now <= $dong;
    }

    /** Gắn trạng thái đăng ký tính sẵn vào một dòng lớp học phần (dùng chung cho mọi API). */
    public static function ganTrangThaiDangKy(array $l): array
    {
        $mo = self::dangMoDangKy($l['thoi_gian_mo_dang_ky'] ?? null, $l['thoi_gian_dong_dang_ky'] ?? null);
        $l['dang_mo_dang_ky'] = $mo;
        $l['trang_thai_dang_ky'] = $mo ? self::TT_DK_MO : self::TT_DK_DONG;
        return $l;
    }

    /** Điều kiện SQL "đang mở đăng ký" theo tham số :now_dk */
    public static function dangMoDkSql(string $a = 'lhp'): string
    {
        return "($a.thoi_gian_mo_dang_ky IS NOT NULL AND $a.thoi_gian_mo_dang_ky != '' AND $a.thoi_gian_dong_dang_ky IS NOT NULL AND $a.thoi_gian_dong_dang_ky != ''"
            . " AND :now_dk >= $a.thoi_gian_mo_dang_ky AND :now_dk2 <= $a.thoi_gian_dong_dang_ky)";
    }
    public const DD_CO_MAT = 'co_mat';
    public const DD_VANG_MAT = 'vang_mat';

    // RULE-CREDIT-03: quy tắc dữ liệu số tín chỉ của một môn học (cấu hình)
    public const TIN_CHI_MIN = 1;
    public const TIN_CHI_MAX = 10;

    // RULE-CREDIT-08: căn cứ quy đổi của trường (không tự đổi hệ số):
    //  1 TC lý thuyết = 15 giờ học trên lớp; 1 TC thực hành = 30 giờ học trên lớp; 1 giờ = 60 phút; 1 tiết = 50 phút.
    //  Số tiết / TC = số giờ × 60 ÷ 50  ->  LT: 15 × 60 ÷ 50 = 18 tiết;  TH: 30 × 60 ÷ 50 = 36 tiết.
    //  Thời gian tự học không tính vào số tiết xếp thời khóa biểu.
    public const GIO_MOI_TC_LY_THUYET = 15;
    public const GIO_MOI_TC_THUC_HANH = 30;
    public const PHUT_MOI_GIO = 60;
    public const PHUT_MOI_TIET = 50;
    public const TIET_MOI_TC_LY_THUYET = self::GIO_MOI_TC_LY_THUYET * self::PHUT_MOI_GIO / self::PHUT_MOI_TIET;   // 18
    public const TIET_MOI_TC_THUC_HANH = self::GIO_MOI_TC_THUC_HANH * self::PHUT_MOI_GIO / self::PHUT_MOI_TIET;   // 36

    // RULE-15: điểm chuyên cần C. Tối đa 10; mỗi 2% tỷ lệ nghỉ trừ 1 điểm; R >= 20% thì C = 0.
    public const CC_DIEM_TOI_DA = 10;
    public const CC_PHAN_TRAM_MOI_DIEM = 2;
    public const CC_NGUONG_BANG_0 = 20;
    // RULE-15.13: cấm thi khi tỷ lệ nghỉ từ 20% trở lên (R >= 20%); bị cấm thi thì điểm tổng kết D = 0.
    public const NGUONG_CAM_THI = 20;

    /**
     * RULE-17: thang điểm theo quy chế (8 mức). Điểm D làm tròn 1 chữ số rồi so với "tu" (cận dưới, tính cả).
     * Một nguồn duy nhất cho quy đổi và phần giải thích trên giao diện.
     */
    public const THANG_DIEM = [
        ['tu' => 8.5, 'den' => 10.0, 'chu' => 'A',  'he_4' => 4.0, 'xep_loai' => 'Giỏi',           'ket_qua' => 'Đạt'],
        ['tu' => 8.0, 'den' => 8.4,  'chu' => 'B+', 'he_4' => 3.5, 'xep_loai' => 'Khá',            'ket_qua' => 'Đạt'],
        ['tu' => 7.0, 'den' => 7.9,  'chu' => 'B',  'he_4' => 3.0, 'xep_loai' => 'Khá',            'ket_qua' => 'Đạt'],
        ['tu' => 6.5, 'den' => 6.9,  'chu' => 'C+', 'he_4' => 2.5, 'xep_loai' => 'Trung bình',     'ket_qua' => 'Đạt'],
        ['tu' => 5.5, 'den' => 6.4,  'chu' => 'C',  'he_4' => 2.0, 'xep_loai' => 'Trung bình',     'ket_qua' => 'Đạt'],
        ['tu' => 5.0, 'den' => 5.4,  'chu' => 'D+', 'he_4' => 1.5, 'xep_loai' => 'Trung bình yếu', 'ket_qua' => 'Đạt'],
        ['tu' => 4.0, 'den' => 4.9,  'chu' => 'D',  'he_4' => 1.0, 'xep_loai' => 'Trung bình yếu', 'ket_qua' => 'Đạt'],
        ['tu' => 0.0, 'den' => 3.9,  'chu' => 'F',  'he_4' => 0.0, 'xep_loai' => 'Kém',            'ket_qua' => 'Không đạt'],
    ];
    // RULE-14.1: D = 0.6A + 0.3B + 0.1C (A cuối kỳ, B giữa kỳ, C chuyên cần)
    public const HE_SO_CUOI_KY = 0.6;
    public const HE_SO_GIUA_KY = 0.3;
    public const HE_SO_CHUYEN_CAN = 0.1;

    // RULE-TKB-01, RULE-TKB-02: 13 tiết/ngày
    public const SO_TIET_NGAY = 13;

    // RULE-XL-09: quy định của trường cho phép rút ngắn buổi cuối còn đúng số tiết còn thiếu
    public const CHO_PHEP_RUT_NGAN_BUOI_CUOI = true;

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

    /**
     * RULE-HK-07: Số tuần của một khoảng ngày = số tuần lịch (Thứ 2 → Chủ nhật) mà khoảng ngày đi qua.
     * Một công thức duy nhất cho danh sách học kỳ và thời khóa biểu:
     *   so_tuan = (Thứ 2 của tuần chứa ngày kết thúc − Thứ 2 của tuần chứa ngày bắt đầu) ÷ 7 + 1
     */
    public static function soTuan(string $tu, string $den): int
    {
        $a = new DateTime($tu);
        $b = new DateTime($den);
        $a->modify('-' . ((int) $a->format('N') - 1) . ' days');
        $b->modify('-' . ((int) $b->format('N') - 1) . ' days');

        return max(1, intdiv((int) $a->diff($b)->format('%r%a'), 7) + 1);
    }

    /**
     * RULE-DL-07: số thứ tự buổi học của một lớp - một nguồn duy nhất (buoi_hoc) cho TKB và điểm danh.
     * Đánh số theo ngày học, tiết bắt đầu, id. Trả về [buoi_id => số thứ tự].
     */
    public static function soThuTuBuoi(PDO $db, int $lopHocPhanId): array
    {
        $stmt = $db->prepare('
            SELECT b.id FROM buoi_hoc b INNER JOIN lich_hoc lh ON lh.id = b.lich_hoc_id
            WHERE lh.lop_hoc_phan_id = :id
            ORDER BY b.ngay_hoc, b.tiet_bat_dau, b.id
        ');
        $stmt->execute([':id' => $lopHocPhanId]);
        $map = [];
        foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $i => $id) {
            $map[(int) $id] = $i + 1;
        }

        return $map;
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
    public static function planBuoiHoc(array $schedules, int $tongTiet, array $fixed = [], array $busy = [], ?string $tuNgay = null): array
    {
        // RULE-XL-12: chỉ xếp buổi mới từ hôm nay trở đi; ngày đã qua chỉ giữ buổi đang có (không tạo lịch sử mới)
        $tuNgay = $tuNgay ?? date('Y-m-d');
        $boQuaQuaKhu = 0;
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
            if ($sl['ngay_hoc'] < $tuNgay) {
                $boQuaQuaKhu++;
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
            if ($boQuaQuaKhu) {
                $nguyenNhan[] = $boQuaQuaKhu . ' ngày đã qua (trước ' . date('d/m/Y', strtotime($tuNgay)) . ') không được xếp buổi mới';
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
            // RULE-XL-11: giữ nguyên buổi đã điểm danh và buổi đã diễn ra (ngày học trước hôm nay) - không đổi lịch sử
            if ($giuBuoiHienCo || (int) $b['so_diem_danh'] > 0 || $b['trang_thai'] !== 'Dự kiến' || $b['ngay_hoc'] < date('Y-m-d')) {
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
        // RULE-15.5: R = tiết nghỉ ÷ tổng tiết môn × 100%
        $tyLe = self::tyLeNghi($tietNghi, $tongTietMon);
        if ($tyLe <= 0) {
            return (float) self::CC_DIEM_TOI_DA;
        }

        // RULE-15.8: R >= 20% thì C = 0
        if ($tyLe >= self::CC_NGUONG_BANG_0 - 1e-9) {
            return 0.0;
        }

        // RULE-15.6, 15.7: mỗi mức 2% hoàn chỉnh trừ 1 điểm: C = 10 − ⌊R ÷ 2⌋
        // (cộng sai số nhỏ để tránh lỗi số thực, vd 4% / 2 = 1.9999)
        $soLanTru = (int) floor($tyLe / self::CC_PHAN_TRAM_MOI_DIEM + 1e-9);

        return (float) max(0, self::CC_DIEM_TOI_DA - $soLanTru);
    }

    /** RULE-15.5: tỷ lệ nghỉ R (%) = tiết nghỉ ÷ tổng tiết môn × 100 */
    public static function tyLeNghi(int $tietNghi, int $tongTietMon): float
    {
        return $tongTietMon > 0 ? $tietNghi / $tongTietMon * 100 : 0.0;
    }

    /** RULE-15.13: cấm thi khi R >= 20% (cùng ngưỡng với C = 0) */
    public static function camThi(int $tietNghi, int $tongTietMon): bool
    {
        return self::tyLeNghi($tietNghi, $tongTietMon) >= self::NGUONG_CAM_THI - 1e-9;
    }

    /** Trạng thái chuyên cần đầy đủ của một đăng ký (dùng cho bảng điểm và tra cứu) */
    public static function chuyenCan(PDO $db, int $dangKyId): array
    {
        $nghi = self::tietNghi($db, $dangKyId);
        $tong = self::tongTietMon($db, $dangKyId);

        return [
            'tiet_nghi' => $nghi,
            'tong_tiet_mon' => $tong,
            'ty_le_nghi' => round(self::tyLeNghi($nghi, $tong), 2),
            'diem_chuyen_can' => self::diemChuyenCan($nghi, $tong),
            'cam_thi' => self::camThi($nghi, $tong),
        ];
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

    /**
     * RULE-14.1: D = 0.6A + 0.3B + 0.1C, làm tròn 2 chữ số thập phân.
     * RULE-14.2: chưa đủ A, B (C luôn tính từ điểm danh) thì chưa tính D.
     */
    public static function diemTongKet(?float $cuoiKy, ?float $giuaKy, ?float $chuyenCan): ?float
    {
        if ($cuoiKy === null || $giuaKy === null || $chuyenCan === null) {
            return null;
        }

        return round($cuoiKy * self::HE_SO_CUOI_KY + $giuaKy * self::HE_SO_GIUA_KY + $chuyenCan * self::HE_SO_CHUYEN_CAN, 2);
    }

    /**
     * RULE-17: quy đổi điểm tổng kết D (hệ 10) sang điểm chữ, hệ 4, xếp loại, kết quả theo THANG_DIEM.
     * Theo quy chế: điểm học phần làm tròn đến MỘT chữ số thập phân rồi mới chuyển sang điểm chữ
     * (VD D = 7.95 → 8.0 → B+; D = 8.45 → 8.5 → A).
     */
    public static function quyDoi(?float $he10): array
    {
        if ($he10 === null) {
            return ['diem_chu' => null, 'diem_he_4' => null, 'xep_loai' => null, 'ket_qua' => null];
        }

        $d = round($he10, 1);
        foreach (self::THANG_DIEM as $muc) {
            if ($d >= $muc['tu'] - 1e-9) {
                return ['diem_chu' => $muc['chu'], 'diem_he_4' => $muc['he_4'], 'xep_loai' => $muc['xep_loai'], 'ket_qua' => $muc['ket_qua']];
            }
        }
        $f = self::THANG_DIEM[count(self::THANG_DIEM) - 1];

        return ['diem_chu' => $f['chu'], 'diem_he_4' => $f['he_4'], 'xep_loai' => $f['xep_loai'], 'ket_qua' => $f['ket_qua']];
    }

    /** Phân loại điểm trung bình học kỳ theo thang RULE-17 (hệ 10) */
    public static function phanLoai(?float $dtbHe10): ?string
    {
        return $dtbHe10 === null ? null : self::quyDoi($dtbHe10)['xep_loai'];
    }

    /**
     * RULE-14.2, RULE-15.12, RULE-15.13: tính lại chuyên cần, cấm thi và điểm tổng kết của một đăng ký.
     *  - Đã có điểm: tính lại theo điểm danh hiện tại.
     *  - Chưa có điểm nhưng bị cấm thi: tạo kết quả D = 0 (F, Không đạt).
     *  - Không còn cấm thi và chưa có điểm A, B nào: bỏ bản ghi kết quả tạm.
     */
    public static function recalcDiem(PDO $db, int $dangKyId): void
    {
        $stmt = $db->prepare('SELECT * FROM diem WHERE dang_ky_id = :dk');
        $stmt->execute([':dk' => $dangKyId]);
        $diem = $stmt->fetch();

        $gk = $diem ? self::nullableFloat($diem['diem_giua_ky']) : null;
        $ck = $diem ? self::nullableFloat($diem['diem_cuoi_ky']) : null;
        $camThi = self::chuyenCan($db, $dangKyId)['cam_thi'];

        if (!$diem && !$camThi) {
            return;
        }
        if ($diem && !$camThi && $gk === null && $ck === null) {
            $db->prepare('DELETE FROM diem WHERE dang_ky_id = :dk')->execute([':dk' => $dangKyId]);
            return;
        }

        self::saveDiem($db, $dangKyId, $gk, $ck);
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

    /** RULE-15.11: tính lại chuyên cần / cấm thi / tổng kết cho toàn bộ sinh viên đang học của lớp */
    public static function recalcLop(PDO $db, int $lopHocPhanId): void
    {
        $stmt = $db->prepare('
            SELECT dk.id FROM dang_ky_hoc_phan dk
            WHERE dk.lop_hoc_phan_id = :id AND (' . self::activeDkSql('dk.trang_thai') . '
                  OR EXISTS (SELECT 1 FROM diem d WHERE d.dang_ky_id = dk.id))
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
        $cc = self::chuyenCan($db, $dangKyId);
        $chuyenCan = $cc['diem_chuyen_can'];
        // RULE-15.13: bị cấm thi -> D = 0 (F, Không đạt); ngược lại D = 0.6A + 0.3B + 0.1C (RULE-14.1)
        $tongKet = $cc['cam_thi'] ? 0.0 : self::diemTongKet($cuoiKy, $giuaKy, $chuyenCan);
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
            'cam_thi' => $cc['cam_thi'],
            'updated_at' => $now,
        ];
    }

    public static function nullableFloat($v): ?float
    {
        return ($v === null || $v === '') ? null : (float) $v;
    }
}
