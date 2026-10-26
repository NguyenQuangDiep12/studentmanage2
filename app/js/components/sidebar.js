/* ================================================================
   COMPONENT: SIDEBAR NAVIGATION
   js/components/sidebar.js
   Khớp 100% ảnh media_1792963962565_c634adaf
   ================================================================ */

var SidebarComponent = (function ($) {
    'use strict';

    var roleLabels = {
        'admin': 'Quản trị viên',
        'giang_vien': 'Giảng viên',
        'sinh_vien': 'Sinh viên'
    };

    function render(currentUser, activePage) {
        if (!currentUser) return;
        var role = currentUser.vai_tro;

        // Thẻ hồ sơ trên Sidebar
        var shortInitials = (role === 'admin') ? 'SM' : (role === 'giang_vien' ? 'GV' : 'SV');
        $('#sidebarAvatar').text(shortInitials);
        $('#sidebarRoleTitle').text(roleLabels[role] || role);
        $('#sidebarGreeting').text('Xin chào ' + currentUser.ho_ten);

        var menuList = $('#sidebarNav').empty();

        // 1. Tổng quan (Chung cho cả 3 vai trò)
        menuList.append(createNavCard('dashboard', 'Tổng quan', 'Thống kê hệ thống và dữ liệu nhanh'));

        // Phân quyền theo vai trò
        if (role === 'admin') {
            menuList.append('<div class="nav-section-header">Quản lý hồ sơ</div>');
            menuList.append(createNavCard('users-sv', 'Hồ sơ sinh viên', 'Thêm, sửa, xóa thông tin sinh viên'));
            menuList.append(createNavCard('users-gv', 'Hồ sơ giảng viên', 'Thêm, sửa, xóa giảng viên và cấp mã'));

            menuList.append('<div class="nav-section-header">Đào tạo & Môn học</div>');
            menuList.append(createNavCard('mon-hoc', 'Môn học', 'Tạo môn học mới bằng cách nhập trực tiếp'));
            menuList.append(createNavCard('lop-hoc-phan', 'Lớp học phần', 'Quản lý lớp học phần và lịch học'));
            menuList.append(createNavCard('co-cau-dao-tao', 'Cơ cấu đào tạo', 'Khoa, chuyên ngành, CTĐT và nhóm tự chọn'));

            menuList.append('<div class="nav-section-header">Bảng tin & Thông báo</div>');
            menuList.append(createNavCard('tin-tuc-admin', 'Quản lý tin tức', 'Đăng tin, sửa tin và phê duyệt thông báo'));
        } else if (role === 'giang_vien') {
            menuList.append('<div class="nav-section-header">Công tác giảng dạy</div>');
            menuList.append(createNavCard('lop-hoc-phan', 'Lớp học phần phụ trách', 'Xem danh sách lớp và sinh viên phụ trách'));
            menuList.append(createNavCard('diem-danh', 'Điểm danh', 'Điểm danh có mặt, vắng mặt, đi muộn'));
            menuList.append(createNavCard('quan-ly-diem', 'Nhập điểm', 'Quản lý bảng điểm theo môn học'));
            menuList.append(createNavCard('tkb', 'Lịch giảng dạy', 'Thời khóa biểu giảng dạy theo tuần'));
            menuList.append(createNavCard('mon-hoc', 'Danh mục môn học', 'Tra cứu thông tin môn học và số tín chỉ'));
        } else if (role === 'sinh_vien') {
            menuList.append('<div class="nav-section-header">Học tập & Đăng ký</div>');
            menuList.append(createNavCard('dang-ky', 'Đăng ký học phần', 'Tra cứu lớp HP và đăng ký môn học'));
            menuList.append(createNavCard('tkb', 'Thời khóa biểu', 'Xem lịch học và phòng học theo tuần'));
            menuList.append(createNavCard('ket-qua', 'Kết quả học tập', 'Tra cứu bảng điểm và điểm tích lũy'));
        }

        // Chung
        menuList.append(createNavCard('tin-tuc', 'Tin tức & Thông báo', 'Xem thông báo chính thức từ nhà trường'));
        menuList.append(createNavCard('kien-nghi', 'Ý kiến & Kiến nghị', 'Gửi thắc mắc và nhận giải đáp học vụ'));

        // Cập nhật trạng thái active
        setActive(activePage || 'dashboard');

        // Bắt sự kiện click
        $('#sidebarNav').off('click', '.nav-card-item').on('click', '.nav-card-item', function () {
            var page = $(this).data('page');
            if (page) {
                App.navigate(page);
            }
        });
    }

    function createNavCard(pageId, title, desc) {
        return (
            '<div class="nav-card-item" data-page="' + pageId + '">' +
            '  <div class="nav-title">' + title + '</div>' +
            '  <div class="nav-desc">' + desc + '</div>' +
            '</div>'
        );
    }

    function setActive(pageId) {
        $('.nav-card-item').removeClass('active');
        $('.nav-card-item[data-page="' + pageId + '"]').addClass('active');
    }

    return {
        render: render,
        setActive: setActive
    };
})(jQuery);
