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
                (isAdmin ? '    <button class="btn btn-primary" id="btnThemLHP"><i class="fa-solid fa-plus"></i> Tạo lớp học phần mới</button>' : '') +
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
                '          <option value="1" selected>Học kỳ 1</option>' +
                '          <option value="2">Học kỳ 2</option>' +
                '          <option value="3">Học kỳ Hè</option>' +
                '        </select>' +
                '        <select id="filterNamHocLHP" class="filter-select">' +
                '          <option value="">-- Tất cả năm học --</option>' +
                '          <option value="2026-2027" selected>2026-2027</option>' +
                '          <option value="2025-2026">2025-2026</option>' +
                '          <option value="2024-2025">2024-2025</option>' +
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
            this.loadData();
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

            var keyword = ($('#searchLHP').val() || '').toLowerCase().trim();
            var hkFilter = $('#filterHocKyLHP').val();
            var nhFilter = $('#filterNamHocLHP').val();
            var ttFilter = $('#filterTrangThaiLHP').val();

            $.ajax({
                url: '/api/lophocphan',
                method: 'GET',
                dataType: 'json',
                success: function (response) {
                    console.log('Dữ liệu lớp học phần:', response);
                },
                error: function (xhr) {
                    console.error('Lỗi lấy danh sách lớp học phần:', xhr.responseText);
                }
            });

            // Giảng viên chỉ xem lớp do mình phụ trách
            if (isGV) {
                list = list.filter(function (l) {
                    return l.giang_vien_user_id === currentUser.id;
                });
            }

            if (hkFilter) {
                list = list.filter(function (l) { return l.hoc_ky == hkFilter; });
            }
            if (nhFilter) {
                list = list.filter(function (l) { return l.nam_hoc === nhFilter; });
            }
            if (ttFilter) {
                list = list.filter(function (l) { return l.trang_thai === ttFilter; });
            }

            if (keyword) {
                list = list.filter(function (l) {
                    var mh = MockDB.mon_hoc.getById(l.mon_hoc_id);
                    var gv = l.giang_vien_user_id ? MockDB.users.getById(l.giang_vien_user_id) : null;
                    return (l.ma_lop_hoc_phan && l.ma_lop_hoc_phan.toLowerCase().indexOf(keyword) !== -1) ||
                           (mh && mh.ten_mon_hoc.toLowerCase().indexOf(keyword) !== -1) ||
                           (gv && gv.ho_ten.toLowerCase().indexOf(keyword) !== -1);
                });
            }

            $('#totalLHPCount').text('Tổng số: ' + list.length + ' lớp học phần');

            var tbody = $('#lhpTableBody');
            tbody.empty();

            if (list.length === 0) {
                tbody.html('<tr><td colspan="11" class="text-center text-muted py-4">Không tìm thấy lớp học phần nào</td></tr>');
                return;
            }

            list.forEach(function (l, idx) {
                var mh = MockDB.mon_hoc.getById(l.mon_hoc_id);
                var gv = l.giang_vien_user_id ? MockDB.users.getById(l.giang_vien_user_id) : null;
                var siSoHienTai = MockDB.getSiSoHienTai(l.id);
                var lichList = MockDB.lich_hoc.getAll({ lop_hoc_phan_id: l.id });

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
                    '    <div class="table-actions">' +
                    '      <button class="btn btn-sm btn-outline btn-view-lhp" data-id="' + l.id + '" title="Xem chi tiết"><i class="fa-solid fa-eye"></i></button>' +
                    (canEditThis ?
                    '      <button class="btn btn-sm btn-outline btn-edit-lhp" data-id="' + l.id + '" title="Sửa"><i class="fa-solid fa-pen"></i></button>' +
                    '      <button class="btn btn-sm btn-outline btn-del-lhp text-danger" data-id="' + l.id + '" title="Hủy/Xóa lớp"><i class="fa-solid fa-trash"></i></button>' : '') +
                    '    </div>' +
                    '  </td>' +
                    '</tr>';
                tbody.append(row);
            });
        },

        showFormModal: function (id) {
            var lhp = id ? MockDB.lop_hoc_phan.getById(id) : null;
            var isEdit = !!lhp;

            var allMonHoc = MockDB.mon_hoc.getAll({ trang_thai: 'Hoạt động' });
            var allGiangVien = MockDB.users.getAll({ vai_tro: 'giang_vien', trang_thai: 'Hoạt động' });
            var existingLich = isEdit ? MockDB.lich_hoc.getAll({ lop_hoc_phan_id: lhp.id }) : [];

            var mhOptions = allMonHoc.map(function (m) {
                var sel = lhp && lhp.mon_hoc_id === m.id ? 'selected' : '';
                return '<option value="' + m.id + '" ' + sel + '>' + App.escapeHtml(m.ma_mon_hoc) + ' - ' + App.escapeHtml(m.ten_mon_hoc) + ' (' + m.so_tin_chi + ' TC)</option>';
            }).join('');

            var gvOptions = '<option value="">-- Chưa chỉ định --</option>' + allGiangVien.map(function (g) {
                var sel = lhp && lhp.giang_vien_user_id === g.id ? 'selected' : '';
                return '<option value="' + g.id + '" ' + sel + '>' + App.escapeHtml(g.ma_dinh_danh) + ' - ' + App.escapeHtml(g.ho_ten) + '</option>';
            }).join('');

            var moDK = lhp ? (lhp.thoi_gian_mo_dang_ky ? lhp.thoi_gian_mo_dang_ky.split('T')[0] : '2026-08-15') : '2026-08-15';
            var dongDK = lhp ? (lhp.thoi_gian_dong_dang_ky ? lhp.thoi_gian_dong_dang_ky.split('T')[0] : '2026-11-30') : '2026-11-30';

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
                '      <label>Môn học <span class="required">*</span></label>' +
                '      <select class="form-control" id="lhpMonHoc">' + mhOptions + '</select>' +
                '    </div>' +
                '  </div>' +
                '  <div class="form-row">' +
                '    <div class="form-group">' +
                '      <label>Giảng viên phụ trách</label>' +
                '      <select class="form-control" id="lhpGiangVien">' + gvOptions + '</select>' +
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
                '        <option value="1" ' + (lhp && lhp.hoc_ky === 1 ? 'selected' : '') + '>Học kỳ 1</option>' +
                '        <option value="2" ' + (lhp && lhp.hoc_ky === 2 ? 'selected' : '') + '>Học kỳ 2</option>' +
                '        <option value="3" ' + (lhp && lhp.hoc_ky === 3 ? 'selected' : '') + '>Học kỳ Hè</option>' +
                '      </select>' +
                '    </div>' +
                '    <div class="form-group">' +
                '      <label>Năm học <span class="required">*</span></label>' +
                '      <select class="form-control" id="lhpNamHoc">' +
                '        <option value="2026-2027" ' + (lhp && lhp.nam_hoc === '2026-2027' ? 'selected' : '') + '>2026-2027</option>' +
                '        <option value="2025-2026" ' + (lhp && lhp.nam_hoc === '2025-2026' ? 'selected' : '') + '>2025-2026</option>' +
                '        <option value="2024-2025" ' + (lhp && lhp.nam_hoc === '2024-2025' ? 'selected' : '') + '>2024-2025</option>' +
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
                '  <div id="scheduleContainer">' +
                '  </div>' +
                '</div>' +
                '<div class="modal-footer">' +
                '  <button class="btn btn-outline" onclick="App.closeModal()">Hủy</button>' +
                '  <button class="btn btn-primary" id="btnSaveLHP"><i class="fa-solid fa-floppy-disk"></i> Lưu lớp học phần</button>' +
                '</div>';

            App.showModal(html, 'xl');

            var self = this;
            if (existingLich.length > 0) {
                existingLich.forEach(function (lh) {
                    self.addScheduleRow(lh);
                });
            } else {
                self.addScheduleRow({
                    thu: 2,
                    tiet_bat_dau: 1,
                    tiet_ket_thuc: 3,
                    ngay_bat_dau: '2026-09-07',
                    ngay_ket_thuc: '2026-12-25'
                });
            }
        },

        addScheduleRow: function (data) {
            data = data || {
                thu: 2,
                tiet_bat_dau: 1,
                tiet_ket_thuc: 3,
                ngay_bat_dau: '2026-09-07',
                ngay_ket_thuc: '2026-12-25'
            };

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
                '      <input type="number" min="1" max="12" class="form-control sch-tbd" value="' + data.tiet_bat_dau + '">' +
                '    </div>' +
                '    <div class="form-group mb-0" style="flex:0.8;">' +
                '      <label style="font-size:0.8rem;">Tiết KT</label>' +
                '      <input type="number" min="1" max="12" class="form-control sch-tkt" value="' + data.tiet_ket_thuc + '">' +
                '    </div>' +
                '    <div class="form-group mb-0" style="flex:1.2;">' +
                '      <label style="font-size:0.8rem;">Ngày bắt đầu</label>' +
                '      <input type="date" class="form-control sch-nbd" value="' + data.ngay_bat_dau + '">' +
                '    </div>' +
                '    <div class="form-group mb-0" style="flex:1.2;">' +
                '      <label style="font-size:0.8rem;">Ngày kết thúc</label>' +
                '      <input type="date" class="form-control sch-nkt" value="' + data.ngay_ket_thuc + '">' +
                '    </div>' +
                '    <div class="form-group mb-0" style="flex:0.3; text-align:center; padding-top:20px;">' +
                '      <button type="button" class="btn btn-sm btn-danger btn-remove-schedule" title="Xóa lịch"><i class="fa-solid fa-xmark"></i></button>' +
                '    </div>' +
                '  </div>' +
                '</div>';

            $('#scheduleContainer').append(rowHtml);
        },

        saveLHP: function () {
            var id = $('#lhpId').val();
            var ma = $('#lhpMa').val().trim().toUpperCase();
            var monHocId = parseInt($('#lhpMonHoc').val(), 10);
            var gvId = $('#lhpGiangVien').val() ? parseInt($('#lhpGiangVien').val(), 10) : null;
            var phong = $('#lhpPhong').val().trim().toUpperCase();
            var hocKy = parseInt($('#lhpHocKy').val(), 10);
            var namHoc = $('#lhpNamHoc').val().trim();
            var siSo = parseInt($('#lhpSiSo').val(), 10);
            var trangThai = $('#lhpTrangThai').val();
            var ngayMoDK = $('#lhpNgayMoDK').val();
            var ngayDongDK = $('#lhpNgayDongDK').val();

            if (!ma || isNaN(monHocId) || isNaN(hocKy) || !namHoc || isNaN(siSo) || siSo <= 0 || !phong || !ngayMoDK || !ngayDongDK) {
                App.showToast('Vui lòng điền đầy đủ các thông tin bắt buộc!', 'error');
                return;
            }

            if (ngayMoDK > ngayDongDK) {
                App.showToast('Ngày mở đăng ký phải trước hoặc bằng ngày đóng đăng ký!', 'error');
                return;
            }

            var currentLhpIdNum = id ? parseInt(id, 10) : null;

            // Ràng buộc 1: Không cho phép giảm sĩ số tối đa xuống thấp hơn số lượng SV đã đăng ký
            if (currentLhpIdNum) {
                var currentRegisteredCount = MockDB.getSiSoHienTai(currentLhpIdNum);
                if (siSo < currentRegisteredCount) {
                    App.showToast('Không thể giảm sĩ số xuống ' + siSo + ' vì lớp hiện đã có ' + currentRegisteredCount + ' sinh viên đăng ký!', 'error');
                    return;
                }
            }

            // Thu thập và kiểm tra danh sách lịch học
            var schedules = [];
            var scheduleValid = true;

            $('.schedule-item-row').each(function () {
                var $row = $(this);
                var thu = parseInt($row.find('.sch-thu').val(), 10);
                var tbd = parseInt($row.find('.sch-tbd').val(), 10);
                var tkt = parseInt($row.find('.sch-tkt').val(), 10);
                var nbd = $row.find('.sch-nbd').val();
                var nkt = $row.find('.sch-nkt').val();

                if (isNaN(thu) || isNaN(tbd) || isNaN(tkt) || tbd > tkt || !nbd || !nkt || nbd > nkt) {
                    scheduleValid = false;
                    return false;
                }

                schedules.push({
                    thu: thu,
                    tiet_bat_dau: tbd,
                    tiet_ket_thuc: tkt,
                    ngay_bat_dau: nbd,
                    ngay_ket_thuc: nkt
                });
            });

            if (!scheduleValid || schedules.length === 0) {
                App.showToast('Lịch học không hợp lệ! Vui lòng kiểm tra lại khung tiết và ngày bắt đầu/kết thúc', 'error');
                return;
            }

            // Ràng buộc 2 & 3: Kiểm tra TRÙNG PHÒNG HỌC và TRÙNG LỊCH GIẢNG VIÊN với các lớp khác
            var otherLHPs = MockDB.lop_hoc_phan.getAll({ trang_thai: 'Đang mở' });
            if (currentLhpIdNum) {
                otherLHPs = otherLHPs.filter(function (l) { return l.id !== currentLhpIdNum; });
            }

            var conflictFound = false;
            var conflictMsg = '';

            for (var i = 0; i < otherLHPs.length; i++) {
                var otherL = otherLHPs[i];
                var otherSchedules = MockDB.lich_hoc.getAll({ lop_hoc_phan_id: otherL.id });

                schedules.forEach(function (sNew) {
                    otherSchedules.forEach(function (sOld) {
                        if (sNew.thu === sOld.thu) {
                            var periodOverlap = (sNew.tiet_bat_dau <= sOld.tiet_ket_thuc) && (sNew.tiet_ket_thuc >= sOld.tiet_bat_dau);
                            var dateOverlap = (sNew.ngay_bat_dau <= sOld.ngay_ket_thuc) && (sNew.ngay_ket_thuc >= sOld.ngay_bat_dau);

                            if (periodOverlap && dateOverlap) {
                                // Kiểm tra trùng phòng
                                if (phong === otherL.phong_hoc) {
                                    conflictFound = true;
                                    conflictMsg = 'Phòng học "' + phong + '" đã có lớp ' + otherL.ma_lop_hoc_phan + ' học vào ' + App.thuLabel(sNew.thu) + ' (Tiết ' + sOld.tiet_bat_dau + '-' + sOld.tiet_ket_thuc + ')!';
                                }
                                // Kiểm tra trùng giảng viên
                                if (gvId && gvId === otherL.giang_vien_user_id) {
                                    conflictFound = true;
                                    conflictMsg = 'Giảng viên đã có lịch dạy lớp ' + otherL.ma_lop_hoc_phan + ' vào ' + App.thuLabel(sNew.thu) + ' (Tiết ' + sOld.tiet_bat_dau + '-' + sOld.tiet_ket_thuc + ')!';
                                }
                            }
                        }
                    });
                });

                if (conflictFound) break;
            }

            if (conflictFound) {
                App.showToast('Xung đột lịch: ' + conflictMsg, 'error');
                return;
            }

            var allLHP = MockDB.lop_hoc_phan.getAll();

            if (currentLhpIdNum) {
                // UPDATE AN TOÀN: Không xóa các buổi học đã có điểm danh!
                MockDB.lop_hoc_phan.update(currentLhpIdNum, {
                    mon_hoc_id: monHocId,
                    giang_vien_user_id: gvId,
                    hoc_ky: hocKy,
                    nam_hoc: namHoc,
                    si_so_toi_da: siSo,
                    phong_hoc: phong,
                    thoi_gian_mo_dang_ky: ngayMoDK + 'T00:00:00',
                    thoi_gian_dong_dang_ky: ngayDongDK + 'T23:59:59',
                    trang_thai: trangThai
                });

                // Xử lý lịch học & buổi học an toàn:
                // Lấy tất cả buoi_hoc hiện tại của lớp
                var existingLichList = MockDB.lich_hoc.getAll({ lop_hoc_phan_id: currentLhpIdNum });
                var buoiHocsToKeep = [];

                existingLichList.forEach(function (el) {
                    var buois = MockDB.buoi_hoc.getAll({ lich_hoc_id: el.id });
                    buois.forEach(function (b) {
                        // Nếu buổi học đã có điểm danh -> BẮT BUỘC GIỮ LẠI
                        var hasAttendance = MockDB.diem_danh.getAll({ buoi_hoc_id: b.id }).length > 0;
                        if (hasAttendance) {
                            buoiHocsToKeep.push(b);
                        } else {
                            MockDB.buoi_hoc.remove(b.id);
                        }
                    });
                    MockDB.lich_hoc.remove(el.id);
                });

                // Tạo lịch mới
                var createdLichList = [];
                schedules.forEach(function (s) {
                    s.lop_hoc_phan_id = currentLhpIdNum;
                    var nl = MockDB.lich_hoc.create(s);
                    createdLichList.push(nl);
                });

                // Sinh thêm các buổi học mới cho những ngày chưa diễn ra
                var newGeneratedBuoi = MockDB.generateBuoiHoc(createdLichList);
                newGeneratedBuoi.forEach(function (nb) {
                    // Tránh tạo trùng ngày đã có buổi học giữ lại
                    var exists = buoiHocsToKeep.some(function (kb) { return kb.ngay_hoc === nb.ngay_hoc; });
                    if (!exists) {
                        MockDB.buoi_hoc.create(nb);
                    }
                });

                App.showToast('Cập nhật lớp học phần thành công! Dữ liệu điểm danh cũ được bảo toàn', 'success');
            } else {
                // TẠO MỚI
                var dup = allLHP.some(function (l) { return l.ma_lop_hoc_phan.toUpperCase() === ma; });
                if (dup) {
                    App.showToast('Mã lớp học phần "' + ma + '" đã tồn tại!', 'error');
                    return;
                }

                var newLHP = MockDB.lop_hoc_phan.create({
                    ma_lop_hoc_phan: ma,
                    mon_hoc_id: monHocId,
                    giang_vien_user_id: gvId,
                    hoc_ky: hocKy,
                    nam_hoc: namHoc,
                    si_so_toi_da: siSo,
                    phong_hoc: phong,
                    thoi_gian_mo_dang_ky: ngayMoDK + 'T00:00:00',
                    thoi_gian_dong_dang_ky: ngayDongDK + 'T23:59:59',
                    trang_thai: trangThai
                });

                var createdLich = [];
                schedules.forEach(function (s) {
                    s.lop_hoc_phan_id = newLHP.id;
                    createdLich.push(MockDB.lich_hoc.create(s));
                });

                var buoiHocs = MockDB.generateBuoiHoc(createdLich);
                buoiHocs.forEach(function (b) { MockDB.buoi_hoc.create(b); });

                App.showToast('Tạo mới lớp học phần thành công!', 'success');
            }

            App.closeModal();
            this.loadData();
        },

        deleteLHP: function (id) {
            var self = this;
            var lhp = MockDB.lop_hoc_phan.getById(id);
            if (!lhp) return;

            // Ràng buộc toàn diện: Kiểm tra đăng ký, điểm số và điểm danh
            var allDks = MockDB.dang_ky_hoc_phan.getAll({ lop_hoc_phan_id: id });
            if (allDks.length > 0) {
                App.showToast('Không thể xóa! Đã có ' + allDks.length + ' sinh viên từng đăng ký lớp này (kể cả đã hủy). Vui lòng chuyển trạng thái lớp sang "Đã hủy"!', 'error');
                return;
            }

            App.confirm('Bạn có chắc chắn muốn xóa vĩnh viễn lớp học phần <strong>' + App.escapeHtml(lhp.ma_lop_hoc_phan) + '</strong>?', function () {
                var lichList = MockDB.lich_hoc.getAll({ lop_hoc_phan_id: id });
                lichList.forEach(function (lh) {
                    var buoiList = MockDB.buoi_hoc.getAll({ lich_hoc_id: lh.id });
                    buoiList.forEach(function (b) { MockDB.buoi_hoc.remove(b.id); });
                    MockDB.lich_hoc.remove(lh.id);
                });
                MockDB.lop_hoc_phan.remove(id);
                App.showToast('Đã xóa lớp học phần thành công!', 'success');
                self.loadData();
            });
        },

        showDetailModal: function (id) {
            var lhp = MockDB.lop_hoc_phan.getById(id);
            if (!lhp) return;

            var mh = MockDB.mon_hoc.getById(lhp.mon_hoc_id);
            var gv = lhp.giang_vien_user_id ? MockDB.users.getById(lhp.giang_vien_user_id) : null;
            var lichList = MockDB.lich_hoc.getAll({ lop_hoc_phan_id: id });
            var dks = MockDB.dang_ky_hoc_phan.getAll({ lop_hoc_phan_id: id });

            var totalBuoi = 0;
            lichList.forEach(function (lh) {
                totalBuoi += MockDB.buoi_hoc.getAll({ lich_hoc_id: lh.id }).length;
            });

            var svRows = '';
            var activeCount = 0;
            dks.forEach(function (dk, index) {
                var sv = MockDB.users.getById(dk.sinh_vien_user_id);
                var lsv = sv && sv.lop_sinh_vien_id ? MockDB.lop_sinh_vien.getById(sv.lop_sinh_vien_id) : null;
                if (dk.trang_thai === 'Đã đăng ký') activeCount++;

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
                var buoiCount = MockDB.buoi_hoc.getAll({ lich_hoc_id: lh.id }).length;
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
