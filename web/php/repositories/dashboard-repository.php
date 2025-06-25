<?php
namespace ama\repositories;

require_once(__DIR__ . "/../models/abbreviation.php");

use ama\models\Abbreviation;

class DashboardRepository
{
    public static function search_abbreviations($conn, string $search_term, string $search_type, ?string $language = null, ?string $domain = null): ?array
    {
        $query = 'BEGIN :rc := search_abv_enhanced(:search_term, :search_type, :language, :domain); END;';
        $stmt = oci_parse($conn, $query);
        $cursor = oci_new_cursor($conn);
        
        oci_bind_by_name($stmt, ':search_term', $search_term);
        oci_bind_by_name($stmt, ':search_type', $search_type);
        oci_bind_by_name($stmt, ':language', $language);
        oci_bind_by_name($stmt, ':domain', $domain);
        oci_bind_by_name($stmt, ':rc', $cursor, -1, OCI_B_CURSOR);

        if (!oci_execute($stmt)) {
            oci_free_statement($stmt);
            return null;
        }

        if (!oci_execute($cursor)) {
            oci_free_statement($stmt);
            oci_free_statement($cursor);
            return null;
        }

        $output = [];
        while ($row = oci_fetch_array($cursor, OCI_ASSOC)) {
            $abbreviation = new Abbreviation();
            $abbreviation->id = $row["ID"];
            $abbreviation->searchable_name = $row["SEARCHABLE_NAME"];
            $abbreviation->meaning_count = $row["MEANING_COUNT"];
            $abbreviation->created_at = new \DateTime($row["CREATED_AT"]);
            $abbreviation->updated_at = new \DateTime($row["UPDATED_AT"]);
            $abbreviation->meanings = null;
            $output[] = $abbreviation;
        }

        oci_free_statement($stmt);
        oci_free_statement($cursor);

        return $output;
    }

    public static function search_abbreviations_with_filters($conn, string $search_term, string $search_type, ?string $language = null, ?string $domain = null): ?array
    {
        $query = 'BEGIN :rc := search_abv_with_filters(:search_term, :search_type, :language, :domain); END;';
        $stmt = oci_parse($conn, $query);
        $cursor = oci_new_cursor($conn);
        
        oci_bind_by_name($stmt, ':search_term', $search_term);
        oci_bind_by_name($stmt, ':search_type', $search_type);
        oci_bind_by_name($stmt, ':language', $language);
        oci_bind_by_name($stmt, ':domain', $domain);
        oci_bind_by_name($stmt, ':rc', $cursor, -1, OCI_B_CURSOR);

        if (!oci_execute($stmt)) {
            oci_free_statement($stmt);
            return null;
        }

        if (!oci_execute($cursor)) {
            oci_free_statement($stmt);
            oci_free_statement($cursor);
            return null;
        }

        $output = [];
        while ($row = oci_fetch_array($cursor, OCI_ASSOC)) {
            $abbreviation = new Abbreviation();
            $abbreviation->id = $row["ID"];
            $abbreviation->searchable_name = $row["SEARCHABLE_NAME"];
            $abbreviation->meaning_count = $row["MEANING_COUNT"];
            $abbreviation->created_at = new \DateTime($row["CREATED_AT"]);
            $abbreviation->updated_at = new \DateTime($row["UPDATED_AT"]);
            $abbreviation->meanings = null;
            $output[] = $abbreviation;
        }

        oci_free_statement($stmt);
        oci_free_statement($cursor);

        return $output;
    }

    public static function get_available_languages($conn): ?array
    {
        $query = 'BEGIN :rc := get_available_languages(); END;';
        $stmt = oci_parse($conn, $query);
        $cursor = oci_new_cursor($conn);
        
        oci_bind_by_name($stmt, ':rc', $cursor, -1, OCI_B_CURSOR);

        if (!oci_execute($stmt)) {
            oci_free_statement($stmt);
            return null;
        }

        if (!oci_execute($cursor)) {
            oci_free_statement($stmt);
            oci_free_statement($cursor);
            return null;
        }

        $output = [];
        while ($row = oci_fetch_array($cursor, OCI_ASSOC)) {
            $output[] = $row["LANGUAGE_CODE"];
        }

        oci_free_statement($stmt);
        oci_free_statement($cursor);

        return $output;
    }

    public static function get_available_domains($conn): ?array
    {
        $query = 'BEGIN :rc := get_available_domains(); END;';
        $stmt = oci_parse($conn, $query);
        $cursor = oci_new_cursor($conn);
        
        oci_bind_by_name($stmt, ':rc', $cursor, -1, OCI_B_CURSOR);

        if (!oci_execute($stmt)) {
            oci_free_statement($stmt);
            return null;
        }

        if (!oci_execute($cursor)) {
            oci_free_statement($stmt);
            oci_free_statement($cursor);
            return null;
        }

        $output = [];
        while ($row = oci_fetch_array($cursor, OCI_ASSOC)) {
            $output[] = $row["DOMAIN"];
        }

        oci_free_statement($stmt);
        oci_free_statement($cursor);

        return $output;
    }
}
?>