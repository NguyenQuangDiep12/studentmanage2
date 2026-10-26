/* ================================================================
   CO-CAU-DAO-TAO.JS - Quản lý Cơ cấu đào tạo (kết nối API)
   Khoa, Chuyên ngành, Chương trình đào tạo (CTĐT),
   Nhóm môn tự chọn và Lớp sinh viên
   ================================================================ */

(function ($) {
    'use strict';

    var CoCauDaoTaoModule = {
        currentTab: 'ctdt',
        data: null,

        render: function () {
            var currentUser = App.getCurrentUser();
            if (!currentUser || currentUser.vai_tro !== 'admin') {
                $('#contentArea').html('<div class="alert alert-danger"><i class="fa-solid fa-triangle-exclamation"></i> Chức năng chỉ dành cho Quản trị viên</div>');
                return;
            }

            var card = function (id, icon, title, btnId, btnText, headers, bodyId) {
                return '<div class="card' + (id === 'khoa' ? ' mb-3' : '') + '">' +
                    '  <div class="card-header">' +
                    '    <h3><i class="fa-solid ' + icon + '"></i> ' + title + '</h3>' +
                    '    <button class="btn btn-primary btn-sm" id="' + btnId + '"><i class="fa-solid fa-plus"></i> ' + btnText + '</button>' +
                    '  </div>' +
                    '  <div class="card-body"><div class="table-responsive"><table class="data-table">' +
                    '    <thead><tr>' + headers.map(function (h) { return '<th' + (h.c ? ' class="text-center"' : '') + '>' + h.t + '</th>'; }).join('') + '</tr></thead>' +
                    '    <tbody id="' + bodyId + '"></tbody>' +
                    '  </table></div></div>' +
                    '</div>';
            };
            var H = function (t, c) { return { t: t, c: c }; };

            var html =
                '<div class="tabs">' +
                '  <button class="tab-btn' + (this.currentTab === 'ctdt' ? ' active' : '') + '" data-tab="ctdt"><i class="fa-solid fa-graduation-cap"></i> Chương trình đào tạo</button>' +
                '  <button class="tab-btn' + (this.currentTab === 'nhom-tu-chon' ? ' active' : '') + '" data-tab="nhom-tu-chon"><i class="fa-solid fa-layer-group"></i> Nhóm môn tự chọn</button>' +
                '  <button class="tab-btn' + (this.currentTab === 'khoa' ? ' active' : '') + '" data-tab="khoa"><i class="fa-solid fa-building-columns"></i> Khoa & Chuyên ngành</button>' +
                '  <button class="tab-btn' + (this.currentTab === 'lop-sv' ? ' active' : '') + '" data-tab="lop-sv"><i class="fa-solid fa-users-rectangle"></i> Lớp sinh viên</button>' +
                '  <button class="tab-btn' + (this.currentTab === 'hoc-ky' ? ' active' : '') + '" data-tab="hoc-ky"><i class="fa-solid fa-calendar-week"></i> Học kỳ</button>' +
                '</div>' +

                '<div class="tab-content' + (this.currentTab === 'ctdt' ? ' active' : '') + '" id="tab-ctdt">' +
                card('ctdt', 'fa-graduation-cap', 'Danh sách Chương trình đào tạo', 'btnThemCTDT', 'Thêm CTĐT mới',
                    [H('STT', 1), H('Mã CTĐT'), H('Tên chương trình'), H('Chuyên ngành / Khoa'), H('Thời gian'), H('Môn bắt buộc', 1), H('Nhóm tự chọn', 1), H('Lớp SV', 1), H('Thao tác', 1)], 'ctdtTableBody') +
                '</div>' +

                '<div class="tab-content' + (this.currentTab === 'nhom-tu-chon' ? ' active' : '') + '" id="tab-nhom-tu-chon">' +
                card('nhom', 'fa-layer-group', 'Nhóm môn tự chọn theo Chương trình đào tạo', 'btnThemNhomTC', 'Thêm nhóm tự chọn',
                    [H('STT', 1), H('Mã nhóm'), H('Tên nhóm tự chọn'), H('Thuộc CTĐT'), H('Tín chỉ tối thiểu', 1), H('Danh sách môn học thuộc nhóm'), H('Thao tác', 1)], 'nhomTCTableBody') +
                '</div>' +

                '<div class="tab-content' + (this.currentTab === 'khoa' ? ' active' : '') + '" id="tab-khoa">' +
                card('khoa', 'fa-building-columns', 'Danh sách Khoa', 'btnThemKhoa', 'Thêm Khoa',
                    [H('STT', 1), H('Mã Khoa'), H('Tên Khoa'), H('Số chuyên ngành', 1), H('Số giảng viên', 1), H('Thao tác', 1)], 'khoaTableBody') +
                card('cn', 'fa-diagram-project', 'Danh sách Chuyên ngành', 'btnThemChuyenNganh', 'Thêm Chuyên ngành',
                    [H('STT', 1), H('Mã chuyên ngành'), H('Tên chuyên ngành'), H('Thuộc Khoa'), H('Số CTĐT', 1), H('Thao tác', 1)], 'chuyenNganhTableBody') +
                '</div>' +

                '<div class="tab-content' + (this.currentTab === 'lop-sv' ? ' active' : '') + '" id="tab-lop-sv">' +
                card('lop', 'fa-users-rectangle', 'Danh sách Lớp sinh viên', 'btnThemLopSV', 'Tạo lớp sinh viên',
                    [H('STT', 1), H('Mã lớp'), H('Tên lớp'), H('Khóa học'), H('Chương trình đào tạo'), H('Sĩ số sinh viên', 1), H('Thao tác', 1)], 'lopSVTableBody') +
                '</div>' +

                // RULE-HK-01: học kỳ lưu ngày bắt đầu / kết thúc, lớp học phần xếp lịch trong khoảng này
                '<div class="tab-content' + (this.currentTab === 'hoc-ky' ? ' active' : '') + '" id="tab-hoc-ky">' +
                card('hk', 'fa-calendar-week', 'Danh sách Học kỳ', 'btnThemHocKy', 'Khai báo học kỳ',
                    [H('STT', 1), H('Năm học'), H('Học kỳ', 1), H('Ngày bắt đầu', 1), H('Ngày kết thúc', 1), H('Số tuần', 1), H('Lớp học phần', 1), H('Thao tác', 1)], 'hocKyTableBody') +
                '</div>';

            $('#contentArea').html(html);
            this.bindEvents();
            this.loadAll();
        },

        bindEvents: function () {
            var self = this;
            $('.tab-btn').on('click', function () {
                var tab = $(this).data('tab');
                $('.tab-btn').removeClass('active');
                $(this).addClass('active');
                $('.tab-content').removeClass('active');
                $('#tab-' + tab).addClass('active');
                self.currentTab = tab;
            });

            $('#btnThemKhoa').on('click', function () { self.showKhoaModal(); });
            $('#btnThemChuyenNganh').on('click', function () { self.showChuyenNganhModal(); });
            $('#btnThemCTDT').on('click', function () { self.showCTDTModal(); });
            $('#btnThemNhomTC').on('click', function () { self.showNhomTCModal(); });
            $('#btnThemLopSV').on('click', function () { self.showLopSVModal(); });
            $('#btnThemHocKy').on('click', function () { self.showHocKyModal(); });

            var on = function (cls, fn) {
                $(document).off('click', cls).on('click', cls, function () { fn.call(self, parseInt($(this).data('id'), 10)); });
            };
            on('.btn-edit-khoa', function (id) { this.showKhoaModal(this.find('khoa', id)); });
            on('.btn-del-khoa', function (id) { this.remove('khoa', id, 'Khoa'); });
            on('.btn-edit-cn', function (id) { this.showChuyenNganhModal(this.find('chuyen_nganh', id)); });
            on('.btn-del-cn', function (id) { this.remove('chuyen-nganh', id, 'Chuyên ngành'); });
            on('.btn-edit-ctdt', function (id) { this.showCTDTModal(this.find('chuong_trinh_dao_tao', id)); });
            on('.btn-del-ctdt', function (id) { this.remove('ctdt', id, 'Chương trình đào tạo'); });
            on('.btn-view-ctdt', function (id) {
                ChuongTrinhDaoTaoModule.selectedId = id;
                App.navigate('chuong-trinh-dao-tao');
            });
            on('.btn-edit-nhom', function (id) { this.showNhomTCModal(this.find('nhom_tu_chon', id)); });
            on('.btn-del-nhom', function (id) { this.remove('nhom-tu-chon', id, 'Nhóm tự chọn'); });
            on('.btn-edit-lopsv', function (id) { this.showLopSVModal(this.find('lop_sinh_vien', id)); });
            on('.btn-del-lopsv', function (id) { this.remove('lop-sinh-vien', id, 'Lớp sinh viên'); });
            on('.btn-edit-hk', function (id) { this.showHocKyModal(this.find('hoc_ky', id)); });
            on('.btn-del-hk', function (id) { this.remove('hoc-ky', id, 'Học kỳ'); });
        },

        find: function (key, id) {
            return ((this.data || {})[key] || []).find(function (x) { return x.id === id; }) || null;
        },

        loadAll: function () {
            var self = this;
            Api.get('/api/cocaudaotao/tong-quan')
                .done(function (res) {
                    self.data = res.data;
                    self.drawCTDT();
                    self.drawNhomTC();
                    self.drawKhoa();
                    self.drawLopSV();
                    self.drawHocKy();
                    App.loadTerms(function () {});   // cập nhật danh sách học kỳ dùng ở các trang khác
                })
                .fail(Api.toastError);
        },

        actions: function (editCls, delCls, id, extra) {
            return '<div class="table-actions justify-center' + (extra ? ' table-actions-stack' : '') + '">' + (extra || '') +
                '<button class="btn btn-sm btn-outline ' + editCls + '" data-id="' + id + '">Sửa</button>' +
                '<button class="btn btn-sm btn-outline text-danger ' + delCls + '" data-id="' + id + '">Xóa</button></div>';
        },

        empty: function (tbody, cols, text) {
            tbody.html('<tr><td colspan="' + cols + '" class="text-center text-muted py-3">' + text + '</td></tr>');
        },

        drawCTDT: function () {
            var self = this;
            var tbody = $('#ctdtTableBody').empty();
            var list = this.data.chuong_trinh_dao_tao;
            if (!list.length) return this.empty(tbody, 9, 'Chưa có chương trình đào tạo');
            list.forEach(function (c, idx) {
                tbody.append(
                    '<tr>' +
                    '  <td class="text-center">' + (idx + 1) + '</td>' +
                    '  <td><strong>' + App.escapeHtml(c.ma_chuong_trinh) + '</strong></td>' +
                    '  <td>' + App.escapeHtml(c.ten_chuong_trinh) + '</td>' +
                    '  <td>' + App.escapeHtml(c.ten_chuyen_nganh || '—') + '<br><small class="text-muted">' + App.escapeHtml(c.ten_khoa || '') + '</small></td>' +
                    '  <td>' + App.escapeHtml(c.thoi_gian_dao_tao || '—') + '</td>' +
                    '  <td class="text-center"><span class="badge badge-info">' + c.so_mon_bat_buoc + ' môn / ' + c.tin_chi_bat_buoc + ' TC</span></td>' +
                    '  <td class="text-center">' + c.so_nhom_tu_chon + '</td>' +
                    '  <td class="text-center">' + c.so_lop + '</td>' +
                    '  <td class="text-center">' + self.actions('btn-edit-ctdt', 'btn-del-ctdt', c.id,
                        '<button class="btn btn-sm btn-outline-primary btn-view-ctdt" data-id="' + c.id + '">Xem khung</button>') + '</td>' +
                    '</tr>'
                );
            });
        },

        drawNhomTC: function () {
            var self = this;
            var tbody = $('#nhomTCTableBody').empty();
            var list = this.data.nhom_tu_chon;
            if (!list.length) return this.empty(tbody, 7, 'Chưa có nhóm tự chọn');
            list.forEach(function (n, idx) {
                var mons = n.mon_hoc.map(function (m) { return App.escapeHtml(m.ma_mon_hoc) + ' (' + m.so_tin_chi + 'TC)'; }).join(', ');
                tbody.append(
                    '<tr>' +
                    '  <td class="text-center">' + (idx + 1) + '</td>' +
                    '  <td><strong>' + App.escapeHtml(n.ma_nhom) + '</strong></td>' +
                    '  <td>' + App.escapeHtml(n.ten_nhom) + '</td>' +
                    '  <td>' + App.escapeHtml(n.ten_chuong_trinh || '—') + '</td>' +
                    '  <td class="text-center"><span class="badge badge-primary">Tối thiểu ' + n.so_tin_chi_toi_thieu + ' TC</span></td>' +
                    '  <td><small>' + (mons || 'Chưa có môn') + '</small><br><small class="text-muted">Tổng ' + n.tong_tin_chi_nhom + ' TC · thêm/gỡ môn tại "Xem khung" của CTĐT</small></td>' +
                    '  <td class="text-center">' + self.actions('btn-edit-nhom', 'btn-del-nhom', n.id) + '</td>' +
                    '</tr>'
                );
            });
        },

        drawKhoa: function () {
            var self = this;
            var tbodyKhoa = $('#khoaTableBody').empty();
            this.data.khoa.forEach(function (k, idx) {
                tbodyKhoa.append(
                    '<tr>' +
                    '  <td class="text-center">' + (idx + 1) + '</td>' +
                    '  <td><strong>' + App.escapeHtml(k.ma_khoa) + '</strong></td>' +
                    '  <td>' + App.escapeHtml(k.ten_khoa) + '</td>' +
                    '  <td class="text-center">' + k.so_chuyen_nganh + ' chuyên ngành</td>' +
                    '  <td class="text-center">' + k.so_giang_vien + '</td>' +
                    '  <td class="text-center">' + self.actions('btn-edit-khoa', 'btn-del-khoa', k.id) + '</td>' +
                    '</tr>'
                );
            });
            if (!this.data.khoa.length) this.empty(tbodyKhoa, 6, 'Chưa có khoa');

            var tbodyCN = $('#chuyenNganhTableBody').empty();
            this.data.chuyen_nganh.forEach(function (cn, idx) {
                tbodyCN.append(
                    '<tr>' +
                    '  <td class="text-center">' + (idx + 1) + '</td>' +
                    '  <td><strong>' + App.escapeHtml(cn.ma_chuyen_nganh) + '</strong></td>' +
                    '  <td>' + App.escapeHtml(cn.ten_chuyen_nganh) + '</td>' +
                    '  <td>' + App.escapeHtml(cn.ten_khoa || '—') + '</td>' +
                    '  <td class="text-center">' + cn.so_ctdt + '</td>' +
                    '  <td class="text-center">' + self.actions('btn-edit-cn', 'btn-del-cn', cn.id) + '</td>' +
                    '</tr>'
                );
            });
            if (!this.data.chuyen_nganh.length) this.empty(tbodyCN, 6, 'Chưa có chuyên ngành');
        },

        drawLopSV: function () {
            var self = this;
            var tbody = $('#lopSVTableBody').empty();
            var list = this.data.lop_sinh_vien;
            if (!list.length) return this.empty(tbody, 7, 'Chưa có lớp sinh viên');
            list.forEach(function (l, idx) {
                tbody.append(
                    '<tr>' +
                    '  <td class="text-center">' + (idx + 1) + '</td>' +
                    '  <td><strong>' + App.escapeHtml(l.ma_lop) + '</strong></td>' +
                    '  <td>' + App.escapeHtml(l.ten_lop) + '</td>' +
                    '  <td>' + App.escapeHtml(l.khoa_hoc || '—') + '</td>' +
                    '  <td>' + App.escapeHtml(l.ten_chuong_trinh || '—') + '</td>' +
                    '  <td class="text-center"><span class="badge badge-success">' + l.so_sinh_vien + ' sinh viên</span></td>' +
                    '  <td class="text-center">' + self.actions('btn-edit-lopsv', 'btn-del-lopsv', l.id) + '</td>' +
                    '</tr>'
                );
            });
        },

        drawHocKy: function () {
            var self = this;
            var tbody = $('#hocKyTableBody').empty();
            var list = this.data.hoc_ky || [];
            if (!list.length) return this.empty(tbody, 8, 'Chưa khai báo học kỳ nào - lớp học phần cần học kỳ đã khai báo để xếp lịch');
            list.forEach(function (h, idx) {
                var tuan = Math.ceil((new Date(h.ngay_ket_thuc) - new Date(h.ngay_bat_dau)) / 86400000 / 7);
                tbody.append(
                    '<tr>' +
                    '  <td class="text-center">' + (idx + 1) + '</td>' +
                    '  <td><strong>' + App.escapeHtml(h.nam_hoc) + '</strong></td>' +
                    '  <td class="text-center">' + (parseInt(h.hoc_ky, 10) === 3 ? 'Học kỳ Hè' : 'Học kỳ ' + h.hoc_ky) + '</td>' +
                    '  <td class="text-center">' + App.formatDate(h.ngay_bat_dau) + '</td>' +
                    '  <td class="text-center">' + App.formatDate(h.ngay_ket_thuc) + '</td>' +
                    '  <td class="text-center">' + tuan + '</td>' +
                    '  <td class="text-center">' + h.so_lop_hoc_phan + '</td>' +
                    '  <td class="text-center">' + self.actions('btn-edit-hk', 'btn-del-hk', h.id) + '</td>' +
                    '</tr>'
                );
            });
        },

        // ---------------- Form dùng chung ----------------

        /** fields: [{id, label, value, type: text|select, options:[{v,t}], ph}] */
        openForm: function (title, fields, endpoint, item) {
            var self = this;
            var body = fields.map(function (f) {
                var input;
                if (f.options) {
                    input = '<select class="form-control" id="' + f.id + '">' + f.options.map(function (o) {
                        return '<option value="' + o.v + '"' + (String(o.v) === String(f.value) ? ' selected' : '') + '>' + App.escapeHtml(o.t) + '</option>';
                    }).join('') + '</select>';
                } else {
                    input = '<input type="' + (f.type || 'text') + '" class="form-control" id="' + f.id + '" value="' + App.escapeHtml(f.value == null ? '' : f.value) + '" placeholder="' + App.escapeHtml(f.ph || '') + '">';
                }
                return '<div class="form-group"><label>' + f.label + ' <span class="required">*</span></label>' + input + '</div>';
            }).join('');

            App.showModal(
                '<div class="modal-header"><h3>' + title + '</h3><button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
                '<div class="modal-body">' + body + '</div>' +
                '<div class="modal-footer"><button class="btn btn-outline" onclick="App.closeModal()">Hủy</button>' +
                '<button class="btn btn-primary" id="btnCocauSave">Lưu</button></div>'
            );

            $('#btnCocauSave').on('click', function () {
                var payload = {};
                fields.forEach(function (f) { payload[f.key] = $('#' + f.id).val(); });
                var req = item
                    ? Api.put(endpoint, $.extend({ id: item.id }, payload))
                    : Api.post(endpoint, payload);
                req.done(function (res) {
                    App.showToast(res.message, 'success');
                    App.closeModal();
                    self.loadAll();
                }).fail(Api.toastError);
            });
        },

        opts: function (list, valKey, textFn) {
            return list.map(function (x) { return { v: x[valKey], t: textFn(x) }; });
        },

        showKhoaModal: function (k) {
            this.openForm(k ? 'Sửa Khoa' : 'Thêm Khoa đào tạo', [
                { key: 'ma_khoa', id: 'kMa', label: 'Mã Khoa', value: k && k.ma_khoa, ph: 'VD: CNTT' },
                { key: 'ten_khoa', id: 'kTen', label: 'Tên Khoa', value: k && k.ten_khoa, ph: 'VD: Công nghệ Thông tin' }
            ], '/api/cocaudaotao/khoa', k);
        },

        showChuyenNganhModal: function (cn) {
            this.openForm(cn ? 'Sửa Chuyên ngành' : 'Thêm Chuyên ngành', [
                { key: 'ma_chuyen_nganh', id: 'cnMa', label: 'Mã chuyên ngành', value: cn && cn.ma_chuyen_nganh, ph: 'VD: KTPM' },
                { key: 'ten_chuyen_nganh', id: 'cnTen', label: 'Tên chuyên ngành', value: cn && cn.ten_chuyen_nganh },
                { key: 'khoa_id', id: 'cnKhoa', label: 'Thuộc Khoa', value: cn && cn.khoa_id,
                    options: this.opts(this.data.khoa, 'id', function (k) { return k.ma_khoa + ' - ' + k.ten_khoa; }) }
            ], '/api/cocaudaotao/chuyen-nganh', cn);
        },

        showCTDTModal: function (c) {
            var years = [1, 2, 3, 4, 5, 6].map(function (y) { return { v: y + ' năm', t: y + ' năm' }; });
            this.openForm(c ? 'Sửa Chương trình đào tạo' : 'Thêm Chương trình đào tạo', [
                { key: 'ma_chuong_trinh', id: 'ctMa', label: 'Mã CTĐT', value: c && c.ma_chuong_trinh, ph: 'VD: CTDT-KTPM' },
                { key: 'ten_chuong_trinh', id: 'ctTen', label: 'Tên chương trình', value: c && c.ten_chuong_trinh },
                { key: 'thoi_gian_dao_tao', id: 'ctTg', label: 'Thời gian đào tạo', value: (c && c.thoi_gian_dao_tao) || '4 năm', options: years },
                { key: 'chuyen_nganh_id', id: 'ctCn', label: 'Chuyên ngành', value: c && c.chuyen_nganh_id,
                    options: this.opts(this.data.chuyen_nganh, 'id', function (x) { return x.ma_chuyen_nganh + ' - ' + x.ten_chuyen_nganh + ' (' + (x.ten_khoa || '') + ')'; }) }
            ], '/api/cocaudaotao/ctdt', c);
        },

        showNhomTCModal: function (n) {
            this.openForm(n ? 'Sửa nhóm tự chọn' : 'Thêm nhóm tự chọn', [
                { key: 'ma_nhom', id: 'nMa', label: 'Mã nhóm', value: n && n.ma_nhom, ph: 'VD: NTC-A' },
                { key: 'ten_nhom', id: 'nTen', label: 'Tên nhóm', value: n && n.ten_nhom, ph: 'VD: Tự chọn A' },
                { key: 'chuong_trinh_id', id: 'nCt', label: 'Thuộc CTĐT', value: n && n.chuong_trinh_id,
                    options: this.opts(this.data.chuong_trinh_dao_tao, 'id', function (x) { return x.ma_chuong_trinh + ' - ' + x.ten_chuong_trinh; }) },
                { key: 'so_tin_chi_toi_thieu', id: 'nTc', label: 'Số tín chỉ tối thiểu phải tích lũy', value: n && n.so_tin_chi_toi_thieu, ph: 'VD: 6' }
            ], '/api/cocaudaotao/nhom-tu-chon', n);
        },

        showLopSVModal: function (l) {
            this.openForm(l ? 'Sửa Lớp sinh viên' : 'Tạo Lớp sinh viên', [
                { key: 'ma_lop', id: 'lMa', label: 'Mã lớp', value: l && l.ma_lop, ph: 'VD: KTPM2026' },
                { key: 'ten_lop', id: 'lTen', label: 'Tên lớp sinh viên', value: l && l.ten_lop, ph: 'VD: Kỹ thuật phần mềm Khóa 2026' },
                { key: 'khoa_hoc', id: 'lKhoa', label: 'Khóa học', value: l && l.khoa_hoc, ph: 'VD: 2026-2030' },
                { key: 'chuong_trinh_id', id: 'lCTDT', label: 'Chương trình đào tạo áp dụng', value: l && l.chuong_trinh_id,
                    options: this.opts(this.data.chuong_trinh_dao_tao, 'id', function (x) { return x.ma_chuong_trinh + ' - ' + x.ten_chuong_trinh; }) }
            ], '/api/cocaudaotao/lop-sinh-vien', l);
        },

        // RULE-HK-02, RULE-HK-06: backend kiểm tra ngày kết thúc > ngày bắt đầu và chặn sửa học kỳ đã có lớp
        showHocKyModal: function (h) {
            var y = new Date().getFullYear();
            var years = [];
            for (var i = y - 2; i <= y + 2; i++) years.push({ v: i + '-' + (i + 1), t: i + '-' + (i + 1) });
            if (h && !years.some(function (o) { return o.v === h.nam_hoc; })) years.unshift({ v: h.nam_hoc, t: h.nam_hoc });
            this.openForm(h ? 'Sửa Học kỳ' : 'Khai báo Học kỳ', [
                { key: 'nam_hoc', id: 'hkNam', label: 'Năm học', value: (h && h.nam_hoc) || ((App.getTerms() || {}).hien_tai || {}).nam_hoc, options: years },
                { key: 'hoc_ky', id: 'hkSo', label: 'Học kỳ', value: h && h.hoc_ky, options: [{ v: 1, t: 'Học kỳ 1' }, { v: 2, t: 'Học kỳ 2' }, { v: 3, t: 'Học kỳ Hè' }] },
                { key: 'ngay_bat_dau', id: 'hkBd', label: 'Ngày bắt đầu', value: h && h.ngay_bat_dau, type: 'date' },
                { key: 'ngay_ket_thuc', id: 'hkKt', label: 'Ngày kết thúc', value: h && h.ngay_ket_thuc, type: 'date' }
            ], '/api/cocaudaotao/hoc-ky', h);
        },

        remove: function (endpoint, id, label) {
            var self = this;
            App.confirm('Bạn có chắc muốn xóa ' + label + ' này?', function () {
                Api.del('/api/cocaudaotao/' + endpoint, { id: id })
                    .done(function (res) { App.showToast(res.message, 'success'); self.loadAll(); })
                    .fail(Api.toastError);
            });
        }
    };

    App.registerModule('co-cau-dao-tao', CoCauDaoTaoModule);
})(jQuery);
