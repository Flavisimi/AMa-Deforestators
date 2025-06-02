<?php

namespace ama\controllers;

require_once( __DIR__ . "/../models/meaning.php");
require_once( __DIR__ . "/../helpers/connection-helper.php");
require_once( __DIR__ . "/../repositories/meaning-repository.php");
require_once( __DIR__ . "/../models/vote.php");
require_once( __DIR__ . "/../repositories/vote-repository.php");
require_once( __DIR__ . "/../exceptions/api-exception.php");

use ama\models\Meaning;
use ama\helpers\ConnectionHelper;
use ama\repositories\MeaningRepository;
use ama\models\Vote;
use ama\repositories\VoteRepository;
use ama\exceptions\ApiException;

class MeaningController
{
    public static function get_meaning_by_id(int $id): ?Meaning
    {
        $conn = ConnectionHelper::open_connection();
        try
        {
            $meaning = MeaningRepository::load_meaning($conn, $id);
        } catch(ApiException $e)
        {
            oci_close($conn);
            throw $e;
        }
        
        oci_close($conn);
        return $meaning;
    }

    public static function get_all_meanings(): ?array
    {
        $conn = ConnectionHelper::open_connection();
        try
        {
            $meanings = MeaningRepository::load_all_meanings($conn);
        } catch(ApiException $e)
        {
            oci_close($conn);
            throw $e;
        }
        
        oci_close($conn);
        return $meanings;
    }

    public static function vote_abbreviation($id, $is_upvote)
    {
        if(!isset($_SESSION["user_id"]))
            throw new ApiException(401, "You need to be logged in to vote for an abbreviation");

        $conn = ConnectionHelper::open_connection();
        try
        {
            $existing_vote = VoteRepository::load_vote($conn, $_SESSION["user_id"], $id);
            if($existing_vote == null)
            {
                $vote = new Vote;
                $vote->voter_id = $_SESSION["user_id"];
                $vote->meaning_id = $id;
                $vote->vote = $is_upvote ? 1:-1;

                VoteRepository::insert_vote($conn, $vote);
            }
            else
            {
                $new_vote_value = $is_upvote ? 1 : -1;
                if($existing_vote->vote === $new_vote_value)
                {
                    VoteRepository::delete_vote($conn, $existing_vote);
                }
                else
                {
                    $existing_vote->vote = $new_vote_value;
                    VoteRepository::update_vote($conn, $existing_vote);
                }
            }
        } catch(ApiException $e)
        {
            oci_close($conn);
            throw $e;
        }
        
        oci_close( $conn );
    }

    public static function handle_get()
    {
        $url = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $query_components = array();
        parse_str($_SERVER['QUERY_STRING'], $query_components);

        if(str_starts_with($url, "/meanings"))
        {
            if(isset($query_components["id"]))
            {
                if(!is_numeric($query_components["id"]))
                    throw new ApiException(400, "Invalid ID");
                
                $rez = MeaningController::get_meaning_by_id($query_components["id"]);
                header("Content-Type: application/json");
                echo json_encode($rez);
            }
            else
            {
                $rez = MeaningController::get_all_meanings();
                header("Content-Type: application/json");
                echo json_encode($rez);
            }
        }
        else
        {
            http_response_code(400);
        }
    }

    public static function handle_post()
    {
        $url = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $query_components = array();
        parse_str($_SERVER['QUERY_STRING'], $query_components);

        if($url === "/meanings/upvote" || $url === "/meanings/downvote")
        {
            if(!isset($query_components["id"]))
            {
                http_response_code(400);
                return;
            }

            $id = $query_components["id"];
            if(!is_numeric($id))
                    throw new ApiException(400, "Invalid ID");

            $is_upvote = $url === "/meanings/upvote";

            MeaningController::vote_abbreviation($id, $is_upvote);
        }
        else
        {
            http_response_code(400);
        }
    }
    public static function handle_request()
    {
        session_start();
        if($_SERVER['REQUEST_METHOD'] === 'GET')
            MeaningController::handle_get();
        else if($_SERVER['REQUEST_METHOD'] === 'POST')
            MeaningController::handle_post();
        else
        {
            http_response_code(400);
        }
    }
}

try
{
    MeaningController::handle_request();
} 
catch(ApiException $e)
{
    http_response_code($e->status_code);
    header("Content-Type: application/json");
    echo json_encode($e);
}
catch(\Exception $e)
{
    http_response_code(500);
    header("Content-Type: application/json");
    echo json_encode($e);
}

?>