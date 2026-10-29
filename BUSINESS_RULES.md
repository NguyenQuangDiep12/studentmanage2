# BUSINESS RULES

## RULE-01: Hoàn thành môn học trong chương trình đào tạo
Sinh viên phải học và đạt tất cả các môn học được quy định trong chương trình đào tạo để đủ điều kiện hoàn thành chương trình.

## RULE-02: Tích lũy tín chỉ nhóm tự chọn A
Sinh viên được chọn các môn thuộc nhóm A và phải tích lũy tối thiểu 6 tín chỉ.

## RULE-03: Tích lũy tín chỉ nhóm tự chọn B
Sinh viên được chọn các môn thuộc nhóm B và phải tích lũy tối thiểu 9 tín chỉ.

## RULE-04: Tích lũy tín chỉ nhóm tự chọn C
Sinh viên được chọn các môn thuộc nhóm C và phải tích lũy tối thiểu 9 tín chỉ.

## RULE-05: Điều kiện đạt môn tự chọn
Sinh viên phải đạt các môn đã chọn trong nhóm tự chọn hiện tại mới đủ điều kiện đăng ký tiếp nhóm tự chọn kế tiếp.

## RULE-06: Thứ tự đăng ký nhóm tự chọn
Sinh viên phải hoàn thành nhóm A trước khi đăng ký nhóm B và C. Việc đăng ký nhóm tiếp theo phụ thuộc vào điều kiện hoàn thành nhóm trước đó.

## RULE-07: Điều kiện hoàn thành chương trình đào tạo
Sinh viên cần hoàn thành toàn bộ môn học trong chương trình đào tạo và đạt tối thiểu số tín chỉ tự chọn yêu cầu của từng nhóm: A là 6, B là 9, C là 9, để đáp ứng điều kiện học tập theo quy tắc đã ghi nhận.

## RULE-08: Kiểm soát thời gian đăng ký học phần
Sinh viên chỉ được đăng ký học phần trong khoảng thời gian đăng ký do nhà trường quy định. Nếu đăng ký ngoài khoảng thời gian này, hệ thống phải từ chối yêu cầu và thông báo đăng ký không hợp lệ do ngoài thời gian cho phép.
- **RULE-08.1:** Lớp học phần chỉ có 2 trạng thái đăng ký: **Đang mở đăng ký** (đã nhập ngày mở và ngày đóng, thời điểm hiện tại nằm trong khoảng đó) và **Đóng đăng ký** (mọi trường hợp còn lại). Hết ngày đóng thì lớp tự chuyển sang Đóng đăng ký; không có trạng thái nhập tay.
- **RULE-08.2:** Lớp Đang mở đăng ký thì sinh viên được đăng ký và được hủy đăng ký; lớp Đóng đăng ký thì không đăng ký và không hủy được.

## RULE-09: Lọc thời khóa biểu theo học kỳ và năm học
Thời khóa biểu phải hiển thị các buổi học thuộc học kỳ và năm học mà người dùng đã chọn.
- Điều kiện: Lớp học phần thuộc học kỳ và năm học được chọn.
- Thời khóa biểu sinh viên: Chỉ hiển thị các lớp học phần sinh viên đã đăng ký thành công, chưa hủy.
- Thời khóa biểu giảng viên: Chỉ hiển thị các lớp học phần do giảng viên phụ trách.
- Lọc theo tuần: Chỉ hiển thị các buổi học diễn ra trong tuần được chọn, căn cứ vào thứ học và khoảng ngày học trong lich_hoc.
- Kết quả: Các buổi học phù hợp được hiển thị trên cùng một bảng thời khóa biểu tuần.
Dữ liệu liên quan: lop_hoc_phan.hoc_ky, lop_hoc_phan.nam_hoc, dang_ky_hoc_phan.trang_thai và các trường lịch học trong lich_hoc.

