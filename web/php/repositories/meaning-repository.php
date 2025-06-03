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
    public static function convert_row_to_object( $row ): Meaning
    {
        $meaning = new Meaning();
        $meaning->id = $row["ID"];
        $meaning->abbr_id = $row["ABBR_ID"];
        $meaning->name = $row["NAME"];
        $meaning->short_expansion = $row["SHORT_EXPANSION"];
        $meaning->description = $row["DESCRIPTION"];
        $meaning->uploader_id = $row["UPLOADER_ID"];
        $meaning->approval_status = $row["APPROVAL_STATUS"];
        $meaning->lang = $row["LANG"];
        $meaning->domain = $row["DOMAIN"];
        $meaning->created_at = new \DateTime();
        $meaning->created_at->setTimestamp(strtotime($row["CREATED_AT"]));
        $meaning->updated_at = new \DateTime();
        $meaning->updated_at->setTimestamp(strtotime($row["UPDATED_AT"]));
        
        return $meaning;
    }

    public static function load_meaning($conn, int $id): ?Meaning
    {
        $stmt = oci_parse($conn, "select id, abbr_id, name, short_expansion, description, uploader_id, approval_status, lang, domain, created_at, updated_at from meanings where id = :id");
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
        $stmt = oci_parse($conn, "select id, abbr_id, name, short_expansion, description, uploader_id, approval_status, lang, domain, created_at, updated_at from meanings");
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
        $stmt = oci_parse($conn, "select id, abbr_id, name, short_expansion, description, uploader_id, approval_status, lang, domain, created_at, updated_at from meanings where abbr_id = :abbr_id");
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

    public static function load_meanings_from_list($conn, int $list_id): ?array
    {
        $stmt = oci_parse($conn, "select id, abbr_id, name, short_expansion, description, uploader_id, approval_status, lang, domain, created_at, updated_at from meanings join abbr_list_contents on meanings.id = abbr_list_contents.meaning_id and abbr_list_contents.list_id = :list_id order by list_index asc");
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
    $sql = "SELECT * FROM meanings m 
            JOIN abbreviations a ON m.abbreviation_id = a.id 
            WHERE LOWER(a.name) LIKE LOWER(:query) 
            OR LOWER(m.meaning) LIKE LOWER(:query)
            ORDER BY a.name";
    
    $stmt = oci_parse($conn, $sql);
    oci_bind_by_name($stmt, ':query', '%' . $query . '%');
    
    if (!oci_execute($stmt)) {
        throw new ApiException(500, "Database error occurred");
    }
    
    $meanings = [];
    while ($row = oci_fetch_assoc($stmt)) {
        $meaning = new Meaning();
        $meaning->id = $row['ID'];
        $meaning->abbreviation = $row['NAME']; 
        $meaning->meaning = $row['MEANING'];
        $meanings[] = $meaning;
    }
    
    return $meanings;
}
}


?>