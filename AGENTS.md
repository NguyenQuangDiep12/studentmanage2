# AGENT RULES

## 1. Công nghệ và cấu trúc
- Backend: PHP thuần, SQLite.
- Frontend: sử dụng HTML, CSS và JavaScript hiện có.
- Không sử dụng framework mới hoặc xây dựng kiến trúc phức tạp.
- Ưu tiên sửa code hiện có, không viết lại toàn bộ dự án.
- Đọc `BUSINESS_RULES.md` trước khi sửa chức năng liên quan đến nghiệp vụ.

## 2. Bảo vệ frontend
- Giữ nguyên giao diện frontend hiện tại.
- Không sửa bố cục, màu sắc, font chữ, kích thước, HTML, CSS hoặc nội dung hiển thị.
- Chỉ sửa JavaScript frontend khi cần kết nối API hoặc sửa lỗi xử lý dữ liệu.
- Không tự ý thêm, xóa hoặc đổi tên nút, biểu mẫu, trang và thành phần giao diện.
- Không thay đổi hành vi người dùng đang sử dụng nếu không có yêu cầu cụ thể.

## 3. Phân chia trách nhiệm
- Frontend chỉ hiển thị giao diện, gửi request và nhận kết quả API.
- Backend xử lý xác thực, phân quyền, kiểm tra dữ liệu, nghiệp vụ và truy vấn SQLite.
- Không truy cập SQLite trực tiếp từ frontend.
- Giữ nguyên tên bảng, tên cột, endpoint và cấu trúc JSON đang được sử dụng, trừ khi có lý do cần thiết và đã kiểm tra ảnh hưởng.

## 4. Quy tắc mật khẩu demo
- Trong môi trường demo cục bộ, lưu mật khẩu dạng văn bản và so sánh trực tiếp theo yêu cầu dự án.
- Không sử dụng `password_hash()` hoặc `password_verify()`.
- Không thêm refresh token hoặc cơ chế xác thực mới nếu không được yêu cầu.
- Giữ nguyên cơ chế JWT hiện có nếu hệ thống đang sử dụng.
- Không tự tạo chức năng đăng ký tài khoản.

## 5. Thực hiện nghiệp vụ
- Đọc các RULE liên quan trước khi triển khai.
- Không tự suy diễn hoặc tự đặt thêm quy tắc nghiệp vụ.
- Nếu rule mâu thuẫn với code hoặc cấu trúc database, chỉ ra điểm mâu thuẫn trước khi sửa.
- Kiểm tra dữ liệu thực tế và schema SQLite trước khi viết SQL.
- Không giả lập kết quả thành công khi dữ liệu chưa được xử lý thành công.
- Không xóa dữ liệu hoặc thay đổi schema nếu chưa được yêu cầu.
- Chỉ triển khai phạm vi được giao, không tự làm thêm các chức năng khác.

## 6. Cách làm việc
Trước khi sửa code:
1. Đọc các file liên quan.
2. Xác định RULE áp dụng.
3. Xác định frontend, endpoint, backend và bảng dữ liệu liên quan.
4. Nêu ngắn gọn các file dự kiến cần sửa.

Khi sửa code:
1. Thực hiện thay đổi tối thiểu.
2. Giữ tương thích với các chức năng hiện có.
3. Không tạo file mới nếu không cần thiết.

Sau khi sửa:
1. Kiểm tra cú pháp PHP.
2. Kiểm tra API và dữ liệu SQLite.
3. Kiểm tra luồng nghiệp vụ liên quan.
4. Kiểm tra frontend không bị thay đổi giao diện.
5. Báo rõ file đã sửa, kết quả kiểm tra và lỗi còn tồn tại.