## RULE-11: Quản lý thời khóa biểu và tính số tiết học theo tuần
- RULE-11.1: Mỗi lớp học phần có thể có một hoặc nhiều lịch học trong tuần, tùy theo kế hoạch giảng dạy.
- RULE-11.2: Mỗi lịch học phải xác định thứ học, tiết bắt đầu, tiết kết thúc, ngày bắt đầu và ngày kết thúc.
- RULE-11.3: Một lớp học phần có thể có nhiều bản ghi trong bảng lich_hoc để biểu diễn các buổi học vào những thứ hoặc khung tiết khác nhau.
- RULE-11.4: Khi người dùng chọn học kỳ và tuần, hệ thống chỉ hiển thị các buổi học thuộc lớp học phần phù hợp với học kỳ đã chọn và có lịch diễn ra trong tuần đó.
- RULE-11.5: Khi chuyển sang tuần khác, hệ thống tự động cập nhật thời khóa biểu và tính lại tổng số tiết dự kiến đã học dựa trên các buổi học có ngày diễn ra trước hoặc trong tuần được chọn.
- RULE-11.6: Tổng số tiết dự kiến đã học được tính bằng tổng số tiết của các buổi học thuộc khoảng thời gian cần xét. Mỗi buổi học được tính theo công thức: Tiết kết thúc - Tiết bắt đầu + 1.
- RULE-11.7: Việc tính số tiết dự kiến đã học phải xét ngày bắt đầu và ngày kết thúc của từng lịch học, không tính các buổi nằm ngoài khoảng thời gian áp dụng.
- RULE-11.8: Nếu một môn có nhiều buổi học trong cùng tuần, hệ thống phải tính tổng tiết của tất cả các buổi, không giới hạn số buổi mỗi tuần.
- RULE-11.9: Các buổi học được xếp tự động theo tổng số tiết của môn - xem RULE-XL, RULE-XD, RULE-THIEU, RULE-HL.

## RULE-12: Điểm danh sinh viên theo buổi học

- **RULE-12.1:** Giảng viên chỉ được điểm danh các lớp học phần do mình phụ trách.
- **RULE-12.2:** Danh sách điểm danh chỉ bao gồm sinh viên đã đăng ký lớp học phần và chưa hủy đăng ký.
- **RULE-12.3:** Mỗi buổi học được xác định bởi lịch học cụ thể, bao gồm ngày học, tiết bắt đầu và tiết kết thúc.
- **RULE-12.4:** Giảng viên thực hiện điểm danh từng sinh viên theo từng buổi học với hai trạng thái: `Có mặt` và `Vắng mặt`.
- **RULE-12.5:** Nếu sinh viên được đánh dấu `Vắng mặt`, hệ thống tính toàn bộ số tiết của buổi học đó là số tiết nghỉ, không phân biệt buổi học có bao nhiêu tiết.
- **RULE-12.6:** Số tiết của một buổi học được tính theo công thức:

  Số tiết buổi học = Tiết kết thúc − Tiết bắt đầu + 1.

- **RULE-12.7:** Ví dụ:
  - Buổi học tiết 1–3: sinh viên vắng thì tính nghỉ 3 tiết.
  - Buổi học tiết 1–2: sinh viên vắng thì tính nghỉ 2 tiết.
  - Buổi học chỉ có tiết 1: sinh viên vắng thì tính nghỉ 1 tiết.
- **RULE-12.8:** Mỗi sinh viên chỉ có một bản ghi điểm danh cho một buổi học. Không được tạo bản ghi trùng theo cặp `buoi_hoc_id` và `dang_ky_id`.
- **RULE-12.9:** Giảng viên có thể xem lại kết quả điểm danh của các buổi học trước và cập nhật trạng thái nếu được phép.
- **RULE-12.10:** Khi trạng thái điểm danh được cập nhật, hệ thống phải tính lại số tiết nghỉ và điểm chuyên cần liên quan.
- **RULE-12.11:** Hệ thống lưu trạng thái điểm danh, thời điểm ghi nhận và ghi chú nếu có.

## RULE-14: Tính điểm tổng kết môn học
- RULE-14.1: Cuối học kỳ, giảng viên chấm điểm và hệ thống tính điểm tổng kết theo công thức:
  Điểm tổng kết = a * 0.6 + b * 0.3 + c * 0.1
  Trong đó:
  - a: Điểm thi cuối kỳ.
  - b: Điểm kiểm tra giữa kỳ.
  - c: Điểm chuyên cần.
- RULE-14.2: Hệ thống tự động tính điểm tổng kết sau khi có đủ điểm cuối kỳ, điểm giữa kỳ và điểm chuyên cần (D = 0.6A + 0.3B + 0.1C, làm tròn 2 chữ số). Chưa đủ điểm thì chưa tính, trừ sinh viên bị cấm thi (RULE-15.13).
- RULE-14.3: Giảng viên / quản trị viên được thêm, sửa, xóa từng điểm thành phần (giữa kỳ, cuối kỳ hoặc toàn bộ); sau mỗi thay đổi hệ thống tính lại điểm tổng kết.

