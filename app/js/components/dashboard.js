/* ================================================================
   COMPONENT: DASHBOARD OVERVIEW (BẢNG ĐIỀU KHIỂN TỔNG QUAN)
   js/components/dashboard.js
   Số liệu lấy từ API: GET /api/taikhoan/thong-ke
   ================================================================ */

var DashboardComponent = (function ($) {
    'use strict';

    function card(label, value, desc, page, color) {
        return '<div class="stat-modern-card"' + (page ? ' style="cursor:pointer;" onclick="App.navigate(\'' + page + '\')"' : '') + '>' +
            '  <div class="stat-label">' + label + '</div>' +
            '  <div class="stat-number"' + (color ? ' style="color:' + color + ';"' : '') + '>' + value + '</div>' +
            '  <div class="stat-desc">' + desc + '</div>' +
            '</div>';
    }

    function render() {
        $('#contentArea').html('<div class="card"><div class="card-body text-center text-muted py-4"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải số liệu...</div></div>');

        Api.get('/api/taikhoan/thong-ke')
            .done(function (res) { draw(res.data || {}); })
            .fail(function (xhr) {
                Api.toastError(xhr);
                $('#contentArea').html('<div class="alert alert-danger"><i class="fa-solid fa-triangle-exclamation"></i> ' + App.escapeHtml(Api.errorMessage(xhr)) + '</div>');
            });
    }

    function draw(d) {
        var currentUser = App.getCurrentUser();
        var role = currentUser ? currentUser.vai_tro : 'sinh_vien';
        var isAdmin = role === 'admin';

        var html =
            '<div class="stats-grid-modern">' +
            card('Sinh viên', d.tong_sinh_vien || 0, 'Tổng hồ sơ sinh viên', isAdmin ? 'users-sv' : '') +
            card('Người dùng', d.tong_nguoi_dung || 0, 'Tài khoản đăng nhập', isAdmin ? 'users-sv' : '') +
            card('Giảng viên', d.tong_giang_vien || 0, 'Tài khoản giảng viên', isAdmin ? 'users-gv' : '') +
            card('Môn học', d.tong_mon_hoc || 0, 'Môn học đang hoạt động', role !== 'sinh_vien' ? 'mon-hoc' : '') +
            card('Lớp học phần', d.tong_lop_hoc_phan || 0, 'Lớp học phần trong hệ thống', role !== 'sinh_vien' ? 'lop-hoc-phan' : '') +
            card('Lượt đăng ký', d.tong_dang_ky || 0, 'Tổng lượt đăng ký học phần', role === 'sinh_vien' ? 'dang-ky' : '') +
            card('Ý kiến sinh viên', d.tong_kien_nghi || 0, 'Tổng phản hồi gửi cho admin', 'kien-nghi') +
            card('Tin tức', d.tong_tin_tuc || 0, 'Số thông báo đã công bố', 'tin-tuc') +
            card('Điểm TB hệ thống', d.diem_trung_binh != null ? Number(d.diem_trung_binh).toFixed(1) : '—', 'Trung bình điểm tổng kết', '', 'var(--primary)') +
            '</div>' +

            '<div class="two-col-grid">' +
            '  <div class="card">' +
            '    <div class="card-header">' +
            '      <div>' +
            '        <h3>Sinh viên mới nhất</h3>' +
            '        <p style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">Danh sách hồ sơ sinh viên vừa có trong hệ thống</p>' +
            '      </div>' +
            (isAdmin ? '      <button class="btn btn-sm btn-outline" onclick="App.navigate(\'users-sv\')">Xem tất cả</button>' : '') +
            '    </div>' +
            '    <div class="card-body p-0">' +
            '      <table class="data-table">' +
            '        <thead><tr><th>MSSV</th><th>Họ và tên</th><th>Lớp sinh hoạt</th><th class="text-center">Trạng thái</th></tr></thead>' +
            '        <tbody>' + renderRecentStudents(d.sinh_vien_moi || []) + '</tbody>' +
            '      </table>' +
            '    </div>' +
            '  </div>' +
            '  <div class="card">' +
            '    <div class="card-header">' +
            '      <div>' +
            '        <h3>Lớp học phần nổi bật</h3>' +
            '        <p style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">Danh sách các lớp học phần và sĩ số sinh viên</p>' +
            '      </div>' +
            (role !== 'sinh_vien' ? '      <button class="btn btn-sm btn-outline" onclick="App.navigate(\'lop-hoc-phan\')">Xem tất cả</button>' : '') +
            '    </div>' +
            '    <div class="card-body p-0">' +
            '      <table class="data-table">' +
            '        <thead><tr><th>Mã lớp</th><th>Môn học</th><th>Sĩ số</th><th class="text-center">Trạng thái</th></tr></thead>' +
            '        <tbody>' + renderFeaturedClasses(d.lop_noi_bat || []) + '</tbody>' +
            '      </table>' +
            '    </div>' +
            '  </div>' +
            '</div>';

        $('#contentArea').html(html);
    }

    function renderRecentStudents(students) {
        if (students.length === 0) {
            return '<tr><td colspan="4" class="text-center text-muted py-3">Chưa có sinh viên nào</td></tr>';
        }
        return students.map(function (s) {
            return '<tr>' +
                '  <td><strong>' + App.escapeHtml(s.ma_dinh_danh) + '</strong></td>' +
                '  <td>' + App.escapeHtml(s.ho_ten) + '</td>' +
                '  <td>' + (s.ma_lop ? App.escapeHtml(s.ma_lop) : '<span class="text-gray">—</span>') + '</td>' +
                '  <td class="text-center">' + App.trangThaiUserBadge(s.trang_thai) + '</td>' +
                '</tr>';
        }).join('');
    }

    function renderFeaturedClasses(classes) {
        if (classes.length === 0) {
            return '<tr><td colspan="4" class="text-center text-muted py-3">Chưa có lớp học phần nào</td></tr>';
        }
        return classes.map(function (l) {
            return '<tr>' +
                '  <td><strong>' + App.escapeHtml(l.ma_lop_hoc_phan) + '</strong></td>' +
                '  <td>' + App.escapeHtml(l.ten_mon_hoc || '—') + '</td>' +
                '  <td>' + (l.si_so_hien_tai || 0) + ' / ' + l.si_so_toi_da + '</td>' +
                '  <td class="text-center">' + App.trangThaiLHPBadge(l.trang_thai) + '</td>' +
                '</tr>';
        }).join('');
    }

    return {
        render: render
    };
})(jQuery);
