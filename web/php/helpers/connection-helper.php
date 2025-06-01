<?php
namespace ama\helpers;

class ConnectionHelper
{
    public static function open_connection()
    {
        $conn = oci_connect(
            getenv('ORACLE_USER'),
            getenv('ORACLE_PASSWORD'),
            '//' . getenv('ORACLE_HOST') . ':' . getenv('ORACLE_PORT') . '/' . getenv('ORACLE_SID')
        );
        return $conn;
    }
}

?>