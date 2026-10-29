# API – Hệ thống quản lý sinh viên

- Chạy: `php -S localhost:8000 router.php` rồi mở `http://localhost:8000/` (hoặc Laragon: `http://my-api.test/`).
- Mọi API (trừ đăng nhập, quên mật khẩu) cần header `Authorization: Bearer <access_token>`.
- Body gửi JSON (`Content-Type: application/json`). Phản hồi: `{ "success": true|false, "message": "...", "data": ... }`.
- Mã lỗi: `401` chưa đăng nhập / token hết hạn hoặc đã đăng xuất, `403` sai quyền, `404` không tìm thấy, `409` xung đột dữ liệu, `422` dữ liệu không hợp lệ.
- Frontend gọi bằng jQuery `$.ajax` qua `app/js/api.js`: `Api.get / Api.post / Api.put / Api.del`.

Ví dụ jQuery (mở Console trên trang dashboard):

```js
Api.get('/api/monhoc', { search: 'CS1' }).done(console.log).fail(x => console.log(x.responseJSON));
Api.post('/api/ketquahoctap/diem-thanh-phan', { dang_ky_id: 3, diem_giua_ky: 8 }).done(console.log).fail(x => console.log(x.responseJSON));
```

## 1. Tài khoản
| Method | Endpoint | Quyền | Body / Query |
|---|---|---|---|
| POST | /api/taikhoan/dang-nhap | — | `ma_dinh_danh` (mã sinh viên / mã giảng viên), `password` |
| POST | /api/taikhoan/dang-xuat | đã đăng nhập | — (thu hồi token) |
| POST | /api/taikhoan/doi-mat-khau | đã đăng nhập | `old_password`, `new_password`, `confirm_password` |
| POST | /api/taikhoan/quen-mat-khau | — | `ma_dinh_danh`, `email` (email trong hồ sơ), `new_password`, `confirm_password` |
| GET | /api/taikhoan/me | đã đăng nhập | — |
| GET | /api/taikhoan/thong-ke | đã đăng nhập | — |
| GET | /api/taikhoan/danh-muc | admin | — (khoa, lớp sinh viên) |
| GET | /api/taikhoan/users | admin | `vai_tro`, `search`, `trang_thai`, `lop_sinh_vien_id`, `khoa_id` |
| GET | /api/taikhoan/user | admin | `id` |
| POST | /api/taikhoan/users | admin | `ma_dinh_danh` (mã SV/GV, dùng để đăng nhập), `password`, `ho_ten`, `vai_tro`, `lop_sinh_vien_id` (SV) / `khoa_id` (GV), `email`, `so_dien_thoai`, `ngay_sinh`, `gioi_tinh`, `dia_chi`, `trang_thai` |
| PUT | /api/taikhoan/users | admin | `id` + các trường cần sửa |
| POST | /api/taikhoan/users/trang-thai | admin | `id`, `trang_thai`: `Hoạt động` \| `Đã khóa` |
| POST | /api/taikhoan/users/dat-lai-mat-khau | admin | `id` (về 123456) |

## 2. Môn học
| Method | Endpoint | Quyền | Body / Query |
|---|---|---|---|
| GET | /api/monhoc | đã đăng nhập | `search`. Mỗi môn kèm `so_tin_chi_ly_thuyet`, `so_tin_chi_thuc_hanh`, `so_tiet_ly_thuyet`, `so_tiet_thuc_hanh` (`null` = môn cũ chưa phân loại); kèm `quy_doi` (hệ số tiết/TC) |
| GET | /api/monhoc/chi-tiet | đã đăng nhập | `id` |
| POST | /api/monhoc | admin, GV | `ma_mon_hoc`, `ten_mon_hoc`, `so_tin_chi_ly_thuyet`, `so_tin_chi_thuc_hanh` (số nguyên ≥ 0, tổng 1-10), `mo_ta`. Backend tự tính `so_tin_chi`, `so_tiet_ly_thuyet` = TC LT × 18, `so_tiet_thuc_hanh` = TC TH × 36, `so_tiet` (RULE-CREDIT-08); số tiết gửi lên bị bỏ qua |
| PUT | /api/monhoc | admin | `id` + các trường trên (không đổi mã; trường không gửi giữ giá trị cũ). Tổng tiết đổi thì xếp lại lịch các lớp; lớp nào không đủ tiết → 409, không lưu |
| DELETE | /api/monhoc?id= | admin | chặn nếu đã có lớp HP / thuộc CTĐT / nhóm tự chọn |

