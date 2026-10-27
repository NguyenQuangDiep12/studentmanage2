<?php

require_once dirname(__DIR__, 2) . '/config/database.php';
require_once dirname(__DIR__, 2) . '/core/Response.php';
require_once dirname(__DIR__, 2) . '/core/Request.php';
require_once dirname(__DIR__, 2) . '/core/AuthService.php';
require_once dirname(__DIR__, 2) . '/core/Academic.php';

/**
 * Quản lý môn học: thêm, sửa, xóa, tìm kiếm
 */
class Quanlymonhoc
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connect();
    }

    /** GET /api/monhoc?search= */
    public function index(): void
    {
        AuthService::requireUser($this->db);

        $sql = '
            SELECT mh.*,
                   (SELECT COUNT(*) FROM lop_hoc_phan l WHERE l.mon_hoc_id = mh.id) AS so_lop_hoc_phan
            FROM mon_hoc mh
            WHERE 1 = 1
        ';
        $params = [];

        $search = Request::str(Request::query('search', ''));
        if ($search !== '') {
            $sql .= ' AND (mh.ma_mon_hoc LIKE :s1 OR mh.ten_mon_hoc LIKE :s2)';
            $params[':s1'] = '%' . $search . '%';
            $params[':s2'] = '%' . $search . '%';
        }

        $sql .= ' ORDER BY mh.ma_mon_hoc';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $list = $stmt->fetchAll();

        Response::json([
            'success' => true,
            'total' => count($list),
            'data' => $list,
            // RULE-CREDIT-09: hệ số quy đổi lấy từ backend để giao diện hiển thị đúng một công thức
            'quy_doi' => [
                'tiet_moi_tc_ly_thuyet' => Academic::TIET_MOI_TC_LY_THUYET,
                'tiet_moi_tc_thuc_hanh' => Academic::TIET_MOI_TC_THUC_HANH,
                'phut_moi_tiet' => Academic::PHUT_MOI_TIET,
                'gio_moi_tc_ly_thuyet' => Academic::GIO_MOI_TC_LY_THUYET,
                'gio_moi_tc_thuc_hanh' => Academic::GIO_MOI_TC_THUC_HANH,
                'phut_moi_gio' => Academic::PHUT_MOI_GIO,
            ],
        ]);
    }

    /** GET /api/monhoc/chi-tiet?id= */
    public function show(): void
    {
        AuthService::requireUser($this->db);

        $mh = $this->find(Request::int(Request::query('id')));
        if (!$mh) {
            Response::json(['success' => false, 'message' => 'Không tìm thấy môn học.'], 404);
        }

        Response::json(['success' => true, 'data' => $mh]);
    }

    /** POST /api/monhoc — RULE-MH-04, RULE-DL-06: quản trị viên và giảng viên được tạo môn học (SV 403, chưa đăng nhập 401) */
    public function store(): void
    {
        Request::requireMethod('POST');
        AuthService::requireUser($this->db, ['admin', 'giang_vien']);

        $data = $this->validate(Request::body(), null);

        $dup = $this->db->prepare('SELECT 1 FROM mon_hoc WHERE UPPER(ma_mon_hoc) = UPPER(:ma)');
        $dup->execute([':ma' => $data['ma_mon_hoc']]);
        if ($dup->fetchColumn()) {
            Response::json([
                'success' => false,
                'message' => 'Mã môn học "' . $data['ma_mon_hoc'] . '" đã tồn tại trong hệ thống!'
            ], 409);
        }

        $this->db->prepare('
            INSERT INTO mon_hoc (ma_mon_hoc, ten_mon_hoc, so_tin_chi, so_tin_chi_ly_thuyet, so_tin_chi_thuc_hanh,
                                 so_tiet, so_tiet_ly_thuyet, so_tiet_thuc_hanh, mo_ta)
            VALUES (:ma_mon_hoc, :ten_mon_hoc, :so_tin_chi, :so_tin_chi_ly_thuyet, :so_tin_chi_thuc_hanh,
                    :so_tiet, :so_tiet_ly_thuyet, :so_tiet_thuc_hanh, :mo_ta)
        ')->execute($this->bind($data));

        Response::json([
            'success' => true,
            'message' => 'Thêm môn học mới thành công!',
            'data' => $this->find((int) $this->db->lastInsertId())
        ], 201);
    }

    /** PUT /api/monhoc — body có id. Mã môn học không đổi. RULE-MH-04: chỉ quản trị viên sửa. */
    public function update(): void
    {
        Request::requireMethod('PUT', 'POST');
        AuthService::requireUser($this->db, ['admin']);

        $id = Request::int(Request::input('id'));
        $existing = $this->find($id);
        if (!$existing) {
            Response::json(['success' => false, 'message' => 'Không tìm thấy môn học.'], 404);
        }

        // Trường không gửi lên thì giữ giá trị hiện có (tránh tự xóa phân loại tín chỉ đã khai báo)
        $in = Request::body();
        foreach (['ten_mon_hoc', 'so_tin_chi_ly_thuyet', 'so_tin_chi_thuc_hanh', 'mo_ta'] as $k) {
            if (!array_key_exists($k, $in)) {
                $in[$k] = $existing[$k];
            }
        }
        $data = $this->validate($in, $existing);
        unset($data['ma_mon_hoc']);

        $params = $this->bind($data);
        $params[':id'] = $id;

        // RULE-HL-05: cập nhật môn và xếp lại lịch các lớp trong cùng giao dịch
        $this->db->beginTransaction();
        try {
            $this->db->prepare('
                UPDATE mon_hoc
                SET ten_mon_hoc = :ten_mon_hoc, so_tin_chi = :so_tin_chi,
                    so_tin_chi_ly_thuyet = :so_tin_chi_ly_thuyet, so_tin_chi_thuc_hanh = :so_tin_chi_thuc_hanh,
                    so_tiet = :so_tiet, so_tiet_ly_thuyet = :so_tiet_ly_thuyet, so_tiet_thuc_hanh = :so_tiet_thuc_hanh,
                    mo_ta = :mo_ta
                WHERE id = :id
            ')->execute($params);

            // RULE-CREDIT-10: tổng số tiết đổi -> xếp lại buổi học các lớp của môn (giữ buổi đã điểm danh, RULE-XL-11)
            $ghiChu = '';
            if ((int) $data['so_tiet'] !== (int) $existing['so_tiet']) {
                $lops = $this->db->prepare("SELECT id, ma_lop_hoc_phan FROM lop_hoc_phan WHERE mon_hoc_id = :id AND trang_thai != 'Đã hủy'");
                $lops->execute([':id' => $id]);
                $thieu = [];
                $soLop = 0;
                foreach ($lops->fetchAll() as $l) {
                    $plan = Academic::syncBuoiHocLop($this->db, (int) $l['id']);
                    Academic::recalcLop($this->db, (int) $l['id']);   // RULE-15.11: tổng tiết đổi -> tính lại chuyên cần
                    $soLop++;
                    if ($plan['con_thieu'] > 0) {
                        $thieu[] = $l['ma_lop_hoc_phan'] . ' (đã xếp ' . $plan['da_xep'] . '/' . $plan['tong_tiet_mon']
                            . ', thiếu ' . $plan['con_thieu'] . ' tiết: ' . implode('; ', $plan['nguyen_nhan']) . ')';
                    }
                }
                // RULE-THIEU-03, RULE-HL-01: lớp nào không xếp đủ tiết thì không lưu thay đổi
                if ($thieu) {
                    throw new DomainException('Không thể đổi số tín chỉ vì lớp học phần không xếp đủ tiết trong học kỳ: '
                        . implode(' | ', $thieu) . '. Hãy bổ sung lịch học của lớp trước.');
                }
                $ghiChu = $soLop ? ' Đã xếp lại lịch ' . $soLop . ' lớp học phần theo ' . $data['so_tiet'] . ' tiết.' : '';
            }
            $this->db->commit();
        } catch (Throwable $e) {
            $this->db->rollBack();
            if ($e instanceof DomainException) {
                Response::json(['success' => false, 'message' => $e->getMessage()], 409);
            }
            throw $e;
        }

        Response::json([
            'success' => true,
            'message' => 'Cập nhật môn học thành công!' . $ghiChu,
            'data' => $this->find($id)
        ]);
    }

    /** DELETE /api/monhoc?id= */
    public function destroy(): void
    {
        Request::requireMethod('DELETE', 'POST');
        AuthService::requireUser($this->db, ['admin']);

        $id = Request::int(Request::query('id', Request::input('id')));
        $mh = $this->find($id);
        if (!$mh) {
            Response::json(['success' => false, 'message' => 'Không tìm thấy môn học.'], 404);
        }

        $checks = [
            ['SELECT COUNT(*) FROM lop_hoc_phan WHERE mon_hoc_id = :id',
                'Không thể xóa! Đang có %d lớp học phần sử dụng môn học này'],
            ['SELECT COUNT(*) FROM chi_tiet_chuong_trinh_dao_tao WHERE mon_hoc_id = :id',
                'Không thể xóa! Môn học đang nằm trong khung chương trình đào tạo (%d mục)'],
            ['SELECT COUNT(*) FROM chi_tiet_nhom_tu_chon WHERE mon_hoc_id = :id',
                'Không thể xóa! Môn học đang nằm trong danh mục nhóm tự chọn (%d mục)'],
        ];

        foreach ($checks as [$sql, $msg]) {
            $stmt = $this->db->prepare($sql);
            $stmt->execute([':id' => $id]);
            $n = (int) $stmt->fetchColumn();
            if ($n > 0) {
                Response::json(['success' => false, 'message' => sprintf($msg, $n)], 409);
            }
        }

        $this->db->prepare('DELETE FROM mon_hoc WHERE id = :id')->execute([':id' => $id]);

        Response::json([
            'success' => true,
            'message' => 'Đã xóa môn học ' . $mh['ma_mon_hoc'] . ' thành công!'
        ]);
    }

    // ------------------------------------------------------------------

    private function find(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }
        $stmt = $this->db->prepare('SELECT * FROM mon_hoc WHERE id = :id');
        $stmt->execute([':id' => $id]);

        return $stmt->fetch() ?: null;
    }

    private function validate(array $in, ?array $existing): array
    {
        $ma = $existing ? $existing['ma_mon_hoc'] : strtoupper(Request::str($in['ma_mon_hoc'] ?? ''));
        $ten = Request::str($in['ten_mon_hoc'] ?? '');
        $moTa = Request::str($in['mo_ta'] ?? '');

        $errors = [];

        if (!$existing && !preg_match('/^[A-Z0-9_-]{2,20}$/', $ma)) {
            $errors[] = 'Mã môn học bắt buộc, 2-20 ký tự gồm chữ, số, dấu _ -';
        }
        if ($ten === '' || mb_strlen($ten) > 150) {
            $errors[] = 'Tên môn học bắt buộc và không quá 150 ký tự.';
        }

        // RULE-MH-01: người dùng nhập số tín chỉ lý thuyết và thực hành (0 nếu không có loại đó)
        $tcLt = $in['so_tin_chi_ly_thuyet'] ?? null;
        $tcTh = $in['so_tin_chi_thuc_hanh'] ?? null;
        $ltEmpty = $tcLt === null || $tcLt === '';
        $thEmpty = $tcTh === null || $tcTh === '';
        $isInt = fn($v) => is_numeric($v) && (int) $v == $v && (int) $v >= 0;

        $soTin = null;
        if ($ltEmpty && $thEmpty) {
            if (!$existing || $existing['so_tin_chi_ly_thuyet'] !== null) {
                $errors[] = 'Vui lòng nhập số tín chỉ lý thuyết và số tín chỉ thực hành (nhập 0 cho loại không có).';
            }
            // RULE-CREDIT-11: môn cũ chưa phân loại -> giữ nguyên số tín chỉ, số tiết hiện có, không suy đoán
        } elseif ($ltEmpty || $thEmpty) {
            $errors[] = 'Vui lòng nhập đủ cả số tín chỉ lý thuyết và số tín chỉ thực hành (nhập 0 cho loại không có).';
        } elseif (!$isInt($tcLt) || !$isInt($tcTh)) {
            // RULE-CREDIT-03: số nguyên không âm
            $errors[] = 'Số tín chỉ lý thuyết và thực hành phải là số nguyên không âm.';
        } else {
            // RULE-CREDIT-02, RULE-CREDIT-03: tổng tín chỉ = LT + TH, trong khoảng cấu hình
            $soTin = (int) $tcLt + (int) $tcTh;
            if ($soTin < Academic::TIN_CHI_MIN || $soTin > Academic::TIN_CHI_MAX) {
                $errors[] = 'Tổng số tín chỉ (' . (int) $tcLt . ' LT + ' . (int) $tcTh . ' TH = ' . $soTin . ') phải từ '
                    . Academic::TIN_CHI_MIN . ' đến ' . Academic::TIN_CHI_MAX . '.';
            }
        }

        if ($errors) {
            Response::json(['success' => false, 'message' => $errors[0], 'errors' => $errors], 422);
        }

        if ($soTin === null) {
            // RULE-CREDIT-11: môn cũ giữ nguyên dữ liệu
            $tin = ['so_tin_chi' => (int) $existing['so_tin_chi'], 'so_tin_chi_ly_thuyet' => null, 'so_tin_chi_thuc_hanh' => null,
                    'so_tiet' => (int) $existing['so_tiet'], 'so_tiet_ly_thuyet' => $existing['so_tiet_ly_thuyet'],
                    'so_tiet_thuc_hanh' => $existing['so_tiet_thuc_hanh']];
        } else {
            // RULE-CREDIT-08, RULE-CREDIT-09, RULE-MH-02: backend tự tính số tiết, bỏ qua số tiết frontend gửi lên
            $tin = ['so_tin_chi' => $soTin, 'so_tin_chi_ly_thuyet' => (int) $tcLt, 'so_tin_chi_thuc_hanh' => (int) $tcTh]
                + Academic::tinhSoTiet((int) $tcLt, (int) $tcTh);
        }

        return [
            'ma_mon_hoc' => $ma,
            'ten_mon_hoc' => $ten,
            'so_tin_chi' => $tin['so_tin_chi'],
            'so_tin_chi_ly_thuyet' => $tin['so_tin_chi_ly_thuyet'],
            'so_tin_chi_thuc_hanh' => $tin['so_tin_chi_thuc_hanh'],
            'so_tiet' => $tin['so_tiet'],
            'so_tiet_ly_thuyet' => $tin['so_tiet_ly_thuyet'],
            'so_tiet_thuc_hanh' => $tin['so_tiet_thuc_hanh'],
            'mo_ta' => $moTa !== '' ? $moTa : null,
        ];
    }

    private function bind(array $data): array
    {
        $p = [];
        foreach ($data as $k => $v) {
            $p[':' . $k] = $v;
        }

        return $p;
    }
}
