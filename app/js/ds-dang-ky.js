/* ================================================================
   DS-DANG-KY.JS - Tổ chức giảng dạy > Đăng ký học phần > Danh sách sinh viên đăng ký
   Quản trị viên xem mọi lớp, giảng viên xem lớp mình phụ trách (backend phân quyền).
   Sinh viên tự đăng ký / hủy đăng ký ở trang "Đăng ký học phần" của sinh viên.
   ================================================================ */

(function ($) {
    'use strict';

    var DsDangKyModule = {
        render: function () {
            var html =
                '<div class="card">' +
                '  <div class="card-header"><h3><i class="fa-solid fa-user-check" style="color:var(--primary);"></i> Danh sách sinh viên đăng ký học phần</h3></div>' +
                '  <div class="card-body">' +
                '    <div class="toolbar"><div class="toolbar-left">' +
                '      <select id="dsdkHocKy" class="filter-select"><option value="1">Học kỳ 1</option><option value="2">Học kỳ 2</option><option value="3">Học kỳ Hè</option></select>' +
                '      <select id="dsdkNamHoc" class="filter-select"></select>' +
                '      <select id="dsdkLop" class="filter-select" style="min-width:320px;"></select>' +
                '    </div></div>' +
                '    <p class="form-note">Sinh viên tự đăng ký và hủy đăng ký trong thời gian đăng ký của lớp (RULE-08); danh sách dưới đây là kết quả đăng ký của lớp học phần đã chọn.</p>' +
                '    <div id="dsdkInfo" class="mb-2"></div>' +
                '    <div class="table-responsive"><table class="data-table"><thead><tr><th class="text-center">STT</th><th>MSSV</th><th>Họ và tên</th><th>Lớp sinh viên</th><th>Ngày đăng ký</th><th class="text-center">Trạng thái</th></tr></thead>' +
                '    <tbody id="dsdkBody"></tbody></table></div>' +
                '  </div>' +
                '</div>';
            $('#contentArea').html(html);
            var self = this;
            $('#dsdkHocKy, #dsdkNamHoc').on('change', function () { self.loadLops(); });
            $('#dsdkLop').on('change', function () { self.loadSv(); });
            App.fillTermSelects('#dsdkHocKy', '#dsdkNamHoc', {}, function () { self.loadLops(); });
        },

        loadLops: function () {
            var self = this;
            Api.get('/api/lophocphan', { hoc_ky: $('#dsdkHocKy').val(), nam_hoc: $('#dsdkNamHoc').val() }).done(function (res) {
                var list = res.data || [];
                $('#dsdkLop').html(list.length
                    ? list.map(function (l) { return '<option value="' + l.id + '">' + App.escapeHtml(l.ma_lop_hoc_phan + ' - ' + (l.ten_mon_hoc || '')) + ' (' + (l.si_so_hien_tai || 0) + '/' + l.si_so_toi_da + ')</option>'; }).join('')
                    : '<option value="">Không có lớp học phần trong học kỳ này</option>');
                self.loadSv();
            }).fail(Api.toastError);
        },

        loadSv: function () {
            var id = $('#dsdkLop').val();
            var tbody = $('#dsdkBody').empty();
            $('#dsdkInfo').empty();
            if (!id) { tbody.html('<tr><td colspan="6" class="text-center text-muted py-3">Chưa chọn lớp học phần</td></tr>'); return; }
            Api.get('/api/lophocphan/chi-tiet', { id: id }).done(function (res) {
                var l = res.data;
                var sv = l.sinh_vien || [];
                $('#dsdkInfo').html('<small class="text-muted">Môn ' + App.escapeHtml(l.ma_mon_hoc + ' - ' + l.ten_mon_hoc) + ' · Giảng viên: ' + App.escapeHtml(l.ten_giang_vien || '—') +
                    ' · Sĩ số ' + (l.si_so_hien_tai || 0) + '/' + l.si_so_toi_da + ' · Thời gian đăng ký ' + App.formatDate(String(l.thoi_gian_mo_dang_ky || '').slice(0, 10)) + ' đến ' + App.formatDate(String(l.thoi_gian_dong_dang_ky || '').slice(0, 10)) + '</small>');
                if (!sv.length) { tbody.html('<tr><td colspan="6" class="text-center text-muted py-3">Chưa có sinh viên đăng ký lớp này</td></tr>'); return; }
                sv.forEach(function (s, i) {
                    tbody.append('<tr><td class="text-center">' + (i + 1) + '</td><td><strong>' + App.escapeHtml(s.ma_dinh_danh) + '</strong></td><td>' + App.escapeHtml(s.ho_ten) + '</td>' +
                        '<td>' + App.escapeHtml(s.ma_lop || '—') + '</td><td><small>' + App.formatDateTime(s.ngay_dang_ky) + '</small></td><td class="text-center">' + App.trangThaiDKBadge(s.trang_thai) + '</td></tr>');
                });
            }).fail(Api.toastError);
        }
    };

    App.registerModule('ds-dang-ky', DsDangKyModule);
})(jQuery);
