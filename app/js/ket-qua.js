/* ================================================================
   KET-QUA.JS - Sinh viên tra cứu kết quả học tập & Bảng điểm
   Font Awesome CDN Icons & Thiết kế Card hiện đại
   Quy chế điểm học kỳ & tích lũy, xử lý học lại / cải thiện
   ================================================================ */

(function ($) {
    'use strict';

    var KetQuaModule = {
        render: function () {
            var currentUser = App.getCurrentUser();
            if (!currentUser || currentUser.vai_tro !== 'sinh_vien') {
                $('#contentArea').html('<div class="alert alert-danger"><i class="fa-solid fa-triangle-exclamation"></i> Chức năng này chỉ dành cho tài khoản sinh viên</div>');
                return;
            }

            // Lớp sinh hoạt, CTĐT, khóa học được nạp từ /api/taikhoan/me
            var lsv = null;
            var ctdt = null;

            var html =
                '<div class="card mb-3">' +
                '  <div class="card-header">' +
                '    <h3><i class="fa-solid fa-award"></i> Kết quả học tập</h3>' +
                '    <button class="btn btn-sm btn-outline" onclick="window.print()"><i class="fa-solid fa-print"></i> In bảng điểm</button>' +
                '  </div>' +
                '  <div class="card-body">' +
                '    <div class="detail-grid mb-3">' +
                '      <div class="detail-item">' +
                '        <span class="detail-label">Sinh viên</span>' +
                '        <span class="detail-value">' + App.escapeHtml(currentUser.ho_ten) + ' (' + App.escapeHtml(currentUser.ma_dinh_danh) + ')</span>' +
                '      </div>' +
                '      <div class="detail-item">' +
                '        <span class="detail-label">Lớp sinh hoạt</span>' +
                '        <span class="detail-value" id="kqLopSinhHoat">—</span>' +
                '      </div>' +
                '      <div class="detail-item">' +
                '        <span class="detail-label">Chương trình đào tạo</span>' +
                '        <span class="detail-value" id="kqChuongTrinh">—</span>' +
                '      </div>' +
                '      <div class="detail-item">' +
                '        <span class="detail-label">Khóa học</span>' +
                '        <span class="detail-value" id="kqKhoaHoc">—</span>' +
                '      </div>' +
                '    </div>' +

                '    <!-- Bộ lọc Học kỳ & Năm học -->' +
                '    <div class="toolbar">' +
                '      <div class="toolbar-left">' +
                '        <div class="filter-group d-flex align-center gap-2">' +
                '          <label><i class="fa-solid fa-calendar-days"></i> Học kỳ:</label>' +
                '          <select id="kqHocKy" class="filter-select">' +
                '            <option value="all">Tất cả học kỳ</option>' +
                '            <option value="1">Học kỳ 1</option>' +
                '            <option value="2">Học kỳ 2</option>' +
                '            <option value="3">Học kỳ Hè</option>' +
                '          </select>' +
                '        </div>' +
                '        <div class="filter-group d-flex align-center gap-2">' +
                '          <label><i class="fa-regular fa-calendar"></i> Năm học:</label>' +
                '          <select id="kqNamHoc" class="filter-select">' +
                '            <option value="all">Tất cả năm học</option>' +
                '          </select>' +
                '        </div>' +
                '      </div>' +
                '    </div>' +

                '    <!-- Bảng điểm chi tiết -->' +
                '    <div class="table-responsive mb-3">' +
                '      <table class="data-table" id="kqTable">' +
                '        <thead>' +
                '          <tr>' +
                '            <th style="width:50px;">STT</th>' +
                '            <th>Mã môn</th>' +
                '            <th>Mã lớp HP</th>' +
                '            <th>Tên môn học</th>' +
                '            <th class="text-center">Số TC</th>' +
                '            <th class="text-center">Chuyên cần (10%)</th>' +
                '            <th class="text-center">Giữa kỳ (30%)</th>' +
                '            <th class="text-center">Cuối kỳ (60%)</th>' +
                '            <th class="text-center">Hệ 10</th>' +
                '            <th class="text-center">Hệ 4</th>' +
                '            <th class="text-center">Điểm chữ</th>' +
                '            <th class="text-center">Kết quả</th>' +
                '          </tr>' +
                '        </thead>' +
                '        <tbody id="kqTableBody"></tbody>' +
                '      </table>' +
                '    </div>' +

                '    <!-- Thẻ thống kê kết quả học tập -->' +
                '    <div class="grade-summary" id="gradeSummaryBox">' +
                '      <div class="gs-item">' +
                '        <div class="gs-label">ĐTB Học kỳ (Hệ 10)</div>' +
                '        <div class="gs-value" id="gsDtbHk10">0.00</div>' +
                '        <div class="gs-sub">Tính theo kỳ đã chọn</div>' +
                '      </div>' +
                '      <div class="gs-item">' +
                '        <div class="gs-label">ĐTB Học kỳ (Hệ 4)</div>' +
                '        <div class="gs-value" id="gsDtbHk4">0.00</div>' +
                '        <div class="gs-sub">Quy đổi thang 4</div>' +
                '      </div>' +
                '      <div class="gs-item">' +
                '        <div class="gs-label">Số TC đạt Học kỳ</div>' +
                '        <div class="gs-value text-success" id="gsTcDatHk">0</div>' +
                '        <div class="gs-sub">Tín chỉ qua môn</div>' +
                '      </div>' +
                '      <div class="gs-item">' +
                '        <div class="gs-label">Xếp loại Học kỳ</div>' +
                '        <div class="gs-value text-warning" id="gsPhanLoaiHk">—</div>' +
                '        <div class="gs-sub">Theo quy chế tín chỉ</div>' +
                '      </div>' +
                '      <div class="gs-item">' +
                '        <div class="gs-label">ĐTB Tích lũy (Hệ 10)</div>' +
                '        <div class="gs-value" id="gsDtbTl10">0.00</div>' +
                '        <div class="gs-sub">Toàn khóa học</div>' +
                '      </div>' +
                '      <div class="gs-item">' +
                '        <div class="gs-label">ĐTB Tích lũy (Hệ 4)</div>' +
                '        <div class="gs-value" id="gsDtbTl4">0.00</div>' +
                '        <div class="gs-sub">Toàn khóa học</div>' +
                '      </div>' +
                '      <div class="gs-item">' +
                '        <div class="gs-label">Số TC Tích lũy</div>' +
                '        <div class="gs-value text-success" id="gsTcTichLuy">0</div>' +
                '        <div class="gs-sub">Không trùng môn học lại</div>' +
                '      </div>' +
                '    </div>' +
                '  </div>' +
                '</div>';

            $('#contentArea').html(html);
            this.bindEvents();
            this.loadProfile();
            var self = this;
            App.fillTermSelects('#kqHocKy', '#kqNamHoc', { prefix: 'Năm học ' }, function () { self.loadGrades(); });
        },

        loadProfile: function () {
            Api.get('/api/taikhoan/me').done(function (res) {
                var u = res.data || {};
                $('#kqLopSinhHoat').text(u.ma_lop ? (u.ma_lop + ' - ' + u.ten_lop) : '—');
                $('#kqChuongTrinh').text(u.ten_chuong_trinh || '—');
                $('#kqKhoaHoc').text(u.khoa_hoc || '—');
            });
        },

        bindEvents: function () {
            var self = this;
            $('#kqHocKy, #kqNamHoc').on('change', function () {
                self.loadGrades();
            });
        },

        loadGrades: function () {
            var self = this;
            // RULE-16, 17, 18: điểm, quy đổi, ĐTB học kỳ & tích lũy do backend tính
            Api.get('/api/ketquahoctap/ket-qua', { hoc_ky: $('#kqHocKy').val(), nam_hoc: $('#kqNamHoc').val() })
                .done(function (res) { self.renderGrades(res); })
                .fail(Api.toastError);
        },

        renderGrades: function (res) {
            var rows = res.data || [];
            var hk = res.hoc_ky || {};
            var tl = res.tich_luy || {};
            var fmt2 = function (v) { return v != null ? Number(v).toFixed(2) : '0.00'; };
            var fmt1 = function (v) { return v != null ? Number(v).toFixed(1) : '—'; };

            // RULE-18.11: ghi chú học phần học lại (backend xác định lần được tính tích lũy)
            var retakeNote = function (d) {
                if (!d.so_lan_hoc || d.so_lan_hoc < 2) return '';
                var note = 'Lần học ' + d.lan_hoc + '/' + d.so_lan_hoc;
                if (d.diem_he_10 != null) {
                    note += d.tinh_tich_luy ? ' · tính tích lũy' : ' · không tính tích lũy';
                }
                return '<small class="text-muted d-block" style="margin-top:2px;">' + note + '</small>';
            };

            $('#gsDtbTl10').text(fmt2(tl.dtb_he_10));
            $('#gsDtbTl4').text(fmt2(tl.dtb_he_4));
            $('#gsTcTichLuy').text(tl.so_tin_chi_tich_luy || 0);

            $('#gsDtbHk10').text(fmt2(hk.dtb_he_10));
            $('#gsDtbHk4').text(fmt2(hk.dtb_he_4));
            $('#gsTcDatHk').text(hk.so_tin_chi_dat || 0);
            $('#gsPhanLoaiHk').text(hk.phan_loai || '—');

            var tbody = $('#kqTableBody');
            tbody.empty();

            if (rows.length === 0) {
                tbody.html(
                    '<tr><td colspan="12" class="text-center py-4 text-gray">' +
                    '  <i class="fa-solid fa-folder-open" style="font-size:1.6rem; opacity:0.4; display:block; margin-bottom:8px;"></i>' +
                    '  Chưa có dữ liệu điểm cho học kỳ và năm học đã chọn' +
                    '</td></tr>'
                );
                return;
            }

            rows.forEach(function (d, index) {
                var row =
                    '<tr>' +
                    '  <td class="text-center font-bold">' + (index + 1) + '</td>' +
                    '  <td><strong>' + App.escapeHtml(d.ma_mon_hoc) + '</strong></td>' +
                    '  <td><code>' + App.escapeHtml(d.ma_lop_hoc_phan) + '</code></td>' +
                    '  <td>' + App.escapeHtml(d.ten_mon_hoc) + '</td>' +
                    '  <td class="text-center">' + d.so_tin_chi + '</td>' +
                    '  <td class="text-center">' + fmt1(d.diem_chuyen_can) + '</td>' +
                    '  <td class="text-center">' + fmt1(d.diem_giua_ky) + '</td>' +
                    '  <td class="text-center">' + fmt1(d.diem_cuoi_ky) + '</td>' +
                    '  <td class="text-center font-bold" style="color:var(--primary); font-size:0.95rem;">' + (d.diem_he_10 != null ? Number(d.diem_he_10).toFixed(1) : '—') + '</td>' +
                    '  <td class="text-center">' + (d.diem_he_4 != null ? Number(d.diem_he_4).toFixed(1) : '—') + '</td>' +
                    '  <td class="text-center">' + (d.diem_chu ? App.diemChuBadge(d.diem_chu) : '—') + '</td>' +
                    '  <td class="text-center">' + (d.ket_qua ? App.ketQuaBadge(d.ket_qua) : '<span class="text-gray">Chưa tổng kết</span>') + retakeNote(d) + '</td>' +
                    '</tr>';
                tbody.append(row);
            });
        }
    };

    App.registerModule('ket-qua', KetQuaModule);
})(jQuery);
