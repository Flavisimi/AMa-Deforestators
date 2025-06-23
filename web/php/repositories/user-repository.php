<?php

namespace ama\repositories;

use ama\models\User;
use ama\exceptions\ApiException;

require_once( __DIR__ . "/../models/user.php");
require_once( __DIR__ . "/../exceptions/api-exception.php");

ini_set('display_errors', 0);
error_reporting(0);

class UserRepository
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

    public static function load_user($conn, int $id): ?User
    {
        $stmt = oci_parse($conn, "select id, name, role, email, created_at, updated_at, NVL(description, '') as description, NVL(TO_CHAR(date_of_birth, 'YYYY-MM-DD'), '') as date_of_birth, CASE WHEN profile_picture IS NOT NULL THEN 'has_picture' ELSE '' END as profile_picture from users where id = :id");
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");
        oci_bind_by_name($stmt, ":id", $id);
        
        if(!oci_execute($stmt)) 
            throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");
        
        $row = oci_fetch_array($stmt, OCI_ASSOC);
        if($row === false)
        {
            oci_free_statement($stmt);
            return null;
        }

        $user = UserRepository::convert_row_to_object($row);

        oci_free_statement($stmt);

        return $user;
    }

    public static function load_all_users($conn): ?array
    {
        $stmt = oci_parse($conn, "select id, name, role, email, created_at, updated_at from users");
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");
        if(!oci_execute($stmt)) 
            throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");
        
        $output = array();
        while(($row = oci_fetch_array($stmt, OCI_ASSOC)) != false)
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
            $user->description = '';
            $user->date_of_birth = '';
            $user->profile_picture = '';

            $output[$row["ID"]] = $user;
        }

        oci_free_statement($stmt);

        return $output;
    }
    
    public static function update_profile($conn, int $user_id, array $data): bool
{
    $sql_parts = [];
    $bind_vars = [];
    
    // Always update the timestamp
    $sql_parts[] = "updated_at = sysdate";
    
    if (isset($data['description'])) {
        $sql_parts[] = "description = :description";
        $bind_vars['description'] = $data['description'];
    }
    
    if (isset($data['date_of_birth']) && $data['date_of_birth'] !== null) {
        $sql_parts[] = "date_of_birth = TO_DATE(:date_of_birth, 'YYYY-MM-DD')";
        $bind_vars['date_of_birth'] = $data['date_of_birth'];
    }
    
    if (isset($data['profile_picture'])) {
        $sql_parts[] = "profile_picture = :picture";
        $bind_vars['picture'] = $data['profile_picture'];
    }
    
    $sql = "UPDATE users SET " . implode(", ", $sql_parts) . " WHERE id = :user_id";
    $bind_vars['user_id'] = $user_id;
    
    $stmt = oci_parse($conn, $sql);
    if (!$stmt) {
        throw new ApiException(500, "Failed to parse SQL statement");
    }
    
    // Bind regular parameters
    foreach ($bind_vars as $key => $value) {
        if ($key === 'picture') {
            // Bind BLOB data
            oci_bind_by_name($stmt, ":$key", $bind_vars[$key], -1, OCI_B_BLOB);
        } else {
            // Bind regular parameters
            oci_bind_by_name($stmt, ":$key", $bind_vars[$key]);
        }
    }
    
    if (!oci_execute($stmt, OCI_COMMIT_ON_SUCCESS)) {
        $error = oci_error($stmt);
        oci_free_statement($stmt);
        throw new ApiException(500, "Failed to update profile: " . ($error['message'] ?? 'unknown'));
    }
    
    oci_free_statement($stmt);
    return true;
}
}

?>