<?php

require_once dirname(__DIR__, 2) . '/config/database.php';
require_once dirname(__DIR__, 2) . '/core/Response.php';
require_once dirname(__DIR__, 2) . '/core/Request.php';
require_once dirname(__DIR__, 2) . '/core/AuthService.php';
require_once dirname(__DIR__, 2) . '/core/Academic.php';

/**
 * Quản lý kết quả học tập:
 *  - Điểm danh (RULE-12, RULE-15)
 *  - Thêm / sửa / xóa điểm thành phần (RULE-14)
 *  - Tra cứu kết quả học tập của sinh viên (RULE-16, 17, 18)
 */
class Quanlyketqua
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connect();
    }

    // ==================================================================
    // LỚP GIẢNG DẠY
    // ==================================================================

    /** GET /api/ketquahoctap/lop-giang-day — lớp do giảng viên phụ trách (admin: tất cả) */
    public function lopGiangDay(): void
    {
        $user = AuthService::requireUser($this->db, ['giang_vien', 'admin']);

        $sql = "
            SELECT lhp.id, lhp.ma_lop_hoc_phan, lhp.hoc_ky, lhp.nam_hoc, lhp.phong_hoc, lhp.si_so_toi_da, lhp.trang_thai,
                   mh.ma_mon_hoc, mh.ten_mon_hoc, mh.so_tin_chi, mh.so_tiet, gv.ho_ten AS ten_giang_vien
            FROM lop_hoc_phan lhp
            INNER JOIN mon_hoc mh ON mh.id = lhp.mon_hoc_id
            LEFT JOIN users gv ON gv.id = lhp.giang_vien_user_id
        ";
        $params = [];
        if ($user['vai_tro'] === 'giang_vien') {
            $sql .= ' WHERE lhp.giang_vien_user_id = :gv';
            $params[':gv'] = $user['id'];
        }
        $sql .= ' ORDER BY lhp.nam_hoc DESC, lhp.hoc_ky DESC, lhp.ma_lop_hoc_phan';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        Response::json(['success' => true, 'data' => $stmt->fetchAll()]);
    }

    // ==================================================================
    // ĐIỂM DANH
    // ==================================================================

    /** GET /api/ketquahoctap/buoi-hoc?lop_hoc_phan_id= */
    public function buoiHoc(): void
    {
        $user = AuthService::requireUser($this->db, ['giang_vien', 'admin']);
        $lhp = $this->lopHocPhan(Request::int(Request::query('lop_hoc_phan_id')), $user);

        Academic::ensureBuoiHocForLop($this->db, (int) $lhp['id']);

        $stmt = $this->db->prepare('
            SELECT b.*, lh.thu,
                   (SELECT COUNT(*) FROM diem_danh dd WHERE dd.buoi_hoc_id = b.id) AS so_ban_ghi_diem_danh
            FROM buoi_hoc b
            INNER JOIN lich_hoc lh ON lh.id = b.lich_hoc_id
            WHERE lh.lop_hoc_phan_id = :id
            ORDER BY b.ngay_hoc, b.tiet_bat_dau
        ');
        $stmt->execute([':id' => $lhp['id']]);

        $today = date('Y-m-d');
        $list = array_map(function ($b) use ($today) {
            $b['id'] = (int) $b['id'];
            $b['so_tiet'] = Academic::soTiet($b);
            $b['da_diem_danh'] = (int) $b['so_ban_ghi_diem_danh'] > 0;
            $b['la_tuong_lai'] = $b['ngay_hoc'] > $today;

            return $b;
        }, $stmt->fetchAll());

        Response::json(['success' => true, 'lop_hoc_phan' => $lhp, 'data' => $list]);
    }

    /** GET /api/ketquahoctap/diem-danh?buoi_hoc_id= — danh sách điểm danh một buổi (RULE-12.2, 12.9) */
    public function danhSachDiemDanh(): void
    {
        $user = AuthService::requireUser($this->db, ['giang_vien', 'admin']);
        $buoi = $this->buoi(Request::int(Request::query('buoi_hoc_id')));
        $lhp = $this->lopHocPhan((int) $buoi['lop_hoc_phan_id'], $user);

        $stmt = $this->db->prepare("
            SELECT dk.id AS dang_ky_id, u.id AS sinh_vien_id, u.ma_dinh_danh, u.ho_ten, l.ma_lop,
                   dd.id AS diem_danh_id, dd.trang_thai, dd.ghi_chu, dd.thoi_gian_diem_danh
            FROM dang_ky_hoc_phan dk
            INNER JOIN users u ON u.id = dk.sinh_vien_user_id
            LEFT JOIN lop_sinh_vien l ON l.id = u.lop_sinh_vien_id
            LEFT JOIN diem_danh dd ON dd.dang_ky_id = dk.id AND dd.buoi_hoc_id = :buoi
            WHERE dk.lop_hoc_phan_id = :lhp AND " . Academic::activeDkSql('dk.trang_thai') . "
            ORDER BY u.ma_dinh_danh
        ");
        $stmt->execute([':buoi' => $buoi['id'], ':lhp' => $lhp['id']]);
        $rows = $stmt->fetchAll();

        $coMat = 0;
        $vangMat = 0;
        foreach ($rows as $r) {
            if ($r['trang_thai'] === Academic::DD_CO_MAT) {
                $coMat++;
            } elseif ($r['trang_thai'] === Academic::DD_VANG_MAT) {
                $vangMat++;
            }
        }

        Response::json([
            'success' => true,
            'buoi_hoc' => $buoi,
            'lop_hoc_phan' => $lhp,
            'thong_ke' => [
                'tong' => count($rows),
                'co_mat' => $coMat,
                'vang_mat' => $vangMat,
                'chua_diem_danh' => count($rows) - $coMat - $vangMat,
            ],
            'data' => $rows
        ]);
    }

    /**
     * POST /api/ketquahoctap/diem-danh
     * Body: { buoi_hoc_id, items: [ { dang_ky_id, trang_thai: "co_mat"|"vang_mat", ghi_chu } ] }
     */
    public function luuDiemDanh(): void
    {
        Request::requireMethod('POST');
        $user = AuthService::requireUser($this->db, ['giang_vien', 'admin']);

        $buoi = $this->buoi(Request::int(Request::input('buoi_hoc_id')));
        $lhp = $this->lopHocPhan((int) $buoi['lop_hoc_phan_id'], $user, true);

        if ($buoi['ngay_hoc'] > date('Y-m-d')) {
            Response::json([
                'success' => false,
                'message' => 'Buổi học ngày ' . date('d/m/Y', strtotime($buoi['ngay_hoc'])) . ' chưa diễn ra, chưa thể điểm danh.'
            ], 422);
        }

        $items = Request::input('items');
        if (!is_array($items) || count($items) === 0) {
            Response::json(['success' => false, 'message' => 'Danh sách điểm danh trống.'], 422);
        }

        // Đăng ký hợp lệ của lớp (RULE-12.2)
        $stmt = $this->db->prepare('SELECT id FROM dang_ky_hoc_phan WHERE lop_hoc_phan_id = :id AND ' . Academic::activeDkSql());
        $stmt->execute([':id' => $lhp['id']]);
        $validDk = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));

        $clean = [];
        foreach ($items as $i => $it) {
            $dkId = Request::int($it['dang_ky_id'] ?? 0);
            $tt = Request::str($it['trang_thai'] ?? '');
            $note = Request::str($it['ghi_chu'] ?? '');

            if (!in_array($dkId, $validDk, true)) {
                Response::json([
                    'success' => false,
                    'message' => 'Dòng ' . ($i + 1) . ': sinh viên không thuộc danh sách đăng ký hợp lệ của lớp.'
                ], 422);
            }
            if (!in_array($tt, [Academic::DD_CO_MAT, Academic::DD_VANG_MAT], true)) {
                Response::json([
                    'success' => false,
                    'message' => 'Dòng ' . ($i + 1) . ': trạng thái điểm danh chỉ gồm có mặt (co_mat) hoặc vắng mặt (vang_mat).'
                ], 422);
            }
            if (mb_strlen($note) > 255) {
                Response::json(['success' => false, 'message' => 'Dòng ' . ($i + 1) . ': ghi chú không quá 255 ký tự.'], 422);
            }
            $clean[$dkId] = ['trang_thai' => $tt, 'ghi_chu' => $note !== '' ? $note : null];
        }

        $now = date('Y-m-d H:i:s');

        $this->db->beginTransaction();
        try {
            // RULE-12.8: mỗi cặp (buoi_hoc_id, dang_ky_id) chỉ một bản ghi; RULE-12.9 cho phép cập nhật
            $upsert = $this->db->prepare('
                INSERT INTO diem_danh (buoi_hoc_id, dang_ky_id, trang_thai, ghi_chu, thoi_gian_diem_danh)
                VALUES (:buoi, :dk, :tt, :note, :now)
                ON CONFLICT(buoi_hoc_id, dang_ky_id) DO UPDATE SET
                    trang_thai = excluded.trang_thai,
                    ghi_chu = excluded.ghi_chu,
                    thoi_gian_diem_danh = excluded.thoi_gian_diem_danh
            ');

            foreach ($clean as $dkId => $c) {
                $upsert->execute([
                    ':buoi' => $buoi['id'],
                    ':dk' => $dkId,
                    ':tt' => $c['trang_thai'],
                    ':note' => $c['ghi_chu'],
                    ':now' => $now,
                ]);
                // RULE-12.10, 15.10, 15.12: tính lại tiết nghỉ, chuyên cần và tổng kết
                Academic::recalcDiem($this->db, $dkId);
            }

            $this->db->prepare("UPDATE buoi_hoc SET trang_thai = 'Đã điểm danh' WHERE id = :id")
                ->execute([':id' => $buoi['id']]);

            $this->db->commit();
        } catch (Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }

        Response::json([
            'success' => true,
            'message' => 'Lưu kết quả điểm danh thành công cho ' . count($clean) . ' sinh viên! Đã tự động cập nhật điểm chuyên cần.'
        ]);
    }

    // ==================================================================
    // ĐIỂM THÀNH PHẦN
    // ==================================================================

    /** GET /api/ketquahoctap/bang-diem?lop_hoc_phan_id= */
    public function bangDiem(): void
    {
        $user = AuthService::requireUser($this->db, ['giang_vien', 'admin']);
        $lhp = $this->lopHocPhan(Request::int(Request::query('lop_hoc_phan_id')), $user);

        $stmt = $this->db->prepare("
            SELECT dk.id AS dang_ky_id, u.id AS sinh_vien_id, u.ma_dinh_danh, u.ho_ten, l.ma_lop,
                   d.id AS diem_id, d.diem_giua_ky, d.diem_cuoi_ky, d.diem_tong_ket, d.diem_he_10,
                   d.diem_he_4, d.diem_chu, d.ket_qua, d.updated_at
            FROM dang_ky_hoc_phan dk
            INNER JOIN users u ON u.id = dk.sinh_vien_user_id
            LEFT JOIN lop_sinh_vien l ON l.id = u.lop_sinh_vien_id
            LEFT JOIN diem d ON d.dang_ky_id = dk.id
            WHERE dk.lop_hoc_phan_id = :id AND " . Academic::activeDkSql('dk.trang_thai') . "
            ORDER BY u.ma_dinh_danh
        ");
        $stmt->execute([':id' => $lhp['id']]);

        $tongTiet = Academic::tongTietLop($this->db, (int) $lhp['id']); // RULE-15.4
        $rows = [];
        $stat = ['tong' => 0, 'co_diem' => 0, 'dat' => 0, 'diem_a' => 0, 'diem_f' => 0];

        foreach ($stmt->fetchAll() as $r) {
            $tietNghi = Academic::tietNghi($this->db, (int) $r['dang_ky_id']);
            $r['tiet_nghi'] = $tietNghi;
            $r['tong_tiet_mon'] = $tongTiet;
            $r['ty_le_nghi'] = $tongTiet > 0 ? round($tietNghi / $tongTiet * 100, 2) : 0;
            // Chuyên cần luôn tính trực tiếp từ điểm danh (RULE-15)
            $r['diem_chuyen_can'] = Academic::diemChuyenCan($tietNghi, $tongTiet);

            $stat['tong']++;
            if ($r['diem_chu'] !== null) {
                $stat['co_diem']++;
                $stat['dat'] += $r['ket_qua'] === 'Đạt' ? 1 : 0;
                $stat['diem_a'] += $r['diem_chu'] === 'A' ? 1 : 0;
                $stat['diem_f'] += $r['diem_chu'] === 'F' ? 1 : 0;
            }
            $rows[] = $r;
        }
        $stat['ty_le_dat'] = $stat['co_diem'] > 0 ? round($stat['dat'] / $stat['co_diem'] * 100) : 0;

        Response::json(['success' => true, 'lop_hoc_phan' => $lhp, 'thong_ke' => $stat, 'data' => $rows]);
    }

    /**
     * POST /api/ketquahoctap/diem-thanh-phan — THÊM điểm thành phần
     * Body: { dang_ky_id, diem_giua_ky?, diem_cuoi_ky? } (ít nhất một điểm)
     */
    public function themDiem(): void
    {
        Request::requireMethod('POST');
        $user = AuthService::requireUser($this->db, ['giang_vien', 'admin']);
        $dk = $this->dangKy(Request::int(Request::input('dang_ky_id')), $user);

        [$gk, $ck] = $this->readScores(true);
        $cur = $this->currentDiem((int) $dk['id']);

        if ($gk !== null && $cur['diem_giua_ky'] !== null) {
            Response::json(['success' => false, 'message' => 'Sinh viên đã có điểm giữa kỳ, hãy dùng chức năng sửa điểm.'], 409);
        }
        if ($ck !== null && $cur['diem_cuoi_ky'] !== null) {
            Response::json(['success' => false, 'message' => 'Sinh viên đã có điểm cuối kỳ, hãy dùng chức năng sửa điểm.'], 409);
        }

        $saved = Academic::saveDiem($this->db, (int) $dk['id'], $gk ?? $cur['diem_giua_ky'], $ck ?? $cur['diem_cuoi_ky']);

        Response::json(['success' => true, 'message' => 'Thêm điểm thành phần thành công.', 'data' => $saved], 201);
    }

    /**
     * PUT /api/ketquahoctap/diem-thanh-phan — SỬA điểm thành phần đã có
     * Body: { dang_ky_id, diem_giua_ky?, diem_cuoi_ky? }
     */
    public function suaDiem(): void
    {
        Request::requireMethod('PUT', 'POST');
        $user = AuthService::requireUser($this->db, ['giang_vien', 'admin']);
        $dk = $this->dangKy(Request::int(Request::input('dang_ky_id')), $user);

        [$gk, $ck] = $this->readScores(true);
        $cur = $this->currentDiem((int) $dk['id']);

        if ($gk !== null && $cur['diem_giua_ky'] === null) {
            Response::json(['success' => false, 'message' => 'Sinh viên chưa có điểm giữa kỳ để sửa, hãy dùng chức năng thêm điểm.'], 404);
        }
        if ($ck !== null && $cur['diem_cuoi_ky'] === null) {
            Response::json(['success' => false, 'message' => 'Sinh viên chưa có điểm cuối kỳ để sửa, hãy dùng chức năng thêm điểm.'], 404);
        }

        $saved = Academic::saveDiem($this->db, (int) $dk['id'], $gk ?? $cur['diem_giua_ky'], $ck ?? $cur['diem_cuoi_ky']);

        Response::json(['success' => true, 'message' => 'Sửa điểm thành phần thành công.', 'data' => $saved]);
    }

    /**
     * DELETE /api/ketquahoctap/diem-thanh-phan?dang_ky_id=&loai=giua_ky|cuoi_ky|tat_ca
     */
    public function xoaDiem(): void
    {
        Request::requireMethod('DELETE', 'POST');
        $user = AuthService::requireUser($this->db, ['giang_vien', 'admin']);
        $dk = $this->dangKy(Request::int(Request::query('dang_ky_id', Request::input('dang_ky_id'))), $user);

        $loai = Request::str(Request::query('loai', Request::input('loai', 'tat_ca')));
        if (!in_array($loai, ['giua_ky', 'cuoi_ky', 'tat_ca'], true)) {
            Response::json(['success' => false, 'message' => 'Loại điểm cần xóa không hợp lệ (giua_ky, cuoi_ky, tat_ca).'], 422);
        }

        $cur = $this->currentDiem((int) $dk['id']);
        if ($cur['diem_giua_ky'] === null && $cur['diem_cuoi_ky'] === null) {
            Response::json(['success' => false, 'message' => 'Sinh viên chưa có điểm thành phần nào để xóa.'], 404);
        }

        $gk = in_array($loai, ['giua_ky', 'tat_ca'], true) ? null : $cur['diem_giua_ky'];
        $ck = in_array($loai, ['cuoi_ky', 'tat_ca'], true) ? null : $cur['diem_cuoi_ky'];

        if ($gk === null && $ck === null) {
            $this->db->prepare('DELETE FROM diem WHERE dang_ky_id = :dk')->execute([':dk' => $dk['id']]);
            $data = null;
        } else {
            $data = Academic::saveDiem($this->db, (int) $dk['id'], $gk, $ck);
        }

        $label = ['giua_ky' => 'điểm giữa kỳ', 'cuoi_ky' => 'điểm cuối kỳ', 'tat_ca' => 'toàn bộ điểm thành phần'][$loai];

        Response::json(['success' => true, 'message' => 'Đã xóa ' . $label . ' của sinh viên.', 'data' => $data]);
    }

    /**
     * POST /api/ketquahoctap/bang-diem — lưu cả bảng điểm của lớp
     * Body: { lop_hoc_phan_id, items: [ { dang_ky_id, diem_giua_ky, diem_cuoi_ky } ] }
     * Ô để trống = chưa có điểm thành phần đó.
     */
    public function luuBangDiem(): void
    {
        Request::requireMethod('POST');
        $user = AuthService::requireUser($this->db, ['giang_vien', 'admin']);
        $lhp = $this->lopHocPhan(Request::int(Request::input('lop_hoc_phan_id')), $user, true);

        $items = Request::input('items');
        if (!is_array($items) || count($items) === 0) {
            Response::json(['success' => false, 'message' => 'Bảng điểm trống.'], 422);
        }

        $stmt = $this->db->prepare('
            SELECT dk.id, u.ma_dinh_danh FROM dang_ky_hoc_phan dk
            INNER JOIN users u ON u.id = dk.sinh_vien_user_id
            WHERE dk.lop_hoc_phan_id = :id AND ' . Academic::activeDkSql('dk.trang_thai'));
        $stmt->execute([':id' => $lhp['id']]);
        $valid = [];
        foreach ($stmt->fetchAll() as $r) {
            $valid[(int) $r['id']] = $r['ma_dinh_danh'];
        }

        $clean = [];
        foreach ($items as $i => $it) {
            $dkId = Request::int($it['dang_ky_id'] ?? 0);
            if (!isset($valid[$dkId])) {
                Response::json(['success' => false, 'message' => 'Dòng ' . ($i + 1) . ': sinh viên không thuộc lớp học phần.'], 422);
            }
            $prefix = 'Sinh viên ' . $valid[$dkId] . ': ';
            $clean[$dkId] = [
                $this->checkScore($it['diem_giua_ky'] ?? null, $prefix . 'điểm giữa kỳ'),
                $this->checkScore($it['diem_cuoi_ky'] ?? null, $prefix . 'điểm cuối kỳ'),
            ];
        }

        $saved = 0;
        $this->db->beginTransaction();
        try {
            foreach ($clean as $dkId => [$gk, $ck]) {
                $cur = $this->currentDiem($dkId);
                if ($gk === null && $ck === null) {
                    if ($cur['exists']) {
                        $this->db->prepare('DELETE FROM diem WHERE dang_ky_id = :dk')->execute([':dk' => $dkId]);
                    }
                    continue;
                }
                if ($cur['exists'] && $cur['diem_giua_ky'] === $gk && $cur['diem_cuoi_ky'] === $ck) {
                    Academic::recalcDiem($this->db, $dkId);
                    continue;
                }
                Academic::saveDiem($this->db, $dkId, $gk, $ck);
                $saved++;
            }
            $this->db->commit();
        } catch (Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }

        Response::json([
            'success' => true,
            'message' => $saved > 0
                ? 'Đã lưu thành công bảng điểm cho ' . $saved . ' sinh viên!'
                : 'Không có thay đổi điểm nào cần lưu.'
        ]);
    }

    // ==================================================================
    // TRA CỨU KẾT QUẢ HỌC TẬP (SINH VIÊN)
    // ==================================================================

    /** GET /api/ketquahoctap/ket-qua?hoc_ky=1|all&nam_hoc=2026-2027|all */
    public function ketQua(): void
    {
        $user = AuthService::requireUser($this->db, ['sinh_vien']);

        $hk = Request::str(Request::query('hoc_ky', 'all'));
        $nh = Request::str(Request::query('nam_hoc', 'all'));

        $stmt = $this->db->prepare("
            SELECT dk.id AS dang_ky_id, lhp.id AS lop_hoc_phan_id, lhp.ma_lop_hoc_phan, lhp.hoc_ky, lhp.nam_hoc,
                   mh.id AS mon_hoc_id, mh.ma_mon_hoc, mh.ten_mon_hoc, mh.so_tin_chi, mh.so_tiet,
                   d.diem_chuyen_can, d.diem_giua_ky, d.diem_cuoi_ky, d.diem_tong_ket, d.diem_he_10,
                   d.diem_he_4, d.diem_chu, d.ket_qua
            FROM dang_ky_hoc_phan dk
            INNER JOIN lop_hoc_phan lhp ON lhp.id = dk.lop_hoc_phan_id
            INNER JOIN mon_hoc mh ON mh.id = lhp.mon_hoc_id
            LEFT JOIN diem d ON d.dang_ky_id = dk.id
            WHERE dk.sinh_vien_user_id = :sv AND " . Academic::activeDkSql('dk.trang_thai') . "
            ORDER BY lhp.nam_hoc, lhp.hoc_ky, mh.ma_mon_hoc
        ");
        $stmt->execute([':sv' => $user['id']]);
        $all = $stmt->fetchAll();

        // RULE-18.11: xác định các lần học của cùng một học phần (theo thứ tự năm học, học kỳ)
        usort($all, fn($a, $b) => [$a['nam_hoc'], (int) $a['hoc_ky'], (int) $a['dang_ky_id']]
                              <=> [$b['nam_hoc'], (int) $b['hoc_ky'], (int) $b['dang_ky_id']]);

        $attempts = [];
        foreach ($all as $i => &$r) {
            // Chuyên cần hiển thị theo điểm danh hiện tại
            $tongTiet = Academic::tongTietLop($this->db, (int) $r['lop_hoc_phan_id']);
            $r['diem_chuyen_can'] = Academic::diemChuyenCan(Academic::tietNghi($this->db, (int) $r['dang_ky_id']), $tongTiet);
            $r['trang_thai_mon'] = $r['ket_qua'] ?? 'Chưa tổng kết';

            $attempts[$r['mon_hoc_id']][] = $i;
            $r['lan_hoc'] = count($attempts[$r['mon_hoc_id']]);
        }
        unset($r);

        // Lần học được dùng để tính GPA tích lũy: mỗi học phần đúng một lần (không trùng tín chỉ)
        $chosen = Academic::chonLanHoc($all);
        foreach ($all as $i => &$r) {
            $r['so_lan_hoc'] = count($attempts[$r['mon_hoc_id']]);
            $r['tinh_tich_luy'] = in_array($i, $chosen, true);
        }
        unset($r);

        $tichLuy = $this->summary(array_map(fn($i) => $all[$i], $chosen));

        // Học kỳ đang chọn (RULE-16.1). Nếu phạm vi lọc gồm nhiều học kỳ có cùng học phần,
        // cũng chỉ tính một lần theo cùng quy tắc để không trùng tín chỉ.
        $rows = array_values(array_filter($all, function ($r) use ($hk, $nh) {
            return ($hk === 'all' || (string) $r['hoc_ky'] === $hk) && ($nh === 'all' || $r['nam_hoc'] === $nh);
        }));
        $hocKy = $this->summary(array_map(fn($i) => $rows[$i], Academic::chonLanHoc($rows)));

        Response::json([
            'success' => true,
            'data' => $rows,
            'hoc_ky' => [
                'dtb_he_10' => $hocKy['dtb_he_10'],
                'dtb_he_4' => $hocKy['dtb_he_4'],
                'so_tin_chi_dat' => $hocKy['so_tin_chi_dat'],
                'phan_loai' => Academic::phanLoai($hocKy['dtb_he_10']),
            ],
            'quy_tac_hoc_lai' => Academic::RETAKE_POLICY,
            'tich_luy' => [
                'dtb_he_10' => $tichLuy['dtb_he_10'],
                'dtb_he_4' => $tichLuy['dtb_he_4'],
                'so_tin_chi_tich_luy' => $tichLuy['so_tin_chi_dat'],
            ],
        ]);
    }

    // ------------------------------------------------------------------

    /**
     * RULE-18.6: A = Σ(a_i × n_i) / Σ n_i
     *  a_i: điểm học phần thứ i (hệ 10 hoặc hệ 4), n_i: số tín chỉ học phần thứ i.
     *  GPA học kỳ: các học phần đã có điểm tổng kết trong học kỳ được chọn.
     *  GPA tích lũy: các học phần đã có điểm trong toàn bộ quá trình học,
     *  học phần học lại chỉ tính một lần theo Academic::RETAKE_POLICY (RULE-18.11).
     */
    private function summary(array $rows): array
    {
        $tc = 0;
        $s10 = 0.0;
        $s4 = 0.0;
        $dat = 0;

        foreach ($rows as $r) {
            $c = (int) $r['so_tin_chi'];
            $tc += $c;
            $s10 += (float) $r['diem_he_10'] * $c;
            $s4 += (float) $r['diem_he_4'] * $c;
            if ($r['ket_qua'] === 'Đạt') {
                $dat += $c;
            }
        }

        return [
            'dtb_he_10' => $tc > 0 ? round($s10 / $tc, 2) : null,
            'dtb_he_4' => $tc > 0 ? round($s4 / $tc, 2) : null,
            'so_tin_chi_dat' => $dat,
        ];
    }

    /** Lấy lớp học phần và kiểm tra quyền (RULE-12.1) */
    private function lopHocPhan(int $id, array $user, bool $write = false): array
    {
        $stmt = $this->db->prepare('
            SELECT lhp.*, mh.ma_mon_hoc, mh.ten_mon_hoc, mh.so_tin_chi, mh.so_tiet, gv.ho_ten AS ten_giang_vien,
                   (SELECT COUNT(*) FROM dang_ky_hoc_phan dk
                     WHERE dk.lop_hoc_phan_id = lhp.id AND ' . Academic::activeDkSql('dk.trang_thai') . ') AS si_so_hien_tai
            FROM lop_hoc_phan lhp
            INNER JOIN mon_hoc mh ON mh.id = lhp.mon_hoc_id
            LEFT JOIN users gv ON gv.id = lhp.giang_vien_user_id
            WHERE lhp.id = :id
        ');
        $stmt->execute([':id' => $id]);
        $lhp = $stmt->fetch();

        if (!$lhp) {
            Response::json(['success' => false, 'message' => 'Không tìm thấy lớp học phần.'], 404);
        }

        if ($user['vai_tro'] === 'giang_vien' && (int) $lhp['giang_vien_user_id'] !== (int) $user['id']) {
            Response::json([
                'success' => false,
                'message' => 'Bạn chỉ được ' . ($write ? 'cập nhật' : 'xem') . ' dữ liệu của lớp học phần do mình phụ trách.'
            ], 403);
        }

        return $lhp;
    }

    private function buoi(int $id): array
    {
        $stmt = $this->db->prepare('
            SELECT b.*, lh.lop_hoc_phan_id, lh.thu
            FROM buoi_hoc b INNER JOIN lich_hoc lh ON lh.id = b.lich_hoc_id
            WHERE b.id = :id
        ');
        $stmt->execute([':id' => $id]);
        $b = $stmt->fetch();

        if (!$b) {
            Response::json(['success' => false, 'message' => 'Không tìm thấy buổi học.'], 404);
        }
        $b['so_tiet'] = Academic::soTiet($b);

        return $b;
    }

    /** Đăng ký hợp lệ + quyền giảng viên trên lớp */
    private function dangKy(int $id, array $user): array
    {
        $stmt = $this->db->prepare('SELECT * FROM dang_ky_hoc_phan WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $dk = $stmt->fetch();

        if (!$dk) {
            Response::json(['success' => false, 'message' => 'Không tìm thấy đăng ký học phần.'], 404);
        }
        if (!in_array($dk['trang_thai'], Academic::DK_ACTIVE, true)) {
            Response::json(['success' => false, 'message' => 'Đăng ký học phần này đã bị hủy.'], 422);
        }

        $this->lopHocPhan((int) $dk['lop_hoc_phan_id'], $user, true);

        return $dk;
    }

    private function currentDiem(int $dkId): array
    {
        $stmt = $this->db->prepare('SELECT diem_giua_ky, diem_cuoi_ky FROM diem WHERE dang_ky_id = :dk');
        $stmt->execute([':dk' => $dkId]);
        $d = $stmt->fetch();

        return [
            'exists' => (bool) $d,
            'diem_giua_ky' => $d ? Academic::nullableFloat($d['diem_giua_ky']) : null,
            'diem_cuoi_ky' => $d ? Academic::nullableFloat($d['diem_cuoi_ky']) : null,
        ];
    }

    /** Đọc điểm giữa kỳ, cuối kỳ từ body */
    private function readScores(bool $requireOne): array
    {
        $gk = $this->checkScore(Request::input('diem_giua_ky'), 'Điểm giữa kỳ');
        $ck = $this->checkScore(Request::input('diem_cuoi_ky'), 'Điểm cuối kỳ');

        if ($requireOne && $gk === null && $ck === null) {
            Response::json(['success' => false, 'message' => 'Vui lòng nhập điểm giữa kỳ hoặc điểm cuối kỳ.'], 422);
        }

        return [$gk, $ck];
    }

    private function checkScore($value, string $label): ?float
    {
        $v = Request::score($value);

        if ($v === false || ($v !== null && ($v < 0 || $v > 10))) {
            Response::json(['success' => false, 'message' => $label . ' phải là số từ 0 đến 10.'], 422);
        }
        if ($v !== null && abs($v * 100 - round($v * 100)) > 1e-6) {
            Response::json(['success' => false, 'message' => $label . ' chỉ được tối đa 2 chữ số thập phân.'], 422);
        }

        return $v;
    }
}
