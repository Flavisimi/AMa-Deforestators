<?php

namespace ama\repositories;

use ama\models\Vote;
use ama\exceptions\ApiException;

require_once( __DIR__ . "/../models/vote.php");
require_once( __DIR__ . "/../exceptions/api-exception.php");

ini_set('display_errors', 0);
error_reporting(0);

class VoteRepository
{
    public static function convert_row_to_object( $row ): Vote
    {
        $vote = new Vote();
        $vote->voter_id = $row["VOTER_ID"];
        $vote->meaning_id = $row["MEANING_ID"];
        $vote->vote = $row["VOTE"];
        $vote->vote_date = new \DateTime();
        $vote->vote_date->setTimestamp(strtotime($row["VOTE_DATE"]));

        return $vote;
    }

    public static function load_vote($conn, int $voter_id, int $meaning_id): ?Vote
    {
        $stmt = oci_parse($conn, "select voter_id, meaning_id, vote, vote_date from votes where voter_id = :voter and meaning_id = :meaning");
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");
        oci_bind_by_name($stmt, ":voter", $voter_id);
        oci_bind_by_name($stmt, ":meaning", $meaning_id);
        
        if(!oci_execute($stmt)) 
            throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");
        
        $row = oci_fetch_array($stmt, OCI_ASSOC);
        if($row === false)
        {
            return null;
        }

        $vote = VoteRepository::convert_row_to_object($row);

        oci_free_statement($stmt);

        return $vote;
    }

    public static function insert_vote($conn, Vote $vote)
    {
        $stmt = oci_parse($conn, "insert into votes(voter_id, meaning_id, vote, vote_date) values(:voter, :meaning, :vote, sysdate)");
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");
        oci_bind_by_name($stmt, ":voter", $vote->voter_id);
        oci_bind_by_name($stmt, ":meaning", $vote->meaning_id);
        oci_bind_by_name($stmt, ":vote", $vote->vote);

        if(!oci_execute($stmt, OCI_COMMIT_ON_SUCCESS)) 
            throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");

        oci_free_statement($stmt);
    }

    public static function update_vote($conn, Vote $vote)
    {
        $stmt = oci_parse($conn, "update votes set vote = :vote, vote_date = sysdate where voter_id = :voter and meaning_id = :meaning");
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");
        oci_bind_by_name($stmt, ":voter", $vote->voter_id);
        oci_bind_by_name($stmt, ":meaning", $vote->meaning_id);
        oci_bind_by_name($stmt, ":vote", $vote->vote);

        if(!oci_execute($stmt, OCI_COMMIT_ON_SUCCESS)) 
            throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");

        oci_free_statement($stmt);
    }

    public static function delete_vote($conn, Vote $vote)
    {
        $stmt = oci_parse($conn, "delete from votes where voter_id = :voter and meaning_id = :meaning");
        if(!$stmt) 
            throw new ApiException(500, "Failed to parse SQL statement");
        oci_bind_by_name($stmt, ":voter", $vote->voter_id);
        oci_bind_by_name($stmt, ":meaning", $vote->meaning_id);

        if(!oci_execute($stmt, OCI_COMMIT_ON_SUCCESS)) 
            throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");

        oci_free_statement($stmt);
    }
}


?>