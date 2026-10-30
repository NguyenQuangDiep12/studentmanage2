/* ================================================================
   DANG-KY.JS - Quản lý đăng ký học phần cho sinh viên
   Kết nối Backend PHP thuần & SQLite
   Kiểm tra thời hạn mở/đóng, sĩ số, trùng lịch
   Ràng buộc chuẩn môn bắt buộc trong CTĐT & thứ tự môn tự chọn (A -> B -> C)
   Font Awesome icons, XSS protection
   ================================================================ */

(function ($) {
    'use strict';

    var DangKyModule = {
        currentTab: 'available',

        // Dùng chung header Bearer của Api (một nơi duy nhất tạo "Authorization: Bearer <token>")
        getAuthHeaders: function () {
            return Api.authHeaders();
        },

        render: function () {
            var currentUser = App.getCurrentUser();
            if (!currentUser || currentUser.vai_tro !== 'sinh_vien') {
                $('#contentArea').html('<div class="alert alert-danger"><i class="fa-solid fa-triangle-exclamation"></i> Trang này chỉ dành cho sinh viên</div>');
                return;
            }
            var self = this;
            this.search = { query: '', field: 'all' };
            this.list = [];
            // Bố cục theo mã nguồn cũ (renderRegistrationSection): một thẻ, thanh tìm kiếm, bảng lớp học phần
            var html =
                '<section class="nd-scope">' +
                '  <div class="nd-card">' +
                OldUI.header('Đăng ký môn học', 'Chỉ đăng ký được lớp còn chỗ và không trùng lịch với lớp bạn đã chọn. Lịch được cập nhật sau khi đăng ký.') +
                OldUI.toolbar('dkSearch', ['Mã lớp', 'Môn học', 'Trạng thái'], 'Nhập từ khóa lớp học phần...') +
                '    <div class="nd-table-wrap"><table class="nd-table">' +
                '      <thead><tr><th>Mã lớp</th><th>Môn học</th><th>Giảng viên</th><th>Tòa nhà / phòng</th><th>Chỗ trống</th><th>Lịch học</th><th>Trạng thái</th><th>Đăng ký</th></tr></thead>' +
                '      <tbody id="dkBody"><tr><td colspan="8" class="nd-empty">Đang tải...</td></tr></tbody>' +
                '    </table></div>' +
                '  </div>' +
                '</section>';
            $('#contentArea').html(html);
            OldUI.bind('dkSearch', function (q) { self.search = q; self.renderTable(); });

            $(document).off('click', '.btn-dang-ky-lhp').on('click', '.btn-dang-ky-lhp', function () { self.registerLHP($(this).data('id')); });
            $(document).off('click', '.btn-huy-dang-ky').on('click', '.btn-huy-dang-ky', function () { self.cancelRegistration($(this).data('id')); });

            // Học kỳ hiện hành lấy từ dữ liệu (không gán cứng)
            App.fillTermSelects(null, $('<select>'), {}, function (d) {
                self.term = (d && d.hien_tai) || {};
                self.loadAvailableList();
            });
        },

        lichText: function (list, sep) {
            return (list || []).map(function (lh) {
                return App.thuLabel(lh.thu) + ', tiết ' + lh.tiet_bat_dau + ' - ' + lh.tiet_ket_thuc;
            }).join(sep) || '—';
        },

        /** Lớp mở đăng ký (học kỳ hiện hành) + đăng ký của sinh viên (để biết lớp nào có thể hủy) */
        loadAvailableList: function () {
            var self = this;
            var t = this.term || {};
            $.when(
                $.ajax({ url: '/api/dangkyhocphan/available', method: 'GET', headers: self.getAuthHeaders(), dataType: 'json',
                         data: { hoc_ky: t.hoc_ky || 1, nam_hoc: t.nam_hoc || '', search: '' } }),
                $.ajax({ url: '/api/dangkyhocphan/registered', method: 'GET', headers: self.getAuthHeaders(), dataType: 'json', data: {} })
            ).done(function (a, r) {
                var res = a[0] || {}, reg = (r[0] && r[0].data) || [];
                var active = {};
                reg.forEach(function (d) {
                    if (d.trang_thai_dk === 'Đã đăng ký' || d.trang_thai_dk === 'da_dang_ky') active[String(d.lop_hoc_phan_id)] = d;
                });
                self.message = res.message || '';
                self.list = (res.data || []).map(function (l) {
                    var dk = active[String(l.id)];
                    var dong = l.is_open_time === false;
                    return $.extend({}, l, {
                        dk: dk || null,
                        trang_thai_text: dong ? 'Đóng đăng ký' : 'Đang mở',
                        hoc_ky_text: 'HK' + l.hoc_ky + ' ' + String(l.nam_hoc || '').split('-')[0]
                    });
                });
                self.renderTable();
            }).fail(function (xhr) {
                App.showToast(Api.errorMessage(xhr, 'Lỗi tải danh sách lớp học phần'), 'error');
            });
        },

        renderTable: function () {
            var self = this, q = this.search;
            var list = this.list.filter(function (l) {
                return OldUI.match([l.ma_lop_hoc_phan, (l.ten_mon_hoc || '') + ' ' + (l.ma_mon_hoc || ''), l.trang_thai_text], q);
            });
            OldUI.count('dkSearch', list.length, this.list.length, 'lớp học phần');
            var esc = App.escapeHtml;
            var html = list.map(function (l) {
                var siSo = parseInt(l.si_so_hien_tai, 10) || 0, max = parseInt(l.si_so_toi_da, 10) || 0;
                var dong = l.is_open_time === false;
                var ngay = (l.lich_hoc || []).filter(function (x) { return x.ngay_bat_dau; })[0];
                var btn;
                if (l.dk) {
                    btn = l.dk.co_the_huy === false
                        ? '<button class="nd-btn nd-btn-danger" disabled title="' + esc(l.dk.ly_do_khong_huy || '') + '">Hủy đăng ký</button>' +
                          (l.dk.ly_do_khong_huy ? '<small class="nd-note d-block">' + esc(l.dk.ly_do_khong_huy) + '</small>' : '')
                        : '<button class="nd-btn nd-btn-danger btn-huy-dang-ky" data-id="' + l.dk.dang_ky_id + '">Hủy đăng ký</button>';
                } else if (l.is_registered) {
                    btn = '<button class="nd-btn nd-btn-primary" disabled>Đã đăng ký</button>';
                } else if (dong) {
                    btn = '<button class="nd-btn nd-btn-primary" disabled>Đã đóng</button>';
                } else if (l.is_full) {
                    btn = '<button class="nd-btn nd-btn-primary" disabled>Lớp đã đầy</button>';
                } else {
                    btn = '<button class="nd-btn nd-btn-primary btn-dang-ky-lhp" data-id="' + l.id + '">Đăng ký</button>';
                }
                return '<tr>' +
                    '<td>' + esc(l.ma_lop_hoc_phan) + '</td>' +
                    '<td><div>' + esc(l.ten_mon_hoc || '—') + '</div><small>' + esc(l.ma_mon_hoc || '') + ' - ' + esc(l.hoc_ky_text) + ' · ' + (l.so_tin_chi || 0) + ' TC</small></td>' +
                    '<td>' + esc(l.ten_giang_vien || 'Chưa phân công') + '</td>' +
                    '<td>' + esc(l.phong_hoc || '—') + '</td>' +
                    '<td><strong>' + Math.max(0, max - siSo) + '</strong> / ' + max + '</td>' +
                    '<td><div>' + self.lichText(l.lich_hoc, '<br>') + '</div>' +
                    (ngay ? '<small>Học phần: ' + App.formatDate(ngay.ngay_bat_dau) + ' – ' + App.formatDate(ngay.ngay_ket_thuc) + '</small>' : '') +
                    '</td>' +
                    '<td><span class="nd-pill ' + (dong ? 'nd-pill-neutral' : 'nd-pill-success') + '">' + l.trang_thai_text + '</span></td>' +
                    '<td>' + btn + '</td>' +
                    '</tr>';
            }).join('');
            $('#dkBody').html(html || '<tr><td colspan="8" class="nd-empty">' + esc(this.message || 'Chưa có lớp học phần phù hợp.') + '</td></tr>');
        },

        loadRegisteredList: function () { /* đã gộp vào loadAvailableList */ },

        registerLHP: function (lhpId) {
            var self = this;
            var currentUser = App.getCurrentUser();
            if (!currentUser) return;

            $.ajax({
                url: '/api/dangkyhocphan/register',
                method: 'POST',
                headers: self.getAuthHeaders(),
                contentType: 'application/json; charset=utf-8',
                dataType: 'json',
                data: JSON.stringify({
                    lop_hoc_phan_id: lhpId
                })
            })
            .done(function (res) {
                if (res.success) {
                    App.showToast(res.message || 'Đăng ký học phần thành công!', 'success');
                    self.loadAvailableList();
                    self.loadRegisteredList();
                } else {
                    App.showToast(res.message || 'Đăng ký không thành công!', 'error');
                }
            })
            .fail(function (xhr) {
                var msg = Api.errorMessage(xhr, 'Lỗi khi gửi yêu cầu đăng ký');
                App.showToast(msg, 'error');
            });
        },

        cancelRegistration: function (dkId) {
            var self = this;
            var currentUser = App.getCurrentUser();
            if (!currentUser) return;

            App.confirm('Bạn có chắc chắn muốn hủy đăng ký lớp học phần này?', function () {
                $.ajax({
                    url: '/api/dangkyhocphan/cancel',
                    method: 'POST',
                    headers: self.getAuthHeaders(),
                    contentType: 'application/json; charset=utf-8',
                    dataType: 'json',
                    data: JSON.stringify({
                        dang_ky_id: dkId
                    })
                })
                .done(function (res) {
                    if (res.success) {
                        App.showToast(res.message || 'Đã hủy đăng ký thành công!', 'info');
                        self.loadAvailableList();
                        self.loadRegisteredList();
                    } else {
                        App.showToast(res.message || 'Không thể hủy đăng ký!', 'error');
                    }
                })
                .fail(function (xhr) {
                    var msg = Api.errorMessage(xhr, 'Lỗi khi hủy đăng ký');
                    App.showToast(msg, 'error');
                });
            });
        }
    };

    App.registerModule('dang-ky', DangKyModule);
})(jQuery);
