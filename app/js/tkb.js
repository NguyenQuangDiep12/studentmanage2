/* ================================================================
   TKB.JS - Thời khóa biểu tuần cho Sinh viên & Giảng viên
   Lưới 7 ngày (Thứ 2 -> Chủ nhật), 12 tiết học chuẩn (Ca học 1-12)
   Tự động xác định tuần hiện tại theo thời gian thực (26/10/2026 = Tuần 8)
   Hỗ trợ rowspan theo tiết học giống wireframe & Font Awesome CDN
   ================================================================ */

(function ($) {
    'use strict';

    var tietGioBatDau = {
        1: '06:45',
        2: '07:45',
        3: '08:45',
        4: '09:45',
        5: '10:45',
        6: '12:30',
        7: '13:30',
        8: '14:30',
        9: '15:30',
        10: '16:30',
        11: '17:30',
        12: '18:30'
    };

    var tietGioKetThuc = {
        1: '07:30',
        2: '08:30',
        3: '09:30',
        4: '10:30',
        5: '11:30',
        6: '13:15',
        7: '14:15',
        8: '15:15',
        9: '16:15',
        10: '17:15',
        11: '18:15',
        12: '19:15'
    };

    function getFirstMonday(year, month) {
        var d = new Date(year, month, 1);
        var day = d.getDay(); // 0 is Sunday, 1 is Monday
        var diff = (day === 0 ? 1 : (day === 1 ? 0 : 8 - day));
        return new Date(year, month, 1 + diff);
    }

    var TKBModule = {
        currentWeek: 1,

        // Xác định chính xác ngày Thứ Hai bắt đầu của học kỳ theo năm học
        getSemesterStartDate: function (hk, namHoc) {
            var parts = (namHoc || '2026-2027').split('-');
            var startYear = parseInt(parts[0], 10) || 2026;

            if (hk === 1) {
                // HK1: Bắt đầu Thứ Hai đầu tiên của tháng 9
                return getFirstMonday(startYear, 8); // Tháng 9 (index 8)
            } else if (hk === 2) {
                // HK2: Bắt đầu Thứ Hai tuần thứ 2 của tháng 1 năm sau
                var mon1 = getFirstMonday(startYear + 1, 0); // Tháng 1 (index 0)
                mon1.setDate(mon1.getDate() + 7);
                return mon1;
            } else {
                // HK Hè: Bắt đầu Thứ Hai đầu tiên của tháng 6 năm sau
                return getFirstMonday(startYear + 1, 5); // Tháng 6 (index 5)
            }
        },

        render: function () {
            var currentUser = App.getCurrentUser();
            if (!currentUser) return;

            var isGV = (currentUser.vai_tro === 'giang_vien');
            var roleTitle = isGV ? 'Thời khóa biểu giảng dạy trong tuần' : 'Thời khóa biểu học tập trong tuần';
            var roleSub = isGV ? 'Bảng tuần hiển thị lịch của các lớp học phần bạn đã tạo hoặc phụ trách' : 'Bảng tuần hiển thị lịch học của các lớp học phần bạn đã đăng ký';

            var html =
                '<div class="card">' +
                '  <div class="card-header">' +
                '    <div>' +
                '      <h3><i class="fa-solid fa-calendar-days" style="color:var(--primary);"></i> ' + roleTitle + '</h3>' +
                '      <p style="font-size:0.82rem; color:var(--text-muted); margin:0;">' + roleSub + '</p>' +
                '    </div>' +
                '    <div class="d-flex align-center gap-2">' +
                '      <button class="btn btn-sm btn-outline" id="btnPrintTKB" onclick="window.print()"><i class="fa-solid fa-print"></i> In lịch</button>' +
                '    </div>' +
                '  </div>' +
                '  <div class="card-body">' +
                '    <div class="toolbar">' +
                '      <div class="toolbar-left">' +
                '        <div class="d-flex align-center gap-2">' +
                '          <label><i class="fa-solid fa-calendar-days"></i> Học kỳ:</label>' +
                '          <select id="tkbHocKy" class="filter-select">' +
                '            <option value="1" selected>Học kỳ 1</option>' +
                '            <option value="2">Học kỳ 2</option>' +
                '            <option value="3">Học kỳ Hè</option>' +
                '          </select>' +
                '        </div>' +
                '        <div class="d-flex align-center gap-2">' +
                '          <label><i class="fa-regular fa-calendar"></i> Năm học:</label>' +
                '          <select id="tkbNamHoc" class="filter-select">' +
                '            <option value="2026-2027" selected>Năm học 2026-2027</option>' +
                '            <option value="2025-2026">Năm học 2025-2026</option>' +
                '            <option value="2024-2025">Năm học 2024-2025</option>' +
                '          </select>' +
                '        </div>' +
                '      </div>' +
                '      <div class="toolbar-right">' +
                '        <div class="week-nav d-flex align-center gap-2">' +
                '          <button class="btn btn-sm btn-outline" id="btnPrevWeek"><i class="fa-solid fa-chevron-left"></i> Tuần trước</button>' +
                '          <div class="week-label font-bold" id="currentWeekLabel" style="min-width:240px; text-align:center;">Tuần 1</div>' +
                '          <button class="btn btn-sm btn-outline" id="btnNextWeek">Tuần sau <i class="fa-solid fa-chevron-right"></i></button>' +
                '        </div>' +
                '      </div>' +
                '    </div>' +

                '    <!-- Thống kê nhanh -->' +
                '    <div class="stats-grid-modern mb-3" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">' +
                '      <div class="stat-modern-card">' +
                '        <div class="stat-label">Số tiết trong tuần này</div>' +
                '        <div class="stat-number text-primary" id="statTietTrongTuan">0</div>' +
                '        <div class="stat-desc">Dựa theo các buổi diễn ra trong tuần</div>' +
                '      </div>' +
                '      <div class="stat-modern-card">' +
                '        <div class="stat-label">Tổng tiết dự kiến đã qua</div>' +
                '        <div class="stat-number text-success" id="statTietTichLuy">0</div>' +
                '        <div class="stat-desc">Tính đến hết tuần đang chọn</div>' +
                '      </div>' +
                '      <div class="stat-modern-card">' +
                '        <div class="stat-label">Tổng số môn tham gia</div>' +
                '        <div class="stat-number" id="statTongMon">0</div>' +
                '        <div class="stat-desc">Số môn học có trong học kỳ này</div>' +
                '      </div>' +
                '    </div>' +

                '    <!-- Timetable Grid 12 Tiết -->' +
                '    <div class="timetable-wrapper">' +
                '      <table class="timetable" id="mainTimetable">' +
                '        <thead>' +
                '          <tr>' +
                '            <th class="tiet-col" style="width:90px;">Ca học</th>' +
                '            <th id="th-thu2">Thứ 2<br><small id="date-thu2" style="font-weight:400;"></small></th>' +
                '            <th id="th-thu3">Thứ 3<br><small id="date-thu3" style="font-weight:400;"></small></th>' +
                '            <th id="th-thu4">Thứ 4<br><small id="date-thu4" style="font-weight:400;"></small></th>' +
                '            <th id="th-thu5">Thứ 5<br><small id="date-thu5" style="font-weight:400;"></small></th>' +
                '            <th id="th-thu6">Thứ 6<br><small id="date-thu6" style="font-weight:400;"></small></th>' +
                '            <th id="th-thu7">Thứ 7<br><small id="date-thu7" style="font-weight:400;"></small></th>' +
                '            <th id="th-cn">Chủ nhật<br><small id="date-cn" style="font-weight:400;"></small></th>' +
                '          </tr>' +
                '        </thead>' +
                '        <tbody id="timetableBody">' +
                '        </tbody>' +
                '      </table>' +
                '    </div>' +
                '  </div>' +
                '</div>';

            $('#contentArea').html(html);
            this.bindEvents();
            this.autoDetectCurrentWeek();
            this.renderTimetable();
        },

        bindEvents: function () {
            var self = this;

            $('#tkbHocKy, #tkbNamHoc').on('change', function () {
                self.autoDetectCurrentWeek();
                self.renderTimetable();
            });

            $('#btnPrevWeek').on('click', function () {
                if (self.currentWeek > 1) {
                    self.currentWeek--;
                    self.renderTimetable();
                }
            });

            $('#btnNextWeek').on('click', function () {
                if (self.currentWeek < 20) {
                    self.currentWeek++;
                    self.renderTimetable();
                }
            });
        },

        // Tự động xác định số tuần theo thời gian thực tế (Ngày 26/10/2026 là Tuần 8 của HK1)
        autoDetectCurrentWeek: function () {
            var hk = parseInt($('#tkbHocKy').val(), 10) || 1;
            var namHoc = $('#tkbNamHoc').val() || '2026-2027';
            var startDate = this.getSemesterStartDate(hk, namHoc);
            var today = new Date(); // 2026-10-26

            var diffMs = today.getTime() - startDate.getTime();
            var diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            var weekNum = Math.floor(diffDays / 7) + 1;

            // Nếu học kỳ được chọn đang là học kỳ thực tế và nằm trong 20 tuần học
            if (weekNum >= 1 && weekNum <= 20) {
                this.currentWeek = weekNum;
            } else {
                // Nếu học kỳ chưa tới hoặc đã qua: mặc định hiển thị Tuần 1
                this.currentWeek = 1;
            }
        },

        getWeekRange: function (weekNum) {
            var hk = parseInt($('#tkbHocKy').val(), 10) || 1;
            var namHoc = $('#tkbNamHoc').val() || '2026-2027';
            var start = this.getSemesterStartDate(hk, namHoc);

            start.setDate(start.getDate() + (weekNum - 1) * 7);

            var end = new Date(start);
            end.setDate(end.getDate() + 6);
            end.setHours(23, 59, 59, 999);

            return {
                start: start,
                end: end
            };
        },

        renderTimetable: function () {
            var currentUser = App.getCurrentUser();
            var hk = parseInt($('#tkbHocKy').val(), 10);
            var namHoc = $('#tkbNamHoc').val();

            var weekRange = this.getWeekRange(this.currentWeek);
            var startStr = App.formatDate(weekRange.start);
            var endStr = App.formatDate(weekRange.end);
            $('#currentWeekLabel').text('Tuần ' + this.currentWeek + ' (' + startStr + ' - ' + endStr + ')');

            var dayKeys = ['thu2', 'thu3', 'thu4', 'thu5', 'thu6', 'thu7', 'cn'];
            for (var d = 0; d < 7; d++) {
                var curDay = new Date(weekRange.start);
                curDay.setDate(curDay.getDate() + d);
                $('#date-' + dayKeys[d]).text(App.formatDate(curDay));
            }

            var targetLhpList = [];

            if (currentUser.vai_tro === 'sinh_vien') {
                var myDks = MockDB.dang_ky_hoc_phan.getAll({
                    sinh_vien_user_id: currentUser.id,
                    trang_thai: 'Đã đăng ký'
                });
                myDks.forEach(function (dk) {
                    var l = MockDB.lop_hoc_phan.getById(dk.lop_hoc_phan_id);
                    if (l && l.hoc_ky === hk && l.nam_hoc === namHoc) {
                        targetLhpList.push(l);
                    }
                });
            } else if (currentUser.vai_tro === 'giang_vien') {
                targetLhpList = MockDB.lop_hoc_phan.getAll({
                    giang_vien_user_id: currentUser.id,
                    hoc_ky: hk,
                    nam_hoc: namHoc
                });
            } else {
                targetLhpList = MockDB.lop_hoc_phan.getAll({
                    hoc_ky: hk,
                    nam_hoc: namHoc
                });
            }

            $('#statTongMon').text(targetLhpList.length + ' môn');

            var tietTrongTuan = 0;
            var tietTichLuy = 0;

            // Xây dựng bản đồ các buổi học trong tuần theo Thứ & Tiết
            // daySchedules[thu][tiet] = { lhp, mh, gv, lh, span, isStart }
            var daySchedules = {};
            for (var thuIdx = 2; thuIdx <= 8; thuIdx++) {
                daySchedules[thuIdx] = {};
            }

            targetLhpList.forEach(function (lhp) {
                var mh = MockDB.mon_hoc.getById(lhp.mon_hoc_id);
                var gv = lhp.giang_vien_user_id ? MockDB.users.getById(lhp.giang_vien_user_id) : null;
                var lichList = MockDB.lich_hoc.getAll({ lop_hoc_phan_id: lhp.id });

                lichList.forEach(function (lh) {
                    var nbd = new Date(lh.ngay_bat_dau);
                    var nkt = new Date(lh.ngay_ket_thuc);
                    nkt.setHours(23, 59, 59, 999);

                    var soTietMoiBuoi = (lh.tiet_ket_thuc - lh.tiet_bat_dau + 1);

                    // Buổi học diễn ra trong tuần đang chọn
                    if (nbd <= weekRange.end && nkt >= weekRange.start) {
                        tietTrongTuan += soTietMoiBuoi;

                        var tStart = Math.max(1, lh.tiet_bat_dau);
                        var tEnd = Math.min(12, lh.tiet_ket_thuc);
                        var span = (tEnd - tStart + 1);

                        for (var t = tStart; t <= tEnd; t++) {
                            daySchedules[lh.thu][t] = {
                                isStart: (t === tStart),
                                span: span,
                                lhp: lhp,
                                mh: mh,
                                gv: gv,
                                lh: lh
                            };
                        }
                    }

                    // Tính tiết tích lũy
                    var allBuois = MockDB.buoi_hoc.getAll({ lich_hoc_id: lh.id });
                    allBuois.forEach(function (b) {
                        var bDate = new Date(b.ngay_hoc);
                        if (bDate <= weekRange.end) {
                            tietTichLuy += (b.tiet_ket_thuc - b.tiet_bat_dau + 1);
                        }
                    });
                });
            });

            $('#statTietTrongTuan').text(tietTrongTuan + ' tiết');
            $('#statTietTichLuy').text(tietTichLuy + ' tiết');

            var tbody = $('#timetableBody');
            tbody.empty();

            // Vẽ đúng 12 Tiết học (Tiết 1 -> Tiết 12) theo wireframe
            for (var tiet = 1; tiet <= 12; tiet++) {
                var timeStart = tietGioBatDau[tiet] || '';
                var rowHtml = '<tr>';

                // Cột Ca học
                rowHtml +=
                    '<td class="tiet-col">' +
                    '  <div style="font-weight:700;">Tiết ' + tiet + '</div>' +
                    '  <div style="font-size:0.75rem; color:#64748b;">' + timeStart + '</div>' +
                    '</td>';

                // 7 ngày trong tuần: Thứ 2 (2) -> Chủ nhật (8)
                for (var thu = 2; thu <= 8; thu++) {
                    var slotInfo = daySchedules[thu][tiet];

                    if (slotInfo) {
                        if (slotInfo.isStart) {
                            var mh = slotInfo.mh;
                            var lhp = slotInfo.lhp;
                            var gv = slotInfo.gv;
                            var lh = slotInfo.lh;

                            var timeRangeStr = (tietGioBatDau[lh.tiet_bat_dau] || '') + ' - ' + (tietGioKetThuc[lh.tiet_ket_thuc] || '');

                            rowHtml +=
                                '<td rowspan="' + slotInfo.span + '" style="vertical-align:top; background:#f0f6ff; padding:4px;">' +
                                '  <div class="slot" style="background:#dbeafe; border:1px solid #bfdbfe; border-radius:8px; padding:8px; text-align:left; height:100%;">' +
                                '    <div style="font-weight:800; color:#1e40af; font-size:0.86rem; margin-bottom:2px;">' + (mh ? App.escapeHtml(mh.ten_mon_hoc) : '—') + '</div>' +
                                '    <div style="font-weight:700; color:#2563eb; font-size:0.78rem; margin-bottom:4px;">' + (mh ? App.escapeHtml(mh.ma_mon_hoc) : '') + '</div>' +
                                '    <div style="font-size:0.76rem; color:#334155;"><strong>Lớp:</strong> ' + App.escapeHtml(lhp.ma_lop_hoc_phan) + '</div>' +
                                '    <div style="font-size:0.76rem; color:#334155;"><strong>Phòng:</strong> ' + App.escapeHtml(lhp.phong_hoc || '—') + '</div>' +
                                (gv ? '    <div style="font-size:0.76rem; color:#334155;"><strong>GV:</strong> ' + App.escapeHtml(gv.ho_ten) + '</div>' : '') +
                                '    <div style="font-size:0.74rem; color:#64748b; margin-top:2px;"><i class="fa-regular fa-clock"></i> ' + timeRangeStr + '</div>' +
                                '  </div>' +
                                '</td>';
                        }
                        // Nếu không phải isStart thì bỏ qua vì ô đã được chiếm bởi rowspan ở trên
                    } else {
                        rowHtml += '<td></td>';
                    }
                }

                rowHtml += '</tr>';
                tbody.append(rowHtml);
            }
        }
    };

    App.registerModule('tkb', TKBModule);
})(jQuery);
