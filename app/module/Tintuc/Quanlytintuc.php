<?php

require_once dirname(__DIR__, 2) . '/config/database.php';
require_once dirname(__DIR__, 2) . '/core/Response.php';
require_once dirname(__DIR__, 2) . '/core/Request.php';
require_once dirname(__DIR__, 2) . '/core/AuthService.php';

/**
 * Quản lý tin tức (RULE-19) và hiển thị tin tức (RULE-20)
 */
class Quanlytintuc
{
    private PDO $db;

    private const PUBLIC_STATUS = 'Công khai';
    private const STATUSES = ['Công khai', 'Đã ẩn', 'Bản nháp'];
    private const CATEGORIES = ['Đào tạo', 'Sự kiện', 'Tuyển dụng', 'Chung'];

    public function __construct()
    {
        $this->db = Database::connect();
    }

    /**
     * GET /api/tintuc?search=&danh_muc=
     * Quản trị viên thêm ?quan_ly=1 (&trang_thai=) để xem cả tin ẩn / nháp.
     */
    public function index(): void
    {
        $user = AuthService::requireUser($this->db);
        $manage = $user['vai_tro'] === 'admin' && Request::query('quan_ly') == '1';

        $sql = $this->baseSelect() . ' WHERE 1 = 1';
        $params = [];

        if (!$manage) {
            // RULE-20.2, 20.5: chỉ tin đã công khai
            $sql .= ' AND t.trang_thai = :pub';
            $params[':pub'] = self::PUBLIC_STATUS;
        } else {
            $tt = Request::str(Request::query('trang_thai', ''));
            if ($tt !== '') {
                $sql .= ' AND t.trang_thai = :tt';
                $params[':tt'] = $tt;
            }
        }

        $dm = Request::str(Request::query('danh_muc', ''));
        if ($dm !== '') {
            $sql .= ' AND t.danh_muc = :dm';
            $params[':dm'] = $dm;
        }

        $search = Request::str(Request::query('search', ''));
        if ($search !== '') {
            $sql .= ' AND (t.tieu_de LIKE :s1 OR t.tom_tat LIKE :s2 OR t.noi_dung LIKE :s3)';
            $kw = '%' . $search . '%';
            $params += [':s1' => $kw, ':s2' => $kw, ':s3' => $kw];
        }

        $sql .= ' ORDER BY t.created_at DESC, t.id DESC';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $list = $stmt->fetchAll();

        Response::json(['success' => true, 'total' => count($list), 'data' => $list]);
    }

    /** GET /api/tintuc/chi-tiet?id= (RULE-20.4, 20.6) */
    public function show(): void
    {
        $user = AuthService::requireUser($this->db);
        $news = $this->find(Request::int(Request::query('id')));

        if (!$news || ($user['vai_tro'] !== 'admin' && $news['trang_thai'] !== self::PUBLIC_STATUS)) {
            Response::json(['success' => false, 'message' => 'Tin tức không tồn tại hoặc chưa được công khai.'], 404);
        }

        Response::json(['success' => true, 'data' => $news]);
    }

    /** POST /api/tintuc — đăng tin (RULE-19.2, 19.3, 19.4) */
    public function store(): void
    {
        Request::requireMethod('POST');
        $admin = AuthService::requireUser($this->db, ['admin']);

        $data = $this->validate(Request::body());
        $now = date('Y-m-d H:i:s');

        $this->db->prepare('
            INSERT INTO tin_tuc (tieu_de, tom_tat, noi_dung, danh_muc, trang_thai, nguoi_dang_user_id, created_at, updated_at)
            VALUES (:tieu_de, :tom_tat, :noi_dung, :danh_muc, :trang_thai, :uid, :c, :u)
        ')->execute([
            ':tieu_de' => $data['tieu_de'],
            ':tom_tat' => $data['tom_tat'],
            ':noi_dung' => $data['noi_dung'],
            ':danh_muc' => $data['danh_muc'],
            ':trang_thai' => $data['trang_thai'],
            ':uid' => $admin['id'],
            ':c' => $now,
            ':u' => $now,
        ]);

