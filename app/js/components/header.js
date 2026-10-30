/* ================================================================
   COMPONENT: TOP HEADER
   js/components/header.js
   Khớp 100% ảnh media_1792964722887_c602455d
   ================================================================ */

var HeaderComponent = (function ($) {
    'use strict';

    var roleLabels = {
        'admin': 'Quản trị viên',
        'giang_vien': 'Giảng viên',
        'sinh_vien': 'Sinh viên'
    };

    function render(currentUser) {
        if (!currentUser) return;
        var role = currentUser.vai_tro;

        // Avatar chữ cái đầu (VD: N, S)
        var initial = (currentUser.ho_ten || 'U').charAt(0).toUpperCase();
        $('#headerAvatar').text(initial);

        // Hiển thị tên người dùng và vai trò
        $('#headerUserName').text('Xin chào, ' + currentUser.ho_ten);
        $('#headerUserRole').text(roleLabels[role] || role);

        // Nút Reset dữ liệu: CHỈ hiển thị cho Quản trị viên
        if (role === 'admin') {
            $('#btnResetData').show();
        } else {
            $('#btnResetData').hide();
        }

        bindEvents(currentUser);
    }

    function bindEvents(currentUser) {
        // Đổi mật khẩu: Form 3 trường (Mật khẩu cũ, Mật khẩu mới, Xác nhận mật khẩu mới)
        $('#btnChangePassword').off('click').on('click', function () {
            showChangePasswordModal(currentUser);
        });

        // Đăng xuất
        $('#btnLogout').off('click').on('click', function () {
            ModalComponent.confirm(
                'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?',
                function () {
                    // RULE-26: thu hồi token trên máy chủ rồi xóa phiên ở trình duyệt
                    Api.post('/api/taikhoan/dang-xuat').always(function () {
                        Api.clearSession();
                        window.location.href = 'index.html';
                    });
                }
            );
        });

        // Reset dữ liệu (Chỉ Admin)
        $('#btnResetData').off('click').on('click', function () {
            if (!currentUser || currentUser.vai_tro !== 'admin') {
                ToastComponent.show('Chỉ Quản trị viên mới có quyền đặt lại dữ liệu!', 'error');
                return;
            }
            // Dữ liệu nằm trong SQLite trên máy chủ: chỉ tải lại dữ liệu mới nhất, không giả lập khôi phục
            App.navigate('dashboard');
            ToastComponent.show('Đã tải lại dữ liệu mới nhất từ máy chủ', 'info');
        });

        // Chuông thông báo
        $('#btnNotifications').off('click').on('click', function () {
            App.loadTerms(function (d) {
                var ht = d.hien_tai || {};
                ToastComponent.show(ht.nam_hoc
                    ? 'Học kỳ hiện hành: ' + (ht.hoc_ky === 3 ? 'Học kỳ hè' : 'Học kỳ ' + ht.hoc_ky) + ' năm học ' + ht.nam_hoc
                    : 'Chưa có dữ liệu học kỳ', 'info');
            });
        });
    }


function showChangePasswordModal(currentUser) {
    var html =
        '<div class="modal-header">' +
        '  <h3>Đổi mật khẩu</h3>' +
        '  <button class="modal-close" onclick="ModalComponent.close()">&times;</button>' +
        '</div>' +
        '<div class="modal-body">' +
        '  <div class="form-group">' +
        '    <label>Mật khẩu cũ</label>' +
        '    <input type="password" class="form-control" id="cpCurrent" placeholder="Nhập mật khẩu hiện tại">' +
        '  </div>' +
        '  <div class="form-group">' +
        '    <label>Mật khẩu mới</label>' +
        '    <input type="password" class="form-control" id="cpNew" placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)">' +
        '  </div>' +
        '  <div class="form-group">' +
        '    <label>Xác nhận mật khẩu mới</label>' +
        '    <input type="password" class="form-control" id="cpConfirm" placeholder="Nhập lại mật khẩu mới">' +
        '  </div>' +
        '</div>' +
        '<div class="modal-footer">' +
        '  <button class="btn btn-outline" onclick="ModalComponent.close()">Hủy</button>' +
        '  <button class="btn btn-primary" id="btnDoSavePassword">Cập nhật mật khẩu</button>' +
        '</div>';

    ModalComponent.show(html);

    $('#btnDoSavePassword').off('click').on('click', function () {
        var cur = $('#cpCurrent').val();
        var n1 = $('#cpNew').val();
        var n2 = $('#cpConfirm').val();

        var $button = $('#btnDoSavePassword');
        $button.prop('disabled', true);

        // Kiểm tra dữ liệu do backend thực hiện, frontend hiển thị thông báo trả về
        Api.post('/api/taikhoan/doi-mat-khau', {
            old_password: cur,
            new_password: n1,
            confirm_password: n2
        })
            .done(function (response) {
                ModalComponent.close();
                ToastComponent.show(response.message || 'Đổi mật khẩu thành công.', 'success');
            })
            .fail(function (xhr) {
                if (xhr.status !== 401) {
                    ToastComponent.show(Api.errorMessage(xhr, 'Không thể đổi mật khẩu.'), 'error');
                }
            })
            .always(function () {
                $button.prop('disabled', false);
            });
    });
}

    return {
        render: render
    };
})(jQuery);
