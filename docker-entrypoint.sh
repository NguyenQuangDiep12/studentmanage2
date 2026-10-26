#!/bin/sh
set -e
# Apache nghe đúng cổng Render cấp
sed -ri "s/Listen 80/Listen ${PORT}/" /etc/apache2/ports.conf
sed -ri "s/:80>/:${PORT}>/" /etc/apache2/sites-available/000-default.conf

# Lần chạy đầu: ổ đĩa trống → chép DB mẫu vào. Các lần sau giữ nguyên dữ liệu.
mkdir -p /var/www/html/database
[ -f /var/www/html/database/app.db ] || cp /opt/seed/app.db /var/www/html/database/app.db
chown -R www-data:www-data /var/www/html/database   # SQLite cần quyền ghi cả thư mục (file journal)

exec apache2-foreground