## RULE-15: Tự động tính điểm chuyên cần

- **RULE-15.1:** Sinh viên không vắng buổi học nào được 10 điểm chuyên cần.
- **RULE-15.2:** Khi giảng viên đánh dấu sinh viên `Vắng mặt`, hệ thống tự động cộng toàn bộ số tiết của buổi học đó vào tổng số tiết nghỉ của sinh viên.
- **RULE-15.3:** Tổng số tiết nghỉ bằng tổng số tiết của tất cả các buổi mà sinh viên bị đánh dấu vắng mặt.
- **RULE-15.4:** Tổng số tiết học của môn học được xác định từ các buổi học thuộc lịch học áp dụng cho môn học đó.
- **RULE-15.5:** Tỷ lệ nghỉ học được tính theo công thức:

  Tỷ lệ nghỉ học = (Tổng số tiết nghỉ / Tổng số tiết của môn học) × 100%.

- **RULE-15.6:** Điểm chuyên cần được tính tự động dựa trên tỷ lệ nghỉ học; mức điểm tối đa là 10.
- **RULE-15.7:** Cứ mỗi 2% tỷ lệ nghỉ học, sinh viên bị trừ 1 điểm chuyên cần so với mức tối đa 10.
- **RULE-15.8:** Khi tỷ lệ nghỉ học đạt hoặc vượt 20%, điểm chuyên cần bằng 0.
- **RULE-15.9:** Điểm chuyên cần không được nhỏ hơn 0 hoặc lớn hơn 10.
- **RULE-15.10:** Khi giảng viên cập nhật trạng thái điểm danh từ `Vắng mặt` thành `Có mặt` hoặc ngược lại, hệ thống phải tính lại tổng số tiết nghỉ, tỷ lệ nghỉ học và điểm chuyên cần.
- **RULE-15.11:** Khi lịch học hoặc tổng số tiết của môn học thay đổi, hệ thống phải cập nhật kết quả tính chuyên cần theo dữ liệu lịch học mới.
- **RULE-15.12:** Điểm tổng kết môn học phải được tính lại khi điểm chuyên cần thay đổi và các thành phần điểm cần thiết đã có đủ dữ liệu.
- **RULE-15.13:** Điều kiện dự thi: tỷ lệ nghỉ R **từ 20% trở lên** (R ≥ 20%) thì sinh viên bị **cấm thi** (đồng thời C = 0): không được nhập điểm giữa kỳ / cuối kỳ, điểm tổng kết D = 0 (F, Không đạt). Khi điểm danh được sửa làm R < 20%, hệ thống tự gỡ cấm thi và tính lại.
- **RULE-15.14:** Mọi bảng điểm hiển thị cách tính từng bước ngay trên trang (R, C, cấm thi, D, làm tròn, quy đổi), không chỉ trong nút Hướng dẫn.

### Ví dụ nghiệp vụ

Một môn học có tổng cộng 60 tiết. Sinh viên vắng hai buổi:
- Buổi thứ nhất: tiết 1–3, nghỉ 3 tiết.
- Buổi thứ hai: tiết 1–2, nghỉ 2 tiết.

Kết quả:
- Tổng số tiết nghỉ: 3 + 2 = 5 tiết.
- Tỷ lệ nghỉ học: 5 / 60 × 100% ≈ 8,33%.
- Điểm chuyên cần được hệ thống tự động tính theo quy tắc trừ điểm đã quy định.

Cách xử lý đã thống nhất trong hệ thống: chỉ trừ theo mỗi mức 2% hoàn chỉnh (8,33% -> trừ 4 điểm -> chuyên cần 6), chỉ backend tính (app/core/Academic.php).

Lưu ý gốc: Cần thống nhất cách xử lý tỷ lệ nghỉ không chia hết cho 2%. Ví dụ, với tỷ lệ 8,33%, hệ thống trừ 4 điểm nếu chỉ tính mỗi mức 2% hoàn chỉnh, hoặc có thể áp dụng cách làm tròn khác nếu quy định đào tạo yêu cầu. Không nên để frontend và backend tự tính theo hai cách khác nhau.

