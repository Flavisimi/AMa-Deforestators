FROM php:8.2-apache

# Install dependencies
RUN apt-get update && apt-get install -y \
    libaio1 \
    unzip \
    build-essential \
    libaio-dev \
    autoconf \
    && rm -rf /var/lib/apt/lists/*

# Create target dir and copy zips
RUN mkdir -p /opt/oracle
COPY deploy/instantclient-basic-linux.zip /opt/oracle/
COPY deploy/instantclient-sdk-linux.zip /opt/oracle/

# Unzip, inspect contents, and prepare Instant Client
WORKDIR /opt/oracle
RUN unzip -q instantclient-basic-linux.zip -d /opt/oracle/ \
 && unzip -q instantclient-sdk-linux.zip -d /opt/oracle/ \
 && ls -l /opt/oracle/ \
 && find /opt/oracle/ -type d -name include \
 && find /opt/oracle/ -type f -name oci.h \
 && rm -f instantclient-basic-linux.zip instantclient-sdk-linux.zip \
 && mkdir -p /opt/oracle/instantclient_23_8/include \
 && find /opt/oracle/ -type d -name include -exec cp -r {}/* /opt/oracle/instantclient_23_8/include/ \; 2>/dev/null || true \
 && rm -rf /opt/oracle/instantclient*/sdk 2>/dev/null || true \
 && echo /opt/oracle/instantclient_23_8 > /etc/ld.so.conf.d/oracle-instantclient.conf \
 && ldconfig

# Set environment variable for OCI runtime linking
ENV LD_LIBRARY_PATH=/opt/oracle/instantclient_23_8

# Install oci8 via PECL
RUN docker-php-source extract \
 && echo "instantclient,/opt/oracle/instantclient_23_8" | pecl install oci8-3.2.0 \
 && docker-php-ext-enable oci8 \
 && docker-php-source delete

# Copy your PHP app
COPY ./web /var/www/html

# Set permissions
RUN chown -R www-data:www-data /var/www/html \
 && chmod -R 755 /var/www/html