/* ================================================================
   MON-HOC.JS - Quản lý môn học
   Thêm, sửa, xóa, tìm kiếm môn học, kiểm tra ràng buộc toàn vẹn
   Font Awesome icons, XSS protection, phân quyền chuẩn
   ================================================================ */

(function ($) {
    'use strict';

    var MonHocModule = {
        render: function () {
            var self = this;
            var currentUser = App.getCurrentUser();
            // Quản trị viên: thêm / sửa / xóa. Giảng viên: được thêm môn học và tra cứu (backend kiểm tra quyền).
            this.isAdmin = currentUser && currentUser.vai_tro === 'admin';
            // RULE-MH-04: quản trị viên và giảng viên được sửa / xóa môn học
            this.canEdit = currentUser && (currentUser.vai_tro === 'admin' || currentUser.vai_tro === 'giang_vien');
            this.canCreate = currentUser && (currentUser.vai_tro === 'admin' || currentUser.vai_tro === 'giang_vien');
            this.search = { query: '', field: 'all' };

            // Bố cục theo mã nguồn cũ (renderCoursesSection + CourseForm): form (trái) + danh sách (phải)
            var html =
                '<section class="nd-scope' + (this.canCreate ? ' nd-two' : '') + '">' +
                (this.canCreate ? '<div class="nd-card" id="mhFormCard"></div>' : '') +
                '  <div class="nd-card">' +
                OldUI.header('Danh sách môn học', 'Tạo môn học trước, sau đó mở lớp học phần để sinh viên đăng ký.') +
                OldUI.toolbar('mhSearch', ['Mã môn', 'Tên môn'], 'Nhập từ khóa môn học...') +
                '    <div class="nd-table-wrap"><table class="nd-table">' +
                '      <thead><tr><th>Mã môn</th><th>Tên môn</th><th>Tín chỉ</th><th>Số tiết</th>' + (this.canEdit ? '<th>Thao tác</th>' : '') + '</tr></thead>' +
                '      <tbody id="monHocTableBody"><tr><td colspan="5" class="nd-empty">Đang tải...</td></tr></tbody>' +
                '    </table></div>' +
                '  </div>' +
                '</section>';

            $('#contentArea').html(html);
            OldUI.bind('mhSearch', function (q) { self.search = q; self.renderRows(); });
            $('#monHocTableBody').on('click', '.btn-edit-mh', function () { self.showForm($(this).data('id')); });
            $('#monHocTableBody').on('click', '.btn-del-mh', function () { self.deleteMonHoc($(this).data('id')); });
            if (this.canCreate) this.showForm();
            this.loadData();
        },

        loadData: function () {
            var self = this;
            Api.get('/api/monhoc', { search: '' })
                .done(function (res) {
                    self.cache = res.data || [];
                    self.quyDoi = res.quy_doi || self.quyDoi;
                    self.renderRows();
                    if (self.canCreate && !$('#mhId').val()) self.updateHint();
                })
                .fail(Api.toastError);
        },

        renderRows: function () {
            var self = this, esc = App.escapeHtml, q = this.search;
            var all = this.cache || [];
            var list = all.filter(function (mh) { return OldUI.match([mh.ma_mon_hoc, mh.ten_mon_hoc], q); });
            OldUI.count('mhSearch', list.length, all.length, 'môn học');
            var html = list.map(function (mh) {
                var tiet = (mh.so_tiet_ly_thuyet == null || mh.so_tiet_thuc_hanh == null)
                    ? (mh.so_tiet || '—') + '<small class="d-block">Chưa khai báo LT/TH</small>'
                    : (mh.so_tiet || '—') + '<small class="d-block">LT ' + mh.so_tiet_ly_thuyet + ' · TH ' + mh.so_tiet_thuc_hanh + '</small>';
                return '<tr>' +
                    '<td>' + esc(mh.ma_mon_hoc) + '</td>' +
                    '<td>' + esc(mh.ten_mon_hoc) + (mh.mo_ta ? '<small class="d-block">' + esc(mh.mo_ta) + '</small>' : '') + '</td>' +
                    '<td>' + mh.so_tin_chi + '<small class="d-block">' + MonHocModule.loaiTinChi(mh) + '</small></td>' +
                    '<td>' + tiet + '</td>' +
                    (self.canEdit ? '<td><div class="nd-actions">' +
                        '<button type="button" class="nd-btn nd-btn-warning btn-edit-mh" data-id="' + mh.id + '">Sửa</button>' +
                        '<button type="button" class="nd-btn nd-btn-danger btn-del-mh" data-id="' + mh.id + '">Xóa</button>' +
                        '</div></td>' : '') +
                    '</tr>';
            }).join('');
            $('#monHocTableBody').html(html || '<tr><td colspan="5" class="nd-empty">Chưa có môn học nào.</td></tr>');
        },

        /** Form theo CourseForm cũ: ô nhập dạng placeholder, nút "Tạo môn học" / "Lưu môn học" + "Hủy sửa" */
        showForm: function (id) {
            var self = this, esc = App.escapeHtml;
            var mh = id ? (this.cache || []).find(function (m) { return m.id === parseInt(id, 10); }) : null;
            var v = function (x) { return x != null ? x : ''; };
            var html =
                OldUI.header(mh ? 'Cập nhật môn học' : 'Tạo môn học mới', 'Giảng viên có thể tự nhập mã môn và tên môn thay vì chỉ chọn các môn có sẵn.') +
                '<form class="nd-grid-form" id="mhForm" autocomplete="off">' +
                '  <input type="hidden" id="mhId" value="' + (mh ? mh.id : '') + '">' +
                '  <input id="mhMa" placeholder="Mã môn học, ví dụ INT301" value="' + (mh ? esc(mh.ma_mon_hoc) : '') + '"' + (mh ? ' readonly' : '') + '>' +
                '  <input id="mhTen" placeholder="Tên môn học" value="' + (mh ? esc(mh.ten_mon_hoc) : '') + '">' +
                // RULE-MH-01: chỉ nhập số tín chỉ lý thuyết / thực hành; số tiết do hệ thống tính (RULE-CREDIT-08)
                '  <input type="number" min="0" class="mh-tc" id="mhTcLT" placeholder="Số tín chỉ lý thuyết" value="' + (mh ? v(mh.so_tin_chi_ly_thuyet) : '') + '">' +
                '  <input type="number" min="0" class="mh-tc" id="mhTcTH" placeholder="Số tín chỉ thực hành" value="' + (mh ? v(mh.so_tin_chi_thuc_hanh) : '') + '">' +
                '  <textarea id="mhMoTa" class="nd-full" placeholder="Mô tả môn học">' + (mh ? esc(mh.mo_ta || '') : '') + '</textarea>' +
                '  <div class="nd-form-actions">' +
                '    <button class="nd-btn nd-btn-primary" type="submit">' + (mh ? 'Lưu môn học' : 'Tạo môn học') + '</button>' +
                (mh ? '    <button class="nd-btn nd-btn-light" type="button" id="mhCancel">Hủy sửa</button>' : '') +
                '  </div>' +
                '</form>' +
                '<div id="mhTietHint" class="mt-3"></div>';
            $('#mhFormCard').html(html);
            $('#mhForm').on('submit', function (e) { e.preventDefault(); self.saveMonHoc(); });
            $('#mhCancel').on('click', function () { self.showForm(); });
            $('.mh-tc').on('input', function () { self.updateHint(); });
            this.updateHint();
            if (mh) {
                var top = $('#mhFormCard').offset();
                if (top) $('html, body').animate({ scrollTop: Math.max(top.top - 120, 0) }, 200);
            }
        },
        showFormModal: function (id) { this.showForm(id); },

        // RULE-CREDIT-08, RULE-CREDIT-09: hiển thị từng bước quy đổi (số liệu từ backend; backend tự tính lại khi lưu)
        updateHint: function () {
            var q = this.quyDoi, $h = $('#mhTietHint');
            if (!$h.length) return;
            if (!q) { $h.empty(); return; }
            var lt = $('#mhTcLT').val(), th = $('#mhTcTH').val();
            var base = MonHocModule.quyDoiGiaiThich(q);
            if (lt === '' && th === '') { $h.html('<p class="nd-note">Nhập số tín chỉ lý thuyết và thực hành để xem cách tính số tiết.</p>' + base); return; }
            if (lt === '' || th === '') { $h.html('<p class="nd-note">Cần nhập đủ cả hai loại tín chỉ (nhập 0 cho loại không có).</p>' + base); return; }
            $h.html(MonHocModule.quyDoiMon(q, parseInt(lt, 10) || 0, parseInt(th, 10) || 0) + base);
        },

        fmt: function (n) { return Number(n).toLocaleString('vi-VN'); },

        /** Bảng tính số tiết của môn đang nhập: đầu vào → phép tính → đơn vị → kết quả (RULE-CREDIT-08) */
        quyDoiMon: function (q, a, b) {
            var f = this.fmt;
            var gioLt = a * q.gio_moi_tc_ly_thuyet, phutLt = gioLt * q.phut_moi_gio, tietLt = phutLt / q.phut_moi_tiet;
            var gioTh = b * q.gio_moi_tc_thuc_hanh, phutTh = gioTh * q.phut_moi_gio, tietTh = phutTh / q.phut_moi_tiet;
            var row = function (buoc, phep, kq) {
                return '<tr><td>' + buoc + '</td><td>' + phep + '</td><td class="text-right"><strong>' + kq + '</strong></td></tr>';
            };
            return '<div class="mb-2" style="font-size:0.84rem;">' +
                '<div class="mb-1"><strong>Loại môn:</strong> ' + this.loaiTinChi({ so_tin_chi_ly_thuyet: a, so_tin_chi_thuc_hanh: b }) +
                ' · <strong>Tổng số tín chỉ</strong> = ' + a + ' (LT) + ' + b + ' (TH) = <strong>' + (a + b) + ' tín chỉ</strong></div>' +
                '<table class="data-table"><thead><tr><th>Bước</th><th>Phép tính</th><th class="text-right">Kết quả</th></tr></thead><tbody>' +
                '<tr><td colspan="3"><strong>Lý thuyết (' + a + ' tín chỉ)</strong></td></tr>' +
                row('1. Đổi tín chỉ sang giờ trên lớp', a + ' tín chỉ × ' + q.gio_moi_tc_ly_thuyet + ' giờ/tín chỉ', f(gioLt) + ' giờ') +
                row('2. Đổi giờ sang phút', f(gioLt) + ' giờ × ' + q.phut_moi_gio + ' phút/giờ', f(phutLt) + ' phút') +
                row('3. Đổi phút sang tiết', f(phutLt) + ' phút ÷ ' + q.phut_moi_tiet + ' phút/tiết', f(tietLt) + ' tiết') +
                '<tr><td colspan="3"><strong>Thực hành (' + b + ' tín chỉ)</strong></td></tr>' +
                row('1. Đổi tín chỉ sang giờ trên lớp', b + ' tín chỉ × ' + q.gio_moi_tc_thuc_hanh + ' giờ/tín chỉ', f(gioTh) + ' giờ') +
                row('2. Đổi giờ sang phút', f(gioTh) + ' giờ × ' + q.phut_moi_gio + ' phút/giờ', f(phutTh) + ' phút') +
                row('3. Đổi phút sang tiết', f(phutTh) + ' phút ÷ ' + q.phut_moi_tiet + ' phút/tiết', f(tietTh) + ' tiết') +
                '<tr><td colspan="3"><strong>Tổng</strong></td></tr>' +
                row('Tổng số tiết xếp thời khóa biểu', f(tietLt) + ' tiết LT + ' + f(tietTh) + ' tiết TH', f(tietLt + tietTh) + ' tiết') +
                '</tbody></table>' +
                '<div class="text-muted mt-1">Tổng số tiết là thời lượng học trên lớp đã đổi thành các tiết ' + q.phut_moi_tiet + ' phút; không gồm thời gian tự học.</div></div>';
        },

        /** Căn cứ quy đổi (mở rộng / thu gọn): quy định của trường, ảnh minh họa và 3 ví dụ */
        quyDoiGiaiThich: function (q) {
            var f = this.fmt;
            var vd = function (ten, a, b) {
                var lt = a * q.gio_moi_tc_ly_thuyet * q.phut_moi_gio / q.phut_moi_tiet;
                var th = b * q.gio_moi_tc_thuc_hanh * q.phut_moi_gio / q.phut_moi_tiet;
                return '<li><strong>' + ten + '</strong> (' + a + ' TC lý thuyết, ' + b + ' TC thực hành): ' +
                    'tổng tín chỉ ' + a + ' + ' + b + ' = ' + (a + b) + '; ' +
                    'lý thuyết ' + a + ' × ' + q.gio_moi_tc_ly_thuyet + ' = ' + f(a * q.gio_moi_tc_ly_thuyet) + ' giờ = ' + f(a * q.gio_moi_tc_ly_thuyet * q.phut_moi_gio) + ' phút = ' + f(lt) + ' tiết; ' +
                    'thực hành ' + b + ' × ' + q.gio_moi_tc_thuc_hanh + ' = ' + f(b * q.gio_moi_tc_thuc_hanh) + ' giờ = ' + f(b * q.gio_moi_tc_thuc_hanh * q.phut_moi_gio) + ' phút = ' + f(th) + ' tiết; ' +
                    'tổng ' + f(lt) + ' + ' + f(th) + ' = <strong>' + f(lt + th) + ' tiết</strong>.</li>';
            };
            var tLt = q.tiet_moi_tc_ly_thuyet, tTh = q.tiet_moi_tc_thuc_hanh;
            return '<details class="mb-2" style="font-size:0.84rem; border:1px solid var(--border-color); border-radius:8px; padding:8px 12px;">' +
                '<summary style="cursor:pointer;"><strong>Căn cứ và cách quy đổi tín chỉ sang số tiết</strong> (bấm để xem)</summary>' +
                '<ul class="mt-2">' +
                '<li>1 tín chỉ lý thuyết = ' + q.gio_moi_tc_ly_thuyet + ' giờ học trên lớp = ' + tLt + ' tiết học ' + q.phut_moi_tiet + ' phút.</li>' +
                '<li>1 tín chỉ thực hành = ' + q.gio_moi_tc_thuc_hanh + ' giờ học trên lớp = ' + tTh + ' tiết học ' + q.phut_moi_tiet + ' phút.</li>' +
                '<li>1 giờ = ' + q.phut_moi_gio + ' phút; 1 tiết học = ' + q.phut_moi_tiet + ' phút.</li>' +
                '<li>Thời gian tự học không được tính vào tổng số tiết xếp thời khóa biểu.</li></ul>' +
                '<p class="mb-1"><strong>Lý thuyết:</strong> ' + q.gio_moi_tc_ly_thuyet + ' giờ là tổng thời lượng học trên lớp của 1 tín chỉ (không phải ' + q.gio_moi_tc_ly_thuyet + ' tiết). ' +
                'Nhân ' + q.phut_moi_gio + ' để đổi giờ sang phút: ' + q.gio_moi_tc_ly_thuyet + ' × ' + q.phut_moi_gio + ' = ' + f(q.gio_moi_tc_ly_thuyet * q.phut_moi_gio) + ' phút. ' +
                'Chia ' + q.phut_moi_tiet + ' để biết bao nhiêu tiết: ' + f(q.gio_moi_tc_ly_thuyet * q.phut_moi_gio) + ' ÷ ' + q.phut_moi_tiet + ' = ' + tLt + ' tiết. ' +
                'Công thức: Số tiết LT = Số TC LT × ' + q.gio_moi_tc_ly_thuyet + ' × ' + q.phut_moi_gio + ' ÷ ' + q.phut_moi_tiet + ' = Số TC LT × ' + tLt + '.</p>' +
                '<p class="mb-1"><strong>Thực hành:</strong> ' + q.gio_moi_tc_thuc_hanh + ' × ' + q.phut_moi_gio + ' = ' + f(q.gio_moi_tc_thuc_hanh * q.phut_moi_gio) + ' phút; ' +
                f(q.gio_moi_tc_thuc_hanh * q.phut_moi_gio) + ' ÷ ' + q.phut_moi_tiet + ' = ' + tTh + ' tiết. ' +
                'Công thức: Số tiết TH = Số TC TH × ' + q.gio_moi_tc_thuc_hanh + ' × ' + q.phut_moi_gio + ' ÷ ' + q.phut_moi_tiet + ' = Số TC TH × ' + tTh + '.</p>' +
                '<p class="mb-1"><strong>Tổng:</strong> Tổng tín chỉ = TC LT + TC TH; Tổng số tiết xếp thời khóa biểu = Số tiết LT + Số tiết TH.</p>' +
                '<p class="mb-1"><strong>Ví dụ:</strong></p><ul>' +
                vd('Môn chỉ có lý thuyết', 3, 0) + vd('Môn chỉ có thực hành', 0, 2) + vd('Môn kết hợp', 3, 2) + '</ul>' +
                '<img src="assets/img/quy-doi-tin-chi.png" alt="Cách quy đổi tín chỉ sang tiết học" style="max-width:100%; border:1px solid var(--border-color); border-radius:6px; margin-top:6px;">' +
                '</details>';
        },

        // RULE-MH-01: loại môn xác định từ số tín chỉ lý thuyết / thực hành; môn cũ chưa phân loại (RULE-CREDIT-11)
        loaiTinChi: function (mh) {
            if (mh.so_tin_chi_ly_thuyet == null || mh.so_tin_chi_thuc_hanh == null) return 'Chưa phân loại';
            var a = parseInt(mh.so_tin_chi_ly_thuyet, 10), b = parseInt(mh.so_tin_chi_thuc_hanh, 10);
            if (a > 0 && b > 0) return 'Kết hợp: ' + a + ' LT + ' + b + ' TH';
            if (b > 0) return 'Thực hành';
            return 'Lý thuyết';
        },

        // Ô Lý thuyết / Thực hành trong bảng: chưa khai báo thì ghi rõ, không suy đoán
        tietCells: function (mh) {
            if (mh.so_tiet_ly_thuyet == null || mh.so_tiet_thuc_hanh == null) {
                return '<td class="text-center" colspan="2"><small class="text-muted">Chưa khai báo</small></td>';
            }
            return '<td class="text-center">' + mh.so_tiet_ly_thuyet + '</td><td class="text-center">' + mh.so_tiet_thuc_hanh + '</td>';
        },

        saveMonHoc: function () {
            var self = this;
            var id = $('#mhId').val();
            var payload = {
                ma_mon_hoc: $('#mhMa').val(),
                ten_mon_hoc: $('#mhTen').val(),
                // Chỉ gửi số tín chỉ từng loại; số tiết do backend tính (RULE-CREDIT-09)
                so_tin_chi_ly_thuyet: $('#mhTcLT').val(),
                so_tin_chi_thuc_hanh: $('#mhTcTH').val(),
                mo_ta: $('#mhMoTa').val()
            };

            // Kiểm tra hợp lệ, trùng mã... do backend xử lý
            var req = id
                ? Api.put('/api/monhoc', $.extend({ id: parseInt(id, 10) }, payload))
                : Api.post('/api/monhoc', payload);

            req.done(function (res) {
                App.showToast(res.message, 'success');
                self.showForm(); // đưa form về trạng thái tạo mới
                self.loadData();
            }).fail(Api.toastError);
        },

        deleteMonHoc: function (id) {
            var self = this;
            var mh = (this.cache || []).find(function (m) { return m.id === parseInt(id, 10); });
            if (!mh) return;

            // Ràng buộc lớp học phần / CTĐT / nhóm tự chọn được backend kiểm tra
            App.confirm('Bạn có chắc chắn muốn xóa môn học <strong>' + App.escapeHtml(mh.ma_mon_hoc) + ' - ' + App.escapeHtml(mh.ten_mon_hoc) + '</strong>?', function () {
                Api.del('/api/monhoc', { id: mh.id })
                    .done(function (res) {
                        App.showToast(res.message, 'success');
                        self.loadData();
                    })
                    .fail(Api.toastError);
            });
        }
    };

    App.registerModule('mon-hoc', MonHocModule);
})(jQuery);
