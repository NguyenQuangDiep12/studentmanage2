/* ================================================================
   USERS.JS - Quản lý tài khoản Sinh viên & Giảng viên
   Font Awesome CDN Icons & Thiết kế Card hiện đại
   Hỗ trợ chế độ riêng biệt: 'sinh_vien' (users-sv) & 'giang_vien' (users-gv)
   Ràng buộc nghiệp vụ: Bắt buộc lớp cho SV, bắt buộc khoa cho GV
   Cảnh báo an toàn khi khóa tài khoản giảng viên đang đứng lớp
   ================================================================ */

(function ($) {
    'use strict';

    var currentViewMode = 'sinh_vien'; // 'sinh_vien' | 'giang_vien' | 'all'

    var UsersModule = {
        render: function (mode) {
            var currentUser = App.getCurrentUser();
            if (!currentUser || currentUser.vai_tro !== 'admin') {
                $('#contentArea').html(
                    '<div class="alert alert-danger">' +
                    '  <i class="fa-solid fa-triangle-exclamation"></i> Chức năng này chỉ dành cho Quản trị viên' +
                    '</div>'
                );
                return;
            }

            if (mode) {
                currentViewMode = mode;
            } else {
                currentViewMode = 'sinh_vien';
            }

            var isSv = (currentViewMode === 'sinh_vien');
            var isGv = (currentViewMode === 'giang_vien');

            var pageTitle = isSv ? 'Quản lý hồ sơ sinh viên' : (isGv ? 'Quản lý hồ sơ giảng viên' : 'Quản lý tài khoản');
            var titleIcon = isSv ? 'fa-user-graduate' : (isGv ? 'fa-chalkboard-user' : 'fa-users');
            var addBtnText = isSv ? 'Thêm sinh viên' : (isGv ? 'Thêm giảng viên' : 'Tạo tài khoản');

            // Lấy danh sách lớp sinh viên & khoa để lọc nhanh
            var allKhoa = MockDB.khoa.getAll();
            var allLopSV = MockDB.lop_sinh_vien.getAll();

            var filterExtraHtml = '';
            if (isSv) {
                filterExtraHtml =
                    '<select id="filterLopSV" class="filter-select">' +
                    '  <option value="">Tất cả lớp sinh hoạt</option>' +
                    allLopSV.map(function (l) {
                        return '<option value="' + l.id + '">' + App.escapeHtml(l.ma_lop) + ' - ' + App.escapeHtml(l.ten_lop) + '</option>';
                    }).join('') +
                    '</select>';
            } else if (isGv) {
                filterExtraHtml =
                    '<select id="filterKhoaGV" class="filter-select">' +
                    '  <option value="">Tất cả khoa trực thuộc</option>' +
                    allKhoa.map(function (k) {
                        return '<option value="' + k.id + '">' + App.escapeHtml(k.ma_khoa) + ' - ' + App.escapeHtml(k.ten_khoa) + '</option>';
                    }).join('') +
                    '</select>';
            }

            var html =
                '<div class="card">' +
                '  <div class="card-header">' +
                '    <h3><i class="fa-solid ' + titleIcon + '"></i> ' + pageTitle + '</h3>' +
                '    <button class="btn btn-primary" id="btnThemUser">' +
                '      <i class="fa-solid fa-plus"></i> ' + addBtnText +
                '    </button>' +
                '  </div>' +
                '  <div class="card-body">' +
                '    <div class="toolbar">' +
                '      <div class="toolbar-left">' +
                '        <div class="search-box">' +
                '          <span class="search-icon"><i class="fa-solid fa-magnifying-glass"></i></span>' +
                '          <input type="text" id="searchUsers" placeholder="' + (isSv ? 'Tìm MSSV, họ tên, email sinh viên...' : 'Tìm MSGV, họ tên, email giảng viên...') + '">' +
                '        </div>' +
                filterExtraHtml +
                '        <select id="filterTrangThaiUser" class="filter-select">' +
                '          <option value="">Tất cả trạng thái</option>' +
                '          <option value="Hoạt động">Hoạt động</option>' +
                '          <option value="Đã khóa">Đã khóa</option>' +
                '        </select>' +
                '      </div>' +
                '      <div class="toolbar-right">' +
                '        <span class="text-gray" id="totalUsersCount">Tổng: 0 tài khoản</span>' +
                '      </div>' +
                '    </div>' +

                '    <div class="table-responsive">' +
                '      <table class="data-table">' +
                '        <thead>' +
                '          <tr>' +
                '            <th style="width:50px;">STT</th>' +
                '            <th>Mã định danh</th>' +
                '            <th>Tên đăng nhập</th>' +
                '            <th>Họ và tên</th>' +
                '            <th>' + (isSv ? 'Lớp sinh hoạt / Khoa' : (isGv ? 'Khoa công tác' : 'Khoa / Lớp')) + '</th>' +
                '            <th>Liên hệ (Email/SĐT)</th>' +
                '            <th class="text-center">Trạng thái</th>' +
                '            <th class="text-center" style="width:140px;">Thao tác</th>' +
                '          </tr>' +
                '        </thead>' +
                '        <tbody id="usersTableBody"></tbody>' +
                '      </table>' +
                '    </div>' +
                '  </div>' +
                '</div>';

            $('#contentArea').html(html);
            this.bindEvents();
            this.loadUsers();
        },

        bindEvents: function () {
            var self = this;

            $('#searchUsers, #filterTrangThaiUser, #filterLopSV, #filterKhoaGV').on('input change', function () {
                self.loadUsers();
            });

            $('#btnThemUser').on('click', function () {
                self.showFormModal();
            });

            $(document).off('click', '.btn-edit-user').on('click', '.btn-edit-user', function () {
                var id = $(this).data('id');
                self.showFormModal(id);
            });

            $(document).off('click', '.btn-toggle-user-status').on('click', '.btn-toggle-user-status', function () {
                var id = $(this).data('id');
                self.toggleStatus(id);
            });

            $(document).off('click', '.btn-reset-user-pass').on('click', '.btn-reset-user-pass', function () {
                var id = $(this).data('id');
                self.resetPassword(id);
            });

            $(document).off('click', '#btnSaveUser').on('click', '#btnSaveUser', function () {
                self.saveUser();
            });

            // Khi đổi vai trò trong form modal nếu cho phép
            $(document).off('change', '#modalVaiTro').on('change', '#modalVaiTro', function () {
                var vt = $(this).val();
                if (vt === 'sinh_vien') {
                    $('#groupLopSV').show();
                    $('#groupKhoaGV').hide();
                } else if (vt === 'giang_vien') {
                    $('#groupLopSV').hide();
                    $('#groupKhoaGV').show();
                } else {
                    $('#groupLopSV').hide();
                    $('#groupKhoaGV').hide();
                }
            });
        },

        loadUsers: function () {
            var kw = ($('#searchUsers').val() || '').toLowerCase().trim();
            var st = $('#filterTrangThaiUser').val();
            var lopFilter = $('#filterLopSV').length ? $('#filterLopSV').val() : '';
            var khoaFilter = $('#filterKhoaGV').length ? $('#filterKhoaGV').val() : '';

            var list = MockDB.users.getAll();

            // Lọc theo chế độ view mode
            if (currentViewMode === 'sinh_vien') {
                list = list.filter(function (u) { return u.vai_tro === 'sinh_vien'; });
            } else if (currentViewMode === 'giang_vien') {
                list = list.filter(function (u) { return u.vai_tro === 'giang_vien'; });
            }

            // Lọc trạng thái
            if (st) {
                list = list.filter(function (u) {
                    if (st === 'Hoạt động') return u.trang_thai === 'Hoạt động' || u.trang_thai === 'active';
                    if (st === 'Đã khóa') return u.trang_thai === 'Đã khóa' || u.trang_thai === 'locked';
                    return u.trang_thai === st;
                });
            }

            // Lọc lớp SV
            if (lopFilter) {
                list = list.filter(function (u) { return String(u.lop_sinh_vien_id) === String(lopFilter); });
            }

            // Lọc khoa GV
            if (khoaFilter) {
                list = list.filter(function (u) { return String(u.khoa_id) === String(khoaFilter); });
            }

            // Lọc từ khóa
            if (kw) {
                list = list.filter(function (u) {
                    var m = (u.ma_dinh_danh || '').toLowerCase();
                    var un = (u.username || '').toLowerCase();
                    var h = (u.ho_ten || '').toLowerCase();
                    var e = (u.email || '').toLowerCase();
                    return m.indexOf(kw) !== -1 || un.indexOf(kw) !== -1 || h.indexOf(kw) !== -1 || e.indexOf(kw) !== -1;
                });
            }

            $('#totalUsersCount').text('Tổng: ' + list.length + ' tài khoản');

            var tbody = $('#usersTableBody');
            tbody.empty();

            if (list.length === 0) {
                tbody.html(
                    '<tr><td colspan="8" class="text-center text-gray py-4">' +
                    '  <i class="fa-solid fa-user-slash" style="font-size:1.6rem; opacity:0.3; display:block; margin-bottom:8px;"></i>' +
                    '  Không tìm thấy tài khoản phù hợp' +
                    '</td></tr>'
                );
                return;
            }

            list.forEach(function (u, idx) {
                var infoOrg = '—';
                if (u.vai_tro === 'sinh_vien') {
                    var lsv = u.lop_sinh_vien_id ? MockDB.lop_sinh_vien.getById(u.lop_sinh_vien_id) : null;
                    if (lsv) {
                        var ctdt = MockDB.chuong_trinh_dao_tao.getById(lsv.chuong_trinh_id);
                        infoOrg = '<strong>' + App.escapeHtml(lsv.ma_lop) + '</strong> (' + App.escapeHtml(lsv.ten_lop) + ')' +
                            (ctdt ? '<br><small class="text-gray">' + App.escapeHtml(ctdt.ten_chuong_trinh) + '</small>' : '');
                    } else {
                        infoOrg = '<span class="text-danger font-bold"><i class="fa-solid fa-triangle-exclamation"></i> Chưa phân lớp</span>';
                    }
                } else if (u.vai_tro === 'giang_vien') {
                    var kh = u.khoa_id ? MockDB.khoa.getById(u.khoa_id) : null;
                    if (kh) {
                        infoOrg = '<strong>' + App.escapeHtml(kh.ten_khoa) + '</strong> (' + App.escapeHtml(kh.ma_khoa) + ')';
                    } else {
                        infoOrg = '<span class="text-danger font-bold"><i class="fa-solid fa-triangle-exclamation"></i> Chưa gán khoa</span>';
                    }
                } else {
                    infoOrg = '<span class="badge badge-secondary">Phòng Quản trị</span>';
                }

                var isLocked = (u.trang_thai === 'Đã khóa' || u.trang_thai === 'locked');
                var toggleTitle = isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản';
                var toggleBtn = isLocked
                    ? '<button class="btn btn-sm btn-outline text-success btn-toggle-user-status" data-id="' + u.id + '" title="' + toggleTitle + '"><i class="fa-solid fa-lock-open"></i></button>'
                    : '<button class="btn btn-sm btn-outline text-danger btn-toggle-user-status" data-id="' + u.id + '" title="' + toggleTitle + '"><i class="fa-solid fa-lock"></i></button>';

                var contactHtml = '';
                if (u.email) contactHtml += '<div><i class="fa-regular fa-envelope"></i> ' + App.escapeHtml(u.email) + '</div>';
                if (u.so_dien_thoai) contactHtml += '<div><i class="fa-solid fa-phone"></i> ' + App.escapeHtml(u.so_dien_thoai) + '</div>';
                if (!contactHtml) contactHtml = '<span class="text-gray">—</span>';

                var row =
                    '<tr>' +
                    '  <td class="text-center font-bold">' + (idx + 1) + '</td>' +
                    '  <td><strong>' + App.escapeHtml(u.ma_dinh_danh) + '</strong></td>' +
                    '  <td><code>' + App.escapeHtml(u.username) + '</code></td>' +
                    '  <td><strong>' + App.escapeHtml(u.ho_ten) + '</strong>' +
                    (u.gioi_tinh ? ' <small class="text-gray">(' + App.escapeHtml(u.gioi_tinh) + ')</small>' : '') +
                    '  </td>' +
                    '  <td>' + infoOrg + '</td>' +
                    '  <td><small>' + contactHtml + '</small></td>' +
                    '  <td class="text-center">' + App.trangThaiUserBadge(u.trang_thai) + '</td>' +
                    '  <td class="text-center">' +
                    '    <div class="table-actions justify-center">' +
                    '      <button class="btn btn-sm btn-outline btn-edit-user" data-id="' + u.id + '" title="Sửa thông tin"><i class="fa-solid fa-pen-to-square"></i></button>' +
                    '      <button class="btn btn-sm btn-outline btn-reset-user-pass" data-id="' + u.id + '" title="Đặt lại mật khẩu"><i class="fa-solid fa-key"></i></button>' +
                    toggleBtn +
                    '    </div>' +
                    '  </td>' +
                    '</tr>';
                tbody.append(row);
            });
        },

        showFormModal: function (id) {
            var u = id ? MockDB.users.getById(id) : null;
            var isEdit = !!u;

            var defaultRole = currentViewMode === 'giang_vien' ? 'giang_vien' : 'sinh_vien';
            var currentRole = u ? u.vai_tro : defaultRole;

            var allKhoa = MockDB.khoa.getAll();
            var allLopSV = MockDB.lop_sinh_vien.getAll();

            var khoaOptions = allKhoa.map(function (k) {
                var sel = (u && u.khoa_id === k.id) ? 'selected' : '';
                return '<option value="' + k.id + '" ' + sel + '>' + App.escapeHtml(k.ma_khoa + ' - ' + k.ten_khoa) + '</option>';
            }).join('');

            var lopOptions = allLopSV.map(function (l) {
                var sel = (u && u.lop_sinh_vien_id === l.id) ? 'selected' : '';
                return '<option value="' + l.id + '" ' + sel + '>' + App.escapeHtml(l.ma_lop + ' - ' + l.ten_lop) + '</option>';
            }).join('');

            var currentStatus = 'Hoạt động';
            if (u) {
                currentStatus = (u.trang_thai === 'Đã khóa' || u.trang_thai === 'locked') ? 'Đã khóa' : 'Hoạt động';
            }

            var modalTitle = isEdit
                ? (currentRole === 'sinh_vien' ? 'Chỉnh sửa sinh viên' : (currentRole === 'giang_vien' ? 'Chỉnh sửa giảng viên' : 'Cập nhật tài khoản'))
                : (currentRole === 'sinh_vien' ? 'Thêm sinh viên mới' : (currentRole === 'giang_vien' ? 'Thêm giảng viên mới' : 'Tạo mới tài khoản'));

            var html =
                '<div class="modal-header">' +
                '  <h3><i class="fa-solid fa-' + (isEdit ? 'pen-to-square' : 'user-plus') + '"></i> ' + modalTitle + '</h3>' +
                '  <button class="modal-close" onclick="App.closeModal()">&times;</button>' +
                '</div>' +
                '<div class="modal-body">' +
                '  <input type="hidden" id="modalUserId" value="' + (u ? u.id : '') + '">' +
                '  <div class="form-row">' +
                '    <div class="form-group">' +
                '      <label>Mã định danh <span class="required">*</span> (' + (currentRole === 'giang_vien' ? 'MSGV' : 'MSSV') + ')</label>' +
                '      <input type="text" class="form-control" id="modalMaDinhDanh" value="' + (u ? App.escapeHtml(u.ma_dinh_danh) : '') + '" placeholder="VD: ' + (currentRole === 'giang_vien' ? 'GV001' : 'SV001') + '" ' + (isEdit ? 'readonly' : '') + '>' +
                '    </div>' +
                '    <div class="form-group">' +
                '      <label>Tên đăng nhập <span class="required">*</span></label>' +
                '      <input type="text" class="form-control" id="modalUsername" value="' + (u ? App.escapeHtml(u.username) : '') + '" placeholder="VD: ' + (currentRole === 'giang_vien' ? 'lecturer_account' : 'student_account') + '" ' + (isEdit ? 'readonly' : '') + '>' +
                '    </div>' +
                '  </div>' +

                (!isEdit ?
                '  <div class="form-group">' +
                '    <label>Mật khẩu khởi tạo <span class="required">*</span></label>' +
                '    <input type="password" class="form-control" id="modalPassword" value="123456">' +
                '    <small class="text-gray">Mật khẩu mặc định hệ thống là 123456</small>' +
                '  </div>' : '') +

                '  <div class="form-row">' +
                '    <div class="form-group" style="flex:2;">' +
                '      <label>Họ và tên đầy đủ <span class="required">*</span></label>' +
                '      <input type="text" class="form-control" id="modalHoTen" value="' + (u ? App.escapeHtml(u.ho_ten) : '') + '" placeholder="Nhập họ và tên...">' +
                '    </div>' +
                '    <div class="form-group" style="flex:1;">' +
                '      <label>Vai trò hệ thống <span class="required">*</span></label>' +
                '      <select class="form-control" id="modalVaiTro" ' + (isEdit ? 'disabled' : '') + '>' +
                '        <option value="sinh_vien" ' + (currentRole === 'sinh_vien' ? 'selected' : '') + '>Sinh viên</option>' +
                '        <option value="giang_vien" ' + (currentRole === 'giang_vien' ? 'selected' : '') + '>Giảng viên</option>' +
                '        <option value="admin" ' + (currentRole === 'admin' ? 'selected' : '') + '>Quản trị viên</option>' +
                '      </select>' +
                '    </div>' +
                '  </div>' +

                '  <!-- Trường bắt buộc cho Sinh viên -->' +
                '  <div class="form-group" id="groupLopSV" style="' + (currentRole === 'sinh_vien' ? '' : 'display:none;') + '">' +
                '    <label>Lớp sinh viên sinh hoạt <span class="required">*</span></label>' +
                '    <select class="form-control" id="modalLopSV">' +
                '      <option value="">-- Chọn lớp sinh hoạt bắt buộc --</option>' + lopOptions +
                '    </select>' +
                '  </div>' +

                '  <!-- Trường bắt buộc cho Giảng viên -->' +
                '  <div class="form-group" id="groupKhoaGV" style="' + (currentRole === 'giang_vien' ? '' : 'display:none;') + '">' +
                '    <label>Khoa trực thuộc <span class="required">*</span></label>' +
                '    <select class="form-control" id="modalKhoaGV">' +
                '      <option value="">-- Chọn khoa công tác bắt buộc --</option>' + khoaOptions +
                '    </select>' +
                '  </div>' +

                '  <div class="form-row">' +
                '    <div class="form-group">' +
                '      <label>Ngày sinh</label>' +
                '      <input type="date" class="form-control" id="modalNgaySinh" value="' + (u && u.ngay_sinh ? u.ngay_sinh : '') + '">' +
                '    </div>' +
                '    <div class="form-group">' +
                '      <label>Giới tính</label>' +
                '      <select class="form-control" id="modalGioiTinh">' +
                '        <option value="Nam" ' + (u && u.gioi_tinh === 'Nam' ? 'selected' : '') + '>Nam</option>' +
                '        <option value="Nữ" ' + (u && u.gioi_tinh === 'Nữ' ? 'selected' : '') + '>Nữ</option>' +
                '      </select>' +
                '    </div>' +
                '    <div class="form-group">' +
                '      <label>Trạng thái</label>' +
                '      <select class="form-control" id="modalTrangThai">' +
                '        <option value="Hoạt động" ' + (currentStatus === 'Hoạt động' ? 'selected' : '') + '>Hoạt động</option>' +
                '        <option value="Đã khóa" ' + (currentStatus === 'Đã khóa' ? 'selected' : '') + '>Khóa tài khoản</option>' +
                '      </select>' +
                '    </div>' +
                '  </div>' +

                '  <div class="form-row">' +
                '    <div class="form-group">' +
                '      <label>Địa chỉ Email</label>' +
                '      <input type="email" class="form-control" id="modalEmail" value="' + (u ? App.escapeHtml(u.email || '') : '') + '" placeholder="email@university.edu.vn">' +
                '    </div>' +
                '    <div class="form-group">' +
                '      <label>Số điện thoại</label>' +
                '      <input type="text" class="form-control" id="modalPhone" value="' + (u ? App.escapeHtml(u.so_dien_thoai || '') : '') + '" placeholder="09xxxxxxxxx">' +
                '    </div>' +
                '  </div>' +

                '  <div class="form-group">' +
                '    <label>Địa chỉ thường trú</label>' +
                '    <input type="text" class="form-control" id="modalDiaChi" value="' + (u ? App.escapeHtml(u.dia_chi || '') : '') + '" placeholder="Số nhà, đường, quận/huyện...">' +
                '  </div>' +
                '</div>' +
                '<div class="modal-footer">' +
                '  <button class="btn btn-outline" onclick="App.closeModal()">Hủy</button>' +
                '  <button class="btn btn-primary" id="btnSaveUser"><i class="fa-solid fa-floppy-disk"></i> Lưu thông tin</button>' +
                '</div>';

            App.showModal(html, 'lg');
        },

        saveUser: function () {
            var self = this;
            var id = $('#modalUserId').val();
            var ma = $('#modalMaDinhDanh').val().trim().toUpperCase();
            var username = $('#modalUsername').val().trim().toLowerCase();
            var hoTen = $('#modalHoTen').val().trim();
            var vaiTro = $('#modalVaiTro').val();
            var pass = $('#modalPassword').length ? $('#modalPassword').val().trim() : null;
            var ngaySinh = $('#modalNgaySinh').val();
            var gioiTinh = $('#modalGioiTinh').val();
            var trangThai = $('#modalTrangThai').val();
            var email = $('#modalEmail').val().trim();
            var phone = $('#modalPhone').val().trim();
            var diaChi = $('#modalDiaChi').val().trim();

            var lopId = $('#modalLopSV').val() ? parseInt($('#modalLopSV').val(), 10) : null;
            var khoaId = $('#modalKhoaGV').val() ? parseInt($('#modalKhoaGV').val(), 10) : null;

            if (!ma || !username || !hoTen) {
                App.showToast('Vui lòng điền các trường bắt buộc (Mã định danh, Tên đăng nhập, Họ tên)!', 'error');
                return;
            }

            // Ràng buộc nghiệp vụ: Sinh viên bắt buộc phải có lớp sinh hoạt
            if (vaiTro === 'sinh_vien' && !lopId) {
                App.showToast('Vui lòng chọn lớp sinh viên sinh hoạt cho sinh viên!', 'error');
                return;
            }

            // Ràng buộc nghiệp vụ: Giảng viên bắt buộc phải có khoa trực thuộc
            if (vaiTro === 'giang_vien' && !khoaId) {
                App.showToast('Vui lòng chọn khoa trực thuộc cho giảng viên!', 'error');
                return;
            }

            var allUsers = MockDB.users.getAll();

            if (id) {
                var uid = parseInt(id, 10);
                var existingUser = MockDB.users.getById(uid);

                // Kiểm tra cảnh báo nếu đổi trạng thái sang 'Đã khóa' cho giảng viên đang phụ trách lớp
                if (existingUser && existingUser.vai_tro === 'giang_vien' && trangThai === 'Đã khóa' && (existingUser.trang_thai === 'Hoạt động' || existingUser.trang_thai === 'active')) {
                    var activeClasses = MockDB.lop_hoc_phan.getAll({
                        giang_vien_user_id: uid,
                        trang_thai: 'Đang mở'
                    });

                    if (activeClasses.length > 0) {
                        App.confirm(
                            '<strong>CẢNH BÁO AN TOÀN:</strong><br>' +
                            'Giảng viên <strong>' + App.escapeHtml(existingUser.ho_ten) + '</strong> hiện đang phụ trách <strong>' + activeClasses.length + ' lớp học phần đang mở</strong>.<br>' +
                            'Khóa tài khoản sẽ ảnh hưởng đến việc vào điểm và điểm danh của các lớp này. Bạn vẫn muốn tiếp tục khóa?',
                            function () {
                                self.performUpdateUser(uid, hoTen, ngaySinh, gioiTinh, trangThai, email, phone, diaChi, vaiTro, lopId, khoaId);
                            }
                        );
                        return;
                    }
                }

                self.performUpdateUser(uid, hoTen, ngaySinh, gioiTinh, trangThai, email, phone, diaChi, vaiTro, lopId, khoaId);
            } else {
                // Kiểm tra tính duy nhất của Username
                var dupUsername = allUsers.some(function (u) { return u.username.toLowerCase() === username; });
                if (dupUsername) {
                    App.showToast('Tên đăng nhập "' + username + '" đã có người sử dụng!', 'error');
                    return;
                }

                // Kiểm tra tính duy nhất của Mã định danh
                var dupMa = allUsers.some(function (u) { return u.ma_dinh_danh.toUpperCase() === ma; });
                if (dupMa) {
                    App.showToast('Mã định danh "' + ma + '" đã tồn tại trong hệ thống!', 'error');
                    return;
                }

                MockDB.users.create({
                    ma_dinh_danh: ma,
                    username: username,
                    password: pass || '123456',
                    ho_ten: hoTen,
                    vai_tro: vaiTro,
                    ngay_sinh: ngaySinh,
                    gioi_tinh: gioiTinh,
                    trang_thai: trangThai,
                    email: email,
                    so_dien_thoai: phone,
                    dia_chi: diaChi,
                    lop_sinh_vien_id: vaiTro === 'sinh_vien' ? lopId : null,
                    khoa_id: vaiTro === 'giang_vien' ? khoaId : null,
                    created_at: new Date().toISOString()
                });
                App.showToast('Tạo mới tài khoản thành công!', 'success');
                App.closeModal();
                self.loadUsers();
            }
        },

        performUpdateUser: function (uid, hoTen, ngaySinh, gioiTinh, trangThai, email, phone, diaChi, vaiTro, lopId, khoaId) {
            MockDB.users.update(uid, {
                ho_ten: hoTen,
                ngay_sinh: ngaySinh,
                gioi_tinh: gioiTinh,
                trang_thai: trangThai,
                email: email,
                so_dien_thoai: phone,
                dia_chi: diaChi,
                lop_sinh_vien_id: vaiTro === 'sinh_vien' ? lopId : null,
                khoa_id: vaiTro === 'giang_vien' ? khoaId : null
            });
            App.showToast('Cập nhật thông tin tài khoản thành công!', 'success');
            App.closeModal();
            this.loadUsers();
        },

        toggleStatus: function (id) {
            var self = this;
            var u = MockDB.users.getById(id);
            if (!u) return;

            var isCurrentlyLocked = (u.trang_thai === 'Đã khóa' || u.trang_thai === 'locked');
            var newStatus = isCurrentlyLocked ? 'Hoạt động' : 'Đã khóa';

            // Nếu chuẩn bị khóa tài khoản giảng viên: kiểm tra xem có lớp đang phụ trách không
            if (!isCurrentlyLocked && u.vai_tro === 'giang_vien') {
                var activeClasses = MockDB.lop_hoc_phan.getAll({
                    giang_vien_user_id: u.id,
                    trang_thai: 'Đang mở'
                });

                if (activeClasses.length > 0) {
                    App.confirm(
                        '<strong>CẢNH BÁO AN TOÀN:</strong><br>' +
                        'Giảng viên <strong>' + App.escapeHtml(u.ho_ten) + '</strong> đang phụ trách <strong>' + activeClasses.length + ' lớp học phần đang mở</strong>.<br>' +
                        'Bạn có chắc chắn muốn khóa tài khoản này?',
                        function () {
                            MockDB.users.update(id, { trang_thai: 'Đã khóa' });
                            App.showToast('Đã khóa tài khoản ' + u.ho_ten, 'info');
                            self.loadUsers();
                        }
                    );
                    return;
                }
            }

            var confirmMsg = isCurrentlyLocked
                ? 'Bạn có chắc chắn muốn mở khóa cho tài khoản <strong>' + App.escapeHtml(u.ho_ten) + '</strong> (' + u.username + ')?'
                : 'Bạn có chắc chắn muốn khóa tài khoản <strong>' + App.escapeHtml(u.ho_ten) + '</strong> (' + u.username + ')?';

            App.confirm(confirmMsg, function () {
                MockDB.users.update(id, { trang_thai: newStatus });
                App.showToast('Đã chuyển trạng thái tài khoản sang: ' + newStatus, 'info');
                self.loadUsers();
            });
        },

        resetPassword: function (id) {
            var u = MockDB.users.getById(id);
            if (!u) return;

            App.confirm(
                'Đặt lại mật khẩu cho tài khoản <strong>' + App.escapeHtml(u.username) + ' (' + App.escapeHtml(u.ho_ten) + ')</strong> về mật khẩu mặc định <code>123456</code>?',
                function () {
                    MockDB.users.update(id, { password: '123456' });
                    App.showToast('Đặt lại mật khẩu thành công! Mật khẩu mới là 123456', 'success');
                }
            );
        }
    };

    App.registerModule('users', UsersModule);
    App.registerModule('users-sv', {
        render: function () { UsersModule.render('sinh_vien'); }
    });
    App.registerModule('users-gv', {
        render: function () { UsersModule.render('giang_vien'); }
    });
})(jQuery);
