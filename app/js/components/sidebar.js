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

        // Menu theo vai trò (không chia nhóm đánh số, giống giao diện cũ)
        var item = function (page, title, desc) { menuList.append(createNavCard(page, title, desc)); };

        if (role === 'admin') {
            item('dashboard', 'Tổng quan', 'Thống kê hệ thống và dữ liệu nhanh');
            item('co-cau-dao-tao', 'Cơ cấu đào tạo', 'Khoa, chuyên ngành, CTĐT, nhóm tự chọn, lớp sinh viên');
            item('chuong-trinh-dao-tao', 'Khung chương trình', 'Môn bắt buộc theo học kỳ và nhóm môn tự chọn');
            item('mon-hoc', 'Danh sách môn học', 'Thêm, sửa, xóa, tìm kiếm môn học');
            item('hoc-ky', 'Học kỳ', 'Danh sách, thêm / sửa và chi tiết học kỳ');
            item('lop-hoc-phan', 'Lớp học phần', 'Danh sách lớp, lịch học và buổi học');
            item('ds-dang-ky', 'Đăng ký học phần', 'Danh sách sinh viên đăng ký theo lớp');
            item('tkb', 'Thời khóa biểu', 'Xem lịch học theo tuần');
            item('diem-danh', 'Điểm danh', 'Chọn buổi học và điểm danh sinh viên');
            item('quan-ly-diem', 'Nhập & quản lý điểm', 'Nhập, sửa, xóa điểm theo lớp học phần');
            item('tra-cuu-diem', 'Tra cứu bảng điểm', 'Chọn lớp sinh viên, sinh viên rồi xem kết quả');
            item('tin-tuc-admin', 'Quản lý tin tức', 'Đăng, sửa, xóa tin tức');
            item('kien-nghi', 'Quản lý kiến nghị', 'Theo dõi và phản hồi kiến nghị');
            item('users-sv', 'Tài khoản sinh viên', 'Danh sách, thêm, sửa, khóa tài khoản');
            item('users-gv', 'Tài khoản giảng viên', 'Danh sách, thêm, sửa, khóa tài khoản');
        } else if (role === 'giang_vien') {
            // Thứ tự và tên theo mã nguồn cũ (StudentManagement - roleSections.lecturer)
            item('mon-hoc', 'Môn học', 'Tự tạo môn học mới trước khi mở lớp học phần');
            item('quan-ly-diem', 'Nhập điểm', 'Nhập và chỉnh sửa điểm số');
            item('tkb', 'Thời khóa biểu tuần', 'Xem lịch giảng dạy trong tuần từ các lớp học phần đã tạo');
            item('lop-hoc-phan', 'Lớp học phần', 'Tạo lớp để sinh viên tự đăng ký môn học');
            item('tin-tuc', 'Tin tức', 'Theo dõi các thông báo mới nhất từ admin');
            // Chức năng mới của hệ thống hiện tại
            item('dashboard', 'Tổng quan', 'Thống kê hệ thống và dữ liệu nhanh');
            item('chuong-trinh-dao-tao', 'Khung chương trình', 'Môn bắt buộc theo học kỳ và nhóm môn tự chọn');
            item('ds-dang-ky', 'Đăng ký học phần', 'Danh sách sinh viên đăng ký lớp');
            item('diem-danh', 'Điểm danh', 'Chọn buổi học và điểm danh sinh viên');
            item('tra-cuu-diem', 'Tra cứu bảng điểm', 'Chọn lớp sinh viên, sinh viên rồi xem kết quả');
            item('kien-nghi', 'Kiến nghị', 'Xem và phản hồi kiến nghị');
        } else if (role === 'sinh_vien') {
            // Thứ tự và tên theo mã nguồn cũ (StudentManagement - roleSections.student)
            item('dashboard', 'Tổng quan', 'Thông tin nhanh về học tập');
            item('ket-qua', 'Điểm số', 'Xem dashboard bảng điểm và kết quả học tập');
            item('tkb', 'Thời khóa biểu tuần', 'Xem thời khóa biểu tuần dạng lưới theo môn đã đăng ký');
            item('dang-ky', 'Đăng ký môn', 'Đăng ký hoặc hủy đăng ký lớp học phần');
            item('tin-tuc', 'Tin tức', 'Xem các thông báo mới nhất từ admin');
            item('kien-nghi', 'Gửi ý kiến', 'Gửi phản hồi hoặc kiến nghị trực tiếp cho admin');
            // Chức năng mới của hệ thống hiện tại
            item('chuong-trinh-dao-tao', 'Khung chương trình', 'Khung chương trình và các môn đã học');
        }

        // Đổi mật khẩu đặt ở cuối menu (mở hộp thoại đổi mật khẩu có sẵn ở header)
        menuList.append(
            '<div class="nav-card-item" data-action="change-password">' +
            '  <div class="nav-title">Đổi mật khẩu</div>' +
            '  <div class="nav-desc">Cập nhật mật khẩu đăng nhập</div>' +
            '</div>');

        // Cập nhật trạng thái active
        setActive(activePage || 'dashboard');

        // Bắt sự kiện click
        $('#sidebarNav').off('click', '.nav-card-item').on('click', '.nav-card-item', function () {
            if ($(this).data('action') === 'change-password') {
                $('#btnChangePassword').trigger('click');
                return;
            }
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
