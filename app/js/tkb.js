/* ================================================================
   TKB.JS - Thời khóa biểu tuần cho Sinh viên & Giảng viên
   Lưới 7 ngày (Thứ 2 -> Chủ nhật), 13 tiết học cố định (Tiết 1-13)
   Tuần học tính từ lịch học thực tế của học kỳ (API), tự mở tuần hiện tại
   Hỗ trợ rowspan theo tiết học giống wireframe & Font Awesome CDN
   ================================================================ */

(function ($) {
    'use strict';

    // RULE-TKB-01: bảng giờ 13 tiết cố định khai báo một lần tại App.TIET_GIO (app.js), không lưu DB.
    // RULE-TKB-04:
    // Giờ bắt đầu lấy theo tiết bắt đầu, giờ kết thúc lấy theo tiết kết thúc - không cộng phút.
    var SO_TIET = App.SO_TIET_NGAY;
    var tietGioBatDau = {}, tietGioKetThuc = {};
    Object.keys(App.TIET_GIO).forEach(function (k) {
        tietGioBatDau[k] = App.TIET_GIO[k][0];
        tietGioKetThuc[k] = App.TIET_GIO[k][1];
    });

    var TKBModule = {
        currentWeek: 1,

        getTerm: function (hk, namHoc) {
            return ((App.getTerms() || {}).hoc_ky || []).find(function (x) {
                return parseInt(x.hoc_ky, 10) === hk && x.nam_hoc === namHoc;
            }) || null;
        },

        // RULE-HK-03, RULE-DL-07: khoảng tuần = ngày học kỳ đã khai báo, mở rộng để bao trùm mọi buổi học thực tế
        // (dữ liệu cũ có buổi nằm ngoài học kỳ vẫn hiển thị, không bị ẩn khỏi thời khóa biểu)
        getTermRange: function (hk, namHoc) {
            var term = this.getTerm(hk, namHoc);
            if (!term) return null;
            var start = term.bat_dau, end = term.ket_thuc;
            if (term.buoi_tu && term.buoi_tu < start) start = term.buoi_tu;
            if (term.buoi_den && term.buoi_den > end) end = term.buoi_den;
            return { start: new Date(start + 'T00:00:00'), end: new Date(end + 'T00:00:00') };
        },

        // Thứ Hai của tuần đầu tiên học kỳ; học kỳ chưa có lịch thì lấy tuần hiện tại
        getSemesterStartDate: function (hk, namHoc) {
            var range = this.getTermRange(hk, namHoc);
            var d = range ? new Date(range.start) : new Date();
            d.setHours(0, 0, 0, 0);
            var day = d.getDay(); // 0 = CN
            d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
            return d;
        },

        // RULE-HK-07: số tuần = (Thứ 2 tuần chứa ngày cuối − Thứ 2 tuần chứa ngày đầu) ÷ 7 + 1 (cùng công thức backend)
        getMaxWeek: function (hk, namHoc) {
            var range = this.getTermRange(hk, namHoc);
            if (!range) return 1;
            var start = this.getSemesterStartDate(hk, namHoc);
            return Math.max(1, Math.floor((range.end - start) / (7 * 86400000) + 1e-9) + 1);
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
                '            <option value="1">Học kỳ 1</option>' +
                '            <option value="2">Học kỳ 2</option>' +
                '            <option value="3">Học kỳ Hè</option>' +
                '          </select>' +
                '        </div>' +
                '        <div class="d-flex align-center gap-2">' +
                '          <label><i class="fa-regular fa-calendar"></i> Năm học:</label>' +
                '          <select id="tkbNamHoc" class="filter-select">' +
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

                '    <div id="tkbCanhBao"></div>' +
                '    <!-- Timetable Grid 13 Tiết -->' +
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
            var self = this;
            App.fillTermSelects('#tkbHocKy', '#tkbNamHoc', { prefix: 'Năm học ' }, function () {
                self.autoDetectCurrentWeek();
                self.renderTimetable();
            });
        },

        bindEvents: function () {
            var self = this;

            $('#tkbHocKy, #tkbNamHoc').on('change', function () {
                self.autoDetectCurrentWeek();
                self.renderTimetable();
            });

            $(document).off('click', '.tkb-diem-danh-btn').on('click', '.tkb-diem-danh-btn', function () {
                if (window.DiemDanhModule) {
                    DiemDanhModule.preset = { lop_hoc_phan_id: $(this).data('lhp'), buoi_hoc_id: $(this).data('buoi') };
                }
                App.navigate('diem-danh');
            });

            $('#btnPrevWeek').on('click', function () {
                if (self.currentWeek > 1) {
                    self.currentWeek--;
                    self.renderTimetable();
                }
            });

            $('#btnNextWeek').on('click', function () {
                var hk = parseInt($('#tkbHocKy').val(), 10) || 1;
                if (self.currentWeek < self.getMaxWeek(hk, $('#tkbNamHoc').val())) {
                    self.currentWeek++;
                    self.renderTimetable();
                }
            });
        },

        // Tự động xác định tuần hiện tại theo ngày hôm nay
        autoDetectCurrentWeek: function () {
            var hk = parseInt($('#tkbHocKy').val(), 10) || 1;
            var namHoc = $('#tkbNamHoc').val() || '';
            var startDate = this.getSemesterStartDate(hk, namHoc);
            var today = new Date();

            var diffMs = today.getTime() - startDate.getTime();
            var diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            var weekNum = Math.floor(diffDays / 7) + 1;

            // Nếu hôm nay nằm trong học kỳ được chọn thì mở đúng tuần hiện tại
            if (weekNum >= 1 && weekNum <= this.getMaxWeek(hk, namHoc)) {
                this.currentWeek = weekNum;
            } else {
                // Nếu học kỳ chưa tới hoặc đã qua: mặc định hiển thị Tuần 1
                this.currentWeek = 1;
            }
        },

        getWeekRange: function (weekNum) {
            var hk = parseInt($('#tkbHocKy').val(), 10) || 1;
            var namHoc = $('#tkbNamHoc').val() || '';
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
            $('#currentWeekLabel').text('Tuần ' + this.currentWeek + '/' + this.getMaxWeek(hk, namHoc) + ' (' + startStr + ' - ' + endStr + ')');

            // Cảnh báo dữ liệu: học kỳ chưa khai báo hoặc có buổi học nằm ngoài khoảng ngày học kỳ
            var term = this.getTerm(hk, namHoc);
            var warn = '';
            if (term && parseInt(term.da_khai_bao, 10) !== 1) {
                warn = 'Học kỳ này chưa được khai báo ngày bắt đầu / kết thúc; tuần học đang tính theo các buổi học thực tế.';
            } else if (term && parseInt(term.so_buoi_ngoai_hoc_ky, 10) > 0) {
                warn = 'Có ' + term.so_buoi_ngoai_hoc_ky + ' buổi học nằm ngoài học kỳ đã khai báo (' + App.formatDate(term.bat_dau) + ' đến ' + App.formatDate(term.ket_thuc) +
                    '; buổi thực tế ' + App.formatDate(term.buoi_tu) + ' đến ' + App.formatDate(term.buoi_den) + '). Tuần học được mở rộng để hiển thị đủ; quản trị viên cần sửa ngày học kỳ.';
            }
            $('#tkbCanhBao').html(warn ? '<div class="alert alert-warning mb-3" style="font-size:0.84rem;">' + warn + '</div>' : '');

            var dayKeys = ['thu2', 'thu3', 'thu4', 'thu5', 'thu6', 'thu7', 'cn'];
            for (var d = 0; d < 7; d++) {
                var curDay = new Date(weekRange.start);
                curDay.setDate(curDay.getDate() + d);
                $('#date-' + dayKeys[d]).text(App.formatDate(curDay));
            }

            var self = this;
            var y = weekRange.start.getFullYear();
            var m = ('0' + (weekRange.start.getMonth() + 1)).slice(-2);
            var dd = ('0' + weekRange.start.getDate()).slice(-2);

            // RULE-09, RULE-11: lọc buổi học và tính số tiết do backend xử lý
            Api.get('/api/dangkyhocphan/thoi-khoa-bieu', { hoc_ky: hk, nam_hoc: namHoc, tu_ngay: y + '-' + m + '-' + dd })
                .done(function (res) { self.drawGrid(res.data || {}); })
                .fail(Api.toastError);
        },

        drawGrid: function (data) {
            var user = App.getCurrentUser();
            // Giảng viên (và quản trị viên) điểm danh trực tiếp từ ô buổi học
            var canDiemDanh = user && (user.vai_tro === 'giang_vien' || user.vai_tro === 'admin');

            $('#statTongMon').text((data.so_mon || 0) + ' môn');
            $('#statTietTrongTuan').text((data.so_tiet_trong_tuan || 0) + ' tiết');
            $('#statTietTichLuy').text((data.tong_tiet_du_kien_da_hoc || 0) + ' tiết');

            // daySchedules[thu][tiet] = { isStart, span, b }
            var daySchedules = {};
            for (var thuIdx = 2; thuIdx <= 8; thuIdx++) {
                daySchedules[thuIdx] = {};
            }

            (data.buoi_hoc || []).forEach(function (b) {
                var tStart = Math.max(1, b.tiet_bat_dau);
                var tEnd = Math.min(SO_TIET, b.tiet_ket_thuc);
                for (var t = tStart; t <= tEnd; t++) {
                    daySchedules[b.thu][t] = { isStart: (t === tStart), span: (tEnd - tStart + 1), b: b };
                }
            });

            var tbody = $('#timetableBody');
            tbody.empty();

            // Vẽ đủ 13 tiết học (Tiết 1 -> Tiết 13)
            for (var tiet = 1; tiet <= SO_TIET; tiet++) {
                var timeStart = tietGioBatDau[tiet] || '';
                var rowHtml = '<tr>';

                // Cột Ca học
                rowHtml +=
                    '<td class="tiet-col">' +
                    '  <div class="tiet-so">Tiết ' + tiet + '</div>' +
                    '  <div class="tiet-gio">' + timeStart + ' - ' + (tietGioKetThuc[tiet] || '') + '</div>' +
                    '</td>';

                // 7 ngày trong tuần: Thứ 2 (2) -> Chủ nhật (8)
                for (var thu = 2; thu <= 8; thu++) {
                    var slotInfo = daySchedules[thu][tiet];

                    if (slotInfo) {
                        if (slotInfo.isStart) {
                            var b = slotInfo.b;
                            var mh = { ten_mon_hoc: b.ten_mon_hoc, ma_mon_hoc: b.ma_mon_hoc };
                            var lhp = { ma_lop_hoc_phan: b.ma_lop_hoc_phan, phong_hoc: b.phong_hoc };
                            var gv = b.ten_giang_vien ? { ho_ten: b.ten_giang_vien } : null;
                            var lh = b;

                            var timeRangeStr = (tietGioBatDau[lh.tiet_bat_dau] || '') + ' - ' + (tietGioKetThuc[lh.tiet_ket_thuc] || '');

                            rowHtml +=
                                '<td rowspan="' + slotInfo.span + '" style="vertical-align:top; background:#f0f6ff; padding:4px;">' +
                                '  <div class="slot" style="background:#dbeafe; border:1px solid #bfdbfe; border-radius:8px; padding:8px; text-align:left; height:100%;">' +
                                '    <div style="font-weight:800; color:#1e40af; font-size:0.86rem; margin-bottom:2px;">' + (mh ? App.escapeHtml(mh.ten_mon_hoc) : '—') + '</div>' +
                                '    <div style="font-weight:700; color:#2563eb; font-size:0.78rem; margin-bottom:4px;">' + (mh ? App.escapeHtml(mh.ma_mon_hoc) : '') + '</div>' +
                                '    <div style="font-size:0.76rem; color:#334155;"><strong>Lớp:</strong> ' + App.escapeHtml(lhp.ma_lop_hoc_phan) + '</div>' +
                                (b.so_thu_tu ? '    <div style="font-size:0.76rem; color:#334155;"><strong>Buổi:</strong> ' + b.so_thu_tu + '/' + b.tong_so_buoi + '</div>' : '') +
                                '    <div style="font-size:0.76rem; color:#334155;"><strong>Phòng:</strong> ' + App.escapeHtml(lhp.phong_hoc || '—') + '</div>' +
                                (gv ? '    <div style="font-size:0.76rem; color:#334155;"><strong>GV:</strong> ' + App.escapeHtml(gv.ho_ten) + '</div>' : '') +
                                '    <div style="font-size:0.74rem; color:#64748b; margin-top:2px;"><i class="fa-regular fa-clock"></i> ' + timeRangeStr + '</div>' +
                                (canDiemDanh && b.buoi_hoc_id
                                    ? '    <button type="button" class="btn btn-sm btn-primary tkb-diem-danh-btn" data-lhp="' + b.lop_hoc_phan_id + '" data-buoi="' + b.buoi_hoc_id + '">Điểm danh</button>'
                                    : '') +
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
