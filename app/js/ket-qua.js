/* ================================================================
   KET-QUA.JS - Sinh viên tra cứu kết quả học tập & Bảng điểm
   Font Awesome CDN Icons & Thiết kế Card hiện đại
   Quy chế điểm học kỳ & tích lũy, xử lý học lại / cải thiện
   ================================================================ */

(function ($) {
    'use strict';

    var KetQuaModule = {
        sinhVienId: null,   // tra cứu của quản trị viên / giảng viên (RULE-16.4); null = sinh viên xem của mình

        render: function () {
            var currentUser = App.getCurrentUser();
            if (!currentUser || currentUser.vai_tro !== 'sinh_vien') {
                $('#contentArea').html('<div class="alert alert-danger"><i class="fa-solid fa-triangle-exclamation"></i> Chức năng này chỉ dành cho tài khoản sinh viên</div>');
                return;
            }
            this.sinhVienId = null;
            this.renderInto($('#contentArea'), currentUser);
            this.loadProfile();
        },

        /** Dựng bảng điểm vào $box; sv = {ho_ten, ma_dinh_danh} */
        renderInto: function ($box, sv) {
            var currentUser = sv;

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
                '        <span class="detail-value" id="kqLopSinhHoat">' + App.escapeHtml(sv.lop || '—') + '</span>' +
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
                '            <th class="text-center">Cách tính</th>' +
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
                // RULE-18.6: giải thích GPA học kỳ / tích lũy ngay trên trang (số liệu thật của sinh viên)
                '    <div class="card mt-3"><div class="card-body" id="kqGiaiThichGpa"></div></div>' +
                '    <div class="mt-3" id="kqQuyChe"></div>' +
                '  </div>' +
                '</div>';

            $box.html(html);
            this.bindEvents();
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
            $(document).off('click', '.btn-kq-cach-tinh').on('click', '.btn-kq-cach-tinh', function () {
                $('#kqCachTinh-' + $(this).data('dk-id')).toggle();
            });
        },

        loadGrades: function () {
            var self = this;
            // RULE-16, 17, 18: điểm, quy đổi, ĐTB học kỳ & tích lũy do backend tính
            var params = { hoc_ky: $('#kqHocKy').val(), nam_hoc: $('#kqNamHoc').val() };
            if (this.sinhVienId) params.sinh_vien_id = this.sinhVienId;
            Api.get('/api/ketquahoctap/ket-qua', params)
                .done(function (res) { self.renderGrades(res); })
                .fail(Api.toastError);
        },

        renderGrades: function (res) {
            var rows = res.data || [];
            var hk = res.hoc_ky || {};
            var tl = res.tich_luy || {};
            var q = res.quy_tac;
            if (q) {
                if (!$('#kqQuyChe').children().length) $('#kqQuyChe').html(GiaiThichDiem.quyChe(q));
                var phamVi = $('#kqHocKy option:selected').text() + ' - ' + $('#kqNamHoc option:selected').text();
                $('#kqGiaiThichGpa').html(
                    '<h4 style="font-size:0.95rem; font-weight:800;" class="mb-2">Cách tính điểm trung bình</h4>' +
                    GiaiThichDiem.gpa('GPA học kỳ (' + phamVi + ')', hk.mon || [], hk) +
                    GiaiThichDiem.gpa('GPA tích lũy (toàn khóa, mỗi môn một lần)', tl.mon || [], tl));
            }
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
                    '<tr><td colspan="13" class="text-center py-4 text-gray">' +
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
                    '  <td class="text-center">' + (d.cam_thi ? '<span class="badge badge-danger">Cấm thi</span><br>' : '') +
                    (d.ket_qua ? App.ketQuaBadge(d.ket_qua) : '<span class="text-gray">Chưa tổng kết</span>') + retakeNote(d) + '</td>' +
                    '  <td class="text-center"><button class="btn btn-sm btn-outline-primary btn-kq-cach-tinh" data-dk-id="' + d.dang_ky_id + '">Xem</button></td>' +
                    '</tr>' +
                    '<tr id="kqCachTinh-' + d.dang_ky_id + '" style="display:none; background:#f8fafc;"><td colspan="13">' +
                    (q ? GiaiThichDiem.hocPhan(d, q) : '') + '</td></tr>';
                tbody.append(row);
            });
        }
    };

    window.KetQuaModule = KetQuaModule;
    App.registerModule('ket-qua', KetQuaModule);
})(jQuery);