## RULE-16: Sinh viên xem điểm môn học
- RULE-16.1: Sinh viên được xem kết quả học tập theo từng học kỳ và năm học.
- RULE-16.2: Bảng điểm hiển thị các thông tin: STT, mã môn học, mã lớp học phần, tên môn học, số tín chỉ, điểm hệ 10, điểm thành phần hoặc điểm quy đổi theo hệ thống, điểm hệ 4, điểm chữ và trạng thái môn học nếu có.
- RULE-16.3: Hệ thống hiển thị điểm trung bình học kỳ hệ 4 và hệ 10.
- RULE-16.4: Hệ thống hiển thị số tín chỉ đạt trong học kỳ.
- RULE-16.5: Hệ thống hiển thị điểm trung bình tích lũy hệ 4 và hệ 10, cùng tổng số tín chỉ tích lũy.
- RULE-16.6: Hệ thống hiển thị phân loại điểm trung bình học kỳ.
- RULE-16.7: Các môn học đạt chuẩn đầu ra có thể hiển thị điểm chữ Đ thay vì điểm số; môn đánh giá Đạt/Không đạt không có điểm số thì không tính vào GPA (hệ thống hiện chưa có loại môn này).
- RULE-16.8: Quản trị viên và giảng viên tra cứu bảng điểm sinh viên theo luồng: chọn lớp sinh viên → chọn sinh viên → xem điểm theo môn và kết quả theo học kỳ.

## RULE-17: Quy đổi điểm hệ 10 sang điểm chữ
- Điểm học phần D làm tròn đến một chữ số thập phân rồi mới chuyển sang điểm chữ và hệ 4 (theo quy chế; VD 8,45 → 8,5 → A; 7,95 → 8,0 → B+).
- Thang 8 mức (Academic::THANG_DIEM):

| Điểm chữ | Hệ 10 | Hệ 4 | Loại | Kết quả |
|---|---|---|---|---|
| A | 8,5 – 10 | 4.0 | Giỏi | Đạt |
| B+ | 8,0 – 8,4 | 3.5 | Khá | Đạt |
| B | 7,0 – 7,9 | 3.0 | Khá | Đạt |
| C+ | 6,5 – 6,9 | 2.5 | Trung bình | Đạt |
| C | 5,5 – 6,4 | 2.0 | Trung bình | Đạt |
| D+ | 5,0 – 5,4 | 1.5 | Trung bình yếu | Đạt |
| D | 4,0 – 4,9 | 1.0 | Trung bình yếu | Đạt |
| F | dưới 4,0 | 0.0 | Kém | Không đạt, học lại |

## RULE-18: Thống kê kết quả học tập học kỳ và tích lũy
- RULE-18.1: Điểm trung bình học kỳ hệ 4 và hệ 10 được hiển thị riêng.
- RULE-18.2: Điểm trung bình tích lũy hệ 4 và hệ 10 được hiển thị riêng.
- RULE-18.3: Số tín chỉ đạt trong học kỳ được phân biệt với số tín chỉ tích lũy.
- RULE-18.4: Hệ thống hiển thị phân loại điểm trung bình học kỳ.
- RULE-18.5: Điểm rèn luyện học kỳ và xếp loại điểm rèn luyện có thể hiển thị nếu hệ thống có dữ liệu.
- RULE-18.6: Công thức điểm trung bình (học kỳ hoặc tích lũy):
  A = Σ(a_i × n_i) / Σ n_i  (i = 1..n)
  - A: Điểm trung bình chung học kỳ hoặc điểm trung bình chung tích lũy.
  - a_i: Điểm của học phần thứ i, theo hệ điểm đang tính (hệ 10 hoặc hệ 4).
  - n_i: Số tín chỉ của học phần thứ i.
  - n: Tổng số học phần được tính trong phạm vi xét.
  - GPA học kỳ: chỉ xét các học phần được tính trong học kỳ đó.
  - GPA tích lũy: xét các học phần được tính trong toàn bộ quá trình học.
  - Môn F vẫn tính vào GPA với điểm hệ 4 = 0 và tín chỉ của môn F vẫn ở mẫu số. Kết quả làm tròn 2 chữ số thập phân.
  - Ví dụ: 3 môn 3 TC, hệ 4 lần lượt 4.0; 3.0; 0.0 (F): GPA = (4×3 + 3×3 + 0×3) / 9 = 2.33.
