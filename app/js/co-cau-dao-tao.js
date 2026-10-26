/* ================================================================
   CO-CAU-DAO-TAO.JS - Quản lý Cơ cấu đào tạo
   Quản lý Khoa, Chuyên ngành, Chương trình đào tạo (CTĐT),
   Nhóm môn tự chọn (A, B, C) và Lớp sinh viên
   ================================================================ */

(function ($) {
    'use strict';

    var CoCauDaoTaoModule = {
        currentTab: 'ctdt',

        render: function () {
            var currentUser = App.getCurrentUser();
            if (!currentUser || currentUser.vai_tro !== 'admin') {
                $('#contentArea').html('<div class="alert alert-danger"><i class="fa-solid fa-triangle-exclamation"></i> Chức năng chỉ dành cho Quản trị viên</div>');
                return;
            }

            var html =
                '<div class="tabs">' +
                '  <button class="tab-btn active" data-tab="ctdt"><i class="fa-solid fa-graduation-cap"></i> Chương trình đào tạo</button>' +
                '  <button class="tab-btn" data-tab="nhom-tu-chon"><i class="fa-solid fa-layer-group"></i> Nhóm môn tự chọn</button>' +
                '  <button class="tab-btn" data-tab="khoa"><i class="fa-solid fa-building-columns"></i> Khoa & Chuyên ngành</button>' +
                '  <button class="tab-btn" data-tab="lop-sv"><i class="fa-solid fa-users-rectangle"></i> Lớp sinh viên</button>' +
                '</div>' +

                '<!-- TAB 1: CTĐT -->' +
                '<div class="tab-content active" id="tab-ctdt">' +
                '  <div class="card">' +
                '    <div class="card-header">' +
                '      <h3><i class="fa-solid fa-graduation-cap"></i> Danh sách Chương trình đào tạo</h3>' +
                '      <button class="btn btn-primary btn-sm" id="btnThemCTDT"><i class="fa-solid fa-plus"></i> Thêm CTĐT mới</button>' +
                '    </div>' +
                '    <div class="card-body">' +
                '      <div class="table-responsive">' +
                '        <table class="data-table">' +
                '          <thead><tr><th>STT</th><th>Mã CTĐT</th><th>Tên chương trình</th><th>Chuyên ngành</th><th>Thời gian</th><th class="text-center">Số môn cốt lõi</th><th class="text-center">Thao tác</th></tr></thead>' +
                '          <tbody id="ctdtTableBody"></tbody>' +
                '        </table>' +
                '      </div>' +
                '    </div>' +
                '  </div>' +
                '</div>' +

                '<!-- TAB 2: NHÓM TỰ CHỌN -->' +
                '<div class="tab-content" id="tab-nhom-tu-chon">' +
                '  <div class="card">' +
                '    <div class="card-header">' +
                '      <h3><i class="fa-solid fa-layer-group"></i> Nhóm môn tự chọn theo Chương trình đào tạo</h3>' +
                '      <button class="btn btn-primary btn-sm" id="btnThemNhomTC"><i class="fa-solid fa-plus"></i> Thêm nhóm tự chọn</button>' +
                '    </div>' +
                '    <div class="card-body">' +
                '      <div class="table-responsive">' +
                '        <table class="data-table">' +
                '          <thead><tr><th>STT</th><th>Mã nhóm</th><th>Tên nhóm tự chọn</th><th>Thuộc CTĐT</th><th class="text-center">Tín chỉ tối thiểu</th><th>Danh sách môn học thuộc nhóm</th><th class="text-center">Thao tác</th></tr></thead>' +
                '          <tbody id="nhomTCTableBody"></tbody>' +
                '        </table>' +
                '      </div>' +
                '    </div>' +
                '  </div>' +
                '</div>' +

                '<!-- TAB 3: KHOA & CHUYÊN NGÀNH -->' +
                '<div class="tab-content" id="tab-khoa">' +
                '  <div class="card mb-3">' +
                '    <div class="card-header">' +
                '      <h3><i class="fa-solid fa-building-columns"></i> Danh sách Khoa</h3>' +
                '      <button class="btn btn-primary btn-sm" id="btnThemKhoa"><i class="fa-solid fa-plus"></i> Thêm Khoa</button>' +
                '    </div>' +
                '    <div class="card-body">' +
                '      <div class="table-responsive">' +
                '        <table class="data-table">' +
                '          <thead><tr><th>STT</th><th>Mã Khoa</th><th>Tên Khoa</th><th class="text-center">Số chuyên ngành</th><th class="text-center">Thao tác</th></tr></thead>' +
                '          <tbody id="khoaTableBody"></tbody>' +
                '        </table>' +
                '      </div>' +
                '    </div>' +
                '  </div>' +
                '  <div class="card">' +
                '    <div class="card-header">' +
                '      <h3><i class="fa-solid fa-diagram-project"></i> Danh sách Chuyên ngành</h3>' +
                '      <button class="btn btn-primary btn-sm" id="btnThemChuyenNganh"><i class="fa-solid fa-plus"></i> Thêm Chuyên ngành</button>' +
                '    </div>' +
                '    <div class="card-body">' +
                '      <div class="table-responsive">' +
                '        <table class="data-table">' +
                '          <thead><tr><th>STT</th><th>Mã chuyên ngành</th><th>Tên chuyên ngành</th><th>Thuộc Khoa</th><th class="text-center">Thao tác</th></tr></thead>' +
                '          <tbody id="chuyenNganhTableBody"></tbody>' +
                '        </table>' +
                '      </div>' +
                '    </div>' +
                '  </div>' +
                '</div>' +

                '<!-- TAB 4: LỚP SINH VIÊN -->' +
                '<div class="tab-content" id="tab-lop-sv">' +
                '  <div class="card">' +
                '    <div class="card-header">' +
                '      <h3><i class="fa-solid fa-users-rectangle"></i> Danh sách Lớp sinh viên</h3>' +
                '      <button class="btn btn-primary btn-sm" id="btnThemLopSV"><i class="fa-solid fa-plus"></i> Tạo lớp sinh viên</button>' +
                '    </div>' +
                '    <div class="card-body">' +
                '      <div class="table-responsive">' +
                '        <table class="data-table">' +
                '          <thead><tr><th>STT</th><th>Mã lớp</th><th>Tên lớp</th><th>Khóa học</th><th>Chương trình đào tạo</th><th class="text-center">Sĩ số sinh viên</th><th class="text-center">Thao tác</th></tr></thead>' +
                '          <tbody id="lopSVTableBody"></tbody>' +
                '        </table>' +
                '      </div>' +
                '    </div>' +
                '  </div>' +
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

            // Action triggers
            $('#btnThemKhoa').on('click', function () { self.showKhoaModal(); });
            $('#btnThemChuyenNganh').on('click', function () { self.showChuyenNganhModal(); });
            $('#btnThemCTDT').on('click', function () { self.showCTDTModal(); });
            $('#btnThemNhomTC').on('click', function () { self.showNhomTCModal(); });
            $('#btnThemLopSV').on('click', function () { self.showLopSVModal(); });

            $(document).off('click', '.btn-del-khoa').on('click', '.btn-del-khoa', function () {
                var id = $(this).data('id');
                self.deleteKhoa(id);
            });
            $(document).off('click', '.btn-del-lopsv').on('click', '.btn-del-lopsv', function () {
                var id = $(this).data('id');
                self.deleteLopSV(id);
            });
        },

        loadAll: function () {
            this.loadCTDT();
            this.loadNhomTC();
            this.loadKhoa();
            this.loadLopSV();
        },

        loadCTDT: function () {
            var list = MockDB.chuong_trinh_dao_tao.getAll();
            var tbody = $('#ctdtTableBody').empty();
            list.forEach(function (c, idx) {
                var cn = MockDB.chuyen_nganh.getById(c.chuyen_nganh_id);
                var countMon = MockDB.chi_tiet_chuong_trinh.getAll({ chuong_trinh_id: c.id }).length;
                tbody.append(
                    '<tr>' +
                    '  <td class="text-center">' + (idx + 1) + '</td>' +
                    '  <td><strong>' + App.escapeHtml(c.ma_chuong_trinh) + '</strong></td>' +
                    '  <td>' + App.escapeHtml(c.ten_chuong_trinh) + '</td>' +
                    '  <td>' + (cn ? App.escapeHtml(cn.ten_chuyen_nganh) : '—') + '</td>' +
                    '  <td>' + App.escapeHtml(c.thoi_gian_dao_tao || '4 năm') + '</td>' +
                    '  <td class="text-center"><span class="badge badge-info">' + countMon + ' môn bắt buộc</span></td>' +
                    '  <td class="text-center"><button class="btn btn-sm btn-outline"><i class="fa-solid fa-eye"></i> Xem khung</button></td>' +
                    '</tr>'
                );
            });
        },

        loadNhomTC: function () {
            var list = MockDB.nhom_tu_chon.getAll();
            var tbody = $('#nhomTCTableBody').empty();
            list.forEach(function (n, idx) {
                var ctdt = MockDB.chuong_trinh_dao_tao.getById(n.chuong_trinh_id);
                var details = MockDB.chi_tiet_nhom_tu_chon.getAll({ nhom_tu_chon_id: n.id });
                var monNames = details.map(function (d) {
                    var m = MockDB.mon_hoc.getById(d.mon_hoc_id);
                    return m ? m.ma_mon_hoc + ' (' + m.so_tin_chi + 'TC)' : '';
                }).filter(Boolean).join(', ');

                tbody.append(
                    '<tr>' +
                    '  <td class="text-center">' + (idx + 1) + '</td>' +
                    '  <td><strong>' + App.escapeHtml(n.ma_nhom) + '</strong></td>' +
                    '  <td>' + App.escapeHtml(n.ten_nhom) + '</td>' +
                    '  <td>' + (ctdt ? App.escapeHtml(ctdt.ten_chuong_trinh) : '—') + '</td>' +
                    '  <td class="text-center"><span class="badge badge-primary">Tối thiểu ' + n.so_tin_chi_toi_thieu + ' TC</span></td>' +
                    '  <td><small>' + (monNames || 'Chưa có môn') + '</small></td>' +
                    '  <td class="text-center"><button class="btn btn-sm btn-outline"><i class="fa-solid fa-pen"></i></button></td>' +
                    '</tr>'
                );
            });
        },

        loadKhoa: function () {
            var khoas = MockDB.khoa.getAll();
            var tbodyKhoa = $('#khoaTableBody').empty();
            khoas.forEach(function (k, idx) {
                var countCN = MockDB.chuyen_nganh.getAll({ khoa_id: k.id }).length;
                tbodyKhoa.append(
                    '<tr>' +
                    '  <td class="text-center">' + (idx + 1) + '</td>' +
                    '  <td><strong>' + App.escapeHtml(k.ma_khoa) + '</strong></td>' +
                    '  <td>' + App.escapeHtml(k.ten_khoa) + '</td>' +
                    '  <td class="text-center">' + countCN + ' chuyên ngành</td>' +
                    '  <td class="text-center"><button class="btn btn-sm btn-outline btn-del-khoa text-danger" data-id="' + k.id + '"><i class="fa-solid fa-trash"></i></button></td>' +
                    '</tr>'
                );
            });

            var cns = MockDB.chuyen_nganh.getAll();
            var tbodyCN = $('#chuyenNganhTableBody').empty();
            cns.forEach(function (cn, idx) {
                var k = MockDB.khoa.getById(cn.khoa_id);
                tbodyCN.append(
                    '<tr>' +
                    '  <td class="text-center">' + (idx + 1) + '</td>' +
                    '  <td><strong>' + App.escapeHtml(cn.ma_chuyen_nganh) + '</strong></td>' +
                    '  <td>' + App.escapeHtml(cn.ten_chuyen_nganh) + '</td>' +
                    '  <td>' + (k ? App.escapeHtml(k.ten_khoa) : '—') + '</td>' +
                    '  <td class="text-center"><button class="btn btn-sm btn-outline"><i class="fa-solid fa-pen"></i></button></td>' +
                    '</tr>'
                );
            });
        },

        loadLopSV: function () {
            var list = MockDB.lop_sinh_vien.getAll();
            var tbody = $('#lopSVTableBody').empty();
            list.forEach(function (l, idx) {
                var c = MockDB.chuong_trinh_dao_tao.getById(l.chuong_trinh_id);
                var countSV = MockDB.users.getAll({ lop_sinh_vien_id: l.id }).length;
                tbody.append(
                    '<tr>' +
                    '  <td class="text-center">' + (idx + 1) + '</td>' +
                    '  <td><strong>' + App.escapeHtml(l.ma_lop) + '</strong></td>' +
                    '  <td>' + App.escapeHtml(l.ten_lop) + '</td>' +
                    '  <td>' + App.escapeHtml(l.khoa_hoc || '—') + '</td>' +
                    '  <td>' + (c ? App.escapeHtml(c.ten_chuong_trinh) : '—') + '</td>' +
                    '  <td class="text-center"><span class="badge badge-success">' + countSV + ' sinh viên</span></td>' +
                    '  <td class="text-center"><button class="btn btn-sm btn-outline btn-del-lopsv text-danger" data-id="' + l.id + '"><i class="fa-solid fa-trash"></i></button></td>' +
                    '</tr>'
                );
            });
        },

        showKhoaModal: function () {
            var self = this;
            var html =
                '<div class="modal-header"><h3><i class="fa-solid fa-plus"></i> Thêm Khoa đào tạo</h3><button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
                '<div class="modal-body">' +
                '  <div class="form-group"><label>Mã Khoa <span class="required">*</span></label><input type="text" class="form-control" id="kMa" placeholder="VD: CNTT"></div>' +
                '  <div class="form-group"><label>Tên Khoa <span class="required">*</span></label><input type="text" class="form-control" id="kTen" placeholder="VD: Công nghệ Thông tin"></div>' +
                '</div>' +
                '<div class="modal-footer"><button class="btn btn-outline" onclick="App.closeModal()">Hủy</button><button class="btn btn-primary" id="btnSaveKhoa">Lưu Khoa</button></div>';
            App.showModal(html);
            $(document).off('click', '#btnSaveKhoa').on('click', '#btnSaveKhoa', function () {
                var ma = $('#kMa').val().trim().toUpperCase();
                var ten = $('#kTen').val().trim();
                if (!ma || !ten) { App.showToast('Vui lòng nhập đủ thông tin!', 'error'); return; }
                MockDB.khoa.create({ ma_khoa: ma, ten_khoa: ten });
                App.closeModal();
                App.showToast('Thêm Khoa thành công!', 'success');
                self.loadKhoa();
            });
        },

        showLopSVModal: function () {
            var self = this;
            var ctdts = MockDB.chuong_trinh_dao_tao.getAll();
            var options = ctdts.map(function (c) {
                return '<option value="' + c.id + '">' + c.ma_chuong_trinh + ' - ' + c.ten_chuong_trinh + '</option>';
            }).join('');

            var html =
                '<div class="modal-header"><h3><i class="fa-solid fa-plus"></i> Tạo Lớp sinh viên</h3><button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
                '<div class="modal-body">' +
                '  <div class="form-row">' +
                '    <div class="form-group"><label>Mã lớp <span class="required">*</span></label><input type="text" class="form-control" id="lMa" placeholder="VD: KTPM2026"></div>' +
                '    <div class="form-group"><label>Khóa học</label><input type="text" class="form-control" id="lKhoa" placeholder="2026-2030"></div>' +
                '  </div>' +
                '  <div class="form-group"><label>Tên lớp sinh viên <span class="required">*</span></label><input type="text" class="form-control" id="lTen" placeholder="VD: Kỹ thuật phần mềm Khóa 2026"></div>' +
                '  <div class="form-group"><label>Chương trình đào tạo áp dụng <span class="required">*</span></label><select class="form-control" id="lCTDT">' + options + '</select></div>' +
                '</div>' +
                '<div class="modal-footer"><button class="btn btn-outline" onclick="App.closeModal()">Hủy</button><button class="btn btn-primary" id="btnSaveLopSV">Lưu Lớp SV</button></div>';
            App.showModal(html);
            $(document).off('click', '#btnSaveLopSV').on('click', '#btnSaveLopSV', function () {
                var ma = $('#lMa').val().trim().toUpperCase();
                var ten = $('#lTen').val().trim();
                var kh = $('#lKhoa').val().trim();
                var ctdtId = parseInt($('#lCTDT').val(), 10);
                if (!ma || !ten || !ctdtId) { App.showToast('Vui lòng nhập đủ thông tin!', 'error'); return; }
                MockDB.lop_sinh_vien.create({ ma_lop: ma, ten_lop: ten, khoa_hoc: kh, chuong_trinh_id: ctdtId });
                App.closeModal();
                App.showToast('Tạo lớp sinh viên thành công!', 'success');
                self.loadLopSV();
            });
        },

        deleteKhoa: function (id) {
            var self = this;
            var hasGv = MockDB.users.getAll({ khoa_id: id }).length > 0;
            var hasCn = MockDB.chuyen_nganh.getAll({ khoa_id: id }).length > 0;
            if (hasGv || hasCn) {
                App.showToast('Không thể xóa! Khoa đang có giảng viên hoặc chuyên ngành trực thuộc', 'error');
                return;
            }
            App.confirm('Bạn có chắc muốn xóa Khoa này?', function () {
                MockDB.khoa.remove(id);
                App.showToast('Đã xóa Khoa thành công!', 'success');
                self.loadKhoa();
            });
        },

        deleteLopSV: function (id) {
            var self = this;
            var hasSv = MockDB.users.getAll({ lop_sinh_vien_id: id }).length > 0;
            if (hasSv) {
                App.showToast('Không thể xóa! Lớp này đang có sinh viên sinh hoạt', 'error');
                return;
            }
            App.confirm('Bạn có chắc muốn xóa Lớp sinh viên này?', function () {
                MockDB.lop_sinh_vien.remove(id);
                App.showToast('Đã xóa Lớp sinh viên thành công!', 'success');
                self.loadLopSV();
            });
        }
    };

    App.registerModule('co-cau-dao-tao', CoCauDaoTaoModule);
})(jQuery);
