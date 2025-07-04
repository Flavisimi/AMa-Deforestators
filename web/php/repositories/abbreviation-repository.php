<?php

namespace ama\repositories;

use ama\dtos\AbbrInsertDTO;
use ama\models\Abbreviation;
use ama\exceptions\ApiException;

require_once( __DIR__ . "/../models/abbreviation.php");
require_once( __DIR__ . "/../dtos/abbreviation-insert-dto.php");
require_once( __DIR__ . "/../exceptions/api-exception.php");

ini_set('display_errors', 0);
error_reporting(0);

class AbbreviationRepository
{
    public static function convert_row_to_object( $row ): Abbreviation
    {
        $abbreviation = new Abbreviation();
        $abbreviation->id = $row["ID"];
        $abbreviation->searchable_name = $row["SEARCHABLE_NAME"];
        $abbreviation->meaning_count = $row["MEANING_COUNT"];
        $abbreviation->created_at = new \DateTime();
        $abbreviation->created_at->setTimestamp(strtotime($row["CREATED_AT"]));
        $abbreviation->updated_at = new \DateTime();
        $abbreviation->updated_at->setTimestamp(strtotime($row["UPDATED_AT"]));

        return $abbreviation;
    }

    public static function load_abbreviation($conn, int $id): ?Abbreviation
    {
        $stmt = oci_parse($conn, "select id, searchable_name, meaning_count, created_at, updated_at from abbreviations where id = :id");
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

        $abbreviation = AbbreviationRepository::convert_row_to_object($row);

        oci_free_statement($stmt);

        return $abbreviation;
    }

    public static function load_all_abbreviations($conn): ?array
    {
        $stmt = oci_parse($conn, "select id, searchable_name, meaning_count, created_at, updated_at from abbreviations");
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");

        if(!oci_execute($stmt)) 
            throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");
        
        $output = array();
        while(($row = oci_fetch_array($stmt, OCI_ASSOC)) != false)
        {
            $abbreviation = AbbreviationRepository::convert_row_to_object($row);

            $output[$row["ID"]] = $abbreviation;
        }

        oci_free_statement($stmt);

        return $output;
    }

    public static function load_abbreviations_paginated($conn, int $limit = 20, int $offset = 0): ?array
    {
        $sql = "SELECT * FROM (
                    SELECT ROW_NUMBER() OVER (ORDER BY id) as rn, 
                           id, searchable_name, meaning_count, created_at, updated_at 
                    FROM abbreviations
                ) WHERE rn > :offset AND rn <= :end_row";
        
        $stmt = oci_parse($conn, $sql);
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
            $abbreviation = AbbreviationRepository::convert_row_to_object($row);
            $output[$row["ID"]] = $abbreviation;
        }

        oci_free_statement($stmt);

        return $output;
    }

    public static function get_total_abbreviations_count($conn): int
    {
        $stmt = oci_parse($conn, "SELECT COUNT(*) as total FROM abbreviations");
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");

        if(!oci_execute($stmt)) 
            throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");

        $row = oci_fetch_array($stmt, OCI_ASSOC);
        $total = $row ? (int)$row["TOTAL"] : 0;

        oci_free_statement($stmt);

        return $total;
    }

    public static function load_abbreviation_by_name($conn, string $name): ?Abbreviation
    {
        $stmt = oci_parse($conn, "select id, searchable_name, meaning_count, created_at, updated_at from abbreviations where searchable_name = ama_helper.get_searchable_name(:name)");
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

        $abbreviation = AbbreviationRepository::convert_row_to_object($row);

        oci_free_statement($stmt);

        return $abbreviation;
    }

    public static function insert_abbreviation($conn, AbbrInsertDTO $dto, bool $autocommit = false)
    {
        $stmt = oci_parse($conn, "insert into combined_view(name, short_expansion, lang, domain, uploader_id) values (:name, :short, :lang, :domain, :uploader)");
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");
        
        oci_bind_by_name($stmt, ":name", $dto->name);
        oci_bind_by_name($stmt, ":short", $dto->short_expansion);
        oci_bind_by_name($stmt, ":lang", $dto->lang);
        oci_bind_by_name($stmt, ":domain", $dto->domain);
        oci_bind_by_name($stmt, ":uploader", $_SESSION["user_id"]);

        if(!oci_execute($stmt, $autocommit ? OCI_COMMIT_ON_SUCCESS : OCI_NO_AUTO_COMMIT)) 
            throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");

        oci_free_statement($stmt);
    }

    public static function visit_abbreviation($conn, int $abbr_id)
    {
        $stmt = oci_parse($conn, "insert into visit_logs values(:visitor, :abbr, sysdate)");
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");
        $null_id = null;
        if(isset($_SESSION["user_id"]))
            oci_bind_by_name($stmt, ":visitor", $_SESSION["user_id"]);
        else
            oci_bind_by_name($stmt, ":visitor", $null_id);
        oci_bind_by_name($stmt, ":abbr", $abbr_id);
        
        if(!oci_execute($stmt, OCI_COMMIT_ON_SUCCESS)) 
            throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");

        oci_free_statement($stmt);
    }
}

?>