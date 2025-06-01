<?php

namespace ama\repositories;

use ama\models\Meaning;
require_once( __DIR__ . "/../models/meaning.php");

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
        oci_bind_by_name($stmt, ":id", $id);
        
        oci_execute($stmt);
        
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
        
        oci_execute($stmt);
        
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
        oci_bind_by_name($stmt, ":abbr_id", $abbr_id);
        
        oci_execute($stmt);
        
        $output = array();
        while(($row = oci_fetch_array($stmt, OCI_ASSOC)) != false)
        {
            $meaning = MeaningRepository::convert_row_to_object($row);

            $output[$row["ID"]] = $meaning;
        }

        oci_free_statement($stmt);

        return $output;
    }
}


?>