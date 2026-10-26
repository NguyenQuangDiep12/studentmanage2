/* ================================================================
   MON-HOC.JS - Quản lý môn học
   Thêm, sửa, xóa, tìm kiếm môn học, kiểm tra ràng buộc toàn vẹn
   Font Awesome icons, XSS protection, phân quyền chuẩn
   ================================================================ */

(function ($) {
    'use strict';

    var MonHocModule = {
        render: function () {
            var currentUser = App.getCurrentUser();
            // Nghiệp vụ: Chỉ Admin mới được thêm/sửa/xóa môn học. Giảng viên tra cứu môn học.
            var isAdmin = currentUser && currentUser.vai_tro === 'admin';

            var html =
                '<div class="card">' +
                '  <div class="card-header">' +
                '    <h3><i class="fa-solid fa-book-bookmark" style="color:var(--primary);"></i> Danh mục môn học</h3>' +
                (isAdmin ? '    <button class="btn btn-primary" id="btnThemMonHoc"><i class="fa-solid fa-plus"></i> Thêm môn học</button>' : '') +
                '  </div>' +
                '  <div class="card-body">' +
                '    <div class="toolbar">' +
                '      <div class="toolbar-left">' +
                '        <div class="search-box">' +
                '          <i class="fa-solid fa-magnifying-glass search-icon"></i>' +
                '          <input type="text" id="searchMonHoc" placeholder="Tìm theo mã hoặc tên môn">' +
                '        </div>' +
                '        <select id="filterTrangThaiMH" class="filter-select">' +
                '          <option value="">-- Tất cả trạng thái --</option>' +
                '          <option value="Hoạt động">Hoạt động</option>' +
                '          <option value="Tạm ngưng">Tạm ngưng</option>' +
                '        </select>' +
                '      </div>' +
                '      <div class="toolbar-right">' +
                '        <span class="text-muted" id="totalMonHocCount">Tổng số: 0 môn học</span>' +
                '      </div>' +
                '    </div>' +
                '    <div class="table-responsive">' +
                '      <table class="data-table" id="tableMonHoc">' +
                '        <thead>' +
                '          <tr>' +
                '            <th>STT</th>' +
                '            <th>Mã môn</th>' +
                '            <th>Tên môn học</th>' +
                '            <th class="text-center">Số tín chỉ</th>' +
                '            <th class="text-center">Số tiết</th>' +
                '            <th>Mô tả môn học</th>' +
                '            <th class="text-center">Trạng thái</th>' +
                (isAdmin ? '            <th class="text-center">Thao tác</th>' : '') +
                '          </tr>' +
                '        </thead>' +
                '        <tbody id="monHocTableBody">' +
                '        </tbody>' +
                '      </table>' +
                '    </div>' +
                '  </div>' +
                '</div>';

            $('#contentArea').html(html);
            this.bindEvents();
            this.loadData();
        },

        bindEvents: function () {
            var self = this;

            $('#searchMonHoc, #filterTrangThaiMH').on('input change', function () {
                self.loadData();
            });

            $('#btnThemMonHoc').on('click', function () {
                self.showFormModal();
            });

            $(document).off('click', '.btn-edit-mh').on('click', '.btn-edit-mh', function () {
                var id = $(this).data('id');
                self.showFormModal(id);
            });

            $(document).off('click', '.btn-del-mh').on('click', '.btn-del-mh', function () {
                var id = $(this).data('id');
                self.deleteMonHoc(id);
            });

            $(document).off('click', '#btnSaveMonHoc').on('click', '#btnSaveMonHoc', function () {
                self.saveMonHoc();
            });
        },

        loadData: function () {
            var currentUser = App.getCurrentUser();
            var isAdmin = currentUser && currentUser.vai_tro === 'admin';

            var keyword = ($('#searchMonHoc').val() || '').toLowerCase().trim();
            var statusFilter = $('#filterTrangThaiMH').val();

            $.ajax({
                url: '/api/monhoc',
                method: 'GET',
                dataType: 'json',
                success: function (response) {
                    console.log('Dữ liệu môn học:', response);
                },
                error: function (xhr) {
                    console.error('Lỗi lấy danh sách môn học:', xhr.responseText);
                }
            });

            if (statusFilter) {
                list = list.filter(function (m) {
                    return m.trang_thai === statusFilter;
                });
            }

            if (keyword) {
                list = list.filter(function (m) {
                    return (m.ma_mon_hoc && m.ma_mon_hoc.toLowerCase().indexOf(keyword) !== -1) ||
                           (m.ten_mon_hoc && m.ten_mon_hoc.toLowerCase().indexOf(keyword) !== -1);
                });
            }

            $('#totalMonHocCount').text('Tổng số: ' + list.length + ' môn học');

            var tbody = $('#monHocTableBody');
            tbody.empty();

            if (list.length === 0) {
                var colSpan = isAdmin ? 8 : 7;
                tbody.html('<tr><td colspan="' + colSpan + '" class="text-center text-muted py-4">Không tìm thấy môn học nào</td></tr>');
                return;
            }

            list.forEach(function (mh, index) {
                var statusBadge = mh.trang_thai === 'Hoạt động'
                    ? '<span class="badge badge-success"><i class="fa-solid fa-check"></i> Hoạt động</span>'
                    : '<span class="badge badge-danger"><i class="fa-solid fa-pause"></i> Tạm ngưng</span>';

                var row =
                    '<tr>' +
                    '  <td class="text-center">' + (index + 1) + '</td>' +
                    '  <td><strong>' + App.escapeHtml(mh.ma_mon_hoc) + '</strong></td>' +
                    '  <td>' + App.escapeHtml(mh.ten_mon_hoc) + '</td>' +
                    '  <td class="text-center">' + mh.so_tin_chi + '</td>' +
                    '  <td class="text-center">' + (mh.so_tiet || (mh.so_tin_chi * 15)) + '</td>' +
                    '  <td><small>' + App.escapeHtml(mh.mo_ta || '—') + '</small></td>' +
                    '  <td class="text-center">' + statusBadge + '</td>' +
                    (isAdmin ?
                    '  <td class="text-center">' +
                    '    <div class="table-actions">' +
                    '      <button class="btn btn-sm btn-outline btn-edit-mh" data-id="' + mh.id + '" title="Sửa môn học"><i class="fa-solid fa-pen"></i></button>' +
                    '      <button class="btn btn-sm btn-outline btn-del-mh text-danger" data-id="' + mh.id + '" title="Xóa môn học"><i class="fa-solid fa-trash"></i></button>' +
                    '    </div>' +
                    '  </td>' : '') +
                    '</tr>';
                tbody.append(row);
            });
        },

        showFormModal: function (id) {
            var mh = id ? MockDB.mon_hoc.getById(id) : null;
            var isEdit = !!mh;

            var html =
                '<div class="modal-header">' +
                '  <h3><i class="fa-solid ' + (isEdit ? 'fa-pen' : 'fa-plus') + '"></i> ' + (isEdit ? 'Cập nhật môn học' : 'Thêm môn học mới') + '</h3>' +
                '  <button class="modal-close" onclick="App.closeModal()">&times;</button>' +
                '</div>' +
                '<div class="modal-body">' +
                '  <input type="hidden" id="mhId" value="' + (mh ? mh.id : '') + '">' +
                '  <div class="form-row">' +
                '    <div class="form-group">' +
                '      <label>Mã môn học <span class="required">*</span></label>' +
                '      <input type="text" class="form-control" id="mhMa" value="' + (mh ? App.escapeHtml(mh.ma_mon_hoc) : '') + '" placeholder="VD: CS101" ' + (isEdit ? 'readonly' : '') + '>' +
                '    </div>' +
                '    <div class="form-group">' +
                '      <label>Số tín chỉ <span class="required">*</span></label>' +
                '      <input type="number" min="1" max="10" class="form-control" id="mhSoTinChi" value="' + (mh ? mh.so_tin_chi : '3') + '">' +
                '    </div>' +
                '  </div>' +
                '  <div class="form-row">' +
                '    <div class="form-group">' +
                '      <label>Tên môn học <span class="required">*</span></label>' +
                '      <input type="text" class="form-control" id="mhTen" value="' + (mh ? App.escapeHtml(mh.ten_mon_hoc) : '') + '" placeholder="VD: Lập trình Cơ bản">' +
                '    </div>' +
                '    <div class="form-group">' +
                '      <label>Số tiết</label>' +
                '      <input type="number" min="0" class="form-control" id="mhSoTiet" value="' + (mh ? mh.so_tiet : '45') + '">' +
                '    </div>' +
                '  </div>' +
                '  <div class="form-group">' +
                '    <label>Trạng thái</label>' +
                '    <select class="form-control" id="mhTrangThai">' +
                '      <option value="Hoạt động" ' + (mh && mh.trang_thai === 'Hoạt động' ? 'selected' : '') + '>Hoạt động</option>' +
                '      <option value="Tạm ngưng" ' + (mh && mh.trang_thai === 'Tạm ngưng' ? 'selected' : '') + '>Tạm ngưng</option>' +
                '    </select>' +
                '  </div>' +
                '  <div class="form-group">' +
                '    <label>Mô tả môn học</label>' +
                '    <textarea class="form-control" id="mhMoTa" rows="3" placeholder="Nhập mô tả chi tiết...">' + (mh ? App.escapeHtml(mh.mo_ta || '') : '') + '</textarea>' +
                '  </div>' +
                '</div>' +
                '<div class="modal-footer">' +
                '  <button class="btn btn-outline" onclick="App.closeModal()">Hủy</button>' +
                '  <button class="btn btn-primary" id="btnSaveMonHoc"><i class="fa-solid fa-floppy-disk"></i> Lưu môn học</button>' +
                '</div>';

            App.showModal(html, 'lg');
        },

        saveMonHoc: function () {
            var id = $('#mhId').val();
            var ma = $('#mhMa').val().trim().toUpperCase();
            var ten = $('#mhTen').val().trim();
            var stc = parseInt($('#mhSoTinChi').val(), 10);
            var soTiet = parseInt($('#mhSoTiet').val(), 10) || (stc * 15);
            var trangThai = $('#mhTrangThai').val();
            var moTa = $('#mhMoTa').val().trim();

            if (!ma || !ten || isNaN(stc) || stc <= 0) {
                App.showToast('Vui lòng điền đầy đủ mã môn, tên môn và số tín chỉ hợp lệ!', 'error');
                return;
            }

            var allMH = MockDB.mon_hoc.getAll();

            if (id) {
                MockDB.mon_hoc.update(parseInt(id, 10), {
                    ten_mon_hoc: ten,
                    so_tin_chi: stc,
                    so_tiet: soTiet,
                    trang_thai: trangThai,
                    mo_ta: moTa
                });
                App.showToast('Cập nhật môn học thành công!', 'success');
            } else {
                var duplicate = allMH.some(function (m) {
                    return m.ma_mon_hoc.toUpperCase() === ma;
                });
                if (duplicate) {
                    App.showToast('Mã môn học "' + ma + '" đã tồn tại trong hệ thống!', 'error');
                    return;
                }

                MockDB.mon_hoc.create({
                    ma_mon_hoc: ma,
                    ten_mon_hoc: ten,
                    so_tin_chi: stc,
                    so_tiet: soTiet,
                    trang_thai: trangThai,
                    mo_ta: moTa
                });
                App.showToast('Thêm môn học mới thành công!', 'success');
            }

            App.closeModal();
            this.loadData();
        },

        deleteMonHoc: function (id) {
            var self = this;
            var mh = MockDB.mon_hoc.getById(id);
            if (!mh) return;

            // Ràng buộc 1: Kiểm tra xem môn học đã có lớp học phần nào chưa
            var countLHP = MockDB.lop_hoc_phan.getAll({ mon_hoc_id: id }).length;
            if (countLHP > 0) {
                App.showToast('Không thể xóa! Đang có ' + countLHP + ' lớp học phần sử dụng môn học này - Hãy chuyển trạng thái sang Tạm ngưng', 'error');
                return;
            }

            // Ràng buộc 2: Kiểm tra xem môn học có trong CTĐT nào không
            var countCTDT = MockDB.chi_tiet_chuong_trinh.getAll({ mon_hoc_id: id }).length;
            if (countCTDT > 0) {
                App.showToast('Không thể xóa! Môn học đang nằm trong khung chương trình đào tạo', 'warning');
                return;
            }

            // Ràng buộc 3: Kiểm tra xem môn học có trong nhóm tự chọn nào không (Khắc phục lỗi bỏ sót)
            var countNTC = MockDB.chi_tiet_nhom_tu_chon.getAll({ mon_hoc_id: id }).length;
            if (countNTC > 0) {
                App.showToast('Không thể xóa! Môn học đang nằm trong danh mục nhóm tự chọn', 'warning');
                return;
            }

            App.confirm('Bạn có chắc chắn muốn xóa môn học <strong>' + App.escapeHtml(mh.ma_mon_hoc) + ' - ' + App.escapeHtml(mh.ten_mon_hoc) + '</strong>?', function () {
                MockDB.mon_hoc.remove(id);
                App.showToast('Đã xóa môn học thành công!', 'success');
                self.loadData();
            });
        }
    };

    App.registerModule('mon-hoc', MonHocModule);
})(jQuery);
