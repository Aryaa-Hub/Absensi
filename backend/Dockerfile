FROM php:8.4-cli-alpine

# Install php extension installer helper
COPY --from=mlocati/php-extension-installer /usr/bin/install-php-extensions /usr/local/bin/

# Install pdo_pgsql, gd, and zip cleanly without heavy compilation
RUN install-php-extensions pdo_pgsql gd zip

# Get Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

EXPOSE 8000

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
