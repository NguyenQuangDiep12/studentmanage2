/* ================================================================
   TIN-TUC.JS - Quản lý & Hiển thị Tin tức, Thông báo nhà trường
   Font Awesome CDN Icons & Thiết kế Card hiện đại
   Thống nhất trạng thái: 'Công khai', 'Bản nháp' (RULE-19)
   Bảo vệ XSS & Tương thích chuẩn API PHP Backend
   ================================================================ */

(function ($) {
    'use strict';

    // ================================================================
    // Module Tin Tức (Dành cho Sinh viên, Giảng viên & Quản trị viên xem)
    // ================================================================
    var TinTucViewerModule = {
        render: function () {
            var self = this;
            this.search = { query: '', field: 'all' };
            // Bố cục theo mã nguồn cũ (renderNewsSection - người xem): thẻ tin tức, thanh tìm kiếm, danh sách thẻ tin
            var html =
                '<section class="nd-scope">' +
                '  <div class="nd-card">' +
                OldUI.header('Tin tức và thông báo', 'Các thông báo mới nhất từ admin như nghỉ học, lịch học bù hoặc nội dung học vụ quan trọng.') +
                OldUI.toolbar('newsSearch', ['Tiêu đề', 'Phân loại', 'Ngày đăng'], 'Nhập từ khóa tin tức...') +
                '    <div class="nd-news-toolbar">' +
                '      <select id="filterDanhMucNews">' +
                '        <option value="">Tất cả phân loại</option>' +
                '        <option value="Đào tạo">Đào tạo</option>' +
                '        <option value="Sự kiện">Sự kiện</option>' +
                '        <option value="Tuyển dụng">Tuyển dụng</option>' +
                '        <option value="Chung">Chung</option>' +
                '      </select>' +
                '    </div>' +
                '    <div class="nd-news-list" id="publicNewsList"></div>' +
                '  </div>' +
                '</section>';
            $('#contentArea').html(html);
            OldUI.bind('newsSearch', function (q) { self.search = q; self.renderNews(); });
            $('#filterDanhMucNews').on('change', function () { self.loadNews(); });
            this.loadNews();
        },

        bindEvents: function () { /* sự kiện gắn trong render */ },

        loadNews: function () {
            var self = this;
            // RULE-20: backend chỉ trả về tin đã công khai
            Api.get('/api/tintuc', { search: '', danh_muc: $('#filterDanhMucNews').val() || '' })
                .done(function (res) { self.cache = res.data || []; self.renderNews(); })
                .fail(Api.toastError);
        },

        renderNews: function () {
            var esc = App.escapeHtml, q = this.search;
            var all = this.cache || [];
            var list = all.filter(function (n) { return OldUI.match([n.tieu_de, n.danh_muc, App.formatDateTime(n.created_at)], q); });
            OldUI.count('newsSearch', list.length, all.length, 'tin');
            var html = list.map(function (n) {
                var qt = parseInt(n.quan_trong, 10) === 1;
                return '<article class="nd-news-card">' +
                    '<div class="nd-news-top"><div class="nd-news-badges">' +
                    '<span class="nd-pill ' + (qt ? 'nd-pill-danger' : 'nd-pill-neutral') + '">' + (qt ? 'Quan trọng' : esc(n.danh_muc || 'Thông báo')) + '</span>' +
                    '<span class="nd-pill nd-pill-success">Đang hiển thị</span>' +
                    '</div><small class="nd-note">' + App.formatDateTime(n.created_at) + '</small></div>' +
                    '<h4>' + esc(n.tieu_de) + '</h4>' +
                    '<p class="nd-news-summary">' + esc(n.tom_tat || 'Không có mô tả ngắn.') + '</p>' +
                    '<div class="nd-news-content">' + esc(n.noi_dung || '') + '</div>' +
                    '<div class="nd-news-meta">Người đăng: ' + esc(n.ten_nguoi_dang || 'Admin hệ thống') + '</div>' +
                    '</article>';
            }).join('');
            $('#publicNewsList').html(html || '<p class="nd-empty" style="text-align:center;color:#94a3b8;">' +
                (q.query || $('#filterDanhMucNews').val() ? 'Không có tin tức nào khớp bộ lọc.' : 'Hiện chưa có tin tức nào để hiển thị.') + '</p>');
        },

        showNewsDetail: function (id) {
            var self = this;
            Api.get('/api/tintuc/chi-tiet', { id: id })
                .done(function (res) { self.renderNewsDetail(res.data); })
                .fail(Api.toastError);
        },

        renderNewsDetail: function (n) {
            var authorName = n.ten_nguoi_dang || 'Ban Quản trị';

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

            // Bố cục giống giao diện React: thẻ form (trái) + thẻ danh sách (phải)
            var html =
                '<section class="dashboard-grid two-columns">' +
                '<div id="newsFormSlot"></div>' +
                '<div class="card">' +
                '  <div class="card-header">' +
                '    <h3><i class="fa-solid fa-newspaper"></i> Quản lý tin tức & bài viết</h3>' +
                '  </div>' +
                '  <div class="card-body">' +
                '    <div class="toolbar">' +
                '      <div class="toolbar-left">' +
                '        <div class="search-box">' +
                '          <span class="search-icon"><i class="fa-solid fa-magnifying-glass"></i></span>' +
                '          <input type="text" id="searchNewsAdmin" placeholder="Tìm theo tiêu đề bài viết...">' +
                '        </div>' +
                '        <select id="filterDanhMucNewsAdmin" class="filter-select">' +
                '          <option value="">Tất cả danh mục</option>' +
                '          <option value="Đào tạo">Đào tạo</option>' +
                '          <option value="Sự kiện">Sự kiện</option>' +
                '          <option value="Tuyển dụng">Tuyển dụng</option>' +
                '          <option value="Chung">Chung</option>' +
                '        </select>' +
                '        <select id="filterTrangThaiNewsAdmin" class="filter-select">' +
                '          <option value="">Tất cả trạng thái</option>' +
                '          <option value="Công khai">Công khai</option>' +
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
                '</div>' +
                '</section>';

            $('#contentArea').html(html);
            this.bindEvents();
            this.showFormModal(); // form đăng bài mới hiện sẵn trên trang
            this.loadAdminNews();
        },

        bindEvents: function () {
            var self = this;

            $('#searchNewsAdmin, #filterDanhMucNewsAdmin, #filterTrangThaiNewsAdmin').on('input change', function () {
                self.loadAdminNews();
            });

            $('#btnThemTinTuc').on('click', function () {
                self.showFormModal();
            });

            $(document).off('click', '.btn-edit-news').on('click', '.btn-edit-news', function () {
                var id = $(this).data('id');
                self.showFormModal(id);
            });

            // Xem chi tiết tin (thay cho nút Chuyển nháp; đổi trạng thái thực hiện trong form Sửa)
            $(document).off('click', '.btn-view-news').on('click', '.btn-view-news', function () {
                self.showAdminDetail($(this).data('id'));
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
            var self = this;
            Api.get('/api/tintuc', {
                quan_ly: 1,
                search: ($('#searchNewsAdmin').val() || '').trim(),
                danh_muc: $('#filterDanhMucNewsAdmin').val(),
                trang_thai: $('#filterTrangThaiNewsAdmin').val()
            })
                .done(function (res) {
                    self.cache = res.data || [];
                    self.renderAdminNews(self.cache);
                })
                .fail(Api.toastError);
        },

        renderAdminNews: function (list) {
            $('#totalNewsAdminCount').text('Tổng: ' + list.length + ' bài viết');

            var tbody = $('#newsAdminTableBody');
            tbody.empty();

            if (list.length === 0) {
                tbody.html('<tr><td colspan="7" class="text-center text-gray py-4">Chưa có bài viết nào phù hợp</td></tr>');
                return;
            }

            list.forEach(function (n, idx) {
                var authorName = n.ten_nguoi_dang || 'Admin';


                var row =
                    '<tr>' +
                    '  <td class="text-center font-bold">' + (idx + 1) + '</td>' +
                    '  <td><strong>' + App.escapeHtml(n.tieu_de) + '</strong>' +
                    (parseInt(n.quan_trong, 10) === 1 ? ' <span class="badge badge-danger"><i class="fa-solid fa-thumbtack"></i> Quan trọng</span>' : '') + '</td>' +
                    '  <td><span class="badge badge-info">' + App.escapeHtml(n.danh_muc || 'Chung') + '</span></td>' +
                    '  <td>' + App.escapeHtml(authorName) + '</td>' +
                    '  <td><small>' + App.formatDateTime(n.created_at) + '</small></td>' +
                    '  <td class="text-center">' + App.trangThaiTinTucBadge(n.trang_thai) + '</td>' +
                    '  <td class="text-center">' +
                    '    <div class="table-actions justify-center">' +
                    '      <button class="btn btn-sm btn-outline btn-view-news" data-id="' + n.id + '" title="Xem chi tiết tin">Xem</button>' +
                    '      <button class="btn btn-sm btn-outline btn-edit-news" data-id="' + n.id + '" title="Chỉnh sửa">Sửa</button>' +
                    '      <button class="btn btn-sm btn-outline btn-del-news text-danger" data-id="' + n.id + '" title="Xóa bài viết">Xóa</button>' +
                    '    </div>' +
                    '  </td>' +
                    '</tr>';
                tbody.append(row);
            });
        },

        showFormModal: function (id) {
            var n = id ? this.findCached(id) : null;
            var isEdit = !!n;

            var currentStatus = 'Công khai';
            if (n) {
                currentStatus = (n.trang_thai === 'Công khai' || n.trang_thai === 'cong_khai') ? 'Công khai' : 'Bản nháp';
            }

            var html =
                '<div class="modal-header">' +
                '  <h3><i class="fa-solid fa-' + (isEdit ? 'pen-to-square' : 'newspaper') + '"></i> ' + (isEdit ? 'Chỉnh sửa tin tức' : 'Đăng bài mới') + '</h3>' +
                '  <button class="modal-close" onclick="App.closeModal()">&times;</button>' +
                '</div>' +
                '<div class="modal-body">' +
                '  <input type="hidden" id="newsId" value="' + (n ? n.id : '') + '">' +
                '  <div class="form-group">' +
                '    <label>Tiêu đề bài viết</label>' +
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
                '        <option value="Công khai" ' + (currentStatus === 'Công khai' ? 'selected' : '') + '>Công khai</option>' +
                '        <option value="Bản nháp" ' + (currentStatus === 'Bản nháp' ? 'selected' : '') + '>Bản nháp</option>' +
                '      </select>' +
                '    </div>' +
                '  </div>' +
                '  <div class="form-group">' +
                '    <label>Tóm tắt ngắn</label>' +
                '    <textarea class="form-control" id="newsTomTat" rows="2" placeholder="Tóm tắt ngắn gọn nội dung thông báo...">' + (n ? App.escapeHtml(n.tom_tat || '') : '') + '</textarea>' +
                '  </div>' +
                '  <div class="form-group">' +
                '    <label>Nội dung chi tiết</label>' +
                '    <textarea class="form-control" id="newsNoiDung" rows="7" placeholder="Nhập toàn văn nội dung thông báo...">' + (n ? App.escapeHtml(n.noi_dung || '') : '') + '</textarea>' +
                '  </div>' +
                '  <div class="form-group">' +
                '    <label class="checkbox-inline" style="display:flex; align-items:flex-start; gap:8px; font-weight:600; cursor:pointer;">' +
                '      <input type="checkbox" id="newsQuanTrong" style="margin-top:3px; flex-shrink:0;" ' + (n && parseInt(n.quan_trong, 10) === 1 ? 'checked' : '') + '>' +
                '      <span>Đánh dấu là tin quan trọng (luôn hiển thị đầu danh sách)</span>' +
                '    </label>' +
                '  </div>' +
                '</div>' +
                '<div class="modal-footer">' +
                '  <button class="btn btn-outline" onclick="App.closeModal()">Hủy</button>' +
                '  <button class="btn btn-primary" id="btnSaveNews"><i class="fa-solid fa-floppy-disk"></i> Lưu tin tức</button>' +
                '</div>';

            var self = this;
            App.showInlineForm(html, '#newsFormSlot', function () { self.showFormModal(); });
            $('#newsFormSlot .inline-form-card').toggleClass('is-editing', isEdit);
            if (isEdit) App.focusInlineForm('#newsFormSlot');
        },

        findCached: function (id) {
            return (this.cache || []).find(function (n) { return n.id === parseInt(id, 10); }) || null;
        },

        /** Chi tiết tin cho quản trị viên: mỗi trường có nhãn rõ ràng */
        showAdminDetail: function (id) {
            Api.get('/api/tintuc/chi-tiet', { id: id })
                .done(function (res) {
                    var n = res.data || {};
                    var item = function (label, value, full) {
                        return '<div class="detail-item"' + (full ? ' style="grid-column:1 / -1;"' : '') + '>' +
                            '<span class="detail-label">' + label + '</span>' +
                            '<div class="detail-value" style="white-space:pre-wrap; word-break:break-word;">' + value + '</div></div>';
                    };
                    var esc = function (v) { return v ? App.escapeHtml(v) : '—'; };
                    var html =
                        '<div class="modal-header">' +
                        '  <h3>Chi tiết tin tức</h3>' +
                        '  <button class="modal-close" onclick="App.closeModal()">&times;</button>' +
                        '</div>' +
                        '<div class="modal-body">' +
                        '  <div class="detail-grid" style="grid-template-columns:repeat(2, minmax(0, 1fr));">' +
                        item('Tiêu đề bài viết', esc(n.tieu_de), true) +
                        item('Danh mục', esc(n.danh_muc)) +
                        item('Trạng thái hiển thị', App.trangThaiTinTucBadge(n.trang_thai)) +
                        item('Tin quan trọng', parseInt(n.quan_trong, 10) === 1 ? 'Có' : 'Không') +
                        item('Người đăng', esc(n.ten_nguoi_dang)) +
                        item('Ngày tạo', n.created_at ? App.formatDateTime(n.created_at) : '—') +
                        item('Ngày cập nhật', n.updated_at ? App.formatDateTime(n.updated_at) : '—') +
                        item('Tóm tắt ngắn', esc(n.tom_tat), true) +
                        item('Nội dung chi tiết', esc(n.noi_dung), true) +
                        '  </div>' +
                        '</div>' +
                        '<div class="modal-footer">' +
                        '  <button class="btn btn-primary" onclick="App.closeModal()">Đóng</button>' +
                        '</div>';
                    App.showModal(html, 'lg');
                })
                .fail(Api.toastError);
        },

        saveNews: function () {
            var self = this;
            var id = $('#newsId').val();
            var payload = {
                tieu_de: $('#newsTieuDe').val(),
                danh_muc: $('#newsDanhMuc').val(),
                trang_thai: $('#newsTrangThai').val(),
                quan_trong: $('#newsQuanTrong').is(':checked') ? 1 : 0,
                tom_tat: $('#newsTomTat').val(),
                noi_dung: $('#newsNoiDung').val()
            };

            // RULE-19.3: trường bắt buộc do backend kiểm tra
            var req = id
                ? Api.put('/api/tintuc', $.extend({ id: parseInt(id, 10) }, payload))
                : Api.post('/api/tintuc', payload);

            req.done(function (res) {
                App.showToast(res.message, 'success');
                self.showFormModal(); // đưa form về trạng thái đăng bài mới
                self.loadAdminNews();
            }).fail(Api.toastError);
        },

        toggleStatus: function (id) {
            var self = this;
            var n = this.findCached(id);
            if (!n) return;

            var newStatus = n.trang_thai === 'Công khai' ? 'Bản nháp' : 'Công khai';
            Api.post('/api/tintuc/trang-thai', { id: n.id, trang_thai: newStatus })
                .done(function (res) {
                    App.showToast(res.message, 'info');
                    self.loadAdminNews();
                })
                .fail(Api.toastError);
        },

        deleteNews: function (id) {
            var self = this;
            var n = this.findCached(id);
            if (!n) return;

            App.confirm('Bạn có chắc chắn muốn xóa tin tức <strong>' + App.escapeHtml(n.tieu_de) + '</strong>?', function () {
                Api.del('/api/tintuc', { id: n.id })
                    .done(function (res) {
                        App.showToast(res.message, 'success');
                        self.loadAdminNews();
                    })
                    .fail(Api.toastError);
            });
        }
    };

    App.registerModule('tin-tuc', TinTucViewerModule);
    App.registerModule('tin-tuc-admin', TinTucAdminModule);
})(jQuery);
