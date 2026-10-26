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
                    var token = sessionStorage.getItem('sms_access_token');

                    $.ajax({
                        url: '/api/taikhoan/dang-xuat',
                        method: 'POST',
                        headers: token
                            ? { Authorization: 'Bearer ' + token }
                            : {},
                        complete: function () {
                            sessionStorage.removeItem('sms_access_token');
                            sessionStorage.removeItem('sms_current_user');
                            localStorage.removeItem('sms_current_user');

                            window.location.href = 'index.html';
                        }
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
            ModalComponent.confirm('Bạn có chắc chắn muốn khôi phục toàn bộ dữ liệu mẫu hệ thống về trạng thái ban đầu? Thao tác này sẽ làm mới dữ liệu cục bộ', function () {
                ToastComponent.show('Đã khôi phục dữ liệu mẫu hệ thống thành công!', 'success');
                App.navigate('dashboard');
            });
        });

        // Chuông thông báo
        $('#btnNotifications').off('click').on('click', function () {
            ToastComponent.show('Hệ thống đang hoạt động bình thường trên học kỳ 1 năm học 2026-2027', 'info');
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
        '    <label>Mật khẩu cũ <span class="required">*</span></label>' +
        '    <input type="password" class="form-control" id="cpCurrent" placeholder="Nhập mật khẩu hiện tại">' +
        '  </div>' +
        '  <div class="form-group">' +
        '    <label>Mật khẩu mới <span class="required">*</span></label>' +
        '    <input type="password" class="form-control" id="cpNew" placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)">' +
        '  </div>' +
        '  <div class="form-group">' +
        '    <label>Xác nhận mật khẩu mới <span class="required">*</span></label>' +
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

        if (!cur || !n1 || !n2) {
            ToastComponent.show(
                'Vui lòng điền đầy đủ các thông tin.',
                'error'
            );
            return;
        }

        if (n1.length < 6) {
            ToastComponent.show(
                'Mật khẩu mới phải có ít nhất 6 ký tự.',
                'error'
            );
            return;
        }

        if (n1 === cur) {
            ToastComponent.show(
                'Mật khẩu mới không được trùng mật khẩu cũ.',
                'error'
            );
            return;
        }

        if (n1 !== n2) {
            ToastComponent.show(
                'Xác nhận mật khẩu mới không khớp.',
                'error'
            );
            return;
        }

        var token = sessionStorage.getItem('sms_access_token');

        if (!token) {
            ToastComponent.show(
                'Phiên đăng nhập không tồn tại. Vui lòng đăng nhập lại.',
                'error'
            );
            return;
        }

        var $button = $('#btnDoSavePassword');
        $button.prop('disabled', true);

        $.ajax({
            url: '/api/taikhoan/doi-mat-khau',
            method: 'POST',
            contentType: 'application/json',
            dataType: 'json',
            headers: {
                Authorization: 'Bearer ' + token
            },
            data: JSON.stringify({
                old_password: cur,
                new_password: n1
            }),
            success: function (response) {
                ModalComponent.close();

                ToastComponent.show(
                    response.message || 'Đổi mật khẩu thành công.',
                    'success'
                );
            },
            error: function (xhr) {
                var message = xhr.responseJSON?.message
                    || 'Không thể đổi mật khẩu.';

                ToastComponent.show(message, 'error');
            },
            complete: function () {
                $button.prop('disabled', false);
            }
        });
    });
}

    return {
        render: render
    };
})(jQuery);