- RULE-18.12: Phân biệt hai chỉ số tín chỉ: tín chỉ dùng tính GPA (gồm cả môn F) và tín chỉ tích lũy đạt (chỉ môn Đạt).
- RULE-18.13: Điểm F cũ vẫn giữ trong bảng điểm của học kỳ đã trượt; GPA tích lũy không tính đồng thời điểm F cũ và điểm học lại của cùng một môn.
- RULE-18.11: Xử lý học phần học lại khi tính GPA
  - Hệ thống phải xác định các lần học của cùng một học phần thuộc cùng một sinh viên.
  - Việc lựa chọn điểm được sử dụng để tính GPA đối với học phần học lại phải tuân theo quy chế đào tạo đã xác định.
  - Hệ thống không được tính trùng tín chỉ của cùng một học phần trong GPA tích lũy, trừ khi quy chế đào tạo quy định khác.
  - Khi điểm của lần học lại được cập nhật, hệ thống phải tính lại GPA học kỳ và GPA tích lũy có liên quan theo quy tắc áp dụng.
  - Cách hệ thống đang áp dụng: các lần học được nhận diện theo mon_hoc_id của sinh viên (đăng ký chưa hủy), đánh số theo năm học, học kỳ.
    Quy tắc chọn điểm cấu hình tại Academic::RETAKE_POLICY (app/core/Academic.php): mặc định 'cao_nhat' (lấy lần có điểm hệ 10 cao nhất),
    có thể đổi sang 'lan_gan_nhat'. GPA học kỳ tính lần học thuộc học kỳ đó; GPA tích lũy mỗi học phần chỉ tính một lần.
    GPA được tính lại mỗi lần tra cứu nên luôn theo điểm mới nhất.

## RULE-19: Quản trị viên quản lý tin tức
- Quản trị viên đăng nhập, tạo, sửa, xóa tin tức và chuyển trạng thái tin sau khi kiểm tra các trường bắt buộc.
- Tin tức chỉ có 2 trạng thái: **Công khai** (quản trị viên, giảng viên, sinh viên đều xem được) và **Bản nháp** (chỉ quản trị viên xem được). Mặc định Công khai.
- Khi đăng / sửa tin, quản trị viên có thể tick **Tin quan trọng**. Mặc định không tick (tin thường).

## RULE-20: Hiển thị tin tức cho sinh viên và giảng viên
- Sinh viên và giảng viên xem tin tức công khai.
- Danh sách tin (cả trang quản lý của quản trị viên) xếp tin quan trọng lên đầu, có nhãn "Quan trọng"; trong cùng nhóm thì tin mới đăng ở trên. Bỏ tick thì tin trở về vị trí theo ngày đăng.

## RULE-21: Đăng nhập
- Nhập tên đăng nhập/mã định danh và mật khẩu hợp lệ.

## RULE-22: Quên mật khẩu
- Xác minh và đặt lại mật khẩu mới.

## RULE-23: Đổi mật khẩu
- Cung cấp mật khẩu hiện tại và mật khẩu mới hợp lệ.

## RULE-24: Quản lý thông tin sinh viên
- Xem, thêm, sửa thông tin sinh viên.

## RULE-25: Quản lý thông tin giảng viên
- Xem, thêm, sửa thông tin giảng viên.

## RULE-26: Đăng xuất
- Kết thúc phiên đăng nhập.

## RULE-CREDIT: Tín chỉ và quy đổi tín chỉ thành số tiết
- Khái niệm: Tín chỉ (TC) là đơn vị đo khối lượng học tập của học phần. 1 tiết học = 50 phút.
- RULE-CREDIT-01: Mỗi môn học phải có số tín chỉ được xác định trong chương trình đào tạo.
- RULE-CREDIT-02: Số tín chỉ của môn = số tín chỉ lý thuyết + số tín chỉ thực hành/thảo luận. Hệ thống không thay đổi số tín chỉ theo thời khóa biểu hoặc số buổi học thực tế.
- RULE-CREDIT-03: Khi tạo hoặc cập nhật môn học, hệ thống kiểm tra số tín chỉ theo cấu hình (TIN_CHI_MIN..TIN_CHI_MAX), mỗi loại là số nguyên không âm.
- RULE-CREDIT-04: Số tín chỉ của môn học là trọng số khi tính điểm trung bình học kỳ và tích lũy.
- RULE-CREDIT-05: Học phần chỉ được cộng vào tổng số tín chỉ đạt khi đạt môn học.
- RULE-CREDIT-06: Tổng tín chỉ đạt trong học kỳ được phân biệt với tổng tín chỉ tích lũy.
- RULE-CREDIT-07: Khi tính GPA dùng số tín chỉ quy định của học phần và quy tắc chọn kết quả học lại; không cộng tín chỉ nhiều lần cho cùng một học phần.
- RULE-CREDIT-08: Quy đổi tín chỉ thành số tiết học trên lớp (không tính giờ tự học). Căn cứ: 1 TC lý thuyết = 15 giờ học trên lớp; 1 TC thực hành = 30 giờ học trên lớp; 1 giờ = 60 phút; 1 tiết = 50 phút. Các bước: tín chỉ × số giờ/tín chỉ = số giờ; số giờ × 60 = số phút; số phút ÷ 50 = số tiết:
  - Lý thuyết: 1 TC = 15 giờ trên lớp → 15 × 60 ÷ 50 = 18 tiết.
  - Thực hành/thảo luận: 1 TC = 30 giờ trên lớp → 30 × 60 ÷ 50 = 36 tiết.
  - Số tiết lý thuyết = TC lý thuyết × 18; Số tiết thực hành = TC thực hành × 36; Tổng số tiết = tổng hai loại.
