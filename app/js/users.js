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
            var self = this;
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

            // Danh sách lớp sinh viên & khoa lấy từ API rồi mới dựng giao diện
            Api.get('/api/taikhoan/danh-muc')
                .done(function (res) {
                    self.danhMuc = res.data || { khoa: [], lop_sinh_vien: [] };
                    self.renderPage(isSv, isGv, pageTitle, titleIcon, addBtnText);
                })
                .fail(Api.toastError);
        },

        renderPage: function (isSv, isGv, pageTitle, titleIcon, addBtnText) {
            var allKhoa = this.danhMuc.khoa;
            var allLopSV = this.danhMuc.lop_sinh_vien;

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

            // Bố cục giống giao diện React: thẻ form (trái) + thẻ danh sách (phải)
            var html =
                '<section class="dashboard-grid two-columns">' +
                '<div id="userFormSlot"></div>' +
                '<div class="card">' +
                '  <div class="card-header">' +
                '    <h3><i class="fa-solid ' + titleIcon + '"></i> ' + pageTitle + '</h3>' +
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
                '            <th>' + (isSv ? 'Mã sinh viên' : (isGv ? 'Mã giảng viên' : 'Mã định danh')) + '</th>' +
                '            <th>Họ và tên</th>' +
                '            <th>' + (isSv ? 'Lớp sinh hoạt / Khoa' : (isGv ? 'Khoa công tác' : 'Khoa / Lớp')) + '</th>' +
                '            <th>Liên hệ (Email/SĐT)</th>' +
                '            <th class="text-center">Trạng thái</th>' +
                '            <th class="text-center">Thao tác</th>' +
                '          </tr>' +
                '        </thead>' +
                '        <tbody id="usersTableBody"></tbody>' +
                '      </table>' +
                '    </div>' +
                '  </div>' +
                '</div>' +
                '</section>';

            $('#contentArea').html(html);
            this.bindEvents();
            this.showFormModal(); // form thêm mới hiện sẵn trên trang
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
            var self = this;
            // Tìm kiếm & lọc theo vai trò / trạng thái / lớp / khoa do backend xử lý
            Api.get('/api/taikhoan/users', {
                vai_tro: currentViewMode === 'all' ? '' : currentViewMode,
                search: ($('#searchUsers').val() || '').trim(),
                trang_thai: $('#filterTrangThaiUser').val(),
                lop_sinh_vien_id: $('#filterLopSV').length ? $('#filterLopSV').val() : '',
                khoa_id: $('#filterKhoaGV').length ? $('#filterKhoaGV').val() : ''
            })
                .done(function (res) {
                    self.cache = res.data || [];
                    self.renderUsers(self.cache);
                })
                .fail(Api.toastError);
        },

        findCached: function (id) {
            return (this.cache || []).find(function (u) { return u.id === parseInt(id, 10); }) || null;
        },

        renderUsers: function (list) {
            $('#totalUsersCount').text('Tổng: ' + list.length + ' tài khoản');

            var tbody = $('#usersTableBody');
            tbody.empty();

            if (list.length === 0) {
                tbody.html(
                    '<tr><td colspan="7" class="text-center text-gray py-4">' +
                    '  <i class="fa-solid fa-user-slash" style="font-size:1.6rem; opacity:0.3; display:block; margin-bottom:8px;"></i>' +
                    '  Không tìm thấy tài khoản phù hợp' +
                    '</td></tr>'
                );
                return;
            }

            list.forEach(function (u, idx) {
                var infoOrg = '—';
                if (u.vai_tro === 'sinh_vien') {
                    if (u.ma_lop) {
                        infoOrg = '<strong>' + App.escapeHtml(u.ma_lop) + '</strong> (' + App.escapeHtml(u.ten_lop) + ')' +
                            (u.ten_chuong_trinh ? '<br><small class="text-gray">' + App.escapeHtml(u.ten_chuong_trinh) + '</small>' : '');
                    } else {
                        infoOrg = '<span class="text-danger font-bold"><i class="fa-solid fa-triangle-exclamation"></i> Chưa phân lớp</span>';
                    }
                } else if (u.vai_tro === 'giang_vien') {
                    if (u.ma_khoa) {
                        infoOrg = '<strong>' + App.escapeHtml(u.ten_khoa) + '</strong> (' + App.escapeHtml(u.ma_khoa) + ')';
                    } else {
                        infoOrg = '<span class="text-danger font-bold"><i class="fa-solid fa-triangle-exclamation"></i> Chưa gán khoa</span>';
                    }
                } else {
                    infoOrg = '<span class="badge badge-secondary">Phòng Quản trị</span>';
                }

                var isLocked = (u.trang_thai === 'Đã khóa' || u.trang_thai === 'locked');
                var toggleTitle = isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản';
                var toggleBtn = isLocked
                    ? '<button class="btn btn-sm btn-outline text-success btn-toggle-user-status" data-id="' + u.id + '" title="' + toggleTitle + '">Mở khóa</button>'
                    : '<button class="btn btn-sm btn-outline text-danger btn-toggle-user-status" data-id="' + u.id + '" title="' + toggleTitle + '">Khóa</button>';

                var contactHtml = '';
                if (u.email) contactHtml += '<div><i class="fa-regular fa-envelope"></i> ' + App.escapeHtml(u.email) + '</div>';
                if (u.so_dien_thoai) contactHtml += '<div><i class="fa-solid fa-phone"></i> ' + App.escapeHtml(u.so_dien_thoai) + '</div>';
                if (!contactHtml) contactHtml = '<span class="text-gray">—</span>';

                var row =
                    '<tr>' +
                    '  <td class="text-center font-bold">' + (idx + 1) + '</td>' +
                    '  <td><strong>' + App.escapeHtml(u.ma_dinh_danh) + '</strong></td>' +
                    '  <td><strong>' + App.escapeHtml(u.ho_ten) + '</strong>' +
                    (u.gioi_tinh ? ' <small class="text-gray">(' + App.escapeHtml(u.gioi_tinh) + ')</small>' : '') +
                    '  </td>' +
                    '  <td>' + infoOrg + '</td>' +
                    '  <td><small>' + contactHtml + '</small></td>' +
                    '  <td class="text-center">' + App.trangThaiUserBadge(u.trang_thai) + '</td>' +
                    '  <td class="text-center">' +
                    '    <div class="table-actions justify-center">' +
                    '      <button class="btn btn-sm btn-outline btn-edit-user" data-id="' + u.id + '" title="Sửa thông tin">Sửa</button>' +
                    '      <button class="btn btn-sm btn-outline btn-reset-user-pass" data-id="' + u.id + '" title="Đặt lại mật khẩu">Đặt lại mật khẩu</button>' +
                    toggleBtn +
                    '    </div>' +
                    '  </td>' +
                    '</tr>';
                tbody.append(row);
            });
        },

        showFormModal: function (id) {
            var u = id ? this.findCached(id) : null;
            var isEdit = !!u;

            var defaultRole = currentViewMode === 'giang_vien' ? 'giang_vien' : 'sinh_vien';
            var currentRole = u ? u.vai_tro : defaultRole;

            var allKhoa = this.danhMuc.khoa;
            var allLopSV = this.danhMuc.lop_sinh_vien;

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
                '      <label>' + (currentRole === 'giang_vien' ? 'Mã giảng viên' : (currentRole === 'admin' ? 'Mã quản trị viên' : 'Mã sinh viên')) + '</label>' +
                '      <input type="text" class="form-control" id="modalMaDinhDanh" value="' + (u ? App.escapeHtml(u.ma_dinh_danh) : '') + '" placeholder="VD: ' + (currentRole === 'giang_vien' ? 'GV001' : 'SV001') + '" ' + (isEdit ? 'readonly' : '') + '>' +
                '      <div class="form-note">Mã định danh dùng để đăng nhập.</div>' +
                '    </div>' +
                (!isEdit ?
                '    <div class="form-group">' +
                '      <label>Mật khẩu khởi tạo</label>' +
                '      <input type="password" class="form-control" id="modalPassword" value="123456">' +
                '      <div class="form-note">Mật khẩu mặc định hệ thống là 123456.</div>' +
                '    </div>' : '') +
                '  </div>' +

                '  <div class="form-row">' +
                '    <div class="form-group" style="flex:2;">' +
                '      <label>Họ và tên đầy đủ</label>' +
                '      <input type="text" class="form-control" id="modalHoTen" value="' + (u ? App.escapeHtml(u.ho_ten) : '') + '" placeholder="Nhập họ và tên...">' +
                '    </div>' +
                '    <div class="form-group" style="flex:1;">' +
                '      <label>Vai trò hệ thống</label>' +
                '      <select class="form-control" id="modalVaiTro" ' + (isEdit ? 'disabled' : '') + '>' +
                '        <option value="sinh_vien" ' + (currentRole === 'sinh_vien' ? 'selected' : '') + '>Sinh viên</option>' +
                '        <option value="giang_vien" ' + (currentRole === 'giang_vien' ? 'selected' : '') + '>Giảng viên</option>' +
                '        <option value="admin" ' + (currentRole === 'admin' ? 'selected' : '') + '>Quản trị viên</option>' +
                '      </select>' +
                '    </div>' +
                '  </div>' +

                '  <!-- Trường bắt buộc cho Sinh viên -->' +
                '  <div class="form-group" id="groupLopSV" style="' + (currentRole === 'sinh_vien' ? '' : 'display:none;') + '">' +
                '    <label>Lớp sinh viên sinh hoạt</label>' +
                '    <select class="form-control" id="modalLopSV">' +
                '      <option value="">-- Chọn lớp sinh hoạt bắt buộc --</option>' + lopOptions +
                '    </select>' +
                '  </div>' +

                '  <!-- Trường bắt buộc cho Giảng viên -->' +
                '  <div class="form-group" id="groupKhoaGV" style="' + (currentRole === 'giang_vien' ? '' : 'display:none;') + '">' +
                '    <label>Khoa trực thuộc</label>' +
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

            var self = this;
            App.showInlineForm(html, '#userFormSlot', function () { self.showFormModal(); });
            $('#userFormSlot .inline-form-card').toggleClass('is-editing', isEdit);
            if (isEdit) App.focusInlineForm('#userFormSlot');
        },

        saveUser: function () {
            var self = this;
            var id = $('#modalUserId').val();
            var payload = {
                ma_dinh_danh: $('#modalMaDinhDanh').val(),
                ho_ten: $('#modalHoTen').val(),
                vai_tro: $('#modalVaiTro').val(),
                ngay_sinh: $('#modalNgaySinh').val(),
                gioi_tinh: $('#modalGioiTinh').val(),
                trang_thai: $('#modalTrangThai').val(),
                email: $('#modalEmail').val(),
                so_dien_thoai: $('#modalPhone').val(),
                dia_chi: $('#modalDiaChi').val(),
                lop_sinh_vien_id: $('#modalLopSV').val(),
                khoa_id: $('#modalKhoaGV').val()
            };
            if ($('#modalPassword').length) {
                payload.password = $('#modalPassword').val();
            }

            if (id) {
                var existingUser = this.findCached(id);
                // Cảnh báo khi khóa giảng viên đang phụ trách lớp học phần đang mở
                if (existingUser && existingUser.vai_tro === 'giang_vien' && payload.trang_thai === 'Đã khóa' &&
                    existingUser.trang_thai === 'Hoạt động' && existingUser.so_lop_dang_mo > 0) {
                    App.confirm(
                        '<strong>CẢNH BÁO AN TOÀN:</strong><br>' +
                        'Giảng viên <strong>' + App.escapeHtml(existingUser.ho_ten) + '</strong> hiện đang phụ trách <strong>' + existingUser.so_lop_dang_mo + ' lớp học phần đang phụ trách</strong>.<br>' +
                        'Khóa tài khoản sẽ ảnh hưởng đến việc vào điểm và điểm danh của các lớp này. Bạn vẫn muốn tiếp tục khóa?',
                        function () { self.sendSave(id, payload); }
                    );
                    return;
                }
            }

            self.sendSave(id, payload);
        },

        sendSave: function (id, payload) {
            var self = this;
            // Kiểm tra hợp lệ, trùng mã định danh / tên đăng nhập do backend xử lý (RULE-24, 25)
            var req = id
                ? Api.put('/api/taikhoan/users', $.extend({ id: parseInt(id, 10) }, payload))
                : Api.post('/api/taikhoan/users', payload);

            req.done(function (res) {
                App.showToast(res.message, 'success');
                self.showFormModal(); // đưa form về trạng thái thêm mới
                self.loadUsers();
            }).fail(Api.toastError);
        },

        toggleStatus: function (id) {
            var self = this;
            var u = this.findCached(id);
            if (!u) return;

            var isCurrentlyLocked = u.trang_thai === 'Đã khóa';
            var newStatus = isCurrentlyLocked ? 'Hoạt động' : 'Đã khóa';

            var confirmMsg;
            if (!isCurrentlyLocked && u.vai_tro === 'giang_vien' && u.so_lop_dang_mo > 0) {
                confirmMsg = '<strong>CẢNH BÁO AN TOÀN:</strong><br>' +
                    'Giảng viên <strong>' + App.escapeHtml(u.ho_ten) + '</strong> đang phụ trách <strong>' + u.so_lop_dang_mo + ' lớp học phần đang phụ trách</strong>.<br>' +
                    'Bạn có chắc chắn muốn khóa tài khoản này?';
            } else {
                confirmMsg = (isCurrentlyLocked ? 'Bạn có chắc chắn muốn mở khóa cho tài khoản <strong>' : 'Bạn có chắc chắn muốn khóa tài khoản <strong>') +
                    App.escapeHtml(u.ho_ten) + '</strong> (' + App.escapeHtml(u.ma_dinh_danh) + ')?';
            }

            App.confirm(confirmMsg, function () {
                Api.post('/api/taikhoan/users/trang-thai', { id: u.id, trang_thai: newStatus })
                    .done(function (res) {
                        App.showToast(res.message, 'info');
                        self.loadUsers();
                    })
                    .fail(Api.toastError);
            });
        },

        resetPassword: function (id) {
            var u = this.findCached(id);
            if (!u) return;

            App.confirm(
                'Đặt lại mật khẩu cho <strong>' + App.escapeHtml(u.ho_ten) + ' (' + App.escapeHtml(u.ma_dinh_danh) + ')</strong> về mật khẩu mặc định <code>123456</code>?',
                function () {
                    Api.post('/api/taikhoan/users/dat-lai-mat-khau', { id: u.id })
                        .done(function (res) { App.showToast(res.message, 'success'); })
                        .fail(Api.toastError);
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
