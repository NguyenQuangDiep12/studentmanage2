FROM php:8.3-apache

# mod_rewrite cho .htaccess, cho phép AllowOverride
RUN a2enmod rewrite headers \
 && sed -ri 's!AllowOverride None!AllowOverride All!g' /etc/apache2/apache2.conf

COPY . /var/www/html/

# Giữ một bản DB mẫu ngoài thư mục database (thư mục này sẽ bị ổ đĩa che)
RUN mkdir -p /opt/seed && cp /var/www/html/database/app.db /opt/seed/app.db \
 && chown -R www-data:www-data /var/www/html

RUN echo "expose_php=Off" > /usr/local/etc/php/conf.d/security.ini

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

RUN echo "ServerTokens Prod" >> /etc/apache2/conf-available/security.conf \
    && echo "ServerSignature Off" >> /etc/apache2/conf-available/security.conf

ENV PORT=10000
EXPOSE 10000
CMD ["docker-entrypoint.sh"]