- RULE-CREDIT-09: Người dùng chỉ nhập số tín chỉ lý thuyết và thực hành; hệ thống tự tính số tiết và hiển thị để kiểm tra trước khi lưu. Backend tự tính lại khi lưu, không tin giá trị số tiết do frontend gửi lên. Cùng một công thức cho mọi màn hình và API (Academic::tinhSoTiet).
- RULE-CREDIT-10: Khi số tín chỉ thay đổi, hệ thống tính lại số tiết và xếp lại lịch các lớp học phần của môn (RULE-XL).
- RULE-CREDIT-11: Môn học cũ chưa có phân loại tín chỉ lý thuyết/thực hành được giữ nguyên dữ liệu, hiển thị "Chưa khai báo"; không suy đoán hoặc tự phân bổ. Phải bổ sung phân loại trước khi áp dụng quy đổi.
- Cấu hình (app/core/Academic.php): TIN_CHI_MIN = 1, TIN_CHI_MAX = 10, TIET_MOI_TC_LY_THUYET = 18, TIET_MOI_TC_THUC_HANH = 36 (theo cách tính 30 giờ đồng hồ; đổi hằng số nếu quy định chính thức của trường khác).

## RULE-MH: Khai báo môn học
- RULE-MH-01: Khi tạo hoặc sửa môn học, người dùng khai báo mã môn, tên môn, số tín chỉ lý thuyết, số tín chỉ thực hành; loại môn (Lý thuyết / Thực hành / Kết hợp) được xác định từ hai giá trị này.
- RULE-MH-02: Số tiết lý thuyết, số tiết thực hành và tổng số tiết do hệ thống tính theo RULE-CREDIT-08.
- RULE-MH-03: Tiết thành phần (lý thuyết/thực hành) khác điểm thành phần (chuyên cần, giữa kỳ, cuối kỳ); không ảnh hưởng công thức điểm.
- RULE-MH-04: Quản trị viên và giảng viên được tạo môn học; sửa/xóa môn học do quản trị viên thực hiện. Sinh viên không được tạo môn học.

## RULE-HK: Học kỳ
- RULE-HK-01: Học kỳ (bảng hoc_ky) gồm năm học, số học kỳ (1, 2, 3), ngày bắt đầu, ngày kết thúc; do quản trị viên khai báo.
- RULE-HK-02: Ngày kết thúc phải lớn hơn ngày bắt đầu.
- RULE-HK-03: Mọi buổi học phải nằm trong khoảng ngày của học kỳ.
- RULE-HK-04: Không mặc định độ dài học kỳ; luôn dùng ngày bắt đầu và kết thúc đã khai báo.
- RULE-HK-05: Không tạo bảng phân bố số tiết theo tuần.
- RULE-HK-06: Học kỳ đã có lớp học phần thì không đổi năm học / số học kỳ và không xóa; được đổi ngày nếu khoảng ngày mới vẫn bao trùm mọi buổi học đã xếp (RULE-HK-03).
- RULE-HK-07: Số tuần của học kỳ = số tuần lịch (Thứ 2 → Chủ nhật) mà học kỳ đi qua: (Thứ 2 của tuần chứa ngày kết thúc − Thứ 2 của tuần chứa ngày bắt đầu) ÷ 7 + 1. Danh sách học kỳ và thời khóa biểu dùng chung công thức này.
- RULE-HK-08: Các học kỳ trong cùng năm học không được chồng thời gian nhau.
- RULE-HK-09: Dữ liệu cũ vi phạm (chồng lấn, buổi học nằm ngoài học kỳ) được cảnh báo trên danh sách học kỳ và thời khóa biểu; thời khóa biểu mở rộng tuần để vẫn hiển thị đủ các buổi học.

