#!/bin/sh

php /tmp/php/initialize_meanings.php
rm -rf /tmp/php
exec docker-php-entrypoint "$@"