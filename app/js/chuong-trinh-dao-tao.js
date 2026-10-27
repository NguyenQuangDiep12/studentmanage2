/* ================================================================
   CHUONG-TRINH-DAO-TAO.JS - Xem khung chương trình đào tạo
   - Nhóm môn theo Học kỳ - Năm học, kèm tổng tín chỉ từng học kỳ
   - Nhóm tự chọn hiển thị trong cùng bảng (RULE-02 → RULE-07)
   - Sinh viên: cột "Đã học" theo kết quả đạt
   - Quản trị viên: thêm / đổi học kỳ / gỡ môn trong khung và nhóm tự chọn
   - In và Xuất Excel (thư viện SheetJS tải từ CDN khi cần)
   ================================================================ */

var ChuongTrinhDaoTaoModule = (function ($) {
    'use strict';

    var XLSX_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

    var Module = {
        selectedId: null,   // Trang Cơ cấu đào tạo đặt sẵn CTĐT cần xem
        data: null,
        monHoc: [],

        render: function () {
            var self = this;
            var user = App.getCurrentUser();
            this.isAdmin = user && user.vai_tro === 'admin';
            this.isSv = user && user.vai_tro === 'sinh_vien';

            var html =
                '<div class="card ctdt-card">' +
                '  <div class="card-header">' +
                '    <h3><i class="fa-solid fa-gear" style="color:var(--primary);"></i> CHƯƠNG TRÌNH ĐÀO TẠO</h3>' +
                '  </div>' +
                '  <div class="card-body">' +
                '    <div class="toolbar">' +
                '      <div class="toolbar-left">' +
                '        <select id="ctdtSelect" class="filter-select" style="min-width:340px;"></select>' +
                '      </div>' +
                '      <div class="toolbar-right">' +
                (this.isAdmin ? '        <button class="btn btn-sm btn-primary" id="btnCtdtThemMon"><i class="fa-solid fa-plus"></i> Thêm môn vào khung</button>' : '') +
                '        <button class="btn btn-sm btn-outline-primary" id="btnCtdtPrint"><i class="fa-solid fa-print"></i> In</button>' +
                '        <button class="btn btn-sm btn-outline-primary" id="btnCtdtExcel"><i class="fa-solid fa-file-excel"></i> Xuất Excel</button>' +
                '      </div>' +
                '    </div>' +
                '    <div id="ctdtSummary" class="detail-grid mb-3" style="display:none;"></div>' +
                '    <div class="table-responsive">' +
                '      <table class="data-table ctdt-table">' +
                '        <thead><tr>' +
                '          <th class="text-center" style="width:60px;">Stt</th>' +
                '          <th>Mã MH</th>' +
                '          <th>Tên môn học</th>' +
                '          <th class="text-center">Số tín chỉ</th>' +
                '          <th class="text-center">Môn bắt buộc</th>' +
                (this.isSv ? '          <th class="text-center">Đã học</th>' : '') +
                '          <th class="text-center">Tổng tiết</th>' +
                '          <th class="text-center">Lý thuyết</th>' +
                '          <th class="text-center">Thực hành</th>' +
                '          <th class="text-center">Tiết thành phần</th>' +
                (this.isAdmin ? '          <th class="text-center">Thao tác</th>' : '') +
                '        </tr></thead>' +
                '        <tbody id="ctdtBody"><tr><td colspan="11" class="text-center text-muted py-4">Đang tải...</td></tr></tbody>' +
                '      </table>' +
                '    </div>' +
                '  </div>' +
                '</div>';

            $('#contentArea').html(html);
            this.bindEvents();

            Api.get('/api/cocaudaotao/ds-ctdt')
                .done(function (res) {
                    var list = res.data || [];
                    var sel = $('#ctdtSelect');
                    list.forEach(function (c) {
                        sel.append('<option value="' + c.id + '">' + App.escapeHtml(c.ma_chuong_trinh + ' - ' + c.ten_chuong_trinh) + '</option>');
                    });
                    if (list.length === 0) {
                        $('#ctdtBody').html('<tr><td colspan="11" class="text-center text-muted py-4">Chưa có chương trình đào tạo nào</td></tr>');
                        return;
                    }
                    var id = self.selectedId || res.mac_dinh || list[0].id;
                    self.selectedId = null;
                    sel.val(id);
                    self.load();
                })
                .fail(Api.toastError);

            if (this.isAdmin) {
                Api.get('/api/monhoc').done(function (res) { self.monHoc = res.data || []; });
            }
        },

        bindEvents: function () {
            var self = this;
            $('#ctdtSelect').on('change', function () { self.load(); });
            $('#btnCtdtPrint').on('click', function () { window.print(); });
            $('#btnCtdtExcel').on('click', function () { self.exportExcel(); });
            $('#btnCtdtThemMon').on('click', function () { self.showMonModal(null); });

            $(document).off('click.ctdt')
                .on('click.ctdt', '.btn-ctdt-sua-mon', function () {
                    self.showMonModal($(this).data('id'));
                })
                .on('click.ctdt', '.btn-ctdt-go-mon', function () {
                    var id = $(this).data('id');
                    App.confirm('Gỡ môn <strong>' + App.escapeHtml($(this).data('name')) + '</strong> khỏi khung chương trình?', function () {
                        Api.del('/api/cocaudaotao/ctdt/mon', { id: id })
                            .done(function (res) { App.showToast(res.message, 'success'); self.load(); })
                            .fail(Api.toastError);
                    });
                })
                .on('click.ctdt', '.btn-ctdt-tiet', function () {
                    self.showTietThanhPhan(self.monMap[$(this).data('mon')]);
                })
                .on('click.ctdt', '.btn-ctdt-them-mon-nhom', function () {
                    self.showNhomMonModal($(this).data('id'), $(this).data('name'));
                })
                .on('click.ctdt', '.btn-ctdt-go-mon-nhom', function () {
                    var id = $(this).data('id');
                    App.confirm('Gỡ môn <strong>' + App.escapeHtml($(this).data('name')) + '</strong> khỏi nhóm tự chọn?', function () {
                        Api.del('/api/cocaudaotao/nhom-tu-chon/mon', { id: id })
                            .done(function (res) { App.showToast(res.message, 'success'); self.load(); })
                            .fail(Api.toastError);
                    });
                });
        },

        load: function () {
            var self = this;
            Api.get('/api/cocaudaotao/khung-chuong-trinh', { chuong_trinh_id: $('#ctdtSelect').val() })
                .done(function (res) {
                    self.data = res.data;
                    self.draw();
                })
                .fail(Api.toastError);
        },

        colCount: function () {
            return 6 + (this.isSv ? 1 : 0) + (this.isAdmin ? 1 : 0) - 1;
        },

        draw: function () {
            var self = this;
            var d = this.data;
            var ct = d.chuong_trinh;
            var showDaHoc = this.isSv && d.xem_ket_qua;

            $('#ctdtSummary').show().html(
                '<div class="detail-item"><span class="detail-label">Chương trình</span><span class="detail-value">' + App.escapeHtml(ct.ma_chuong_trinh + ' - ' + ct.ten_chuong_trinh) + '</span></div>' +
                '<div class="detail-item"><span class="detail-label">Chuyên ngành / Khoa</span><span class="detail-value">' + App.escapeHtml((ct.ten_chuyen_nganh || '—') + ' / ' + (ct.ten_khoa || '—')) + '</span></div>' +
                '<div class="detail-item"><span class="detail-label">Thời gian đào tạo</span><span class="detail-value">' + App.escapeHtml(ct.thoi_gian_dao_tao || '—') + '</span></div>' +
                '<div class="detail-item"><span class="detail-label">Tín chỉ bắt buộc + tự chọn tối thiểu</span><span class="detail-value">' + d.tong_tin_chi_bat_buoc + ' + ' + d.tong_tin_chi_tu_chon_toi_thieu + ' = ' + d.tong_tin_chi_toan_khoa + ' TC</span></div>'
            );

            var cols = 9 + (this.isSv ? 1 : 0) + (this.isAdmin ? 1 : 0);
            this.monMap = {};
            var tbody = $('#ctdtBody').empty();

            var row = function (m, stt, idTarget, isNhom) {
                self.monMap[m.mon_hoc_id] = m;
                var daHoc = showDaHoc ? (m.da_hoc ? 'x' : (m.dang_hoc ? '<small class="text-muted">Đang học</small>' : '')) : '';
                var actions = '';
                if (self.isAdmin) {
                    actions = isNhom
                        ? '<button class="btn btn-sm btn-outline text-danger btn-ctdt-go-mon-nhom" data-id="' + m.id + '" data-name="' + App.escapeHtml(m.ten_mon_hoc) + '">Gỡ</button>'
                        : '<div class="table-actions justify-center">' +
                          '<button class="btn btn-sm btn-outline btn-ctdt-sua-mon" data-id="' + m.id + '">Sửa</button>' +
                          '<button class="btn btn-sm btn-outline text-danger btn-ctdt-go-mon" data-id="' + m.id + '" data-name="' + App.escapeHtml(m.ten_mon_hoc) + '">Gỡ</button></div>';
                }
                return '<tr>' +
                    '<td class="text-center">' + stt + '</td>' +
                    '<td>' + App.escapeHtml(m.ma_mon_hoc) + '</td>' +
                    '<td>' + App.escapeHtml(m.ten_mon_hoc) + '</td>' +
                    '<td class="text-center ctdt-num">' + m.so_tin_chi + '</td>' +
                    '<td class="text-center ctdt-mark">' + (m.bat_buoc ? 'x' : '') + '</td>' +
                    (self.isSv ? '<td class="text-center ctdt-mark">' + daHoc + '</td>' : '') +
                    '<td class="text-center">' + (m.so_tiet || '—') + '</td>' +
                    (m.so_tiet_ly_thuyet == null || m.so_tiet_thuc_hanh == null
                        ? '<td class="text-center" colspan="2"><small class="text-muted">Chưa khai báo</small></td>'
                        : '<td class="text-center">' + m.so_tiet_ly_thuyet + '</td><td class="text-center">' + m.so_tiet_thuc_hanh + '</td>') +
                    '<td class="text-center"><button type="button" class="btn btn-sm btn-outline-primary btn-ctdt-tiet" data-mon="' + m.mon_hoc_id + '" title="Xem phân bổ tiết lý thuyết / thực hành">Xem</button></td>' +
                    (self.isAdmin ? '<td class="text-center">' + actions + '</td>' : '') +
                    '</tr>';
            };

            var groupRow = function (title, tc, extra) {
                return '<tr class="ctdt-group-row">' +
                    '<td colspan="3">' + title + '</td>' +
                    '<td class="text-center ctdt-group-tc">' + tc + '</td>' +
                    '<td colspan="' + (cols - 4) + '" class="text-right">' + (extra || '') + '</td>' +
                    '</tr>';
            };

            if (d.hoc_ky.length === 0 && d.nhom_tu_chon.length === 0) {
                tbody.html('<tr><td colspan="' + cols + '" class="text-center text-muted py-4">Khung chương trình chưa có môn học nào</td></tr>');
                return;
            }

            d.hoc_ky.forEach(function (hk) {
                tbody.append(groupRow(App.escapeHtml(hk.tieu_de), hk.tong_tin_chi));
                hk.mon_hoc.forEach(function (m, i) { tbody.append(row(m, i + 1)); });
            });

            d.nhom_tu_chon.forEach(function (n) {
                var title = 'Mã: ' + App.escapeHtml(n.ma_nhom) + ' - ' + App.escapeHtml(n.ten_nhom) +
                    ' - (' + App.escapeHtml(ct.ten_chuyen_nganh || ct.ten_chuong_trinh) + ')';
                var extra = '<span class="ctdt-group-note">Tối thiểu ' + n.so_tin_chi_toi_thieu + ' TC' +
                    (showDaHoc ? ' · Đã đạt ' + n.tin_chi_da_dat + ' TC' : '') + '</span>' +
                    (self.isAdmin ? ' <button class="btn btn-sm btn-outline-primary btn-ctdt-them-mon-nhom" data-id="' + n.id + '" data-name="' + App.escapeHtml(n.ma_nhom) + '">Thêm môn vào nhóm</button>' : '');
                tbody.append(groupRow(title, '', extra));
                if (n.mon_hoc.length === 0) {
                    tbody.append('<tr><td colspan="' + cols + '" class="text-center text-muted">Nhóm chưa có môn học</td></tr>');
                }
                n.mon_hoc.forEach(function (m, i) { tbody.append(row(m, i + 1, null, true)); });
            });
        },

        /** Chi tiết phân bổ tiết lý thuyết / thực hành của một môn (không suy đoán khi chưa khai báo) */
        showTietThanhPhan: function (m) {
            if (!m) return;
            var declared = m.so_tiet_ly_thuyet != null && m.so_tiet_thuc_hanh != null;
            var body = declared
                ? '<table class="data-table"><thead><tr><th>Thành phần</th><th class="text-center">Số tiết</th></tr></thead><tbody>' +
                  '<tr><td>Lý thuyết' + (m.so_tin_chi_ly_thuyet != null ? ' (' + m.so_tin_chi_ly_thuyet + ' TC)' : '') + '</td><td class="text-center">' + m.so_tiet_ly_thuyet + '</td></tr>' +
                  '<tr><td>Thực hành' + (m.so_tin_chi_thuc_hanh != null ? ' (' + m.so_tin_chi_thuc_hanh + ' TC)' : '') + '</td><td class="text-center">' + m.so_tiet_thuc_hanh + '</td></tr>' +
                  '<tr><td><strong>Tổng số tiết</strong></td><td class="text-center"><strong>' + m.so_tiet + '</strong></td></tr>' +
                  '</tbody></table>'
                : '<div class="alert alert-info">Môn học chưa khai báo số tiết lý thuyết / thực hành. Tổng số tiết hiện có: <strong>' +
                  (m.so_tiet || '—') + '</strong>. Quản trị viên khai báo số tín chỉ lý thuyết / thực hành tại trang Môn học (RULE-CREDIT-11).</div>';
            App.showModal(
                '<div class="modal-header"><h3>Tiết thành phần: ' + App.escapeHtml(m.ma_mon_hoc + ' - ' + m.ten_mon_hoc) + '</h3>' +
                '<button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
                '<div class="modal-body">' + body +
                '<p class="text-muted mt-2" style="font-size:0.8rem;">Số tín chỉ: ' + m.so_tin_chi + ' TC. Số tiết được hệ thống quy đổi từ số tín chỉ lý thuyết / thực hành (RULE-CREDIT-08), không tính giờ tự học.</p></div>' +
                '<div class="modal-footer"><button class="btn btn-primary" onclick="App.closeModal()">Đóng</button></div>', 'sm');
        },

        monOptions: function () {
            return this.monHoc.map(function (m) {
                return '<option value="' + m.id + '">' + App.escapeHtml(m.ma_mon_hoc + ' - ' + m.ten_mon_hoc + ' (' + m.so_tin_chi + ' TC)') + '</option>';
            }).join('');
        },

        findKhungRow: function (id) {
            var found = null;
            (this.data ? this.data.hoc_ky : []).forEach(function (hk) {
                hk.mon_hoc.forEach(function (m) { if (m.id === parseInt(id, 10)) found = m; });
            });
            return found;
        },

        /** Thêm môn bắt buộc vào khung (id = null) hoặc đổi học kỳ / năm của môn */
        showMonModal: function (id) {
            var self = this;
            var m = id ? this.findKhungRow(id) : null;
            var soNam = parseInt(this.data && this.data.chuong_trinh.thoi_gian_dao_tao, 10) || 4;
            var namOpts = '';
            for (var y = 1; y <= soNam; y++) {
                namOpts += '<option value="' + y + '"' + (m && m.nam_hoc === y ? ' selected' : '') + '>Năm thứ ' + y + '</option>';
            }

            var html =
                '<div class="modal-header"><h3>' + (m ? 'Đổi học kỳ: ' + App.escapeHtml(m.ma_mon_hoc) : 'Thêm môn vào khung chương trình') + '</h3>' +
                '<button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
                '<div class="modal-body">' +
                (m ? '' : '<div class="form-group"><label>Môn học <span class="required">*</span></label><select class="form-control" id="ctdtMonId">' + this.monOptions() + '</select></div>') +
                '<div class="form-row">' +
                '  <div class="form-group"><label>Học kỳ <span class="required">*</span></label><select class="form-control" id="ctdtHocKy">' +
                [1, 2, 3].map(function (h) { return '<option value="' + h + '"' + (m && m.hoc_ky === h ? ' selected' : '') + '>' + (h === 3 ? 'Học kỳ hè' : 'Học kỳ ' + h) + '</option>'; }).join('') +
                '  </select></div>' +
                '  <div class="form-group"><label>Năm học <span class="required">*</span></label><select class="form-control" id="ctdtNam">' + namOpts + '</select></div>' +
                '</div>' +
                '<small class="text-muted">Môn trong khung là môn bắt buộc (RULE-01). Một môn không thể vừa bắt buộc vừa thuộc nhóm tự chọn của cùng chương trình.</small>' +
                '</div>' +
                '<div class="modal-footer"><button class="btn btn-outline" onclick="App.closeModal()">Hủy</button>' +
                '<button class="btn btn-primary" id="btnCtdtLuuMon">Lưu</button></div>';
            App.showModal(html);

            $('#btnCtdtLuuMon').on('click', function () {
                var body = { hoc_ky: $('#ctdtHocKy').val(), nam_hoc: $('#ctdtNam').val() };
                var req = m
                    ? Api.put('/api/cocaudaotao/ctdt/mon', $.extend({ id: m.id }, body))
                    : Api.post('/api/cocaudaotao/ctdt/mon', $.extend({ chuong_trinh_id: $('#ctdtSelect').val(), mon_hoc_id: $('#ctdtMonId').val() }, body));
                req.done(function (res) { App.showToast(res.message, 'success'); App.closeModal(); self.load(); })
                   .fail(Api.toastError);
            });
        },

        showNhomMonModal: function (nhomId, maNhom) {
            var self = this;
            var html =
                '<div class="modal-header"><h3>Thêm môn vào nhóm ' + App.escapeHtml(maNhom) + '</h3>' +
                '<button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
                '<div class="modal-body"><div class="form-group"><label>Môn học <span class="required">*</span></label>' +
                '<select class="form-control" id="ctdtNhomMonId">' + this.monOptions() + '</select></div></div>' +
                '<div class="modal-footer"><button class="btn btn-outline" onclick="App.closeModal()">Hủy</button>' +
                '<button class="btn btn-primary" id="btnCtdtLuuMonNhom">Thêm vào nhóm</button></div>';
            App.showModal(html);

            $('#btnCtdtLuuMonNhom').on('click', function () {
                Api.post('/api/cocaudaotao/nhom-tu-chon/mon', { nhom_tu_chon_id: nhomId, mon_hoc_id: $('#ctdtNhomMonId').val() })
                    .done(function (res) { App.showToast(res.message, 'success'); App.closeModal(); self.load(); })
                    .fail(Api.toastError);
            });
        },

        exportExcel: function () {
            var self = this;
            if (!this.data) return;

            var run = function () {
                var d = self.data;
                var ct = d.chuong_trinh;
                var showDaHoc = self.isSv && d.xem_ket_qua;
                var header = ['Stt', 'Mã MH', 'Tên môn học', 'Số tín chỉ', 'Môn bắt buộc'];
                if (showDaHoc) header.push('Đã học');
                header.push('Tổng tiết', 'Lý thuyết', 'Thực hành');

                var rows = [['CHƯƠNG TRÌNH ĐÀO TẠO: ' + ct.ma_chuong_trinh + ' - ' + ct.ten_chuong_trinh], [], header];
                var add = function (m, i) {
                    var r = [i + 1, m.ma_mon_hoc, m.ten_mon_hoc, m.so_tin_chi, m.bat_buoc ? 'x' : ''];
                    if (showDaHoc) r.push(m.da_hoc ? 'x' : '');
                    r.push(m.so_tiet || '');
                    var declared = m.so_tiet_ly_thuyet != null && m.so_tiet_thuc_hanh != null;
                    r.push(declared ? m.so_tiet_ly_thuyet : 'Chưa khai báo', declared ? m.so_tiet_thuc_hanh : '');
                    rows.push(r);
                };
                d.hoc_ky.forEach(function (hk) {
                    rows.push([hk.tieu_de, '', '', hk.tong_tin_chi]);
                    hk.mon_hoc.forEach(add);
                });
                d.nhom_tu_chon.forEach(function (n) {
                    rows.push(['Mã: ' + n.ma_nhom + ' - ' + n.ten_nhom + ' - (' + (ct.ten_chuyen_nganh || '') + ') - Tối thiểu ' + n.so_tin_chi_toi_thieu + ' TC']);
                    n.mon_hoc.forEach(add);
                });
                rows.push([], ['Tổng tín chỉ bắt buộc', '', '', d.tong_tin_chi_bat_buoc], ['Tín chỉ tự chọn tối thiểu', '', '', d.tong_tin_chi_tu_chon_toi_thieu]);

                var ws = XLSX.utils.aoa_to_sheet(rows);
                ws['!cols'] = [{ wch: 6 }, { wch: 12 }, { wch: 45 }, { wch: 10 }, { wch: 13 }, { wch: 10 }, { wch: 10 }];
                var wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'CTDT');
                XLSX.writeFile(wb, 'ChuongTrinhDaoTao_' + ct.ma_chuong_trinh + '.xlsx');
            };

            if (window.XLSX) {
                run();
            } else {
                $.ajax({ url: XLSX_CDN, dataType: 'script', cache: true })
                    .done(run)
                    .fail(function () { App.showToast('Không tải được thư viện xuất Excel (kiểm tra kết nối mạng).', 'error'); });
            }
        }
    };

    App.registerModule('chuong-trinh-dao-tao', Module);
    return Module;
})(jQuery);
