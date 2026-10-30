/* ================================================================
   KET-QUA.JS - Bảng điểm cá nhân (sinh viên) - dùng lại cho Tra cứu bảng điểm
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
        },

        /** Dựng bảng điểm vào $box; sv = {ho_ten, ma_dinh_danh} */
        renderInto: function ($box, sv) {
            var moTa = this.sinhVienId
                ? 'Xem toàn bộ điểm số của sinh viên ' + App.escapeHtml(sv.ho_ten) + ' (' + App.escapeHtml(sv.ma_dinh_danh) + ').'
                : 'Xem toàn bộ điểm số của bạn.';
            var html =
                '<div class="card bang-diem-card">' +
                '  <div class="card-body">' +
                '    <h3 class="bang-diem-title">Bảng điểm cá nhân</h3>' +
                '    <p class="bang-diem-desc">' + moTa + '</p>' +
                '    <div class="bang-diem-scroll"><table class="bang-diem-table">' +
                '      <thead><tr>' +
                '        <th>Môn học</th><th>Học kỳ</th><th>Giữa kỳ</th><th>Cuối kỳ</th><th>Tổng kết</th><th>Điểm chữ</th><th></th>' +
                '      </tr></thead>' +
                '      <tbody id="kqTableBody"><tr><td colspan="7" class="bang-diem-empty">Đang tải...</td></tr></tbody>' +
                '    </table></div>' +
                '  </div>' +
                '</div>';
            $box.html(html);
            var self = this;
            $box.off('click', '.btn-bd-chi-tiet').on('click', '.btn-bd-chi-tiet', function () {
                var d = (self.rows || [])[$(this).data('index')];
                if (d) self.showDetail(d);
            });
            this.loadGrades();
        },

        loadGrades: function () {
            var self = this;
            // RULE-16, 17: điểm và quy đổi do backend tính; lấy tất cả học kỳ
            var params = { hoc_ky: 'all', nam_hoc: 'all' };
            if (this.sinhVienId) params.sinh_vien_id = this.sinhVienId;
            Api.get('/api/ketquahoctap/ket-qua', params)
                .done(function (res) { self.renderGrades(res); })
                .fail(Api.toastError);
        },

        /** Hộp thoại xem toàn bộ điểm của một môn */
        showDetail: function (d) {
            var diem = function (v, so) { return v != null && v !== '' ? Number(v).toFixed(so) : '—'; };
            var o = function (label, value) {
                return '<div class="detail-item"><span class="detail-label">' + label + '</span><span class="detail-value">' + value + '</span></div>';
            };
            var hk = (String(d.hoc_ky) === '3' ? 'Học kỳ Hè' : 'Học kỳ ' + d.hoc_ky) + ' - Năm học ' + App.escapeHtml(d.nam_hoc || '');
            var ketQua = d.cam_thi ? '<span class="badge badge-danger">Cấm thi</span>'
                : (d.ket_qua ? App.ketQuaBadge(d.ket_qua) : '<span class="text-gray">Chưa tổng kết</span>');
            var lanHoc = d.so_lan_hoc > 1
                ? 'Lần ' + d.lan_hoc + '/' + d.so_lan_hoc + (d.diem_he_10 != null ? (d.tinh_tich_luy ? ' · tính tích lũy' : ' · không tính tích lũy') : '')
                : 'Lần 1';
            var html =
                '<div class="modal-header">' +
                '  <h3>Chi tiết điểm - ' + App.escapeHtml(d.ten_mon_hoc) + '</h3>' +
                '  <button class="modal-close" onclick="ModalComponent.close()">&times;</button>' +
                '</div>' +
                '<div class="modal-body">' +
                '  <div class="detail-grid mb-3">' +
                o('Mã môn học', App.escapeHtml(d.ma_mon_hoc)) +
                o('Lớp học phần', App.escapeHtml(d.ma_lop_hoc_phan || '—')) +
                o('Học kỳ', hk) +
                o('Số tín chỉ', App.escapeHtml(d.so_tin_chi)) +
                o('Chuyên cần', diem(d.diem_chuyen_can, 1)) +
                o('Giữa kỳ', diem(d.diem_giua_ky, 1)) +
                o('Cuối kỳ', diem(d.diem_cuoi_ky, 1)) +
                o('Tổng kết (hệ 10)', diem(d.diem_he_10, 1)) +
                o('Hệ 4', diem(d.diem_he_4, 1)) +
                o('Điểm chữ', d.diem_chu ? App.diemChuBadge(d.diem_chu) : '—') +
                o('Kết quả', ketQua) +
                o('Lần học', lanHoc) +
                '  </div>' +
                (this.quyTac && typeof GiaiThichDiem !== 'undefined' ? '<div>' + GiaiThichDiem.hocPhan(d, this.quyTac) + '</div>' : '') +
                '</div>' +
                '<div class="modal-footer"><button class="btn btn-outline" onclick="ModalComponent.close()">Đóng</button></div>';
            ModalComponent.show(html, 'lg');
        },

        renderGrades: function (res) {
            var rows = res.data || [];
            this.rows = rows;
            this.quyTac = res.quy_tac || null;
            var tbody = $('#kqTableBody').empty();
            // Thiếu điểm thì hiển thị "—", không để ô trống
            var diem = function (v) { return v != null && v !== '' ? String(Number(v)) : '—'; };
            var hocKy = function (d) {
                var nam = String(d.nam_hoc || '').split('-')[0];
                var hk = String(d.hoc_ky) === '3' ? 'Hè' : 'HK' + d.hoc_ky;
                return hk + (nam ? ' ' + nam : '');
            };

            if (rows.length === 0) {
                tbody.html('<tr><td colspan="7" class="bang-diem-empty">Chưa có dữ liệu điểm</td></tr>');
                return;
            }

            rows.forEach(function (d, i) {
                var ghiChu = d.cam_thi ? ' <span class="badge badge-danger">Cấm thi</span>' : '';
                tbody.append(
                    '<tr>' +
                    '  <td data-label="Môn học"><div class="bd-mon">' + App.escapeHtml(d.ten_mon_hoc) + ghiChu + '</div>' +
                    '      <div class="bd-ma">' + App.escapeHtml(d.ma_mon_hoc) + '</div></td>' +
                    '  <td data-label="Học kỳ">' + App.escapeHtml(hocKy(d)) + '</td>' +
                    '  <td data-label="Giữa kỳ">' + diem(d.diem_giua_ky) + '</td>' +
                    '  <td data-label="Cuối kỳ">' + diem(d.diem_cuoi_ky) + '</td>' +
                    '  <td data-label="Tổng kết">' + diem(d.diem_he_10) + '</td>' +
                    '  <td data-label="Điểm chữ">' + (d.diem_chu ? '<span class="bd-chu bd-chu-' + App.escapeHtml(String(d.diem_chu).charAt(0)) + '">' + App.escapeHtml(d.diem_chu) + '</span>' : '—') + '</td>' +
                    '  <td class="bd-action"><button class="btn btn-sm btn-outline-primary btn-bd-chi-tiet" data-index="' + i + '">Xem chi tiết</button></td>' +
                    '</tr>');
            });
        }
    };

    window.KetQuaModule = KetQuaModule;
    App.registerModule('ket-qua', KetQuaModule);
})(jQuery);