## 3. Lớp học phần
| Method | Endpoint | Quyền | Body / Query |
|---|---|---|---|
| GET | /api/lophocphan | admin, GV (lớp mình) | `hoc_ky`, `nam_hoc`, `trang_thai`, `search`, `mon_hoc_id` |
| GET | /api/lophocphan/chi-tiet | admin, GV | `id` (kèm lịch học, `buoi_hoc[]` có `so_thu_tu`, danh sách SV) |
| GET | /api/lophocphan/nam-hoc | đã đăng nhập | — (năm học, học kỳ từ bảng `hoc_ky` với `da_khai_bao` = 1; học kỳ cũ chưa khai báo lấy theo lịch học, `da_khai_bao` = 0; học kỳ hiện hành) |
| GET | /api/lophocphan/form-data | admin, GV | — (môn học, giảng viên đang hoạt động; GV chỉ nhận chính mình) |
| POST | /api/lophocphan/xem-truoc-lich | admin, GV | như POST /api/lophocphan (+ `id` khi sửa, mã lớp có thể bỏ trống); trả `buoi[]`, `bo_qua[]` (ngày xung đột), `tong_tiet_mon`, `da_xep`, `con_thieu`, `hop_le`, `nguyen_nhan[]`, `hoc_ky` - không ghi DB |
| POST | /api/lophocphan | admin, GV (GV luôn là giảng viên của lớp) | `ma_lop_hoc_phan`, `mon_hoc_id`, `giang_vien_user_id`, `hoc_ky`, `nam_hoc`, `si_so_toi_da`, `phong_hoc`, `trang_thai`, `thoi_gian_mo_dang_ky`, `thoi_gian_dong_dang_ky`, `lich_hoc: [{thu, tiet_bat_dau, tiet_ket_thuc (1-13)}]`. Học kỳ phải đã khai báo; ngày học lấy theo học kỳ. Chưa xếp đủ tiết → 422 kèm `xep_lich` |
| PUT | /api/lophocphan | admin, GV (lớp mình) | `id` + các trường trên |
| DELETE | /api/lophocphan?id= | admin, GV (lớp mình) | chặn nếu đã có đăng ký |

## 4. Đăng ký học phần
| Method | Endpoint | Quyền | Body / Query |
|---|---|---|---|
| GET | /api/dangkyhocphan/available | SV | `hoc_ky`, `nam_hoc`, `search` |
| GET | /api/dangkyhocphan/registered | SV | `hoc_ky`, `nam_hoc` (tùy chọn) |
| POST | /api/dangkyhocphan/register | SV | `lop_hoc_phan_id` |
| POST | /api/dangkyhocphan/cancel | SV | `dang_ky_id` |
| GET | /api/dangkyhocphan/thoi-khoa-bieu | SV, GV, admin | `hoc_ky`, `nam_hoc`, `tu_ngay` (YYYY-MM-DD, ngày bất kỳ trong tuần) |

