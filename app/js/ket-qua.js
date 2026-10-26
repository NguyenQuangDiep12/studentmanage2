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

            var lsv = currentUser.lop_sinh_vien_id ? MockDB.lop_sinh_vien.getById(currentUser.lop_sinh_vien_id) : null;
            var ctdt = lsv ? MockDB.chuong_trinh_dao_tao.getById(lsv.chuong_trinh_id) : null;

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
                '        <span class="detail-value">' + (lsv ? App.escapeHtml(lsv.ma_lop + ' - ' + lsv.ten_lop) : '—') + '</span>' +
                '      </div>' +
                '      <div class="detail-item">' +
                '        <span class="detail-label">Chương trình đào tạo</span>' +
                '        <span class="detail-value">' + (ctdt ? App.escapeHtml(ctdt.ten_chuong_trinh) : '—') + '</span>' +
                '      </div>' +
                '      <div class="detail-item">' +
                '        <span class="detail-label">Khóa học</span>' +
                '        <span class="detail-value">' + (lsv ? App.escapeHtml(lsv.khoa_hoc) : '—') + '</span>' +
                '      </div>' +
                '    </div>' +

                '    <!-- Bộ lọc Học kỳ & Năm học -->' +
                '    <div class="toolbar">' +
                '      <div class="toolbar-left">' +
                '        <div class="filter-group d-flex align-center gap-2">' +
                '          <label><i class="fa-solid fa-calendar-days"></i> Học kỳ:</label>' +
                '          <select id="kqHocKy" class="filter-select">' +
                '            <option value="all">Tất cả học kỳ</option>' +
                '            <option value="1" selected>Học kỳ 1</option>' +
                '            <option value="2">Học kỳ 2</option>' +
                '            <option value="3">Học kỳ Hè</option>' +
                '          </select>' +
                '        </div>' +
                '        <div class="filter-group d-flex align-center gap-2">' +
                '          <label><i class="fa-regular fa-calendar"></i> Năm học:</label>' +
                '          <select id="kqNamHoc" class="filter-select">' +
                '            <option value="all">Tất cả năm học</option>' +
                '            <option value="2026-2027" selected>Năm học 2026-2027</option>' +
                '            <option value="2025-2026">Năm học 2025-2026</option>' +
                '            <option value="2024-2025">Năm học 2024-2025</option>' +
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
            this.loadGrades();
        },

        bindEvents: function () {
            var self = this;
            $('#kqHocKy, #kqNamHoc').on('change', function () {
                self.loadGrades();
            });
        },

        loadGrades: function () {
            var currentUser = App.getCurrentUser();
            var hkFilter = $('#kqHocKy').val();
            var nhFilter = $('#kqNamHoc').val();

            // Lấy tất cả đăng ký hợp lệ (chưa hủy) của sinh viên
            var allDks = MockDB.dang_ky_hoc_phan.getAll({
                sinh_vien_user_id: currentUser.id
            }).filter(function (dk) {
                return dk.trang_thai === 'Đã đăng ký' || dk.trang_thai === 'da_dang_ky';
            });

            // 1. Tính toán TÍCH LŨY toàn khóa (xử lý môn học lại / cải thiện)
            // Nhóm theo mon_hoc_id để chỉ lấy lần học có điểm cao nhất
            var courseAttempts = {}; // mon_hoc_id -> array of { dk, lhp, mh, diem }

            allDks.forEach(function (dk) {
                var lhp = MockDB.lop_hoc_phan.getById(dk.lop_hoc_phan_id);
                if (!lhp) return;
                var mh = MockDB.mon_hoc.getById(lhp.mon_hoc_id);
                if (!mh) return;

                var d = MockDB.diem.getAll({ dang_ky_id: dk.id })[0] || null;

                if (!courseAttempts[mh.id]) {
                    courseAttempts[mh.id] = [];
                }
                courseAttempts[mh.id].push({
                    dk: dk,
                    lhp: lhp,
                    mh: mh,
                    diem: d
                });
            });

            var totalTcTichLuy = 0;
            var sumDiemNhanTc10_TL = 0;
            var sumDiemNhanTc4_TL = 0;
            var sumTcXetDtb_TL = 0;

            // Duyệt từng môn học duy nhất của sinh viên
            Object.keys(courseAttempts).forEach(function (mhId) {
                var attempts = courseAttempts[mhId];
                var mh = attempts[0].mh;
                var stc = mh.so_tin_chi;

                // Lọc những lần học đã có điểm tổng kết
                var gradedAttempts = attempts.filter(function (att) {
                    return att.diem && att.diem.diem_tong_ket != null;
                });

                if (gradedAttempts.length === 0) return;

                // Tìm lần học có điểm hệ 10 cao nhất (quy chế học lại / cải thiện)
                gradedAttempts.sort(function (a, b) {
                    return (b.diem.diem_he_10 || 0) - (a.diem.diem_he_10 || 0);
                });
                var bestAttempt = gradedAttempts[0];
                var bestDiem = bestAttempt.diem;

                // Nếu đạt điểm qua môn (Đạt), cộng tín chỉ tích lũy (chỉ cộng 1 lần duy nhất)
                if (bestDiem.ket_qua === 'Đạt') {
                    totalTcTichLuy += stc;
                }

                // Điểm trung bình tích lũy tính trên lần học cao nhất của mỗi môn
                sumDiemNhanTc10_TL += (bestDiem.diem_he_10 * stc);
                sumDiemNhanTc4_TL += (bestDiem.diem_he_4 * stc);
                sumTcXetDtb_TL += stc;
            });

            var dtbTl10 = sumTcXetDtb_TL > 0 ? (sumDiemNhanTc10_TL / sumTcXetDtb_TL) : 0;
            var dtbTl4 = sumTcXetDtb_TL > 0 ? (sumDiemNhanTc4_TL / sumTcXetDtb_TL) : 0;

            $('#gsDtbTl10').text(dtbTl10.toFixed(2));
            $('#gsDtbTl4').text(dtbTl4.toFixed(2));
            $('#gsTcTichLuy').text(totalTcTichLuy);

            // 2. Lọc danh sách hiển thị theo Học kỳ & Năm học được chọn
            var filteredDks = allDks.filter(function (dk) {
                var lhp = MockDB.lop_hoc_phan.getById(dk.lop_hoc_phan_id);
                if (!lhp) return false;
                if (hkFilter !== 'all' && String(lhp.hoc_ky) !== String(hkFilter)) return false;
                if (nhFilter !== 'all' && lhp.nam_hoc !== nhFilter) return false;
                return true;
            });

            var tbody = $('#kqTableBody');
            tbody.empty();

            if (filteredDks.length === 0) {
                tbody.html(
                    '<tr><td colspan="12" class="text-center py-4 text-gray">' +
                    '  <i class="fa-solid fa-folder-open" style="font-size:1.6rem; opacity:0.4; display:block; margin-bottom:8px;"></i>' +
                    '  Chưa có dữ liệu điểm cho học kỳ và năm học đã chọn' +
                    '</td></tr>'
                );
                $('#gsDtbHk10').text('0.00');
                $('#gsDtbHk4').text('0.00');
                $('#gsTcDatHk').text('0');
                $('#gsPhanLoaiHk').text('—');
                return;
            }

            var sumDiemNhanTc10_HK = 0;
            var sumDiemNhanTc4_HK = 0;
            var sumTcXetDtb_HK = 0;
            var tcDatHk = 0;

            filteredDks.forEach(function (dk, index) {
                var lhp = MockDB.lop_hoc_phan.getById(dk.lop_hoc_phan_id);
                var mh = lhp ? MockDB.mon_hoc.getById(lhp.mon_hoc_id) : null;
                var d = MockDB.diem.getAll({ dang_ky_id: dk.id })[0] || {};

                var stc = mh ? mh.so_tin_chi : 0;

                var cc = (d.diem_chuyen_can != null) ? Number(d.diem_chuyen_can).toFixed(1) : '—';
                var gk = (d.diem_giua_ky != null) ? Number(d.diem_giua_ky).toFixed(1) : '—';
                var ck = (d.diem_cuoi_ky != null) ? Number(d.diem_cuoi_ky).toFixed(1) : '—';
                var d10 = (d.diem_he_10 != null) ? Number(d.diem_he_10).toFixed(2) : '—';
                var he4 = (d.diem_he_4 != null) ? Number(d.diem_he_4).toFixed(2) : '—';
                var chu = d.diem_chu || '—';
                var kq = d.ket_qua || 'Chưa tổng kết';

                if (d.diem_he_10 != null && mh) {
                    sumDiemNhanTc10_HK += (d.diem_he_10 * stc);
                    sumDiemNhanTc4_HK += (d.diem_he_4 * stc);
                    sumTcXetDtb_HK += stc;

                    if (d.ket_qua === 'Đạt') {
                        tcDatHk += stc;
                    }
                }

                var row =
                    '<tr>' +
                    '  <td class="text-center font-bold">' + (index + 1) + '</td>' +
                    '  <td><strong>' + (mh ? App.escapeHtml(mh.ma_mon_hoc) : '—') + '</strong></td>' +
                    '  <td><code>' + (lhp ? App.escapeHtml(lhp.ma_lop_hoc_phan) : '—') + '</code></td>' +
                    '  <td>' + (mh ? App.escapeHtml(mh.ten_mon_hoc) : '—') + '</td>' +
                    '  <td class="text-center">' + stc + '</td>' +
                    '  <td class="text-center">' + cc + '</td>' +
                    '  <td class="text-center">' + gk + '</td>' +
                    '  <td class="text-center">' + ck + '</td>' +
                    '  <td class="text-center font-bold" style="color:var(--primary); font-size:0.95rem;">' + d10 + '</td>' +
                    '  <td class="text-center">' + he4 + '</td>' +
                    '  <td class="text-center">' + (chu !== '—' ? App.diemChuBadge(chu) : '—') + '</td>' +
                    '  <td class="text-center">' + (kq !== 'Chưa tổng kết' ? App.ketQuaBadge(kq) : '<span class="text-gray">—</span>') + '</td>' +
                    '</tr>';
                tbody.append(row);
            });

            var dtbHk10 = sumTcXetDtb_HK > 0 ? (sumDiemNhanTc10_HK / sumTcXetDtb_HK) : 0;
            var dtbHk4 = sumTcXetDtb_HK > 0 ? (sumDiemNhanTc4_HK / sumTcXetDtb_HK) : 0;
            var phanLoai = MockDB.tinhPhanLoai(dtbHk10);

            $('#gsDtbHk10').text(dtbHk10.toFixed(2));
            $('#gsDtbHk4').text(dtbHk4.toFixed(2));
            $('#gsTcDatHk').text(tcDatHk);
            $('#gsPhanLoaiHk').text(phanLoai || '—');
        }
    };

    App.registerModule('ket-qua', KetQuaModule);
})(jQuery);
