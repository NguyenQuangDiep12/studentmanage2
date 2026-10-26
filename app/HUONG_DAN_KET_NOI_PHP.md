# HƯỚNG DẪN KẾT NỐI PHP THUẦN VỚI GIAO DIỆN HỆ THỐNG QUẢN LÝ SINH VIÊN

Hệ thống giao diện được xây dựng hoàn toàn bằng **HTML, CSS, JavaScript thuần và jQuery AJAX**. Hiện tại hệ thống đang sử dụng module `MockDB` (lưu trữ trong `localStorage`) để bạn có thể kiểm thử toàn bộ các luồng nghiệp vụ ngay trên trình duyệt mà không cần cài đặt database trước.

Khi bạn xây dựng Backend bằng **PHP thuần**, bạn chỉ cần thay thế các hàm gọi trong các file `js/*.js` bằng lệnh `$.ajax()` chuẩn kết nối tới các file PHP.

---

## 1. Cấu trúc thư mục khuyến nghị cho PHP Backend

```
c:\APP\
├── css/
│   └── style.css                 # File style chuẩn cho toàn bộ dashboard
├── js/
│   ├── app.js                    # Quản lý điều hướng, phiên đăng nhập, modal, toast
│   ├── mock-data.js              # CSDL mẫu & logic nghiệp vụ (dùng tạm khi chưa có PHP)
│   ├── mon-hoc.js                # Module Quản lý môn học
│   ├── lop-hoc-phan.js           # Module Quản lý Lớp học phần & Lịch học
│   ├── dang-ky.js                # Module Đăng ký học phần (SV)
│   ├── tkb.js                    # Module Thời khóa biểu tuần
│   ├── diem-danh.js              # Module Điểm danh (GV)
│   ├── diem.js                   # Module Nhập điểm (GV)
│   ├── ket-qua.js                # Module Xem điểm & ĐTB (SV)
│   ├── tin-tuc.js                # Module Tin tức (Admin + SV/GV)
│   └── users.js                  # Module Quản lý tài khoản (Admin)
├── api/                          # <-- THƯ MỤC CHỨA CÁC FILE PHP THUẦN CỦA BẠN
│   ├── db_connect.php            # Kết nối PDO / MySQLi
│   ├── auth.php                  # Đăng nhập, đăng xuất, đổi mật khẩu
│   ├── mon_hoc.php               # CRUD Môn học
│   ├── lop_hoc_phan.php          # CRUD Lớp học phần & Lịch học
│   ├── dang_ky.php               # Đăng ký & Hủy đăng ký học phần
│   ├── tkb.php                   # Lấy lịch học theo tuần
│   ├── diem_danh.php             # Lưu & xem lịch sử điểm danh
│   ├── diem.php                  # Lưu & tính điểm tổng kết
│   ├── tin_tuc.php               # Đăng & xem tin tức
│   └── users.php                 # Quản lý tài khoản SV/GV
├── index.html                    # Màn hình đăng nhập (chuẩn theo hình ảnh yêu cầu)
├── dashboard.html                # Màn hình chính sau khi đăng nhập
└── HUONG_DAN_KET_NOI_PHP.md
```

---

## 2. Mẫu file PHP thuần tiếp nhận jQuery AJAX

### Ví dụ 1: `api/db_connect.php`
```php
<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

$host = 'localhost';
$dbname = 'student_management';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Lỗi kết nối CSDL: ' . $e->getMessage()]);
    exit;
}
```

### Ví dụ 2: `api/auth.php` (Đăng nhập)
```php
<?php
require_once 'db_connect.php';

$action = $_POST['action'] ?? '';

if ($action === 'login') {
    $username = trim($_POST['username'] ?? '');
    $password = trim($_POST['password'] ?? '');

    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if ($user && $user['password'] === $password) { // Hoặc dùng password_verify
        if ($user['trang_thai'] !== 'active') {
            echo json_encode(['success' => false, 'message' => 'Tài khoản đã bị khóa!']);
            exit;
        }

        echo json_encode([
            'success' => true,
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'ho_ten' => $user['ho_ten'],
                'vai_tro' => $user['vai_tro'],
                'ma_dinh_danh' => $user['ma_dinh_danh'],
                'lop_sinh_vien_id' => $user['lop_sinh_vien_id'],
                'khoa_id' => $user['khoa_id']
            ]
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Tài khoản hoặc mật khẩu không đúng!']);
    }
}
```

---

## 3. Cách chuyển đổi từ MockDB sang gọi jQuery AJAX

Trong các file `js/*.js`, bạn chỉ cần thay thế các lệnh `MockDB` thành `$.ajax`.

### Ví dụ trong `index.html` (Đăng nhập):
```javascript
// Thay vì tìm trong MockDB:
$.ajax({
    url: 'api/auth.php',
    method: 'POST',
    dataType: 'json',
    data: {
        action: 'login',
        username: username,
        password: password
    },
    success: function(response) {
        if (response.success) {
            localStorage.setItem('sms_current_user', JSON.stringify(response.user));
            window.location.href = 'dashboard.html';
        } else {
            $('#loginErrorText').text(response.message);
            $('#loginError').addClass('show');
        }
    },
    error: function() {
        alert('Lỗi kết nối máy chủ PHP!');
    }
});
```

### Ví dụ trong `js/mon-hoc.js` (Lấy danh sách):
```javascript
loadData: function() {
    $.ajax({
        url: 'api/mon_hoc.php?action=list',
        method: 'GET',
        dataType: 'json',
        success: function(response) {
            var list = response.data;
            // Tiến hành render ra bảng HTML như code có sẵn
        }
    });
}
```

---

## 4. Tài khoản kiểm thử có sẵn

Hệ thống đã tích hợp sẵn 3 tài khoản mẫu ứng với 3 vai trò (như hình ảnh mockup):

1. **Quản trị viên**:
   - Username: `adminaccount1` (hoặc `admin`)
   - Password: `admin123`
2. **Giảng viên**:
   - Username: `lectureraccount1` (hoặc `gv_tran`)
   - Password: `lecturer123` (hoặc `123456`)
3. **Sinh viên**:
   - Username: `studentaccount1` (hoặc `sv_nguyen`)
   - Password: `student123` (hoặc `123456`)

Chỉ cần click trực tiếp vào ô tài khoản mẫu ở trang đăng nhập `index.html`, hệ thống sẽ tự động điền và đăng nhập!
