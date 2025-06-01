<?php

namespace ama\repositories;

use ama\models\User;
require_once( __DIR__ . "/../models/user.php");

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
        
        return $user;
    }

    public static function load_user($conn, int $id): ?User
    {
        $stmt = oci_parse($conn, "select id, name, role, email, created_at, updated_at from users where id = :id");
        oci_bind_by_name($stmt, ":id", $id);
        
        oci_execute($stmt);
        
        $row = oci_fetch_array($stmt, OCI_ASSOC);
        if($row === false)
        {
            return null;
        }

        $user = UserRepository::convert_row_to_object($row);

        oci_free_statement($stmt);

        return $user;
    }

    public static function load_all_users($conn): ?array
    {
        $stmt = oci_parse($conn, "select id, name, role, email, created_at, updated_at from users");
        
        oci_execute($stmt);
        
        $output = array();
        while(($row = oci_fetch_array($stmt, OCI_ASSOC)) != false)
        {
            $user = UserRepository::convert_row_to_object($row);

            $output[$row["ID"]] = $user;
        }

        oci_free_statement($stmt);

        return $output;
    }
}


?>