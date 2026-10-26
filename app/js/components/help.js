/* ================================================================
   COMPONENT: HƯỚNG DẪN NGHIỆP VỤ (nút "Hướng dẫn" trên tiêu đề trang)
   - Các bước thao tác theo từng trang và vai trò
   - Các RULE áp dụng: trích nguyên văn từ BUSINESS_RULES.md
   - Quy định bổ sung mà hệ thống đang áp dụng
   ================================================================ */

var HelpComponent = (function ($) {
    'use strict';

    var rulesCache = null;   // { 'RULE-12': { title, lines[] } }

    // ---------------- Nội dung hướng dẫn theo trang ----------------
    var GUIDES = {
        'dashboard': {
            steps: [
                'Các thẻ thống kê lấy số liệu trực tiếp từ cơ sở dữ liệu; bấm vào thẻ để mở trang quản lý tương ứng.',
                'Dùng menu bên trái để chuyển chức năng; mỗi trang đều có nút "Hướng dẫn" ở góc phải tiêu đề.',
                'Đổi mật khẩu ở nút "Đổi mật khẩu" trên thanh đầu trang; "Đăng xuất" sẽ hủy phiên đăng nhập.'
            ],
            rules: ['RULE-21', 'RULE-23', 'RULE-26']
        },
        'users-sv': {
            steps: [
                'Bấm "Thêm sinh viên", nhập Mã sinh viên (dùng để đăng nhập), họ tên, chọn lớp sinh hoạt (bắt buộc) rồi "Lưu thông tin".',
                'Tìm theo mã, họ tên, email; lọc theo lớp sinh hoạt và trạng thái.',
                '"Sửa" để cập nhật thông tin (không đổi được mã); "Khóa" / "Mở khóa" để chặn hoặc cho phép đăng nhập.',
                '"Đặt lại mật khẩu" đưa mật khẩu về mặc định 123456.'
            ],
            rules: ['RULE-21', 'RULE-24'],
            notes: [
                'Lớp sinh hoạt quyết định chương trình đào tạo và khoa của sinh viên, từ đó giới hạn các môn được đăng ký.',
                'Mã sinh viên không được trùng với bất kỳ tài khoản nào khác.'
            ]
        },
        'users-gv': {
            steps: [
                'Bấm "Thêm giảng viên", nhập Mã giảng viên (dùng để đăng nhập), họ tên, chọn khoa trực thuộc (bắt buộc).',
                '"Sửa", "Khóa" / "Mở khóa", "Đặt lại mật khẩu" tương tự hồ sơ sinh viên.',
                'Khi khóa giảng viên đang phụ trách lớp đang mở, hệ thống sẽ cảnh báo trước khi khóa.'
            ],
            rules: ['RULE-21', 'RULE-25']
        },
        'mon-hoc': {
            steps: [
                'Bấm "Thêm môn học" (quản trị viên hoặc giảng viên), nhập mã môn, tên môn, số tín chỉ lý thuyết, số tín chỉ thực hành (0 nếu không có), trạng thái rồi "Lưu môn học".',
                'Hệ thống tự tính và hiển thị loại môn, tổng tín chỉ, số tiết lý thuyết (TC × 18), số tiết thực hành (TC × 36) và tổng số tiết để kiểm tra trước khi lưu.',
                'Môn cũ chưa phân loại tín chỉ hiển thị "Chưa khai báo"; nhập số tín chỉ từng loại để áp dụng quy đổi.',
                'Quản trị viên: "Sửa" để cập nhật (không đổi được mã môn); "Xóa" chỉ thực hiện được khi môn chưa có lớp học phần, chưa nằm trong CTĐT hoặc nhóm tự chọn.',
                'Môn "Tạm ngưng" không thể mở lớp học phần mới.'
            ],
            rules: ['RULE-01', 'RULE-CREDIT', 'RULE-MH'],
            notes: ['Tiết thành phần (lý thuyết / thực hành) khác điểm thành phần.',
                'Đổi số tín chỉ của môn đang có lớp học phần: hệ thống xếp lại lịch các lớp; nếu lớp nào không xếp đủ tiết trong học kỳ thì không lưu thay đổi.', 'Muốn môn học xuất hiện cho sinh viên đăng ký, môn phải nằm trong khung chương trình đào tạo hoặc nhóm tự chọn của khoa.']
        },
        'lop-hoc-phan': {
            steps: [
                'Chọn học kỳ, năm học để lọc; tìm theo mã lớp, môn học hoặc giảng viên.',
                'Bấm "Tạo lớp học phần mới" (quản trị viên hoặc giảng viên; giảng viên chỉ tạo lớp do mình dạy). Chọn môn đang hoạt động - nếu chưa có, bấm "Tạo môn học" trước; chọn học kỳ đã khai báo (ngày học lấy theo học kỳ), giảng viên, phòng, học kỳ, năm học, sĩ số tối đa, thời gian mở / đóng đăng ký.',
                'Thêm một hoặc nhiều thứ học trong tuần, mỗi thứ có tiết bắt đầu - kết thúc (tiết 1-13). Hệ thống xếp buổi theo tổng số tiết của môn trong học kỳ, bỏ qua ngày trùng lịch giảng viên / phòng, dừng khi đủ tiết; buổi cuối chỉ lấy số tiết còn thiếu.',
                'Bấm "Xem trước lịch" để xem danh sách buổi, giờ học, số tiết lũy kế, các ngày bị bỏ qua và số tiết còn thiếu; chỉ lưu được khi xếp đủ tiết.',
                '"Xem" để xem lịch, số buổi và danh sách sinh viên; "Sửa" để đổi sĩ số, lịch học; "Xóa" khi lớp chưa có sinh viên đăng ký.'
            ],
            rules: ['RULE-08', 'RULE-LHP', 'RULE-HK', 'RULE-TKB', 'RULE-XL', 'RULE-XD', 'RULE-THIEU', 'RULE-HL'],
            notes: [
                'Không được giảm sĩ số tối đa xuống thấp hơn số sinh viên đã đăng ký.',
                'Xung đột chỉ xét khi cùng ngày thực tế và khoảng tiết giao nhau, cùng giảng viên hoặc cùng phòng; ngày xung đột được bỏ qua.',
                'Hết học kỳ mà chưa đủ tiết thì báo số tiết đã xếp, còn thiếu và nguyên nhân; không xếp vượt học kỳ và không lưu.',
                'Lịch học đã có buổi được điểm danh thì không được xóa; khi lịch học đổi, điểm chuyên cần được tính lại (RULE-15.11).'
            ]
        },
        'co-cau-dao-tao': {
            steps: [
                'Tab "Khoa & Chuyên ngành": tạo khoa trước, sau đó tạo chuyên ngành thuộc khoa.',
                'Tab "Chương trình đào tạo": tạo CTĐT cho chuyên ngành; bấm "Xem khung" để thêm môn bắt buộc theo học kỳ - năm học.',
                'Tab "Nhóm môn tự chọn": tạo nhóm (A, B, C...) với số tín chỉ tối thiểu; thêm môn vào nhóm tại "Xem khung" của CTĐT.',
                'Tab "Lớp sinh viên": tạo lớp gắn với CTĐT; sinh viên thuộc lớp sẽ học theo CTĐT này.',
                'Tab "Học kỳ": khai báo năm học, học kỳ, ngày bắt đầu và ngày kết thúc; lớp học phần chỉ mở được trong học kỳ đã khai báo.',
                'Mỗi mục có "Sửa" / "Xóa"; hệ thống chặn xóa khi dữ liệu đang được sử dụng.'
            ],
            rules: ['RULE-01', 'RULE-02', 'RULE-03', 'RULE-04', 'RULE-05', 'RULE-06', 'RULE-07', 'RULE-HK'],
            notes: [
                'Học kỳ đã có lớp học phần thì không đổi được ngày và không xóa được.',
                'Thứ tự nhóm tự chọn được xác định theo mã nhóm (A → B → C): muốn đăng ký nhóm sau phải đạt đủ tín chỉ tối thiểu của các nhóm trước.',
                'Một môn không thể vừa là môn bắt buộc vừa thuộc nhóm tự chọn trong cùng chương trình.'
            ]
        },
        'chuong-trinh-dao-tao': {
            steps: [
                'Chọn chương trình đào tạo ở ô chọn (sinh viên mặc định là chương trình của lớp mình).',
                'Môn bắt buộc được nhóm theo "Học kỳ - Năm học" kèm tổng tín chỉ; các nhóm tự chọn hiển thị phía dưới với số tín chỉ tối thiểu.',
                'Sinh viên xem cột "Đã học" (môn đã đạt) và số tín chỉ đã đạt trong mỗi nhóm tự chọn.',
                'Quản trị viên: "Thêm môn vào khung", "Sửa" (đổi học kỳ), "Gỡ" môn; "Thêm môn vào nhóm" trên dòng tiêu đề nhóm.',
                'Cột "Lý thuyết" / "Thực hành" hiển thị tiết thành phần; bấm "Xem" ở cột "Tiết thành phần" để xem chi tiết phân bổ.',
                'Bấm "In" để in khung chương trình, "Xuất Excel" để tải file .xlsx.'
            ],
            rules: ['RULE-01', 'RULE-02', 'RULE-03', 'RULE-04', 'RULE-05', 'RULE-06', 'RULE-07']
        },
        'dang-ky': {
            steps: [
                'Chọn học kỳ, năm học; danh sách chỉ gồm lớp học phần thuộc khoa của bạn.',
                'Bấm "Đăng ký" ở lớp muốn học; xem các lớp đã đăng ký ở tab thứ hai và "Hủy ĐK" khi cần.',
                'Tab "Quy chế môn tự chọn & tích lũy" tóm tắt điều kiện các nhóm tự chọn.'
            ],
            rules: ['RULE-01', 'RULE-02', 'RULE-03', 'RULE-04', 'RULE-05', 'RULE-06', 'RULE-08', 'RULE-CREDIT'],
            notes: [
                'Chỉ đăng ký môn thuộc khoa và chương trình đào tạo của mình.',
                'Không đăng ký trùng môn trong cùng học kỳ, không trùng lịch học, không vượt sĩ số tối đa và tối đa 24 tín chỉ / học kỳ.',
                'Chỉ hủy được trong thời gian đăng ký và khi chưa có dữ liệu điểm danh hoặc điểm.'
            ]
        },
        'tkb': {
            steps: [
                'Chọn học kỳ, năm học; hệ thống tự mở tuần hiện tại (tuần tính từ ngày bắt đầu học kỳ theo lịch học).',
                'Dùng "Tuần trước" / "Tuần sau" để chuyển tuần; số tiết trong tuần và tổng tiết dự kiến đã học được tính lại tự động.',
                'Giảng viên bấm nút "Điểm danh" ngay trong ô buổi học để điểm danh đúng buổi đó.',
                'Bấm "In lịch" để in thời khóa biểu.'
            ],
            rules: ['RULE-09', 'RULE-11', 'RULE-TKB', 'RULE-XL'],
            notes: ['Giờ học theo bảng 13 tiết cố định: giờ bắt đầu theo tiết bắt đầu, giờ kết thúc theo tiết kết thúc (VD tiết 2-4: 07:45 - 10:35).']
        },
        'diem-danh': {
            steps: [
                'Chọn học kỳ, năm học rồi chọn mã môn - lớp học phần do bạn phụ trách.',
                'Chọn buổi học (mặc định là buổi gần nhất đã diễn ra); hoặc mở trực tiếp từ nút "Điểm danh" trên thời khóa biểu.',
                'Chọn "Có mặt" / "Vắng mặt" cho từng sinh viên (có nút đánh dấu tất cả), nhập ghi chú nếu cần.',
                'Bấm "Lưu kết quả điểm danh"; có thể mở lại buổi cũ để xem và cập nhật.'
            ],
            rules: ['RULE-12', 'RULE-15'],
            notes: ['Chỉ điểm danh được buổi học đã hoặc đang diễn ra.']
        },
        'quan-ly-diem': {
            steps: [
                'Chọn lớp học phần, nhập điểm giữa kỳ và cuối kỳ cho từng sinh viên, bấm "Lưu bảng điểm".',
                'Điểm chuyên cần do hệ thống tự tính từ điểm danh (không nhập tay).',
                'Để trống ô điểm nghĩa là chưa có điểm thành phần đó; bấm "Xóa" ở cột Thao tác để xóa điểm thành phần của sinh viên.',
                '"Tính lại toàn bộ" tải lại chuyên cần và tổng kết mới nhất.'
            ],
            rules: ['RULE-14', 'RULE-15', 'RULE-17']
        },
        'ket-qua': {
            steps: [
                'Chọn học kỳ, năm học (hoặc "Tất cả") để xem bảng điểm.',
                'Phía dưới hiển thị điểm trung bình học kỳ, tích lũy (hệ 10 và hệ 4), số tín chỉ đạt và xếp loại.',
                'Môn học lại có ghi chú "Lần học x/y" và cho biết lần nào được tính vào tích lũy.'
            ],
            rules: ['RULE-16', 'RULE-17', 'RULE-18', 'RULE-CREDIT']
        },
        'tin-tuc': {
            steps: [
                'Danh sách chỉ gồm các tin đã công khai; tìm theo từ khóa hoặc lọc theo danh mục.',
                'Bấm vào tin để xem chi tiết nội dung.'
            ],
            rules: ['RULE-20']
        },
        'tin-tuc-admin': {
            steps: [
                'Bấm "Đăng bài mới", nhập tiêu đề, nội dung (bắt buộc), tóm tắt, danh mục, trạng thái hiển thị.',
                '"Sửa" để chỉnh nội dung; nút "Ẩn" / "Đăng" để đổi trạng thái hiển thị; "Xóa" để xóa bài.',
                'Tin ở trạng thái "Đã ẩn" hoặc "Bản nháp" không hiển thị cho sinh viên và giảng viên.'
            ],
            rules: ['RULE-19', 'RULE-20']
        },
        'kien-nghi': {
            steps: [
                'Sinh viên bấm "Gửi ý kiến mới", nhập tiêu đề và nội dung rồi gửi.',
                'Bấm "Chi tiết" để xem nội dung và các phản hồi.',
                'Quản trị viên / giảng viên nhập phản hồi trong "Chi tiết"; ý kiến chuyển sang "Đã phản hồi". Quản trị viên có thể xóa ý kiến.'
            ],
            rules: []
        }
    };

    // ---------------- Đọc và tách BUSINESS_RULES.md ----------------
    function loadRules(cb) {
        if (rulesCache) return cb(rulesCache);
        $.ajax({ url: '/BUSINESS_RULES.md', dataType: 'text', cache: false })
            .done(function (text) {
                rulesCache = {};
                text.split(/^## /m).slice(1).forEach(function (block) {
                    var lines = block.split(/\r?\n/);
                    var title = lines.shift().trim();
                    var m = title.match(/^(RULE-[A-Z0-9]+)/);
                    if (m) rulesCache[m[1]] = { title: title, lines: lines };
                });
                cb(rulesCache);
            })
            .fail(function () { rulesCache = null; cb({}); });
    }

    function renderRule(rule) {
        var html = '<div class="help-rule"><div class="help-rule-title">' + App.escapeHtml(rule.title) + '</div>';
        var inList = false;
        rule.lines.forEach(function (raw) {
            var line = raw.replace(/\s+$/, '');
            if (!line.trim()) return;
            var li = line.match(/^(\s*)[-*]\s+(.*)$/);
            if (li) {
                if (!inList) { html += '<ul>'; inList = true; }
                var text = App.escapeHtml(li[2]).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
                html += '<li' + (li[1].length >= 2 ? ' class="help-sub"' : '') + '>' + text + '</li>';
            } else {
                if (inList) { html += '</ul>'; inList = false; }
                html += '<p>' + App.escapeHtml(line.trim()) + '</p>';
            }
        });
        if (inList) html += '</ul>';
        return html + '</div>';
    }

    // ---------------- Hiển thị ----------------
    function show(page) {
        var meta = GUIDES[page] || { steps: ['Chưa có hướng dẫn cho trang này.'], rules: [] };
        var title = $('#pageMainTitle').text() || 'Hướng dẫn';

        loadRules(function (rules) {
            var rulesHtml = meta.rules.length
                ? meta.rules.map(function (id) {
                    return rules[id] ? renderRule(rules[id]) : '<div class="help-rule text-muted">' + id + ': không tìm thấy trong BUSINESS_RULES.md</div>';
                }).join('')
                : '<p class="text-muted">Trang này không có RULE nghiệp vụ riêng.</p>';

            var html =
                '<div class="modal-header"><h3><i class="fa-solid fa-circle-question"></i> Hướng dẫn: ' + App.escapeHtml(title) + '</h3>' +
                '<button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
                '<div class="modal-body help-body">' +
                '  <h4 class="help-h">Thao tác nghiệp vụ</h4>' +
                '  <ol class="help-steps">' + meta.steps.map(function (s) { return '<li>' + App.escapeHtml(s) + '</li>'; }).join('') + '</ol>' +
                (meta.notes && meta.notes.length
                    ? '  <h4 class="help-h">Quy định hệ thống áp dụng</h4><ul class="help-notes">' +
                      meta.notes.map(function (s) { return '<li>' + App.escapeHtml(s) + '</li>'; }).join('') + '</ul>'
                    : '') +
                '  <h4 class="help-h">Quy tắc nghiệp vụ liên quan</h4>' + rulesHtml +
                '</div>' +
                '<div class="modal-footer">' +
                '  <button class="btn btn-outline" id="btnHelpAllRules">Xem toàn bộ quy tắc hệ thống</button>' +
                '  <button class="btn btn-primary" onclick="App.closeModal()">Đóng</button>' +
                '</div>';
            App.showModal(html, 'lg');
            $('#btnHelpAllRules').on('click', showAllRules);
        });
    }

    function showAllRules() {
        loadRules(function (rules) {
            var ids = Object.keys(rules).sort(function (a, b) {
                var na = parseInt(a.split('-')[1], 10), nb = parseInt(b.split('-')[1], 10);
                if (isNaN(na)) return 1;   // RULE-CREDIT... đứng cuối
                if (isNaN(nb)) return -1;
                return na - nb;
            });
            var html =
                '<div class="modal-header"><h3><i class="fa-solid fa-book"></i> Toàn bộ quy tắc nghiệp vụ hệ thống</h3>' +
                '<button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
                '<div class="modal-body help-body">' +
                (ids.length ? ids.map(function (id) { return renderRule(rules[id]); }).join('') : '<p class="text-muted">Không đọc được file BUSINESS_RULES.md</p>') +
                '</div>' +
                '<div class="modal-footer"><button class="btn btn-primary" onclick="App.closeModal()">Đóng</button></div>';
            App.showModal(html, 'lg');
        });
    }

    return { show: show, showAllRules: showAllRules };
})(jQuery);
