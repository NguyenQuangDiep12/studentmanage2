/* ================================================================
   DANG-KY.JS - Quản lý đăng ký học phần cho sinh viên
   Kiểm tra thời hạn mở/đóng, sĩ số, trùng lịch, giới hạn tín chỉ (≤24 TC)
   Ràng buộc chuẩn môn bắt buộc trong CTĐT & thứ tự môn tự chọn (A -> B -> C)
   Font Awesome icons, XSS protection
   ================================================================ */

(function ($) {
    'use strict';

    var DangKyModule = {
        currentTab: 'available',

        render: function () {
            var currentUser = App.getCurrentUser();
            if (!currentUser || currentUser.vai_tro !== 'sinh_vien') {
                $('#contentArea').html('<div class="alert alert-danger"><i class="fa-solid fa-triangle-exclamation"></i> Trang này chỉ dành cho sinh viên</div>');
                return;
            }

            var lsv = currentUser.lop_sinh_vien_id ? MockDB.lop_sinh_vien.getById(currentUser.lop_sinh_vien_id) : null;
            var ctdt = lsv ? MockDB.chuong_trinh_dao_tao.getById(lsv.chuong_trinh_id) : null;

            var html =
                '<div class="card mb-3">' +
                '  <div class="card-body">' +
                '    <div class="d-flex justify-between align-center" style="flex-wrap:wrap; gap:12px;">' +
                '      <div>' +
                '        <h3 style="font-size:1.25rem; font-weight:800; margin-bottom:4px;">' +
                '          <i class="fa-solid fa-user-graduate" style="color:var(--primary);"></i> ' + App.escapeHtml(currentUser.ho_ten) + ' (' + App.escapeHtml(currentUser.ma_dinh_danh) + ')' +
                '        </h3>' +
                '        <p style="font-size:0.88rem; color:var(--text-muted);">' +
                '          Lớp sinh hoạt: <strong>' + (lsv ? App.escapeHtml(lsv.ma_lop + ' - ' + lsv.ten_lop) : 'Chưa phân lớp') + '</strong> | ' +
                '          Chương trình: <strong>' + (ctdt ? App.escapeHtml(ctdt.ten_chuong_trinh) : 'Chưa gán') + '</strong>' +
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
                '            <option value="1" selected>Học kỳ 1</option>' +
                '            <option value="2">Học kỳ 2</option>' +
                '            <option value="3">Học kỳ Hè</option>' +
                '          </select>' +
                '          <select id="selectNamHocDK" class="filter-select">' +
                '            <option value="2026-2027" selected>Năm học 2026-2027</option>' +
                '            <option value="2025-2026">Năm học 2025-2026</option>' +
                '            <option value="2024-2025">Năm học 2024-2025</option>' +
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
                '      <div class="detail-grid mb-3">' +
                '        <div class="card p-3" style="border:1.5px solid #bfdbfe; background:#eff6ff;">' +
                '          <h4 style="color:#1d4ed8; font-weight:800; margin-bottom:4px;"><i class="fa-solid fa-layer-group"></i> Nhóm tự chọn A</h4>' +
                '          <p style="font-size:0.9rem;">Yêu cầu hoàn thành tối thiểu: <strong>6 tín chỉ</strong></p>' +
                '          <small class="text-muted">Các môn: Trí tuệ nhân tạo (CS303), An toàn thông tin (CS304)</small>' +
                '        </div>' +
                '        <div class="card p-3" style="border:1.5px solid #fde68a; background:#fffbeb;">' +
                '          <h4 style="color:#b45309; font-weight:800; margin-bottom:4px;"><i class="fa-solid fa-layer-group"></i> Nhóm tự chọn B</h4>' +
                '          <p style="font-size:0.9rem;">Yêu cầu hoàn thành tối thiểu: <strong>9 tín chỉ</strong></p>' +
                '          <small class="text-muted">Điều kiện: Phải tích lũy đạt đủ 6 TC Nhóm A trước khi đăng ký Nhóm B</small>' +
                '        </div>' +
                '        <div class="card p-3" style="border:1.5px solid #bbf7d0; background:#f0fdf4;">' +
                '          <h4 style="color:#15803d; font-weight:800; margin-bottom:4px;"><i class="fa-solid fa-layer-group"></i> Nhóm tự chọn C</h4>' +
                '          <p style="font-size:0.9rem;">Yêu cầu hoàn thành tối thiểu: <strong>9 tín chỉ</strong></p>' +
                '          <small class="text-muted">Điều kiện: Phải hoàn thành xong cả Nhóm A và Nhóm B trước khi đăng ký Nhóm C</small>' +
                '        </div>' +
                '      </div>' +
                '      <div class="card p-3" style="background:#f8fafc; border:1px solid var(--border-color);">' +
                '        <h4 style="font-size:0.95rem; font-weight:800; margin-bottom:6px;"><i class="fa-solid fa-circle-exclamation" style="color:var(--primary);"></i> Giới hạn đăng ký & Điều kiện tốt nghiệp:</h4>' +
                '        <ul style="padding-left:20px; font-size:0.88rem; color:var(--text-main); line-height:1.7;">' +
                '          <li>Số tín chỉ tối đa cho phép đăng ký trong một học kỳ là <strong>24 tín chỉ</strong></li>' +
                '          <li>Sinh viên chỉ được đăng ký các môn học thuộc chương trình đào tạo của khóa/chuyên ngành mình đang học</li>' +
                '          <li>Sinh viên chỉ có thể hủy đăng ký trong thời gian mở đăng ký và khi lớp học chưa diễn ra điểm danh hoặc nhập điểm</li>' +
                '        </ul>' +
                '      </div>' +
                '    </div>' +
                '  </div>' +
                '</div>';

            $('#contentArea').html(html);
            this.bindEvents();
            this.loadAvailableList();
            this.loadRegisteredList();
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
            var currentUser = App.getCurrentUser();
            var hk = parseInt($('#selectHocKyDK').val(), 10);
            var namHoc = $('#selectNamHocDK').val();
            var kw = ($('#searchAvailableLHP').val() || '').toLowerCase().trim();

            var allLHP = MockDB.lop_hoc_phan.getAll({
                hoc_ky: hk,
                nam_hoc: namHoc,
                trang_thai: 'Đang mở'
            });

            if (kw) {
                allLHP = allLHP.filter(function (l) {
                    var mh = MockDB.mon_hoc.getById(l.mon_hoc_id);
                    var gv = l.giang_vien_user_id ? MockDB.users.getById(l.giang_vien_user_id) : null;
                    return (l.ma_lop_hoc_phan && l.ma_lop_hoc_phan.toLowerCase().indexOf(kw) !== -1) ||
                           (mh && mh.ten_mon_hoc.toLowerCase().indexOf(kw) !== -1) ||
                           (gv && gv.ho_ten.toLowerCase().indexOf(kw) !== -1);
                });
            }

            $('#availableCount').text(allLHP.length + ' lớp học phần');

            var myDkList = MockDB.dang_ky_hoc_phan.getAll({
                sinh_vien_user_id: currentUser.id,
                trang_thai: 'Đã đăng ký'
            });
            var myRegisteredLhpIds = myDkList.map(function (d) { return d.lop_hoc_phan_id; });

            var tbody = $('#availableTableBody');
            tbody.empty();

            if (allLHP.length === 0) {
                tbody.html('<tr><td colspan="9" class="text-center text-muted py-4">Không có lớp học phần nào mở cho học kỳ này</td></tr>');
                return;
            }

            allLHP.forEach(function (l) {
                var mh = MockDB.mon_hoc.getById(l.mon_hoc_id);
                var gv = l.giang_vien_user_id ? MockDB.users.getById(l.giang_vien_user_id) : null;
                var currentSiSo = MockDB.getSiSoHienTai(l.id);
                var isFull = currentSiSo >= l.si_so_toi_da;
                var isRegistered = myRegisteredLhpIds.indexOf(l.id) !== -1;

                // Check registration window
                var now = new Date();
                var isOpenTime = true;
                if (l.thoi_gian_mo_dang_ky && new Date(l.thoi_gian_mo_dang_ky) > now) isOpenTime = false;
                if (l.thoi_gian_dong_dang_ky && new Date(l.thoi_gian_dong_dang_ky) < now) isOpenTime = false;

                var lichList = MockDB.lich_hoc.getAll({ lop_hoc_phan_id: l.id });
                var lichStr = lichList.map(function (lh) {
                    return App.thuLabel(lh.thu) + ' (T' + lh.tiet_bat_dau + '-' + lh.tiet_ket_thuc + ')';
                }).join('<br>') || '—';

                var actionBtn = '';
                if (isRegistered) {
                    actionBtn = '<span class="badge badge-success"><i class="fa-solid fa-check"></i> Đã đăng ký</span>';
                } else if (!isOpenTime) {
                    actionBtn = '<span class="badge badge-secondary"><i class="fa-solid fa-clock"></i> Ngoài hạn ĐK</span>';
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
                    '  <td>' + (mh ? App.escapeHtml(mh.ten_mon_hoc) : '—') + '</td>' +
                    '  <td class="text-center font-bold">' + (mh ? mh.so_tin_chi : 0) + '</td>' +
                    '  <td>' + (gv ? App.escapeHtml(gv.ho_ten) : 'Chưa phân công') + '</td>' +
                    '  <td>' + App.escapeHtml(l.phong_hoc || '—') + '</td>' +
                    '  <td><small>' + lichStr + '</small></td>' +
                    '  <td>' + hanStr + '</td>' +
                    '  <td class="text-center ' + (isFull ? 'text-danger text-bold' : '') + '">' + currentSiSo + ' / ' + l.si_so_toi_da + '</td>' +
                    '  <td class="text-center">' + actionBtn + '</td>' +
                    '</tr>';
                tbody.append(row);
            });
        },

        loadRegisteredList: function () {
            var currentUser = App.getCurrentUser();
            var dks = MockDB.dang_ky_hoc_phan.getAll({
                sinh_vien_user_id: currentUser.id
            });

            var activeDKs = dks.filter(function (d) { return d.trang_thai === 'Đã đăng ký'; });
            $('#registeredCountBadge').text(activeDKs.length);

            var totalTC = 0;
            var tbody = $('#registeredTableBody');
            tbody.empty();

            if (dks.length === 0) {
                tbody.html('<tr><td colspan="10" class="text-center text-muted py-4">Bạn chưa đăng ký môn học nào</td></tr>');
                $('#statRegisteredTC').html('<i class="fa-solid fa-book"></i> Đã đăng ký: 0 Tín chỉ');
                return;
            }

            dks.forEach(function (dk, idx) {
                var lhp = MockDB.lop_hoc_phan.getById(dk.lop_hoc_phan_id);
                var mh = lhp ? MockDB.mon_hoc.getById(lhp.mon_hoc_id) : null;
                var gv = lhp && lhp.giang_vien_user_id ? MockDB.users.getById(lhp.giang_vien_user_id) : null;

                if (dk.trang_thai === 'Đã đăng ký' && mh) {
                    totalTC += mh.so_tin_chi;
                }

                var lichList = lhp ? MockDB.lich_hoc.getAll({ lop_hoc_phan_id: lhp.id }) : [];
                var lichStr = lichList.map(function (lh) {
                    return App.thuLabel(lh.thu) + ' (T' + lh.tiet_bat_dau + '-' + lh.tiet_ket_thuc + ')';
                }).join(', ') || '—';

                var actionBtn = '';
                if (dk.trang_thai === 'Đã đăng ký') {
                    actionBtn = '<button class="btn btn-sm btn-outline btn-huy-dang-ky text-danger" data-id="' + dk.id + '"><i class="fa-solid fa-xmark"></i> Hủy ĐK</button>';
                } else {
                    actionBtn = '<span class="text-muted">—</span>';
                }

                var row =
                    '<tr>' +
                    '  <td class="text-center">' + (idx + 1) + '</td>' +
                    '  <td><strong>' + (lhp ? App.escapeHtml(lhp.ma_lop_hoc_phan) : '—') + '</strong></td>' +
                    '  <td>' + (mh ? App.escapeHtml(mh.ten_mon_hoc) : '—') + '</td>' +
                    '  <td class="text-center">' + (mh ? mh.so_tin_chi : 0) + '</td>' +
                    '  <td>' + (gv ? App.escapeHtml(gv.ho_ten) : '—') + '</td>' +
                    '  <td>' + (lhp ? App.escapeHtml(lhp.phong_hoc || '—') : '—') + '</td>' +
                    '  <td><small>' + lichStr + '</small></td>' +
                    '  <td><small>' + App.formatDateTime(dk.ngay_dang_ky) + '</small></td>' +
                    '  <td class="text-center">' + App.trangThaiDKBadge(dk.trang_thai) + '</td>' +
                    '  <td class="text-center">' + actionBtn + '</td>' +
                    '</tr>';
                tbody.append(row);
            });

            $('#statRegisteredTC').html('<i class="fa-solid fa-book"></i> Đã đăng ký: ' + totalTC + ' Tín chỉ');
        },

        registerLHP: function (lhpId) {
            var self = this;
            var currentUser = App.getCurrentUser();
            var targetLHP = MockDB.lop_hoc_phan.getById(lhpId);
            if (!targetLHP) return;

            var targetMH = MockDB.mon_hoc.getById(targetLHP.mon_hoc_id);
            if (!targetMH) return;

            // 1. Kiểm tra môn học có đang hoạt động không
            if (targetMH.trang_thai === 'Tạm ngưng') {
                App.showToast('Môn học này đang trong trạng thái Tạm ngưng đào tạo!', 'error');
                return;
            }

            // 2. Kiểm tra môn học có thuộc CTĐT của sinh viên không
            var lsv = currentUser.lop_sinh_vien_id ? MockDB.lop_sinh_vien.getById(currentUser.lop_sinh_vien_id) : null;
            if (lsv && lsv.chuong_trinh_id) {
                var ctdtId = lsv.chuong_trinh_id;
                var isInRequired = MockDB.chi_tiet_chuong_trinh.getAll({ chuong_trinh_id: ctdtId, mon_hoc_id: targetMH.id }).length > 0;

                // Kiểm tra trong các nhóm tự chọn của CTĐT đó
                var myElectiveGroups = MockDB.nhom_tu_chon.getAll({ chuong_trinh_id: ctdtId });
                var isInElective = false;
                myElectiveGroups.forEach(function (g) {
                    var detail = MockDB.chi_tiet_nhom_tu_chon.getAll({ nhom_tu_chon_id: g.id, mon_hoc_id: targetMH.id });
                    if (detail.length > 0) isInElective = true;
                });

                if (!isInRequired && !isInElective) {
                    App.showToast('Môn học "' + targetMH.ten_mon_hoc + '" không nằm trong khung chương trình đào tạo của lớp bạn!', 'error');
                    return;
                }
            }

            // 3. Kiểm tra thời hạn đăng ký
            var now = new Date();
            if (targetLHP.thoi_gian_mo_dang_ky && now < new Date(targetLHP.thoi_gian_mo_dang_ky)) {
                App.showToast('Chưa đến thời gian mở đăng ký lớp học phần này!', 'error');
                return;
            }
            if (targetLHP.thoi_gian_dong_dang_ky && now > new Date(targetLHP.thoi_gian_dong_dang_ky)) {
                App.showToast('Hạn đăng ký của lớp học phần này đã kết thúc!', 'error');
                return;
            }

            // 4. Kiểm tra sĩ số tối đa
            var currentSiSo = MockDB.getSiSoHienTai(lhpId);
            if (currentSiSo >= targetLHP.si_so_toi_da) {
                App.showToast('Đăng ký không thành công! Lớp học phần đã đủ sĩ số tối đa (' + targetLHP.si_so_toi_da + ').', 'error');
                return;
            }

            // 5. Kiểm tra giới hạn tín chỉ học kỳ (≤ 24 TC)
            var myActiveDks = MockDB.dang_ky_hoc_phan.getAll({
                sinh_vien_user_id: currentUser.id,
                trang_thai: 'Đã đăng ký'
            });

            var totalCurrentCredits = 0;
            myActiveDks.forEach(function (dk) {
                var l = MockDB.lop_hoc_phan.getById(dk.lop_hoc_phan_id);
                if (l && l.hoc_ky === targetLHP.hoc_ky && l.nam_hoc === targetLHP.nam_hoc) {
                    var m = MockDB.mon_hoc.getById(l.mon_hoc_id);
                    if (m) totalCurrentCredits += m.so_tin_chi;
                }
            });

            if (totalCurrentCredits + targetMH.so_tin_chi > MockDB.QUY_CHE.tin_chi_toi_da_hoc_ky) {
                App.showToast('Vượt quá giới hạn đăng ký! Bạn đã đăng ký ' + totalCurrentCredits + ' TC (tối đa ' + MockDB.QUY_CHE.tin_chi_toi_da_hoc_ky + ' TC/kỳ)', 'error');
                return;
            }

            // 6. Kiểm tra trùng môn học trong kỳ
            for (var i = 0; i < myActiveDks.length; i++) {
                var exLhp = MockDB.lop_hoc_phan.getById(myActiveDks[i].lop_hoc_phan_id);
                if (exLhp && exLhp.hoc_ky === targetLHP.hoc_ky && exLhp.nam_hoc === targetLHP.nam_hoc) {
                    if (exLhp.mon_hoc_id === targetLHP.mon_hoc_id) {
                        App.showToast('Bạn đã đăng ký môn học này trong kỳ (' + exLhp.ma_lop_hoc_phan + ') rồi!', 'warning');
                        return;
                    }
                }
            }

            // 7. Kiểm tra TRÙNG LỊCH HỌC
            var targetLichList = MockDB.lich_hoc.getAll({ lop_hoc_phan_id: lhpId });
            var conflict = false;
            var conflictMsg = '';

            for (var j = 0; j < myActiveDks.length; j++) {
                var regLhp = MockDB.lop_hoc_phan.getById(myActiveDks[j].lop_hoc_phan_id);
                if (!regLhp) continue;
                var regLichList = MockDB.lich_hoc.getAll({ lop_hoc_phan_id: regLhp.id });

                targetLichList.forEach(function (tLich) {
                    regLichList.forEach(function (rLich) {
                        if (tLich.thu === rLich.thu) {
                            var periodOverlap = (tLich.tiet_bat_dau <= rLich.tiet_ket_thuc) && (tLich.tiet_ket_thuc >= rLich.tiet_bat_dau);
                            var dateOverlap = (tLich.ngay_bat_dau <= rLich.ngay_ket_thuc) && (tLich.ngay_ket_thuc >= rLich.ngay_bat_dau);

                            if (periodOverlap && dateOverlap) {
                                conflict = true;
                                conflictMsg = 'Trùng lịch vào ' + App.thuLabel(tLich.thu) + ' (Tiết ' + tLich.tiet_bat_dau + '-' + tLich.tiet_ket_thuc + ') với lớp ' + regLhp.ma_lop_hoc_phan + '!';
                            }
                        }
                    });
                });
                if (conflict) break;
            }

            if (conflict) {
                App.showToast('Không thể đăng ký: ' + conflictMsg, 'error');
                return;
            }

            // 8. Ràng buộc thứ tự nhóm môn tự chọn (A -> B -> C)
            var chiTietNTC = MockDB.chi_tiet_nhom_tu_chon.getAll({ mon_hoc_id: targetLHP.mon_hoc_id });
            if (chiTietNTC.length > 0) {
                var nhomTC = MockDB.nhom_tu_chon.getById(chiTietNTC[0].nhom_tu_chon_id);
                if (nhomTC) {
                    // Tính tín chỉ đã đạt ở các nhóm
                    var allMyDk = MockDB.dang_ky_hoc_phan.getAll({ sinh_vien_user_id: currentUser.id });

                    var getCreditsPassedInGroup = function (groupCode) {
                        var g = MockDB.nhom_tu_chon.getAll({ ma_nhom: groupCode })[0];
                        if (!g) return 0;
                        var mIds = MockDB.chi_tiet_nhom_tu_chon.getAll({ nhom_tu_chon_id: g.id }).map(function (c) { return c.mon_hoc_id; });
                        var tcPassed = 0;
                        allMyDk.forEach(function (dk) {
                            var l = MockDB.lop_hoc_phan.getById(dk.lop_hoc_phan_id);
                            if (l && mIds.indexOf(l.mon_hoc_id) !== -1) {
                                var d = MockDB.diem.getAll({ dang_ky_id: dk.id })[0];
                                if (d && d.ket_qua === 'Đạt') {
                                    var m = MockDB.mon_hoc.getById(l.mon_hoc_id);
                                    if (m) tcPassed += m.so_tin_chi;
                                }
                            }
                        });
                        return tcPassed;
                    };

                    var tcPassedA = getCreditsPassedInGroup('NTC-A');
                    var tcPassedB = getCreditsPassedInGroup('NTC-B');

                    // Điều kiện vào nhóm B: phải xong nhóm A (≥ 6 TC)
                    if (nhomTC.ma_nhom === 'NTC-B' && tcPassedA < 6) {
                        App.showToast('Bạn cần hoàn thành tối thiểu 6 TC Nhóm tự chọn A trước khi đăng ký môn thuộc Nhóm B (hiện đạt ' + tcPassedA + '/6 TC)!', 'warning');
                        return;
                    }

                    // Điều kiện vào nhóm C: phải xong cả nhóm A (≥ 6 TC) và nhóm B (≥ 9 TC)
                    if (nhomTC.ma_nhom === 'NTC-C') {
                        if (tcPassedA < 6 || tcPassedB < 9) {
                            App.showToast('Bạn cần hoàn thành cả Nhóm A (≥6 TC) và Nhóm B (≥9 TC) trước khi đăng ký môn thuộc Nhóm C (hiện đạt Nhóm A: ' + tcPassedA + '/6 TC, Nhóm B: ' + tcPassedB + '/9 TC)!', 'warning');
                            return;
                        }
                    }
                }
            }

            // HỢP LỆ -> Thực hiện đăng ký
            var existingHistory = MockDB.dang_ky_hoc_phan.getAll({
                sinh_vien_user_id: currentUser.id,
                lop_hoc_phan_id: lhpId
            });

            if (existingHistory.length > 0) {
                MockDB.dang_ky_hoc_phan.update(existingHistory[0].id, {
                    trang_thai: 'Đã đăng ký',
                    ngay_dang_ky: new Date().toISOString()
                });
                // Xóa điểm cũ nếu có để tránh tái hiện điểm cũ khi học lại/đăng ký lại
                var oldScore = MockDB.diem.getAll({ dang_ky_id: existingHistory[0].id });
                if (oldScore.length > 0) {
                    MockDB.diem.remove(oldScore[0].id);
                }
            } else {
                MockDB.dang_ky_hoc_phan.create({
                    sinh_vien_user_id: currentUser.id,
                    lop_hoc_phan_id: lhpId,
                    ngay_dang_ky: new Date().toISOString(),
                    thoi_gian_mo_dang_ky: targetLHP.thoi_gian_mo_dang_ky,
                    thoi_gian_dong_dang_ky: targetLHP.thoi_gian_dong_dang_ky,
                    trang_thai: 'Đã đăng ký'
                });
            }

            App.showToast('Đăng ký học phần ' + targetLHP.ma_lop_hoc_phan + ' thành công!', 'success');
            self.loadAvailableList();
            self.loadRegisteredList();
        },

        cancelRegistration: function (dkId) {
            var self = this;
            var dk = MockDB.dang_ky_hoc_phan.getById(dkId);
            if (!dk) return;

            var lhp = MockDB.lop_hoc_phan.getById(dk.lop_hoc_phan_id);
            var mh = lhp ? MockDB.mon_hoc.getById(lhp.mon_hoc_id) : null;

            // 1. Kiểm tra thời hạn hủy đăng ký
            var now = new Date();
            if (lhp && lhp.thoi_gian_dong_dang_ky && now > new Date(lhp.thoi_gian_dong_dang_ky)) {
                App.showToast('Không thể hủy đăng ký vì đã quá hạn cho phép đăng ký/hủy học phần!', 'error');
                return;
            }

            // 2. Kiểm tra lớp đã diễn ra điểm danh hoặc có điểm số chưa
            var hasAttendance = MockDB.diem_danh.getAll({ dang_ky_id: dkId }).length > 0;
            var hasGrades = MockDB.diem.getAll({ dang_ky_id: dkId }).length > 0;

            if (hasAttendance || hasGrades) {
                App.showToast('Không thể hủy đăng ký! Môn học này đã có dữ liệu điểm danh hoặc đã vào điểm', 'error');
                return;
            }

            App.confirm('Bạn có chắc chắn muốn hủy đăng ký lớp học phần <strong>' + (lhp ? App.escapeHtml(lhp.ma_lop_hoc_phan) : '') + ' - ' + (mh ? App.escapeHtml(mh.ten_mon_hoc) : '') + '</strong>?', function () {
                MockDB.dang_ky_hoc_phan.update(dkId, {
                    trang_thai: 'Đã hủy'
                });
                App.showToast('Đã hủy đăng ký thành công!', 'info');
                self.loadAvailableList();
                self.loadRegisteredList();
            });
        }
    };

    App.registerModule('dang-ky', DangKyModule);
})(jQuery);
