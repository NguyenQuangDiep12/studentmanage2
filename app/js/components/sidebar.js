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

        // Menu theo sơ đồ chức năng: 1. Cơ cấu đào tạo · 2. Quản lý môn học · 3. Tổ chức giảng dạy ·
        // 4. Kết quả học tập · 5. Tin tức · 6. Kiến nghị · 7. Tài khoản & phân quyền (mục hiện theo vai trò)
        var sec = function (title) { menuList.append('<div class="nav-section-header">' + title + '</div>'); };
        var item = function (page, title, desc) { menuList.append(createNavCard(page, title, desc)); };

        item('dashboard', 'Tổng quan', 'Thống kê hệ thống và dữ liệu nhanh');

        if (role === 'admin') {
            sec('1. Cơ cấu đào tạo');
            item('co-cau-dao-tao', 'Cơ cấu đào tạo', 'Khoa, chuyên ngành, CTĐT, nhóm tự chọn, lớp sinh viên');
            item('chuong-trinh-dao-tao', 'Khung chương trình', 'Môn bắt buộc theo học kỳ và nhóm môn tự chọn');

            sec('2. Quản lý môn học');
            item('mon-hoc', 'Danh sách môn học', 'Thêm, sửa, xóa, tìm kiếm môn học');

            sec('3. Tổ chức giảng dạy');
            item('hoc-ky', 'Học kỳ', 'Danh sách, thêm / sửa và chi tiết học kỳ');
            item('lop-hoc-phan', 'Lớp học phần', 'Danh sách lớp, lịch học và buổi học');
            item('ds-dang-ky', 'Đăng ký học phần', 'Danh sách sinh viên đăng ký theo lớp');
            item('tkb', 'Thời khóa biểu', 'Xem lịch học theo tuần');
            item('diem-danh', 'Điểm danh', 'Chọn buổi học và điểm danh sinh viên');

            sec('4. Kết quả học tập');
            item('quan-ly-diem', 'Nhập & quản lý điểm', 'Nhập, sửa, xóa điểm theo lớp học phần');
            item('tra-cuu-diem', 'Tra cứu bảng điểm', 'Chọn lớp sinh viên → sinh viên → kết quả');

            sec('5. Tin tức');
            item('tin-tuc-admin', 'Quản lý tin tức', 'Đăng, sửa, xóa tin tức');

            sec('6. Kiến nghị');
            item('kien-nghi', 'Quản lý kiến nghị', 'Theo dõi và phản hồi kiến nghị');

            sec('7. Tài khoản & phân quyền');
            item('users-sv', 'Tài khoản sinh viên', 'Danh sách, thêm, sửa, khóa tài khoản');
            item('users-gv', 'Tài khoản giảng viên', 'Danh sách, thêm, sửa, khóa tài khoản');
        } else if (role === 'giang_vien') {
            sec('1. Cơ cấu đào tạo');
            item('chuong-trinh-dao-tao', 'Khung chương trình', 'Môn bắt buộc theo học kỳ và nhóm môn tự chọn');

            sec('2. Quản lý môn học');
            item('mon-hoc', 'Danh sách môn học', 'Tra cứu và tạo môn học');

            sec('3. Tổ chức giảng dạy');
            item('lop-hoc-phan', 'Lớp học phần', 'Lớp phụ trách, lịch học và buổi học');
            item('ds-dang-ky', 'Đăng ký học phần', 'Danh sách sinh viên đăng ký lớp');
            item('tkb', 'Thời khóa biểu', 'Lịch giảng dạy theo tuần');
            item('diem-danh', 'Điểm danh', 'Chọn buổi học và điểm danh sinh viên');

            sec('4. Kết quả học tập');
            item('quan-ly-diem', 'Nhập & quản lý điểm', 'Nhập, sửa, xóa điểm theo lớp học phần');
            item('tra-cuu-diem', 'Tra cứu bảng điểm', 'Chọn lớp sinh viên → sinh viên → kết quả');

            sec('5. Tin tức');
            item('tin-tuc', 'Danh sách tin tức', 'Xem thông báo chính thức');

            sec('6. Kiến nghị');
            item('kien-nghi', 'Kiến nghị', 'Xem và phản hồi kiến nghị');
        } else if (role === 'sinh_vien') {
            sec('1. Chương trình học');
            item('chuong-trinh-dao-tao', 'Khung chương trình', 'Khung chương trình và các môn đã học');

            sec('3. Tổ chức giảng dạy');
            item('dang-ky', 'Đăng ký học phần', 'Đăng ký và hủy đăng ký lớp học phần');
            item('tkb', 'Thời khóa biểu', 'Xem lịch học theo tuần');

            sec('4. Kết quả học tập');
            item('ket-qua', 'Tra cứu bảng điểm', 'Điểm theo môn, kết quả theo học kỳ');

            sec('5. Tin tức');
            item('tin-tuc', 'Danh sách tin tức', 'Xem thông báo chính thức');

            sec('6. Kiến nghị');
            item('kien-nghi', 'Gửi & theo dõi kiến nghị', 'Gửi kiến nghị và theo dõi trạng thái');
        }

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
