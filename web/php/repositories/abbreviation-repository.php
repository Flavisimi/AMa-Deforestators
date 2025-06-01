<?php

namespace ama\repositories;

use ama\models\Abbreviation;
require_once( __DIR__ . "/../models/abbreviation.php");

class AbbreviationRepository
{
    public static function load_abbreviation($conn, int $id): ?Abbreviation
    {
        $stmt = oci_parse($conn, "select id, searchable_name, meaning_count, created_at, updated_at from abbreviations where id = :id");
        oci_bind_by_name($stmt,":id", $id);
        
        oci_execute($stmt);
        
        $row = oci_fetch_array($stmt, OCI_ASSOC);
        if($row === false)
        {
            return null;
        }

        $abbreviation = new Abbreviation();
        $abbreviation->id = $row["ID"];
        $abbreviation->searchable_name = $row["SEARCHABLE_NAME"];
        $abbreviation->meaning_count = $row["MEANING_COUNT"];
        $abbreviation->created_at = new \DateTime();
        $abbreviation->created_at->setTimestamp(strtotime($row["CREATED_AT"]));
        $abbreviation->updated_at = new \DateTime();
        $abbreviation->updated_at->setTimestamp(strtotime($row["UPDATED_AT"]));

        oci_free_statement($stmt);

        return $abbreviation;
    }

    public static function load_all_abbreviations($conn): ?array
    {
        $stmt = oci_parse($conn, "select id, searchable_name, meaning_count, created_at, updated_at from abbreviations");
        
        oci_execute($stmt);
        
        $output = array();
        while(($row = oci_fetch_array($stmt, OCI_ASSOC)) != false)
        {
            $abbreviation = new Abbreviation();
            $abbreviation->id = $row["ID"];
            $abbreviation->searchable_name = $row["SEARCHABLE_NAME"];
            $abbreviation->meaning_count = $row["MEANING_COUNT"];
            $abbreviation->created_at = new \DateTime();
            $abbreviation->created_at->setTimestamp(strtotime($row["CREATED_AT"]));
            $abbreviation->updated_at = new \DateTime();
            $abbreviation->updated_at->setTimestamp(strtotime($row["UPDATED_AT"]));

            $output[$row["ID"]] = $abbreviation;
        }

        oci_free_statement($stmt);

        return $output;
    }
}


?>