/* ================================================================
   APP.JS - Core Application Orchestrator & Router
   Quản lý điều hướng, phân quyền, đăng ký module và các helper dùng chung
   Đã tách thành phần Header, Sidebar, Dashboard, Modal, Toast
   ================================================================ */

var App = (function ($) {
    'use strict';

    var currentUser = null;
    var currentPage = 'dashboard';
    var modules = {};

    function registerModule(name, mod) {
        modules[name] = mod;
    }

    // Role mapping
    var roleLabels = {
        'admin': 'Quản trị viên',
        'giang_vien': 'Giảng viên',
        'sinh_vien': 'Sinh viên'
    };

    // Metadata các trang trong hệ thống
    var pageMetadata = {
        'dashboard': {
            category: 'BẢNG ĐIỀU KHIỂN',
            title: 'Tổng quan',
            desc: 'Thống kê hệ thống và dữ liệu nhanh',
            roles: ['admin', 'giang_vien', 'sinh_vien']
        },
        'users-sv': {
            category: 'QUẢN LÝ HỒ SƠ',
            title: 'Hồ sơ sinh viên',
            desc: 'Thêm, sửa, xóa thông tin sinh viên và quản lý lớp sinh hoạt',
            roles: ['admin']
        },
        'users-gv': {
            category: 'QUẢN LÝ HỒ SƠ',
            title: 'Hồ sơ giảng viên',
            desc: 'Thêm, sửa, xóa giảng viên và cấp mã định danh',
            roles: ['admin']
        },
        'mon-hoc': {
            category: 'ĐÀO TẠO & MÔN HỌC',
            title: 'Môn học',
            desc: 'Tạo môn học mới bằng cách nhập trực tiếp từ bàn phím',
            roles: ['admin', 'giang_vien']
        },
        'lop-hoc-phan': {
            category: 'ĐÀO TẠO & MÔN HỌC',
            title: 'Lớp học phần',
            desc: 'Quản lý danh sách lớp học phần, phòng học và lịch học tuần',
            roles: ['admin', 'giang_vien']
        },
        'co-cau-dao-tao': {
            category: 'ĐÀO TẠO & MÔN HỌC',
            title: 'Cơ cấu đào tạo',
            desc: 'Quản lý Khoa, Chuyên ngành, Chương trình đào tạo và Nhóm tự chọn',
            roles: ['admin']
        },
        'diem-danh': {
            category: 'CÔNG TÁC GIẢNG DẠY',
            title: 'Điểm danh',
            desc: 'Điểm danh chuyên cần sinh viên theo từng buổi học',
            roles: ['giang_vien', 'admin']
        },
        'quan-ly-diem': {
            category: 'CÔNG TÁC GIẢNG DẠY',
            title: 'Nhập điểm',
            desc: 'Quản lý bảng điểm theo môn học và tự động tính điểm tổng kết',
            roles: ['giang_vien', 'admin']
        },
        'dang-ky': {
            category: 'HỌC TẬP & ĐĂNG KÝ',
            title: 'Đăng ký học phần',
            desc: 'Tra cứu và đăng ký các lớp học phần trong kỳ',
            roles: ['sinh_vien']
        },
        'tkb': {
            category: 'LỊCH TRÌNH',
            title: 'Thời khóa biểu',
            desc: 'Thời khóa biểu học tập và giảng dạy theo từng tuần',
            roles: ['sinh_vien', 'giang_vien', 'admin']
        },
        'ket-qua': {
            category: 'HỌC TẬP TRỰC TUYẾN',
            title: 'Kết quả học tập',
            desc: 'Bảng điểm chi tiết học kỳ và điểm trung bình tích lũy',
            roles: ['sinh_vien']
        },
        'tin-tuc': {
            category: 'THÔNG TIN CHUNG',
            title: 'Tin tức & Thông báo',
            desc: 'Thông báo chính thức từ nhà trường và khoa',
            roles: ['admin', 'giang_vien', 'sinh_vien']
        },
        'tin-tuc-admin': {
            category: 'QUẢN TRỊ NỘI DUNG',
            title: 'Quản lý tin tức',
            desc: 'Đăng bài thông báo, chỉnh sửa và quản lý trạng thái hiển thị',
            roles: ['admin']
        },
        'kien-nghi': {
            category: 'TƯƠNG TÁC & HỖ TRỢ',
            title: 'Ý kiến & Kiến nghị',
            desc: 'Tiếp nhận đóng góp, phản hồi thắc mắc và giải đáp cho sinh viên',
            roles: ['admin', 'giang_vien', 'sinh_vien']
        }
    };

    // Chống mã độc XSS
    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function checkAuth() {
        var stored = localStorage.getItem('sms_current_user');
        if (!stored) {
            window.location.href = 'index.html';
            return false;
        }
        currentUser = JSON.parse(stored);
        return true;
    }

    function getCurrentUser() { return currentUser; }

    function logout() {
        localStorage.removeItem('sms_current_user');
        window.location.href = 'index.html';
    }

    function hasRole(roles) {
        if (!currentUser) return false;
        if (!roles || roles === 'all') return true;
        if (Array.isArray(roles)) return roles.indexOf(currentUser.vai_tro) !== -1;
        return roles.split(',').indexOf(currentUser.vai_tro) !== -1;
    }

    // Bộ điều phối chuyển trang (Page Navigator)
    function navigate(page) {
        var meta = pageMetadata[page];
        if (meta && meta.roles && !hasRole(meta.roles)) {
            ToastComponent.show('Bạn không có quyền truy cập chức năng này!', 'error');
            page = 'dashboard';
            meta = pageMetadata['dashboard'];
        }

        currentPage = page;

        // Cập nhật trạng thái active trên Sidebar
        SidebarComponent.setActive(page);

        // Cập nhật Banner tiêu đề trang
        if (meta) {
            $('#pageCategoryLabel').text(meta.category);
            $('#pageMainTitle').text(meta.title);
            $('#pageSubTitle').text(meta.desc);
        }

        // Điều phối render theo trang
        if (page === 'dashboard') {
            DashboardComponent.render();
        } else if (page === 'users-sv' || page === 'users-gv') {
            if (modules['users']) {
                modules['users'].render(page === 'users-sv' ? 'sinh_vien' : 'giang_vien');
            }
        } else if (modules[page] && typeof modules[page].render === 'function') {
            modules[page].render();
        } else {
            $('#contentArea').html(
                '<div class="card"><div class="card-body empty-state py-5 text-center">' +
                '<h4>Chức năng đang cập nhật</h4>' +
                '<p class="text-gray">Module ' + escapeHtml(page) + ' đang được hoàn thiện</p>' +
                '</div></div>'
            );
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Các hàm định dạng ngày tháng
    function formatDate(isoStr) {
        if (!isoStr) return '—';
        var d = new Date(isoStr);
        if (isNaN(d.getTime())) return isoStr;
        var day = ('0' + d.getDate()).slice(-2);
        var m = ('0' + (d.getMonth() + 1)).slice(-2);
        var y = d.getFullYear();
        return day + '/' + m + '/' + y;
    }

    function formatDateTime(isoStr) {
        if (!isoStr) return '—';
        var d = new Date(isoStr);
        if (isNaN(d.getTime())) return isoStr;
        var day = ('0' + d.getDate()).slice(-2);
        var m = ('0' + (d.getMonth() + 1)).slice(-2);
        var y = d.getFullYear();
        var hr = ('0' + d.getHours()).slice(-2);
        var min = ('0' + d.getMinutes()).slice(-2);
        return day + '/' + m + '/' + y + ' ' + hr + ':' + min;
    }

    function thuLabel(thu) {
        var labels = { 2: 'Thứ 2', 3: 'Thứ 3', 4: 'Thứ 4', 5: 'Thứ 5', 6: 'Thứ 6', 7: 'Thứ 7', 8: 'Chủ nhật' };
        return labels[thu] || ('Thứ ' + thu);
    }

    // Badge trạng thái chuẩn
    function trangThaiUserBadge(tt) {
        if (tt === 'Hoạt động' || tt === 'active') {
            return '<span class="badge badge-success">Hoạt động</span>';
        }
        return '<span class="badge badge-danger">Đã khóa</span>';
    }

    function trangThaiLHPBadge(tt) {
        if (tt === 'Đang mở') return '<span class="badge badge-success">Đang mở</span>';
        if (tt === 'Đã đóng') return '<span class="badge badge-warning">Đã đóng</span>';
        return '<span class="badge badge-danger">Đã hủy</span>';
    }

    function trangThaiDKBadge(tt) {
        if (tt === 'Đã đăng ký' || tt === 'da_dang_ky') return '<span class="badge badge-success">Đã đăng ký</span>';
        return '<span class="badge badge-danger">Đã hủy</span>';
    }

    function trangThaiTinTucBadge(tt) {
        if (tt === 'Công khai' || tt === 'cong_khai') return '<span class="badge badge-success">Công khai</span>';
        if (tt === 'Đã ẩn' || tt === 'an') return '<span class="badge badge-warning">Đã ẩn</span>';
        return '<span class="badge badge-secondary">Bản nháp</span>';
    }

    function ketQuaBadge(kq) {
        if (kq === 'Đạt') return '<span class="badge badge-success">Đạt</span>';
        return '<span class="badge badge-danger">Không đạt</span>';
    }

    function diemChuBadge(chu) {
        var colorMap = {
            'A': 'badge-success',
            'B': 'badge-info',
            'C': 'badge-warning',
            'D': 'badge-secondary',
            'F': 'badge-danger'
        };
        var cls = colorMap[chu] || 'badge-secondary';
        return '<span class="badge ' + cls + '">' + chu + '</span>';
    }

    // Khởi chạy ứng dụng
    function init() {
        if (!checkAuth()) return;

        // Render Header & Sidebar Components
        HeaderComponent.render(currentUser);
        SidebarComponent.render(currentUser, 'dashboard');

        // Điều hướng ban đầu đến trang Dashboard
        navigate('dashboard');
    }

    $(document).ready(function () {
        init();
    });

    return {
        init: init,
        navigate: navigate,
        registerModule: registerModule,
        getCurrentUser: getCurrentUser,
        hasRole: hasRole,
        escapeHtml: escapeHtml,
        formatDate: formatDate,
        formatDateTime: formatDateTime,
        thuLabel: thuLabel,
        showToast: function (msg, type) { ToastComponent.show(msg, type); },
        showModal: function (html, size) { ModalComponent.show(html, size); },
        closeModal: function () { ModalComponent.close(); },
        confirm: function (msg, cb) { ModalComponent.confirm(msg, cb); },
        trangThaiUserBadge: trangThaiUserBadge,
        trangThaiLHPBadge: trangThaiLHPBadge,
        trangThaiDKBadge: trangThaiDKBadge,
        trangThaiTinTucBadge: trangThaiTinTucBadge,
        ketQuaBadge: ketQuaBadge,
        diemChuBadge: diemChuBadge
    };
})(jQuery);
