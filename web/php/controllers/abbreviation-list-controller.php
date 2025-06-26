<?php

namespace ama\controllers;

require_once( __DIR__ . "/../models/abbreviation-list.php");
require_once( __DIR__ . "/../helpers/connection-helper.php");
require_once( __DIR__ . "/../helpers/filter-helper.php");
require_once( __DIR__ . "/../repositories/abbreviation-list-repository.php");
require_once( __DIR__ . "/../services/abbreviation-list-service.php");
require_once( __DIR__ . "/../exceptions/api-exception.php");

use ama\models\AbbreviationList;
use ama\helpers\ConnectionHelper;
use ama\helpers\FilterHelper;
use ama\repositories\AbbreviationListRepository;
use ama\services\AbbreviationListService;
use ama\exceptions\ApiException;

class AbbreviationListController
{
    public static function get_abbr_list_by_id(int $id): ?AbbreviationList
    {
        $conn = ConnectionHelper::open_connection();
        try
        {
            $abbr_list = AbbreviationListRepository::load_abbreviation_list($conn, $id);
            if($abbr_list === null)
                throw new ApiException(404, "No abbreviation list found with that ID");
            AbbreviationListService::attach_meanings($conn, $abbr_list);
        } catch(ApiException $e)
        {
            oci_close($conn);
            throw $e;
        }
        oci_close($conn);
        return $abbr_list;
    }

    public static function get_my_abbr_lists(): ?array
    {
        if(!isset($_SESSION["user_id"]))
            throw new ApiException(401, "You need to be logged in to see your abbreviation lists");

        $conn = ConnectionHelper::open_connection();
        try
        {
            $abbr_lists = AbbreviationListRepository::load_all_abbr_lists_by_user($conn, $_SESSION["user_id"]);
        } catch(ApiException $e)
        {
            oci_close($conn);
            throw $e;
        }
        oci_close($conn);
        return $abbr_lists;
    }

    public static function get_all_abbr_lists(): ?array
    {
        $conn = ConnectionHelper::open_connection();
        try
        {
            $abbr_lists = AbbreviationListRepository::load_all_abbr_lists($conn);
            $output = [];
            foreach($abbr_lists as $abbr_list)
                if($abbr_list->private === false || $abbr_list->creator_id == $_SESSION["user_id"])
                    $output[] = $abbr_list;
        } catch(ApiException $e)
        {
            oci_close($conn);
            throw $e;
        }
        oci_close($conn);
        return $output;
    }

    public static function create_abbr_list(string $name, bool $private) : AbbreviationList
    {
        if(!isset($_SESSION["user_id"]))
            throw new ApiException(401, "You need to be logged in to create an abbreviation list");

        if(!isset($_SESSION['user_role']) || $_SESSION['user_role'] == 'USER')
        {
            if(FilterHelper::filter_words($name))
                throw new ApiException(400, "Input contained invalid words");
        }

        $conn = ConnectionHelper::open_connection();
        try
        {
            AbbreviationListRepository::insert_abbr_list($conn, $name, $private);
            $abbr_list = AbbreviationListRepository::load_abbr_list_by_name($conn, $name);
            AbbreviationListService::attach_meanings($conn, $abbr_list);
        } catch(ApiException $e)
        {
            oci_close($conn);
            throw $e;
        }
        
        oci_close($conn);
        return $abbr_list;
    }

    public static function create_abbr_list_entry(int $list_id,  int $meaning_id) : AbbreviationList
    {
        if(!isset($_SESSION["user_id"]))
            throw new ApiException(401, "You need to be logged in to insert into an abbreviation list");

        $conn = ConnectionHelper::open_connection();
        try
        {
            $abbr_list = AbbreviationListRepository::load_abbreviation_list($conn, $list_id);
            if($abbr_list === null)
                throw new ApiException(400, "No list exists for given ID");
            if($abbr_list->creator_id != $_SESSION["user_id"])
                throw new ApiException(403, "You may not insert entries into another user's list");

            AbbreviationListRepository::insert_abbr_list_entry($conn, $list_id, $meaning_id);
            AbbreviationListService::attach_meanings($conn, $abbr_list);
        } catch(ApiException $e)
        {
            oci_close($conn);
            throw $e;
        }
        
        oci_close($conn);
        return $abbr_list;
    }