## 5. Kết quả học tập
| Method | Endpoint | Quyền | Body / Query |
|---|---|---|---|
| GET | /api/ketquahoctap/lop-giang-day | GV, admin | — |
| GET | /api/ketquahoctap/buoi-hoc | GV, admin | `lop_hoc_phan_id` |
| GET | /api/ketquahoctap/diem-danh | GV, admin | `buoi_hoc_id` |
| POST | /api/ketquahoctap/diem-danh | GV, admin | `buoi_hoc_id`, `items: [{dang_ky_id, trang_thai: co_mat\|vang_mat, ghi_chu}]` |
| GET | /api/ketquahoctap/bang-diem | GV, admin | `lop_hoc_phan_id` |
| POST | /api/ketquahoctap/bang-diem | GV, admin | `lop_hoc_phan_id`, `items: [{dang_ky_id, diem_giua_ky, diem_cuoi_ky}]` |
| POST | /api/ketquahoctap/diem-thanh-phan | GV, admin | Thêm: `dang_ky_id`, `diem_giua_ky` và/hoặc `diem_cuoi_ky` |
| PUT | /api/ketquahoctap/diem-thanh-phan | GV, admin | Sửa: như trên |
| DELETE | /api/ketquahoctap/diem-thanh-phan | GV, admin | `dang_ky_id`, `loai`: `giua_ky` \| `cuoi_ky` \| `tat_ca` |
| GET | /api/ketquahoctap/ket-qua | SV (của mình); admin, GV (`sinh_vien_id`) | `hoc_ky` (1/2/3/all), `nam_hoc` (YYYY-YYYY/all). Mỗi môn kèm `tiet_nghi`, `tong_tiet_mon`, `ty_le_nghi`, `cam_thi`; `hoc_ky` / `tich_luy` kèm `tong_d4_x_tc`, `so_tin_chi_tinh_gpa`, `so_tin_chi_dat`, `mon[]`; `quy_tac` (hệ số, thang điểm) |
| GET | /api/ketquahoctap/lop-sinh-vien | admin, GV | — (lớp sinh viên kèm danh sách sinh viên để tra cứu bảng điểm) |

Buổi học được xếp theo tổng số tiết môn (RULE-XL): bỏ qua ngày trùng giảng viên/phòng, dừng khi đủ tiết, buổi cuối có thể ít tiết hơn; chỉ lưu khi đủ tiết (RULE-HL-01). Phản hồi có `xep_lich` (`so_buoi`, `da_xep`, `con_thieu`, `so_ngay_bo_qua`, `nguyen_nhan`).

Sinh viên nghỉ từ 20% số tiết (R ≥ 20%) bị cấm thi: thêm / sửa điểm trả 409, điểm tổng kết = 0 (RULE-15.13). `bang-diem` trả thêm `cam_thi`, `ty_le_nghi`, `quy_tac`; `buoi-hoc` trả `so_thu_tu` (cùng số với thời khóa biểu).

Điểm chuyên cần không nhập tay: hệ thống tính từ điểm danh (RULE-15), tổng tiết môn = tổng tiết các buổi theo lịch học của lớp.

## 6. Tin tức
| Method | Endpoint | Quyền | Body / Query |
|---|---|---|---|
| GET | /api/tintuc | đã đăng nhập | `search`, `danh_muc`; admin thêm `quan_ly=1`, `trang_thai` |
| GET | /api/tintuc/chi-tiet | đã đăng nhập | `id` |
| POST | /api/tintuc | admin | `tieu_de`, `noi_dung`, `tom_tat`, `danh_muc`, `trang_thai` |
| PUT | /api/tintuc | admin | `id` + các trường trên |
| POST | /api/tintuc/trang-thai | admin | `id`, `trang_thai`: `Công khai` \| `Bản nháp` |
| DELETE | /api/tintuc?id= | admin | — |

