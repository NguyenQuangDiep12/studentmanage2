/* ================================================================
   HOC-KY.JS - Tổ chức giảng dạy > Học kỳ
   Danh sách học kỳ, thêm / sửa, chi tiết (thông tin + danh sách lớp học phần thuộc học kỳ)
   Kiểm tra dữ liệu do backend thực hiện (RULE-HK-02, 03, 06, 08); số tuần tính ở backend (RULE-HK-07)
   ================================================================ */

(function ($) {
    'use strict';

    var HocKyModule = {
        render: function () {
            var html =
                '<div class="card">' +
                '  <div class="card-header">' +
                '    <h3><i class="fa-solid fa-calendar-week" style="color:var(--primary);"></i> Danh sách học kỳ</h3>' +
                '    <button class="btn btn-primary" id="btnThemHocKy"><i class="fa-solid fa-plus"></i> Thêm học kỳ</button>' +
                '  </div>' +
                '  <div class="card-body">' +
                '    <p class="text-muted" style="font-size:0.82rem;">Mỗi học kỳ có ngày bắt đầu và ngày kết thúc; lớp học phần xếp buổi học trong khoảng này. ' +
                '    Số tuần = số tuần lịch (Thứ 2 → Chủ nhật) mà học kỳ đi qua - cùng cách tính với Thời khóa biểu. ' +
                '    Các học kỳ trong cùng năm học không được trùng thời gian.</p>' +
                '    <div class="table-responsive"><table class="data-table"><thead><tr>' +
                '      <th class="text-center">STT</th><th>Năm học</th><th class="text-center">Học kỳ</th><th class="text-center">Ngày bắt đầu</th>' +
                '      <th class="text-center">Ngày kết thúc</th><th class="text-center">Số tuần</th><th class="text-center">Lớp học phần</th><th class="text-center">Thao tác</th>' +
                '    </tr></thead><tbody id="hocKyBody"><tr><td colspan="8" class="text-center text-muted py-3">Đang tải...</td></tr></tbody></table></div>' +
                '  </div>' +
                '</div>';
            $('#contentArea').html(html);
            this.bindEvents();
            this.load();
        },

        tenHk: function (h) { return parseInt(h, 10) === 3 ? 'Học kỳ Hè' : 'Học kỳ ' + h; },

        bindEvents: function () {
            var self = this;
            $('#btnThemHocKy').on('click', function () { self.showForm(null); });
            $(document).off('click', '.btn-hk-sua').on('click', '.btn-hk-sua', function () { self.showForm(self.find($(this).data('id'))); });
            $(document).off('click', '.btn-hk-xoa').on('click', '.btn-hk-xoa', function () { self.remove(self.find($(this).data('id'))); });
            $(document).off('click', '.btn-hk-xem').on('click', '.btn-hk-xem', function () { self.showDetail($(this).data('id')); });
        },

        find: function (id) {
            return (this.list || []).find(function (h) { return parseInt(h.id, 10) === parseInt(id, 10); });
        },

        load: function () {
            var self = this;
            Api.get('/api/cocaudaotao/hoc-ky').done(function (res) {
                self.list = res.data || [];
                var tbody = $('#hocKyBody').empty();
                if (!self.list.length) {
                    tbody.html('<tr><td colspan="8" class="text-center text-muted py-3">Chưa khai báo học kỳ nào - lớp học phần cần học kỳ đã khai báo để xếp lịch</td></tr>');
                    return;
                }
                self.list.forEach(function (h, i) {
                    // RULE-HK-09: chỉ hiện cảnh báo khi dữ liệu vi phạm, không hiện gì nếu hợp lệ
                    var cb = (h.canh_bao || []).map(function (x) { return '<div class="text-danger" style="font-size:0.8rem;">⚠ ' + App.escapeHtml(x) + '</div>'; }).join('');
                    tbody.append(
                        '<tr><td class="text-center">' + (i + 1) + '</td><td><strong>' + App.escapeHtml(h.nam_hoc) + '</strong>' + cb + '</td>' +
                        '<td class="text-center">' + self.tenHk(h.hoc_ky) + '</td>' +
                        '<td class="text-center">' + App.formatDate(h.ngay_bat_dau) + '</td><td class="text-center">' + App.formatDate(h.ngay_ket_thuc) + '</td>' +
                        '<td class="text-center">' + h.so_tuan + '</td><td class="text-center">' + h.so_lop_hoc_phan + '</td>' +
                        '<td class="text-center"><div class="table-actions table-actions-stack justify-center">' +
                        '<button class="btn btn-sm btn-outline-primary btn-hk-xem" data-id="' + h.id + '">Chi tiết</button>' +
                        '<button class="btn btn-sm btn-outline btn-hk-sua" data-id="' + h.id + '">Sửa</button>' +
                        '<button class="btn btn-sm btn-outline text-danger btn-hk-xoa" data-id="' + h.id + '">Xóa</button></div></td></tr>');
                });
            }).fail(Api.toastError);
        },

        showForm: function (h) {
            var self = this;
            var y = new Date().getFullYear();
            var years = [];
            for (var i = y - 2; i <= y + 2; i++) years.push(i + '-' + (i + 1));
            if (h && years.indexOf(h.nam_hoc) === -1) years.unshift(h.nam_hoc);
            var cur = (h && h.nam_hoc) || ((App.getTerms() || {}).hien_tai || {}).nam_hoc;
            App.showModal(
                '<div class="modal-header"><h3>' + (h ? 'Sửa học kỳ' : 'Thêm học kỳ') + '</h3><button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
                '<div class="modal-body">' +
                '<div class="form-row"><div class="form-group"><label>Năm học <span class="required">*</span></label><select class="form-control" id="hkNam">' +
                years.map(function (x) { return '<option value="' + x + '"' + (x === cur ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div>' +
                '<div class="form-group"><label>Học kỳ <span class="required">*</span></label><select class="form-control" id="hkSo">' +
                [1, 2, 3].map(function (x) { return '<option value="' + x + '"' + (h && parseInt(h.hoc_ky, 10) === x ? ' selected' : '') + '>' + self.tenHk(x) + '</option>'; }).join('') + '</select></div></div>' +
                '<div class="form-row"><div class="form-group"><label>Ngày bắt đầu <span class="required">*</span></label><input type="date" class="form-control" id="hkBd" value="' + (h ? h.ngay_bat_dau : '') + '"></div>' +
                '<div class="form-group"><label>Ngày kết thúc <span class="required">*</span></label><input type="date" class="form-control" id="hkKt" value="' + (h ? h.ngay_ket_thuc : '') + '"></div></div>' +
                (h && parseInt(h.so_lop_hoc_phan, 10) > 0 ? '<p class="text-muted" style="font-size:0.8rem;">Học kỳ đã có lớp học phần: chỉ đổi được ngày, và khoảng ngày mới phải bao trùm mọi buổi học đã xếp' +
                    (h.buoi_tu ? ' (' + App.formatDate(h.buoi_tu) + ' → ' + App.formatDate(h.buoi_den) + ')' : '') + '.</p>' : '') +
                '</div>' +
                '<div class="modal-footer"><button class="btn btn-outline" onclick="App.closeModal()">Hủy</button><button class="btn btn-primary" id="btnLuuHocKy">Lưu học kỳ</button></div>', 'sm');
            $('#btnLuuHocKy').on('click', function () {
                var payload = { nam_hoc: $('#hkNam').val(), hoc_ky: $('#hkSo').val(), ngay_bat_dau: $('#hkBd').val(), ngay_ket_thuc: $('#hkKt').val() };
                var req = h ? Api.put('/api/cocaudaotao/hoc-ky', $.extend({ id: h.id }, payload)) : Api.post('/api/cocaudaotao/hoc-ky', payload);
                req.done(function (res) {
                    App.showToast(res.message, 'success');
                    App.closeModal();
                    App.loadTerms(function () {});
                    self.load();
                }).fail(Api.toastError);
            });
        },

        remove: function (h) {
            var self = this;
            if (!h) return;
            App.confirm('Xóa ' + this.tenHk(h.hoc_ky) + ' năm học <strong>' + App.escapeHtml(h.nam_hoc) + '</strong>?', function () {
                Api.del('/api/cocaudaotao/hoc-ky', { id: h.id })
                    .done(function (res) { App.showToast(res.message, 'success'); App.loadTerms(function () {}); self.load(); })
                    .fail(Api.toastError);
            });
        },

        /** Chi tiết học kỳ: thông tin + danh sách lớp học phần thuộc học kỳ */
        showDetail: function (id) {
            var self = this;
            Api.get('/api/cocaudaotao/hoc-ky/chi-tiet', { id: id }).done(function (res) {
                var h = res.data;
                var rows = (h.lop_hoc_phan || []).map(function (l, i) {
                    var ngoai = (l.buoi_dau && l.buoi_dau < h.ngay_bat_dau) || (l.buoi_cuoi && l.buoi_cuoi > h.ngay_ket_thuc);
                    return '<tr><td class="text-center">' + (i + 1) + '</td><td><strong>' + App.escapeHtml(l.ma_lop_hoc_phan) + '</strong></td>' +
                        '<td>' + App.escapeHtml(l.ma_mon_hoc + ' - ' + l.ten_mon_hoc) + '</td><td>' + App.escapeHtml(l.ten_giang_vien || '—') + '</td>' +
                        '<td class="text-center">' + App.escapeHtml(l.phong_hoc || '—') + '</td><td class="text-center">' + l.si_so_hien_tai + '/' + l.si_so_toi_da + '</td>' +
                        '<td class="text-center">' + l.so_buoi + ' buổi · ' + l.tong_tiet_da_xep + '/' + l.so_tiet + ' tiết</td>' +
                        '<td class="text-center' + (ngoai ? ' text-danger' : '') + '">' + (l.buoi_dau ? App.formatDate(l.buoi_dau) + ' → ' + App.formatDate(l.buoi_cuoi) : '—') + (ngoai ? ' ⚠' : '') + '</td>' +
                        '<td class="text-center">' + App.trangThaiLopBadge(l) + '</td>' +
                        '<td class="text-center"><button class="btn btn-sm btn-outline-primary btn-hk-lhp" data-id="' + l.id + '">Xem lớp</button></td></tr>';
                }).join('');
                App.showModal(
                    '<div class="modal-header"><h3>Chi tiết ' + self.tenHk(h.hoc_ky) + ' - năm học ' + App.escapeHtml(h.nam_hoc) + '</h3><button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
                    '<div class="modal-body">' +
                    '<div class="detail-grid mb-3">' +
                    '<div class="detail-item"><span class="detail-label">Ngày bắt đầu</span><span class="detail-value">' + App.formatDate(h.ngay_bat_dau) + '</span></div>' +
                    '<div class="detail-item"><span class="detail-label">Ngày kết thúc</span><span class="detail-value">' + App.formatDate(h.ngay_ket_thuc) + '</span></div>' +
                    '<div class="detail-item"><span class="detail-label">Số tuần</span><span class="detail-value">' + h.so_tuan + ' tuần</span></div>' +
                    '<div class="detail-item"><span class="detail-label">Lớp học phần / buổi học</span><span class="detail-value">' + h.so_lop_hoc_phan + ' lớp · ' + h.so_buoi + ' buổi</span></div>' +
                    '</div>' +
                    ((h.canh_bao || []).length ? '<div class="alert alert-warning" style="font-size:0.84rem;">' + h.canh_bao.map(App.escapeHtml).join('<br>') + '</div>' : '') +
                    '<h4 class="mb-2" style="font-size:0.95rem; font-weight:800;">Danh sách lớp học phần thuộc học kỳ</h4>' +
                    '<div class="table-responsive"><table class="data-table"><thead><tr><th class="text-center">STT</th><th>Mã lớp HP</th><th>Môn học</th><th>Giảng viên</th>' +
                    '<th class="text-center">Phòng</th><th class="text-center">Sĩ số</th><th class="text-center">Buổi / tiết</th><th class="text-center">Buổi đầu → cuối</th><th class="text-center">Trạng thái</th><th></th></tr></thead>' +
                    '<tbody>' + (rows || '<tr><td colspan="10" class="text-center text-muted py-3">Chưa có lớp học phần</td></tr>') + '</tbody></table></div>' +
                    '</div><div class="modal-footer"><button class="btn btn-primary" onclick="App.closeModal()">Đóng</button></div>', 'xl');
                $('.btn-hk-lhp').on('click', function () {
                    var lhpId = $(this).data('id');
                    App.closeModal();
                    if (window.LopHocPhanModule) setTimeout(function () { LopHocPhanModule.showDetailModal(lhpId); }, 250);
                });
            }).fail(Api.toastError);
        }
    };

    App.registerModule('hoc-ky', HocKyModule);
})(jQuery);
