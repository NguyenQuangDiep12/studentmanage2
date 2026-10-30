/* ================================================================
   COMPONENT: GIẢI THÍCH CÔNG THỨC ĐIỂM (dùng chung cho Nhập điểm, Kết quả học tập, Tra cứu bảng điểm)
   Mọi con số và hệ số lấy từ API (quy_tac do backend Academic trả về) - giao diện chỉ trình bày
   từng bước: số liệu đầu vào → phép tính → kết quả.
   RULE-15 (chuyên cần), RULE-15.13 (cấm thi), RULE-14.1 (điểm tổng kết), RULE-17 (quy đổi), RULE-18.6 (GPA)
   ================================================================ */

var GiaiThichDiem = (function () {
    'use strict';

    function n(v, d) {
        if (v === null || v === undefined || v === '') return '—';
        return Number(v).toLocaleString('vi-VN', { minimumFractionDigits: d || 0, maximumFractionDigits: d === undefined ? 2 : d });
    }

    function lamTron1(v) { return Math.round(Number(v) * 10 + 1e-9) / 10; }

    function bac(q, d) {
        var x = lamTron1(d);
        return q.thang_diem.find(function (t) { return x >= t.tu - 1e-9; }) || q.thang_diem[q.thang_diem.length - 1];
    }

    function khoang(t) {
        return t.chu === 'F' ? 'dưới ' + n(t.den + 0.1, 1) : n(t.tu, 1) + ' – ' + n(t.den, 1);
    }

    function buoc(so, ten, noiDung) {
        return '<div class="mb-1"><strong>' + so + '. ' + ten + ':</strong> ' + noiDung + '</div>';
    }

    /** RULE-15.5 - 15.8, 15.13: tỷ lệ nghỉ R, điểm chuyên cần C, cấm thi */
    function chuyenCan(r, q) {
        var nghi = r.tiet_nghi, tong = r.tong_tiet_mon, R = Number(r.ty_le_nghi);
        var html = buoc('1', 'Tỷ lệ nghỉ R',
            'R = Tổng số tiết nghỉ ÷ Tổng số tiết của môn × 100% = ' + nghi + ' ÷ ' + tong + ' × 100% = <strong>' + n(R, 2) + '%</strong>' +
            ' <span class="text-muted">(tổng tiết môn = tổng số tiết của tất cả buổi học; tiết nghỉ = tổng tiết của các buổi bị đánh dấu vắng)</span>');
        var c;
        if (R <= 0) {
            c = 'Không nghỉ tiết nào nên C = <strong>' + q.cc_toi_da + '</strong>';
        } else if (R >= q.cc_nguong_bang_0) {
            c = 'R = ' + n(R, 2) + '% ≥ ' + q.cc_nguong_bang_0 + '% nên C = <strong>0</strong>';
        } else {
            var tru = Math.floor(R / q.cc_phan_tram_moi_diem + 1e-9);
            c = 'Mỗi ' + q.cc_phan_tram_moi_diem + '% nghỉ trừ 1 điểm: số điểm trừ = ⌊R ÷ ' + q.cc_phan_tram_moi_diem + '⌋ = ⌊' + n(R, 2) + ' ÷ ' + q.cc_phan_tram_moi_diem +
                '⌋ = ⌊' + n(R / q.cc_phan_tram_moi_diem, 2) + '⌋ = ' + tru + ', suy ra C = ' + q.cc_toi_da + ' − ' + tru + ' = <strong>' + n(r.diem_chuyen_can, 0) + '</strong>';
        }
        html += buoc('2', 'Điểm chuyên cần C (tối đa ' + q.cc_toi_da + ')', c);
        html += buoc('3', 'Điều kiện dự thi', r.cam_thi
            ? '<span class="text-danger">R = ' + n(R, 2) + '% ≥ ' + q.nguong_cam_thi + '% nên <strong>bị cấm thi</strong>, điểm tổng kết D = 0 (F, Không đạt).</span>'
            : 'R = ' + n(R, 2) + '% &lt; ' + q.nguong_cam_thi + '% nên <strong>được dự thi</strong>.');
        return html;
    }

    /** RULE-14.1, 14.2, RULE-17: D = 0.6A + 0.3B + 0.1C → làm tròn 1 chữ số → điểm chữ, hệ 4, kết quả */
    function tongKet(r, q) {
        var A = r.diem_cuoi_ky, B = r.diem_giua_ky, C = r.diem_chuyen_can;
        if (r.cam_thi) {
            return buoc('4', 'Điểm tổng kết D', 'Sinh viên bị cấm thi nên <strong>D = 0</strong>, điểm chữ <strong>F</strong>, hệ 4 = <strong>0.0</strong>, <strong>Không đạt</strong>.');
        }
        if (A === null || A === undefined || B === null || B === undefined) {
            return buoc('4', 'Điểm tổng kết D', 'Chưa đủ điểm (' + (B == null ? 'thiếu giữa kỳ B' : '') + (B == null && A == null ? ', ' : '') +
                (A == null ? 'thiếu cuối kỳ A' : '') + ') nên hệ thống chưa tính D.');
        }
        var a = Number(A), b = Number(B), c = Number(C);
        var D = Math.round((a * q.he_so_cuoi_ky + b * q.he_so_giua_ky + c * q.he_so_chuyen_can) * 100 + 1e-9) / 100;
        var d1 = lamTron1(D);
        var t = bac(q, D);
        return buoc('4', 'Điểm tổng kết D',
                'D = ' + q.he_so_cuoi_ky + 'A + ' + q.he_so_giua_ky + 'B + ' + q.he_so_chuyen_can + 'C = ' +
                q.he_so_cuoi_ky + ' × ' + n(a, 1) + ' + ' + q.he_so_giua_ky + ' × ' + n(b, 1) + ' + ' + q.he_so_chuyen_can + ' × ' + n(c, 0) + ' = ' +
                n(a * q.he_so_cuoi_ky, 2) + ' + ' + n(b * q.he_so_giua_ky, 2) + ' + ' + n(c * q.he_so_chuyen_can, 2) + ' = <strong>' + n(D, 2) + '</strong>' +
                ' <span class="text-muted">(A: cuối kỳ, B: giữa kỳ, C: chuyên cần)</span>') +
            buoc('5', 'Làm tròn một chữ số thập phân', n(D, 2) + ' làm tròn thành <strong>' + n(d1, 1) + '</strong>') +
            buoc('6', 'Quy đổi', n(d1, 1) + ' nằm trong khoảng ' + khoang(t) +
                ', quy đổi ra điểm chữ <strong>' + t.chu + '</strong>, hệ 4 = <strong>' + n(t.he_4, 1) + '</strong>, loại ' + t.xep_loai + ', <strong>' + t.ket_qua + '</strong>');
    }

    /** Toàn bộ cách tính của một sinh viên trong một học phần */
    function hocPhan(r, q) {
        return '<div style="font-size:0.82rem; line-height:1.6;">' + chuyenCan(r, q) + tongKet(r, q) + '</div>';
    }

    /** RULE-18.6, 18.11, 18.12: GPA học kỳ / tích lũy với tử số, mẫu số từng môn */
    function gpa(ten, rows, s) {
        if (!s || !s.so_tin_chi_tinh_gpa) {
            return '<div class="text-muted" style="font-size:0.82rem;">' + ten + ': chưa có học phần nào có điểm tổng kết.</div>';
        }
        var tu = rows.map(function (r) { return n(r.diem_he_4, 1) + '×' + r.so_tin_chi; }).join(' + ');
        var mau = rows.map(function (r) { return r.so_tin_chi; }).join(' + ');
        return '<div style="font-size:0.82rem; line-height:1.6;" class="mb-2"><strong>' + ten + '</strong> = Σ(D4 × TC) ÷ Σ TC = (' + tu + ') ÷ (' + mau + ') = ' +
            n(s.tong_d4_x_tc, 2) + ' ÷ ' + s.so_tin_chi_tinh_gpa + ' = <strong>' + n(s.dtb_he_4, 2) + '</strong> ' +
            '<span class="text-muted">(làm tròn 2 chữ số; D4: điểm hệ 4, TC: số tín chỉ; môn F vẫn tính với D4 = 0 và tín chỉ vẫn ở mẫu số)</span><br>' +
            'Tín chỉ dùng tính GPA = ' + s.so_tin_chi_tinh_gpa + ' (gồm cả môn F) · Tín chỉ đạt = ' + s.so_tin_chi_dat + ' (chỉ môn Đạt)</div>';
    }

    /** Quy chế và công thức (mở rộng / thu gọn) kèm ảnh trích quy chế */
    function quyChe(q) {
        var rows = q.thang_diem.map(function (t) {
            return '<tr><td class="text-center"><strong>' + t.chu + '</strong></td><td class="text-center">' + khoang(t) +
                '</td><td class="text-center">' + n(t.he_4, 1) + '</td><td class="text-center">' + t.xep_loai + '</td><td class="text-center">' + t.ket_qua + '</td></tr>';
        }).join('');
        return '<details style="font-size:0.84rem; border:1px solid var(--border-color); border-radius:8px; padding:8px 12px;">' +
            '<summary style="cursor:pointer;"><strong>Quy chế và cách tính điểm</strong> (bấm để xem)</summary>' +
            '<div class="mt-2" style="line-height:1.7;">' +
            '<p class="mb-1"><strong>1. Tỷ lệ nghỉ:</strong> R = Tổng số tiết nghỉ ÷ Tổng số tiết của môn × 100%. Tổng số tiết của môn là tổng tiết của tất cả buổi học; tiết nghỉ là tổng tiết của các buổi sinh viên bị đánh dấu vắng.</p>' +
            '<p class="mb-1"><strong>2. Điểm chuyên cần C:</strong> tối đa ' + q.cc_toi_da + ' điểm; cứ mỗi ' + q.cc_phan_tram_moi_diem + '% tỷ lệ nghỉ (đủ mức) trừ 1 điểm: C = ' +
                q.cc_toi_da + ' − ⌊R ÷ ' + q.cc_phan_tram_moi_diem + '⌋. Khi R ≥ ' + q.cc_nguong_bang_0 + '% thì C = 0. VD nghỉ 4/45 tiết: R = 8,89%, trừ ⌊4,44⌋ = 4 điểm nên C = 6.</p>' +
            '<p class="mb-1"><strong>3. Cấm thi:</strong> R ≥ ' + q.nguong_cam_thi + '% thì sinh viên bị cấm thi (đồng thời C = 0), không được nhập điểm giữa kỳ / cuối kỳ và điểm tổng kết D = 0 (F).</p>' +
            '<p class="mb-1"><strong>4. Điểm tổng kết:</strong> D = ' + q.he_so_cuoi_ky + 'A + ' + q.he_so_giua_ky + 'B + ' + q.he_so_chuyen_can + 'C (A: cuối kỳ, B: giữa kỳ, C: chuyên cần). Chưa đủ A và B thì chưa tính D. VD A = 8, B = 7, C = 6: D = 4,8 + 2,1 + 0,6 = 7,5.</p>' +
            '<p class="mb-1"><strong>5. Quy đổi:</strong> D làm tròn đến một chữ số thập phân rồi chuyển sang điểm chữ, hệ 4:</p>' +
            '<table class="data-table mb-2" style="max-width:620px;"><thead><tr><th class="text-center">Điểm chữ</th><th class="text-center">Điểm hệ 10</th><th class="text-center">Hệ 4</th><th class="text-center">Loại</th><th class="text-center">Kết quả</th></tr></thead><tbody>' + rows + '</tbody></table>' +
            '<p class="mb-1"><strong>6. GPA học kỳ:</strong> GPA = Σ(D4 × TC) ÷ Σ TC của các môn có điểm trong học kỳ, làm tròn 2 chữ số. Môn F vẫn tính với D4 = 0 và tín chỉ vẫn ở mẫu số. VD 3 môn 3 TC điểm 4,0; 3,0; 0,0 (F): (4×3 + 3×3 + 0×3) ÷ 9 = 2,33.</p>' +
            '<p class="mb-1"><strong>7. GPA tích lũy:</strong> như GPA học kỳ nhưng tính trên toàn bộ quá trình học; môn học lại chỉ tính một lần, lấy lần có điểm cao nhất. Điểm F cũ vẫn giữ trong bảng điểm của học kỳ đã trượt.</p>' +
            '<p class="mb-2"><strong>8. Tín chỉ:</strong> tín chỉ dùng tính GPA gồm cả môn F; tín chỉ tích lũy chỉ gồm các môn Đạt.</p>' +
            '<img src="assets/img/thang-diem-quy-che.png" alt="Trích quy chế: điểm học phần và thang điểm chữ" style="max-width:100%; border:1px solid var(--border-color); border-radius:6px;">' +
            '</div></details>';
    }

    return { hocPhan: hocPhan, gpa: gpa, quyChe: quyChe, chuyenCan: chuyenCan, tongKet: tongKet };
})();
