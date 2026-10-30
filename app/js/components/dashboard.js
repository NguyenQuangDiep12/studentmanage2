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
        var u = App.getCurrentUser();
        if (u && u.vai_tro === 'sinh_vien') { renderStudent(); return; }
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
            card('Tin tức', d.tong_tin_tuc || 0, 'Số thông báo đã công bố', isAdmin ? 'tin-tuc-admin' : 'tin-tuc') +
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
                '  <td class="text-center">' + App.trangThaiLopBadge(l) + '</td>' +
                '</tr>';
        }).join('');
    }

    /* ---------- Tổng quan sinh viên: bố cục theo mã nguồn cũ (renderOverviewSection - sinh viên) ---------- */
    function renderStudent() {
        $('#contentArea').html('<div class="card"><div class="card-body text-center text-muted py-4"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải số liệu...</div></div>');
        var safe = function (req) { var d = $.Deferred(); req.done(function (r) { d.resolve(r); }).fail(function () { d.resolve({}); }); return d.promise(); };
        $.when(
            safe(Api.get('/api/taikhoan/me')),
            safe(Api.get('/api/ketquahoctap/ket-qua', { hoc_ky: 'all', nam_hoc: 'all' })),
            safe(Api.get('/api/dangkyhocphan/registered')),
            safe(Api.get('/api/kiennghi', { search: '', trang_thai: '' })),
            safe(Api.get('/api/tintuc', { search: '', danh_muc: '' }))
        ).done(function (me, kq, dk, kn, tt) { drawStudent(me.data || {}, kq || {}, (dk.data || []), (kn.data || []), (tt.data || [])); });
    }

    function drawStudent(p, kq, dks, kns, news) {
        var esc = App.escapeHtml;
        var grades = (kq.data || []).filter(function (g) { return g.diem_he_10 != null; });
        var tl = kq.tich_luy || {};
        var dat = grades.filter(function (g) { return g.ket_qua === 'Đạt'; });
        var cao = grades.slice().sort(function (a, b) { return Number(b.diem_he_10) - Number(a.diem_he_10); })[0];
        var reg = dks.filter(function (d) { return d.trang_thai_dk === 'Đã đăng ký' || d.trang_thai_dk === 'da_dang_ky'; });
        var avg = tl.dtb_he_10 != null ? Number(tl.dtb_he_10).toFixed(2) : '--';
        var hk = function (g) { return 'HK' + g.hoc_ky + ' ' + String(g.nam_hoc || '').split('-')[0]; };
        var empty = function (n, t) { return '<tr><td colspan="' + n + '" class="nd-empty">' + t + '</td></tr>'; };
        var g2 = function (k, v) { return '<div><strong>' + k + ':</strong> ' + v + '</div>'; };

        var html =
            '<div class="stats-grid-modern">' +
            card('Lớp học', esc(p.ma_lop || '--'), 'Lớp hiện tại', '') +
            card('Môn đã có điểm', grades.length, 'Bản ghi kết quả học tập', 'ket-qua') +
            card('Điểm trung bình', avg, 'Tổng kết trung bình hiện tại', 'ket-qua') +
            card('Tín chỉ đạt', tl.so_tin_chi_tich_luy || 0, 'Tính từ các môn đã qua', 'ket-qua') +
            card('Đã đăng ký', reg.length, 'Số lớp học phần đã đăng ký', 'dang-ky') +
            card('Ý kiến đã gửi', kns.length, 'Phản hồi gửi đến admin', 'kien-nghi') +
            card('Tin tức mới', news.length, 'Thông báo admin đã đăng', 'tin-tuc') +
            '</div>' +

            '<section class="nd-scope nd-two mt-3">' +
            '  <div class="nd-card">' + OldUI.header('Thông tin nhanh', 'Thông tin cá nhân và trạng thái học tập hiện tại.') +
            '    <div class="nd-profile-grid">' +
            g2('Mã sinh viên', esc(p.ma_dinh_danh || '--')) + g2('Họ tên', esc(p.ho_ten || '--')) +
            g2('Email', esc(p.email || '--')) + g2('Lớp', esc(p.ma_lop ? p.ma_lop + ' - ' + (p.ten_lop || '') : '--')) +
            g2('Ngành', esc(p.ten_chuong_trinh || p.ten_khoa || '--')) + g2('Số điện thoại', esc(p.so_dien_thoai || '--')) +
            '    </div>' +
            '  </div>' +
            '  <div class="nd-card">' + OldUI.header('Dashboard bảng điểm', 'Tóm tắt điểm số để bạn theo dõi nhanh kết quả học tập.') +
            '    <div class="nd-profile-grid">' +
            g2('Điểm trung bình', avg) + g2('Số môn đạt', dat.length) +
            g2('Tín chỉ tích lũy', tl.so_tin_chi_tich_luy || 0) + g2('Môn cao nhất', cao ? esc(cao.ma_mon_hoc) + ' (' + Number(cao.diem_he_10).toFixed(1) + ')' : '--') +
            '    </div>' +
            '    <div class="nd-table-wrap mt-3"><table class="nd-table" style="min-width:0;"><thead><tr><th>Môn học</th><th>Học kỳ</th><th>Tổng kết</th><th>Chữ</th></tr></thead><tbody>' +
            (grades.slice(0, 5).map(function (g) {
                return '<tr><td>' + esc(g.ten_mon_hoc) + '</td><td>' + esc(hk(g)) + '</td><td>' + Number(g.diem_he_10).toFixed(1) + '</td><td><span class="nd-pill">' + esc(g.diem_chu || '--') + '</span></td></tr>';
            }).join('') || empty(4, 'Chưa có dữ liệu điểm số.')) +
            '    </tbody></table></div>' +
            '  </div>' +
            '</section>' +

            '<section class="nd-scope mt-3"><div class="nd-card">' + OldUI.header('Tin tức mới nhất', 'Các thông báo gần đây từ admin để bạn theo dõi nhanh.') +
            '  <div class="nd-news-list">' +
            (news.slice(0, 3).map(function (n) {
                var qt = parseInt(n.quan_trong, 10) === 1;
                return '<article class="nd-news-card" style="padding:14px 16px;"><div class="nd-news-top">' +
                    '<span class="nd-pill ' + (qt ? 'nd-pill-danger' : 'nd-pill-neutral') + '">' + (qt ? 'Quan trọng' : esc(n.danh_muc || 'Thông báo')) + '</span>' +
                    '<small class="nd-note">' + App.formatDateTime(n.created_at) + '</small></div>' +
                    '<strong style="display:block; margin:8px 0 4px;">' + esc(n.tieu_de) + '</strong>' +
                    '<p class="nd-note" style="margin:0;">' + esc(n.tom_tat || n.noi_dung || '') + '</p></article>';
            }).join('') || '<p class="nd-empty">Chưa có tin tức nào từ admin.</p>') +
            '  </div></div></section>' +

            '<section class="nd-scope nd-two mt-3">' +
            '  <div class="nd-card">' + OldUI.header('Lớp học phần đã đăng ký', 'Các lớp bạn đã chọn sẽ tự động hiện ở mục lịch học.') +
            '    <div class="nd-table-wrap"><table class="nd-table" style="min-width:0;"><thead><tr><th>Mã lớp</th><th>Môn học</th><th>Giảng viên</th><th>Phòng</th></tr></thead><tbody>' +
            (reg.slice(0, 5).map(function (d) {
                return '<tr><td>' + esc(d.ma_lop_hoc_phan) + '</td><td>' + esc(d.ten_mon_hoc) + '</td><td>' + esc(d.ten_giang_vien || '--') + '</td><td>' + esc(d.phong_hoc || '--') + '</td></tr>';
            }).join('') || empty(4, 'Bạn chưa đăng ký lớp học phần nào.')) +
            '    </tbody></table></div>' +
            '  </div>' +
            '  <div class="nd-card">' + OldUI.header('Lịch học sắp tới', 'Lịch học lấy trực tiếp từ các môn bạn đã đăng ký.') +
            '    <div class="nd-table-wrap"><table class="nd-table" style="min-width:0;"><thead><tr><th>Môn học</th><th>Giảng viên</th><th>Ca học</th><th>Phòng</th></tr></thead><tbody>' +
            (reg.reduce(function (acc, d) {
                (d.lich_hoc || []).forEach(function (lh) { acc.push({ d: d, lh: lh }); });
                return acc;
            }, []).slice(0, 5).map(function (x) {
                return '<tr><td>' + esc(x.d.ma_mon_hoc + ' - ' + x.d.ten_mon_hoc) + '</td><td>' + esc(x.d.ten_giang_vien || '--') + '</td>' +
                    '<td>' + App.thuLabel(x.lh.thu) + ', tiết ' + x.lh.tiet_bat_dau + ' - ' + x.lh.tiet_ket_thuc +
                    (x.lh.ngay_bat_dau ? '<small class="d-block">' + App.formatDate(x.lh.ngay_bat_dau) + ' – ' + App.formatDate(x.lh.ngay_ket_thuc) + '</small>' : '') + '</td>' +
                    '<td>' + esc(x.d.phong_hoc || '--') + '</td></tr>';
            }).join('') || empty(4, 'Chưa có lịch học từ môn đã đăng ký.')) +
            '    </tbody></table></div>' +
            '  </div>' +
            '</section>';

        $('#contentArea').html(html);
    }

    return {
        render: render
    };
})(jQuery);
