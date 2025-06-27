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
    public static string $SQL_SELECT_TEMPLATE = "select id, creator_id, name, private, created_at, updated_at, (select name from users where id = abbr_lists.creator_id) as creator_name, (select role from users where id = abbr_lists.creator_id) as creator_role, (select count(*) from abbr_list_contents where list_id = abbr_lists.id) as meanings_count from abbr_lists";

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
        $abbr_list->creator_name = $row["CREATOR_NAME"];
        $abbr_list->creator_role = $row["CREATOR_ROLE"] ?? "USER";
        $abbr_list->meanings_count = $row["MEANINGS_COUNT"];
        
        return $abbr_list;
    }

    public static function load_abbreviation_list($conn, int $id): ?AbbreviationList
    {
        $stmt = oci_parse($conn, self::$SQL_SELECT_TEMPLATE . " where id = :id");
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
        $stmt = oci_parse($conn, self::$SQL_SELECT_TEMPLATE);
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

   public static function search_abbr_lists($conn, string $search_query = '', int $user_id = null, bool $public_only = null, bool $private_only = null): ?array
{
    $where_conditions = [];
    $bind_params = [];
    
    if ($user_id !== null) {
        $where_conditions[] = "creator_id = :user_id";
        $bind_params['user_id'] = $user_id;
    }
    
    if (!empty($search_query)) {
        $escaped_query = str_replace("'", "''", strtoupper($search_query));
        $where_conditions[] = "(UPPER(name) LIKE '%" . $escaped_query . "%' OR UPPER((select name from users where id = abbr_lists.creator_id)) LIKE '%" . $escaped_query . "%')";
    }
    
    if ($public_only === true) {
        $where_conditions[] = "private = 0";
    } elseif ($private_only === true) {
        $where_conditions[] = "private = 1";
    }
    
    $sql = self::$SQL_SELECT_TEMPLATE;
    if (!empty($where_conditions)) {
        $sql .= " WHERE " . implode(" AND ", $where_conditions);
    }
    $sql .= " ORDER BY name ASC";
    
    $stmt = oci_parse($conn, $sql);
    if(!$stmt) 
        throw new ApiException(500, "Failed to parse SQL statement");

    foreach ($bind_params as $param_name => $param_value) {
        oci_bind_by_name($stmt, ":$param_name", $param_value);
    }

    if(!oci_execute($stmt)) 
        throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");
    
    $output = array();
    while(($row = oci_fetch_array($stmt, OCI_ASSOC)) != false)
    {
        $abbr_list = AbbreviationListRepository::convert_row_to_object($row);
        $output[] = $abbr_list;
    }

    oci_free_statement($stmt);
    return $output;
}

    public static function load_all_abbr_lists_by_user($conn, int $user_id): ?array
    {
        $stmt = oci_parse($conn, self::$SQL_SELECT_TEMPLATE . " where creator_id = :id");
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
        $stmt = oci_parse($conn, self::$SQL_SELECT_TEMPLATE . " where name = :name");
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

    public static function update_abbr_list($conn, int $id, string $name, bool $private)
    {
        $stmt = oci_parse($conn, "update abbr_lists set name = :name, private = :private where id = :id");
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");
        
        oci_bind_by_name($stmt, ":name", $name);
        $private_in_sql = $private ? "1" : "0";
        oci_bind_by_name($stmt, ":private", $private_in_sql);
        oci_bind_by_name($stmt, ":id", $id);

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

    public static function delete_abbr_list_entry_by_meaning($conn, int $list_id, int $meaning_id)
    {
        $stmt = oci_parse($conn, "delete from abbr_list_contents where list_id = :list_id and meaning_id = :meaning_id");
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");
        
        oci_bind_by_name($stmt, ":list_id", $list_id);
        oci_bind_by_name($stmt, ":meaning_id", $meaning_id);

        if(!oci_execute($stmt, OCI_COMMIT_ON_SUCCESS)) 
            throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");

        oci_free_statement($stmt);
    }
}

?>