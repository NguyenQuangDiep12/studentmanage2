/* ================================================================
   LOP-HOC-PHAN.JS - Quản lý lớp học phần và lịch học
   An toàn dữ liệu: Sửa lịch không làm mất điểm danh cũ
   Kiểm tra trùng phòng học, trùng lịch giảng viên, giới hạn sĩ số
   Font Awesome icons, XSS protection, phân quyền chuẩn
   ================================================================ */

(function ($) {
    'use strict';

    var LopHocPhanModule = {
        render: function () {
            var currentUser = App.getCurrentUser();
            var isAdmin = currentUser && currentUser.vai_tro === 'admin';
            var isGV = currentUser && currentUser.vai_tro === 'giang_vien';

            var pageHeading = isGV ? 'Lớp học phần phụ trách' : 'Danh sách Lớp học phần';

            var html =
                '<div class="card">' +
                '  <div class="card-header">' +
                '    <h3><i class="fa-solid fa-school" style="color:var(--primary);"></i> ' + pageHeading + '</h3>' +
                ((isAdmin || isGV) ? '    <button class="btn btn-primary" id="btnThemLHP"><i class="fa-solid fa-plus"></i> Tạo lớp học phần mới</button>' : '') +
                '  </div>' +
                '  <div class="card-body">' +
                '    <div class="toolbar">' +
                '      <div class="toolbar-left">' +
                '        <div class="search-box">' +
                '          <i class="fa-solid fa-magnifying-glass search-icon"></i>' +
                '          <input type="text" id="searchLHP" placeholder="Tìm mã lớp HP, môn học, giảng viên">' +
                '        </div>' +
                '        <select id="filterHocKyLHP" class="filter-select">' +
                '          <option value="">-- Tất cả học kỳ --</option>' +
                '          <option value="1">Học kỳ 1</option>' +
                '          <option value="2">Học kỳ 2</option>' +
                '          <option value="3">Học kỳ Hè</option>' +
                '        </select>' +
                '        <select id="filterNamHocLHP" class="filter-select">' +
                '          <option value="">-- Tất cả năm học --</option>' +
                '        </select>' +
                '        <select id="filterTrangThaiLHP" class="filter-select">' +
                '          <option value="">-- Trạng thái --</option>' +
                '          <option value="Đang mở">Đang mở</option>' +
                '          <option value="Đã đóng">Đã đóng</option>' +
                '          <option value="Đã hủy">Đã hủy</option>' +
                '        </select>' +
                '      </div>' +
                '      <div class="toolbar-right">' +
                '        <span class="text-muted" id="totalLHPCount">Tổng số: 0 lớp</span>' +
                '      </div>' +
                '    </div>' +
                '    <div class="table-responsive">' +
                '      <table class="data-table" id="tableLHP">' +
                '        <thead>' +
                '          <tr>' +
                '            <th>STT</th>' +
                '            <th>Mã lớp HP</th>' +
                '            <th>Môn học</th>' +
                '            <th>Giảng viên</th>' +
                '            <th class="text-center">HK - Năm học</th>' +
                '            <th class="text-center">Sĩ số</th>' +
                '            <th>Phòng</th>' +
                '            <th>Lịch học tuần</th>' +
                '            <th>Thời hạn đăng ký</th>' +
                '            <th class="text-center">Trạng thái</th>' +
                '            <th class="text-center">Thao tác</th>' +
                '          </tr>' +
                '        </thead>' +
                '        <tbody id="lhpTableBody">' +
                '        </tbody>' +
                '      </table>' +
                '    </div>' +
                '  </div>' +
                '</div>';

            $('#contentArea').html(html);
            this.bindEvents();
            var self = this;
            App.fillTermSelects('#filterHocKyLHP', '#filterNamHocLHP', {}, function () { self.loadData(); });
        },

        bindEvents: function () {
            var self = this;

            $('#searchLHP, #filterHocKyLHP, #filterNamHocLHP, #filterTrangThaiLHP').on('change input', function () {
                self.loadData();
            });

            $('#btnThemLHP').on('click', function () {
                self.showFormModal();
            });

            $(document).off('click', '.btn-view-lhp').on('click', '.btn-view-lhp', function () {
                var id = $(this).data('id');
                self.showDetailModal(id);
            });

            $(document).off('click', '.btn-edit-lhp').on('click', '.btn-edit-lhp', function () {
                var id = $(this).data('id');
                self.showFormModal(id);
            });

            $(document).off('click', '.btn-del-lhp').on('click', '.btn-del-lhp', function () {
                var id = $(this).data('id');
                self.deleteLHP(id);
            });

            $(document).off('click', '#btnSaveLHP').on('click', '#btnSaveLHP', function () {
                self.saveLHP();
            });

            // Tạo lớp học phần khi chưa có môn: chuyển sang trang Môn học để tạo trước
            $(document).off('click', '#lnkTaoMonHoc').on('click', '#lnkTaoMonHoc', function () {
                App.closeModal();
                App.navigate('mon-hoc');
                setTimeout(function () { $('#btnThemMonHoc').trigger('click'); }, 400);
            });

            $(document).off('click', '#btnPreviewLHP').on('click', '#btnPreviewLHP', function () {
                self.previewLHP();
            });

            $(document).off('click', '#btnAddScheduleRow').on('click', '#btnAddScheduleRow', function () {
                self.addScheduleRow();
            });

            $(document).off('click', '.btn-remove-schedule').on('click', '.btn-remove-schedule', function () {
                $(this).closest('.schedule-item-row').remove();
            });
        },

        loadData: function () {
            var currentUser = App.getCurrentUser();
            var isAdmin = currentUser && currentUser.vai_tro === 'admin';
            var isGV = currentUser && currentUser.vai_tro === 'giang_vien';

            var self = this;
            var params = {
                search: ($('#searchLHP').val() || '').trim(),
                hoc_ky: $('#filterHocKyLHP').val(),
                nam_hoc: $('#filterNamHocLHP').val(),
                trang_thai: $('#filterTrangThaiLHP').val()
            };

            // Lọc, tìm kiếm và phân quyền (GV chỉ thấy lớp phụ trách) do backend xử lý
            Api.get('/api/lophocphan', params)
                .done(function (res) {
                    self.cache = res.data || [];
                    self.renderRows(self.cache, currentUser, isAdmin, isGV);
                })
                .fail(Api.toastError);
        },

        renderRows: function (list, currentUser, isAdmin, isGV) {
            $('#totalLHPCount').text('Tổng số: ' + list.length + ' lớp học phần');

            var tbody = $('#lhpTableBody');
            tbody.empty();

            if (list.length === 0) {
                tbody.html('<tr><td colspan="11" class="text-center text-muted py-4">Không tìm thấy lớp học phần nào</td></tr>');
                return;
            }

            list.forEach(function (l, idx) {
                var mh = { ten_mon_hoc: l.ten_mon_hoc, so_tin_chi: l.so_tin_chi };
                var gv = l.ten_giang_vien ? { ho_ten: l.ten_giang_vien } : null;
                var siSoHienTai = l.si_so_hien_tai || 0;
                var lichList = l.lich_hoc || [];

                var lichSummary = lichList.map(function (lh) {
                    return App.thuLabel(lh.thu) + ' (T' + lh.tiet_bat_dau + '-' + lh.tiet_ket_thuc + ')';
                }).join(', ');
                if (!lichSummary) lichSummary = '<span class="text-muted">Chưa xếp lịch</span>';

                var siSoClass = siSoHienTai >= l.si_so_toi_da ? 'text-danger text-bold' : '';

                var hanDK = (l.thoi_gian_mo_dang_ky && l.thoi_gian_dong_dang_ky)
                    ? '<small>' + App.formatDate(l.thoi_gian_mo_dang_ky) + ' → ' + App.formatDate(l.thoi_gian_dong_dang_ky) + '</small>'
                    : '<span class="text-muted">—</span>';

                // Chỉ admin hoặc chính giảng viên phụ trách mới sửa được lớp của mình
                var canEditThis = isAdmin || (isGV && l.giang_vien_user_id === currentUser.id);

                var row =
                    '<tr>' +
                    '  <td class="text-center">' + (idx + 1) + '</td>' +
                    '  <td><strong>' + App.escapeHtml(l.ma_lop_hoc_phan) + '</strong></td>' +
                    '  <td>' + (mh ? App.escapeHtml(mh.ten_mon_hoc) + ' (' + mh.so_tin_chi + ' TC)' : '—') + '</td>' +
                    '  <td>' + (gv ? App.escapeHtml(gv.ho_ten) : '<span class="text-muted">Chưa phân công</span>') + '</td>' +
                    '  <td class="text-center">HK' + l.hoc_ky + ' (' + App.escapeHtml(l.nam_hoc) + ')</td>' +
                    '  <td class="text-center ' + siSoClass + '">' + siSoHienTai + ' / ' + l.si_so_toi_da + '</td>' +
                    '  <td>' + App.escapeHtml(l.phong_hoc || '—') + '</td>' +
                    '  <td><small>' + lichSummary + '</small></td>' +
                    '  <td>' + hanDK + '</td>' +
                    '  <td class="text-center">' + App.trangThaiLHPBadge(l.trang_thai) + '</td>' +
                    '  <td class="text-center">' +
                    '    <div class="table-actions table-actions-stack">' +
                    '      <button class="btn btn-sm btn-outline btn-view-lhp" data-id="' + l.id + '" title="Xem chi tiết">Xem</button>' +
                    (canEditThis ?
                    '      <button class="btn btn-sm btn-outline btn-edit-lhp" data-id="' + l.id + '" title="Sửa">Sửa</button>' +
                    '      <button class="btn btn-sm btn-outline btn-del-lhp text-danger" data-id="' + l.id + '" title="Hủy/Xóa lớp">Xóa</button>' : '') +
                    '    </div>' +
                    '  </td>' +
                    '</tr>';
                tbody.append(row);
            });
        },

        showFormModal: function (id) {
            var self = this;
            var reqs = [Api.get('/api/lophocphan/form-data')];
            if (id) reqs.push(Api.get('/api/lophocphan/chi-tiet', { id: id }));

            $.when.apply($, reqs)
                .done(function (formRes, detailRes) {
                    // $.when trả về [data, status, xhr] cho từng request khi có nhiều request
                    var fd = id ? formRes[0].data : formRes.data;
                    var lhp = id ? detailRes[0].data : null;
                    self.renderFormModal(lhp, fd.mon_hoc || [], fd.giang_vien || []);
                })
                .fail(Api.toastError);
        },

        renderFormModal: function (lhp, allMonHoc, allGiangVien) {
            var isEdit = !!lhp;
            var existingLich = isEdit ? (lhp.lich_hoc || []) : [];

            // Lớp đang dạy môn đã tạm ngưng vẫn hiện môn hiện tại trong danh sách
            if (isEdit && !allMonHoc.some(function (m) { return m.id === lhp.mon_hoc_id; })) {
                allMonHoc = [{ id: lhp.mon_hoc_id, ma_mon_hoc: lhp.ma_mon_hoc, ten_mon_hoc: lhp.ten_mon_hoc, so_tin_chi: lhp.so_tin_chi }].concat(allMonHoc);
            }

            var mhOptions = allMonHoc.map(function (m) {
                var sel = lhp && lhp.mon_hoc_id === m.id ? 'selected' : '';
                return '<option value="' + m.id + '" ' + sel + '>' + App.escapeHtml(m.ma_mon_hoc) + ' - ' + App.escapeHtml(m.ten_mon_hoc) + ' (' + m.so_tin_chi + ' TC)</option>';
            }).join('');

            // Giảng viên: chỉ có chính mình trong danh sách và ô bị khóa (backend cũng ép phụ trách = chính mình)
            var currentUser = App.getCurrentUser();
            var isGV = currentUser && currentUser.vai_tro === 'giang_vien';
            var gvOptions = (isGV ? '' : '<option value="">-- Chưa chỉ định --</option>') + allGiangVien.map(function (g) {
                var sel = (lhp && lhp.giang_vien_user_id === g.id) || (isGV && g.id === currentUser.id) ? 'selected' : '';
                return '<option value="' + g.id + '" ' + sel + '>' + App.escapeHtml(g.ma_dinh_danh) + ' - ' + App.escapeHtml(g.ho_ten) + '</option>';
            }).join('');

            // Thời gian đăng ký do quản trị viên nhập (RULE-08), không gán sẵn ngày cố định
            var moDK = lhp && lhp.thoi_gian_mo_dang_ky ? lhp.thoi_gian_mo_dang_ky.substring(0, 10) : '';
            var dongDK = lhp && lhp.thoi_gian_dong_dang_ky ? lhp.thoi_gian_dong_dang_ky.substring(0, 10) : '';

            // Năm học lấy từ API; giữ năm học hiện có của lớp khi sửa
            var terms = App.getTerms() || { nam_hoc: [], hien_tai: {} };
            var years = terms.nam_hoc.slice();
            if (lhp && years.indexOf(lhp.nam_hoc) === -1) years.push(lhp.nam_hoc);
            var selectedYear = lhp ? lhp.nam_hoc : (terms.hien_tai && terms.hien_tai.nam_hoc);
            var namHocOptions = years.map(function (y) {
                return '<option value="' + App.escapeHtml(y) + '" ' + (y === selectedYear ? 'selected' : '') + '>' + App.escapeHtml(y) + '</option>';
            }).join('');
            this.defaultTerm = terms.hien_tai || {};

            var html =
                '<div class="modal-header">' +
                '  <h3><i class="fa-solid ' + (isEdit ? 'fa-pen' : 'fa-plus') + '"></i> ' + (isEdit ? 'Cập nhật Lớp học phần' : 'Tạo mới Lớp học phần & Lịch học') + '</h3>' +
                '  <button class="modal-close" onclick="App.closeModal()">&times;</button>' +
                '</div>' +
                '<div class="modal-body">' +
                '  <input type="hidden" id="lhpId" value="' + (lhp ? lhp.id : '') + '">' +
                '  <div class="form-row">' +
                '    <div class="form-group">' +
                '      <label>Mã lớp học phần <span class="required">*</span></label>' +
                '      <input type="text" class="form-control" id="lhpMa" value="' + (lhp ? App.escapeHtml(lhp.ma_lop_hoc_phan) : '') + '" placeholder="VD: CS101-HK1-2026" ' + (isEdit ? 'readonly' : '') + '>' +
                '    </div>' +
                '    <div class="form-group">' +
                '      <label>Môn học <span class="required">*</span>' +
                (isEdit ? '' : ' <a href="javascript:void(0)" id="lnkTaoMonHoc" style="font-weight:500; font-size:0.8rem; margin-left:6px;">Chưa có môn? Tạo môn học</a>') +
                '</label>' +
                (mhOptions
                    ? '      <select class="form-control" id="lhpMonHoc">' + mhOptions + '</select>'
                    : '      <select class="form-control" id="lhpMonHoc"><option value="">Chưa có môn học đang hoạt động - hãy tạo môn học trước</option></select>') +
                '    </div>' +
                '  </div>' +
                '  <div class="form-row">' +
                '    <div class="form-group">' +
                '      <label>Giảng viên phụ trách</label>' +
                '      <select class="form-control" id="lhpGiangVien"' + (isGV ? ' disabled' : '') + '>' + gvOptions + '</select>' +
                '    </div>' +
                '    <div class="form-group">' +
                '      <label>Phòng học <span class="required">*</span></label>' +
                '      <input type="text" class="form-control" id="lhpPhong" value="' + (lhp ? App.escapeHtml(lhp.phong_hoc || '') : '') + '" placeholder="VD: A101">' +
                '    </div>' +
                '  </div>' +
                '  <div class="form-row">' +
                '    <div class="form-group">' +
                '      <label>Học kỳ <span class="required">*</span></label>' +
                '      <select class="form-control" id="lhpHocKy">' +
                '        <option value="1" ' + ((lhp ? lhp.hoc_ky : parseInt(this.defaultTerm.hoc_ky, 10)) === 1 ? 'selected' : '') + '>Học kỳ 1</option>' +
                '        <option value="2" ' + ((lhp ? lhp.hoc_ky : parseInt(this.defaultTerm.hoc_ky, 10)) === 2 ? 'selected' : '') + '>Học kỳ 2</option>' +
                '        <option value="3" ' + ((lhp ? lhp.hoc_ky : parseInt(this.defaultTerm.hoc_ky, 10)) === 3 ? 'selected' : '') + '>Học kỳ Hè</option>' +
                '      </select>' +
                '    </div>' +
                '    <div class="form-group">' +
                '      <label>Năm học <span class="required">*</span></label>' +
                '      <select class="form-control" id="lhpNamHoc">' +
                namHocOptions +
                '      </select>' +
                '    </div>' +
                '    <div class="form-group">' +
                '      <label>Sĩ số tối đa <span class="required">*</span></label>' +
                '      <input type="number" min="5" max="150" class="form-control" id="lhpSiSo" value="' + (lhp ? lhp.si_so_toi_da : '40') + '">' +
                '    </div>' +
                '    <div class="form-group">' +
                '      <label>Trạng thái</label>' +
                '      <select class="form-control" id="lhpTrangThai">' +
                '        <option value="Đang mở" ' + (lhp && lhp.trang_thai === 'Đang mở' ? 'selected' : '') + '>Đang mở</option>' +
                '        <option value="Đã đóng" ' + (lhp && lhp.trang_thai === 'Đã đóng' ? 'selected' : '') + '>Đã đóng</option>' +
                '        <option value="Đã hủy" ' + (lhp && lhp.trang_thai === 'Đã hủy' ? 'selected' : '') + '>Đã hủy</option>' +
                '      </select>' +
                '    </div>' +
                '  </div>' +

                // RULE-HK-01, RULE-HK-03: ngày học lấy từ học kỳ đã khai báo
                '  <div id="lhpTermInfo" class="mb-3" style="font-size:0.82rem;"></div>' +
                '  <!-- Thời hạn mở/đóng đăng ký -->' +
                '  <div class="form-row">' +
                '    <div class="form-group">' +
                '      <label>Ngày bắt đầu mở đăng ký <span class="required">*</span></label>' +
                '      <input type="date" class="form-control" id="lhpNgayMoDK" value="' + moDK + '">' +
                '    </div>' +
                '    <div class="form-group">' +
                '      <label>Ngày kết thúc đăng ký <span class="required">*</span></label>' +
                '      <input type="date" class="form-control" id="lhpNgayDongDK" value="' + dongDK + '">' +
                '    </div>' +
                '  </div>' +

                '  <hr style="border:0; border-top:1px dashed var(--border-color); margin:18px 0;">' +

                '  <div class="d-flex justify-between align-center mb-2">' +
                '    <h4 style="font-size:0.95rem; font-weight:800;"><i class="fa-solid fa-calendar-days" style="color:var(--primary);"></i> Lịch học trong tuần</h4>' +
                '    <button type="button" class="btn btn-sm btn-outline-primary" id="btnAddScheduleRow"><i class="fa-solid fa-plus"></i> Thêm buổi học trong tuần</button>' +
                '  </div>' +
                '  <p class="text-muted mb-2" style="font-size:0.8rem;">Chọn thứ học và khung tiết. Hệ thống lấy tổng số tiết của môn, xếp lần lượt vào các ngày của thứ đã chọn trong học kỳ, bỏ qua ngày trùng lịch giảng viên / phòng học và dừng khi đủ tiết; buổi cuối chỉ lấy đúng số tiết còn thiếu. Chỉ lưu được khi xếp đủ tiết. Bấm "Xem trước lịch" để kiểm tra trước khi lưu.</p>' +
                '  <div id="scheduleContainer">' +
                '  </div>' +
                '  <div id="lhpPreview" class="mt-3"></div>' +
                '</div>' +
                '<div class="modal-footer">' +
                '  <button class="btn btn-outline" onclick="App.closeModal()">Hủy</button>' +
                '  <button class="btn btn-outline-primary" id="btnPreviewLHP"><i class="fa-solid fa-eye"></i> Xem trước lịch</button>' +
                '  <button class="btn btn-primary" id="btnSaveLHP"><i class="fa-solid fa-floppy-disk"></i> Lưu lớp học phần</button>' +
                '</div>';

            App.showModal(html, 'xl');

            var self = this;
            var showTerm = function () {
                // RULE-HK-04: dùng đúng ngày bắt đầu / kết thúc đã khai báo, không mặc định độ dài học kỳ
                var hk = parseInt($('#lhpHocKy').val(), 10), nh = $('#lhpNamHoc').val();
                var term = ((App.getTerms() || {}).hoc_ky || []).find(function (x) {
                    return parseInt(x.hoc_ky, 10) === hk && x.nam_hoc === nh && parseInt(x.da_khai_bao, 10) === 1;
                });
                $('#lhpTermInfo').html(term
                    ? '<span class="text-muted"><i class="fa-solid fa-calendar-check"></i> Học kỳ ' + hk + ' (' + nh + '): ' + App.formatDate(term.bat_dau) + ' → ' + App.formatDate(term.ket_thuc) + '. Mọi buổi học được xếp trong khoảng này.</span>'
                    : '<span class="text-warning"><i class="fa-solid fa-triangle-exclamation"></i> Học kỳ ' + hk + ' năm học ' + nh + ' chưa được khai báo ngày bắt đầu / kết thúc (Cơ cấu đào tạo > Học kỳ).</span>');
            };
            $('#lhpHocKy, #lhpNamHoc').on('change', showTerm);
            showTerm();
            if (existingLich.length > 0) {
                existingLich.forEach(function (lh) {
                    self.addScheduleRow(lh);
                });
            } else {
                self.addScheduleRow();
            }
        },

        addScheduleRow: function (data) {
            // RULE-LHP-01: mỗi dòng là một thứ học với tiết bắt đầu / kết thúc (ngày lấy theo học kỳ)
            data = data || { thu: 2, tiet_bat_dau: 1, tiet_ket_thuc: 3 };

            var rowHtml =
                '<div class="schedule-item-row p-3 mb-2" style="background:#f8fafc; border:1px solid var(--border-color); border-radius:10px;">' +
                '  <div class="form-row align-center">' +
                '    <div class="form-group mb-0" style="flex:1;">' +
                '      <label style="font-size:0.8rem;">Thứ</label>' +
                '      <select class="form-control sch-thu">' +
                '        <option value="2" ' + (data.thu == 2 ? 'selected' : '') + '>Thứ 2</option>' +
                '        <option value="3" ' + (data.thu == 3 ? 'selected' : '') + '>Thứ 3</option>' +
                '        <option value="4" ' + (data.thu == 4 ? 'selected' : '') + '>Thứ 4</option>' +
                '        <option value="5" ' + (data.thu == 5 ? 'selected' : '') + '>Thứ 5</option>' +
                '        <option value="6" ' + (data.thu == 6 ? 'selected' : '') + '>Thứ 6</option>' +
                '        <option value="7" ' + (data.thu == 7 ? 'selected' : '') + '>Thứ 7</option>' +
                '      </select>' +
                '    </div>' +
                '    <div class="form-group mb-0" style="flex:0.8;">' +
                '      <label style="font-size:0.8rem;">Tiết BĐ</label>' +
                '      <input type="number" min="1" max="13" class="form-control sch-tbd" value="' + data.tiet_bat_dau + '">' +
                '    </div>' +
                '    <div class="form-group mb-0" style="flex:0.8;">' +
                '      <label style="font-size:0.8rem;">Tiết KT</label>' +
                '      <input type="number" min="1" max="13" class="form-control sch-tkt" value="' + data.tiet_ket_thuc + '">' +
                '    </div>' +
                '    <div class="form-group mb-0" style="flex:0.3; text-align:center; padding-top:20px;">' +
                '      <button type="button" class="btn btn-sm btn-danger btn-remove-schedule" title="Xóa lịch">Xóa lịch</button>' +
                '    </div>' +
                '  </div>' +
                '</div>';

            $('#scheduleContainer').append(rowHtml);
        },

        /** RULE-THIEU-06: xem trước các buổi sẽ được xếp (chưa lưu); RULE-XL-06: hiện ngày bị bỏ qua do xung đột */
        previewLHP: function () {
            var id = $('#lhpId').val();
            var payload = this.collectPayload();
            if (id) payload.id = parseInt(id, 10);

            Api.post('/api/lophocphan/xem-truoc-lich', payload).done(function (res) {
                var d = res.data;
                // RULE-HL-01: chỉ hợp lệ khi tổng số tiết đã xếp bằng tổng số tiết yêu cầu
                var html = '<div class="alert ' + (d.hop_le ? 'alert-info' : 'alert-danger') + '" style="font-size:0.85rem;">' +
                    '<strong>' + App.escapeHtml(d.mon_hoc.ma_mon_hoc + ' - ' + d.mon_hoc.ten_mon_hoc) + '</strong>: cần ' + d.tong_tiet_mon + ' tiết. ' +
                    App.escapeHtml(res.message) + (d.hop_le ? ' <strong>Lịch hợp lệ, có thể lưu.</strong>' : ' <strong>Chưa thể lưu.</strong>') + '</div>';
                // RULE-XL-06: ngày bị bỏ qua do xung đột giảng viên / phòng học
                if (d.bo_qua.length) {
                    html += '<details class="mb-2" style="font-size:0.82rem;"><summary class="text-warning">' + d.bo_qua.length + ' ngày bị bỏ qua do xung đột (bấm để xem)</summary><ul class="mt-1">' +
                        d.bo_qua.map(function (x) {
                            return '<li>' + App.thuLabel(x.thu) + ' ' + App.formatDate(x.ngay_hoc) + ' (tiết ' + x.tiet_bat_dau + '-' + x.tiet_ket_thuc + '): ' + App.escapeHtml(x.ly_do) + '</li>';
                        }).join('') + '</ul></details>';
                }
                var luyKe = 0;
                html += '<div style="max-height:280px; overflow:auto;"><table class="data-table"><thead><tr>' +
                    '<th class="text-center">Buổi</th><th>Ngày học</th><th>Thứ</th><th class="text-center">Tiết</th><th>Giờ học</th><th class="text-center">Số tiết</th><th class="text-center">Lũy kế</th></tr></thead><tbody>';
                d.buoi.forEach(function (b, i) {
                    luyKe += b.so_tiet;
                    html += '<tr><td class="text-center">' + (i + 1) + '</td><td>' + App.formatDate(b.ngay_hoc) + '</td><td>' + App.thuLabel(b.thu) + '</td>' +
                        '<td class="text-center">' + b.tiet_bat_dau + ' - ' + b.tiet_ket_thuc + '</td><td>' + App.gioHoc(b.tiet_bat_dau, b.tiet_ket_thuc) + '</td>' +
                        '<td class="text-center">' + b.so_tiet + (b.co_dinh ? ' <small class="text-muted">(đã điểm danh)</small>' : '') + '</td>' +
                        '<td class="text-center">' + luyKe + '/' + d.tong_tiet_mon + '</td></tr>';
                });
                html += '</tbody></table></div>';
                $('#lhpPreview').html(html);
            }).fail(function (xhr) {
                $('#lhpPreview').empty();
                Api.toastError(xhr);
            });
        },

        collectPayload: function () {
            var schedules = [];
            $('.schedule-item-row').each(function () {
                var $row = $(this);
                schedules.push({
                    thu: $row.find('.sch-thu').val(),
                    tiet_bat_dau: $row.find('.sch-tbd').val(),
                    tiet_ket_thuc: $row.find('.sch-tkt').val()
                });
            });

            var payload = {
                ma_lop_hoc_phan: $('#lhpMa').val(),
                mon_hoc_id: $('#lhpMonHoc').val(),
                giang_vien_user_id: $('#lhpGiangVien').val(),
                phong_hoc: $('#lhpPhong').val(),
                hoc_ky: $('#lhpHocKy').val(),
                nam_hoc: $('#lhpNamHoc').val(),
                si_so_toi_da: $('#lhpSiSo').val(),
                trang_thai: $('#lhpTrangThai').val(),
                thoi_gian_mo_dang_ky: $('#lhpNgayMoDK').val(),
                thoi_gian_dong_dang_ky: $('#lhpNgayDongDK').val(),
                lich_hoc: schedules
            };
            return payload;
        },

        saveLHP: function () {
            var self = this;
            var id = $('#lhpId').val();
            var payload = this.collectPayload();

            // Sĩ số, lịch học, trùng phòng / trùng lịch giảng viên... do backend kiểm tra
            var req = id
                ? Api.put('/api/lophocphan', $.extend({ id: parseInt(id, 10) }, payload))
                : Api.post('/api/lophocphan', payload);

            req.done(function (res) {
                App.showToast(res.message, 'success');
                App.closeModal();
                self.loadData();
            }).fail(function (xhr) {
                Api.toastError(xhr);
                // RULE-THIEU-04, RULE-THIEU-06: chưa đủ tiết -> hiện lịch dự kiến để điều chỉnh
                if (xhr.responseJSON && xhr.responseJSON.xep_lich) self.previewLHP();
            });
        },

        deleteLHP: function (id) {
            var self = this;
            var lhp = (this.cache || []).find(function (l) { return l.id === parseInt(id, 10); });
            if (!lhp) return;

            App.confirm('Bạn có chắc chắn muốn xóa vĩnh viễn lớp học phần <strong>' + App.escapeHtml(lhp.ma_lop_hoc_phan) + '</strong>?', function () {
                Api.del('/api/lophocphan', { id: lhp.id })
                    .done(function (res) {
                        App.showToast(res.message, 'success');
                        self.loadData();
                    })
                    .fail(Api.toastError);
            });
        },

        showDetailModal: function (id) {
            var self = this;
            Api.get('/api/lophocphan/chi-tiet', { id: id })
                .done(function (res) { self.renderDetailModal(res.data); })
                .fail(Api.toastError);
        },

        renderDetailModal: function (lhp) {
            var mh = { ten_mon_hoc: lhp.ten_mon_hoc, so_tin_chi: lhp.so_tin_chi };
            var gv = lhp.ten_giang_vien ? { ho_ten: lhp.ten_giang_vien } : null;
            var lichList = lhp.lich_hoc || [];
            var dks = lhp.sinh_vien || [];
            var totalBuoi = lhp.tong_buoi || 0;

            var svRows = '';
            var activeCount = 0;
            dks.forEach(function (dk, index) {
                var sv = { ma_dinh_danh: dk.ma_dinh_danh, ho_ten: dk.ho_ten };
                var lsv = dk.ma_lop ? { ma_lop: dk.ma_lop } : null;
                if (dk.trang_thai === 'Đã đăng ký' || dk.trang_thai === 'da_dang_ky') activeCount++;

                svRows +=
                    '<tr>' +
                    '  <td class="text-center">' + (index + 1) + '</td>' +
                    '  <td><strong>' + (sv ? App.escapeHtml(sv.ma_dinh_danh) : '—') + '</strong></td>' +
                    '  <td>' + (sv ? App.escapeHtml(sv.ho_ten) : '—') + '</td>' +
                    '  <td>' + (lsv ? App.escapeHtml(lsv.ma_lop) : '—') + '</td>' +
                    '  <td><small>' + App.formatDateTime(dk.ngay_dang_ky) + '</small></td>' +
                    '  <td class="text-center">' + App.trangThaiDKBadge(dk.trang_thai) + '</td>' +
                    '</tr>';
            });

            if (!svRows) {
                svRows = '<tr><td colspan="6" class="text-center text-muted py-3">Chưa có sinh viên đăng ký lớp này</td></tr>';
            }

            var lichRows = lichList.map(function (lh) {
                var soTiet = (lh.tiet_ket_thuc - lh.tiet_bat_dau + 1);
                var buoiCount = lh.so_buoi || 0;
                return '<tr>' +
                    '  <td><strong>' + App.thuLabel(lh.thu) + '</strong></td>' +
                    '  <td class="text-center">Tiết ' + lh.tiet_bat_dau + ' - ' + lh.tiet_ket_thuc + ' (' + soTiet + ' tiết)</td>' +
                    '  <td>' + App.formatDate(lh.ngay_bat_dau) + ' → ' + App.formatDate(lh.ngay_ket_thuc) + '</td>' +
                    '  <td class="text-center">' + buoiCount + ' buổi</td>' +
                    '</tr>';
            }).join('');

            var html =
                '<div class="modal-header">' +
                '  <h3><i class="fa-solid fa-circle-info" style="color:var(--primary);"></i> Chi tiết Lớp học phần: ' + App.escapeHtml(lhp.ma_lop_hoc_phan) + '</h3>' +
                '  <button class="modal-close" onclick="App.closeModal()">&times;</button>' +
                '</div>' +
                '<div class="modal-body">' +
                '  <div class="detail-grid mb-3">' +
                '    <div class="detail-item"><span class="detail-label">Môn học</span><span class="detail-value">' + (mh ? App.escapeHtml(mh.ten_mon_hoc) + ' (' + mh.so_tin_chi + ' TC)' : '—') + '</span></div>' +
                '    <div class="detail-item"><span class="detail-label">Giảng viên</span><span class="detail-value">' + (gv ? App.escapeHtml(gv.ho_ten) : 'Chưa phân công') + '</span></div>' +
                '    <div class="detail-item"><span class="detail-label">Học kỳ / Năm học</span><span class="detail-value">HK' + lhp.hoc_ky + ' (' + App.escapeHtml(lhp.nam_hoc) + ')</span></div>' +
                '    <div class="detail-item"><span class="detail-label">Phòng học</span><span class="detail-value">' + App.escapeHtml(lhp.phong_hoc || '—') + '</span></div>' +
                '    <div class="detail-item"><span class="detail-label">Sĩ số hiện tại</span><span class="detail-value">' + activeCount + ' / ' + lhp.si_so_toi_da + '</span></div>' +
                '    <div class="detail-item"><span class="detail-label">Tổng số buổi dự kiến</span><span class="detail-value">' + totalBuoi + ' buổi</span></div>' +
                '  </div>' +

                '  <h4 class="mb-2" style="font-size:0.95rem; font-weight:800;"><i class="fa-solid fa-calendar-week" style="color:var(--primary);"></i> Lịch học trong tuần</h4>' +
                '  <div class="table-responsive mb-3">' +
                '    <table class="data-table">' +
                '      <thead><tr><th>Thứ</th><th class="text-center">Khung tiết</th><th>Thời gian diễn ra</th><th class="text-center">Số buổi</th></tr></thead>' +
                '      <tbody>' + (lichRows || '<tr><td colspan="4" class="text-center text-muted">Chưa có lịch</td></tr>') + '</tbody>' +
                '    </table>' +
                '  </div>' +

                '  <h4 class="mb-2" style="font-size:0.95rem; font-weight:800;"><i class="fa-solid fa-users" style="color:var(--primary);"></i> Danh sách sinh viên đăng ký (' + activeCount + ' SV)</h4>' +
                '  <div class="table-responsive" style="max-height:240px; overflow-y:auto;">' +
                '    <table class="data-table">' +
                '      <thead><tr><th>STT</th><th>MSSV</th><th>Họ và tên</th><th>Lớp</th><th>Ngày đăng ký</th><th class="text-center">Trạng thái</th></tr></thead>' +
                '      <tbody>' + svRows + '</tbody>' +
                '    </table>' +
                '  </div>' +
                '</div>' +
                '<div class="modal-footer">' +
                '  <button class="btn btn-primary" onclick="App.closeModal()">Đóng</button>' +
                '</div>';

            App.showModal(html, 'xl');
        }
    };

    App.registerModule('lop-hoc-phan', LopHocPhanModule);
})(jQuery);
