<?php

namespace ama\repositories;

use ama\models\Meaning;
use ama\exceptions\ApiException;

require_once( __DIR__ . "/../models/meaning.php");
require_once( __DIR__ . "/../exceptions/api-exception.php");

ini_set('display_errors', 0);
error_reporting(0);

class MeaningRepository
{
    public static string $SQL_SELECT_TEMPLATE = "select id, abbr_id, name, short_expansion, uploader_id, approval_status, lang, domain, created_at, updated_at, (select name from users where id = meanings.uploader_id) as uploader_name from meanings";

    public static function convert_row_to_object( $row ): Meaning
    {
        $meaning = new Meaning();
        $meaning->id = $row["ID"];
        $meaning->abbr_id = $row["ABBR_ID"];
        $meaning->name = $row["NAME"];
        $meaning->short_expansion = $row["SHORT_EXPANSION"];
        $meaning->uploader_id = $row["UPLOADER_ID"];
        $meaning->approval_status = $row["APPROVAL_STATUS"];
        $meaning->lang = $row["LANG"];
        $meaning->domain = $row["DOMAIN"];
        $meaning->created_at = new \DateTime();
        $meaning->created_at->setTimestamp(strtotime($row["CREATED_AT"]));
        $meaning->updated_at = new \DateTime();
        $meaning->updated_at->setTimestamp(strtotime($row["UPDATED_AT"]));
        $meaning->uploader_name = $row["UPLOADER_NAME"];
        
        return $meaning;
    }

    public static function load_meaning($conn, int $id): ?Meaning
    {
        $stmt = oci_parse($conn, self::$SQL_SELECT_TEMPLATE . " where id = :id");
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");
        oci_bind_by_name($stmt, ":id", $id);
        
        if(!oci_execute($stmt)) 
            throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");
        
        
        $row = oci_fetch_array($stmt, OCI_ASSOC);
        if($row === false)
        {
            return null;
        }

        $meaning = MeaningRepository::convert_row_to_object($row);

        oci_free_statement($stmt);

        return $meaning;
    }

    public static function load_all_meanings($conn): ?array
    {
        $stmt = oci_parse($conn, self::$SQL_SELECT_TEMPLATE);
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");
        if(!oci_execute($stmt)) 
            throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");
        
        $output = array();
        while(($row = oci_fetch_array($stmt, OCI_ASSOC)) != false)
        {
            $meaning = MeaningRepository::convert_row_to_object($row);

            $output[$row["ID"]] = $meaning;
        }

        oci_free_statement($stmt);

        return $output;
    }

    public static function load_meanings_by_abbr_id($conn, int $abbr_id): ?array
    {
        $stmt = oci_parse($conn, self::$SQL_SELECT_TEMPLATE . " where abbr_id = :abbr_id");
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");
        oci_bind_by_name($stmt, ":abbr_id", $abbr_id);
        
        if(!oci_execute($stmt)) 
            throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");
        
        $output = array();
        while(($row = oci_fetch_array($stmt, OCI_ASSOC)) != false)
        {
            $meaning = MeaningRepository::convert_row_to_object($row);

            $output[$row["ID"]] = $meaning;
        }

        oci_free_statement($stmt);

        return $output;
    }

    public static function load_meanings_by_uploader_id($conn, int $uploader_id): ?array
    {
        $stmt = oci_parse($conn, self::$SQL_SELECT_TEMPLATE . " where uploader_id = :uploader_id");
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");
        oci_bind_by_name($stmt, ":uploader_id", $uploader_id);
        
        if(!oci_execute($stmt)) 
            throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");
        
        $output = array();
        while(($row = oci_fetch_array($stmt, OCI_ASSOC)) != false)
        {
            $meaning = MeaningRepository::convert_row_to_object($row);

            $output[$row["ID"]] = $meaning;
        }

        oci_free_statement($stmt);

        return $output;
    }

    public static function load_meanings_from_list($conn, int $list_id): ?array
    {
        $stmt = oci_parse($conn, self::$SQL_SELECT_TEMPLATE . " join abbr_list_contents on meanings.id = abbr_list_contents.meaning_id and abbr_list_contents.list_id = :list_id order by list_index asc");
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");
        oci_bind_by_name($stmt, ":list_id", $list_id);
        
        if(!oci_execute($stmt)) 
            throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");
        
        $output = array();
        $index = 0;
        while(($row = oci_fetch_array($stmt, OCI_ASSOC)) != false)
        {
            $meaning = MeaningRepository::convert_row_to_object($row);

            $output[$index++] = $meaning;
        }

        oci_free_statement($stmt);

        return $output;
    }
    public static function search_meanings($conn, string $query): ?array
{
    $search_term = '%' . strtolower($query) . '%';
    
    $sql = "SELECT m.id, m.abbr_id, m.name, m.short_expansion, m.uploader_id, m.approval_status, m.lang, m.domain, m.created_at, m.updated_at, 
                   (SELECT name FROM users WHERE id = m.uploader_id) as uploader_name
            FROM meanings m 
            JOIN abbreviations a ON m.abbr_id = a.id 
            WHERE LOWER(m.name) LIKE :search_term 
            OR LOWER(m.short_expansion) LIKE :search_term
            OR LOWER(a.searchable_name) LIKE :search_term
            ORDER BY a.searchable_name, m.name";
    
    $stmt = oci_parse($conn, $sql);
    if(!$stmt) 
        throw new ApiException(500, "Failed to parse SQL statement");
    
    oci_bind_by_name($stmt, ':search_term', $search_term);
    
    if (!oci_execute($stmt)) {
        oci_free_statement($stmt);
        throw new ApiException(500, oci_error($stmt)['message'] ?? "Database error occurred");
    }
    
    $meanings = array();
    while (($row = oci_fetch_array($stmt, OCI_ASSOC)) != false) {
        $meaning = MeaningRepository::convert_row_to_object($row);
        $meanings[] = $meaning;
    }
    
    oci_free_statement($stmt);
    return $meanings;
}

    public static function delete_meaning($conn, int $id, bool $autocommit = false)
    {
        $stmt = oci_parse($conn, "delete from meanings where id = :id");
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");
        
        oci_bind_by_name($stmt, ":id", $id);

        if(!oci_execute($stmt, $autocommit ? OCI_COMMIT_ON_SUCCESS : OCI_NO_AUTO_COMMIT)) 
            throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");

        oci_free_statement($stmt);
    }

    public static function update_meaning($conn, int $id, $dto, bool $autocommit = false)
    {
        $stmt = oci_parse($conn, "update meanings set name = :name, short_expansion = :short, lang = :lang, domain = :dom, approval_status = :status where id = :id");
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");
        
        oci_bind_by_name($stmt, ":name", $dto->name);
        oci_bind_by_name($stmt, ":short", $dto->short_expansion);
        oci_bind_by_name($stmt, ":lang", $dto->lang);
        oci_bind_by_name($stmt, ":dom", $dto->domain);
        oci_bind_by_name($stmt, ":status", $dto->approval_status);
        oci_bind_by_name($stmt, ":id", $id);

        if(!oci_execute($stmt, $autocommit ? OCI_COMMIT_ON_SUCCESS : OCI_NO_AUTO_COMMIT)) 
            throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");

        oci_free_statement($stmt);
    }
}


?>