<?php

namespace ama\repositories;

use ama\models\User;
use ama\exceptions\ApiException;

require_once( __DIR__ . "/../models/user.php");
require_once( __DIR__ . "/../exceptions/api-exception.php");

ini_set('display_errors', 0);
error_reporting(0);

class UsersRepository
{
    public static function convert_row_to_object( $row ): User
    {
        $user = new User();
        $user->id = $row["ID"];
        $user->name = $row["NAME"];
        $user->role = $row["ROLE"];
        $user->email = $row["EMAIL"];
        $user->created_at = new \DateTime();
        $user->created_at->setTimestamp(strtotime($row["CREATED_AT"]));
        $user->updated_at = new \DateTime();
        $user->updated_at->setTimestamp(strtotime($row["UPDATED_AT"]));
        
        $user->description = isset($row["DESCRIPTION"]) ? (string)$row["DESCRIPTION"] : '';
        $user->date_of_birth = isset($row["DATE_OF_BIRTH"]) ? (string)$row["DATE_OF_BIRTH"] : '';
        $user->profile_picture = isset($row["PROFILE_PICTURE"]) && $row["PROFILE_PICTURE"] !== null ? 'has_picture' : '';
        
        return $user;
    }

    public static function load_users_paginated($conn, int $limit, int $offset): ?array
    {
        $stmt = oci_parse($conn, "
            SELECT id, name, role, email, created_at, updated_at, 
                   NVL(description, '') as description, 
                   NVL(TO_CHAR(date_of_birth, 'YYYY-MM-DD'), '') as date_of_birth,
                   CASE WHEN profile_picture IS NOT NULL THEN 'has_picture' ELSE '' END as profile_picture
            FROM (
                SELECT id, name, role, email, created_at, updated_at, description, date_of_birth, profile_picture,
                       ROW_NUMBER() OVER (ORDER BY created_at DESC, id ASC) as rn
                FROM users
            )
            WHERE rn > :offset AND rn <= :end_row
        ");
        
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");
        
        $end_row = $offset + $limit;
        oci_bind_by_name($stmt, ":offset", $offset);
        oci_bind_by_name($stmt, ":end_row", $end_row);
        
        if(!oci_execute($stmt)) 
            throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");
        
        $output = array();
        while(($row = oci_fetch_array($stmt, OCI_ASSOC)) != false)
        {
            $user = UsersRepository::convert_row_to_object($row);
            $output[] = $user;
        }

        oci_free_statement($stmt);
        return $output;
    }

    public static function get_users_count($conn): int
    {
        $stmt = oci_parse($conn, "SELECT COUNT(*) as total FROM users");
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");
        
        if(!oci_execute($stmt)) 
            throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");
        
        $row = oci_fetch_array($stmt, OCI_ASSOC);
        $count = $row ? (int)$row["TOTAL"] : 0;
        
        oci_free_statement($stmt);
        return $count;
    }
}

?>