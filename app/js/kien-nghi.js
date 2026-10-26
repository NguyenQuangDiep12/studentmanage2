/* ================================================================
   KIEN-NGHI.JS - Quản lý Kiến nghị & Phản hồi sinh viên
   ERD Tables: kien_nghi, phan_hoi_kien_nghi
   Font Awesome CDN Icons & Thiết kế Card hiện đại
   ================================================================ */

(function ($) {
    'use strict';

    var KienNghiModule = {
        render: function () {
            var currentUser = App.getCurrentUser();
            if (!currentUser) return;

            var role = currentUser.vai_tro;
            var isSv = (role === 'sinh_vien');

            var html =
                '<div class="card">' +
                '  <div class="card-header">' +
                '    <div>' +
                '      <h3><i class="fa-solid fa-comments"></i> Ý kiến & Kiến nghị sinh viên</h3>' +
                '      <p style="font-size:0.82rem; color:var(--text-muted); margin:0;">Tiếp nhận ý kiến đóng góp, thắc mắc và giải đáp cho người học</p>' +
                '    </div>' +
                (isSv ? '    <button class="btn btn-primary" id="btnThemKienNghi"><i class="fa-solid fa-plus"></i> Gửi ý kiến mới</button>' : '') +
                '  </div>' +
                '  <div class="card-body">' +
                '    <div class="toolbar">' +
                '      <div class="toolbar-left">' +
                '        <div class="search-box">' +
                '          <span class="search-icon"><i class="fa-solid fa-magnifying-glass"></i></span>' +
                '          <input type="text" id="searchKienNghi" placeholder="Tìm theo tiêu đề, nội dung ý kiến">' +
                '        </div>' +
                '        <select id="filterTrangThaiKN" class="filter-select">' +
                '          <option value="">Tất cả trạng thái</option>' +
                '          <option value="Chờ xử lý">Chờ xử lý</option>' +
                '          <option value="Đã phản hồi">Đã phản hồi</option>' +
                '        </select>' +
                '      </div>' +
                '      <div class="toolbar-right">' +
                '        <span class="text-gray" id="totalKNCount">Tổng: 0 ý kiến</span>' +
                '      </div>' +
                '    </div>' +

                '    <div class="table-responsive">' +
                '      <table class="data-table">' +
                '        <thead>' +
                '          <tr>' +
                '            <th style="width:50px;">STT</th>' +
                '            <th>Tiêu đề ý kiến</th>' +
                (!isSv ? '            <th>Sinh viên gửi</th>' : '') +
                '            <th>Thời gian gửi</th>' +
                '            <th class="text-center">Số phản hồi</th>' +
                '            <th class="text-center">Trạng thái</th>' +
                '            <th class="text-center" style="width:140px;">Thao tác</th>' +
                '          </tr>' +
                '        </thead>' +
                '        <tbody id="knTableBody"></tbody>' +
                '      </table>' +
                '    </div>' +
                '  </div>' +
                '</div>';

            $('#contentArea').html(html);
            this.bindEvents();
            this.loadKienNghi();
        },

        bindEvents: function () {
            var self = this;

            $('#searchKienNghi, #filterTrangThaiKN').on('input change', function () {
                self.loadKienNghi();
            });

            $('#btnThemKienNghi').on('click', function () {
                self.showSendModal();
            });

            $(document).off('click', '.btn-view-kn').on('click', '.btn-view-kn', function () {
                var id = $(this).data('id');
                self.showDetailModal(id);
            });

            $(document).off('click', '.btn-del-kn').on('click', '.btn-del-kn', function () {
                var id = $(this).data('id');
                self.deleteKienNghi(id);
            });

            $(document).off('click', '#btnSubmitKienNghi').on('click', '#btnSubmitKienNghi', function () {
                self.submitKienNghi();
            });

            $(document).off('click', '#btnSendPhanHoi').on('click', '#btnSendPhanHoi', function () {
                var knId = $(this).data('id');
                self.submitPhanHoi(knId);
            });
        },

        loadKienNghi: function () {
            var currentUser = App.getCurrentUser();
            var role = currentUser.vai_tro;
            var isSv = (role === 'sinh_vien');

            var self = this;
            Api.get('/api/kiennghi', {
                search: ($('#searchKienNghi').val() || '').trim(),
                trang_thai: $('#filterTrangThaiKN').val()
            })
                .done(function (res) {
                    self.cache = res.data || [];
                    self.renderList(self.cache, role, isSv);
                })
                .fail(Api.toastError);
        },

        renderList: function (list, role, isSv) {
            $('#totalKNCount').text('Tổng: ' + list.length + ' ý kiến');

            var tbody = $('#knTableBody');
            tbody.empty();

            var colSpan = isSv ? 6 : 7;

            if (list.length === 0) {
                tbody.html(
                    '<tr><td colspan="' + colSpan + '" class="text-center text-gray py-4">' +
                    '  <i class="fa-solid fa-inbox" style="font-size:1.6rem; opacity:0.3; display:block; margin-bottom:8px;"></i>' +
                    '  Không có ý kiến hoặc kiến nghị nào' +
                    '</td></tr>'
                );
                return;
            }

            list.forEach(function (k, idx) {
                var countReplies = k.so_phan_hoi || 0;
                var svName = k.ten_sinh_vien ? k.ten_sinh_vien + ' (' + k.ma_sinh_vien + ')' : 'Sinh viên';

                var statusBadge = (k.trang_thai === 'Đã phản hồi')
                    ? '<span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> Đã phản hồi</span>'
                    : '<span class="badge badge-warning"><i class="fa-solid fa-clock"></i> Chờ xử lý</span>';

                var row =
                    '<tr>' +
                    '  <td class="text-center font-bold">' + (idx + 1) + '</td>' +
                    '  <td><strong>' + App.escapeHtml(k.tieu_de) + '</strong></td>' +
                    (!isSv ? '  <td>' + App.escapeHtml(svName) + '</td>' : '') +
                    '  <td><small>' + App.formatDateTime(k.created_at) + '</small></td>' +
                    '  <td class="text-center"><span class="badge badge-info">' + countReplies + '</span></td>' +
                    '  <td class="text-center">' + statusBadge + '</td>' +
                    '  <td class="text-center">' +
                    '    <div class="table-actions justify-center">' +
                    '      <button class="btn btn-sm btn-outline btn-view-kn" data-id="' + k.id + '" title="Xem chi tiết & Phản hồi"><i class="fa-solid fa-comment-dots"></i> Chi tiết</button>' +
                    (role === 'admin' ? '      <button class="btn btn-sm btn-outline btn-del-kn text-danger" data-id="' + k.id + '" title="Xóa ý kiến">Xóa</button>' : '') +
                    '    </div>' +
                    '  </td>' +
                    '</tr>';
                tbody.append(row);
            });
        },

        showSendModal: function () {
            var html =
                '<div class="modal-header">' +
                '  <h3><i class="fa-solid fa-pen-nib"></i> Gửi ý kiến / kiến nghị</h3>' +
                '  <button class="modal-close" onclick="App.closeModal()">&times;</button>' +
                '</div>' +
                '<div class="modal-body">' +
                '  <div class="form-group">' +
                '    <label>Tiêu đề ý kiến <span class="required">*</span></label>' +
                '    <input type="text" class="form-control" id="knTieuDe" placeholder="Tóm tắt nội dung thắc mắc hoặc đề xuất">' +
                '  </div>' +
                '  <div class="form-group">' +
                '    <label>Nội dung chi tiết <span class="required">*</span></label>' +
                '    <textarea class="form-control" id="knNoiDung" rows="5" placeholder="Trình bày chi tiết lý do, hoàn cảnh và nguyện vọng của bạn"></textarea>' +
                '  </div>' +
                '</div>' +
                '<div class="modal-footer">' +
                '  <button class="btn btn-outline" onclick="App.closeModal()">Hủy</button>' +
                '  <button class="btn btn-primary" id="btnSubmitKienNghi"><i class="fa-solid fa-paper-plane"></i> Gửi ý kiến</button>' +
                '</div>';

            App.showModal(html, 'md');
        },

        submitKienNghi: function () {
            var self = this;
            // Kiểm tra dữ liệu do backend thực hiện
            Api.post('/api/kiennghi', { tieu_de: $('#knTieuDe').val(), noi_dung: $('#knNoiDung').val() })
                .done(function (res) {
                    App.showToast(res.message, 'success');
                    App.closeModal();
                    self.loadKienNghi();
                })
                .fail(Api.toastError);
        },

        showDetailModal: function (id) {
            var self = this;
            Api.get('/api/kiennghi/chi-tiet', { id: id })
                .done(function (res) { self.renderDetail(res.data); })
                .fail(Api.toastError);
        },

        renderDetail: function (k) {
            var currentUser = App.getCurrentUser();
            var role = currentUser.vai_tro;
            var canReply = (role === 'admin' || role === 'giang_vien');
            var svName = k.ten_sinh_vien ? k.ten_sinh_vien + ' (' + k.ma_sinh_vien + ')' : 'Sinh viên';
            var replies = k.phan_hoi || [];

            var repliesHtml = '';
            if (replies.length === 0) {
                repliesHtml = '<div class="alert alert-info py-2" style="font-size:0.88rem;"><i class="fa-solid fa-clock"></i> Chưa có phản hồi nào cho ý kiến này</div>';
            } else {
                replies.forEach(function (r) {
                    var replierName = r.ten_nguoi_phan_hoi
                        ? r.ten_nguoi_phan_hoi + ' (' + (r.vai_tro_nguoi_phan_hoi === 'admin' ? 'Quản trị viên' : 'Giảng viên') + ')'
                        : 'Phòng Đào tạo';
                    repliesHtml +=
                        '<div class="p-3 mb-2" style="background:#f8fafc; border-left:3px solid var(--primary); border-radius:4px;">' +
                        '  <div class="d-flex justify-between mb-1" style="font-size:0.82rem; color:var(--text-gray);">' +
                        '    <strong><i class="fa-solid fa-reply"></i> ' + App.escapeHtml(replierName) + '</strong>' +
                        '    <span>' + App.formatDateTime(r.created_at) + '</span>' +
                        '  </div>' +
                        '  <div style="font-size:0.92rem; line-height:1.6;">' + App.escapeHtml(r.noi_dung).replace(/\n/g, '<br>') + '</div>' +
                        '</div>';
                });
            }

            var replyFormHtml = '';
            if (canReply) {
                replyFormHtml =
                    '<div class="mt-3 pt-3" style="border-top:1px solid var(--border);">' +
                    '  <label class="font-bold mb-1 d-block"><i class="fa-solid fa-reply"></i> Nhập nội dung phản hồi / giải đáp:</label>' +
                    '  <textarea class="form-control mb-2" id="replyContent" rows="3" placeholder="Nhập câu trả lời chính thức cho sinh viên"></textarea>' +
                    '  <button class="btn btn-primary" id="btnSendPhanHoi" data-id="' + k.id + '"><i class="fa-solid fa-paper-plane"></i> Gửi phản hồi</button>' +
                    '</div>';
            }

            var modalHtml =
                '<div class="modal-header">' +
                '  <div>' +
                '    <h3 style="font-size:1.2rem; margin-bottom:4px;"><i class="fa-solid fa-comment-dots"></i> Chi tiết ý kiến sinh viên</h3>' +
                '    <span class="text-gray" style="font-size:0.82rem;"><i class="fa-solid fa-user"></i> Người gửi: ' + App.escapeHtml(svName) + ' &nbsp;|&nbsp; <i class="fa-regular fa-calendar"></i> ' + App.formatDateTime(k.created_at) + '</span>' +
                '  </div>' +
                '  <button class="modal-close" onclick="App.closeModal()">&times;</button>' +
                '</div>' +
                '<div class="modal-body">' +
                '  <div class="card mb-3" style="background:#f1f5f9; border:none;">' +
                '    <div class="card-body p-3">' +
                '      <h4 style="margin:0 0 8px 0; color:var(--primary);">' + App.escapeHtml(k.tieu_de) + '</h4>' +
                '      <div style="font-size:0.95rem; line-height:1.7;">' + App.escapeHtml(k.noi_dung).replace(/\n/g, '<br>') + '</div>' +
                '    </div>' +
                '  </div>' +
                '  <h4 class="mb-2"><i class="fa-solid fa-comments"></i> Các câu trả lời (' + replies.length + ')</h4>' +
                '  <div class="replies-list mb-2">' + repliesHtml + '</div>' +
                replyFormHtml +
                '</div>' +
                '<div class="modal-footer">' +
                '  <button class="btn btn-primary" onclick="App.closeModal()">Đóng</button>' +
                '</div>';

            App.showModal(modalHtml, 'lg');
        },

        submitPhanHoi: function (knId) {
            var self = this;
            Api.post('/api/kiennghi/phan-hoi', { kien_nghi_id: knId, noi_dung: $('#replyContent').val() })
                .done(function (res) {
                    App.showToast(res.message, 'success');
                    App.closeModal();
                    self.loadKienNghi();
                })
                .fail(Api.toastError);
        },

        deleteKienNghi: function (id) {
            var self = this;
            var k = (this.cache || []).find(function (x) { return x.id === parseInt(id, 10); });
            if (!k) return;

            App.confirm('Bạn có chắc muốn xóa ý kiến <strong>' + App.escapeHtml(k.tieu_de) + '</strong>?', function () {
                Api.del('/api/kiennghi', { id: k.id })
                    .done(function (res) {
                        App.showToast(res.message, 'success');
                        self.loadKienNghi();
                    })
                    .fail(Api.toastError);
            });
        }
    };

    App.registerModule('kien-nghi', KienNghiModule);
})(jQuery);