## RULE-LHP: Tạo lớp học phần
- RULE-LHP-01: Khi tạo lớp học phần, người dùng chọn môn học, học kỳ (đã khai báo), giảng viên phụ trách, phòng học, một hoặc nhiều thứ học trong tuần, tiết bắt đầu và tiết kết thúc của mỗi thứ.
- RULE-LHP-02: Lớp học phần là lớp mở cho sinh viên đăng ký (môn, giảng viên, phòng, lịch, sĩ số). Lớp sinh viên (lớp hành chính, VD CNTT01) là thực thể riêng; lớp học phần không bắt buộc gắn với lớp sinh viên. Sinh viên đăng ký lớp học phần còn chỗ theo các rule đăng ký.
- RULE-LHP-03: Quản trị viên và giảng viên được tạo lớp học phần; giảng viên tạo lớp thì chính giảng viên đó phụ trách. Sinh viên không được tạo lớp học phần.
- RULE-LHP-04: Xóa lớp học phần bị chặn khi lớp đã có điểm (giữa kỳ hoặc cuối kỳ) hoặc còn sinh viên đang đăng ký (chưa hủy). Lớp chưa có điểm và mọi đăng ký đều đã hủy (hoặc chưa ai đăng ký) thì được xóa, hệ thống xóa luôn đăng ký đã hủy, điểm danh, lịch học và buổi học của lớp.

## RULE-TKB: Khung giờ tiết học
- RULE-TKB-01: Một ngày có 13 tiết cố định (khai báo trong mã nguồn, không lưu DB): 1 06:45-07:35, 2 07:45-08:35, 3 08:45-09:35, 4 09:45-10:35, 5 10:45-11:35, 6 12:30-13:20, 7 13:30-14:20, 8 14:30-15:20, 9 15:30-16:20, 10 16:30-17:20, 11 17:30-18:20, 12 18:30-19:20, 13 19:30-20:20.
- RULE-TKB-02: Chỉ được chọn tiết từ 1 đến 13; tiết kết thúc ≥ tiết bắt đầu.
- RULE-TKB-03: Số tiết của một buổi = tiết kết thúc − tiết bắt đầu + 1.
- RULE-TKB-04: Giờ bắt đầu lấy theo tiết bắt đầu, giờ kết thúc lấy theo tiết kết thúc từ bảng giờ cố định (VD tiết 2-4: 07:45-10:35; tiết 6-8: 12:30-15:20); không cộng liên tục 50 phút.

## RULE-XL: Tự động phân bổ lịch học
- RULE-XL-01: Tổng số tiết cần xếp lấy từ môn học (RULE-CREDIT-08).
- RULE-XL-02: Lấy học kỳ, các thứ học và khung tiết đã chọn.
- RULE-XL-03: Tạo danh sách ngày phù hợp trong học kỳ theo thứ tự thời gian (1 thứ: mọi buổi vào thứ đó; nhiều thứ: lần lượt theo ngày).
- RULE-XL-04: Với từng ngày, kiểm tra xung đột (RULE-XD) trước khi tạo buổi học.
- RULE-XL-05: Không xung đột thì tạo buổi học và cộng số tiết vào tổng đã xếp.
- RULE-XL-06: Xung đột thì bỏ qua ngày đó và xét ngày phù hợp tiếp theo trong các thứ đã chọn.
- RULE-XL-07: Tiếp tục đến khi đủ tổng số tiết hoặc hết ngày học hợp lệ.
- RULE-XL-08: Không tự chuyển sang thứ chưa chọn, không tự đổi khung tiết, không xếp lịch ngoài học kỳ.
- RULE-XL-09: Buổi cuối được rút ngắn còn đúng số tiết còn thiếu (theo quy định của trường, cấu hình CHO_PHEP_RUT_NGAN_BUOI_CUOI); không kéo dài. VD 54 tiết, mỗi buổi 4 tiết: 13 buổi đủ + 1 buổi 2 tiết. Nếu không cho phép rút ngắn thì dừng và báo số tiết còn thiếu.
- RULE-XL-10: Hết học kỳ mà chưa đủ tiết thì thông báo số tiết đã xếp và số tiết còn thiếu.
- RULE-XL-11: Khi sửa lịch hoặc số tiết môn, buổi đã điểm danh và buổi đã diễn ra (ngày học trước hôm nay) được giữ nguyên và tính vào tổng; chỉ các buổi tương lai chưa điểm danh được xếp lại. Lịch trong tuần đã có buổi đã diễn ra không được xóa. Không xóa lịch sử điểm danh, điểm hoặc đăng ký. Sinh lịch nhiều lần không tạo bản ghi trùng.
- RULE-XL-12: Buổi học mới chỉ được xếp từ ngày hiện tại trở đi; các ngày đã qua chỉ giữ buổi đã có, không tạo thêm buổi trong quá khứ.

