/* ================================================================
   DANG-KY.JS - Quản lý đăng ký học phần cho sinh viên
   Kết nối Backend PHP thuần & SQLite
   Kiểm tra thời hạn mở/đóng, sĩ số, trùng lịch, giới hạn tín chỉ (≤24 TC)
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

            // Lớp sinh hoạt và CTĐT được nạp từ API /api/taikhoan/me
            var lsvInfo = '—';
            var ctdtInfo = '—';

            var html =
                '<div class="card mb-3">' +
                '  <div class="card-body">' +
                '    <div class="d-flex justify-between align-center" style="flex-wrap:wrap; gap:12px;">' +
                '      <div>' +
                '        <h3 style="font-size:1.25rem; font-weight:800; margin-bottom:4px;">' +
                '          <i class="fa-solid fa-user-graduate" style="color:var(--primary);"></i> ' + App.escapeHtml(currentUser.ho_ten) + ' (' + App.escapeHtml(currentUser.ma_dinh_danh) + ')' +
                '        </h3>' +
                '        <p style="font-size:0.88rem; color:var(--text-muted);">' +
                '          Lớp sinh hoạt: <strong id="dkLopSinhHoat">' + App.escapeHtml(lsvInfo) + '</strong> | ' +
                '          Chương trình: <strong id="dkChuongTrinh">' + App.escapeHtml(ctdtInfo) + '</strong> | ' +
                '          Khoa: <strong id="dkKhoa">—</strong>' +
                '        </p>' +
                '      </div>' +
                '      <div id="statRegisteredTC" class="badge badge-primary" style="font-size:0.95rem; padding:8px 18px;">' +
                '        <i class="fa-solid fa-book"></i> Đã đăng ký: 0 Tín chỉ' +
                '      </div>' +
                '    </div>' +
                '  </div>' +
                '</div>' +

                '<div class="tabs">' +
                '  <button class="tab-btn active" data-tab="available"><i class="fa-solid fa-list-check"></i> Lớp học phần mở đăng ký</button>' +
                '  <button class="tab-btn" data-tab="registered"><i class="fa-solid fa-circle-check"></i> Lớp học phần đã đăng ký (<span id="registeredCountBadge">0</span>)</button>' +
                '  <button class="tab-btn" data-tab="elective-rules"><i class="fa-solid fa-circle-info"></i> Quy chế môn tự chọn & tích lũy</button>' +
                '</div>' +

                '<!-- TAB 1: AVAILABLE -->' +
                '<div class="tab-content active" id="tab-available">' +
                '  <div class="card">' +
                '    <div class="card-body">' +
                '      <div class="toolbar">' +
                '        <div class="toolbar-left">' +
                '          <div class="search-box">' +
                '            <i class="fa-solid fa-magnifying-glass search-icon"></i>' +
                '            <input type="text" id="searchAvailableLHP" placeholder="Tìm kiếm theo mã môn, tên môn">' +
                '          </div>' +
                '          <select id="selectHocKyDK" class="filter-select">' +
                '            <option value="1">Học kỳ 1</option>' +
                '            <option value="2">Học kỳ 2</option>' +
                '            <option value="3">Học kỳ Hè</option>' +
                '          </select>' +
                '          <select id="selectNamHocDK" class="filter-select">' +
                '          </select>' +
                '        </div>' +
                '        <div class="toolbar-right">' +
                '          <span class="text-muted" id="availableCount">0 lớp học phần</span>' +
                '        </div>' +
                '      </div>' +

                '      <div class="table-responsive">' +
                '        <table class="data-table">' +
                '          <thead>' +
                '            <tr>' +
                '              <th>Mã lớp HP</th>' +
                '              <th>Môn học</th>' +
                '              <th class="text-center">Số TC</th>' +
                '              <th>Giảng viên</th>' +
                '              <th>Phòng học</th>' +
                '              <th>Lịch học tuần</th>' +
                '              <th>Thời hạn đăng ký</th>' +
                '              <th class="text-center">Sĩ số</th>' +
                '              <th class="text-center">Thao tác</th>' +
                '            </tr>' +
                '          </thead>' +
                '          <tbody id="availableTableBody"></tbody>' +
                '        </table>' +
                '      </div>' +
                '    </div>' +
                '  </div>' +
                '</div>' +

                '<!-- TAB 2: REGISTERED -->' +
                '<div class="tab-content" id="tab-registered">' +
                '  <div class="card">' +
                '    <div class="card-header">' +
                '      <h3><i class="fa-solid fa-circle-check" style="color:var(--success);"></i> Danh sách lớp học phần đã đăng ký</h3>' +
                '    </div>' +
                '    <div class="card-body">' +
                '      <div class="table-responsive">' +
                '        <table class="data-table">' +
                '          <thead>' +
                '            <tr>' +
                '              <th>STT</th>' +
                '              <th>Mã lớp HP</th>' +
                '              <th>Tên môn học</th>' +
                '              <th class="text-center">Số TC</th>' +
                '              <th>Giảng viên</th>' +
                '              <th>Phòng</th>' +
                '              <th>Lịch học</th>' +
                '              <th>Ngày đăng ký</th>' +
                '              <th class="text-center">Trạng thái</th>' +
                '              <th class="text-center">Thao tác</th>' +
                '            </tr>' +
                '          </thead>' +
                '          <tbody id="registeredTableBody"></tbody>' +
                '        </table>' +
                '      </div>' +
                '    </div>' +
                '  </div>' +
                '</div>' +

                '<!-- TAB 3: RULES -->' +
                '<div class="tab-content" id="tab-elective-rules">' +
                '  <div class="card">' +
                '    <div class="card-header"><h3><i class="fa-solid fa-book-open"></i> Quy định môn học & Quy chế tích lũy tín chỉ</h3></div>' +
                '    <div class="card-body">' +
                '      <div class="detail-grid mb-3" id="dkNhomTuChon"><p class="text-muted">Đang tải nhóm tự chọn...</p></div>' +
                '      <div class="card p-3" style="background:#f8fafc; border:1px solid var(--border-color);">' +
                '        <h4 style="font-size:0.95rem; font-weight:800; margin-bottom:6px;"><i class="fa-solid fa-circle-exclamation" style="color:var(--primary);"></i> Giới hạn đăng ký & Điều kiện tốt nghiệp:</h4>' +
                '        <ul style="padding-left:20px; font-size:0.88rem; color:var(--text-main); line-height:1.7;">' +
                '          <li>Số tín chỉ tối đa cho phép đăng ký trong một học kỳ là <strong>24 tín chỉ</strong></li>' +
                '          <li>Sinh viên chỉ được đăng ký các môn học thuộc chương trình đào tạo của khóa/chuyên ngành mình đang học</li>' +
                '          <li>Lớp <strong>Đang mở đăng ký</strong> thì sinh viên được hủy đăng ký; lớp <strong>Đóng đăng ký</strong> thì không hủy được</li>' +
                '        </ul>' +
                '      </div>' +
                '    </div>' +
                '  </div>' +
                '</div>';

            $('#contentArea').html(html);
            this.bindEvents();
            this.loadProfile();
            this.loadNhomTuChon();
            var self = this;
            // Năm học, học kỳ hiện hành lấy từ dữ liệu lớp học phần
            App.fillTermSelects('#selectHocKyDK', '#selectNamHocDK', { prefix: 'Năm học ' }, function () {
                self.loadAvailableList();
                self.loadRegisteredList();
            });
        },

        loadProfile: function () {
            Api.get('/api/taikhoan/me').done(function (res) {
                var u = res.data || {};
                $('#dkLopSinhHoat').text(u.ma_lop ? (u.ma_lop + ' - ' + u.ten_lop) : 'Chưa phân lớp');
                $('#dkChuongTrinh').text(u.ten_chuong_trinh || '—');
            });
        },

        // Nhóm tự chọn lấy từ CTĐT của sinh viên trong DB (không dùng dữ liệu cố định)
        loadNhomTuChon: function () {
            var box = $('#dkNhomTuChon');
            Api.get('/api/cocaudaotao/khung-chuong-trinh').done(function (res) {
                var ds = (res.data && res.data.nhom_tu_chon) || [];
                if (!ds.length) {
                    box.html('<p class="text-muted">Chương trình đào tạo của bạn chưa có nhóm môn tự chọn.</p>');
                    return;
                }
                box.html(ds.map(function (n) {
                    var mons = (n.mon_hoc || []).map(function (m) {
                        return App.escapeHtml(m.ten_mon_hoc) + ' (' + App.escapeHtml(m.ma_mon_hoc) + ')';
                    }).join(', ') || 'Chưa có môn';
                    return '<div class="card p-3" style="border:1.5px solid #bfdbfe; background:#eff6ff;">' +
                        '<h4 style="color:#1d4ed8; font-weight:800; margin-bottom:4px;"><i class="fa-solid fa-layer-group"></i> ' + App.escapeHtml(n.ten_nhom || n.ma_nhom) + '</h4>' +
                        '<p style="font-size:0.9rem;">Yêu cầu tối thiểu: <strong>' + (parseInt(n.so_tin_chi_toi_thieu, 10) || 0) + ' tín chỉ</strong> · Đã đạt: <strong>' + (parseInt(n.tin_chi_da_dat, 10) || 0) + ' TC</strong></p>' +
                        '<small class="text-muted">Các môn: ' + mons + '</small>' +
                        '</div>';
                }).join(''));
            }).fail(function () {
                box.html('<p class="text-muted">Không tải được nhóm tự chọn.</p>');
            });
        },

        bindEvents: function () {
            var self = this;

            $('.tab-btn').on('click', function () {
                var tab = $(this).data('tab');
                $('.tab-btn').removeClass('active');
                $(this).addClass('active');
                $('.tab-content').removeClass('active');
                $('#tab-' + tab).addClass('active');
                self.currentTab = tab;

                if (tab === 'available') self.loadAvailableList();
                if (tab === 'registered') self.loadRegisteredList();
            });

            $('#searchAvailableLHP, #selectHocKyDK, #selectNamHocDK').on('change input', function () {
                self.loadAvailableList();
            });

            $(document).off('click', '.btn-dang-ky-lhp').on('click', '.btn-dang-ky-lhp', function () {
                var lhpId = $(this).data('id');
                self.registerLHP(lhpId);
            });

            $(document).off('click', '.btn-huy-dang-ky').on('click', '.btn-huy-dang-ky', function () {
                var dkId = $(this).data('id');
                self.cancelRegistration(dkId);
            });
        },

        loadAvailableList: function () {
            var self = this;
            var currentUser = App.getCurrentUser();
            var hk = parseInt($('#selectHocKyDK').val(), 10) || 1;
            var namHoc = $('#selectNamHocDK').val() || '';
            var kw = ($('#searchAvailableLHP').val() || '').trim();

            $.ajax({
                url: '/api/dangkyhocphan/available',
                method: 'GET',
                headers: self.getAuthHeaders(),
                dataType: 'json',
                data: {
                    hoc_ky: hk,
                    nam_hoc: namHoc,
                    search: kw
                }
            })
            .done(function (res) {
                var allLHP = (res && res.data) ? res.data : [];
                $('#availableCount').text(allLHP.length + ' lớp học phần');
                // Chỉ hiển thị học phần thuộc khoa của sinh viên (backend lọc)
                $('#dkKhoa').text(res.khoa ? res.khoa.ten_khoa : 'Chưa xác định');

                var tbody = $('#availableTableBody');
                tbody.empty();

                if (allLHP.length === 0) {
                    tbody.html('<tr><td colspan="9" class="text-center text-muted py-4">' + App.escapeHtml(res.message || 'Không có lớp học phần nào của khoa bạn mở cho học kỳ này') + '</td></tr>');
                    return;
                }

                allLHP.forEach(function (l) {
                    var currentSiSo = l.si_so_hien_tai || 0;
                    var isFull = l.is_full;
                    var isRegistered = l.is_registered;
                    var isOpenTime = (l.is_open_time !== false);

                    var lichList = l.lich_hoc || [];
                    var lichStr = lichList.map(function (lh) {
                        return App.thuLabel(lh.thu) + ' (T' + lh.tiet_bat_dau + '-' + lh.tiet_ket_thuc + ')';
                    }).join('<br>') || '—';

                    var actionBtn = '';
                    if (isRegistered) {
                        actionBtn = '<span class="badge badge-success"><i class="fa-solid fa-check"></i> Đã đăng ký</span>';
                    } else if (!isOpenTime) {
                        // RULE-08: chỉ 2 trạng thái - ngoài thời gian mở (kể cả chưa thiết lập / đã hết hạn) là Đóng đăng ký
                        actionBtn = '<span class="badge badge-secondary"><i class="fa-solid fa-lock"></i> Đóng đăng ký</span>';
                    } else if (isFull) {
                        actionBtn = '<span class="badge badge-danger"><i class="fa-solid fa-user-xmark"></i> Lớp đã đầy</span>';
                    } else {
                        actionBtn = '<button class="btn btn-sm btn-primary btn-dang-ky-lhp" data-id="' + l.id + '"><i class="fa-solid fa-plus"></i> Đăng ký</button>';
                    }

                    var hanStr = (l.thoi_gian_mo_dang_ky && l.thoi_gian_dong_dang_ky)
                        ? '<small>' + App.formatDate(l.thoi_gian_mo_dang_ky) + ' → ' + App.formatDate(l.thoi_gian_dong_dang_ky) + '</small>'
                        : '<span class="text-muted">—</span>';

                    var row =
                        '<tr>' +
                        '  <td><strong>' + App.escapeHtml(l.ma_lop_hoc_phan) + '</strong></td>' +
                        '  <td>' + App.escapeHtml(l.ten_mon_hoc || '—') + '</td>' +
                        '  <td class="text-center font-bold">' + (l.so_tin_chi || 0) + '</td>' +
                        '  <td>' + (l.ten_giang_vien ? App.escapeHtml(l.ten_giang_vien) : 'Chưa phân công') + '</td>' +
                        '  <td>' + App.escapeHtml(l.phong_hoc || '—') + '</td>' +
                        '  <td><small>' + lichStr + '</small></td>' +
                        '  <td>' + hanStr + '</td>' +
                        '  <td class="text-center ' + (isFull ? 'text-danger text-bold' : '') + '">' + currentSiSo + ' / ' + l.si_so_toi_da + '</td>' +
                        '  <td class="text-center">' + actionBtn + '</td>' +
                        '</tr>';
                    tbody.append(row);
                });
            })
            .fail(function (xhr) {
                var msg = Api.errorMessage(xhr, 'Lỗi tải danh sách lớp học phần');
                App.showToast(msg, 'error');
            });
        },

        loadRegisteredList: function () {
            var self = this;
            var currentUser = App.getCurrentUser();
            if (!currentUser) return;

            $.ajax({
                url: '/api/dangkyhocphan/registered',
                method: 'GET',
                headers: self.getAuthHeaders(),
                dataType: 'json',
                data: {}
            })
            .done(function (res) {
                var dks = (res && res.data) ? res.data : [];
                var activeDKs = dks.filter(function (d) { return d.trang_thai_dk === 'Đã đăng ký' || d.trang_thai_dk === 'da_dang_ky'; });
                $('#registeredCountBadge').text(activeDKs.length);

                var totalTC = res.total_credits || 0;
                var tbody = $('#registeredTableBody');
                tbody.empty();

                if (dks.length === 0) {
                    tbody.html('<tr><td colspan="10" class="text-center text-muted py-4">Bạn chưa đăng ký môn học nào</td></tr>');
                    $('#statRegisteredTC').html('<i class="fa-solid fa-book"></i> Đã đăng ký: 0 Tín chỉ');
                    return;
                }

                dks.forEach(function (dk, idx) {
                    var lichList = dk.lich_hoc || [];
                    var lichStr = lichList.map(function (lh) {
                        return App.thuLabel(lh.thu) + ' (T' + lh.tiet_bat_dau + '-' + lh.tiet_ket_thuc + ')';
                    }).join(', ') || '—';

                    var isRegistered = (dk.trang_thai_dk === 'Đã đăng ký' || dk.trang_thai_dk === 'da_dang_ky');
                    var actionBtn = '';
                    if (isRegistered && dk.co_the_huy !== false) {
                        actionBtn = '<button class="btn btn-sm btn-outline btn-huy-dang-ky text-danger" data-id="' + dk.dang_ky_id + '"><i class="fa-solid fa-xmark"></i> Hủy ĐK</button>';
                    } else if (isRegistered) {
                        // RULE-08: không hủy được -> nêu rõ lý do thay vì để nút bấm rồi mới báo lỗi
                        actionBtn = '<span class="badge badge-secondary" title="' + App.escapeHtml(dk.ly_do_khong_huy || '') + '"><i class="fa-solid fa-lock"></i> Không thể hủy</span>' +
                            '<br><small class="text-muted">' + App.escapeHtml(dk.ly_do_khong_huy || '') + '</small>';
                    } else {
                        actionBtn = '<span class="text-muted">—</span>';
                    }

                    var row =
                        '<tr>' +
                        '  <td class="text-center">' + (idx + 1) + '</td>' +
                        '  <td><strong>' + App.escapeHtml(dk.ma_lop_hoc_phan || '—') + '</strong></td>' +
                        '  <td>' + App.escapeHtml(dk.ten_mon_hoc || '—') + '</td>' +
                        '  <td class="text-center">' + (dk.so_tin_chi || 0) + '</td>' +
                        '  <td>' + (dk.ten_giang_vien ? App.escapeHtml(dk.ten_giang_vien) : '—') + '</td>' +
                        '  <td>' + App.escapeHtml(dk.phong_hoc || '—') + '</td>' +
                        '  <td><small>' + lichStr + '</small></td>' +
                        '  <td><small>' + App.formatDateTime(dk.ngay_dang_ky) + '</small></td>' +
                        '  <td class="text-center">' + App.trangThaiDKBadge(dk.trang_thai_dk) + '</td>' +
                        '  <td class="text-center">' + actionBtn + '</td>' +
                        '</tr>';
                    tbody.append(row);
                });

                $('#statRegisteredTC').html('<i class="fa-solid fa-book"></i> Đã đăng ký: ' + totalTC + ' Tín chỉ');
            })
            .fail(function (xhr) {
                var msg = Api.errorMessage(xhr, 'Lỗi tải danh sách môn đã đăng ký');
                App.showToast(msg, 'error');
            });
        },

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
