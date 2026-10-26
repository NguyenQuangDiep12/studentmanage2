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

            var html =
                '<div class="card">' +
                '  <div class="card-header">' +
                '    <h3><i class="fa-solid fa-book-bookmark" style="color:var(--primary);"></i> Danh mục môn học</h3>' +
                (canCreate ? '    <button class="btn btn-primary" id="btnThemMonHoc"><i class="fa-solid fa-plus"></i> Thêm môn học</button>' : '') +
                '  </div>' +
                '  <div class="card-body">' +
                '    <div class="toolbar">' +
                '      <div class="toolbar-left">' +
                '        <div class="search-box">' +
                '          <i class="fa-solid fa-magnifying-glass search-icon"></i>' +
                '          <input type="text" id="searchMonHoc" placeholder="Tìm theo mã hoặc tên môn">' +
                '        </div>' +
                '        <select id="filterTrangThaiMH" class="filter-select">' +
                '          <option value="">-- Tất cả trạng thái --</option>' +
                '          <option value="Hoạt động">Hoạt động</option>' +
                '          <option value="Tạm ngưng">Tạm ngưng</option>' +
                '        </select>' +
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
                '            <th class="text-center">Trạng thái</th>' +
                (isAdmin ? '            <th class="text-center">Thao tác</th>' : '') +
                '          </tr>' +
                '        </thead>' +
                '        <tbody id="monHocTableBody">' +
                '        </tbody>' +
                '      </table>' +
                '    </div>' +
                '  </div>' +
                '</div>';

            $('#contentArea').html(html);
            this.bindEvents();
            this.loadData();
        },

        bindEvents: function () {
            var self = this;

            $('#searchMonHoc, #filterTrangThaiMH').on('input change', function () {
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
            var statusFilter = $('#filterTrangThaiMH').val();

            // Tìm kiếm & lọc thực hiện trên backend
            Api.get('/api/monhoc', { search: keyword, trang_thai: statusFilter })
                .done(function (res) {
                    self.cache = res.data || [];
                    self.quyDoi = res.quy_doi || self.quyDoi;
                    self.renderRows(self.cache, isAdmin);
                })
                .fail(Api.toastError);
        },

        renderRows: function (list, isAdmin) {
            $('#totalMonHocCount').text('Tổng số: ' + list.length + ' môn học');

            var tbody = $('#monHocTableBody');
            tbody.empty();

            if (list.length === 0) {
                var colSpan = isAdmin ? 10 : 9;
                tbody.html('<tr><td colspan="' + colSpan + '" class="text-center text-muted py-4">Không tìm thấy môn học nào</td></tr>');
                return;
            }

            list.forEach(function (mh, index) {
                var statusBadge = mh.trang_thai === 'Hoạt động'
                    ? '<span class="badge badge-success"><i class="fa-solid fa-check"></i> Hoạt động</span>'
                    : '<span class="badge badge-danger"><i class="fa-solid fa-pause"></i> Tạm ngưng</span>';

                var row =
                    '<tr>' +
                    '  <td class="text-center">' + (index + 1) + '</td>' +
                    '  <td><strong>' + App.escapeHtml(mh.ma_mon_hoc) + '</strong></td>' +
                    '  <td>' + App.escapeHtml(mh.ten_mon_hoc) + '</td>' +
                    '  <td class="text-center">' + mh.so_tin_chi + '<br><small class="text-muted">' + MonHocModule.loaiTinChi(mh) + '</small></td>' +
                    '  <td class="text-center">' + (mh.so_tiet || '—') + '</td>' +
                    MonHocModule.tietCells(mh) +
                    '  <td><small>' + App.escapeHtml(mh.mo_ta || '—') + '</small></td>' +
                    '  <td class="text-center">' + statusBadge + '</td>' +
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
                '  <h3><i class="fa-solid ' + (isEdit ? 'fa-pen' : 'fa-plus') + '"></i> ' + (isEdit ? 'Cập nhật môn học' : 'Thêm môn học mới') + '</h3>' +
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
                '    <label>Trạng thái</label>' +
                '    <select class="form-control" id="mhTrangThai">' +
                '      <option value="Hoạt động" ' + (mh && mh.trang_thai === 'Hoạt động' ? 'selected' : '') + '>Hoạt động</option>' +
                '      <option value="Tạm ngưng" ' + (mh && mh.trang_thai === 'Tạm ngưng' ? 'selected' : '') + '>Tạm ngưng</option>' +
                '    </select>' +
                '  </div>' +
                '  <div class="form-group">' +
                '    <label>Mô tả môn học</label>' +
                '    <textarea class="form-control" id="mhMoTa" rows="3" placeholder="Nhập mô tả chi tiết...">' + (mh ? App.escapeHtml(mh.mo_ta || '') : '') + '</textarea>' +
                '  </div>' +
                '</div>' +
                '<div class="modal-footer">' +
                '  <button class="btn btn-outline" onclick="App.closeModal()">Hủy</button>' +
                '  <button class="btn btn-primary" id="btnSaveMonHoc"><i class="fa-solid fa-floppy-disk"></i> Lưu môn học</button>' +
                '</div>';

            App.showModal(html, 'lg');

            // RULE-CREDIT-09: hiển thị kết quả quy đổi để kiểm tra trước khi lưu (backend tự tính lại khi lưu)
            var self = this;
            var hint = function () {
                var q = self.quyDoi || { tiet_moi_tc_ly_thuyet: 18, tiet_moi_tc_thuc_hanh: 36, phut_moi_tiet: 50 };
                var lt = $('#mhTcLT').val(), th = $('#mhTcTH').val();
                var $h = $('#mhTietHint');
                if (lt === '' && th === '') {
                    $h.html('<span class="text-muted" style="font-size:0.82rem;">Nhập số tín chỉ lý thuyết và thực hành để hệ thống tính số tiết.</span>');
                    return;
                }
                if (lt === '' || th === '') {
                    $h.html('<span class="text-warning" style="font-size:0.82rem;">Cần nhập đủ cả hai loại tín chỉ (nhập 0 cho loại không có).</span>');
                    return;
                }
                var a = parseInt(lt, 10) || 0, b = parseInt(th, 10) || 0;
                var tietLt = a * q.tiet_moi_tc_ly_thuyet, tietTh = b * q.tiet_moi_tc_thuc_hanh;
                $h.html('<table class="data-table" style="font-size:0.82rem;"><tbody>' +
                    '<tr><td>Loại môn học</td><td><strong>' + self.loaiTinChi({ so_tin_chi_ly_thuyet: a, so_tin_chi_thuc_hanh: b }) + '</strong></td></tr>' +
                    '<tr><td>Tổng số tín chỉ</td><td><strong>' + (a + b) + '</strong></td></tr>' +
                    '<tr><td>Số tiết lý thuyết</td><td>' + a + ' × ' + q.tiet_moi_tc_ly_thuyet + ' = <strong>' + tietLt + '</strong></td></tr>' +
                    '<tr><td>Số tiết thực hành</td><td>' + b + ' × ' + q.tiet_moi_tc_thuc_hanh + ' = <strong>' + tietTh + '</strong></td></tr>' +
                    '<tr><td>Tổng số tiết xếp TKB</td><td><strong>' + (tietLt + tietTh) + '</strong> tiết (' + q.phut_moi_tiet + ' phút/tiết, không tính tự học)</td></tr>' +
                    '</tbody></table>');
            };
            $('.mh-tc').on('input', hint);
            hint();
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
                trang_thai: $('#mhTrangThai').val(),
                mo_ta: $('#mhMoTa').val()
            };

            // Kiểm tra hợp lệ, trùng mã... do backend xử lý
            var req = id
                ? Api.put('/api/monhoc', $.extend({ id: parseInt(id, 10) }, payload))
                : Api.post('/api/monhoc', payload);

            req.done(function (res) {
                App.showToast(res.message, 'success');
                App.closeModal();
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
