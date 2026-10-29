/* ================================================================
   MON-HOC.JS - Quản lý môn học
   Thêm, sửa, xóa, tìm kiếm môn học, kiểm tra ràng buộc toàn vẹn
   Font Awesome icons, XSS protection, phân quyền chuẩn
   ================================================================ */

(function ($) {
    'use strict';

    var MonHocModule = {
        render: function () {
            var currentUser = App.getCurrentUser();
            // Quản trị viên: thêm / sửa / xóa. Giảng viên: được thêm môn học và tra cứu (backend kiểm tra quyền).
            var isAdmin = currentUser && currentUser.vai_tro === 'admin';
            var canCreate = currentUser && (currentUser.vai_tro === 'admin' || currentUser.vai_tro === 'giang_vien');

            // Bố cục giống giao diện React: thẻ form (trái) + thẻ danh sách (phải)
            var html =
                '<section class="dashboard-grid' + (canCreate ? ' two-columns' : '') + '">' +
                (canCreate ? '<div id="mhFormSlot"></div>' : '') +
                '<div class="card">' +
                '  <div class="card-header">' +
                '    <h3><i class="fa-solid fa-book-bookmark" style="color:var(--primary);"></i> Danh mục môn học</h3>' +
                '  </div>' +
                '  <div class="card-body">' +
                '    <div class="toolbar">' +
                '      <div class="toolbar-left">' +
                '        <div class="search-box">' +
                '          <i class="fa-solid fa-magnifying-glass search-icon"></i>' +
                '          <input type="text" id="searchMonHoc" placeholder="Tìm theo mã hoặc tên môn">' +
                '        </div>' +
                '      </div>' +
                '      <div class="toolbar-right">' +
                '        <span class="text-muted" id="totalMonHocCount">Tổng số: 0 môn học</span>' +
                '      </div>' +
                '    </div>' +
                '    <div class="table-responsive">' +
                '      <table class="data-table" id="tableMonHoc">' +
                '        <thead>' +
                '          <tr>' +
                '            <th>STT</th>' +
                '            <th>Mã môn</th>' +
                '            <th>Tên môn học</th>' +
                '            <th class="text-center">Số tín chỉ</th>' +
                '            <th class="text-center">Số tiết</th>' +
                '            <th class="text-center">Lý thuyết</th>' +
                '            <th class="text-center">Thực hành</th>' +
                '            <th>Mô tả môn học</th>' +
                (isAdmin ? '            <th class="text-center">Thao tác</th>' : '') +
                '          </tr>' +
                '        </thead>' +
                '        <tbody id="monHocTableBody">' +
                '        </tbody>' +
                '      </table>' +
                '    </div>' +
                '  </div>' +
                '</div>' +
                '</section>';

            $('#contentArea').html(html);
            this.bindEvents();
            this.loadData();
        },

        bindEvents: function () {
            var self = this;

            $('#searchMonHoc').on('input change', function () {
                self.loadData();
            });

            $('#btnThemMonHoc').on('click', function () {
                self.showFormModal();
            });

            $(document).off('click', '.btn-edit-mh').on('click', '.btn-edit-mh', function () {
                var id = $(this).data('id');
                self.showFormModal(id);
            });

            $(document).off('click', '.btn-del-mh').on('click', '.btn-del-mh', function () {
                var id = $(this).data('id');
                self.deleteMonHoc(id);
            });

            $(document).off('click', '#btnSaveMonHoc').on('click', '#btnSaveMonHoc', function () {
                self.saveMonHoc();
            });
        },

        loadData: function () {
            var currentUser = App.getCurrentUser();
            var isAdmin = currentUser && currentUser.vai_tro === 'admin';

            var self = this;
            var keyword = ($('#searchMonHoc').val() || '').trim();

            // Tìm kiếm & lọc thực hiện trên backend
            Api.get('/api/monhoc', { search: keyword })
                .done(function (res) {
                    self.cache = res.data || [];
                    self.quyDoi = res.quy_doi || self.quyDoi;
                    self.renderRows(self.cache, isAdmin);
                    // Lần đầu vào trang: hiện form tạo môn học mới
                    if ($('#mhFormSlot').length && !$('#mhFormSlot').children().length) self.showFormModal();
                })
                .fail(Api.toastError);
        },

        renderRows: function (list, isAdmin) {
            $('#totalMonHocCount').text('Tổng số: ' + list.length + ' môn học');

            var tbody = $('#monHocTableBody');
            tbody.empty();

            if (list.length === 0) {
                var colSpan = isAdmin ? 9 : 8;
                tbody.html('<tr><td colspan="' + colSpan + '" class="text-center text-muted py-4">Không tìm thấy môn học nào</td></tr>');
                return;
            }

            list.forEach(function (mh, index) {
                var row =
                    '<tr>' +
                    '  <td class="text-center">' + (index + 1) + '</td>' +
                    '  <td><strong>' + App.escapeHtml(mh.ma_mon_hoc) + '</strong></td>' +
                    '  <td>' + App.escapeHtml(mh.ten_mon_hoc) + '</td>' +
                    '  <td class="text-center">' + mh.so_tin_chi + '<br><small class="text-muted">' + MonHocModule.loaiTinChi(mh) + '</small></td>' +
                    '  <td class="text-center">' + (mh.so_tiet || '—') + '</td>' +
                    MonHocModule.tietCells(mh) +
                    '  <td><small>' + App.escapeHtml(mh.mo_ta || '—') + '</small></td>' +
                    (isAdmin ?
                    '  <td class="text-center">' +
                    '    <div class="table-actions">' +
                    '      <button class="btn btn-sm btn-outline btn-edit-mh" data-id="' + mh.id + '" title="Sửa môn học">Sửa</button>' +
                    '      <button class="btn btn-sm btn-outline btn-del-mh text-danger" data-id="' + mh.id + '" title="Xóa môn học">Xóa</button>' +
                    '    </div>' +
                    '  </td>' : '') +
                    '</tr>';
                tbody.append(row);
            });
        },

        showFormModal: function (id) {
            var mh = id ? (this.cache || []).find(function (m) { return m.id === parseInt(id, 10); }) : null;
            var isEdit = !!mh;

            var html =
                '<div class="modal-header">' +
                '  <h3><i class="fa-solid ' + (isEdit ? 'fa-pen' : 'fa-plus') + '"></i> ' + (isEdit ? 'Cập nhật môn học' : 'Tạo môn học mới') + '</h3>' +
                '  <button class="modal-close" onclick="App.closeModal()">&times;</button>' +
                '</div>' +
                '<div class="modal-body">' +
                '  <input type="hidden" id="mhId" value="' + (mh ? mh.id : '') + '">' +
                '  <div class="form-row">' +
                '    <div class="form-group">' +
                '      <label>Mã môn học <span class="required">*</span></label>' +
                '      <input type="text" class="form-control" id="mhMa" value="' + (mh ? App.escapeHtml(mh.ma_mon_hoc) : '') + '" placeholder="VD: CS101" ' + (isEdit ? 'readonly' : '') + '>' +
                '    </div>' +
                '    <div class="form-group">' +
                '      <label>Tên môn học <span class="required">*</span></label>' +
                '      <input type="text" class="form-control" id="mhTen" value="' + (mh ? App.escapeHtml(mh.ten_mon_hoc) : '') + '" placeholder="VD: Lập trình Cơ bản">' +
                '    </div>' +
                '  </div>' +
                // RULE-MH-01: chỉ nhập số tín chỉ lý thuyết / thực hành; số tiết do hệ thống tính (RULE-CREDIT-08)
                '  <div class="form-row">' +
                '    <div class="form-group">' +
                '      <label>Số tín chỉ lý thuyết <span class="required">*</span></label>' +
                '      <input type="number" min="0" class="form-control mh-tc" id="mhTcLT" value="' + (mh && mh.so_tin_chi_ly_thuyet != null ? mh.so_tin_chi_ly_thuyet : '') + '" placeholder="VD: 3 (nhập 0 nếu không có)">' +
                '    </div>' +
                '    <div class="form-group">' +
                '      <label>Số tín chỉ thực hành <span class="required">*</span></label>' +
                '      <input type="number" min="0" class="form-control mh-tc" id="mhTcTH" value="' + (mh && mh.so_tin_chi_thuc_hanh != null ? mh.so_tin_chi_thuc_hanh : '') + '" placeholder="VD: 0 (nhập 0 nếu không có)">' +
                '    </div>' +
                '  </div>' +
                ((mh && mh.so_tin_chi_ly_thuyet == null) ? '  <div class="alert alert-warning" style="font-size:0.82rem;">Môn học cũ chưa phân loại tín chỉ lý thuyết / thực hành (hiện có ' + mh.so_tin_chi + ' TC, ' + mh.so_tiet + ' tiết). Nhập số tín chỉ từng loại để áp dụng quy đổi; để trống cả hai thì giữ nguyên dữ liệu cũ.</div>' : '') +
                '  <div class="mb-3" id="mhTietHint"></div>' +
                '  <div class="form-group">' +
                '    <label>Mô tả môn học</label>' +
                '    <textarea class="form-control" id="mhMoTa" rows="3" placeholder="Nhập mô tả chi tiết...">' + (mh ? App.escapeHtml(mh.mo_ta || '') : '') + '</textarea>' +
                '  </div>' +
                '</div>' +
                '<div class="modal-footer">' +
                '  <button class="btn btn-outline" onclick="App.closeModal()">Hủy</button>' +
                '  <button class="btn btn-primary" id="btnSaveMonHoc"><i class="fa-solid fa-floppy-disk"></i> Lưu môn học</button>' +
                '</div>';

            var self = this;
            App.showInlineForm(html, '#mhFormSlot', function () { self.showFormModal(); });
            $('#mhFormSlot .inline-form-card').toggleClass('is-editing', isEdit);
            if (isEdit) App.focusInlineForm('#mhFormSlot');

            // RULE-CREDIT-08, RULE-CREDIT-09: hiển thị từng bước quy đổi để kiểm tra trước khi lưu
            // (số liệu lấy từ backend; backend tự tính lại khi lưu, không nhận số tiết từ giao diện)
            var hint = function () {
                var q = self.quyDoi;
                var $h = $('#mhTietHint');
                if (!q) { $h.empty(); return; }
                var lt = $('#mhTcLT').val(), th = $('#mhTcTH').val();
                var base = MonHocModule.quyDoiGiaiThich(q);
                if (lt === '' && th === '') {
                    $h.html('<p class="text-muted" style="font-size:0.82rem;">Nhập số tín chỉ lý thuyết và thực hành để xem cách tính số tiết.</p>' + base);
                    return;
                }
                if (lt === '' || th === '') {
                    $h.html('<p class="text-warning" style="font-size:0.82rem;">Cần nhập đủ cả hai loại tín chỉ (nhập 0 cho loại không có).</p>' + base);
                    return;
                }
                $h.html(MonHocModule.quyDoiMon(q, parseInt(lt, 10) || 0, parseInt(th, 10) || 0) + base);
            };
            $('.mh-tc').on('input', hint);
            hint();
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
                row('1. Tín chỉ → giờ trên lớp', a + ' tín chỉ × ' + q.gio_moi_tc_ly_thuyet + ' giờ/tín chỉ', f(gioLt) + ' giờ') +
                row('2. Giờ → phút', f(gioLt) + ' giờ × ' + q.phut_moi_gio + ' phút/giờ', f(phutLt) + ' phút') +
                row('3. Phút → tiết', f(phutLt) + ' phút ÷ ' + q.phut_moi_tiet + ' phút/tiết', f(tietLt) + ' tiết') +
                '<tr><td colspan="3"><strong>Thực hành (' + b + ' tín chỉ)</strong></td></tr>' +
                row('1. Tín chỉ → giờ trên lớp', b + ' tín chỉ × ' + q.gio_moi_tc_thuc_hanh + ' giờ/tín chỉ', f(gioTh) + ' giờ') +
                row('2. Giờ → phút', f(gioTh) + ' giờ × ' + q.phut_moi_gio + ' phút/giờ', f(phutTh) + ' phút') +
                row('3. Phút → tiết', f(phutTh) + ' phút ÷ ' + q.phut_moi_tiet + ' phút/tiết', f(tietTh) + ' tiết') +
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
                '<summary style="cursor:pointer;"><strong>Căn cứ và cách quy đổi tín chỉ → số tiết</strong> (bấm để xem)</summary>' +
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
                self.showFormModal(); // đưa form về trạng thái tạo mới
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
