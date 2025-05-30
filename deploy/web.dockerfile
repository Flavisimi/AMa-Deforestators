FROM php:8.2-apache


ARG URL_INSTALL_CLIENT_BASIC='https://download.oracle.com/otn_software/linux/instantclient/2380000/instantclient-basic-linux.arm64-23.8.0.25.04.zip'
ARG URL_INSTALL_CLIENT_SDK='https://download.oracle.com/otn_software/linux/instantclient/2380000/instantclient-sdk-linux.arm64-23.8.0.25.04.zip'

RUN apt-get update

RUN apt install -y unzip curl libaio1

RUN mkdir /opt/oracle
RUN curl ${URL_INSTALL_CLIENT_BASIC} --output /opt/oracle/instantclient-basic-linux.zip
RUN curl ${URL_INSTALL_CLIENT_SDK} --output /opt/oracle/instantclient-sdk-linux.zip
RUN unzip -o '/opt/oracle/instantclient-basic-linux.zip' -d /opt/oracle
RUN unzip -o '/opt/oracle/instantclient-sdk-linux.zip' -d /opt/oracle
RUN rm /opt/oracle/instantclient-*.zip
RUN mv /opt/oracle/instantclient_* /opt/oracle/instantclient
RUN docker-php-ext-configure oci8 --with-oci8=instantclient,/opt/oracle/instantclient
RUN [ ! -e /opt/oracle/instantclient/libclntsh.so ] && ln -s /opt/oracle/instantclient/libclntsh.so.21.1 /opt/oracle/instantclient/libclntsh.so || true


RUN docker-php-ext-install oci8
RUN echo /opt/oracle/instantclient/ > /etc/ld.so.conf.d/oracle-insantclient.conf
RUN ldconfig

# Copy your PHP app
COPY ./web /var/www/html

# Set permissions
RUN chown -R www-data:www-data /var/www/html \
 && chmod -R 755 /var/www/html