## RULE-XD: Kiểm tra xung đột
- RULE-XD-01: Một buổi học bị xung đột nếu cùng ngày thực tế, khoảng tiết giao nhau và trùng giảng viên hoặc phòng học với buổi của lớp học phần đang mở khác.
- RULE-XD-02: Hai khoảng tiết giao nhau khi start_A <= end_B AND start_B <= end_A; chỉ xét khi hai buổi cùng ngày thực tế.
- RULE-XD-03: Hai buổi cùng thứ nhưng khác ngày thực tế, hoặc hai lớp cùng học kỳ, không mặc nhiên xung đột.
- RULE-XD-04: Trong cùng một lớp học phần, hai lịch trong tuần không được trùng khung tiết cùng thứ.
- RULE-XD-05: Lớp sinh viên không gắn với lớp học phần (RULE-LHP-02) nên trùng lịch của sinh viên được kiểm tra khi sinh viên đăng ký học phần.

## RULE-THIEU: Xử lý khi không đủ lịch
- RULE-THIEU-01: Ngày bị xung đột được bỏ qua, xét ngày hợp lệ tiếp theo thuộc các thứ đã chọn.
- RULE-THIEU-02: Hết học kỳ mà chưa đủ tiết thì không tạo lịch ngoài học kỳ.
- RULE-THIEU-03: Không lưu / không đánh dấu hoàn thành khi tổng số tiết đã xếp thấp hơn tổng số tiết yêu cầu.
- RULE-THIEU-04: Thông báo số tiết đã xếp, số tiết còn thiếu và nguyên nhân chính (số ngày bị bỏ qua do xung đột, hết ngày học trong học kỳ).
- RULE-THIEU-05: Người tạo điều chỉnh thứ học, khung tiết hoặc học kỳ rồi xếp lại.
- RULE-THIEU-06: Hiển thị lịch dự kiến ("Xem trước lịch") để kiểm tra trước khi xác nhận lưu.

## RULE-DL: Dữ liệu và phân quyền
- RULE-DL-01: Môn học lưu số tín chỉ (tổng, lý thuyết, thực hành) và số tiết (tổng, lý thuyết, thực hành).
- RULE-DL-02: Học kỳ lưu ngày bắt đầu và ngày kết thúc (bảng hoc_ky).
- RULE-DL-03: Lớp học phần tham chiếu môn học và học kỳ (hoc_ky + nam_hoc phải có trong bảng hoc_ky).
- RULE-DL-04: lich_hoc lưu thứ, khung tiết và khoảng ngày áp dụng; buoi_hoc lưu từng buổi thực tế dùng cho TKB, điểm danh và kiểm tra xung đột.
- RULE-DL-05: Không tạo bảng phân bố tiết theo tuần; không xóa dữ liệu cũ hoặc tạo lại cơ sở dữ liệu; thay đổi schema bằng migration an toàn.
- RULE-DL-06: Backend kiểm tra quyền (401 chưa đăng nhập, 403 sai quyền), không chỉ ẩn nút trên giao diện.
- RULE-DL-07: Thời khóa biểu, điểm danh và danh sách buổi học của lớp cùng đọc một nguồn buoi_hoc; số thứ tự buổi do backend đánh theo ngày học, tiết bắt đầu (Academic::soThuTuBuoi) để mọi màn hình thống nhất.

## RULE-HL: Điều kiện lịch hợp lệ
- RULE-HL-01: Chỉ lưu lớp học phần khi tổng số tiết đã xếp bằng tổng số tiết yêu cầu.
- RULE-HL-02: Tất cả buổi học nằm trong học kỳ.
- RULE-HL-03: Không xung đột giảng viên hoặc phòng học.
- RULE-HL-04: Các tiết nằm trong khung giờ hợp lệ (RULE-TKB-02).
- RULE-HL-05: Dữ liệu lịch được lưu trong cùng một giao dịch; lỗi giữa chừng thì hoàn tác toàn bộ.
