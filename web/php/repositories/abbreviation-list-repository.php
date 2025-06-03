<?php

namespace ama\repositories;

use ama\models\AbbreviationList;
use ama\exceptions\ApiException;

require_once( __DIR__ . "/../models/abbreviation-list.php");
require_once( __DIR__ . "/../exceptions/api-exception.php");

ini_set('display_errors', 0);
error_reporting(0);

class AbbreviationListRepository
{
    public static function convert_row_to_object( $row ): AbbreviationList
    {
        $abbr_list = new AbbreviationList();
        $abbr_list->id = $row["ID"];
        $abbr_list->creator_id = $row["CREATOR_ID"];
        $abbr_list->name = $row["NAME"];
        $abbr_list->private = $row["PRIVATE"];
        $abbr_list->created_at = new \DateTime();
        $abbr_list->created_at->setTimestamp(strtotime($row["CREATED_AT"]));
        $abbr_list->updated_at = new \DateTime();
        $abbr_list->updated_at->setTimestamp(strtotime($row["UPDATED_AT"]));

        return $abbr_list;
    }

    public static function load_abbreviation_list($conn, int $id): ?AbbreviationList
    {
        $stmt = oci_parse($conn, "select id, creator_id, name, private, created_at, updated_at from abbr_lists where id = :id");
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");

        oci_bind_by_name($stmt,":id", $id);
        
        if(!oci_execute($stmt)) 
            throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");
        
        
        $row = oci_fetch_array($stmt, OCI_ASSOC);
        if($row === false)
        {
            return null;
        }

        $abbr_list = AbbreviationListRepository::convert_row_to_object($row);

        oci_free_statement($stmt);

        return $abbr_list;
    }

    public static function load_all_abbr_lists($conn): ?array
    {
        $stmt = oci_parse($conn, "select id, creator_id, name, private, created_at, updated_at from abbr_lists");
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");

        if(!oci_execute($stmt)) 
            throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");
        
        $output = array();
        while(($row = oci_fetch_array($stmt, OCI_ASSOC)) != false)
        {
            $abbr_list = AbbreviationListRepository::convert_row_to_object($row);

            $output[$row["ID"]] = $abbr_list;
        }

        oci_free_statement($stmt);

        return $output;
    }

    public static function load_all_abbr_lists_by_user($conn, int $user_id): ?array
    {
        $stmt = oci_parse($conn, "select id, creator_id, name, private, created_at, updated_at from abbr_lists where creator_id = :id");
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");

        oci_bind_by_name($stmt, ":id", $user_id);
        
        if(!oci_execute($stmt)) 
            throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");
        
        $output = array();
        while(($row = oci_fetch_array($stmt, OCI_ASSOC)) != false)
        {
            $abbr_list = AbbreviationListRepository::convert_row_to_object($row);

            $output[$row["ID"]] = $abbr_list;
        }

        oci_free_statement($stmt);

        return $output;
    }

    public static function load_abbr_list_by_name($conn, string $name): ?AbbreviationList
    {
        $stmt = oci_parse($conn, "select id, creator_id, name, private, created_at, updated_at from abbr_lists where name = :name");
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");
        
        oci_bind_by_name($stmt, ":name", $name);
        
         if(!oci_execute($stmt)) 
            throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");
        
        $row = oci_fetch_array($stmt, OCI_ASSOC);
        if($row === false)
        {
            return null;
        }

        $abbr_list = AbbreviationListRepository::convert_row_to_object($row);

        oci_free_statement($stmt);

        return $abbr_list;
    }

    public static function insert_abbr_list($conn, string $name, bool $private)
    {
        $stmt = oci_parse($conn, "insert into abbr_lists(creator_id, name, private) values(:creator, :name, :private)");
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");
        
        oci_bind_by_name($stmt, ":name", $name);
        oci_bind_by_name($stmt, ":creator", $_SESSION["user_id"]);
        $private_in_sql = $private ? "1" : "0";
        oci_bind_by_name($stmt, ":private", $private_in_sql);

        if(!oci_execute($stmt, OCI_COMMIT_ON_SUCCESS)) 
            throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");

        oci_free_statement($stmt);
    }

    public static function insert_abbr_list_entry($conn, int $list_id, int $meaning_id)
    {
        $stmt = oci_parse($conn, "insert into abbr_list_contents(list_id, meaning_id) values(:list_id, :meaning_id)");
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");
        
        oci_bind_by_name($stmt, ":list_id", $list_id);
        oci_bind_by_name($stmt, ":meaning_id", $meaning_id);

        if(!oci_execute($stmt, OCI_COMMIT_ON_SUCCESS)) 
            throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");

        oci_free_statement($stmt);
    }

    public static function delete_abbr_list($conn, int $id)
    {
        $stmt = oci_parse($conn, "delete from abbr_lists where id = :id");
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");
        oci_bind_by_name($stmt, ":id", $id);

        if(!oci_execute($stmt, OCI_COMMIT_ON_SUCCESS)) 
            throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");

        oci_free_statement($stmt);
    }

    public static function delete_abbr_list_entry($conn, int $id, int $index)
    {
        $stmt = oci_parse($conn, "delete from abbr_list_contents where list_id = :id and list_index = :list_index");
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");
        oci_bind_by_name($stmt, ":id", $id);
        oci_bind_by_name($stmt, ":list_index", $index);

        if(!oci_execute($stmt, OCI_COMMIT_ON_SUCCESS)) 
            throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");

        oci_free_statement($stmt);
    }
}


?>