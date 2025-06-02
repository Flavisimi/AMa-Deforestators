<?php

namespace ama\controllers;

require_once( __DIR__ . "/../models/abbreviation.php");
require_once( __DIR__ . "/../helpers/connection-helper.php");
require_once( __DIR__ . "/../repositories/abbreviation-repository.php");
require_once( __DIR__ . "/../services/abbreviation-service.php");
require_once( __DIR__ . "/../dtos/abbreviation-insert-dto.php");
require_once( __DIR__ . "/../exceptions/api-exception.php");

use ama\models\Abbreviation;
use ama\helpers\ConnectionHelper;
use ama\repositories\AbbreviationRepository;
use ama\services\AbbreviationService;
use ama\dtos\AbbrInsertDTO;
use ama\exceptions\ApiException;

class AbbreviationController
{
    public static function get_abbreviation_by_id(int $id): ?Abbreviation
    {
        $conn = ConnectionHelper::open_connection();
        try
        {
            $abbreviation = AbbreviationRepository::load_abbreviation($conn, $id);
            AbbreviationService::attach_meanings($conn, $abbreviation);
        } catch(ApiException $e)
        {
            oci_close($conn);
            throw $e;
        }
        oci_close($conn);
        return $abbreviation;
    }

    public static function get_all_abbreviations(): ?array
    {
        $conn = ConnectionHelper::open_connection();
        try
        {
            $abbreviations = AbbreviationRepository::load_all_abbreviations($conn);
        } catch(ApiException $e)
        {
            oci_close($conn);
            throw $e;
        }
        oci_close($conn);
        return $abbreviations;
    }

    public static function create_abbreviation($dto) : Abbreviation
    {
        if(!isset($_SESSION["user_id"]))
            throw new ApiException(401, "You need to be logged in to create an abbreviation");

        $conn = ConnectionHelper::open_connection();
        try
        {
            AbbreviationRepository::insert_abbreviation($conn, $dto);
            $abbreviation = AbbreviationRepository::load_abbreviation_by_name($conn, $dto->name);
            AbbreviationService::attach_meanings($conn, $abbreviation);
        } catch(ApiException $e)
        {
            oci_close($conn);
            throw $e;
        }
        
        oci_close($conn);
        return $abbreviation;
    }
    public static function handle_get()
    {
        $url = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $query_components = array();
        parse_str($_SERVER['QUERY_STRING'], $query_components);

        if($url === "/abbreviations")
        {
            if(isset($query_components["id"]))
            {
                if(!is_numeric($query_components["id"]))
                    throw new ApiException(400, "Invalid ID");
                
                $rez = AbbreviationController::get_abbreviation_by_id($query_components["id"]);
                header("Content-Type: application/json");
                echo json_encode($rez);
            }
            else
            {
                $rez = AbbreviationController::get_all_abbreviations();
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

        if($url === "/abbreviations")
        {
            $request_body = file_get_contents("php://input");
            $dto = AbbrInsertDTO::from_json($request_body);
            $rez = AbbreviationController::create_abbreviation($dto);

            header("Content-Type: application/json");
            echo json_encode($rez);
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
            AbbreviationController::handle_get();
        else if($_SERVER['REQUEST_METHOD'] === 'POST')
            AbbreviationController::handle_post();
        else
        {
            http_response_code(400);
        }
    }
}

try
{
    AbbreviationController::handle_request();
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