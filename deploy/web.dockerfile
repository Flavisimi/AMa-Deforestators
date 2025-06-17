FROM php:8.2-apache

ARG TARGETARCH
ARG URL_INSTALL_CLIENT_BASIC_ARM='https://download.oracle.com/otn_software/linux/instantclient/2380000/instantclient-basic-linux.arm64-23.8.0.25.04.zip'
ARG URL_INSTALL_CLIENT_SDK_ARM='https://download.oracle.com/otn_software/linux/instantclient/2380000/instantclient-sdk-linux.arm64-23.8.0.25.04.zip'
ARG URL_INSTALL_CLIENT_BASIC_AMD='https://download.oracle.com/otn_software/linux/instantclient/2380000/instantclient-basic-linux.x64-23.8.0.25.04.zip'
ARG URL_INSTALL_CLIENT_SDK_AMD='https://download.oracle.com/otn_software/linux/instantclient/2380000/instantclient-sdk-linux.x64-23.8.0.25.04.zip'

RUN apt-get update

RUN apt install -y unzip curl libaio1
RUN ARCH=$(dpkg --print-architecture)
RUN mkdir /opt/oracle
RUN if [ "$TARGETARCH" = "arm64" ]; then \
         curl ${URL_INSTALL_CLIENT_BASIC_ARM} --output /opt/oracle/instantclient-basic-linux.zip &&\
         curl ${URL_INSTALL_CLIENT_SDK_ARM} --output /opt/oracle/instantclient-sdk-linux.zip;\
    else \
         curl ${URL_INSTALL_CLIENT_BASIC_AMD} --output /opt/oracle/instantclient-basic-linux.zip &&\
         curl ${URL_INSTALL_CLIENT_SDK_AMD} --output /opt/oracle/instantclient-sdk-linux.zip;\
    fi
RUN unzip -o '/opt/oracle/instantclient-basic-linux.zip' -d /opt/oracle
RUN unzip -o '/opt/oracle/instantclient-sdk-linux.zip' -d /opt/oracle
RUN rm /opt/oracle/instantclient-*.zip
RUN mv /opt/oracle/instantclient_* /opt/oracle/instantclient
RUN docker-php-ext-configure oci8 --with-oci8=instantclient,/opt/oracle/instantclient


RUN docker-php-ext-install oci8
RUN echo /opt/oracle/instantclient/ > /etc/ld.so.conf.d/oracle-insantclient.conf
RUN ldconfig

# Copy your PHP app
# COPY ./web /var/www/html

RUN a2enmod rewrite

# Set permissions
RUN chown -R www-data:www-data /var/www/html \
 && chmod -R 755 /var/www/html

RUN mkdir /abbreviations
RUN chown -R www-data:www-data /abbreviations \
 && chmod -R 755 /abbreviations

RUN mkdir /tmp/php/
WORKDIR /tmp/php

COPY ./deploy/php/initialize_meanings.php ./initialize_meanings.php
COPY ./deploy/php/default_meanings.csv ./default_meanings.csv
COPY ./deploy/php/init.sh ./init.sh

WORKDIR /var/www/hml
ENTRYPOINT [ "/tmp/php/init.sh" ]
CMD ["apache2-foreground"]