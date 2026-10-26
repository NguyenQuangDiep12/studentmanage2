/* ================================================================
   DIEM.JS - Quản lý nhập điểm cho Giảng viên
   Đầy đủ khối thông tin lớp (Giảng viên, Học kỳ, Sĩ số, Phòng học)
   Điểm tổng kết làm tròn 2 chữ số thập phân chuẩn xác, không lệch điểm chữ
   Lưu vết người sửa và lịch sử cập nhật
   ================================================================ */

(function ($) {
    'use strict';

    var QuanLyDiemModule = {
        currentLhpId: null,

        render: function () {
            var currentUser = App.getCurrentUser();
            if (!currentUser || (currentUser.vai_tro !== 'giang_vien' && currentUser.vai_tro !== 'admin')) {
                $('#contentArea').html('<div class="alert alert-danger">Chức năng này chỉ dành cho Giảng viên và Quản trị viên</div>');
                return;
            }

            var filterLHP = currentUser.vai_tro === 'admin' ? {} : { giang_vien_user_id: currentUser.id };
            var myClasses = MockDB.lop_hoc_phan.getAll(filterLHP);

            if (myClasses.length === 0) {
                $('#contentArea').html(
                    '<div class="card"><div class="card-body empty-state py-5 text-center">' +
                    '<h4>Không có lớp học phần nào</h4>' +
                    '<p class="text-gray">Bạn chưa được phân công giảng dạy lớp học phần nào để quản lý điểm</p>' +
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
                '    <h3>Quản lý bảng điểm học phần</h3>' +
                '  </div>' +
                '  <div class="card-body">' +
                '    <div class="form-row">' +
                '      <div class="form-group" style="flex:2;">' +
                '        <label>Chọn lớp học phần <span class="required">*</span></label>' +
                '        <select class="form-control" id="selectDiemLHP">' + lhpOptions + '</select>' +
                '      </div>' +
                '      <div class="form-group" style="flex:1; display:flex; align-items:flex-end;">' +
                '        <button class="btn btn-primary" id="btnReloadDiem" style="width:100%;">Tải bảng điểm</button>' +
                '      </div>' +
                '    </div>' +
                '    <div style="background:#f8fafc; border-left:3px solid var(--primary); padding:10px 14px; border-radius:4px; font-size:0.84rem; color:#334155; margin-top:6px;">' +
                '      <strong>Quy chế tính điểm tổng kết:</strong> ' +
                '      Điểm tổng kết = <strong>Cuối kỳ × 0.6 + Giữa kỳ × 0.3 + Chuyên cần × 0.1</strong><br>' +
                '      Điểm chuyên cần được hệ thống tự động đồng bộ từ kết quả điểm danh sinh viên' +
                '    </div>' +
                '  </div>' +
                '</div>' +

                '<!-- Khối thông tin chi tiết lớp học phần (Wireframe) -->' +
                '<div class="card mb-3" id="classInfoCard" style="display:none;">' +
                '  <div class="card-body">' +
                '    <div class="detail-grid">' +
                '      <div class="detail-item"><span class="detail-label">Môn học</span><span class="detail-value" id="infoMh">—</span></div>' +
                '      <div class="detail-item"><span class="detail-label">Mã lớp HP</span><span class="detail-value" id="infoLhp">—</span></div>' +
                '      <div class="detail-item"><span class="detail-label">Giảng viên phụ trách</span><span class="detail-value" id="infoGv">—</span></div>' +
                '      <div class="detail-item"><span class="detail-label">Học kỳ / Năm học</span><span class="detail-value" id="infoHkNh">—</span></div>' +
                '      <div class="detail-item"><span class="detail-label">Sĩ số sinh viên</span><span class="detail-value" id="infoSiSo">—</span></div>' +
                '      <div class="detail-item"><span class="detail-label">Phòng học</span><span class="detail-value" id="infoPhong">—</span></div>' +
                '    </div>' +
                '  </div>' +
                '</div>' +

                '<!-- Thống kê phổ điểm -->' +
                '<div class="stats-grid-modern mb-3" id="diemStatsGrid" style="display:none;">' +
                '  <div class="stat-modern-card"><div class="stat-label">Tổng sinh viên</div><div class="stat-number" id="statTotalSvDiem">0</div><div class="stat-desc">Đã đăng ký lớp</div></div>' +
                '  <div class="stat-modern-card"><div class="stat-label">Tỷ lệ đạt môn</div><div class="stat-number text-success" id="statTyLeDat">0%</div><div class="stat-desc">Điểm tổng kết ≥ 4.0</div></div>' +
                '  <div class="stat-modern-card"><div class="stat-label">Điểm giỏi (A)</div><div class="stat-number text-warning" id="statDiemA">0</div><div class="stat-desc">Từ 8.5 đến 10.0</div></div>' +
                '  <div class="stat-modern-card"><div class="stat-label">Không đạt (F)</div><div class="stat-number text-danger" id="statDiemF">0</div><div class="stat-desc">Cần học lại (dưới 4.0)</div></div>' +
                '</div>' +

                '<!-- Bảng nhập điểm -->' +
                '<div class="card" id="diemTableCard" style="display:none;">' +
                '  <div class="card-header">' +
                '    <h3 id="diemTableTitle">Bảng điểm sinh viên</h3>' +
                '    <div class="d-flex gap-2">' +
                '      <button class="btn btn-sm btn-outline" id="btnAutoCalculate">Tính lại toàn bộ</button>' +
                '      <button class="btn btn-sm btn-primary" id="btnSaveAllDiem">Lưu bảng điểm</button>' +
                '    </div>' +
                '  </div>' +
                '  <div class="card-body p-0">' +
                '    <div class="table-responsive">' +
                '      <table class="data-table">' +
                '        <thead>' +
                '          <tr>' +
                '            <th style="width:50px;">STT</th>' +
                '            <th>MSSV</th>' +
                '            <th>Họ và tên</th>' +
                '            <th>Lớp sinh hoạt</th>' +
                '            <th class="text-center" style="width:115px;">Chuyên cần (10%)</th>' +
                '            <th class="text-center" style="width:115px;">Giữa kỳ (30%)</th>' +
                '            <th class="text-center" style="width:115px;">Cuối kỳ (60%)</th>' +
                '            <th class="text-center">Tổng kết (Hệ 10)</th>' +
                '            <th class="text-center">Hệ 4</th>' +
                '            <th class="text-center">Điểm chữ</th>' +
                '            <th class="text-center">Kết quả</th>' +
                '            <th class="text-center">Cập nhật lần cuối</th>' +
                '          </tr>' +
                '        </thead>' +
                '        <tbody id="diemTableBody"></tbody>' +
                '      </table>' +
                '    </div>' +
                '  </div>' +
                '</div>';

            $('#contentArea').html(html);
            this.bindEvents();
            this.loadClassGrades();
        },

        bindEvents: function () {
            var self = this;

            $('#selectDiemLHP').on('change', function () {
                self.loadClassGrades();
            });

            $('#btnReloadDiem').on('click', function () {
                self.loadClassGrades();
            });

            $(document).off('input', '.input-diem').on('input', '.input-diem', function () {
                var $row = $(this).closest('tr');
                self.calculateRow($row);
                self.updateStats();
            });

            $('#btnAutoCalculate').on('click', function () {
                $('#diemTableBody tr[data-dk-id]').each(function () {
                    self.calculateRow($(this));
                });
                self.updateStats();
                App.showToast('Đã tính toán lại toàn bộ điểm tổng kết!', 'info');
            });

            $('#btnSaveAllDiem').on('click', function () {
                self.saveAllGrades();
            });
        },

        loadClassGrades: function () {
            var lhpId = parseInt($('#selectDiemLHP').val(), 10);
            this.currentLhpId = lhpId;
            if (!lhpId) return;

            var lhp = MockDB.lop_hoc_phan.getById(lhpId);
            var mh = lhp ? MockDB.mon_hoc.getById(lhp.mon_hoc_id) : null;
            var gv = lhp && lhp.giang_vien_user_id ? MockDB.users.getById(lhp.giang_vien_user_id) : null;

            // Cập nhật khối thông tin lớp học phần
            if (lhp) {
                $('#infoMh').text(mh ? (mh.ten_mon_hoc + ' (' + mh.ma_mon_hoc + ' - ' + mh.so_tin_chi + ' TC)') : '—');
                $('#infoLhp').text(lhp.ma_lop_hoc_phan);
                $('#infoGv').text(gv ? gv.ho_ten : 'Chưa phân công');
                $('#infoHkNh').text('Học kỳ ' + lhp.hoc_ky + ' - Năm học ' + lhp.nam_hoc);
                $('#infoSiSo').text(MockDB.getSiSoHienTai(lhp.id) + ' / ' + lhp.si_so_toi_da + ' sinh viên');
                $('#infoPhong').text(lhp.phong_hoc || '—');
                $('#classInfoCard').show();
            }

            $('#diemTableTitle').text('Bảng điểm: ' + (lhp ? lhp.ma_lop_hoc_phan : '') + ' - ' + (mh ? mh.ten_mon_hoc : ''));

            var dks = MockDB.dang_ky_hoc_phan.getAll({
                lop_hoc_phan_id: lhpId,
                trang_thai: 'Đã đăng ký'
            });

            var tbody = $('#diemTableBody');
            tbody.empty();

            if (dks.length === 0) {
                tbody.html('<tr><td colspan="12" class="text-center text-muted py-4">Chưa có sinh viên nào đăng ký lớp này</td></tr>');
                $('#diemStatsGrid, #diemTableCard').show();
                this.updateStats();
                return;
            }

            dks.forEach(function (dk, index) {
                var sv = MockDB.users.getById(dk.sinh_vien_user_id);
                var lsv = sv && sv.lop_sinh_vien_id ? MockDB.lop_sinh_vien.getById(sv.lop_sinh_vien_id) : null;
                var d = MockDB.diem.getAll({ dang_ky_id: dk.id })[0] || {};

                var cc = (d.diem_chuyen_can != null) ? Number(d.diem_chuyen_can).toFixed(1) : '10.0';
                var gk = (d.diem_giua_ky != null) ? d.diem_giua_ky : '';
                var ck = (d.diem_cuoi_ky != null) ? d.diem_cuoi_ky : '';

                // Hiển thị 2 chữ số thập phân chuẩn xác để không làm tròn lệch điểm chữ
                var tk = (d.diem_tong_ket != null) ? Number(d.diem_tong_ket).toFixed(2) : '—';
                var he4 = (d.diem_he_4 != null) ? Number(d.diem_he_4).toFixed(1) : '—';
                var chu = d.diem_chu || '—';
                var kq = d.ket_qua || '—';
                var lastUpdate = d.updated_at ? App.formatDateTime(d.updated_at) : '<span class="text-muted">Chưa lưu</span>';

                var row =
                    '<tr data-dk-id="' + dk.id + '">' +
                    '  <td class="text-center font-bold">' + (index + 1) + '</td>' +
                    '  <td><strong>' + (sv ? App.escapeHtml(sv.ma_dinh_danh) : '—') + '</strong></td>' +
                    '  <td>' + (sv ? App.escapeHtml(sv.ho_ten) : '—') + '</td>' +
                    '  <td>' + (lsv ? App.escapeHtml(lsv.ma_lop) : '—') + '</td>' +
                    '  <td class="text-center">' +
                    '    <input type="number" step="0.1" min="0" max="10" class="form-control form-control-sm text-center input-cc" value="' + cc + '" readonly title="Tự động tính từ điểm danh">' +
                    '  </td>' +
                    '  <td class="text-center">' +
                    '    <input type="number" step="0.1" min="0" max="10" class="form-control form-control-sm text-center input-diem input-gk" value="' + gk + '" placeholder="0.0">' +
                    '  </td>' +
                    '  <td class="text-center">' +
                    '    <input type="number" step="0.1" min="0" max="10" class="form-control form-control-sm text-center input-diem input-ck" value="' + ck + '" placeholder="0.0">' +
                    '  </td>' +
                    '  <td class="text-center font-bold col-tk" style="font-size:0.95rem; color:var(--primary);">' + tk + '</td>' +
                    '  <td class="text-center col-he4">' + he4 + '</td>' +
                    '  <td class="text-center col-chu">' + (chu !== '—' ? App.diemChuBadge(chu) : '—') + '</td>' +
                    '  <td class="text-center col-kq">' + (kq !== '—' ? App.ketQuaBadge(kq) : '—') + '</td>' +
                    '  <td class="text-center"><small>' + lastUpdate + '</small></td>' +
                    '</tr>';
                tbody.append(row);
            });

            $('#diemStatsGrid, #diemTableCard').show();
            this.updateStats();
        },

        calculateRow: function ($row) {
            var ccVal = parseFloat($row.find('.input-cc').val());
            var gkVal = parseFloat($row.find('.input-gk').val());
            var ckVal = parseFloat($row.find('.input-ck').val());

            var $colTk = $row.find('.col-tk');
            var $colHe4 = $row.find('.col-he4');
            var $colChu = $row.find('.col-chu');
            var $colKq = $row.find('.col-kq');

            if (isNaN(ccVal) || isNaN(gkVal) || isNaN(ckVal)) {
                $colTk.text('—');
                $colHe4.text('—');
                $colChu.text('—');
                $colKq.text('—');
                return;
            }

            // Điểm tổng kết lưu 2 chữ số thập phân
            var tk = MockDB.tinhDiemTongKet(ckVal, gkVal, ccVal);
            var chu = MockDB.tinhDiemChu(tk);
            var he4 = MockDB.tinhDiemHe4(chu);
            var kq = MockDB.tinhKetQua(chu);

            $colTk.text(tk.toFixed(2));
            $colHe4.text(he4.toFixed(1));
            $colChu.html(App.diemChuBadge(chu));
            $colKq.html(App.ketQuaBadge(kq));
        },

        updateStats: function () {
            var total = $('#diemTableBody tr[data-dk-id]').length;
            if (total === 0) {
                $('#statTotalSvDiem').text(0);
                $('#statTyLeDat').text('0%');
                $('#statDiemA').text(0);
                $('#statDiemF').text(0);
                return;
            }

            var countDat = 0;
            var countA = 0;
            var countF = 0;
            var totalHasScore = 0;

            $('#diemTableBody tr[data-dk-id]').each(function () {
                var chuText = $(this).find('.col-chu').text().trim();
                var kqText = $(this).find('.col-kq').text().trim();

                if (kqText === 'Đạt') countDat++;
                if (chuText === 'A') countA++;
                if (chuText === 'F') countF++;
                if (chuText !== '—') totalHasScore++;
            });

            var rate = totalHasScore > 0 ? Math.round((countDat / totalHasScore) * 100) : 0;

            $('#statTotalSvDiem').text(total);
            $('#statTyLeDat').text(rate + '%');
            $('#statDiemA').text(countA);
            $('#statDiemF').text(countF);
        },

        saveAllGrades: function () {
            var currentUser = App.getCurrentUser();
            var lhpId = this.currentLhpId;
            if (!lhpId) return;

            var rows = $('#diemTableBody tr[data-dk-id]');
            var nowStr = new Date().toISOString();
            var savedCount = 0;

            rows.each(function () {
                var dkId = parseInt($(this).data('dk-id'), 10);
                var cc = parseFloat($(this).find('.input-cc').val());
                var gk = parseFloat($(this).find('.input-gk').val());
                var ck = parseFloat($(this).find('.input-ck').val());

                if (!isNaN(gk) && !isNaN(ck) && !isNaN(cc)) {
                    var tk = MockDB.tinhDiemTongKet(ck, gk, cc);
                    var chu = MockDB.tinhDiemChu(tk);
                    var he4 = MockDB.tinhDiemHe4(chu);
                    var kq = MockDB.tinhKetQua(chu);

                    var existing = MockDB.diem.getAll({ dang_ky_id: dkId })[0];
                    if (existing) {
                        MockDB.diem.update(existing.id, {
                            diem_chuyen_can: cc,
                            diem_giua_ky: gk,
                            diem_cuoi_ky: ck,
                            diem_tong_ket: tk,
                            diem_he_10: tk,
                            diem_he_4: he4,
                            diem_chu: chu,
                            ket_qua: kq,
                            nguoi_sua_user_id: currentUser.id,
                            updated_at: nowStr,
                            ghi_chu_sua: 'Cập nhật bảng điểm học phần'
                        });
                    } else {
                        MockDB.diem.create({
                            dang_ky_id: dkId,
                            diem_chuyen_can: cc,
                            diem_giua_ky: gk,
                            diem_cuoi_ky: ck,
                            diem_tong_ket: tk,
                            diem_he_10: tk,
                            diem_he_4: he4,
                            diem_chu: chu,
                            ket_qua: kq,
                            nguoi_sua_user_id: currentUser.id,
                            updated_at: nowStr,
                            ghi_chu_sua: 'Khởi tạo bảng điểm học phần'
                        });
                    }
                    savedCount++;
                }
            });

            App.showToast('Đã lưu thành công bảng điểm cho ' + savedCount + ' sinh viên!', 'success');
            this.loadClassGrades();
        }
    };

    App.registerModule('quan-ly-diem', QuanLyDiemModule);
})(jQuery);
