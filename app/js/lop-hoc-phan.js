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
            var self = this;
            this.search = { query: '', field: 'all' };

            // Bố cục theo mã nguồn cũ (renderSectionsSection + SectionForm): form tạo lớp (trái) + danh sách (phải)
            var html =
                '<section class="nd-scope' + ((isAdmin || isGV) ? ' nd-two' : '') + '">' +
                ((isAdmin || isGV) ? '<div id="lhpFormSlot"></div>' : '') +
                '  <div class="nd-card">' +
                OldUI.header('Quản lý lớp học phần', 'Theo dõi chỗ còn trống, lịch học và trạng thái đăng ký của từng lớp.') +
                OldUI.toolbar('lhpSearch', ['Mã lớp', 'Môn học', 'Trạng thái'], 'Nhập từ khóa lớp học phần...') +
                '    <div class="nd-table-wrap"><table class="nd-table">' +
                '      <thead><tr><th>Mã lớp</th><th>Môn học</th><th>Giảng viên</th><th>Tòa nhà / phòng</th><th>Lịch</th><th>Chỗ trống</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>' +
                '      <tbody id="lhpTableBody"><tr><td colspan="8" class="nd-empty">Đang tải...</td></tr></tbody>' +
                '    </table></div>' +
                '  </div>' +
                '</section>';

            $('#contentArea').html(html);
            this.bindEvents();
            OldUI.bind('lhpSearch', function (q) { self.search = q; self.renderRows(); });
            App.fillTermSelects(null, $('<select>'), {}, function () {
                self.loadData();
                // Form tạo lớp hiện sẵn trên trang (cần danh sách học kỳ / năm học đã nạp)
                if ($('#lhpFormSlot').length) self.showFormModal();
            });
        },

        bindEvents: function () {
            var self = this;


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
                App.navigate('mon-hoc');
                // Trang Môn học có sẵn form tạo môn ở đầu trang -> đặt con trỏ vào ô Mã môn học
                setTimeout(function () { $('#mhMa').trigger('focus'); }, 600);
            });

            $(document).off('click', '#btnPreviewLHP').on('click', '#btnPreviewLHP', function () {
                self.previewLHP();
            });

            $(document).off('click', '#btnAddScheduleRow').on('click', '#btnAddScheduleRow', function () {
                self.addScheduleRow();
                self.updateCalc();
            });

            $(document).off('click', '.btn-remove-schedule').on('click', '.btn-remove-schedule', function () {
                $(this).closest('.schedule-item-row').remove();
                self.updateCalc();
            });
        },

        loadData: function () {
            var self = this;
            // Phân quyền (GV chỉ thấy lớp phụ trách) do backend xử lý; tìm kiếm theo thanh lọc trên trang
            Api.get('/api/lophocphan', { search: '', hoc_ky: '', nam_hoc: '', trang_thai: '' })
                .done(function (res) {
                    self.cache = res.data || [];
                    self.renderRows();
                })
                .fail(Api.toastError);
        },

        renderRows: function () {
            var currentUser = App.getCurrentUser();
            var isAdmin = currentUser && currentUser.vai_tro === 'admin';
            var isGV = currentUser && currentUser.vai_tro === 'giang_vien';
            var esc = App.escapeHtml, q = this.search || { query: '', field: 'all' };
            var all = (this.cache || []).map(function (l) {
                return $.extend({}, l, { dang_mo: App.trangThaiLopBadge(l).indexOf('Đang mở') !== -1 });
            });
            var list = all.filter(function (l) {
                return OldUI.match([l.ma_lop_hoc_phan, (l.ten_mon_hoc || '') + ' ' + (l.ma_mon_hoc || ''), l.dang_mo ? 'Mở đăng ký' : 'Đóng đăng ký'], q);
            });
            OldUI.count('lhpSearch', list.length, all.length, 'lớp học phần');

            var html = list.map(function (l) {
                var siSo = parseInt(l.si_so_hien_tai, 10) || 0, max = parseInt(l.si_so_toi_da, 10) || 0;
                var lichList = l.lich_hoc || [];
                var lich = lichList.map(function (lh) { return App.thuLabel(lh.thu) + ', tiết ' + lh.tiet_bat_dau + ' - ' + lh.tiet_ket_thuc; }).join('<br>') || 'Chưa xếp lịch';
                var ngay = lichList.filter(function (x) { return x.ngay_bat_dau; })[0];
                // Chỉ admin hoặc chính giảng viên phụ trách mới sửa được lớp của mình
                var canEditThis = isAdmin || (isGV && String(l.giang_vien_user_id) === String(currentUser.id));
                return '<tr>' +
                    '<td>' + esc(l.ma_lop_hoc_phan) + '</td>' +
                    '<td><div>' + esc(l.ten_mon_hoc || '—') + '</div><small>' + esc(l.ma_mon_hoc || '') + ' - HK' + l.hoc_ky + ' ' + esc(String(l.nam_hoc || '').split('-')[0]) + '</small></td>' +
                    '<td>' + esc(l.ten_giang_vien || 'Chưa phân công') + '</td>' +
                    '<td>' + esc(l.phong_hoc || '—') + '</td>' +
                    '<td>' + lich + (ngay ? '<small class="d-block">Học phần: ' + App.formatDate(ngay.ngay_bat_dau) + ' – ' + App.formatDate(ngay.ngay_ket_thuc) + '</small>' : '') + '</td>' +
                    '<td><strong>' + Math.max(0, max - siSo) + '</strong> / ' + max + '<small class="d-block">đã đăng ký ' + siSo + '</small></td>' +
                    '<td><span class="nd-pill ' + (l.dang_mo ? 'nd-pill-success' : 'nd-pill-neutral') + '">' + (l.dang_mo ? 'Mở đăng ký' : 'Đóng đăng ký') + '</span></td>' +
                    '<td><div class="nd-actions">' +
                    '<button type="button" class="nd-btn nd-btn-light btn-view-lhp" data-id="' + l.id + '">Sinh viên (' + siSo + ')</button>' +
                    (canEditThis
                        ? '<button type="button" class="nd-btn nd-btn-warning btn-edit-lhp" data-id="' + l.id + '">Sửa</button>' +
                          '<button type="button" class="nd-btn nd-btn-danger btn-del-lhp" data-id="' + l.id + '">Xóa</button>'
                        : '') +
                    '</div></td>' +
                    '</tr>';
            }).join('');
            $('#lhpTableBody').html(html || '<tr><td colspan="8" class="nd-empty">Chưa có lớp học phần nào.</td></tr>');
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
            // RULE-NGAY-01: khoảng ngày học phần hiện có của lớp (lấy từ lịch học đã lưu)
            var ngayBD = existingLich.length ? String(existingLich.map(function (x) { return x.ngay_bat_dau; }).sort()[0] || '').slice(0, 10) : '';
            var ngayKT = existingLich.length ? String(existingLich.map(function (x) { return x.ngay_ket_thuc; }).sort().pop() || '').slice(0, 10) : '';

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
                '  <h3><i class="fa-solid ' + (isEdit ? 'fa-pen' : 'fa-plus') + '"></i> ' + (isEdit ? 'Cập nhật lớp học phần' : 'Tạo lớp học phần') + '</h3>' +
                '  <button class="modal-close" onclick="App.closeModal()">&times;</button>' +
                '</div>' +
                '<div class="modal-body">' +
                '  <input type="hidden" id="lhpId" value="' + (lhp ? lhp.id : '') + '">' +
                '  <div class="form-row">' +
                '    <div class="form-group">' +
                '      <label>Mã lớp học phần</label>' +
                '      <input type="text" class="form-control" id="lhpMa" value="' + (lhp ? App.escapeHtml(lhp.ma_lop_hoc_phan) : '') + '" placeholder="VD: CS101-HK1-2026" ' + (isEdit ? 'readonly' : '') + '>' +
                '    </div>' +
                '    <div class="form-group">' +
                '      <label>Môn học' +
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
                '      <label>Phòng học</label>' +
                '      <input type="text" class="form-control" id="lhpPhong" value="' + (lhp ? App.escapeHtml(lhp.phong_hoc || '') : '') + '" placeholder="VD: A101">' +
                '    </div>' +
                '  </div>' +
                '  <div class="form-row">' +
                '    <div class="form-group">' +
                '      <label>Học kỳ</label>' +
                '      <select class="form-control" id="lhpHocKy">' +
                '        <option value="1" ' + ((lhp ? lhp.hoc_ky : parseInt(this.defaultTerm.hoc_ky, 10)) === 1 ? 'selected' : '') + '>Học kỳ 1</option>' +
                '        <option value="2" ' + ((lhp ? lhp.hoc_ky : parseInt(this.defaultTerm.hoc_ky, 10)) === 2 ? 'selected' : '') + '>Học kỳ 2</option>' +
                '        <option value="3" ' + ((lhp ? lhp.hoc_ky : parseInt(this.defaultTerm.hoc_ky, 10)) === 3 ? 'selected' : '') + '>Học kỳ Hè</option>' +
                '      </select>' +
                '    </div>' +
                '    <div class="form-group">' +
                '      <label>Năm học</label>' +
                '      <select class="form-control" id="lhpNamHoc">' +
                namHocOptions +
                '      </select>' +
                '    </div>' +
                '    <div class="form-group">' +
                '      <label>Sĩ số tối đa</label>' +
                '      <input type="number" min="5" max="150" class="form-control" id="lhpSiSo" value="' + (lhp ? lhp.si_so_toi_da : '40') + '">' +
                '    </div>' +
                '  </div>' +

                // RULE-NGAY-01: người tạo lớp nhập khoảng ngày học phần (như mã nguồn cũ), không lấy theo học kỳ
                '  <div class="form-row">' +
                '    <div class="form-group">' +
                '      <label>Ngày bắt đầu học phần</label>' +
                '      <input type="date" class="form-control lhp-ngay-hp" id="lhpNgayBD" value="' + ngayBD + '">' +
                '    </div>' +
                '    <div class="form-group">' +
                '      <label>Ngày kết thúc học phần</label>' +
                '      <input type="date" class="form-control lhp-ngay-hp" id="lhpNgayKT" value="' + ngayKT + '">' +
                '    </div>' +
                '  </div>' +
                '  <div id="lhpTermInfo" class="form-note"></div>' +
                '  <!-- Thời hạn mở/đóng đăng ký -->' +
                '  <div class="form-row">' +
                '    <div class="form-group">' +
                '      <label>Ngày bắt đầu mở đăng ký</label>' +
                '      <input type="date" class="form-control" id="lhpNgayMoDK" value="' + moDK + '">' +
                '    </div>' +
                '    <div class="form-group">' +
                '      <label>Ngày kết thúc đăng ký</label>' +
                '      <input type="date" class="form-control" id="lhpNgayDongDK" value="' + dongDK + '">' +
                '    </div>' +
                '  </div>' +
                // Ô chọn ngày hiển thị theo định dạng của trình duyệt (có máy là tháng/ngày/năm) -> ghi rõ lại theo dd/mm/yyyy
                '  <div id="lhpDKPreview" class="form-note"></div>' +

                '  <hr style="border:0; border-top:1px dashed var(--border-color); margin:18px 0;">' +

                '  <div class="d-flex justify-between align-center mb-2">' +
                '    <h4 style="font-size:0.95rem; font-weight:800;"><i class="fa-solid fa-calendar-days" style="color:var(--primary);"></i> Lịch học trong tuần</h4>' +
                '    <button type="button" class="btn btn-sm btn-outline-primary" id="btnAddScheduleRow"><i class="fa-solid fa-plus"></i> Thêm buổi học trong tuần</button>' +
                '  </div>' +
                '  <p class="form-note">Chọn thứ học và khung tiết. Hệ thống sinh buổi học vào mọi ngày của thứ đã chọn trong khoảng ngày học phần, bỏ qua ngày trùng lịch giảng viên / phòng học. Bấm "Xem trước lịch" để kiểm tra trước khi lưu.</p>' +
                '  <div id="scheduleContainer">' +
                '  </div>' +
                '  <div id="lhpCalc" class="mt-2" style="font-size:0.82rem;"></div>' +
                '  <div id="lhpPreview" class="mt-3"></div>' +
                '</div>' +
                '<div class="modal-footer">' +
                '  <button class="btn btn-outline" onclick="App.closeModal()">Hủy</button>' +
                '  <button class="btn btn-outline-primary" id="btnPreviewLHP"><i class="fa-solid fa-eye"></i> Xem trước lịch</button>' +
                '  <button class="btn btn-primary" id="btnSaveLHP"><i class="fa-solid fa-floppy-disk"></i> Lưu lớp học phần</button>' +
                '</div>';

            var self = this;
            App.showInlineForm(html, '#lhpFormSlot', function () { self.showFormModal(); });
            $('#lhpFormSlot .inline-form-card').toggleClass('is-editing', isEdit);
            if (isEdit) App.focusInlineForm('#lhpFormSlot');

            var showTerm = function () {
                var bd = $('#lhpNgayBD').val(), kt = $('#lhpNgayKT').val();
                $('#lhpTermInfo').html(!bd || !kt
                    ? '<span class="text-muted">Nhập ngày bắt đầu và ngày kết thúc học phần; buổi học được sinh theo các thứ đã chọn trong khoảng này.</span>'
                    : (bd > kt ? '<span class="text-danger">Ngày bắt đầu học phần đang sau ngày kết thúc - hãy kiểm tra lại.</span>'
                        : '<span class="text-muted">Học phần từ ' + App.formatDate(bd) + ' đến ' + App.formatDate(kt) + '. Mọi buổi học được sinh trong khoảng này.</span>'));
            };
            $('#lhpNgayBD, #lhpNgayKT').on('change input', function () { showTerm(); self.updateCalc(); });

            // RULE-08: xem trước trạng thái đăng ký theo ngày đã chọn (chỉ 2 trạng thái, hết hạn tự đóng)
            function showDK() {
                var mo = $('#lhpNgayMoDK').val(), dong = $('#lhpNgayDongDK').val(), box = $('#lhpDKPreview');
                if (!mo || !dong) { box.html('<span class="text-muted">Chưa nhập đủ ngày mở và ngày đóng thì lớp ở trạng thái <strong>Đóng đăng ký</strong>.</span>'); return; }
                var dmy = function (d) { var p = d.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };
                var homNay = new Date(), y = homNay.getFullYear(), m = ('0' + (homNay.getMonth() + 1)).slice(-2), d = ('0' + homNay.getDate()).slice(-2);
                var today = y + '-' + m + '-' + d;
                var range = 'Mở từ <strong>' + dmy(mo) + ' 00:00</strong> đến hết <strong>' + dmy(dong) + ' 23:59</strong> (ngày/tháng/năm). ';
                var tt;
                if (mo > dong) tt = '<span class="text-danger">Ngày mở đang sau ngày đóng - hãy kiểm tra lại.</span>';
                else if (today < mo) tt = '<span class="badge badge-secondary">Đóng đăng ký</span> - chưa tới ngày mở, sẽ tự mở vào ' + dmy(mo) + '.';
                else if (today > dong) tt = '<span class="badge badge-secondary">Đóng đăng ký</span> <span class="text-danger">- ngày đóng đã qua (hôm nay ' + dmy(today) + '). Muốn mở đăng ký thì chọn ngày đóng từ hôm nay trở đi.</span>';
                else tt = '<span class="badge badge-success">Đang mở đăng ký</span> - sinh viên đăng ký được ngay sau khi lưu.';
                box.html(range + tt);
            }
            $('#lhpNgayMoDK, #lhpNgayDongDK').on('change input', showDK);
            showDK();
            showTerm();
            if (existingLich.length > 0) {
                existingLich.forEach(function (lh) {
                    self.addScheduleRow(lh);
                });
            } else {
                self.addScheduleRow();
            }

            // Hộp "Cách tính": cập nhật ngay khi đổi môn, học kỳ, thứ hoặc khung tiết
            self.calcOpen = false;
            self.calcCtx = { mon: allMonHoc, buoiCu: isEdit ? (lhp.buoi_hoc || []) : [] };
            $('#lhpMonHoc, #lhpHocKy, #lhpNamHoc').on('change', function () { self.updateCalc(); });
            $('#scheduleContainer').on('change input', '.sch-thu, .sch-tbd, .sch-tkt', function () { self.updateCalc(); });
            self.updateCalc();
        },

        /**
         * Tính trước số tiết tối đa xếp được và ghi rõ công thức cho người dùng
         * (RULE-CREDIT-08, RULE-XL-03, RULE-XL-07, RULE-XL-11, RULE-XL-12).
         * Chưa trừ ngày trùng lịch giảng viên / phòng học (RULE-XD) - số chính xác xem bằng "Xem trước lịch".
         */
        updateCalc: function () {
            var box = $('#lhpCalc');
            if (!box.length) return;
            // Cách tính ẩn mặc định, bấm nút để xem / ẩn. Nút chỉ tạo một lần, nội dung cập nhật bên dưới
            var self = this;
            if (!$('#btnToggleCalc').length) {
                box.html(
                    '<button type="button" class="btn btn-sm btn-outline" id="btnToggleCalc"><i class="fa-solid fa-calculator"></i> Xem cách tính số tiết</button>' +
                    '<div id="lhpCalcBody" style="display:' + (self.calcOpen ? 'block' : 'none') + '; margin-top:8px; padding:12px 14px; border:1px solid var(--border-color); border-radius:12px; background:#f8fbff;"></div>');
                $('#btnToggleCalc').on('click', function () {
                    self.calcOpen = !self.calcOpen;
                    $('#lhpCalcBody').toggle(self.calcOpen);
                    $(this).html('<i class="fa-solid fa-calculator"></i> ' + (self.calcOpen ? 'Ẩn cách tính số tiết' : 'Xem cách tính số tiết'));
                });
            }
            var ctx = this.calcCtx || {};
            var monId = parseInt($('#lhpMonHoc').val(), 10);
            var mon = (ctx.mon || []).find(function (m) { return parseInt(m.id, 10) === monId; });
            var bdHp = $('#lhpNgayBD').val(), ktHp = $('#lhpNgayKT').val();
            if (!mon || !bdHp || !ktHp || bdHp > ktHp) { $('#lhpCalcBody').empty(); return; }
            var term = { bat_dau: bdHp, ket_thuc: ktHp };

            var pad = function (n) { return ('0' + n).slice(-2); };
            var iso = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
            var parse = function (str) { var p = String(str).slice(0, 10).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
            var dmy = function (str) { var p = String(str).slice(0, 10).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };

            var today = iso(new Date());
            var batDau = String(term.bat_dau).slice(0, 10), ketThuc = String(term.ket_thuc).slice(0, 10);
            var tu = batDau > today ? batDau : today;          // RULE-XL-12: không xếp buổi mới vào ngày đã qua
            var can = parseInt(mon.so_tiet, 10) || 0;

            // Các ngày của một thứ trong khoảng [tu, ketThuc] (Thứ 2..7 -> getDay 1..6, Chủ nhật = 8 -> 0)
            var ngayCuaThu = function (thu) {
                var out = [], d = parse(tu), end = parse(ketThuc), js = thu === 8 ? 0 : thu - 1;
                while (d.getDay() !== js && d <= end) d.setDate(d.getDate() + 1);
                while (d <= end) { out.push(iso(d)); d.setDate(d.getDate() + 7); }
                return out;
            };

            // RULE-XL-11: khi sửa lớp, buổi đã diễn ra được giữ nguyên và tính vào tổng
            var daHoc = (ctx.buoiCu || []).filter(function (b) { return String(b.ngay_hoc).slice(0, 10) < today; })
                .reduce(function (sum, b) { return sum + (parseInt(b.so_tiet, 10) || 0); }, 0);

            var rows = [], loi = '';
            $('.schedule-item-row').each(function () {
                var thu = parseInt($(this).find('.sch-thu').val(), 10);
                var a = parseInt($(this).find('.sch-tbd').val(), 10), b = parseInt($(this).find('.sch-tkt').val(), 10);
                if (!(a >= 1 && b <= 13 && b >= a)) { loi = 'Khung tiết chưa hợp lệ: tiết từ 1 đến 13 và tiết KT ≥ tiết BĐ.'; return; }
                rows.push({ thu: thu, a: a, b: b, tiet: b - a + 1, ngay: ngayCuaThu(thu) });
            });
            if (loi || !rows.length) {
                $('#lhpCalcBody').html('<div class="text-warning">' + (loi || 'Chưa có buổi học trong tuần - bấm "Thêm buổi học trong tuần".') + '</div>');
                return;
            }

            var toiDa = daHoc + rows.reduce(function (sum, r) { return sum + r.tiet * r.ngay.length; }, 0);
            var thieu = can - toiDa;

            var li = [];
            li.push('Số tiết theo tín chỉ của môn: <strong>' + can + ' tiết</strong> (' + App.escapeHtml(mon.ma_mon_hoc) + ', ' + mon.so_tin_chi +
                ' TC; 1 TC lý thuyết = 18 tiết, 1 TC thực hành = 36 tiết).');
            li.push('Khoảng ngày còn xếp được: <strong>' + dmy(tu) + ' đến ' + dmy(ketThuc) + '</strong>' +
                (tu > batDau ? ' (học phần bắt đầu ' + dmy(batDau) + ', nhưng các ngày trước hôm nay đã qua nên không xếp buổi mới).' : '.'));
            if (daHoc) li.push('Buổi đã diễn ra (giữ nguyên): <strong>' + daHoc + ' tiết</strong>.');
            rows.forEach(function (r) {
                li.push(App.thuLabel(r.thu) + ', tiết ' + r.a + '–' + r.b + ': ' + r.tiet + ' tiết/buổi × ' + r.ngay.length +
                    ' buổi = <strong>' + (r.tiet * r.ngay.length) + ' tiết</strong>.');
            });
            var phan = rows.map(function (r) { return r.tiet * r.ngay.length; });
            if (daHoc) phan.unshift(daHoc);
            li.push('Tổng số tiết sẽ xếp: ' + (phan.length > 1 ? phan.join(' + ') + ' = ' : '') + '<strong>' + toiDa + ' tiết</strong>.');

            // RULE-NGAY-02, RULE-NGAY-03: sinh mọi buổi trong khoảng ngày; số tiết theo tín chỉ chỉ để đối chiếu
            var ketLuan = thieu > 0
                ? '<span class="text-warning">Lịch trong khoảng ngày này ít hơn số tiết theo tín chỉ ' + thieu + ' tiết (chỉ để tham khảo, vẫn lưu được).</span>'
                : (thieu < 0 ? '<span class="text-muted">Lịch trong khoảng ngày này nhiều hơn số tiết theo tín chỉ ' + (-thieu) + ' tiết (chỉ để tham khảo, vẫn lưu được).</span>'
                    : '<strong class="text-success">✓ Khớp số tiết theo tín chỉ.</strong>');

            $('#lhpCalcBody').html(
                '<ul class="mb-1" style="padding-left:18px;">' + li.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' +
                '<div>' + ketLuan + '</div>' +
                '<div class="text-muted mt-1" style="font-size:0.78rem;">Số trên chưa trừ những ngày trùng lịch giảng viên / phòng học. Bấm "Xem trước lịch" để có lịch chính xác.</div>');
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
                var html = '<div class="alert ' + (d.hop_le ? 'alert-info' : 'alert-danger') + '" style="font-size:0.85rem;">' +
                    '<strong>' + App.escapeHtml(d.mon_hoc.ma_mon_hoc + ' - ' + d.mon_hoc.ten_mon_hoc) + '</strong>: ' + d.tong_tiet_mon + ' tiết theo tín chỉ. ' +
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
                        '<td class="text-center">' + luyKe + '</td></tr>';
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
                thoi_gian_mo_dang_ky: $('#lhpNgayMoDK').val(),
                thoi_gian_dong_dang_ky: $('#lhpNgayDongDK').val(),
                ngay_bat_dau_hoc_phan: $('#lhpNgayBD').val(),
                ngay_ket_thuc_hoc_phan: $('#lhpNgayKT').val(),
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
                self.showFormModal(); // đưa form về trạng thái tạo mới
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
                    '  <td>' + App.formatDate(lh.ngay_bat_dau) + ' đến ' + App.formatDate(lh.ngay_ket_thuc) + '</td>' +
                    '  <td class="text-center">' + buoiCount + ' buổi</td>' +
                    '</tr>';
            }).join('');

            // Quản lý lịch học > Danh sách buổi học: số thứ tự buổi do backend đánh (cùng nguồn với TKB, điểm danh - RULE-DL-07)
            var today = new Date().toISOString().slice(0, 10);
            var buoiRows = (lhp.buoi_hoc || []).map(function (b) {
                var tt = parseInt(b.so_ban_ghi_diem_danh, 10) > 0 || b.trang_thai !== 'Dự kiến'
                    ? '<span class="badge badge-success">Đã điểm danh</span>'
                    : (b.ngay_hoc < today ? '<span class="badge badge-warning">Đã qua, chưa điểm danh</span>' : '<span class="badge badge-info">Sắp diễn ra</span>');
                return '<tr><td class="text-center">' + b.so_thu_tu + '</td><td>' + App.formatDate(b.ngay_hoc) + '</td><td>' + App.thuLabel(b.thu) + '</td>' +
                    '<td class="text-center">' + b.tiet_bat_dau + ' - ' + b.tiet_ket_thuc + '</td><td>' + App.gioHoc(b.tiet_bat_dau, b.tiet_ket_thuc) + '</td>' +
                    '<td class="text-center">' + b.so_tiet + '</td><td class="text-center">' + tt + '</td></tr>';
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

                '  <h4 class="mb-2" style="font-size:0.95rem; font-weight:800;"><i class="fa-solid fa-list-ol" style="color:var(--primary);"></i> Danh sách buổi học (' + (lhp.buoi_hoc || []).length + ' buổi, ' + (lhp.tong_tiet_da_xep || 0) + '/' + (lhp.so_tiet || '—') + ' tiết)</h4>' +
                '  <div class="table-responsive mb-3" style="max-height:260px; overflow-y:auto;">' +
                '    <table class="data-table"><thead><tr><th class="text-center">Buổi</th><th>Ngày học</th><th>Thứ</th><th class="text-center">Tiết</th><th>Giờ học</th><th class="text-center">Số tiết</th><th class="text-center">Trạng thái</th></tr></thead>' +
                '      <tbody>' + (buoiRows || '<tr><td colspan="7" class="text-center text-muted">Chưa có buổi học</td></tr>') + '</tbody></table>' +
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

    window.LopHocPhanModule = LopHocPhanModule;
    App.registerModule('lop-hoc-phan', LopHocPhanModule);
})(jQuery);
