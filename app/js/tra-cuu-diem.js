/* ================================================================
   TRA-CUU-DIEM.JS - Kết quả học tập > Tra cứu bảng điểm sinh viên
   Luồng: chọn lớp sinh viên → chọn sinh viên → xem kết quả theo học kỳ (điểm theo môn, GPA học kỳ / tích lũy)
   Dùng lại bảng điểm và phần giải thích công thức của trang Kết quả học tập (RULE-16.4)
   ================================================================ */

(function ($) {
    'use strict';

    var TraCuuDiemModule = {
        render: function () {
            var html =
                '<div class="card mb-3">' +
                '  <div class="card-header"><h3><i class="fa-solid fa-magnifying-glass-chart" style="color:var(--primary);"></i> Tra cứu bảng điểm sinh viên</h3></div>' +
                '  <div class="card-body">' +
                '    <div class="form-row">' +
                '      <div class="form-group"><label>1. Chọn lớp sinh viên</label><select class="form-control" id="tcLop"></select></div>' +
                '      <div class="form-group"><label>2. Chọn sinh viên</label><select class="form-control" id="tcSv"></select></div>' +
                '    </div>' +
                '  </div>' +
                '</div>' +
                '<div id="tcKetQua"></div>';
            $('#contentArea').html(html);
            var self = this;
            Api.get('/api/ketquahoctap/lop-sinh-vien').done(function (res) {
                self.lops = res.data || [];
                $('#tcLop').html(self.lops.length
                    ? self.lops.map(function (l) { return '<option value="' + l.id + '">' + App.escapeHtml(l.ma_lop + ' - ' + l.ten_lop) + ' (' + l.sinh_vien.length + ' SV)</option>'; }).join('')
                    : '<option value="">Chưa có lớp sinh viên</option>');
                self.fillSv();
            }).fail(Api.toastError);
            $('#tcLop').on('change', function () { self.fillSv(); });
            $('#tcSv').on('change', function () { self.show(); });
        },

        fillSv: function () {
            var lop = (this.lops || []).find(function (l) { return String(l.id) === String($('#tcLop').val()); });
            var sv = lop ? lop.sinh_vien : [];
            $('#tcSv').html(sv.length
                ? sv.map(function (s) { return '<option value="' + s.id + '">' + App.escapeHtml(s.ma_dinh_danh + ' - ' + s.ho_ten) + '</option>'; }).join('')
                : '<option value="">Lớp chưa có sinh viên</option>');
            this.show();
        },

        show: function () {
            var lop = (this.lops || []).find(function (l) { return String(l.id) === String($('#tcLop').val()); });
            var sv = lop ? lop.sinh_vien.find(function (s) { return String(s.id) === String($('#tcSv').val()); }) : null;
            if (!sv) { $('#tcKetQua').html('<div class="card"><div class="card-body text-muted text-center py-4">Chọn lớp sinh viên và sinh viên để xem kết quả học tập</div></div>'); return; }
            KetQuaModule.sinhVienId = sv.id;
            KetQuaModule.renderInto($('#tcKetQua'), { ho_ten: sv.ho_ten, ma_dinh_danh: sv.ma_dinh_danh, lop: lop.ma_lop + ' - ' + lop.ten_lop });
        }
    };

    App.registerModule('tra-cuu-diem', TraCuuDiemModule);
})(jQuery);
