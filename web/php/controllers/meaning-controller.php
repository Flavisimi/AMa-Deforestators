<?php

namespace ama\controllers;

require_once( __DIR__ . "/../models/meaning.php");
require_once( __DIR__ . "/../helpers/connection-helper.php");
require_once( __DIR__ . "/../repositories/abbreviation-repository.php");
require_once( __DIR__ . "/../repositories/meaning-repository.php");
require_once( __DIR__ . "/../models/vote.php");
require_once( __DIR__ . "/../repositories/vote-repository.php");
require_once( __DIR__ . "/../exceptions/api-exception.php");
require_once( __DIR__ . "/../services/meaning-service.php");
require_once( __DIR__ . "/../helpers/docbook-helper.php");
require_once( __DIR__ . "/../helpers/filter-helper.php");
require_once( __DIR__ . "/../dtos/meaning-update-dto.php");

use ama\models\Meaning;
use ama\helpers\ConnectionHelper;
use ama\repositories\AbbreviationRepository;
use ama\repositories\MeaningRepository;
use ama\models\Vote;
use ama\repositories\VoteRepository;
use ama\exceptions\ApiException;
use ama\services\MeaningService;
use ama\helpers\DocbookHelper;
use ama\helpers\FilterHelper;
use ama\dtos\MeaningUpdateDTO;

class MeaningController
{
    public static function get_meaning_by_id(int $id): ?Meaning
    {
        $conn = ConnectionHelper::open_connection();
        try
        {
            $meaning = MeaningRepository::load_meaning($conn, $id);
            if($meaning === null)
                throw new ApiException(404, "No meaning was found with the given ID");

            MeaningService::attach_score($conn, $meaning);
            MeaningService::attach_description($meaning, FilterHelper::get_searchable_name($meaning->name));
            
            if(isset($_SESSION["user_id"])) {
                $user_vote = VoteRepository::load_vote($conn, $_SESSION["user_id"], $meaning->id);
                $meaning->user_vote = $user_vote ? $user_vote->vote : null;
            } else {
                $meaning->user_vote = null;
            }
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
            if($meanings !== null) {
                foreach($meanings as &$meaning) {
                    MeaningService::attach_score($conn, $meaning);
                    
                    if(isset($_SESSION["user_id"])) {
                        $user_vote = VoteRepository::load_vote($conn, $_SESSION["user_id"], $meaning->id);
                        $meaning->user_vote = $user_vote ? $user_vote->vote : null;
                    } else {
                        $meaning->user_vote = null;
                    }
                }
            }
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

    public static function delete_meaning($id)
    {
        if(!isset($_SESSION["user_id"]))
            throw new ApiException(401, "You need to be logged in to delete a meaning");

        if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] == 'USER')
            throw new ApiException(403, "Users may not delete meanings");
        
        $conn = ConnectionHelper::open_connection();
        try
        {
            $meaning = MeaningRepository::load_meaning($conn, $id);
            $abbreviation = AbbreviationRepository::load_abbreviation($conn, $meaning->abbr_id);
            MeaningRepository::delete_meaning($conn, $id);

            $document = DocbookHelper::load_abbreviation_document($abbreviation->searchable_name);
            if($document == null)
            {
                oci_rollback($conn);
                throw new ApiException(500, "Inconsistent docbook state");
            }

            if($abbreviation->meaning_count > 1)
            {
                DocbookHelper::delete_meaning_from_document($document, $meaning->short_expansion);

                if(!DocbookHelper::save_document($document))
                {
                    oci_rollback($conn);
                    throw new ApiException(500, "Could not delete meaning from file");
                }
            }
            else
            {
                unlink("/abbreviations/" . $abbreviation->searchable_name . ".xml");
            }


            oci_commit($conn);
        } catch(ApiException $e)
        {
            oci_close($conn);
            throw $e;
        }

        oci_close($conn);
    }

    public static function update_meaning($id, $dto): Meaning
    {
        if(!isset($_SESSION["user_id"]))
            throw new ApiException(401, "You need to be logged in to update a meaning");

        if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] == 'USER')
            throw new ApiException(403, "Users may not update meanings");
        
        $conn = ConnectionHelper::open_connection();
        try
        {
            MeaningRepository::update_meaning($conn, $id, $dto);
            $meaning = MeaningRepository::load_meaning($conn, $id);
            $searchable_name = FilterHelper::get_searchable_name($meaning->name);

            $document = DocbookHelper::load_abbreviation_document($searchable_name);
            if($document == null)
            {
                oci_rollback($conn);
                throw new ApiException(500, "Inconsistent docbook state");
            }

            DocbookHelper::delete_meaning_from_document($document, $meaning->short_expansion);
            DocbookHelper::add_meaning_to_abbr_document($document, $meaning, $dto->description);

            if(!DocbookHelper::save_document($document))
            {
                oci_rollback($conn);
                throw new ApiException(500, "Could not delete meaning from file");
            }

            oci_commit($conn);
        } catch(ApiException $e)
        {
            oci_close($conn);
            throw $e;
        }

        oci_close($conn);
        return $meaning;
    }

    public static function handle_get()
    {
        $url = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $query_components = array();
        parse_str($_SERVER['QUERY_STRING'], $query_components);

        if($url === "/api/meanings")
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

        if($url === "/api/meanings/upvote" || $url === "/api/meanings/downvote")
        {
            if(!isset($query_components["id"]))
            {
                http_response_code(400);
                return;
            }

            $id = $query_components["id"];
            if(!is_numeric($id))
                    throw new ApiException(400, "Invalid ID");

            $is_upvote = $url === "/api/meanings/upvote";

            MeaningController::vote_abbreviation($id, $is_upvote);
        }
        else
        {
            http_response_code(400);
        }
    }

    public static function handle_delete()
    {
        $url = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $query_components = array();
        parse_str($_SERVER['QUERY_STRING'], $query_components);

        if($url === "/api/meanings")
        {
            if(!isset($query_components["id"]))
            {
                http_response_code(400);
                return;
            }

            $id = $query_components["id"];
            if(!is_numeric($id))
                    throw new ApiException(400, "Invalid ID");

            self::delete_meaning($id);
        }
    }

    public static function handle_put()
    {
        $url = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $query_components = array();
        parse_str($_SERVER['QUERY_STRING'], $query_components);

        if($url === "/api/meanings")
        {
            if(!isset($query_components["id"]))
            {
                http_response_code(400);
                return;
            }

            $id = $query_components["id"];
            if(!is_numeric($id))
                    throw new ApiException(400, "Invalid ID");

            $request_body = file_get_contents("php://input");
            $dto = MeaningUpdateDTO::from_json($request_body);
            $rez = self::update_meaning($id, $dto);

            header("Content-Type: application/json");
            echo json_encode(["success" => true, "meaning" => $rez]);
        }
    }

    public static function handle_request()
    {
        session_start();
        if($_SERVER['REQUEST_METHOD'] === 'GET')
            MeaningController::handle_get();
        else if($_SERVER['REQUEST_METHOD'] === 'POST')
            MeaningController::handle_post();
        else if($_SERVER['REQUEST_METHOD'] === 'DELETE')
            self::handle_delete();
        else if($_SERVER['REQUEST_METHOD'] === 'PUT')
            self::handle_put();
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