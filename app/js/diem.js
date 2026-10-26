/* ================================================================
   DIEM.JS - Quản lý nhập điểm cho Giảng viên
   Đầy đủ khối thông tin lớp (Giảng viên, Học kỳ, Sĩ số, Phòng học)
   Thêm / sửa / xóa điểm thành phần qua API
   Chuyên cần, tổng kết, quy đổi điểm chỉ do backend tính (RULE-14, 15, 17)
   ================================================================ */

(function ($) {
    'use strict';

    var QuanLyDiemModule = {
        currentLhpId: null,

        render: function () {
            var self = this;
            var currentUser = App.getCurrentUser();
            if (!currentUser || (currentUser.vai_tro !== 'giang_vien' && currentUser.vai_tro !== 'admin')) {
                $('#contentArea').html('<div class="alert alert-danger">Chức năng này chỉ dành cho Giảng viên và Quản trị viên</div>');
                return;
            }

            Api.get('/api/ketquahoctap/lop-giang-day')
                .done(function (res) { self.renderPage(res.data || []); })
                .fail(Api.toastError);
        },

        renderPage: function (myClasses) {
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
                return '<option value="' + l.id + '">' + App.escapeHtml(l.ma_lop_hoc_phan) + ' - ' + App.escapeHtml(l.ten_mon_hoc || '') + ' (HK' + l.hoc_ky + ' ' + App.escapeHtml(l.nam_hoc) + ')</option>';
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
                // Quy chế + công thức đầy đủ hiển thị ngay trên trang (RULE-14, 15, 17, 18)
                '    <div id="diemQuyChe" class="mt-2"></div>' +
                '    <p class="text-muted mt-2 mb-0" style="font-size:0.82rem;">Nhập điểm trực tiếp vào bảng rồi bấm "Lưu bảng điểm", hoặc dùng "Sửa" / "Xóa" ở từng sinh viên. Bấm "Cách tính" để xem từng bước tính điểm của sinh viên đó.</p>' +
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
                '<div class="stats-grid-modern mb-3" id="diemStatsGrid" style="display:none; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">' +
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
                '      <button class="btn btn-sm btn-outline" id="btnAutoCalculate"><i class="fa-solid fa-rotate"></i> Tính lại toàn bộ</button>' +
                '      <button class="btn btn-sm btn-primary" id="btnSaveAllDiem"><i class="fa-solid fa-floppy-disk"></i> Lưu bảng điểm</button>' +
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
                '            <th class="text-center">Thao tác</th>' +
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

            // Ô điểm đã sửa nhưng chưa lưu: đánh dấu để giảng viên biết cần lưu
            $(document).off('input', '.input-diem').on('input', '.input-diem', function () {
                $(this).closest('tr').find('.col-tk, .col-he4, .col-chu, .col-kq').html('<span class="text-muted" title="Lưu bảng điểm để hệ thống tính">…</span>');
            });

            // Backend tính lại chuyên cần theo điểm danh mới nhất mỗi lần tải
            $('#btnAutoCalculate').on('click', function () {
                self.loadClassGrades(function () {
                    App.showToast('Đã tải lại điểm chuyên cần và điểm tổng kết từ hệ thống!', 'info');
                });
            });

            $('#btnSaveAllDiem').on('click', function () {
                self.saveAllGrades();
            });

            $(document).off('click', '.btn-del-diem').on('click', '.btn-del-diem', function () {
                self.deleteGrade(parseInt($(this).data('dk-id'), 10));
            });

            $(document).off('click', '.btn-edit-diem').on('click', '.btn-edit-diem', function () {
                self.editGrade(parseInt($(this).data('dk-id'), 10));
            });

            // Giải thích từng bước ngay dưới dòng sinh viên
            $(document).off('click', '.btn-cach-tinh').on('click', '.btn-cach-tinh', function () {
                $('#cachTinh-' + $(this).data('dk-id')).toggle();
            });
        },

        loadClassGrades: function (callback) {
            var self = this;
            var lhpId = parseInt($('#selectDiemLHP').val(), 10);
            this.currentLhpId = lhpId;
            if (!lhpId) return;

            Api.get('/api/ketquahoctap/bang-diem', { lop_hoc_phan_id: lhpId })
                .done(function (res) {
                    self.renderGrades(res);
                    if (typeof callback === 'function') callback();
                })
                .fail(Api.toastError);
        },

        renderGrades: function (res) {
            var self = this;
            var lhp = res.lop_hoc_phan;
            var rows = res.data || [];
            var q = res.quy_tac;
            this.rows = rows;
            this.quyTac = q;
            if (q && !$('#diemQuyChe').children().length) $('#diemQuyChe').html(GiaiThichDiem.quyChe(q));
            var st = res.thong_ke || {};

            $('#infoMh').text(lhp.ten_mon_hoc + ' (' + lhp.ma_mon_hoc + ' - ' + lhp.so_tin_chi + ' TC)');
            $('#infoLhp').text(lhp.ma_lop_hoc_phan);
            $('#infoGv').text(lhp.ten_giang_vien || 'Chưa phân công');
            $('#infoHkNh').text('Học kỳ ' + lhp.hoc_ky + ' - Năm học ' + lhp.nam_hoc);
            $('#infoSiSo').text((lhp.si_so_hien_tai || 0) + ' / ' + lhp.si_so_toi_da + ' sinh viên');
            $('#infoPhong').text(lhp.phong_hoc || '—');
            $('#classInfoCard').show();

            $('#diemTableTitle').text('Bảng điểm: ' + lhp.ma_lop_hoc_phan + ' - ' + lhp.ten_mon_hoc);

            $('#statTotalSvDiem').text(st.tong || 0);
            $('#statTyLeDat').text((st.ty_le_dat || 0) + '%');
            $('#statDiemA').text(st.diem_a || 0);
            $('#statDiemF').text(st.diem_f || 0);

            var tbody = $('#diemTableBody');
            tbody.empty();

            if (rows.length === 0) {
                tbody.html('<tr><td colspan="13" class="text-center text-muted py-4">Chưa có sinh viên nào đăng ký lớp này</td></tr>');
                $('#diemStatsGrid, #diemTableCard').show();
                return;
            }

            rows.forEach(function (d, index) {
                var gk = (d.diem_giua_ky != null) ? d.diem_giua_ky : '';
                var ck = (d.diem_cuoi_ky != null) ? d.diem_cuoi_ky : '';
                var tk = (d.diem_tong_ket != null) ? Number(d.diem_tong_ket).toFixed(2) : '—';
                var he4 = (d.diem_he_4 != null) ? Number(d.diem_he_4).toFixed(1) : '—';
                var lastUpdate = d.updated_at ? App.formatDateTime(d.updated_at) : '<span class="text-muted">Chưa lưu</span>';
                var ccTitle = 'Nghỉ ' + d.tiet_nghi + '/' + d.tong_tiet_mon + ' tiết (' + d.ty_le_nghi + '%)';
                var hasScore = d.diem_giua_ky != null || d.diem_cuoi_ky != null;
                // RULE-15.13: cấm thi -> khóa ô nhập điểm, D = 0
                var lock = d.cam_thi ? ' disabled title="Bị cấm thi - không được nhập điểm"' : '';

                var row =
                    '<tr data-dk-id="' + d.dang_ky_id + '"' + (d.cam_thi ? ' data-cam-thi="1"' : '') + '>' +
                    '  <td class="text-center font-bold">' + (index + 1) + '</td>' +
                    '  <td><strong>' + App.escapeHtml(d.ma_dinh_danh) + '</strong></td>' +
                    '  <td>' + App.escapeHtml(d.ho_ten) + (d.cam_thi ? '<br><span class="badge badge-danger">Cấm thi</span>' : '') + '</td>' +
                    '  <td>' + (d.ma_lop ? App.escapeHtml(d.ma_lop) : '—') + '</td>' +
                    '  <td class="text-center">' +
                    '    <input type="number" class="form-control form-control-sm text-center input-cc" value="' + Number(d.diem_chuyen_can).toFixed(1) + '" readonly title="' + ccTitle + '">' +
                    '    <small class="text-muted d-block">' + ccTitle + '</small>' +
                    '  </td>' +
                    '  <td class="text-center">' +
                    '    <input type="number" step="0.1" class="form-control form-control-sm text-center input-diem input-gk" value="' + gk + '" placeholder="—"' + lock + '>' +
                    '  </td>' +
                    '  <td class="text-center">' +
                    '    <input type="number" step="0.1" class="form-control form-control-sm text-center input-diem input-ck" value="' + ck + '" placeholder="—"' + lock + '>' +
                    '  </td>' +
                    '  <td class="text-center font-bold col-tk" style="font-size:0.95rem; color:var(--primary);">' + tk + '</td>' +
                    '  <td class="text-center col-he4">' + he4 + '</td>' +
                    '  <td class="text-center col-chu">' + (d.diem_chu ? App.diemChuBadge(d.diem_chu) : '—') + '</td>' +
                    '  <td class="text-center col-kq">' + (d.ket_qua ? App.ketQuaBadge(d.ket_qua) : '—') + '</td>' +
                    '  <td class="text-center"><small>' + lastUpdate + '</small></td>' +
                    '  <td class="text-center"><div class="table-actions table-actions-stack justify-center">' +
                    '    <button class="btn btn-sm btn-outline-primary btn-cach-tinh" data-dk-id="' + d.dang_ky_id + '">Cách tính</button>' +
                    (d.cam_thi ? '' : '    <button class="btn btn-sm btn-outline btn-edit-diem" data-dk-id="' + d.dang_ky_id + '">Sửa</button>') +
                    (hasScore ? '    <button class="btn btn-sm btn-outline text-danger btn-del-diem" data-dk-id="' + d.dang_ky_id + '">Xóa</button>' : '') +
                    '  </div></td>' +
                    '</tr>' +
                    '<tr id="cachTinh-' + d.dang_ky_id + '" style="display:none; background:#f8fafc;"><td colspan="13">' +
                    (self.quyTac ? GiaiThichDiem.hocPhan(d, self.quyTac) : '') + '</td></tr>';
                tbody.append(row);
            });

            $('#diemStatsGrid, #diemTableCard').show();
        },

        saveAllGrades: function () {
            var self = this;
            var lhpId = this.currentLhpId;
            if (!lhpId) return;

            var items = [];
            $('#diemTableBody tr[data-dk-id]').each(function () {
                items.push({
                    dang_ky_id: parseInt($(this).data('dk-id'), 10),
                    diem_giua_ky: $(this).find('.input-gk').val(),
                    diem_cuoi_ky: $(this).find('.input-ck').val()
                });
            });

            // Kiểm tra thang điểm 0-10, tính chuyên cần & tổng kết do backend thực hiện
            Api.post('/api/ketquahoctap/bang-diem', { lop_hoc_phan_id: lhpId, items: items })
                .done(function (res) {
                    App.showToast(res.message, 'success');
                    self.loadClassGrades();
                })
                .fail(Api.toastError);
        },

        findRow: function (dkId) {
            return (this.rows || []).find(function (r) { return parseInt(r.dang_ky_id, 10) === dkId; });
        },

        /** Sửa điểm một sinh viên: thêm điểm còn thiếu (POST), sửa điểm đã có (PUT) - backend kiểm tra 0-10, cấm thi */
        editGrade: function (dkId) {
            var self = this;
            var d = this.findRow(dkId);
            if (!d) return;
            var v = function (x) { return x != null ? x : ''; };
            App.showModal(
                '<div class="modal-header"><h3>Sửa điểm: ' + App.escapeHtml(d.ma_dinh_danh + ' - ' + d.ho_ten) + '</h3>' +
                '<button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
                '<div class="modal-body">' +
                '  <p class="text-muted" style="font-size:0.82rem;">Chuyên cần C = ' + Number(d.diem_chuyen_can).toFixed(1) + ' (tự tính từ điểm danh, nghỉ ' + d.tiet_nghi + '/' + d.tong_tiet_mon + ' tiết = ' + d.ty_le_nghi + '%). Để trống ô = chưa có điểm.</p>' +
                '  <div class="form-row">' +
                '    <div class="form-group"><label>Điểm giữa kỳ B (0-10)</label><input type="number" step="0.1" class="form-control" id="edGk" value="' + v(d.diem_giua_ky) + '"></div>' +
                '    <div class="form-group"><label>Điểm cuối kỳ A (0-10)</label><input type="number" step="0.1" class="form-control" id="edCk" value="' + v(d.diem_cuoi_ky) + '"></div>' +
                '  </div>' +
                '</div>' +
                '<div class="modal-footer"><button class="btn btn-outline" onclick="App.closeModal()">Hủy</button>' +
                '<button class="btn btn-primary" id="btnLuuSuaDiem">Lưu điểm</button></div>', 'sm');

            $('#btnLuuSuaDiem').on('click', function () {
                var gk = $('#edGk').val(), ck = $('#edCk').val();
                var them = {}, sua = {}, xoa = [];
                [['diem_giua_ky', gk, 'giua_ky'], ['diem_cuoi_ky', ck, 'cuoi_ky']].forEach(function (x) {
                    var cu = d[x[0]];
                    if (x[1] === '') { if (cu != null) xoa.push(x[2]); return; }
                    if (cu == null) them[x[0]] = x[1]; else if (String(Number(cu)) !== String(Number(x[1]))) sua[x[0]] = x[1];
                });
                var calls = [];
                if (Object.keys(sua).length) calls.push(function () { return Api.put('/api/ketquahoctap/diem-thanh-phan', $.extend({ dang_ky_id: dkId }, sua)); });
                if (Object.keys(them).length) calls.push(function () { return Api.post('/api/ketquahoctap/diem-thanh-phan', $.extend({ dang_ky_id: dkId }, them)); });
                xoa.forEach(function (loai) { calls.push(function () { return Api.del('/api/ketquahoctap/diem-thanh-phan', { dang_ky_id: dkId, loai: loai }); }); });
                if (!calls.length) { App.closeModal(); return; }
                var run = function (i) {
                    if (i >= calls.length) { App.showToast('Đã cập nhật điểm sinh viên ' + d.ma_dinh_danh + '.', 'success'); App.closeModal(); self.loadClassGrades(); return; }
                    calls[i]().done(function () { run(i + 1); }).fail(function (xhr) { Api.toastError(xhr); self.loadClassGrades(); });
                };
                run(0);
            });
        },

        /** Xóa điểm: chọn xóa giữa kỳ, cuối kỳ hoặc toàn bộ (DELETE /api/ketquahoctap/diem-thanh-phan) */
        deleteGrade: function (dkId) {
            var self = this;
            var d = this.findRow(dkId);
            if (!d) return;
            var opt = function (loai, ten, co) { return co ? '<option value="' + loai + '">' + ten + '</option>' : ''; };
            App.showModal(
                '<div class="modal-header"><h3>Xóa điểm: ' + App.escapeHtml(d.ma_dinh_danh + ' - ' + d.ho_ten) + '</h3>' +
                '<button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
                '<div class="modal-body"><div class="form-group"><label>Chọn điểm cần xóa</label><select class="form-control" id="xoaLoai">' +
                opt('giua_ky', 'Điểm giữa kỳ (' + d.diem_giua_ky + ')', d.diem_giua_ky != null) +
                opt('cuoi_ky', 'Điểm cuối kỳ (' + d.diem_cuoi_ky + ')', d.diem_cuoi_ky != null) +
                '<option value="tat_ca">Toàn bộ điểm thành phần</option></select></div>' +
                '<p class="text-muted" style="font-size:0.82rem;">Sau khi xóa, điểm tổng kết được tính lại (thiếu điểm thì chưa có điểm tổng kết).</p></div>' +
                '<div class="modal-footer"><button class="btn btn-outline" onclick="App.closeModal()">Hủy</button>' +
                '<button class="btn btn-danger" id="btnXacNhanXoaDiem">Xóa điểm</button></div>', 'sm');
            $('#btnXacNhanXoaDiem').on('click', function () {
                Api.del('/api/ketquahoctap/diem-thanh-phan', { dang_ky_id: dkId, loai: $('#xoaLoai').val() })
                    .done(function (res) { App.showToast(res.message, 'success'); App.closeModal(); self.loadClassGrades(); })
                    .fail(Api.toastError);
            });
        }
    };

    App.registerModule('quan-ly-diem', QuanLyDiemModule);
})(jQuery);
