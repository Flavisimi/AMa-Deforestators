<?php

namespace ama\repositories;

use ama\repositories\AbbreviationRepository;
use ama\repositories\MeaningRepository;
use ama\repositories\UserRepository;
use ama\exceptions\ApiException;

require_once( __DIR__ . "/../repositories/abbreviation-repository.php");
require_once( __DIR__ . "/../repositories/meaning-repository.php");
require_once( __DIR__ . "/../repositories/user-repository.php");
require_once( __DIR__ . "/../exceptions/api-exception.php");

ini_set('display_errors', 0);
error_reporting(0);

class StatisticsRepository
{
    public static function most_visited($conn): ?array
    {
        $query = 'BEGIN :rc := ama_statistics.most_visited(); END;';
        $stmt = oci_parse($conn, $query);
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");

        $cursor = oci_new_cursor($conn);
        if(!$cursor)
            throw new ApiException(500, "Failed to create cursor");

        oci_bind_by_name($stmt, ':rc', $cursor, -1, OCI_B_CURSOR);
        
        if(!oci_execute($stmt)) 
            throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");
        
        if(!oci_execute($cursor))
            throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");

        $output = [];
        while ($row = oci_fetch_array($cursor, OCI_ASSOC)) {
            $abbreviation = AbbreviationRepository::convert_row_to_object($row);
            $output[] = $abbreviation;
        }

        oci_free_statement($cursor);
        oci_free_statement($stmt);

        return $output;
    }

    public static function most_controversial($conn): ?array
    {
        $query = 'BEGIN :rc := ama_statistics.most_controversial(); END;';
        $stmt = oci_parse($conn, $query);
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");

        $cursor = oci_new_cursor($conn);
        if(!$cursor)
            throw new ApiException(500, "Failed to create cursor");

        oci_bind_by_name($stmt, ':rc', $cursor, -1, OCI_B_CURSOR);
        
        if(!oci_execute($stmt)) 
            throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");
        
        if(!oci_execute($cursor))
            throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");

        $output = [];
        while ($row = oci_fetch_array($cursor, OCI_ASSOC)) {
            $meaning = MeaningRepository::convert_row_to_object($row);
            $output[] = $meaning;
        }

        oci_free_statement($cursor);
        oci_free_statement($stmt);

        return $output;
    }

    public static function highest_like_rate($conn): ?array
    {
        $query = 'BEGIN :rc := ama_statistics.highest_like_rate(); END;';
        $stmt = oci_parse($conn, $query);
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");

        $cursor = oci_new_cursor($conn);
        if(!$cursor)
            throw new ApiException(500, "Failed to create cursor");

        oci_bind_by_name($stmt, ':rc', $cursor, -1, OCI_B_CURSOR);
        
        if(!oci_execute($stmt)) 
            throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");
        
        if(!oci_execute($cursor))
            throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");

        $output = [];
        while ($row = oci_fetch_array($cursor, OCI_ASSOC)) {
            $meaning = MeaningRepository::convert_row_to_object($row);
            $output[] = $meaning;
        }

        oci_free_statement($cursor);
        oci_free_statement($stmt);

        return $output;
    }

    public static function most_active_users($conn): ?array
    {
        $query = 'BEGIN :rc := ama_statistics.most_active_users(sysdate - 7); END;';
        $stmt = oci_parse($conn, $query);
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");

        $cursor = oci_new_cursor($conn);
        if(!$cursor)
            throw new ApiException(500, "Failed to create cursor");

        oci_bind_by_name($stmt, ':rc', $cursor, -1, OCI_B_CURSOR);
        
        if(!oci_execute($stmt)) 
            throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");
        
        if(!oci_execute($cursor))
            throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");

        $output = [];
        while ($row = oci_fetch_array($cursor, OCI_ASSOC)) {
            $user = UserRepository::convert_row_to_object($row);
            $output[] = $user;
        }

        oci_free_statement($cursor);
        oci_free_statement($stmt);

        return $output;
    }
}


?>