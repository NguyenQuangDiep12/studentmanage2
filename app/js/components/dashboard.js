/* ================================================================
   COMPONENT: DASHBOARD OVERVIEW (BẢNG ĐIỀU KHIỂN TỔNG QUAN)
   js/components/dashboard.js
   Khớp 100% ảnh media_1792963962565_c634adaf
   ================================================================ */

var DashboardComponent = (function ($) {
    'use strict';

    function render() {
        var currentUser = App.getCurrentUser();
        var role = currentUser ? currentUser.vai_tro : 'sinh_vien';

        // Lấy số liệu thống kê thực tế từ MockDB
        var totalSV = MockDB.users.count({ vai_tro: 'sinh_vien' });
        var totalUsers = MockDB.users.count();
        var totalGV = MockDB.users.count({ vai_tro: 'giang_vien' });
        var totalMH = MockDB.mon_hoc.count({ trang_thai: 'Hoạt động' });
        var totalLHP = MockDB.lop_hoc_phan.count();
        var totalDK = MockDB.dang_ky_hoc_phan.count({ trang_thai: 'Đã đăng ký' });
        var totalKN = MockDB.kien_nghi.count();
        var totalTin = MockDB.tin_tuc.count({ trang_thai: 'Công khai' });

        // Tính điểm trung bình toàn hệ thống
        var allDiem = MockDB.diem.getAll();
        var validScores = allDiem.filter(function (d) { return d.diem_tong_ket != null; });
        var avgScore = '8.3';
        if (validScores.length > 0) {
            var sum = validScores.reduce(function (acc, d) { return acc + d.diem_tong_ket; }, 0);
            avgScore = (sum / validScores.length).toFixed(1);
        }

        var html =
            '<!-- 9 THẺ THỐNG KÊ (Khớp 100% ảnh media_1792963962565) -->' +
            '<div class="stats-grid-modern">' +
            '  <div class="stat-modern-card" style="cursor:pointer;" onclick="App.navigate(\'users-sv\')">' +
            '    <div class="stat-label">Sinh viên</div>' +
            '    <div class="stat-number">' + totalSV + '</div>' +
            '    <div class="stat-desc">Tổng hồ sơ sinh viên</div>' +
            '  </div>' +
            '  <div class="stat-modern-card" style="cursor:pointer;" onclick="App.navigate(\'users-sv\')">' +
            '    <div class="stat-label">Người dùng</div>' +
            '    <div class="stat-number">' + totalUsers + '</div>' +
            '    <div class="stat-desc">Tài khoản đăng nhập</div>' +
            '  </div>' +
            '  <div class="stat-modern-card" style="cursor:pointer;" onclick="App.navigate(\'users-gv\')">' +
            '    <div class="stat-label">Giảng viên</div>' +
            '    <div class="stat-number">' + totalGV + '</div>' +
            '    <div class="stat-desc">Tài khoản giảng viên</div>' +
            '  </div>' +
            '  <div class="stat-modern-card" style="cursor:pointer;" onclick="App.navigate(\'mon-hoc\')">' +
            '    <div class="stat-label">Môn học</div>' +
            '    <div class="stat-number">' + totalMH + '</div>' +
            '    <div class="stat-desc">Môn học trong hệ thống</div>' +
            '  </div>' +
            '  <div class="stat-modern-card" style="cursor:pointer;" onclick="App.navigate(\'lop-hoc-phan\')">' +
            '    <div class="stat-label">Lớp học phần</div>' +
            '    <div class="stat-number">' + totalLHP + '</div>' +
            '    <div class="stat-desc">Lớp do giảng viên tạo</div>' +
            '  </div>' +
            '  <div class="stat-modern-card" style="cursor:pointer;" onclick="App.navigate(\'dang-ky\')">' +
            '    <div class="stat-label">Lượt đăng ký</div>' +
            '    <div class="stat-number">' + totalDK + '</div>' +
            '    <div class="stat-desc">Tổng sinh viên đăng ký môn</div>' +
            '  </div>' +
            '  <div class="stat-modern-card" style="cursor:pointer;" onclick="App.navigate(\'kien-nghi\')">' +
            '    <div class="stat-label">Ý kiến sinh viên</div>' +
            '    <div class="stat-number">' + totalKN + '</div>' +
            '    <div class="stat-desc">Tổng phản hồi gửi cho admin</div>' +
            '  </div>' +
            '  <div class="stat-modern-card" style="cursor:pointer;" onclick="App.navigate(\'tin-tuc\')">' +
            '    <div class="stat-label">Tin tức</div>' +
            '    <div class="stat-number">' + totalTin + '</div>' +
            '    <div class="stat-desc">Số thông báo đã công bố</div>' +
            '  </div>' +
            '  <div class="stat-modern-card">' +
            '    <div class="stat-label">Điểm TB hệ thống</div>' +
            '    <div class="stat-number" style="color:var(--primary);">' + avgScore + '</div>' +
            '    <div class="stat-desc">Trung bình toàn bộ điểm</div>' +
            '  </div>' +
            '</div>' +

        p.innerHTML =
            '<!-- HAI CỘT DỮ LIỆU NỔI BẬT DƯỚI BẢNG ĐIỀU KHIỂN -->' +
            '<div class="two-col-grid">' +
            '  <!-- Cột 1: Sinh viên mới nhất -->' +
            '  <div class="card">' +
            '    <div class="card-header">' +
            '      <div>' +
            '        <h3>Sinh viên mới nhất</h3>' +
            '        <p style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">Danh sách hồ sơ sinh viên vừa có trong hệ thống</p>' +
            '      </div>' +
            (role === 'admin' ? '      <button class="btn btn-sm btn-outline" onclick="App.navigate(\'users-sv\')">Xem tất cả</button>' : '') +
            '    </div>' +
            '    <div class="card-body p-0">' +
            '      <table class="data-table">' +
            '        <thead>' +
            '          <tr>' +
            '            <th>MSSV</th>' +
            '            <th>Họ và tên</th>' +
            '            <th>Lớp sinh hoạt</th>' +
            '            <th class="text-center">Trạng thái</th>' +
            '          </tr>' +
            '        </thead>' +
            '        <tbody>' + renderRecentStudents() + '</tbody>' +
            '      </table>' +
            '    </div>' +
            '  </div>' +
            '  <!-- Cột 2: Lớp học phần nổi bật -->' +
            '  <div class="card">' +
            '    <div class="card-header">' +
            '      <div>' +
            '        <h3>Lớp học phần nổi bật</h3>' +
            '        <p style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">Danh sách các lớp học phần và sĩ số sinh viên</p>' +
            '      </div>' +
            '      <button class="btn btn-sm btn-outline" onclick="App.navigate(\'lop-hoc-phan\')">Xem tất cả</button>' +
            '    </div>' +
            '    <div class="card-body p-0">' +
            '      <table class="data-table">' +
            '        <thead>' +
            '          <tr>' +
            '            <th>Mã lớp</th>' +
            '            <th>Môn học</th>' +
            '            <th>Sĩ số</th>' +
            '            <th class="text-center">Trạng thái</th>' +
            '          </tr>' +
            '        </thead>' +
            '        <tbody>' + renderFeaturedClasses() + '</tbody>' +
            '      </table>' +
            '    </div>' +
            '  </div>' +
            '</div>';

        $('#contentArea').html(html);
    }

    function renderRecentStudents() {
        var students = MockDB.users.getAll({ vai_tro: 'sinh_vien' }).slice(0, 5);
        if (students.length === 0) {
            return '<tr><td colspan="4" class="text-center text-muted py-3">Chưa có sinh viên nào</td></tr>';
        }
        return students.map(function (s) {
            var lsv = s.lop_sinh_vien_id ? MockDB.lop_sinh_vien.getById(s.lop_sinh_vien_id) : null;
            return (
                '<tr>' +
                '  <td><strong>' + App.escapeHtml(s.ma_dinh_danh) + '</strong></td>' +
                '  <td>' + App.escapeHtml(s.ho_ten) + '</td>' +
                '  <td>' + (lsv ? App.escapeHtml(lsv.ma_lop) : '<span class="text-gray">—</span>') + '</td>' +
                '  <td class="text-center">' + App.trangThaiUserBadge(s.trang_thai) + '</td>' +
                '</tr>'
            );
        }).join('');
    }

    function renderFeaturedClasses() {
        var classes = MockDB.lop_hoc_phan.getAll().slice(0, 5);
        if (classes.length === 0) {
            return '<tr><td colspan="4" class="text-center text-muted py-3">Chưa có lớp học phần nào</td></tr>';
        }
        return classes.map(function (l) {
            var mh = MockDB.mon_hoc.getById(l.mon_hoc_id);
            var currentSiSo = MockDB.getSiSoHienTai(l.id);
            return (
                '<tr>' +
                '  <td><strong>' + App.escapeHtml(l.ma_lop_hoc_phan) + '</strong></td>' +
                '  <td>' + (mh ? App.escapeHtml(mh.ten_mon_hoc) : '—') + '</td>' +
                '  <td>' + currentSiSo + ' / ' + l.si_so_toi_da + '</td>' +
                '  <td class="text-center">' + App.trangThaiLHPBadge(l.trang_thai) + '</td>' +
                '</tr>'
            );
        }).join('');
    }

    return {
        render: render
    };
})(jQuery);
