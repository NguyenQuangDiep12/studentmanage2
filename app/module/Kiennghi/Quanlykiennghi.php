<?php

require_once dirname(__DIR__, 2) . '/config/database.php';
require_once dirname(__DIR__, 2) . '/core/Response.php';
require_once dirname(__DIR__, 2) . '/core/Request.php';
require_once dirname(__DIR__, 2) . '/core/AuthService.php';

/**
 * Ý kiến & Kiến nghị của sinh viên và phản hồi (bảng kien_nghi, phan_hoi_kien_nghi)
 */
class Quanlykiennghi
{
    private PDO $db;

    private const CHO_XU_LY = 'Chờ xử lý';
    private const DA_PHAN_HOI = 'Đã phản hồi';

    public function __construct()
    {
        $this->db = Database::connect();
    }

    /** GET /api/kiennghi?search=&trang_thai= — SV chỉ thấy ý kiến của mình */
    public function index(): void
    {
        $user = AuthService::requireUser($this->db);

        $sql = '
            SELECT k.*, u.ho_ten AS ten_sinh_vien, u.ma_dinh_danh AS ma_sinh_vien,
                   (SELECT COUNT(*) FROM phan_hoi_kien_nghi p WHERE p.kien_nghi_id = k.id) AS so_phan_hoi
            FROM kien_nghi k
            LEFT JOIN users u ON u.id = k.sinh_vien_user_id
            WHERE 1 = 1
        ';
        $params = [];

        if ($user['vai_tro'] === 'sinh_vien') {
            $sql .= ' AND k.sinh_vien_user_id = :uid';
            $params[':uid'] = $user['id'];
        }

        $tt = Request::str(Request::query('trang_thai', ''));
        if ($tt !== '') {
            $sql .= ' AND k.trang_thai = :tt';
            $params[':tt'] = $tt;
        }

        $search = Request::str(Request::query('search', ''));
        if ($search !== '') {
            $sql .= ' AND (k.tieu_de LIKE :s1 OR k.noi_dung LIKE :s2)';
            $params[':s1'] = '%' . $search . '%';
            $params[':s2'] = '%' . $search . '%';
        }

        $stmt = $this->db->prepare($sql . ' ORDER BY k.created_at DESC, k.id DESC');
        $stmt->execute($params);
        $list = $stmt->fetchAll();

        Response::json(['success' => true, 'total' => count($list), 'data' => $list]);
    }

    /** GET /api/kiennghi/chi-tiet?id= — kèm danh sách phản hồi */
    public function show(): void
    {
        $user = AuthService::requireUser($this->db);
        $kn = $this->find(Request::int(Request::query('id')), $user);

        $stmt = $this->db->prepare('
            SELECT p.*, u.ho_ten AS ten_nguoi_phan_hoi, u.vai_tro AS vai_tro_nguoi_phan_hoi
            FROM phan_hoi_kien_nghi p
            LEFT JOIN users u ON u.id = p.nguoi_phan_hoi_user_id
            WHERE p.kien_nghi_id = :id
            ORDER BY p.created_at, p.id
        ');
        $stmt->execute([':id' => $kn['id']]);
        $kn['phan_hoi'] = $stmt->fetchAll();

        Response::json(['success' => true, 'data' => $kn]);
    }

    /** POST /api/kiennghi — sinh viên gửi ý kiến { tieu_de, noi_dung } */
    public function store(): void
    {
        Request::requireMethod('POST');
        $user = AuthService::requireUser($this->db, ['sinh_vien']);

        $tieuDe = Request::str(Request::input('tieu_de'));
        $noiDung = Request::str(Request::input('noi_dung'));

        if ($tieuDe === '' || $noiDung === '') {
            Response::json(['success' => false, 'message' => 'Vui lòng điền đầy đủ tiêu đề và nội dung kiến nghị!'], 422);
        }
        if (mb_strlen($tieuDe) > 255) {
            Response::json(['success' => false, 'message' => 'Tiêu đề không quá 255 ký tự!'], 422);
        }

        $now = date('Y-m-d H:i:s');
        $this->db->prepare('
            INSERT INTO kien_nghi (sinh_vien_user_id, tieu_de, noi_dung, trang_thai, created_at, updated_at)
            VALUES (:uid, :td, :nd, :tt, :c, :u)
        ')->execute([':uid' => $user['id'], ':td' => $tieuDe, ':nd' => $noiDung, ':tt' => self::CHO_XU_LY, ':c' => $now, ':u' => $now]);

        Response::json(['success' => true, 'message' => 'Gửi kiến nghị thành công! Nhà trường sẽ sớm phản hồi'], 201);
    }

    /** POST /api/kiennghi/phan-hoi — quản trị viên / giảng viên trả lời { kien_nghi_id, noi_dung } */
    public function reply(): void
    {
        Request::requireMethod('POST');
        $user = AuthService::requireUser($this->db, ['admin', 'giang_vien']);
        $kn = $this->find(Request::int(Request::input('kien_nghi_id')), $user);

        $noiDung = Request::str(Request::input('noi_dung'));
        if ($noiDung === '') {
            Response::json(['success' => false, 'message' => 'Vui lòng nhập nội dung phản hồi!'], 422);
        }

        $now = date('Y-m-d H:i:s');
        $this->db->beginTransaction();
        try {
            $this->db->prepare('
                INSERT INTO phan_hoi_kien_nghi (kien_nghi_id, nguoi_phan_hoi_user_id, noi_dung, created_at)
                VALUES (:k, :u, :nd, :c)
            ')->execute([':k' => $kn['id'], ':u' => $user['id'], ':nd' => $noiDung, ':c' => $now]);

            $this->db->prepare('UPDATE kien_nghi SET trang_thai = :tt, updated_at = :u WHERE id = :id')
                ->execute([':tt' => self::DA_PHAN_HOI, ':u' => $now, ':id' => $kn['id']]);
            $this->db->commit();
        } catch (Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }

        Response::json(['success' => true, 'message' => 'Gửi phản hồi thành công!']);
    }

    /** DELETE /api/kiennghi?id= — quản trị viên xóa ý kiến và các phản hồi */
    public function destroy(): void
    {
        Request::requireMethod('DELETE');
        $user = AuthService::requireUser($this->db, ['admin']);
        $kn = $this->find(Request::int(Request::query('id')), $user);

        $this->db->beginTransaction();
        try {
            $this->db->prepare('DELETE FROM phan_hoi_kien_nghi WHERE kien_nghi_id = :id')->execute([':id' => $kn['id']]);
            $this->db->prepare('DELETE FROM kien_nghi WHERE id = :id')->execute([':id' => $kn['id']]);
            $this->db->commit();
        } catch (Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }

        Response::json(['success' => true, 'message' => 'Đã xóa kiến nghị thành công!']);
    }

    private function find(int $id, array $user): array
    {
        $stmt = $this->db->prepare('
            SELECT k.*, u.ho_ten AS ten_sinh_vien, u.ma_dinh_danh AS ma_sinh_vien
            FROM kien_nghi k LEFT JOIN users u ON u.id = k.sinh_vien_user_id
            WHERE k.id = :id
        ');
        $stmt->execute([':id' => $id]);
        $kn = $stmt->fetch();

        if (!$kn || ($user['vai_tro'] === 'sinh_vien' && (int) $kn['sinh_vien_user_id'] !== (int) $user['id'])) {
            Response::json(['success' => false, 'message' => 'Không tìm thấy kiến nghị.'], 404);
        }

        return $kn;
    }
}
