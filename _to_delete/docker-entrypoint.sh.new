#!/bin/sh
set -e
# Apache nghe đúng cổng Render cấp
sed -ri "s/Listen 80/Listen ${PORT}/" /etc/apache2/ports.conf
sed -ri "s/:80>/:${PORT}>/" /etc/apache2/sites-available/000-default.conf

# URL công khai cho các redirect do Apache tự sinh (RewriteRule [R], thêm "/" cuối thư mục...).
# Trên Render, HTTPS kết thúc ở proxy; Apache chỉ thấy HTTP ở cổng nội bộ ${PORT}, nên nếu không
# khai báo thì Location sẽ thành http://<host>:${PORT}/... (sai giao thức, lộ cổng nội bộ).
# Tên miền lấy từ biến môi trường phía server (APP_HOSTNAME nếu tự đặt, mặc định
# RENDER_EXTERNAL_HOSTNAME do Render cấp) - không tin header Host / X-Forwarded-* của client.
# Phải đặt TRONG <VirtualHost>: vhost lấy cổng từ địa chỉ *:${PORT} của chính nó, không kế thừa
# scheme/cổng từ ServerName toàn cục.
PUBLIC_HOST="${APP_HOSTNAME:-${RENDER_EXTERNAL_HOSTNAME:-}}"
VHOST=/etc/apache2/sites-available/000-default.conf
echo 'ServerName localhost' > /etc/apache2/conf-available/zz-servername.conf   # tắt cảnh báo AH00558
a2enconf -q zz-servername
sed -i '/# BEGIN public-url/,/# END public-url/d' "$VHOST"   # chạy lại container không bị chèn trùng
if [ -n "$PUBLIC_HOST" ] && printf '%s' "$PUBLIC_HOST" | grep -Eqx '[A-Za-z0-9.-]+'; then
    sed -i "/^<VirtualHost /a\\
	# BEGIN public-url\\
	ServerName https://${PUBLIC_HOST}:443\\
	UseCanonicalName On\\
	# END public-url" "$VHOST"
elif [ -n "$PUBLIC_HOST" ]; then
    echo "Bỏ qua hostname không hợp lệ: $PUBLIC_HOST" >&2
fi
# Không có hostname (docker cục bộ): giữ mặc định, redirect theo Host:cổng trình duyệt gửi.

# Lần chạy đầu: ổ đĩa trống → chép DB mẫu vào. Các lần sau giữ nguyên dữ liệu.
mkdir -p /var/www/html/database
[ -f /var/www/html/database/app.db ] || cp /opt/seed/app.db /var/www/html/database/app.db
chown -R www-data:www-data /var/www/html/database   # SQLite cần quyền ghi cả thư mục (file journal)

exec apache2-foreground