        Response::json([
            'success' => true,
            'message' => 'Đăng tin tức mới thành công!',
            'data' => $this->find((int) $this->db->lastInsertId())
        ], 201);
    }

    /** PUT /api/tintuc — sửa tin (RULE-19.5), body có id */
    public function update(): void
    {
        Request::requireMethod('PUT', 'POST');
        AuthService::requireUser($this->db, ['admin']);

        $id = Request::int(Request::input('id'));
        if (!$this->find($id)) {
            Response::json(['success' => false, 'message' => 'Không tìm thấy tin tức.'], 404);
        }

        $data = $this->validate(Request::body());

        $this->db->prepare('
            UPDATE tin_tuc SET tieu_de = :tieu_de, tom_tat = :tom_tat, noi_dung = :noi_dung,
                               danh_muc = :danh_muc, trang_thai = :trang_thai, updated_at = :u
            WHERE id = :id
        ')->execute([
            ':tieu_de' => $data['tieu_de'],
            ':tom_tat' => $data['tom_tat'],
            ':noi_dung' => $data['noi_dung'],
            ':danh_muc' => $data['danh_muc'],
            ':trang_thai' => $data['trang_thai'],
            ':u' => date('Y-m-d H:i:s'),
            ':id' => $id,
        ]);

        Response::json(['success' => true, 'message' => 'Cập nhật tin tức thành công!', 'data' => $this->find($id)]);
    }

    /** POST /api/tintuc/trang-thai — body { id, trang_thai } ẩn / hiển thị (RULE-19.6) */
    public function changeStatus(): void
    {
        Request::requireMethod('POST', 'PUT');
        AuthService::requireUser($this->db, ['admin']);

        $id = Request::int(Request::input('id'));
        if (!$this->find($id)) {
            Response::json(['success' => false, 'message' => 'Không tìm thấy tin tức.'], 404);
        }

        $tt = Request::str(Request::input('trang_thai'));
        if (!in_array($tt, self::STATUSES, true)) {
            Response::json(['success' => false, 'message' => 'Trạng thái tin tức không hợp lệ (Công khai, Đã ẩn, Bản nháp).'], 422);
        }

        $this->db->prepare('UPDATE tin_tuc SET trang_thai = :tt, updated_at = :u WHERE id = :id')
            ->execute([':tt' => $tt, ':u' => date('Y-m-d H:i:s'), ':id' => $id]);

        Response::json(['success' => true, 'message' => 'Đã đổi trạng thái sang: ' . $tt, 'data' => $this->find($id)]);
    }

    /** DELETE /api/tintuc?id= */
    public function destroy(): void
    {
        Request::requireMethod('DELETE', 'POST');
        AuthService::requireUser($this->db, ['admin']);

        $id = Request::int(Request::query('id', Request::input('id')));
        $news = $this->find($id);
        if (!$news) {
            Response::json(['success' => false, 'message' => 'Không tìm thấy tin tức.'], 404);
        }

        $this->db->prepare('DELETE FROM tin_tuc WHERE id = :id')->execute([':id' => $id]);

        Response::json(['success' => true, 'message' => 'Đã xóa bài viết thành công!']);
    }

    // ------------------------------------------------------------------

    private function baseSelect(): string
    {
        return '
            SELECT t.*, u.ho_ten AS ten_nguoi_dang
            FROM tin_tuc t
            LEFT JOIN users u ON u.id = t.nguoi_dang_user_id
        ';
    }

    private function find(int $id): ?array
    {
        if ($id <= 0) {
            return null;
        }
        $stmt = $this->db->prepare($this->baseSelect() . ' WHERE t.id = :id');
        $stmt->execute([':id' => $id]);

        return $stmt->fetch() ?: null;
    }

    /** RULE-19.3: kiểm tra trường bắt buộc */
    private function validate(array $in): array
    {
        $tieuDe = Request::str($in['tieu_de'] ?? '');
        $tomTat = Request::str($in['tom_tat'] ?? '');
        $noiDung = Request::str($in['noi_dung'] ?? '');
        $danhMuc = Request::str($in['danh_muc'] ?? 'Chung');
        $tt = Request::str($in['trang_thai'] ?? self::PUBLIC_STATUS);

        if ($tieuDe === '') {
            Response::json(['success' => false, 'message' => 'Tiêu đề tin tức không được để trống!'], 422);
        }
        if (mb_strlen($tieuDe) > 255) {
            Response::json(['success' => false, 'message' => 'Tiêu đề tin tức không quá 255 ký tự!'], 422);
        }
        if ($noiDung === '') {
            Response::json(['success' => false, 'message' => 'Nội dung tin tức không được để trống!'], 422);
        }
        if (mb_strlen($tomTat) > 500) {
            Response::json(['success' => false, 'message' => 'Tóm tắt không quá 500 ký tự!'], 422);
        }
        if (!in_array($danhMuc, self::CATEGORIES, true)) {
            Response::json(['success' => false, 'message' => 'Danh mục tin tức không hợp lệ!'], 422);
        }
        if (!in_array($tt, self::STATUSES, true)) {
            Response::json(['success' => false, 'message' => 'Trạng thái tin tức không hợp lệ!'], 422);
        }

        return [
            'tieu_de' => $tieuDe,
            'tom_tat' => $tomTat !== '' ? $tomTat : null,
            'noi_dung' => $noiDung,
            'danh_muc' => $danhMuc,
            'trang_thai' => $tt,
        ];
    }
}
