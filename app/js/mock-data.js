/* ================================================================
   MOCK DATABASE - Student Management System (Version 2.0)
   Đồng bộ chặt chẽ với ERD, Wireframe và Quy chế đào tạo
   Thống nhất trạng thái tiếng Việt, loại bỏ xung đột dữ liệu
   ================================================================ */

var MockDB = (function () {
    'use strict';

    // ---- Cấu hình quy chế hệ thống (RULE-14, RULE-15, RULE-17) ----
    var QUY_CHE = {
        trong_so: {
            cuoi_ky: 0.6,
            giua_ky: 0.3,
            chuyen_can: 0.1
        },
        thang_diem: [
            { min: 8.5, max: 10.0, chu: 'A', he4: 4.0, xep_loai: 'Xuất sắc / Giỏi', ket_qua: 'Đạt' },
            { min: 7.0, max: 8.49, chu: 'B', he4: 3.0, xep_loai: 'Khá', ket_qua: 'Đạt' },
            { min: 5.5, max: 6.99, chu: 'C', he4: 2.0, xep_loai: 'Trung bình', ket_qua: 'Đạt' },
            { min: 4.0, max: 5.49, chu: 'D', he4: 1.0, xep_loai: 'Trung bình yếu', ket_qua: 'Đạt' },
            { min: 0.0, max: 3.99, chu: 'F', he4: 0.0, xep_loai: 'Kém', ket_qua: 'Không đạt' }
        ],
        tin_chi_toi_da_hoc_ky: 24,
        nguong_nghi_chuyen_can_0: 20 // Nghỉ >= 20% chuyên cần = 0
    };

    var SEED = {
        khoa: [
            { id: 1, ma_khoa: 'CNTT', ten_khoa: 'Công nghệ Thông tin' },
            { id: 2, ma_khoa: 'KT', ten_khoa: 'Kinh tế & Quản trị' },
            { id: 3, ma_khoa: 'NN', ten_khoa: 'Ngoại ngữ' }
        ],
        chuyen_nganh: [
            { id: 1, ma_chuyen_nganh: 'KTPM', ten_chuyen_nganh: 'Kỹ thuật phần mềm', khoa_id: 1 },
            { id: 2, ma_chuyen_nganh: 'HTTT', ten_chuyen_nganh: 'Hệ thống thông tin', khoa_id: 1 },
            { id: 3, ma_chuyen_nganh: 'QTKD', ten_chuyen_nganh: 'Quản trị kinh doanh', khoa_id: 2 }
        ],
        chuong_trinh_dao_tao: [
            { id: 1, ma_chuong_trinh: 'CTDT-KTPM', ten_chuong_trinh: 'Chương trình Kỹ thuật phần mềm', thoi_gian_dao_tao: '4 năm', chuyen_nganh_id: 1 },
            { id: 2, ma_chuong_trinh: 'CTDT-HTTT', ten_chuong_trinh: 'Chương trình Hệ thống thông tin', thoi_gian_dao_tao: '4 năm', chuyen_nganh_id: 2 },
            { id: 3, ma_chuong_trinh: 'CTDT-QTKD', ten_chuong_trinh: 'Chương trình Quản trị kinh doanh', thoi_gian_dao_tao: '4 năm', chuyen_nganh_id: 3 }
        ],
        lop_sinh_vien: [
            { id: 1, ma_lop: 'KTPM2023', ten_lop: 'Kỹ thuật phần mềm Khóa 2023', khoa_hoc: '2023-2027', chuong_trinh_id: 1 },
            { id: 2, ma_lop: 'KTPM2024', ten_lop: 'Kỹ thuật phần mềm Khóa 2024', khoa_hoc: '2024-2028', chuong_trinh_id: 1 },
            { id: 3, ma_lop: 'HTTT2023', ten_lop: 'Hệ thống thông tin Khóa 2023', khoa_hoc: '2023-2027', chuong_trinh_id: 2 }
        ],
        users: [
            // Admin
            { id: 1, username: 'admin', password: 'admin123', ma_dinh_danh: 'AD001', ho_ten: 'System Admin', vai_tro: 'admin', ngay_sinh: '1985-06-15', gioi_tinh: 'Nam', email: 'admin@university.edu.vn', so_dien_thoai: '0901000001', dia_chi: 'TP.HCM', lop_sinh_vien_id: null, khoa_id: null, trang_thai: 'Hoạt động', created_at: '2024-01-01T00:00:00' },
            { id: 2, username: 'adminaccount1', password: 'admin123', ma_dinh_danh: 'AD002', ho_ten: 'System Admin Test', vai_tro: 'admin', ngay_sinh: '1985-01-01', gioi_tinh: 'Nam', email: 'admin1@sms.edu.vn', so_dien_thoai: '0901000011', dia_chi: 'TP.HCM', lop_sinh_vien_id: null, khoa_id: null, trang_thai: 'Hoạt động', created_at: '2024-01-01T00:00:00' },
            // Giảng viên
            { id: 3, username: 'gv_tran', password: '123456', ma_dinh_danh: 'GV001', ho_ten: 'Trần Văn An', vai_tro: 'giang_vien', ngay_sinh: '1980-03-20', gioi_tinh: 'Nam', email: 'tran.an@university.edu.vn', so_dien_thoai: '0901000002', dia_chi: 'TP.HCM', lop_sinh_vien_id: null, khoa_id: 1, trang_thai: 'Hoạt động', created_at: '2024-01-01T00:00:00' },
            { id: 4, username: 'lectureraccount1', password: 'lecturer123', ma_dinh_danh: 'GV002', ho_ten: 'Trần Văn An (Giảng viên)', vai_tro: 'giang_vien', ngay_sinh: '1980-03-20', gioi_tinh: 'Nam', email: 'lecturer1@sms.edu.vn', so_dien_thoai: '0901000012', dia_chi: 'TP.HCM', lop_sinh_vien_id: null, khoa_id: 1, trang_thai: 'Hoạt động', created_at: '2024-01-01T00:00:00' },
            { id: 5, username: 'gv_le', password: '123456', ma_dinh_danh: 'GV003', ho_ten: 'Lê Thị Bình', vai_tro: 'giang_vien', ngay_sinh: '1982-07-10', gioi_tinh: 'Nữ', email: 'le.binh@university.edu.vn', so_dien_thoai: '0901000003', dia_chi: 'TP.HCM', lop_sinh_vien_id: null, khoa_id: 1, trang_thai: 'Hoạt động', created_at: '2024-01-01T00:00:00' },
            // Sinh viên
            { id: 6, username: 'sv_nguyen', password: '123456', ma_dinh_danh: 'SV001', ho_ten: 'Nguyễn Minh Đức', vai_tro: 'sinh_vien', ngay_sinh: '2004-05-12', gioi_tinh: 'Nam', email: 'nguyen.duc@student.edu.vn', so_dien_thoai: '0901000005', dia_chi: 'TP.HCM', lop_sinh_vien_id: 1, khoa_id: null, trang_thai: 'Hoạt động', created_at: '2024-01-15T00:00:00' },
            { id: 7, username: 'studentaccount1', password: 'student123', ma_dinh_danh: 'SV002', ho_ten: 'Nguyễn Minh Đức (Sinh viên)', vai_tro: 'sinh_vien', ngay_sinh: '2004-05-12', gioi_tinh: 'Nam', email: 'student1@sms.edu.vn', so_dien_thoai: '0901000013', dia_chi: 'TP.HCM', lop_sinh_vien_id: 1, khoa_id: null, trang_thai: 'Hoạt động', created_at: '2024-01-15T00:00:00' },
            { id: 8, username: 'sv_hoang', password: '123456', ma_dinh_danh: 'SV003', ho_ten: 'Hoàng Thị Em', vai_tro: 'sinh_vien', ngay_sinh: '2004-08-25', gioi_tinh: 'Nữ', email: 'hoang.em@student.edu.vn', so_dien_thoai: '0901000006', dia_chi: 'TP.HCM', lop_sinh_vien_id: 1, khoa_id: null, trang_thai: 'Hoạt động', created_at: '2024-01-15T00:00:00' },
            { id: 9, username: 'sv_vo', password: '123456', ma_dinh_danh: 'SV004', ho_ten: 'Võ Văn Phú', vai_tro: 'sinh_vien', ngay_sinh: '2004-02-14', gioi_tinh: 'Nam', email: 'vo.phu@student.edu.vn', so_dien_thoai: '0901000007', dia_chi: 'TP.HCM', lop_sinh_vien_id: 1, khoa_id: null, trang_thai: 'Hoạt động', created_at: '2024-01-15T00:00:00' },
            { id: 10, username: 'sv_bui', password: '123456', ma_dinh_danh: 'SV005', ho_ten: 'Bùi Quốc Huy', vai_tro: 'sinh_vien', ngay_sinh: '2004-09-30', gioi_tinh: 'Nam', email: 'bui.huy@student.edu.vn', so_dien_thoai: '0901000009', dia_chi: 'TP.HCM', lop_sinh_vien_id: 2, khoa_id: null, trang_thai: 'Hoạt động', created_at: '2024-01-15T00:00:00' }
        ],
        // Danh mục môn học: Phân định rạch ròi môn bắt buộc và môn tự chọn
        mon_hoc: [
            // Môn học cốt lõi (Bắt buộc trong CTĐT KTPM)
            { id: 1, ma_mon_hoc: 'CS101', ten_mon_hoc: 'Nhập môn lập trình', so_tin_chi: 3, so_tiet: 45, mo_ta: 'Nguyên lý lập trình C/C++', trang_thai: 'Hoạt động' },
            { id: 2, ma_mon_hoc: 'CS102', ten_mon_hoc: 'Cấu trúc dữ liệu và giải thuật', so_tin_chi: 4, so_tiet: 60, mo_ta: 'Danh sách liên kết, cây, đồ thị', trang_thai: 'Hoạt động' },
            { id: 3, ma_mon_hoc: 'CS201', ten_mon_hoc: 'Cơ sở dữ liệu', so_tin_chi: 3, so_tiet: 45, mo_ta: 'Mô hình quan hệ và SQL chuẩn', trang_thai: 'Hoạt động' },
            { id: 4, ma_mon_hoc: 'CS202', ten_mon_hoc: 'Mạng máy tính', so_tin_chi: 3, so_tiet: 45, mo_ta: 'Giao thức TCP/IP và định tuyến', trang_thai: 'Hoạt động' },
            { id: 5, ma_mon_hoc: 'CS301', ten_mon_hoc: 'Công nghệ phần mềm', so_tin_chi: 3, so_tiet: 45, mo_ta: 'Quy trình Agile, Scrum, thiết kế phần mềm', trang_thai: 'Hoạt động' },
            { id: 6, ma_mon_hoc: 'MA101', ten_mon_hoc: 'Toán rời rạc', so_tin_chi: 3, so_tiet: 45, mo_ta: 'Đại số Boolean, tập hợp, logic vị từ', trang_thai: 'Hoạt động' },
            { id: 7, ma_mon_hoc: 'MA102', ten_mon_hoc: 'Xác suất thống kê', so_tin_chi: 3, so_tiet: 45, mo_ta: 'Biến ngẫu nhiên, ước lượng kỳ vọng', trang_thai: 'Hoạt động' },
            { id: 8, ma_mon_hoc: 'EN101', ten_mon_hoc: 'Tiếng Anh chuyên ngành', so_tin_chi: 3, so_tiet: 45, mo_ta: 'Thuật ngữ CNTT và giao tiếp', trang_thai: 'Hoạt động' },

            // Môn tự chọn Nhóm A (Tối thiểu 6 TC)
            { id: 9, ma_mon_hoc: 'CS303', ten_mon_hoc: 'Trí tuệ nhân tạo', so_tin_chi: 3, so_tiet: 45, mo_ta: 'Tìm kiếm không gian trạng thái, heuristic, suy diễn', trang_thai: 'Hoạt động' },
            { id: 10, ma_mon_hoc: 'CS304', ten_mon_hoc: 'An toàn thông tin', so_tin_chi: 3, so_tiet: 45, mo_ta: 'Mật mã học, bảo mật hệ thống mạng', trang_thai: 'Hoạt động' },

            // Môn tự chọn Nhóm B (Tối thiểu 9 TC - Điều kiện: xong Nhóm A)
            { id: 11, ma_mon_hoc: 'CS302', ten_mon_hoc: 'Lập trình ứng dụng Web', so_tin_chi: 3, so_tiet: 45, mo_ta: 'Kiến trúc MVC, RESTful API, Frontend & Backend', trang_thai: 'Hoạt động' },
            { id: 12, ma_mon_hoc: 'CS305', ten_mon_hoc: 'Lập trình ứng dụng di động', so_tin_chi: 3, so_tiet: 45, mo_ta: 'Phát triển ứng dụng Android / iOS', trang_thai: 'Hoạt động' },
            { id: 13, ma_mon_hoc: 'CS306', ten_mon_hoc: 'Điện toán đám mây', so_tin_chi: 3, so_tiet: 45, mo_ta: 'Dịch vụ AWS, Docker và Kubernetes', trang_thai: 'Hoạt động' },

            // Môn tự chọn Nhóm C (Tối thiểu 9 TC - Điều kiện: xong Nhóm B & A)
            { id: 14, ma_mon_hoc: 'CS307', ten_mon_hoc: 'Kiểm thử phần mềm', so_tin_chi: 3, so_tiet: 45, mo_ta: 'Unit test, Integration test, CI/CD', trang_thai: 'Hoạt động' },
            { id: 15, ma_mon_hoc: 'CS308', ten_mon_hoc: 'Phân tích thiết kế hệ thống', so_tin_chi: 3, so_tiet: 45, mo_ta: 'UML, thiết kế vi dịch vụ (Microservices)', trang_thai: 'Hoạt động' },
            { id: 16, ma_mon_hoc: 'CS309', ten_mon_hoc: 'Học máy nâng cao', so_tin_chi: 3, so_tiet: 45, mo_ta: 'Deep learning, neural networks, computer vision', trang_thai: 'Hoạt động' }
        ],
        // Chi tiết CTĐT: Chỉ chứa các môn bắt buộc
        chi_tiet_chuong_trinh_dao_tao: [
            { id: 1, chuong_trinh_id: 1, mon_hoc_id: 1, hoc_ky: 1, nam_hoc: 1 },
            { id: 2, chuong_trinh_id: 1, mon_hoc_id: 6, hoc_ky: 1, nam_hoc: 1 },
            { id: 3, chuong_trinh_id: 1, mon_hoc_id: 8, hoc_ky: 1, nam_hoc: 1 },
            { id: 4, chuong_trinh_id: 1, mon_hoc_id: 2, hoc_ky: 2, nam_hoc: 1 },
            { id: 5, chuong_trinh_id: 1, mon_hoc_id: 7, hoc_ky: 2, nam_hoc: 1 },
            { id: 6, chuong_trinh_id: 1, mon_hoc_id: 3, hoc_ky: 1, nam_hoc: 2 },
            { id: 7, chuong_trinh_id: 1, mon_hoc_id: 4, hoc_ky: 1, nam_hoc: 2 },
            { id: 8, chuong_trinh_id: 1, mon_hoc_id: 5, hoc_ky: 2, nam_hoc: 2 }
        ],
        // Nhóm tự chọn trong CTĐT (RULE-02, RULE-03, RULE-04)
        nhom_tu_chon: [
            { id: 1, ma_nhom: 'NTC-A', ten_nhom: 'Nhóm tự chọn A (Cơ sở mở rộng)', chuong_trinh_id: 1, so_tin_chi_toi_thieu: 6 },
            { id: 2, ma_nhom: 'NTC-B', ten_nhom: 'Nhóm tự chọn B (Chuyên ngành phát triển)', chuong_trinh_id: 1, so_tin_chi_toi_thieu: 9 },
            { id: 3, ma_nhom: 'NTC-C', ten_nhom: 'Nhóm tự chọn C (Nâng cao & Ứng dụng)', chuong_trinh_id: 1, so_tin_chi_toi_thieu: 9 }
        ],
        chi_tiet_nhom_tu_chon: [
            { id: 1, nhom_tu_chon_id: 1, mon_hoc_id: 9 },  // CS303
            { id: 2, nhom_tu_chon_id: 1, mon_hoc_id: 10 }, // CS304
            { id: 3, nhom_tu_chon_id: 2, mon_hoc_id: 11 }, // CS302
            { id: 4, nhom_tu_chon_id: 2, mon_hoc_id: 12 }, // CS305
            { id: 5, nhom_tu_chon_id: 2, mon_hoc_id: 13 }, // CS306
            { id: 6, nhom_tu_chon_id: 3, mon_hoc_id: 14 }, // CS307
            { id: 7, nhom_tu_chon_id: 3, mon_hoc_id: 15 }, // CS308
            { id: 8, nhom_tu_chon_id: 3, mon_hoc_id: 16 }  // CS309
        ],
        // Lớp học phần: Có thời gian mở/đóng đăng ký rõ ràng
        lop_hoc_phan: [
            // Học kỳ 1 Năm học 2026-2027 (Hiện tại: tháng 09/2026 - 01/2027)
            {
                id: 1,
                ma_lop_hoc_phan: 'CS101-HK1-2026',
                mon_hoc_id: 1,
                giang_vien_user_id: 3, // GV Trần Văn An
                hoc_ky: 1,
                nam_hoc: '2026-2027',
                si_so_toi_da: 40,
                phong_hoc: 'A101',
                thoi_gian_mo_dang_ky: '2026-08-15T00:00:00',
                thoi_gian_dong_dang_ky: '2026-11-30T23:59:59',
                trang_thai: 'Đang mở'
            },
            {
                id: 2,
                ma_lop_hoc_phan: 'CS102-HK1-2026',
                mon_hoc_id: 2,
                giang_vien_user_id: 3,
                hoc_ky: 1,
                nam_hoc: '2026-2027',
                si_so_toi_da: 35,
                phong_hoc: 'A102',
                thoi_gian_mo_dang_ky: '2026-08-15T00:00:00',
                thoi_gian_dong_dang_ky: '2026-11-30T23:59:59',
                trang_thai: 'Đang mở'
            },
            {
                id: 3,
                ma_lop_hoc_phan: 'CS201-HK1-2026',
                mon_hoc_id: 3,
                giang_vien_user_id: 5, // GV Lê Thị Bình
                hoc_ky: 1,
                nam_hoc: '2026-2027',
                si_so_toi_da: 40,
                phong_hoc: 'B201',
                thoi_gian_mo_dang_ky: '2026-08-15T00:00:00',
                thoi_gian_dong_dang_ky: '2026-11-30T23:59:59',
                trang_thai: 'Đang mở'
            },
            {
                id: 4,
                ma_lop_hoc_phan: 'CS303-HK1-2026', // Tự chọn Nhóm A
                mon_hoc_id: 9,
                giang_vien_user_id: 5,
                hoc_ky: 1,
                nam_hoc: '2026-2027',
                si_so_toi_da: 45,
                phong_hoc: 'C301',
                thoi_gian_mo_dang_ky: '2026-08-15T00:00:00',
                thoi_gian_dong_dang_ky: '2026-11-30T23:59:59',
                trang_thai: 'Đang mở'
            },
            // Dữ liệu học kỳ trước: HK2 2025-2026
            {
                id: 5,
                ma_lop_hoc_phan: 'CS202-HK2-2025',
                mon_hoc_id: 4,
                giang_vien_user_id: 3,
                hoc_ky: 2,
                nam_hoc: '2025-2026',
                si_so_toi_da: 40,
                phong_hoc: 'A203',
                thoi_gian_mo_dang_ky: '2026-01-01T00:00:00',
                thoi_gian_dong_dang_ky: '2026-01-20T23:59:59',
                trang_thai: 'Đã đóng'
            }
        ],
        // Lịch học tuần
        lich_hoc: [
            { id: 1, lop_hoc_phan_id: 1, thu: 2, tiet_bat_dau: 1, tiet_ket_thuc: 3, ngay_bat_dau: '2026-09-07', ngay_ket_thuc: '2026-12-25' },
            { id: 2, lop_hoc_phan_id: 1, thu: 4, tiet_bat_dau: 4, tiet_ket_thuc: 5, ngay_bat_dau: '2026-09-07', ngay_ket_thuc: '2026-12-25' },
            { id: 3, lop_hoc_phan_id: 2, thu: 3, tiet_bat_dau: 1, tiet_ket_thuc: 3, ngay_bat_dau: '2026-09-07', ngay_ket_thuc: '2026-12-25' },
            { id: 4, lop_hoc_phan_id: 2, thu: 5, tiet_bat_dau: 1, tiet_ket_thuc: 2, ngay_bat_dau: '2026-09-07', ngay_ket_thuc: '2026-12-25' },
            { id: 5, lop_hoc_phan_id: 3, thu: 2, tiet_bat_dau: 4, tiet_ket_thuc: 6, ngay_bat_dau: '2026-09-07', ngay_ket_thuc: '2026-12-25' },
            { id: 6, lop_hoc_phan_id: 4, thu: 6, tiet_bat_dau: 1, tiet_ket_thuc: 3, ngay_bat_dau: '2026-09-07', ngay_ket_thuc: '2026-12-25' }
        ],
        buoi_hoc: [], // Tự động sinh từ lich_hoc
        // Đăng ký học phần
        dang_ky_hoc_phan: [
            { id: 1, sinh_vien_user_id: 6, lop_hoc_phan_id: 1, ngay_dang_ky: '2026-08-20T08:00:00', thoi_gian_mo_dang_ky: '2026-08-15T00:00:00', thoi_gian_dong_dang_ky: '2026-11-30T23:59:59', trang_thai: 'Đã đăng ký' },
            { id: 2, sinh_vien_user_id: 6, lop_hoc_phan_id: 2, ngay_dang_ky: '2026-08-20T08:05:00', thoi_gian_mo_dang_ky: '2026-08-15T00:00:00', thoi_gian_dong_dang_ky: '2026-11-30T23:59:59', trang_thai: 'Đã đăng ký' },
            { id: 3, sinh_vien_user_id: 6, lop_hoc_phan_id: 3, ngay_dang_ky: '2026-08-20T08:10:00', thoi_gian_mo_dang_ky: '2026-08-15T00:00:00', thoi_gian_dong_dang_ky: '2026-11-30T23:59:59', trang_thai: 'Đã đăng ký' },
            { id: 4, sinh_vien_user_id: 8, lop_hoc_phan_id: 1, ngay_dang_ky: '2026-08-21T09:00:00', thoi_gian_mo_dang_ky: '2026-08-15T00:00:00', thoi_gian_dong_dang_ky: '2026-11-30T23:59:59', trang_thai: 'Đã đăng ký' },
            { id: 5, sinh_vien_user_id: 9, lop_hoc_phan_id: 1, ngay_dang_ky: '2026-08-22T10:00:00', thoi_gian_mo_dang_ky: '2026-08-15T00:00:00', thoi_gian_dong_dang_ky: '2026-11-30T23:59:59', trang_thai: 'Đã đăng ký' }
        ],
        // Điểm: Bổ sung audit trail (nguoi_sua, updated_at, ghi_chu)
        diem: [
            { id: 1, dang_ky_id: 1, diem_chuyen_can: 10.0, diem_giua_ky: 8.5, diem_cuoi_ky: 8.0, diem_tong_ket: 8.35, diem_he_10: 8.35, diem_he_4: 3.0, diem_chu: 'B', ket_qua: 'Đạt', nguoi_sua_user_id: 3, updated_at: '2026-10-20T10:00:00', ghi_chu_sua: 'Nhập điểm giữa kỳ' },
            { id: 2, dang_ky_id: 2, diem_chuyen_can: 9.0, diem_giua_ky: 7.0, diem_cuoi_ky: 7.5, diem_tong_ket: 7.5, diem_he_10: 7.5, diem_he_4: 3.0, diem_chu: 'B', ket_qua: 'Đạt', nguoi_sua_user_id: 3, updated_at: '2026-10-20T10:00:00', ghi_chu_sua: 'Khởi tạo bảng điểm' },
            { id: 3, dang_ky_id: 3, diem_chuyen_can: 10.0, diem_giua_ky: 9.0, diem_cuoi_ky: 9.5, diem_tong_ket: 9.4, diem_he_10: 9.4, diem_he_4: 4.0, diem_chu: 'A', ket_qua: 'Đạt', nguoi_sua_user_id: 5, updated_at: '2026-10-20T10:00:00', ghi_chu_sua: 'Nhập điểm kỳ 1' }
        ],
        // Điểm danh: hỗ trợ cả 3 trạng thái co_mat, di_muon, vang_mat
        diem_danh: [],
        tin_tuc: [
            { id: 1, tieu_de: 'Kế hoạch học tập & đăng ký học phần Học kỳ 1 năm học 2026-2027', tom_tat: 'Phòng Đào tạo thông báo lịch đăng ký học phần chính thức cho toàn trường', noi_dung: 'Nhà trường thông báo thời gian đăng ký học phần học kỳ 1 năm học 2026-2027\n\nThời gian mở cổng đăng ký: 15/08/2026\nThời gian đóng cổng: 30/11/2026\n\nSinh viên chú ý:\n- Kiểm tra kỹ khung thời khóa biểu để tránh trùng lịch học\n- Hoàn thành các môn điều kiện tiên quyết trước khi đăng ký môn tự chọn nâng cao\n- Mọi thắc mắc vui lòng gửi ý kiến qua mục Kiến nghị phản hồi trên hệ thống', danh_muc: 'Đào tạo', trang_thai: 'Công khai', nguoi_dang_user_id: 1, created_at: '2026-08-01T08:00:00', updated_at: '2026-08-01T08:00:00' },
            { id: 2, tieu_de: 'Lịch thi giữa kỳ Học kỳ 1 năm học 2026-2027', tom_tat: 'Thông báo lịch thi giữa kỳ từ ngày 02/11/2026 đến 14/11/2026', noi_dung: 'Phòng Đào tạo thông báo lịch thi giữa kỳ cho tất cả các lớp học phần\n\nThời gian: Từ 02/11/2026 đến 14/11/2026\nĐịa điểm: Xem chi tiết theo từng lớp học phần trên hệ thống\n\nYêu cầu sinh viên mang theo thẻ sinh viên có dán ảnh', danh_muc: 'Đào tạo', trang_thai: 'Công khai', nguoi_dang_user_id: 1, created_at: '2026-10-15T09:00:00', updated_at: '2026-10-15T09:00:00' },
            { id: 3, tieu_de: 'Hội thảo khoa học Công nghệ Trí tuệ Nhân tạo 2026', tom_tat: 'Khoa Công nghệ Thông tin tổ chức hội thảo chuyên đề ứng dụng AI trong kỹ thuật phần mềm', noi_dung: 'Hội thảo quy tụ các chuyên gia hàng đầu từ các tập đoàn công nghệ\n\nThời gian: 15/11/2026 - 8:30 AM\nĐịa điểm: Hội trường Lớn Tòa nhà A\n\nSinh viên tham gia được cộng điểm rèn luyện và cấp chứng nhận tham dự', danh_muc: 'Sự kiện', trang_thai: 'Công khai', nguoi_dang_user_id: 1, created_at: '2026-10-01T10:00:00', updated_at: '2026-10-01T10:00:00' }
        ],
        kien_nghi: [
            { id: 1, sinh_vien_user_id: 6, tieu_de: 'Đề xuất mở thêm lớp môn Kiểm thử phần mềm', noi_dung: 'Kính gửi Phòng Đào tạo, hiện tại nhu cầu đăng ký môn Kiểm thử phần mềm rất đông nhưng lớp đã đầy sĩ số - Kính mong nhà trường xem xét mở thêm 1 lớp', trang_thai: 'Chờ xử lý', created_at: '2026-09-10T08:00:00', updated_at: '2026-09-10T08:00:00' }
        ],
        phan_hoi_kien_nghi: []
    };

    // Sinh buổi học từ lịch học
    function generateBuoiHoc(lichHocs) {
        var buoiHocs = [];
        var id = 1;
        lichHocs.forEach(function (lh) {
            var start = new Date(lh.ngay_bat_dau);
            var end = new Date(lh.ngay_ket_thuc);
            // JS getDay(): 0=CN, 1=T2, 2=T3, 3=T4, 4=T5, 5=T6, 6=T7
            var targetJsDay = (lh.thu === 7) ? 6 : (lh.thu - 1);
            var current = new Date(start);

            while (current.getDay() !== targetJsDay && current <= end) {
                current.setDate(current.getDate() + 1);
            }

            while (current <= end) {
                buoiHocs.push({
                    id: id++,
                    lich_hoc_id: lh.id,
                    ngay_hoc: current.toISOString().split('T')[0],
                    tiet_bat_dau: lh.tiet_bat_dau,
                    tiet_ket_thuc: lh.tiet_ket_thuc,
                    trang_thai: 'scheduled'
                });
                current.setDate(current.getDate() + 7);
            }
        });
        return buoiHocs;
    }

    // Tính điểm tổng kết
    function tinhDiemTongKet(ck, gk, cc) {
        if (ck == null || gk == null || cc == null) return null;
        var val = (ck * QUY_CHE.trong_so.cuoi_ky) +
                  (gk * QUY_CHE.trong_so.giua_ky) +
                  (cc * QUY_CHE.trong_so.chuyen_can);
        return Math.round(val * 100) / 100;
    }

    // Quy đổi điểm hệ 10 sang điểm chữ (Làm tròn 1 chữ số thập phân chuẩn giáo vụ)
    function tinhDiemChu(d10) {
        if (d10 == null) return null;
        var rounded = Math.round(d10 * 10) / 10;
        for (var i = 0; i < QUY_CHE.thang_diem.length; i++) {
            var item = QUY_CHE.thang_diem[i];
            if (rounded >= item.min) {
                return item.chu;
            }
        }
        return 'F';
    }

    function tinhDiemHe4(chu) {
        var found = QUY_CHE.thang_diem.find(function (item) { return item.chu === chu; });
        return found ? found.he4 : 0.0;
    }

    function tinhKetQua(chu) {
        return chu === 'F' ? 'Không đạt' : 'Đạt';
    }

    function tinhPhanLoai(dtb) {
        if (dtb == null || isNaN(dtb)) return '—';
        var r = Math.round(dtb * 10) / 10;
        if (r >= 8.5) return 'Xuất sắc / Giỏi';
        if (r >= 7.0) return 'Khá';
        if (r >= 5.5) return 'Trung bình';
        if (r >= 4.0) return 'Trung bình yếu';
        return 'Kém';
    }

    // Điểm chuyên cần (RULE-15)
    function tinhDiemChuyenCan(tongTietNghi, tongTietMon) {
        if (!tongTietMon || tongTietMon === 0) return 10.0;
        var tyLeNghi = (tongTietNghi / tongTietMon) * 100;
        if (tyLeNghi >= QUY_CHE.nguong_nghi_chuyen_can_0) return 0.0;
        // Cứ mỗi 2% tỷ lệ nghỉ trừ 1 điểm
        var diem = 10.0 - (tyLeNghi / 2.0);
        return Math.max(0.0, Math.round(diem * 10) / 10);
    }

    var STORAGE_KEY = 'sms_db_v2';
    var DB_VERSION_KEY = 'sms_db_version';
    var CURRENT_VERSION = '2.0';

    function initDB() {
        var ver = localStorage.getItem(DB_VERSION_KEY);
        if (ver !== CURRENT_VERSION) {
            var data = JSON.parse(JSON.stringify(SEED));
            data.buoi_hoc = generateBuoiHoc(data.lich_hoc);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            localStorage.setItem(DB_VERSION_KEY, CURRENT_VERSION);
            return data;
        }
        return JSON.parse(localStorage.getItem(STORAGE_KEY));
    }

    function getDB() {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return initDB();
        return JSON.parse(raw);
    }

    function saveDB(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    function nextId(table) {
        var data = getDB();
        var arr = data[table] || [];
        var maxId = 0;
        arr.forEach(function (item) { if (item.id > maxId) maxId = item.id; });
        return maxId + 1;
    }

    function makeTable(tableName) {
        return {
            getAll: function (filter) {
                var data = getDB();
                var arr = data[tableName] || [];
                if (filter) {
                    arr = arr.filter(function (item) {
                        for (var k in filter) {
                            if (filter[k] !== undefined && filter[k] !== '' && item[k] != filter[k]) return false;
                        }
                        return true;
                    });
                }
                return arr;
            },
            getById: function (id) {
                var data = getDB();
                return (data[tableName] || []).find(function (item) { return item.id === parseInt(id, 10); }) || null;
            },
            create: function (obj) {
                var data = getDB();
                if (!data[tableName]) data[tableName] = [];
                obj.id = nextId(tableName);
                data[tableName].push(obj);
                saveDB(data);
                return obj;
            },
            update: function (id, updates) {
                var data = getDB();
                var arr = data[tableName] || [];
                var idx = arr.findIndex(function (item) { return item.id === parseInt(id, 10); });
                if (idx === -1) return null;
                for (var k in updates) { arr[idx][k] = updates[k]; }
                saveDB(data);
                return arr[idx];
            },
            remove: function (id) {
                var data = getDB();
                data[tableName] = (data[tableName] || []).filter(function (item) { return item.id !== parseInt(id, 10); });
                saveDB(data);
                return true;
            },
            count: function (filter) {
                return this.getAll(filter).length;
            }
        };
    }

    initDB();

    return {
        init: initDB,
        reset: function () {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(DB_VERSION_KEY);
            return initDB();
        },
        raw: getDB,
        save: saveDB,
        QUY_CHE: QUY_CHE,
        users: makeTable('users'),
        khoa: makeTable('khoa'),
        chuyen_nganh: makeTable('chuyen_nganh'),
        chuong_trinh_dao_tao: makeTable('chuong_trinh_dao_tao'),
        lop_sinh_vien: makeTable('lop_sinh_vien'),
        mon_hoc: makeTable('mon_hoc'),
        chi_tiet_chuong_trinh: makeTable('chi_tiet_chuong_trinh_dao_tao'),
        nhom_tu_chon: makeTable('nhom_tu_chon'),
        chi_tiet_nhom_tu_chon: makeTable('chi_tiet_nhom_tu_chon'),
        lop_hoc_phan: makeTable('lop_hoc_phan'),
        lich_hoc: makeTable('lich_hoc'),
        buoi_hoc: makeTable('buoi_hoc'),
        dang_ky_hoc_phan: makeTable('dang_ky_hoc_phan'),
        diem: makeTable('diem'),
        diem_danh: makeTable('diem_danh'),
        tin_tuc: makeTable('tin_tuc'),
        kien_nghi: makeTable('kien_nghi'),
        phan_hoi_kien_nghi: makeTable('phan_hoi_kien_nghi'),

        // Helper calculations
        tinhDiemTongKet: tinhDiemTongKet,
        tinhDiemChu: tinhDiemChu,
        tinhDiemHe4: tinhDiemHe4,
        tinhKetQua: tinhKetQua,
        tinhPhanLoai: tinhPhanLoai,
        tinhDiemChuyenCan: tinhDiemChuyenCan,
        generateBuoiHoc: generateBuoiHoc,
        getSiSoHienTai: function (lopHocPhanId) {
            return this.dang_ky_hoc_phan.getAll({
                lop_hoc_phan_id: parseInt(lopHocPhanId, 10),
                trang_thai: 'Đã đăng ký'
            }).length;
        }
    };
})();

// Xuất toàn cục cho trình duyệt và Node.js test runner
if (typeof window !== 'undefined') {
    window.MockDB = MockDB;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MockDB;
}
