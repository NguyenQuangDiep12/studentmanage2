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
            category: 'TÀI KHOẢN & PHÂN QUYỀN',
            title: 'Hồ sơ sinh viên',
            desc: 'Thêm, sửa, xóa thông tin sinh viên và quản lý lớp sinh hoạt',
            roles: ['admin']
        },
        'users-gv': {
            category: 'TÀI KHOẢN & PHÂN QUYỀN',
            title: 'Hồ sơ giảng viên',
            desc: 'Thêm, sửa, xóa giảng viên và cấp mã định danh',
            roles: ['admin']
        },
        'mon-hoc': {
            category: 'QUẢN LÝ MÔN HỌC',
            title: 'Môn học',
            desc: 'Tạo môn học mới bằng cách nhập trực tiếp từ bàn phím',
            roles: ['admin', 'giang_vien']
        },
        'lop-hoc-phan': {
            category: 'TỔ CHỨC GIẢNG DẠY',
            title: 'Lớp học phần',
            desc: 'Quản lý danh sách lớp học phần, phòng học và lịch học tuần',
            roles: ['admin', 'giang_vien']
        },
        'co-cau-dao-tao': {
            category: 'CƠ CẤU ĐÀO TẠO',
            title: 'Cơ cấu đào tạo',
            desc: 'Quản lý Khoa, Chuyên ngành, Chương trình đào tạo và Nhóm tự chọn',
            roles: ['admin']
        },
        'chuong-trinh-dao-tao': {
            category: 'CƠ CẤU ĐÀO TẠO',
            title: 'Chương trình đào tạo',
            desc: 'Khung môn học theo học kỳ - năm học và các nhóm tự chọn',
            roles: ['admin', 'giang_vien', 'sinh_vien']
        },
        'hoc-ky': {
            category: 'TỔ CHỨC GIẢNG DẠY',
            title: 'Học kỳ',
            desc: 'Danh sách học kỳ, thêm / sửa học kỳ và danh sách lớp học phần thuộc học kỳ',
            roles: ['admin']
        },
        'ds-dang-ky': {
            category: 'TỔ CHỨC GIẢNG DẠY',
            title: 'Đăng ký học phần',
            desc: 'Danh sách sinh viên đăng ký theo lớp học phần',
            roles: ['admin', 'giang_vien']
        },
        'tra-cuu-diem': {
            category: 'KẾT QUẢ HỌC TẬP',
            title: 'Tra cứu bảng điểm sinh viên',
            desc: 'Chọn lớp sinh viên, chọn sinh viên để xem điểm theo môn và kết quả theo học kỳ',
            roles: ['admin', 'giang_vien']
        },
        'diem-danh': {
            category: 'TỔ CHỨC GIẢNG DẠY',
            title: 'Điểm danh',
            desc: 'Điểm danh chuyên cần sinh viên theo từng buổi học',
            roles: ['giang_vien', 'admin']
        },
        'quan-ly-diem': {
            category: 'KẾT QUẢ HỌC TẬP',
            title: 'Nhập & quản lý điểm',
            desc: 'Quản lý bảng điểm theo môn học và tự động tính điểm tổng kết',
            roles: ['giang_vien', 'admin']
        },
        'dang-ky': {
            category: 'TỔ CHỨC GIẢNG DẠY',
            title: 'Đăng ký học phần',
            desc: 'Tra cứu và đăng ký các lớp học phần trong kỳ',
            roles: ['sinh_vien']
        },
        'tkb': {
            category: 'TỔ CHỨC GIẢNG DẠY',
            title: 'Thời khóa biểu',
            desc: 'Thời khóa biểu học tập và giảng dạy theo từng tuần',
            roles: ['sinh_vien', 'giang_vien', 'admin']
        },
        'ket-qua': {
            category: 'KẾT QUẢ HỌC TẬP',
            title: 'Kết quả học tập',
            desc: 'Bảng điểm chi tiết học kỳ và điểm trung bình tích lũy',
            roles: ['sinh_vien']
        },
        'tin-tuc': {
            category: 'TIN TỨC',
            title: 'Tin tức & Thông báo',
            desc: 'Thông báo chính thức từ nhà trường và khoa',
            roles: ['giang_vien', 'sinh_vien']   // quản trị viên dùng trang Quản lý tin tức
        },
        'tin-tuc-admin': {
            category: 'TIN TỨC',
            title: 'Quản lý tin tức',
            desc: 'Đăng bài thông báo, chỉnh sửa và quản lý trạng thái hiển thị',
            roles: ['admin']
        },
        'kien-nghi': {
            category: 'KIẾN NGHỊ',
            title: 'Ý kiến & Kiến nghị',
            desc: 'Tiếp nhận đóng góp, phản hồi thắc mắc và giải đáp cho sinh viên',
            roles: ['admin', 'giang_vien', 'sinh_vien']
        }
    };

    // ---- Học kỳ / năm học lấy từ API (không gán cứng) ----
    var termsData = null;

    function loadTerms(cb) {
        Api.get('/api/lophocphan/nam-hoc')
            .done(function (res) { termsData = res.data; cb(termsData); })
            .fail(function (xhr) {
                Api.toastError(xhr);
                termsData = { nam_hoc: [], hoc_ky: [], hien_tai: { hoc_ky: 1, nam_hoc: '' } };
                cb(termsData);
            });
    }

    /**
     * Điền danh sách năm học vào ô chọn và chọn sẵn học kỳ hiện hành.
     * Giữ nguyên các option sẵn có (VD "Tất cả năm học"). opts.prefix: nhãn đứng trước năm.
     */
    function fillTermSelects(hkSel, nhSel, opts, cb) {
        opts = opts || {};
        loadTerms(function (d) {
            var $nh = $(nhSel);
            d.nam_hoc.forEach(function (nh) {
                $nh.append('<option value="' + nh + '">' + (opts.prefix || '') + nh + '</option>');
            });
            if (d.hien_tai) {
                if (d.hien_tai.nam_hoc) $nh.val(d.hien_tai.nam_hoc);
                if (hkSel) $(hkSel).val(String(d.hien_tai.hoc_ky));
            }
            if (typeof cb === 'function') cb(d);
        });
    }

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
        // Người dùng hiển thị phải khớp với Bearer token gửi lên API (cùng một nơi lưu)
        var session = Api.getSession();
        if (!session) {
            Api.clearSession();
            window.location.href = 'index.html';
            return false;
        }
        currentUser = session.user;
        return true;
    }

    function getCurrentUser() { return currentUser; }

    function logout() {
        localStorage.removeItem('sms_current_user');
        localStorage.removeItem('sms_access_token');
        sessionStorage.removeItem('sms_current_user');
        sessionStorage.removeItem('sms_access_token');
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

    // RULE-TKB-01, RULE-TKB-04: bảng giờ 13 tiết cố định của trường (khai báo trong mã nguồn, không lưu DB).
    // Giờ bắt đầu theo tiết bắt đầu, giờ kết thúc theo tiết kết thúc - không cộng phút.
    var TIET_GIO = {
        1: ['06:45', '07:35'], 2: ['07:45', '08:35'], 3: ['08:45', '09:35'], 4: ['09:45', '10:35'],
        5: ['10:45', '11:35'], 6: ['12:30', '13:20'], 7: ['13:30', '14:20'], 8: ['14:30', '15:20'],
        9: ['15:30', '16:20'], 10: ['16:30', '17:20'], 11: ['17:30', '18:20'], 12: ['18:30', '19:20'],
        13: ['19:30', '20:20']
    };

    function gioHoc(tietBatDau, tietKetThuc) {
        var a = TIET_GIO[tietBatDau], b = TIET_GIO[tietKetThuc];
        return a && b ? a[0] + ' - ' + b[1] : '';
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

    // RULE-08: lớp học phần chỉ có 2 trạng thái - Đang mở đăng ký / Đóng đăng ký (hết hạn tự đóng).
    // Ưu tiên giá trị server tính sẵn (dang_mo_dang_ky), nếu không có thì tính theo thời gian mở/đóng.
    function dangMoDangKy(l) {
        if (!l) return false;
        if (typeof l.dang_mo_dang_ky === 'boolean') return l.dang_mo_dang_ky;
        if (!l.thoi_gian_mo_dang_ky || !l.thoi_gian_dong_dang_ky) return false;
        var now = new Date();
        return now >= new Date(String(l.thoi_gian_mo_dang_ky).replace(' ', 'T')) &&
            now <= new Date(String(l.thoi_gian_dong_dang_ky).replace(' ', 'T'));
    }
    function trangThaiLopBadge(l) {
        return dangMoDangKy(l)
            ? '<span class="badge badge-success"><i class="fa-solid fa-lock-open"></i> Đang mở đăng ký</span>'
            : '<span class="badge badge-secondary"><i class="fa-solid fa-lock"></i> Đóng đăng ký</span>';
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
            'B+': 'badge-info',
            'B': 'badge-info',
            'C+': 'badge-warning',
            'C': 'badge-warning',
            'D+': 'badge-secondary',
            'D': 'badge-secondary',
            'F': 'badge-danger'
        };
        var cls = colorMap[chu] || 'badge-secondary';
        return '<span class="badge ' + cls + '">' + chu + '</span>';
    }

    // Khởi chạy ứng dụng
    function init() {
        // Nút "Hướng dẫn" trên tiêu đề trang: thao tác nghiệp vụ + quy tắc của trang hiện tại
        $('#btnPageHelp').off('click').on('click', function () {
            HelpComponent.show(currentPage);
        });

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
        TIET_GIO: TIET_GIO,
        SO_TIET_NGAY: 13,
        gioHoc: gioHoc,
        loadTerms: loadTerms,
        fillTermSelects: fillTermSelects,
        getTerms: function () { return termsData; },
        showToast: function (msg, type) { ToastComponent.show(msg, type); },
        showModal: function (html, size) { ModalComponent.show(html, size); },
        closeModal: function () { ModalComponent.close(); },
        confirm: function (msg, cb) { ModalComponent.confirm(msg, cb); },
        trangThaiUserBadge: trangThaiUserBadge,
        trangThaiLHPBadge: trangThaiLHPBadge,
        dangMoDangKy: dangMoDangKy,
        trangThaiLopBadge: trangThaiLopBadge,
        trangThaiDKBadge: trangThaiDKBadge,
        trangThaiTinTucBadge: trangThaiTinTucBadge,
        ketQuaBadge: ketQuaBadge,
        diemChuBadge: diemChuBadge
    };
})(jQuery);
