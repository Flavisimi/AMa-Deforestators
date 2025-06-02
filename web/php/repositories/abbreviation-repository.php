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
            throw new ApiException(500, oci_error($stmt));
        
        
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
            throw new ApiException(500, oci_error($stmt));
        
        $output = array();
        while(($row = oci_fetch_array($stmt, OCI_ASSOC)) != false)
        {
            $abbreviation = AbbreviationRepository::convert_row_to_object($row);

            $output[$row["ID"]] = $abbreviation;
        }

        oci_free_statement($stmt);

        return $output;
    }

    public static function load_abbreviation_by_name($conn, string $name): ?Abbreviation
    {
        $stmt = oci_parse($conn, "select id, searchable_name, meaning_count, created_at, updated_at from abbreviations where searchable_name = ama_helper.get_searchable_name(:name)");
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");
        
        oci_bind_by_name($stmt, ":name", $name);
        
         if(!oci_execute($stmt)) 
            throw new ApiException(500, oci_error($stmt));
        
        $row = oci_fetch_array($stmt, OCI_ASSOC);
        if($row === false)
        {
            return null;
        }

        $abbreviation = AbbreviationRepository::convert_row_to_object($row);

        oci_free_statement($stmt);

        return $abbreviation;
    }

    public static function insert_abbreviation($conn, AbbrInsertDTO $dto)
    {
        $stmt = oci_parse($conn, "insert into combined_view(name, short_expansion, description, lang, domain, uploader_id) values (:name, :short, :descr, :lang, :domain, :uploader)");
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");
        
        oci_bind_by_name($stmt, ":name", $dto->name);
        oci_bind_by_name($stmt, ":short", $dto->short_expansion);
        oci_bind_by_name($stmt, ":descr", $dto->description);
        oci_bind_by_name($stmt, ":lang", $dto->lang);
        oci_bind_by_name($stmt, ":domain", $dto->domain);
        oci_bind_by_name($stmt, ":uploader", $_SESSION["user_id"]);

        if(!oci_execute($stmt, OCI_COMMIT_ON_SUCCESS)) 
            throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");

        oci_free_statement($stmt);
    }
}


?>