<?php
namespace ama\helpers;

use ama\exceptions\ApiException;

require_once( __DIR__ . "/../exceptions/api-exception.php");

ini_set('display_errors', 0);
error_reporting(0);

class ConnectionHelper
{
    public static function open_connection()
    {
        $conn = oci_connect(
            getenv('ORACLE_USER'),
            getenv('ORACLE_PASSWORD'),
            '//' . getenv('ORACLE_HOST') . ':' . getenv('ORACLE_PORT') . '/' . getenv('ORACLE_SID')
        );
        if(!$conn)
            throw new ApiException(500, "Can't open database connection");
        return $conn;
    }
}

?>