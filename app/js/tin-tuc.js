/* ================================================================
   TIN-TUC.JS - Quản lý & Hiển thị Tin tức, Thông báo nhà trường
   Font Awesome CDN Icons & Thiết kế Card hiện đại
   Thống nhất trạng thái: 'Công khai', 'Đã ẩn', 'Bản nháp'
   Bảo vệ XSS & Tương thích chuẩn API PHP Backend
   ================================================================ */

(function ($) {
    'use strict';

    // ================================================================
    // Module Tin Tức (Dành cho Sinh viên, Giảng viên & Quản trị viên xem)
    // ================================================================
    var TinTucViewerModule = {
        render: function () {
            var currentUser = App.getCurrentUser();
            var isAdmin = currentUser && currentUser.vai_tro === 'admin';

            var html =
                '<div class="card">' +
                '  <div class="card-header">' +
                '    <h3><i class="fa-solid fa-bullhorn"></i> Bảng tin & Thông báo</h3>' +
                (isAdmin ? '    <button class="btn btn-primary" onclick="App.navigate(\'tin-tuc-admin\')"><i class="fa-solid fa-gear"></i> Quản lý bài viết</button>' : '') +
                '  </div>' +
                '  <div class="card-body">' +
                '    <div class="toolbar">' +
                '      <div class="toolbar-left">' +
                '        <div class="search-box">' +
                '          <span class="search-icon"><i class="fa-solid fa-magnifying-glass"></i></span>' +
                '          <input type="text" id="searchNewsViewer" placeholder="Tìm kiếm tin tức, thông báo...">' +
                '        </div>' +
                '        <select id="filterDanhMucNews" class="filter-select">' +
                '          <option value="">Tất cả danh mục</option>' +
                '          <option value="Đào tạo">Đào tạo</option>' +
                '          <option value="Sự kiện">Sự kiện</option>' +
                '          <option value="Tuyển dụng">Tuyển dụng</option>' +
                '          <option value="Chung">Chung</option>' +
                '        </select>' +
                '      </div>' +
                '    </div>' +

                '    <div class="news-list" id="publicNewsList">' +
                '    </div>' +
                '  </div>' +
                '</div>';

            $('#contentArea').html(html);
            this.bindEvents();
            this.loadNews();
        },

        bindEvents: function () {
            var self = this;
            $('#searchNewsViewer, #filterDanhMucNews').on('input change', function () {
                self.loadNews();
            });

            $(document).off('click', '.news-item-card').on('click', '.news-item-card', function () {
                var id = $(this).data('id');
                self.showNewsDetail(id);
            });
        },

        loadNews: function () {
            var kw = ($('#searchNewsViewer').val() || '').toLowerCase().trim();
            var dm = $('#filterDanhMucNews').val();

            // Chỉ hiển thị các tin tức có trạng thái công khai
            var list = MockDB.tin_tuc.getAll().filter(function (n) {
                return n.trang_thai === 'Công khai' || n.trang_thai === 'cong_khai';
            });

            if (dm) {
                list = list.filter(function (n) { return n.danh_muc === dm; });
            }

            if (kw) {
                list = list.filter(function (n) {
                    var t = (n.tieu_de || '').toLowerCase();
                    var s = (n.tom_tat || '').toLowerCase();
                    var c = (n.noi_dung || '').toLowerCase();
                    return t.indexOf(kw) !== -1 || s.indexOf(kw) !== -1 || c.indexOf(kw) !== -1;
                });
            }

            // Sắp xếp bài mới nhất lên đầu
            list.sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });

            var container = $('#publicNewsList');
            container.empty();

            if (list.length === 0) {
                container.html(
                    '<div class="empty-state py-5">' +
                    '  <div class="empty-icon"><i class="fa-solid fa-newspaper" style="opacity:0.3; font-size:2.5rem;"></i></div>' +
                    '  <h4>Không có thông báo nào</h4>' +
                    '  <p>Hiện không tìm thấy bài viết hoặc thông báo phù hợp</p>' +
                    '</div>'
                );
                return;
            }

            list.forEach(function (n) {
                var author = MockDB.users.getById(n.nguoi_dang_user_id);
                var authorName = author ? author.ho_ten : 'Ban Quản trị';

                var itemHtml =
                    '<div class="news-item news-item-card" data-id="' + n.id + '" style="cursor:pointer;">' +
                    '  <div style="flex:1;">' +
                    '    <div class="d-flex align-center gap-2 mb-1">' +
                    '      <span class="badge badge-info">' + App.escapeHtml(n.danh_muc || 'Thông báo') + '</span>' +
                    '      <span class="text-gray" style="font-size:0.82rem;"><i class="fa-regular fa-calendar"></i> ' + App.formatDate(n.created_at) + '</span>' +
                    '    </div>' +
                    '    <h4 class="news-title">' + App.escapeHtml(n.tieu_de) + '</h4>' +
                    '    <p class="news-summary">' + App.escapeHtml(n.tom_tat || '') + '</p>' +
                    '    <div class="news-meta text-gray" style="font-size:0.82rem;">' +
                    '      <span><i class="fa-solid fa-user-pen"></i> ' + App.escapeHtml(authorName) + '</span>' +
                    '    </div>' +
                    '  </div>' +
                    '  <div>' +
                    '    <button class="btn btn-sm btn-outline-primary">Chi tiết <i class="fa-solid fa-arrow-right"></i></button>' +
                    '  </div>' +
                    '</div>';
                container.append(itemHtml);
            });
        },

        showNewsDetail: function (id) {
            var n = MockDB.tin_tuc.getById(id);
            if (!n) return;

            var author = MockDB.users.getById(n.nguoi_dang_user_id);
            var authorName = author ? author.ho_ten : 'Ban Quản trị';

            // Bảo vệ XSS: escape trước rồi mới thay thế xuống dòng thành <br>
            var contentHtml = App.escapeHtml(n.noi_dung || '').replace(/\n/g, '<br>');

            var modalHtml =
                '<div class="modal-header">' +
                '  <div>' +
                '    <span class="badge badge-primary mb-1">' + App.escapeHtml(n.danh_muc || 'Thông báo') + '</span>' +
                '    <h3 style="font-size:1.25rem; margin-top:4px;">' + App.escapeHtml(n.tieu_de) + '</h3>' +
                '    <div class="text-gray" style="font-size:0.82rem; margin-top:4px;">' +
                '      <span><i class="fa-regular fa-calendar"></i> ' + App.formatDateTime(n.created_at) + '</span> &nbsp;|&nbsp; ' +
                '      <span><i class="fa-solid fa-user-pen"></i> Đăng bởi: ' + App.escapeHtml(authorName) + '</span>' +
                '    </div>' +
                '  </div>' +
                '  <button class="modal-close" onclick="App.closeModal()">&times;</button>' +
                '</div>' +
                '<div class="modal-body">' +
                (n.tom_tat ? '  <div class="alert alert-info mb-3" style="font-weight:600; font-size:0.92rem; line-height:1.5;">' + App.escapeHtml(n.tom_tat) + '</div>' : '') +
                '  <div class="news-detail-content" style="font-size:0.95rem; line-height:1.8; color:var(--text-dark);">' + contentHtml + '</div>' +
                '</div>' +
                '<div class="modal-footer">' +
                '  <button class="btn btn-primary" onclick="App.closeModal()">Đóng</button>' +
                '</div>';

            App.showModal(modalHtml, 'lg');
        }
    };

    // ================================================================
    // Module Quản trị Tin Tức (Dành riêng cho Quản trị viên)
    // ================================================================
    var TinTucAdminModule = {
        render: function () {
            var currentUser = App.getCurrentUser();
            if (!currentUser || currentUser.vai_tro !== 'admin') {
                $('#contentArea').html('<div class="alert alert-danger"><i class="fa-solid fa-triangle-exclamation"></i> Chức năng này chỉ dành cho Quản trị viên</div>');
                return;
            }

            var html =
                '<div class="card">' +
                '  <div class="card-header">' +
                '    <h3><i class="fa-solid fa-newspaper"></i> Quản lý tin tức & bài viết</h3>' +
                '    <button class="btn btn-primary" id="btnThemTinTuc"><i class="fa-solid fa-plus"></i> Đăng bài mới</button>' +
                '  </div>' +
                '  <div class="card-body">' +
                '    <div class="toolbar">' +
                '      <div class="toolbar-left">' +
                '        <div class="search-box">' +
                '          <span class="search-icon"><i class="fa-solid fa-magnifying-glass"></i></span>' +
                '          <input type="text" id="searchNewsAdmin" placeholder="Tìm theo tiêu đề bài viết...">' +
                '        </div>' +
                '        <select id="filterTrangThaiNewsAdmin" class="filter-select">' +
                '          <option value="">Tất cả trạng thái</option>' +
                '          <option value="Công khai">Công khai</option>' +
                '          <option value="Đã ẩn">Đã ẩn</option>' +
                '          <option value="Bản nháp">Bản nháp</option>' +
                '        </select>' +
                '      </div>' +
                '      <div class="toolbar-right">' +
                '        <span class="text-gray" id="totalNewsAdminCount">Tổng: 0 bài viết</span>' +
                '      </div>' +
                '    </div>' +

                '    <div class="table-responsive">' +
                '      <table class="data-table">' +
                '        <thead>' +
                '          <tr>' +
                '            <th style="width:50px;">STT</th>' +
                '            <th>Tiêu đề</th>' +
                '            <th>Danh mục</th>' +
                '            <th>Người đăng</th>' +
                '            <th>Ngày tạo</th>' +
                '            <th class="text-center">Trạng thái</th>' +
                '            <th class="text-center" style="width:170px;">Thao tác</th>' +
                '          </tr>' +
                '        </thead>' +
                '        <tbody id="newsAdminTableBody"></tbody>' +
                '      </table>' +
                '    </div>' +
                '  </div>' +
                '</div>';

            $('#contentArea').html(html);
            this.bindEvents();
            this.loadAdminNews();
        },

        bindEvents: function () {
            var self = this;

            $('#searchNewsAdmin, #filterTrangThaiNewsAdmin').on('input change', function () {
                self.loadAdminNews();
            });

            $('#btnThemTinTuc').on('click', function () {
                self.showFormModal();
            });

            $(document).off('click', '.btn-edit-news').on('click', '.btn-edit-news', function () {
                var id = $(this).data('id');
                self.showFormModal(id);
            });

            $(document).off('click', '.btn-toggle-news-status').on('click', '.btn-toggle-news-status', function () {
                var id = $(this).data('id');
                self.toggleStatus(id);
            });

            $(document).off('click', '.btn-del-news').on('click', '.btn-del-news', function () {
                var id = $(this).data('id');
                self.deleteNews(id);
            });

            $(document).off('click', '#btnSaveNews').on('click', '#btnSaveNews', function () {
                self.saveNews();
            });
        },

        loadAdminNews: function () {
            var kw = ($('#searchNewsAdmin').val() || '').toLowerCase().trim();
            var st = $('#filterTrangThaiNewsAdmin').val();

            var list = MockDB.tin_tuc.getAll();

            if (st) {
                list = list.filter(function (n) {
                    if (st === 'Công khai') return n.trang_thai === 'Công khai' || n.trang_thai === 'cong_khai';
                    if (st === 'Đã ẩn') return n.trang_thai === 'Đã ẩn' || n.trang_thai === 'an';
                    if (st === 'Bản nháp') return n.trang_thai === 'Bản nháp' || n.trang_thai === 'nhap';
                    return n.trang_thai === st;
                });
            }

            if (kw) {
                list = list.filter(function (n) {
                    return (n.tieu_de && n.tieu_de.toLowerCase().indexOf(kw) !== -1);
                });
            }

            list.sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });

            $('#totalNewsAdminCount').text('Tổng: ' + list.length + ' bài viết');

            var tbody = $('#newsAdminTableBody');
            tbody.empty();

            if (list.length === 0) {
                tbody.html('<tr><td colspan="7" class="text-center text-gray py-4">Chưa có bài viết nào phù hợp</td></tr>');
                return;
            }

            list.forEach(function (n, idx) {
                var author = MockDB.users.getById(n.nguoi_dang_user_id);
                var authorName = author ? author.ho_ten : 'Admin';

                var isPublic = (n.trang_thai === 'Công khai' || n.trang_thai === 'cong_khai');
                var toggleBtnText = isPublic
                    ? '<i class="fa-solid fa-eye-slash"></i> Ẩn'
                    : '<i class="fa-solid fa-globe"></i> Đăng';

                var row =
                    '<tr>' +
                    '  <td class="text-center font-bold">' + (idx + 1) + '</td>' +
                    '  <td><strong>' + App.escapeHtml(n.tieu_de) + '</strong></td>' +
                    '  <td><span class="badge badge-info">' + App.escapeHtml(n.danh_muc || 'Chung') + '</span></td>' +
                    '  <td>' + App.escapeHtml(authorName) + '</td>' +
                    '  <td><small>' + App.formatDateTime(n.created_at) + '</small></td>' +
                    '  <td class="text-center">' + App.trangThaiTinTucBadge(n.trang_thai) + '</td>' +
                    '  <td class="text-center">' +
                    '    <div class="table-actions justify-center">' +
                    '      <button class="btn btn-sm btn-outline btn-toggle-news-status" data-id="' + n.id + '" title="Thay đổi trạng thái">' + toggleBtnText + '</button>' +
                    '      <button class="btn btn-sm btn-outline btn-edit-news" data-id="' + n.id + '" title="Chỉnh sửa"><i class="fa-solid fa-pen-to-square"></i></button>' +
                    '      <button class="btn btn-sm btn-outline btn-del-news text-danger" data-id="' + n.id + '" title="Xóa bài viết"><i class="fa-solid fa-trash-can"></i></button>' +
                    '    </div>' +
                    '  </td>' +
                    '</tr>';
                tbody.append(row);
            });
        },

        showFormModal: function (id) {
            var n = id ? MockDB.tin_tuc.getById(id) : null;
            var isEdit = !!n;

            var currentStatus = 'Công khai';
            if (n) {
                if (n.trang_thai === 'an' || n.trang_thai === 'Đã ẩn') currentStatus = 'Đã ẩn';
                else if (n.trang_thai === 'nhap' || n.trang_thai === 'Bản nháp') currentStatus = 'Bản nháp';
                else currentStatus = 'Công khai';
            }

            var html =
                '<div class="modal-header">' +
                '  <h3><i class="fa-solid fa-' + (isEdit ? 'pen-to-square' : 'newspaper') + '"></i> ' + (isEdit ? 'Chỉnh sửa tin tức' : 'Đăng tin tức mới') + '</h3>' +
                '  <button class="modal-close" onclick="App.closeModal()">&times;</button>' +
                '</div>' +
                '<div class="modal-body">' +
                '  <input type="hidden" id="newsId" value="' + (n ? n.id : '') + '">' +
                '  <div class="form-group">' +
                '    <label>Tiêu đề bài viết <span class="required">*</span></label>' +
                '    <input type="text" class="form-control" id="newsTieuDe" value="' + (n ? App.escapeHtml(n.tieu_de) : '') + '" placeholder="Nhập tiêu đề thông báo...">' +
                '  </div>' +
                '  <div class="form-row">' +
                '    <div class="form-group">' +
                '      <label>Danh mục</label>' +
                '      <select class="form-control" id="newsDanhMuc">' +
                '        <option value="Đào tạo" ' + (n && n.danh_muc === 'Đào tạo' ? 'selected' : '') + '>Đào tạo</option>' +
                '        <option value="Sự kiện" ' + (n && n.danh_muc === 'Sự kiện' ? 'selected' : '') + '>Sự kiện</option>' +
                '        <option value="Tuyển dụng" ' + (n && n.danh_muc === 'Tuyển dụng' ? 'selected' : '') + '>Tuyển dụng</option>' +
                '        <option value="Chung" ' + (n && n.danh_muc === 'Chung' ? 'selected' : '') + '>Chung</option>' +
                '      </select>' +
                '    </div>' +
                '    <div class="form-group">' +
                '      <label>Trạng thái hiển thị</label>' +
                '      <select class="form-control" id="newsTrangThai">' +
                '        <option value="Công khai" ' + (currentStatus === 'Công khai' ? 'selected' : '') + '>Công khai (Hiển thị ngay)</option>' +
                '        <option value="Đã ẩn" ' + (currentStatus === 'Đã ẩn' ? 'selected' : '') + '>Đã ẩn (Tạm ẩn khỏi sinh viên / giảng viên)</option>' +
                '        <option value="Bản nháp" ' + (currentStatus === 'Bản nháp' ? 'selected' : '') + '>Bản nháp</option>' +
                '      </select>' +
                '    </div>' +
                '  </div>' +
                '  <div class="form-group">' +
                '    <label>Tóm tắt ngắn</label>' +
                '    <textarea class="form-control" id="newsTomTat" rows="2" placeholder="Tóm tắt ngắn gọn nội dung thông báo...">' + (n ? App.escapeHtml(n.tom_tat || '') : '') + '</textarea>' +
                '  </div>' +
                '  <div class="form-group">' +
                '    <label>Nội dung chi tiết <span class="required">*</span></label>' +
                '    <textarea class="form-control" id="newsNoiDung" rows="7" placeholder="Nhập toàn văn nội dung thông báo...">' + (n ? App.escapeHtml(n.noi_dung || '') : '') + '</textarea>' +
                '  </div>' +
                '</div>' +
                '<div class="modal-footer">' +
                '  <button class="btn btn-outline" onclick="App.closeModal()">Hủy</button>' +
                '  <button class="btn btn-primary" id="btnSaveNews"><i class="fa-solid fa-floppy-disk"></i> Lưu tin tức</button>' +
                '</div>';

            App.showModal(modalHtml, 'lg');
        },

        saveNews: function () {
            var currentUser = App.getCurrentUser();
            var id = $('#newsId').val();
            var tieuDe = $('#newsTieuDe').val().trim();
            var danhMuc = $('#newsDanhMuc').val();
            var trangThai = $('#newsTrangThai').val();
            var tomTat = $('#newsTomTat').val().trim();
            var noiDung = $('#newsNoiDung').val().trim();

            if (!tieuDe) {
                App.showToast('Tiêu đề tin tức không được để trống!', 'error');
                return;
            }
            if (!noiDung) {
                App.showToast('Nội dung tin tức không được để trống!', 'error');
                return;
            }

            var nowStr = new Date().toISOString();

            if (id) {
                MockDB.tin_tuc.update(parseInt(id, 10), {
                    tieu_de: tieuDe,
                    danh_muc: danhMuc,
                    trang_thai: trangThai,
                    tom_tat: tomTat,
                    noi_dung: noiDung,
                    updated_at: nowStr
                });
                App.showToast('Cập nhật tin tức thành công!', 'success');
            } else {
                MockDB.tin_tuc.create({
                    tieu_de: tieuDe,
                    danh_muc: danhMuc,
                    trang_thai: trangThai,
                    tom_tat: tomTat,
                    noi_dung: noiDung,
                    nguoi_dang_user_id: currentUser.id,
                    created_at: nowStr,
                    updated_at: nowStr
                });
                App.showToast('Đăng tin tức mới thành công!', 'success');
            }

            App.closeModal();
            this.loadAdminNews();
        },

        toggleStatus: function (id) {
            var self = this;
            var n = MockDB.tin_tuc.getById(id);
            if (!n) return;

            var isCurrentlyPublic = (n.trang_thai === 'Công khai' || n.trang_thai === 'cong_khai');
            var newStatus = isCurrentlyPublic ? 'Đã ẩn' : 'Công khai';
            MockDB.tin_tuc.update(id, { trang_thai: newStatus });
            App.showToast('Đã đổi trạng thái sang: ' + newStatus, 'info');
            self.loadAdminNews();
        },

        deleteNews: function (id) {
            var self = this;
            var n = MockDB.tin_tuc.getById(id);
            if (!n) return;

            App.confirm('Bạn có chắc chắn muốn xóa tin tức <strong>' + App.escapeHtml(n.tieu_de) + '</strong>?', function () {
                MockDB.tin_tuc.remove(id);
                App.showToast('Đã xóa bài viết thành công!', 'success');
                self.loadAdminNews();
            });
        }
    };

    App.registerModule('tin-tuc', TinTucViewerModule);
    App.registerModule('tin-tuc-admin', TinTucAdminModule);
})(jQuery);
