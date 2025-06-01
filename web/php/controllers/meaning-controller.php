<?php

namespace ama\controllers;

require_once( __DIR__ . "/../models/meaning.php");
require_once( __DIR__ . "/../helpers/connection-helper.php");
require_once( __DIR__ . "/../repositories/meaning-repository.php");
require_once( __DIR__ . "/../models/vote.php");
require_once( __DIR__ . "/../repositories/vote-repository.php");

use ama\models\Meaning;
use ama\helpers\ConnectionHelper;
use ama\repositories\MeaningRepository;
use ama\models\Vote;
use ama\repositories\VoteRepository;

class MeaningController
{
    public static function get_meaning_by_id(int $id): ?Meaning
    {
        $conn = ConnectionHelper::open_connection();
        $meaning = MeaningRepository::load_meaning($conn, $id);
        oci_close($conn);
        return $meaning;
    }

    public static function get_all_meanings(): ?array
    {
        $conn = ConnectionHelper::open_connection();
        $meanings = MeaningRepository::load_all_meanings($conn);
        oci_close($conn);
        return $meanings;
    }

    public static function vote_abbreviation($id, $is_upvote)
    {
        $conn = ConnectionHelper::open_connection();
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
        oci_close( $conn );
    }

    public static function handle_get()
    {
        $url = $_SERVER['REQUEST_URI'];
        $query_components = array();
        parse_str($_SERVER['QUERY_STRING'], $query_components);

        if(str_starts_with($url, "/meanings"))
        {
            if(isset($query_components["id"]))
            {
                header("Content-Type: application/json");
                echo json_encode(MeaningController::get_meaning_by_id($query_components["id"]));
            }
            else
            {
                header("Content-Type: application/json");
                echo json_encode(MeaningController::get_all_meanings());
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

MeaningController::handle_request();

?>