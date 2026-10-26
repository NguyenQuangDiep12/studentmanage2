/* ================================================================
   DIEM-DANH.JS - Điểm danh sinh viên theo từng buổi học
   Hỗ trợ 3 trạng thái chuẩn: Có mặt, Đi muộn, Vắng mặt
   Chặn điểm danh buổi học trong tương lai
   Tự động tính toán điểm chuyên cần đồng bộ vào bảng điểm
   Font Awesome icons, XSS protection
   ================================================================ */

(function ($) {
    'use strict';

    var DiemDanhModule = {
        currentLhpId: null,
        currentBuoiHocId: null,

        render: function () {
            var currentUser = App.getCurrentUser();
            if (!currentUser || (currentUser.vai_tro !== 'giang_vien' && currentUser.vai_tro !== 'admin')) {
                $('#contentArea').html('<div class="alert alert-danger"><i class="fa-solid fa-triangle-exclamation"></i> Chức năng chỉ dành cho Giảng viên phụ trách lớp</div>');
                return;
            }

            var filterLHP = currentUser.vai_tro === 'admin' ? {} : { giang_vien_user_id: currentUser.id };
            var myClasses = MockDB.lop_hoc_phan.getAll(filterLHP);

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

            var lhpOptions = myClasses.map(function (l) {
                var mh = MockDB.mon_hoc.getById(l.mon_hoc_id);
                return '<option value="' + l.id + '">' + App.escapeHtml(l.ma_lop_hoc_phan) + ' - ' + (mh ? App.escapeHtml(mh.ten_mon_hoc) : '') + ' (HK' + l.hoc_ky + ' ' + App.escapeHtml(l.nam_hoc) + ')</option>';
            }).join('');

            var html =
                '<div class="card mb-3">' +
                '  <div class="card-header">' +
                '    <h3><i class="fa-solid fa-clipboard-user" style="color:var(--primary);"></i> Điểm danh lớp học phần</h3>' +
                '  </div>' +
                '  <div class="card-body">' +
                '    <div class="form-row">' +
                '      <div class="form-group" style="flex:1.5;">' +
                '        <label>Chọn lớp học phần phụ trách <span class="required">*</span></label>' +
                '        <select class="form-control" id="selectDiemDanhLHP">' + lhpOptions + '</select>' +
                '      </div>' +
                '      <div class="form-group" style="flex:1.5;">' +
                '        <label>Chọn buổi học cần điểm danh <span class="required">*</span></label>' +
                '        <select class="form-control" id="selectDiemDanhBuoi"></select>' +
                '      </div>' +
                '      <div class="form-group" style="flex:1; display:flex; align-items:flex-end;">' +
                '        <button class="btn btn-outline" id="btnRefreshBuoiHoc" style="width:100%;"><i class="fa-solid fa-rotate"></i> Tải danh sách</button>' +
                '      </div>' +
                '    </div>' +
                '    <div id="futureAlertBox" style="display:none;" class="alert alert-warning mt-2">' +
                '      <i class="fa-solid fa-circle-exclamation"></i> Buổi học này chưa diễn ra (trong tương lai) - Bạn chỉ có thể điểm danh các buổi đã hoặc đang diễn ra' +
                '    </div>' +
                '  </div>' +
                '</div>' +

                '<!-- Thống kê nhanh -->' +
                '<div class="stats-grid-modern mb-3" id="diemDanhStats" style="display:none; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">' +
                '  <div class="stat-modern-card"><div class="stat-label">Tổng sinh viên</div><div class="stat-number" id="statTotalSv">0</div><div class="stat-desc">Đã đăng ký lớp</div></div>' +
                '  <div class="stat-modern-card"><div class="stat-label">Có mặt</div><div class="stat-number text-success" id="statCoMat">0</div><div class="stat-desc">Đúng giờ</div></div>' +
                '  <div class="stat-modern-card"><div class="stat-label">Đi muộn</div><div class="stat-number text-warning" id="statDiMuon">0</div><div class="stat-desc">Tính 50% tiết nghỉ</div></div>' +
                '  <div class="stat-modern-card"><div class="stat-label">Vắng mặt</div><div class="stat-number text-danger" id="statVangMat">0</div><div class="stat-desc">Tính 100% tiết nghỉ</div></div>' +
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
            this.onClassChange();
        },

        bindEvents: function () {
            var self = this;

            $('#selectDiemDanhLHP').on('change', function () {
                self.onClassChange();
            });

            $('#selectDiemDanhBuoi').on('change', function () {
                self.loadStudentAttendance();
            });

            $('#btnRefreshBuoiHoc').on('click', function () {
                self.loadStudentAttendance();
            });

            // Toggle Present / Late / Absent
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

        onClassChange: function () {
            var lhpId = parseInt($('#selectDiemDanhLHP').val(), 10);
            this.currentLhpId = lhpId;
            if (!lhpId) return;

            var lichList = MockDB.lich_hoc.getAll({ lop_hoc_phan_id: lhpId });
            var allBuoiHoc = [];
            lichList.forEach(function (lh) {
                var buois = MockDB.buoi_hoc.getAll({ lich_hoc_id: lh.id });
                allBuoiHoc = allBuoiHoc.concat(buois);
            });

            allBuoiHoc.sort(function (a, b) {
                return new Date(a.ngay_hoc) - new Date(b.ngay_hoc);
            });

            var buoiSelect = $('#selectDiemDanhBuoi');
            buoiSelect.empty();

            if (allBuoiHoc.length === 0) {
                buoiSelect.html('<option value="">Chưa có buổi học nào được tạo</option>');
                $('#diemDanhStats, #diemDanhTableCard').hide();
                return;
            }

            allBuoiHoc.forEach(function (b, idx) {
                var dayOfWeek = new Date(b.ngay_hoc).getDay();
                var thuName = dayOfWeek === 0 ? 'Chủ Nhật' : 'Thứ ' + (dayOfWeek + 1);
                var isDone = MockDB.diem_danh.getAll({ buoi_hoc_id: b.id }).length > 0;
                var tag = isDone ? ' [Đã điểm danh]' : '';
                buoiSelect.append('<option value="' + b.id + '">Buổi ' + (idx + 1) + ': ' + App.formatDate(b.ngay_hoc) + ' (' + thuName + ', Tiết ' + b.tiet_bat_dau + '-' + b.tiet_ket_thuc + ')' + tag + '</option>');
            });

            this.loadStudentAttendance();
        },

        loadStudentAttendance: function () {
            var buoiHocId = parseInt($('#selectDiemDanhBuoi').val(), 10);
            this.currentBuoiHocId = buoiHocId;
            if (!buoiHocId) {
                $('#diemDanhStats, #diemDanhTableCard').hide();
                return;
            }

            var buoi = MockDB.buoi_hoc.getById(buoiHocId);
            $('#diemDanhCardTitle').html('<i class="fa-solid fa-calendar-day"></i> Buổi học ngày ' + App.formatDate(buoi.ngay_hoc) + ' (Tiết ' + buoi.tiet_bat_dau + ' - ' + buoi.tiet_ket_thuc + ')');

            // Kiểm tra buổi học tương lai
            var todayStr = new Date().toISOString().split('T')[0];
            var isFuture = (buoi.ngay_hoc > todayStr);
            if (isFuture) {
                $('#futureAlertBox').show();
                $('#btnSaveDiemDanh, #btnMarkAllPresent, #btnMarkAllAbsent').prop('disabled', true);
            } else {
                $('#futureAlertBox').hide();
                $('#btnSaveDiemDanh, #btnMarkAllPresent, #btnMarkAllAbsent').prop('disabled', false);
            }

            // Danh sách SV đăng ký hợp lệ (chưa hủy)
            var activeDks = MockDB.dang_ky_hoc_phan.getAll({
                lop_hoc_phan_id: this.currentLhpId,
                trang_thai: 'Đã đăng ký'
            });

            var existingAttendance = MockDB.diem_danh.getAll({ buoi_hoc_id: buoiHocId });
            var attMap = {};
            existingAttendance.forEach(function (a) {
                attMap[a.dang_ky_id] = a;
            });

            var tbody = $('#diemDanhTableBody');
            tbody.empty();

            if (activeDks.length === 0) {
                tbody.html('<tr><td colspan="7" class="text-center text-muted py-4">Lớp này hiện chưa có sinh viên nào đăng ký</td></tr>');
                $('#diemDanhStats, #diemDanhTableCard').show();
                this.updateCounters();
                return;
            }

            activeDks.forEach(function (dk, index) {
                var sv = MockDB.users.getById(dk.sinh_vien_user_id);
                var lsv = sv && sv.lop_sinh_vien_id ? MockDB.lop_sinh_vien.getById(sv.lop_sinh_vien_id) : null;
                var record = attMap[dk.id];

                var st = record ? record.trang_thai : 'co_mat'; // Default present
                var note = record ? (record.ghi_chu || '') : '';
                var timeStr = record ? App.formatDateTime(record.thoi_gian_diem_danh) : '<span class="text-muted">Chưa lưu</span>';

                var row =
                    '<tr data-dk-id="' + dk.id + '">' +
                    '  <td class="text-center">' + (index + 1) + '</td>' +
                    '  <td><strong>' + (sv ? App.escapeHtml(sv.ma_dinh_danh) : '—') + '</strong></td>' +
                    '  <td>' + (sv ? App.escapeHtml(sv.ho_ten) : '—') + '</td>' +
                    '  <td>' + (lsv ? App.escapeHtml(lsv.ma_lop) : '—') + '</td>' +
                    '  <td class="text-center">' +
                    '    <div class="attendance-toggle">' +
                    '      <button type="button" class="att-btn present ' + (st === 'co_mat' ? 'active' : '') + '">Có mặt</button>' +
                    '      <button type="button" class="att-btn late ' + (st === 'di_muon' ? 'active' : '') + '">Đi muộn</button>' +
                    '      <button type="button" class="att-btn absent ' + (st === 'vang_mat' ? 'active' : '') + '">Vắng mặt</button>' +
                    '    </div>' +
                    '  </td>' +
                    '  <td>' +
                    '    <input type="text" class="form-control form-control-sm att-note" value="' + App.escapeHtml(note) + '" placeholder="Ghi chú (lý do nếu vắng)">' +
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
            var late = $('#diemDanhTableBody .att-btn.late.active').length;
            var absent = $('#diemDanhTableBody .att-btn.absent.active').length;

            $('#statTotalSv').text(total);
            $('#statCoMat').text(present);
            $('#statDiMuon').text(late);
            $('#statVangMat').text(absent);
        },

        saveAttendance: function () {
            var self = this;
            var buoiHocId = this.currentBuoiHocId;
            if (!buoiHocId) return;

            var rows = $('#diemDanhTableBody tr[data-dk-id]');
            if (rows.length === 0) return;

            var nowStr = new Date().toISOString();

            rows.each(function () {
                var $r = $(this);
                var dkId = parseInt($r.data('dk-id'), 10);
                var status = 'co_mat';
                if ($r.find('.att-btn.late').hasClass('active')) status = 'di_muon';
                if ($r.find('.att-btn.absent').hasClass('active')) status = 'vang_mat';

                var note = $r.find('.att-note').val().trim();

                var existing = MockDB.diem_danh.getAll({ buoi_hoc_id: buoiHocId, dang_ky_id: dkId });
                if (existing.length > 0) {
                    MockDB.diem_danh.update(existing[0].id, {
                        trang_thai: status,
                        ghi_chu: note,
                        thoi_gian_diem_danh: nowStr
                    });
                } else {
                    MockDB.diem_danh.create({
                        buoi_hoc_id: buoiHocId,
                        dang_ky_id: dkId,
                        trang_thai: status,
                        ghi_chu: note,
                        thoi_gian_diem_danh: nowStr
                    });
                }
            });

            // Tự động tính toán lại điểm chuyên cần đồng bộ cho toàn bộ sinh viên lớp này
            self.recalculateChuyenCanForClass(self.currentLhpId);

            App.showToast('Lưu kết quả điểm danh thành công! Đã tự động cập nhật điểm chuyên cần', 'success');
            self.loadStudentAttendance();
        },

        // Đồng bộ điểm chuyên cần
        recalculateChuyenCanForClass: function (lhpId) {
            var lhp = MockDB.lop_hoc_phan.getById(lhpId);
            if (!lhp) return;
            var mh = MockDB.mon_hoc.getById(lhp.mon_hoc_id);
            var tongTietMon = mh ? (mh.so_tiet || mh.so_tin_chi * 15) : 45;

            var dks = MockDB.dang_ky_hoc_phan.getAll({ lop_hoc_phan_id: lhpId, trang_thai: 'Đã đăng ký' });

            dks.forEach(function (dk) {
                var allAtt = MockDB.diem_danh.getAll({ dang_ky_id: dk.id });
                var tongTietNghi = 0;

                allAtt.forEach(function (att) {
                    var buoi = MockDB.buoi_hoc.getById(att.buoi_hoc_id);
                    if (buoi) {
                        var soTietBuoi = (buoi.tiet_ket_thuc - buoi.tiet_bat_dau + 1);
                        if (att.trang_thai === 'vang_mat') {
                            tongTietNghi += soTietBuoi;
                        } else if (att.trang_thai === 'di_muon') {
                            // Đi muộn tính 50% số tiết nghỉ
                            tongTietNghi += (soTietBuoi * 0.5);
                        }
                    }
                });

                var diemCC = MockDB.tinhDiemChuyenCan(tongTietNghi, tongTietMon);

                var diemRec = MockDB.diem.getAll({ dang_ky_id: dk.id })[0];
                var currentUser = App.getCurrentUser();
                var editorId = currentUser ? currentUser.id : null;

                if (diemRec) {
                    var a = diemRec.diem_cuoi_ky;
                    var b = diemRec.diem_giua_ky;
                    var c = diemCC;
                    var tongKet = MockDB.tinhDiemTongKet(a, b, c);
                    var chu = MockDB.tinhDiemChu(tongKet);
                    var he4 = chu ? MockDB.tinhDiemHe4(chu) : null;
                    var kq = chu ? MockDB.tinhKetQua(chu) : null;

                    MockDB.diem.update(diemRec.id, {
                        diem_chuyen_can: diemCC,
                        diem_tong_ket: tongKet,
                        diem_he_10: tongKet,
                        diem_he_4: he4,
                        diem_chu: chu,
                        ket_qua: kq,
                        nguoi_sua_user_id: editorId,
                        updated_at: new Date().toISOString(),
                        ghi_chu_sua: 'Tự động tính từ điểm danh'
                    });
                } else {
                    MockDB.diem.create({
                        dang_ky_id: dk.id,
                        diem_chuyen_can: diemCC,
                        diem_giua_ky: null,
                        diem_cuoi_ky: null,
                        diem_tong_ket: null,
                        diem_he_10: null,
                        diem_he_4: null,
                        diem_chu: null,
                        ket_qua: null,
                        nguoi_sua_user_id: editorId,
                        updated_at: new Date().toISOString(),
                        ghi_chu_sua: 'Khởi tạo từ điểm danh'
                    });
                }
            });
        }
    };

    App.registerModule('diem-danh', DiemDanhModule);
})(jQuery);
