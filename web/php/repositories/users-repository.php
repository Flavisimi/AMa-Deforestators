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
        
        try {
            $user->created_at = new \DateTime();
            if (!empty($row["CREATED_AT"])) {
                $user->created_at->setTimestamp(strtotime($row["CREATED_AT"]));
            }
        } catch (Exception $e) {
            $user->created_at = new \DateTime();
        }
        
        try {
            $user->updated_at = new \DateTime();
            if (!empty($row["UPDATED_AT"])) {
                $user->updated_at->setTimestamp(strtotime($row["UPDATED_AT"]));
            }
        } catch (Exception $e) {
            $user->updated_at = new \DateTime();
        }
        
        $user->description = isset($row["DESCRIPTION"]) ? (string)$row["DESCRIPTION"] : '';
        $user->date_of_birth = isset($row["DATE_OF_BIRTH"]) ? (string)$row["DATE_OF_BIRTH"] : '';
        $user->profile_picture = isset($row["PROFILE_PICTURE"]) && $row["PROFILE_PICTURE"] !== null ? 'has_picture' : '';
        
        return $user;
    }

    public static function load_users_paginated($conn, int $limit, int $offset): ?array
    {
        $stmt = oci_parse($conn, "
            SELECT id, name, role, email, 
                   TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at,
                   TO_CHAR(updated_at, 'YYYY-MM-DD HH24:MI:SS') as updated_at,
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

    public static function search_users($conn, string $query, int $limit, int $offset): ?array
    {
        $search_pattern = '%' . strtolower($query) . '%';
        
        $stmt = oci_parse($conn, "
            SELECT id, name, role, email, 
                   TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at,
                   TO_CHAR(updated_at, 'YYYY-MM-DD HH24:MI:SS') as updated_at,
                   NVL(description, '') as description, 
                   NVL(TO_CHAR(date_of_birth, 'YYYY-MM-DD'), '') as date_of_birth,
                   CASE WHEN profile_picture IS NOT NULL THEN 'has_picture' ELSE '' END as profile_picture
            FROM (
                SELECT id, name, role, email, created_at, updated_at, description, date_of_birth, profile_picture,
                       ROW_NUMBER() OVER (ORDER BY created_at DESC, id ASC) as rn
                FROM users
                WHERE LOWER(name) LIKE :search_pattern 
                   OR LOWER(email) LIKE :search_pattern 
                   OR LOWER(role) LIKE :search_pattern
            )
            WHERE rn > :offset AND rn <= :end_row
        ");
        
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");
        
        $end_row = $offset + $limit;
        oci_bind_by_name($stmt, ":search_pattern", $search_pattern);
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

    public static function get_search_users_count($conn, string $query): int
    {
        $search_pattern = '%' . strtolower($query) . '%';
        
        $stmt = oci_parse($conn, "
            SELECT COUNT(*) as total 
            FROM users 
            WHERE LOWER(name) LIKE :search_pattern 
               OR LOWER(email) LIKE :search_pattern 
               OR LOWER(role) LIKE :search_pattern
        ");
        
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");
        
        oci_bind_by_name($stmt, ":search_pattern", $search_pattern);
        
        if(!oci_execute($stmt)) 
            throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");
        
        $row = oci_fetch_array($stmt, OCI_ASSOC);
        $count = $row ? (int)$row["TOTAL"] : 0;
        
        oci_free_statement($stmt);
        return $count;
    }

    public static function update_user_role($conn, int $user_id, string $new_role): bool
    {
        $stmt = oci_parse($conn, "UPDATE users SET role = :role, updated_at = sysdate WHERE id = :user_id");
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");
        
        oci_bind_by_name($stmt, ":role", $new_role);
        oci_bind_by_name($stmt, ":user_id", $user_id);
        
        if(!oci_execute($stmt, OCI_COMMIT_ON_SUCCESS)) 
            throw new ApiException(500, oci_error($stmt)['message'] ?? "Failed to update user role");
        
        oci_free_statement($stmt);
        return true;
    }

    public static function delete_user($conn, int $user_id): bool
    {
        $stmt = oci_parse($conn, "DELETE FROM users WHERE id = :user_id");
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");
        
        oci_bind_by_name($stmt, ":user_id", $user_id);
        
        if(!oci_execute($stmt, OCI_COMMIT_ON_SUCCESS)) 
            throw new ApiException(500, oci_error($stmt)['message'] ?? "Failed to delete user");
        
        oci_free_statement($stmt);
        return true;
    }
}

?>