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
            var self = this;
            this.isSv = currentUser.vai_tro === 'sinh_vien';
            this.role = currentUser.vai_tro;
            this.search = { query: '', field: 'all' };
            var html;

            if (this.isSv) {
                // Bố cục theo mã nguồn cũ (renderFeedbackSection - sinh viên): form gửi (trái) + lịch sử (phải)
                html =
                    '<section class="nd-scope nd-two">' +
                    '  <div class="nd-card">' +
                    OldUI.header('Gửi ý kiến tới admin', 'Gửi thắc mắc, kiến nghị hoặc góp ý trực tiếp cho quản trị viên.') +
                    '    <form class="nd-grid-form" id="knForm" autocomplete="off">' +
                    '      <input id="knTieuDe" class="nd-full" placeholder="Tiêu đề ý kiến">' +
                    '      <textarea id="knNoiDung" class="nd-full" rows="6" placeholder="Nhập nội dung chi tiết..."></textarea>' +
                    '      <div class="nd-form-actions"><button class="nd-btn nd-btn-primary" type="submit">Gửi ý kiến</button></div>' +
                    '    </form>' +
                    '  </div>' +
                    '  <div class="nd-card">' +
                    OldUI.header('Lịch sử ý kiến đã gửi', 'Theo dõi phản hồi từ admin.') +
                    '    <div class="nd-table-wrap"><table class="nd-table">' +
                    '      <thead><tr><th>Tiêu đề</th><th>Nội dung</th><th>Phản hồi admin</th></tr></thead>' +
                    '      <tbody id="knTableBody"><tr><td colspan="3" class="nd-empty">Đang tải...</td></tr></tbody>' +
                    '    </table></div>' +
                    '  </div>' +
                    '</section>';
            } else {
                // Bố cục theo mã nguồn cũ (renderFeedbackSection - admin): danh sách (trái) + khung phản hồi (phải)
                html =
                    '<section class="nd-scope nd-two">' +
                    '  <div class="nd-card">' +
                    OldUI.header('Danh sách ý kiến sinh viên', 'Admin có thể xem trực tiếp và phản hồi ngay trong hệ thống.') +
                    OldUI.toolbar('knSearch', ['Tiêu đề', 'Nội dung', 'Sinh viên', 'Mã SV'], 'Nhập từ khóa ý kiến...') +
                    '    <div class="nd-table-wrap"><table class="nd-table">' +
                    '      <thead><tr><th>Sinh viên</th><th>Tiêu đề</th><th>Nội dung</th><th>Phản hồi</th><th>Thao tác</th></tr></thead>' +
                    '      <tbody id="knTableBody"><tr><td colspan="5" class="nd-empty">Đang tải...</td></tr></tbody>' +
                    '    </table></div>' +
                    '  </div>' +
                    '  <div class="nd-card" id="knReplyCard"></div>' +
                    '</section>';
            }

            $('#contentArea').html(html);
            if (!this.isSv) {
                OldUI.bind('knSearch', function (q) { self.search = q; self.renderList(); });
                this.renderReplyPanel(null);
            }
            $('#knForm').on('submit', function (e) { e.preventDefault(); self.submitKienNghi(); });
            $('#knTableBody').on('click', '.btn-view-kn', function () { self.showDetailModal($(this).data('id')); });
            $('#knTableBody').on('click', '.btn-reply-kn', function () { self.selectForReply($(this).data('id')); });
            $('#knTableBody').on('click', '.btn-del-kn', function () { self.deleteKienNghi($(this).data('id')); });
            this.loadKienNghi();
        },

        bindEvents: function () { /* sự kiện gắn trong render */ },

        loadKienNghi: function () {
            var self = this;
            Api.get('/api/kiennghi', { search: '', trang_thai: '' })
                .done(function (res) {
                    self.cache = res.data || [];
                    self.renderList();
                })
                .fail(Api.toastError);
        },

        renderList: function () {
            var esc = App.escapeHtml, self = this, q = this.search;
            var all = this.cache || [];
            var nl = function (t) { return esc(t || '').replace(/\n/g, '<br>'); };
            var phanHoi = function (k, chua) {
                var n = parseInt(k.so_phan_hoi, 10) || 0;
                return n > 0
                    ? '<span class="nd-pill nd-pill-success">Đã phản hồi (' + n + ')</span> <button type="button" class="nd-btn nd-btn-light nd-btn-sm btn-view-kn" data-id="' + k.id + '">Xem</button>'
                    : chua;
            };
            var html;
            if (this.isSv) {
                html = all.map(function (k) {
                    return '<tr><td>' + esc(k.tieu_de) + '</td><td>' + nl(k.noi_dung) + '</td><td>' + phanHoi(k, 'Chưa có phản hồi') + '</td></tr>';
                }).join('');
                $('#knTableBody').html(html || '<tr><td colspan="3" class="nd-empty">Bạn chưa gửi ý kiến nào.</td></tr>');
                return;
            }
            var list = all.filter(function (k) { return OldUI.match([k.tieu_de, k.noi_dung, k.ten_sinh_vien, k.ma_sinh_vien], q); });
            OldUI.count('knSearch', list.length, all.length, 'ý kiến');
            $('#knTotal').text(all.length);
            html = list.map(function (k) {
                return '<tr>' +
                    '<td><div>' + esc(k.ten_sinh_vien || 'Sinh viên') + '</div><small>' + esc(k.ma_sinh_vien || '') + ' · ' + App.formatDateTime(k.created_at) + '</small></td>' +
                    '<td>' + esc(k.tieu_de) + '</td>' +
                    '<td>' + nl(k.noi_dung) + '</td>' +
                    '<td>' + phanHoi(k, 'Chưa phản hồi') + '</td>' +
                    '<td><div class="nd-actions">' +
                    '<button type="button" class="nd-btn nd-btn-warning btn-reply-kn" data-id="' + k.id + '">Phản hồi</button>' +
                    (self.role === 'admin' ? '<button type="button" class="nd-btn nd-btn-danger btn-del-kn" data-id="' + k.id + '">Xóa</button>' : '') +
                    '</div></td>' +
                    '</tr>';
            }).join('');
            $('#knTableBody').html(html || '<tr><td colspan="5" class="nd-empty">Chưa có ý kiến nào từ sinh viên.</td></tr>');
        },

        /** Khung phản hồi bên phải (theo mã cũ): chưa chọn thì hiện tổng ý kiến */
        renderReplyPanel: function (k) {
            var self = this, esc = App.escapeHtml;
            var $c = $('#knReplyCard');
            if (!k) {
                $c.html(OldUI.header('Chọn một ý kiến để phản hồi', 'Nhấn nút Phản hồi ở bảng bên trái để xử lý.') +
                    '<div><strong>Tổng ý kiến:</strong> <span id="knTotal">' + (this.cache || []).length + '</span></div>');
                return;
            }
            var replies = (k.phan_hoi || []).map(function (r) {
                return '<div class="nd-note" style="border-left:3px solid #2563eb; padding:6px 10px; margin-bottom:8px; background:#f8fbff; border-radius:8px;">' +
                    '<strong>' + esc(r.ten_nguoi_phan_hoi || 'Phòng Đào tạo') + '</strong> · ' + App.formatDateTime(r.created_at) +
                    '<div style="color:#1e293b;">' + esc(r.noi_dung).replace(/\n/g, '<br>') + '</div></div>';
            }).join('');
            $c.html(OldUI.header('Phản hồi ý kiến', 'Trả lời trực tiếp cho sinh viên.') +
                '<form class="nd-grid-form" id="knReplyForm">' +
                '  <input class="nd-full" value="' + esc(k.tieu_de) + '" disabled>' +
                (replies ? '<div class="nd-full">' + replies + '</div>' : '') +
                '  <textarea id="replyContent" class="nd-full" rows="8" placeholder="Nhập phản hồi của admin..."></textarea>' +
                '  <div class="nd-form-actions">' +
                '    <button class="nd-btn nd-btn-primary" type="submit">Lưu phản hồi</button>' +
                '    <button class="nd-btn nd-btn-light" type="button" id="knReplyCancel">Hủy</button>' +
                '  </div>' +
                '</form>');
            $('#knReplyForm').on('submit', function (e) { e.preventDefault(); self.submitPhanHoi(k.id); });
            $('#knReplyCancel').on('click', function () { self.renderReplyPanel(null); });
            var top = $c.offset();
            if (top && $(window).width() < 1024) $('html, body').animate({ scrollTop: Math.max(top.top - 100, 0) }, 200);
        },

        selectForReply: function (id) {
            var self = this;
            Api.get('/api/kiennghi/chi-tiet', { id: id })
                .done(function (res) { self.renderReplyPanel(res.data); })
                .fail(Api.toastError);
        },

        submitKienNghi: function () {
            var self = this;
            // Kiểm tra dữ liệu do backend thực hiện
            Api.post('/api/kiennghi', { tieu_de: $('#knTieuDe').val(), noi_dung: $('#knNoiDung').val() })
                .done(function (res) {
                    App.showToast(res.message, 'success');
                    $('#knTieuDe, #knNoiDung').val('');
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
            var canReply = false; // phản hồi thực hiện ở khung "Phản hồi ý kiến" bên phải (bố cục mã cũ)
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
                    if (!self.isSv) self.renderReplyPanel(null);
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