    public static function delete_abbr_list(int $id)
    {
        if(!isset($_SESSION["user_id"]))
            throw new ApiException(401, "You need to be logged in to delete an abbreviation list");

        $conn = ConnectionHelper::open_connection();
        try
        {
            $abbr_list = AbbreviationListRepository::load_abbreviation_list($conn, $id);
            if($abbr_list === null)
                throw new ApiException(400, "No list exists for given ID");
            if($abbr_list->creator_id != $_SESSION["user_id"])
                throw new ApiException(403, "You may not delete another user's list");

            AbbreviationListRepository::delete_abbr_list($conn, $id);
        } catch(ApiException $e)
        {
            oci_close($conn);
            throw $e;
        }
        
        oci_close($conn);
    }

    public static function delete_abbr_list_entry(int $id, int $index)
    {
        if(!isset($_SESSION["user_id"]))
            throw new ApiException(401, "You need to be logged in to delete an abbreviation list entry");

        $conn = ConnectionHelper::open_connection();
        try
        {
            $abbr_list = AbbreviationListRepository::load_abbreviation_list($conn, $id);
            if($abbr_list === null)
                throw new ApiException(400, "No list exists for given ID");
            if($abbr_list->creator_id != $_SESSION["user_id"])
                throw new ApiException(403, "You may not delete another user's list's entry");

            AbbreviationListRepository::delete_abbr_list_entry($conn, $id, $index);
        } catch(ApiException $e)
        {
            oci_close($conn);
            throw $e;
        }
        
        oci_close($conn);
    }

    public static function handle_get()
    {
        $url = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $query_components = array();
        parse_str($_SERVER['QUERY_STRING'], $query_components);

        if($url === "/api/abbr-lists")
        {
            if(isset($query_components["id"]))
            {
                if(!is_numeric($query_components["id"]))
                    throw new ApiException(400, "Invalid ID");
                
                $rez = AbbreviationListController::get_abbr_list_by_id($query_components["id"]);
                header("Content-Type: application/json");
                echo json_encode($rez);
            }
            else
            {
                $rez = AbbreviationListController::get_all_abbr_lists();
                header("Content-Type: application/json");
                echo json_encode($rez);
            }
        }
        else if($url === "/api/abbr-lists/mine")
        {
            $rez = AbbreviationListController::get_my_abbr_lists();
            header("Content-Type: application/json");
            echo json_encode($rez);
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

        if($url === "/api/bbr-lists")
        {
            if(!isset($query_components["name"]))
                throw new ApiException(400, "Missing name");
            if(!isset($query_components["private"]))
                throw new ApiException(400, "Missing private setting");
            $rez = AbbreviationListController::create_abbr_list($query_components["name"], $query_components["private"] == "true" ? true : false);

            header("Content-Type: application/json");
            echo json_encode($rez);
        }
        else if($url === "/api/abbr-lists/entry")
        {
            if(!isset($query_components["id"]))
                throw new ApiException(400, "Missing list ID");
            if(!is_numeric($query_components["id"]))
                throw new ApiException(400, "Invalid list ID");
            if(!isset($query_components["meaning"]))
                throw new ApiException(400, "Missing meaning ID");
            if(!is_numeric($query_components["meaning"]))
                throw new ApiException(400, "Invalid meaning ID");

            $rez = AbbreviationListController::create_abbr_list_entry($query_components["id"], $query_components["meaning"]);
            
            header("Content-Type: application/json");
            echo json_encode($rez);
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

        if($url === "/api/abbr-lists")
        {
            if(!isset($query_components["id"]))
                throw new ApiException(400, "Missing ID");
            if(!is_numeric($query_components["id"]))
                throw new ApiException(400, "Invalid ID");

            AbbreviationListController::delete_abbr_list($query_components["id"]);
        }
        else if($url === "/api/abbr-lists/entry")
        {
            if(!isset($query_components["id"]))
                throw new ApiException(400, "Missing ID");
            if(!is_numeric($query_components["id"]))
                throw new ApiException(400, "Invalid ID");
            if(!isset($query_components["index"]))
                throw new ApiException(400, "Missing index");
            if(!is_numeric($query_components["index"]))
                throw new ApiException(400, "Invalid index");

            AbbreviationListController::delete_abbr_list_entry($query_components["id"], $query_components["index"]);
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
            AbbreviationListController::handle_get();
        else if($_SERVER['REQUEST_METHOD'] === 'POST')
            AbbreviationListController::handle_post();
        else if($_SERVER['REQUEST_METHOD'] === 'DELETE')
            AbbreviationListController::handle_delete();
        else
        {
            http_response_code(400);
        }
    }
}

try
{
    AbbreviationListController::handle_request();
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