## 7. Cơ cấu đào tạo & Chương trình đào tạo
| Method | Endpoint | Quyền | Body / Query |
|---|---|---|---|
| GET | /api/cocaudaotao/tong-quan | admin | — (khoa, chuyên ngành, CTĐT, nhóm tự chọn, lớp SV) |
| GET | /api/cocaudaotao/ds-ctdt | đã đăng nhập | — (`mac_dinh` = CTĐT của sinh viên) |
| GET | /api/cocaudaotao/khung-chuong-trinh | đã đăng nhập | `chuong_trinh_id` (SV bỏ trống = CTĐT của mình) |
| POST / PUT | /api/cocaudaotao/khoa | admin | `ma_khoa`, `ten_khoa` (+ `id` khi PUT) |
| DELETE | /api/cocaudaotao/khoa?id= | admin | chặn nếu còn chuyên ngành / giảng viên |
| POST / PUT | /api/cocaudaotao/chuyen-nganh | admin | `ma_chuyen_nganh`, `ten_chuyen_nganh`, `khoa_id` |
| DELETE | /api/cocaudaotao/chuyen-nganh?id= | admin | chặn nếu còn CTĐT |
| POST / PUT | /api/cocaudaotao/ctdt | admin | `ma_chuong_trinh`, `ten_chuong_trinh`, `thoi_gian_dao_tao` (1-6 năm), `chuyen_nganh_id` |
| DELETE | /api/cocaudaotao/ctdt?id= | admin | chặn nếu còn lớp SV / môn / nhóm |
| POST | /api/cocaudaotao/ctdt/mon | admin | `chuong_trinh_id`, `mon_hoc_id`, `hoc_ky` (1-3), `nam_hoc` (năm thứ) |
| PUT | /api/cocaudaotao/ctdt/mon | admin | `id`, `hoc_ky`, `nam_hoc` |
| DELETE | /api/cocaudaotao/ctdt/mon?id= | admin | gỡ môn khỏi khung |
| POST / PUT | /api/cocaudaotao/nhom-tu-chon | admin | `ma_nhom`, `ten_nhom`, `chuong_trinh_id`, `so_tin_chi_toi_thieu` |
| DELETE | /api/cocaudaotao/nhom-tu-chon?id= | admin | chặn nếu nhóm còn môn |
| POST | /api/cocaudaotao/nhom-tu-chon/mon | admin | `nhom_tu_chon_id`, `mon_hoc_id` |
| DELETE | /api/cocaudaotao/nhom-tu-chon/mon?id= | admin | gỡ môn khỏi nhóm |
| GET | /api/cocaudaotao/hoc-ky | admin | — (kèm `so_tuan`, `so_lop_hoc_phan`, `canh_bao[]`) |
| GET | /api/cocaudaotao/hoc-ky/chi-tiet | admin | `id` (thông tin học kỳ + danh sách lớp học phần) |
| POST / PUT | /api/cocaudaotao/hoc-ky | admin | `nam_hoc`, `hoc_ky` (1-3), `ngay_bat_dau`, `ngay_ket_thuc` (> ngày bắt đầu). Không chồng học kỳ khác cùng năm học; phải bao trùm mọi buổi học của lớp thuộc học kỳ; học kỳ có lớp không đổi năm học / số học kỳ |
| DELETE | /api/cocaudaotao/hoc-ky?id= | admin | chặn nếu học kỳ có lớp học phần |
| POST / PUT | /api/cocaudaotao/lop-sinh-vien | admin | `ma_lop`, `ten_lop`, `khoa_hoc` (VD 2026-2030), `chuong_trinh_id` |
| DELETE | /api/cocaudaotao/lop-sinh-vien?id= | admin | chặn nếu lớp còn sinh viên |

## 8. Ý kiến & Kiến nghị
| Method | Endpoint | Quyền | Body / Query |
|---|---|---|---|
| GET | /api/kiennghi | đã đăng nhập (SV chỉ thấy của mình) | `search`, `trang_thai` |
| GET | /api/kiennghi/chi-tiet | đã đăng nhập | `id` (kèm phản hồi) |
| POST | /api/kiennghi | SV | `tieu_de`, `noi_dung` |
| POST | /api/kiennghi/phan-hoi | admin, GV | `kien_nghi_id`, `noi_dung` |
| DELETE | /api/kiennghi?id= | admin | xóa ý kiến và phản hồi |

## Cấu hình nghiệp vụ (app/core/Academic.php)
- `TIN_CHI_MIN`, `TIN_CHI_MAX`: số tín chỉ hợp lệ của một môn (RULE-CREDIT-03).
- `TIET_MOI_TC_LY_THUYET` (18), `TIET_MOI_TC_THUC_HANH` (36), `PHUT_MOI_TIET` (50): quy đổi tín chỉ → tiết (RULE-CREDIT-08).
- `CHO_PHEP_RUT_NGAN_BUOI_CUOI`: cho phép buổi cuối ít tiết hơn khung (RULE-XL-09).
- `RETAKE_POLICY`: quy tắc chọn điểm môn học lại (`cao_nhat` | `lan_gan_nhat`, RULE-18.11).
