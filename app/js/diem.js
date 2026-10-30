/* ================================================================
   DIEM.JS - Nhập điểm (Giảng viên / Quản trị viên)
   Bố cục theo mã nguồn cũ StudentManagement (GradeForm + Bảng điểm sinh viên):
   trái: form "Nhập điểm sinh viên"; phải: "Bảng điểm sinh viên" có tìm kiếm, nhóm theo học kỳ.
   Chuyên cần, tổng kết, quy đổi điểm chỉ do backend tính (RULE-14, 15, 17)
   ================================================================ */

(function ($) {
    'use strict';

    var FIELDS = ['Mã SV', 'Sinh viên', 'Mã môn', 'Môn học', 'Học kỳ'];

    function normalize(v) {
        return String(v == null ? '' : v).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
    }
    function hocKyText(hk, nam) {
        var y = String(nam || '').split('-')[0];
        return (String(hk) === '3' ? 'Hè' : 'HK' + hk) + (y ? ' ' + y : '');
    }
    function num(v, so) { return v != null && v !== '' ? (so != null ? Number(v).toFixed(so) : String(Number(v))) : '—'; }
    var esc = function (s) { return App.escapeHtml(s == null ? '' : String(s)); };

    var QuanLyDiemModule = {
        classes: [],
        rows: [],
        editing: null,
        search: { query: '', field: 'all' },

        render: function () {
            var self = this;
            var currentUser = App.getCurrentUser();
            if (!currentUser || (currentUser.vai_tro !== 'giang_vien' && currentUser.vai_tro !== 'admin')) {
                $('#contentArea').html('<div class="alert alert-danger">Chức năng này chỉ dành cho Giảng viên và Quản trị viên</div>');
                return;
            }
            this.editing = null;
            this.search = { query: '', field: 'all' };
            this.renderLayout();
            this.loadAll();
        },

        renderLayout: function () {
            var chips = '<button type="button" class="nd-chip active" data-field="all">Tất cả</button>' +
                FIELDS.map(function (f, i) { return '<button type="button" class="nd-chip" data-field="' + i + '">' + f + '</button>'; }).join('');
            var html =
                '<section class="nd-page">' +
                '  <div class="nd-card">' +
                '    <div class="nd-card-header"><h3 id="ndFormTitle">Nhập điểm sinh viên</h3>' +
                '      <p>Chọn sinh viên, môn học và nhập điểm giữa kỳ - cuối kỳ.</p></div>' +
                '    <form class="nd-grid-form" id="ndForm" autocomplete="off">' +
                '      <select id="ndSv"><option value="">Chọn sinh viên</option></select>' +
                '      <select id="ndMon"><option value="">Chọn môn học</option></select>' +
                '      <input id="ndHocKy" placeholder="Học kỳ" readonly>' +
                '      <input id="ndGk" type="number" step="0.1" min="0" max="10" placeholder="Điểm giữa kỳ">' +
                '      <input id="ndCk" type="number" step="0.1" min="0" max="10" placeholder="Điểm cuối kỳ">' +
                '      <div class="nd-form-actions">' +
                '        <button class="nd-btn nd-btn-primary" type="submit" id="ndSubmit">Nhập điểm</button>' +
                '        <button class="nd-btn nd-btn-light" type="button" id="ndCancel" style="display:none;">Hủy sửa</button>' +
                '      </div>' +
                '    </form>' +
                '  </div>' +
                '  <div class="nd-card">' +
                '    <div class="nd-card-header"><h3>Bảng điểm sinh viên</h3>' +
                '      <p>Tìm kiếm theo sinh viên, môn học hoặc học kỳ.</p></div>' +
                '    <form class="nd-search" id="ndSearch">' +
                '      <span class="nd-search-help">Chọn tiêu chí, nhập từ khóa rồi bấm <strong>Lọc</strong>.</span>' +
                '      <div class="nd-chips">' + chips + '</div>' +
                '      <div class="nd-search-actions">' +
                '        <label class="nd-search-input"><span class="nd-search-icon">⌕</span>' +
                '          <input type="search" id="ndKeyword" placeholder="Nhập từ khóa bảng điểm..."></label>' +
                '        <button type="submit" class="nd-btn nd-btn-primary">Lọc</button>' +
                '        <button type="button" class="nd-btn nd-btn-light" id="ndClearSearch" style="display:none;">Xóa lọc</button>' +
                '      </div>' +
                '      <span class="nd-count" id="ndCount"><strong>0</strong>/0 kết quả</span>' +
                '    </form>' +
                '    <div class="nd-table-wrap"><table class="nd-table">' +
                '      <thead><tr><th>STT</th><th>Sinh viên</th><th>Mã MH</th><th>Nhóm/tổ môn học</th><th>Tên môn học</th>' +
                '        <th>Số tín chỉ</th><th>Điểm thi</th><th>Điểm TK (10)</th><th>Điểm TK (4)</th><th>Điểm TK (C)</th><th>Kết quả</th><th>Thao tác</th></tr></thead>' +
                '      <tbody id="ndBody"><tr><td colspan="12" class="nd-empty">Đang tải...</td></tr></tbody>' +
                '    </table></div>' +
                '  </div>' +
                '</section>';
            $('#contentArea').html(html);
            this.bindEvents();
        },

        /** Lấy lớp giảng dạy rồi bảng điểm của từng lớp (API hiện có) */
        loadAll: function (cb) {
            var self = this;
            Api.get('/api/ketquahoctap/lop-giang-day').done(function (res) {
                self.classes = res.data || [];
                if (!self.classes.length) {
                    self.rows = [];
                    self.fillStudents(); self.renderTable();
                    $('#ndBody').html('<tr><td colspan="12" class="nd-empty">Bạn chưa được phân công giảng dạy lớp học phần nào.</td></tr>');
                    return;
                }
                var reqs = self.classes.map(function (l) { return Api.get('/api/ketquahoctap/bang-diem', { lop_hoc_phan_id: l.id }); });
                $.when.apply($, reqs).done(function () {
                    var results = reqs.length === 1 ? [arguments] : Array.prototype.slice.call(arguments);
                    var rows = [];
                    results.forEach(function (r, i) {
                        var data = (r[0] && r[0].data) || [];
                        var l = self.classes[i];
                        data.forEach(function (d) {
                            rows.push($.extend({}, d, {
                                lop_hoc_phan_id: l.id, ma_lop_hoc_phan: l.ma_lop_hoc_phan, ma_mon_hoc: l.ma_mon_hoc,
                                ten_mon_hoc: l.ten_mon_hoc, so_tin_chi: l.so_tin_chi, hoc_ky: l.hoc_ky, nam_hoc: l.nam_hoc,
                                hoc_ky_text: hocKyText(l.hoc_ky, l.nam_hoc)
                            }));
                        });
                    });
                    self.rows = rows;
                    self.fillStudents();
                    self.renderTable();
                    if (typeof cb === 'function') cb();
                }).fail(Api.toastError);
            }).fail(Api.toastError);
        },

        bindEvents: function () {
            var self = this;
            $('#ndSv').on('change', function () { self.fillCourses(); });
            $('#ndMon').on('change', function () { self.fillTerm(); });
            $('#ndForm').on('submit', function (e) { e.preventDefault(); self.submit(); });
            $('#ndCancel').on('click', function () { self.resetForm(); });

            $('#ndSearch').on('click', '.nd-chip', function () {
                $('#ndSearch .nd-chip').removeClass('active');
                $(this).addClass('active');
            });
            $('#ndSearch').on('submit', function (e) {
                e.preventDefault();
                self.search = { query: $.trim($('#ndKeyword').val()), field: String($('#ndSearch .nd-chip.active').data('field')) };
                self.renderTable();
            });
            $('#ndClearSearch').on('click', function () {
                $('#ndKeyword').val('');
                $('#ndSearch .nd-chip').removeClass('active').filter('[data-field="all"]').addClass('active');
                self.search = { query: '', field: 'all' };
                self.renderTable();
            });

            $('#ndBody').on('click', '.nd-edit', function () { self.startEdit(parseInt($(this).data('dk'), 10)); });
            $('#ndBody').on('click', '.nd-del', function () { self.remove(parseInt($(this).data('dk'), 10)); });
        },

        findRow: function (dkId) {
            return this.rows.find(function (r) { return parseInt(r.dang_ky_id, 10) === dkId; });
        },

        fillStudents: function (selected) {
            var seen = {}, opts = '<option value="">Chọn sinh viên</option>';
            this.rows.slice().sort(function (a, b) { return String(a.ma_dinh_danh).localeCompare(String(b.ma_dinh_danh)); })
                .forEach(function (r) {
                    if (seen[r.sinh_vien_id]) return;
                    seen[r.sinh_vien_id] = 1;
                    opts += '<option value="' + r.sinh_vien_id + '">' + esc(r.ma_dinh_danh) + ' - ' + esc(r.ho_ten) + '</option>';
                });
            $('#ndSv').html(opts);
            var first = selected || $('#ndSv option').eq(1).val() || '';
            $('#ndSv').val(first);
            this.fillCourses();
        },

        /** Môn học = các lớp học phần mà sinh viên đã chọn đang học trong lớp của giảng viên */
        fillCourses: function (selectedDk) {
            var svId = $('#ndSv').val();
            var list = this.rows.filter(function (r) { return String(r.sinh_vien_id) === String(svId); });
            var count = {};
            list.forEach(function (r) { count[r.ma_mon_hoc] = (count[r.ma_mon_hoc] || 0) + 1; });
            var opts = '<option value="">Chọn môn học</option>' + list.map(function (r) {
                return '<option value="' + r.dang_ky_id + '">' + esc(r.ma_mon_hoc) + ' - ' + esc(r.ten_mon_hoc) +
                    (count[r.ma_mon_hoc] > 1 ? ' (' + esc(r.ma_lop_hoc_phan) + ')' : '') + '</option>';
            }).join('');
            $('#ndMon').html(opts).val(selectedDk || (list[0] ? String(list[0].dang_ky_id) : ''));
            this.fillTerm();
        },

        fillTerm: function () {
            var d = this.findRow(parseInt($('#ndMon').val(), 10));
            $('#ndHocKy').val(d ? d.hoc_ky_text : '');
        },

        startEdit: function (dkId) {
            var d = this.findRow(dkId);
            if (!d) return;
            this.editing = d;
            $('#ndSv').val(String(d.sinh_vien_id));
            this.fillCourses(String(d.dang_ky_id));
            $('#ndSv, #ndMon').prop('disabled', true);
            $('#ndGk').val(d.diem_giua_ky != null ? d.diem_giua_ky : '');
            $('#ndCk').val(d.diem_cuoi_ky != null ? d.diem_cuoi_ky : '');
            $('#ndFormTitle').text('Cập nhật điểm');
            $('#ndSubmit').text('Lưu điểm');
            $('#ndCancel').show();
            var top = $('#ndForm').offset();
            if (top) $('html, body').animate({ scrollTop: Math.max(top.top - 120, 0) }, 200);
        },

        resetForm: function () {
            this.editing = null;
            $('#ndSv, #ndMon').prop('disabled', false);
            $('#ndGk, #ndCk').val('');
            $('#ndFormTitle').text('Nhập điểm sinh viên');
            $('#ndSubmit').text('Nhập điểm');
            $('#ndCancel').hide();
        },

        /** Thêm điểm còn thiếu (POST), sửa điểm đã có (PUT); khi sửa, để trống = xóa điểm đó. Backend kiểm tra 0-10, cấm thi */
        submit: function () {
            var self = this;
            var dkId = parseInt($('#ndMon').val(), 10);
            var d = this.findRow(dkId);
            if (!d) {
                App.showToast('Vui lòng chọn sinh viên và môn học.', 'error');
                return;
            }
            var editing = !!this.editing;
            var them = {}, sua = {}, xoa = [];
            [['diem_giua_ky', $('#ndGk').val(), 'giua_ky'], ['diem_cuoi_ky', $('#ndCk').val(), 'cuoi_ky']].forEach(function (x) {
                var cu = d[x[0]];
                if (x[1] === '') { if (editing && cu != null) xoa.push(x[2]); return; }
                if (cu == null) them[x[0]] = x[1]; else if (String(Number(cu)) !== String(Number(x[1]))) sua[x[0]] = x[1];
            });
            var calls = [];
            if (Object.keys(sua).length) calls.push(function () { return Api.put('/api/ketquahoctap/diem-thanh-phan', $.extend({ dang_ky_id: dkId }, sua)); });
            if (Object.keys(them).length) calls.push(function () { return Api.post('/api/ketquahoctap/diem-thanh-phan', $.extend({ dang_ky_id: dkId }, them)); });
            xoa.forEach(function (loai) { calls.push(function () { return Api.del('/api/ketquahoctap/diem-thanh-phan', { dang_ky_id: dkId, loai: loai }); }); });
            if (!calls.length) {
                if (editing) { self.resetForm(); return; }
                // Không nhập điểm nào: để backend trả thông báo kiểm tra dữ liệu
                Api.post('/api/ketquahoctap/diem-thanh-phan', { dang_ky_id: dkId }).fail(Api.toastError);
                return;
            }
            var run = function (i, lastRes) {
                if (i >= calls.length) {
                    App.showToast((lastRes && lastRes.message) || 'Đã lưu điểm.', 'success');
                    var sv = d.sinh_vien_id;
                    self.resetForm();
                    self.loadAll(function () { $('#ndSv').val(String(sv)); self.fillCourses(String(dkId)); });
                    return;
                }
                calls[i]().done(function (res) { run(i + 1, res); }).fail(function (xhr) { Api.toastError(xhr); self.loadAll(); });
            };
            run(0);
        },

        remove: function (dkId) {
            var self = this;
            var d = this.findRow(dkId);
            if (!d) return;
            ModalComponent.confirm('Xóa điểm môn <strong>' + esc(d.ten_mon_hoc) + '</strong> của sinh viên <strong>' + esc(d.ma_dinh_danh + ' - ' + d.ho_ten) + '</strong>?', function () {
                Api.del('/api/ketquahoctap/diem-thanh-phan', { dang_ky_id: dkId, loai: 'tat_ca' })
                    .done(function (res) {
                        App.showToast(res.message, 'success');
                        if (self.editing && self.editing.dang_ky_id === d.dang_ky_id) self.resetForm();
                        self.loadAll();
                    })
                    .fail(Api.toastError);
            });
        },

        renderTable: function () {
            var q = this.search;
            // Như mã cũ: bảng điểm chỉ gồm các bản ghi đã có điểm
            var graded = this.rows.filter(function (r) { return r.diem_giua_ky != null || r.diem_cuoi_ky != null; });
            var keys = normalize(q.query).split(/\s+/).filter(Boolean);
            var list = graded.filter(function (r) {
                if (!keys.length) return true;
                var vals = [r.ma_dinh_danh, r.ho_ten, r.ma_mon_hoc, r.ten_mon_hoc, r.hoc_ky_text];
                var hay = normalize((q.field === 'all' ? vals : [vals[Number(q.field)]]).join(' '));
                return keys.every(function (k) { return hay.indexOf(k) !== -1; });
            });
            $('#ndCount').html('<strong>' + list.length + '</strong>/' + graded.length + ' kết quả');
            $('#ndClearSearch').toggle(!!q.query);

            var groups = {}, order = [];
            list.slice().sort(function (a, b) {
                return String(b.nam_hoc).localeCompare(String(a.nam_hoc)) || (Number(b.hoc_ky) - Number(a.hoc_ky)) ||
                    String(a.ma_dinh_danh).localeCompare(String(b.ma_dinh_danh)) || String(a.ma_mon_hoc).localeCompare(String(b.ma_mon_hoc));
            }).forEach(function (r) {
                if (!groups[r.hoc_ky_text]) { groups[r.hoc_ky_text] = []; order.push(r.hoc_ky_text); }
                groups[r.hoc_ky_text].push(r);
            });

            var html = '';
            order.forEach(function (hk) {
                html += '<tr class="nd-semester"><th colspan="12">' + esc(hk) + '</th></tr>';
                groups[hk].forEach(function (r, i) {
                    var kq = r.cam_thi ? '<span class="nd-result failed">Cấm thi</span>'
                        : (r.ket_qua ? '<span class="nd-result ' + (r.ket_qua === 'Đạt' ? 'passed' : 'failed') + '">' + esc(r.ket_qua) + '</span>' : '—');
                    html +=
                        '<tr>' +
                        '<td>' + (i + 1) + '</td>' +
                        '<td><div>' + esc(r.ma_dinh_danh) + '</div><small>' + esc(r.ho_ten) + '</small></td>' +
                        '<td>' + esc(r.ma_mon_hoc) + '</td>' +
                        '<td>' + esc(r.ma_lop_hoc_phan || '—') + '</td>' +
                        '<td>' + esc(r.ten_mon_hoc) + '</td>' +
                        '<td>' + esc(r.so_tin_chi || '—') + '</td>' +
                        '<td>' + num(r.diem_cuoi_ky) + '</td>' +
                        '<td>' + num(r.diem_he_10, 1) + '</td>' +
                        '<td>' + num(r.diem_he_4, 1) + '</td>' +
                        '<td>' + (r.diem_chu ? '<span class="nd-pill nd-pill-' + esc(String(r.diem_chu).charAt(0)) + '">' + esc(r.diem_chu) + '</span>' : '—') + '</td>' +
                        '<td>' + kq + '</td>' +
                        '<td><div class="nd-actions">' +
                        (r.cam_thi ? '' : '<button type="button" class="nd-btn nd-btn-warning nd-edit" data-dk="' + r.dang_ky_id + '">Sửa</button>') +
                        '<button type="button" class="nd-btn nd-btn-danger nd-del" data-dk="' + r.dang_ky_id + '">Xóa</button>' +
                        '</div></td>' +
                        '</tr>';
                });
            });
            $('#ndBody').html(html || '<tr><td colspan="12" class="nd-empty">Chưa có dữ liệu điểm số.</td></tr>');
        }
    };

    App.registerModule('quan-ly-diem', QuanLyDiemModule);
})(jQuery);
