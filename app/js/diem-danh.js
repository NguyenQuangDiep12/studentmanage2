/* ================================================================
   DIEM-DANH.JS - Điểm danh sinh viên theo từng buổi học
   RULE-12: 2 trạng thái Có mặt / Vắng mặt theo từng buổi học
   Dữ liệu, kiểm tra và tính chuyên cần (RULE-15) do backend xử lý
   Font Awesome icons, XSS protection
   ================================================================ */

(function ($) {
    'use strict';

    var DiemDanhModule = {
        preset: null,       // { lop_hoc_phan_id, buoi_hoc_id } khi mở từ thời khóa biểu
        classes: [],
        currentLhpId: null,
        currentBuoiHocId: null,

        render: function () {
            var self = this;
            var currentUser = App.getCurrentUser();
            if (!currentUser || (currentUser.vai_tro !== 'giang_vien' && currentUser.vai_tro !== 'admin')) {
                $('#contentArea').html('<div class="alert alert-danger"><i class="fa-solid fa-triangle-exclamation"></i> Chức năng chỉ dành cho Giảng viên phụ trách lớp</div>');
                return;
            }

            // RULE-12.1: backend chỉ trả về lớp do giảng viên phụ trách
            Api.get('/api/ketquahoctap/lop-giang-day')
                .done(function (res) { self.renderPage(res.data || []); })
                .fail(Api.toastError);
        },

        renderPage: function (myClasses) {
            if (myClasses.length === 0) {
                $('#contentArea').html(
                    '<div class="card"><div class="card-body empty-state">' +
                    '<div class="empty-icon"><i class="fa-solid fa-chalkboard-user"></i></div>' +
                    '<h4>Không có lớp học phần nào</h4>' +
                    '<p>Bạn chưa được phân công giảng dạy lớp học phần nào để điểm danh</p>' +
                    '</div></div>'
                );
                return;
            }

            this.classes = myClasses;

            var html =
                '<div class="card mb-3">' +
                '  <div class="card-header">' +
                '    <h3><i class="fa-solid fa-clipboard-user" style="color:var(--primary);"></i> Điểm danh lớp học phần</h3>' +
                '  </div>' +
                '  <div class="card-body">' +
                '    <div class="form-row">' +
                '      <div class="form-group" style="flex:0.7;">' +
                '        <label>Học kỳ</label>' +
                '        <select class="form-control" id="ddHocKy"><option value="1">Học kỳ 1</option><option value="2">Học kỳ 2</option><option value="3">Học kỳ Hè</option></select>' +
                '      </div>' +
                '      <div class="form-group" style="flex:0.8;">' +
                '        <label>Năm học</label>' +
                '        <select class="form-control" id="ddNamHoc"></select>' +
                '      </div>' +
                '      <div class="form-group" style="flex:1.6;">' +
                '        <label>Mã môn - Lớp học phần <span class="required">*</span></label>' +
                '        <select class="form-control" id="selectDiemDanhLHP"></select>' +
                '      </div>' +
                '    </div>' +
                '    <div class="form-row">' +
                '      <div class="form-group" style="flex:1.5;">' +
                '        <label>Chọn buổi học cần điểm danh <span class="required">*</span></label>' +
                '        <select class="form-control" id="selectDiemDanhBuoi"></select>' +
                '      </div>' +
                '      <div class="form-group" style="flex:1; display:flex; align-items:flex-end;">' +
                '        <button class="btn btn-outline" id="btnRefreshBuoiHoc" style="width:100%;"><i class="fa-solid fa-rotate"></i> Tải danh sách</button>' +
                '      </div>' +
                '    </div>' +
                '    <div id="futureAlertBox" style="display:none;" class="alert alert-warning mt-2">' +
                '      <i class="fa-solid fa-circle-exclamation"></i> Buổi học này chưa diễn ra (trong tương lai) - Hệ thống chỉ ghi nhận điểm danh các buổi đã hoặc đang diễn ra' +
                '    </div>' +
                '  </div>' +
                '</div>' +

                '<!-- Thống kê nhanh -->' +
                '<div class="stats-grid-modern mb-3" id="diemDanhStats" style="display:none; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">' +
                '  <div class="stat-modern-card"><div class="stat-label">Tổng sinh viên</div><div class="stat-number" id="statTotalSv">0</div><div class="stat-desc">Đã đăng ký lớp</div></div>' +
                '  <div class="stat-modern-card"><div class="stat-label">Có mặt</div><div class="stat-number text-success" id="statCoMat">0</div><div class="stat-desc">Không tính tiết nghỉ</div></div>' +
                '  <div class="stat-modern-card"><div class="stat-label">Vắng mặt</div><div class="stat-number text-danger" id="statVangMat">0</div><div class="stat-desc">Tính toàn bộ số tiết của buổi</div></div>' +
                '</div>' +

                '<!-- Bảng điểm danh -->' +
                '<div class="card" id="diemDanhTableCard" style="display:none;">' +
                '  <div class="card-header">' +
                '    <h3 id="diemDanhCardTitle">Danh sách điểm danh</h3>' +
                '    <div class="d-flex gap-2">' +
                '      <button class="btn btn-sm btn-outline-primary" id="btnMarkAllPresent"><i class="fa-solid fa-check-double"></i> Tất cả có mặt</button>' +
                '      <button class="btn btn-sm btn-outline text-danger" id="btnMarkAllAbsent"><i class="fa-solid fa-user-xmark"></i> Tất cả vắng</button>' +
                '      <button class="btn btn-sm btn-success" id="btnSaveDiemDanh"><i class="fa-solid fa-floppy-disk"></i> Lưu kết quả điểm danh</button>' +
                '    </div>' +
                '  </div>' +
                '  <div class="card-body">' +
                '    <div class="table-responsive">' +
                '      <table class="data-table">' +
                '        <thead>' +
                '          <tr>' +
                '            <th>STT</th>' +
                '            <th>MSSV</th>' +
                '            <th>Họ và tên</th>' +
                '            <th>Lớp sinh hoạt</th>' +
                '            <th class="text-center" style="width:240px;">Trạng thái điểm danh</th>' +
                '            <th>Ghi chú điểm danh</th>' +
                '            <th>Thời điểm điểm danh</th>' +
                '          </tr>' +
                '        </thead>' +
                '        <tbody id="diemDanhTableBody"></tbody>' +
                '      </table>' +
                '    </div>' +
                '  </div>' +
                '</div>';

            $('#contentArea').html(html);
            this.bindEvents();

            var self = this;
            var preset = this.preset;
            this.preset = null;

            App.fillTermSelects('#ddHocKy', '#ddNamHoc', {}, function () {
                // Mở từ thời khóa biểu: chọn đúng học kỳ, môn và buổi học
                if (preset) {
                    var lhp = self.classes.find(function (l) { return l.id === parseInt(preset.lop_hoc_phan_id, 10); });
                    if (lhp) {
                        if (!$('#ddNamHoc option[value="' + lhp.nam_hoc + '"]').length) {
                            $('#ddNamHoc').append('<option value="' + lhp.nam_hoc + '">' + lhp.nam_hoc + '</option>');
                        }
                        $('#ddHocKy').val(String(lhp.hoc_ky));
                        $('#ddNamHoc').val(lhp.nam_hoc);
                    }
                }
                self.fillClassSelect(preset ? preset.lop_hoc_phan_id : null);
                self.onClassChange(preset ? preset.buoi_hoc_id : null);
            });
        },

        // Danh sách lớp theo học kỳ - năm học, hiển thị theo mã môn
        fillClassSelect: function (selectedId) {
            var hk = parseInt($('#ddHocKy').val(), 10);
            var nh = $('#ddNamHoc').val();
            var list = this.classes.filter(function (l) { return l.hoc_ky === hk && l.nam_hoc === nh; });
            list.sort(function (a, b) { return a.ma_mon_hoc.localeCompare(b.ma_mon_hoc); });

            var sel = $('#selectDiemDanhLHP').empty();
            if (list.length === 0) {
                sel.append('<option value="">Không có lớp học phần nào trong học kỳ này</option>');
                return;
            }
            list.forEach(function (l) {
                sel.append('<option value="' + l.id + '">' + App.escapeHtml(l.ma_mon_hoc + ' - ' + (l.ten_mon_hoc || '') + ' (' + l.ma_lop_hoc_phan + ')') + '</option>');
            });
            if (selectedId) sel.val(String(selectedId));
        },

        bindEvents: function () {
            var self = this;

            $('#selectDiemDanhLHP').on('change', function () {
                self.onClassChange();
            });

            $('#ddHocKy, #ddNamHoc').on('change', function () {
                self.fillClassSelect();
                self.onClassChange();
            });

            $('#selectDiemDanhBuoi').on('change', function () {
                self.loadStudentAttendance();
            });

            $('#btnRefreshBuoiHoc').on('click', function () {
                self.loadStudentAttendance();
            });

            // Chuyển trạng thái Có mặt / Vắng mặt
            $(document).off('click', '.att-btn').on('click', '.att-btn', function () {
                var $btn = $(this);
                var $parent = $btn.closest('.attendance-toggle');
                $parent.find('.att-btn').removeClass('active');
                $btn.addClass('active');
                self.updateCounters();
            });

            // Mark all present
            $('#btnMarkAllPresent').on('click', function () {
                $('.attendance-toggle').each(function () {
                    $(this).find('.att-btn').removeClass('active');
                    $(this).find('.att-btn.present').addClass('active');
                });
                self.updateCounters();
                App.showToast('Đã đánh dấu tất cả có mặt!', 'info');
            });

            // Mark all absent
            $('#btnMarkAllAbsent').on('click', function () {
                $('.attendance-toggle').each(function () {
                    $(this).find('.att-btn').removeClass('active');
                    $(this).find('.att-btn.absent').addClass('active');
                });
                self.updateCounters();
                App.showToast('Đã đánh dấu tất cả vắng mặt!', 'warning');
            });

            // Save
            $('#btnSaveDiemDanh').on('click', function () {
                self.saveAttendance();
            });
        },

        onClassChange: function (presetBuoiId) {
            var self = this;
            var lhpId = parseInt($('#selectDiemDanhLHP').val(), 10);
            this.currentLhpId = lhpId;
            if (!lhpId) {
                $('#selectDiemDanhBuoi').empty();
                $('#diemDanhStats, #diemDanhTableCard, #futureAlertBox').hide();
                return;
            }

            Api.get('/api/ketquahoctap/buoi-hoc', { lop_hoc_phan_id: lhpId })
                .done(function (res) {
                    var allBuoiHoc = res.data || [];
                    var buoiSelect = $('#selectDiemDanhBuoi');
                    buoiSelect.empty();

                    if (allBuoiHoc.length === 0) {
                        buoiSelect.html('<option value="">Chưa có buổi học nào được tạo</option>');
                        $('#diemDanhStats, #diemDanhTableCard').hide();
                        return;
                    }

                    // Mặc định chọn buổi gần nhất đã diễn ra
                    var defaultId = allBuoiHoc[0].id;
                    allBuoiHoc.forEach(function (b, idx) {
                        var thuName = App.thuLabel(b.thu);
                        var tag = b.da_diem_danh ? ' [Đã điểm danh]' : (b.la_tuong_lai ? ' [Chưa diễn ra]' : '');
                        if (!b.la_tuong_lai) defaultId = b.id;
                        buoiSelect.append('<option value="' + b.id + '">Buổi ' + (idx + 1) + ': ' + App.formatDate(b.ngay_hoc) + ' (' + thuName + ', Tiết ' + b.tiet_bat_dau + '-' + b.tiet_ket_thuc + ')' + tag + '</option>');
                    });
                    buoiSelect.val(String(presetBuoiId || defaultId));

                    self.loadStudentAttendance();
                })
                .fail(Api.toastError);
        },

        loadStudentAttendance: function () {
            var self = this;
            var buoiHocId = parseInt($('#selectDiemDanhBuoi').val(), 10);
            this.currentBuoiHocId = buoiHocId;
            if (!buoiHocId) {
                $('#diemDanhStats, #diemDanhTableCard').hide();
                return;
            }

            Api.get('/api/ketquahoctap/diem-danh', { buoi_hoc_id: buoiHocId })
                .done(function (res) { self.renderAttendance(res); })
                .fail(Api.toastError);
        },

        renderAttendance: function (res) {
            var buoi = res.buoi_hoc;
            var rows = res.data || [];

            $('#diemDanhCardTitle').html('<i class="fa-solid fa-calendar-day"></i> Buổi học ngày ' + App.formatDate(buoi.ngay_hoc) + ' (Tiết ' + buoi.tiet_bat_dau + ' - ' + buoi.tiet_ket_thuc + ', ' + buoi.so_tiet + ' tiết)');

            var todayStr = new Date().toISOString().split('T')[0];
            $('#futureAlertBox').toggle(buoi.ngay_hoc > todayStr);

            var tbody = $('#diemDanhTableBody');
            tbody.empty();

            if (rows.length === 0) {
                tbody.html('<tr><td colspan="7" class="text-center text-muted py-4">Lớp này hiện chưa có sinh viên nào đăng ký</td></tr>');
                $('#diemDanhStats, #diemDanhTableCard').show();
                this.updateCounters();
                return;
            }

            rows.forEach(function (r, index) {
                var st = r.trang_thai || 'co_mat'; // Mặc định có mặt khi chưa điểm danh
                var timeStr = r.thoi_gian_diem_danh ? App.formatDateTime(r.thoi_gian_diem_danh) : '<span class="text-muted">Chưa lưu</span>';

                var row =
                    '<tr data-dk-id="' + r.dang_ky_id + '">' +
                    '  <td class="text-center">' + (index + 1) + '</td>' +
                    '  <td><strong>' + App.escapeHtml(r.ma_dinh_danh) + '</strong></td>' +
                    '  <td>' + App.escapeHtml(r.ho_ten) + '</td>' +
                    '  <td>' + (r.ma_lop ? App.escapeHtml(r.ma_lop) : '—') + '</td>' +
                    '  <td class="text-center">' +
                    '    <div class="attendance-toggle">' +
                    '      <button type="button" class="att-btn present ' + (st === 'co_mat' ? 'active' : '') + '"><i class="fa-solid fa-check"></i> Có mặt</button>' +
                    '      <button type="button" class="att-btn absent ' + (st === 'vang_mat' ? 'active' : '') + '"><i class="fa-solid fa-xmark"></i> Vắng mặt</button>' +
                    '    </div>' +
                    '  </td>' +
                    '  <td>' +
                    '    <input type="text" class="form-control form-control-sm att-note" value="' + App.escapeHtml(r.ghi_chu || '') + '" placeholder="Ghi chú (lý do nếu vắng)">' +
                    '  </td>' +
                    '  <td><small class="att-time">' + timeStr + '</small></td>' +
                    '</tr>';
                tbody.append(row);
            });

            $('#diemDanhStats, #diemDanhTableCard').show();
            this.updateCounters();
        },

        updateCounters: function () {
            var total = $('#diemDanhTableBody tr[data-dk-id]').length;
            var present = $('#diemDanhTableBody .att-btn.present.active').length;
            var absent = $('#diemDanhTableBody .att-btn.absent.active').length;

            $('#statTotalSv').text(total);
            $('#statCoMat').text(present);
            $('#statVangMat').text(absent);
        },

        saveAttendance: function () {
            var self = this;
            var buoiHocId = this.currentBuoiHocId;
            if (!buoiHocId) return;

            var items = [];
            $('#diemDanhTableBody tr[data-dk-id]').each(function () {
                var $r = $(this);
                items.push({
                    dang_ky_id: parseInt($r.data('dk-id'), 10),
                    trang_thai: $r.find('.att-btn.absent').hasClass('active') ? 'vang_mat' : 'co_mat',
                    ghi_chu: $r.find('.att-note').val()
                });
            });

            // Lưu, chống trùng bản ghi và tính lại chuyên cần do backend xử lý (RULE-12, RULE-15)
            Api.post('/api/ketquahoctap/diem-danh', { buoi_hoc_id: buoiHocId, items: items })
                .done(function (res) {
                    App.showToast(res.message, 'success');
                    self.onClassChangeKeep(buoiHocId);
                })
                .fail(Api.toastError);
        },

        // Tải lại danh sách buổi (cập nhật nhãn [Đã điểm danh]) nhưng giữ buổi đang chọn
        onClassChangeKeep: function (buoiHocId) {
            var self = this;
            Api.get('/api/ketquahoctap/buoi-hoc', { lop_hoc_phan_id: this.currentLhpId }).done(function (res) {
                (res.data || []).forEach(function (b) {
                    if (b.id === buoiHocId && b.da_diem_danh) {
                        var $opt = $('#selectDiemDanhBuoi option[value="' + b.id + '"]');
                        $opt.text($opt.text().replace(' [Chưa diễn ra]', '').replace(' [Đã điểm danh]', '') + ' [Đã điểm danh]');
                    }
                });
                self.loadStudentAttendance();
            });
        }
    };

    App.registerModule('diem-danh', DiemDanhModule);
    window.DiemDanhModule = DiemDanhModule;
})(jQuery);
