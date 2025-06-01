<?php

namespace ama\controllers;

require_once( __DIR__ . "/../models/abbreviation.php");
require_once( __DIR__ . "/../helpers/connection-helper.php");
require_once( __DIR__ . "/../repositories/abbreviation-repository.php");
require_once( __DIR__ . "/../services/abbreviation-service.php");
require_once( __DIR__ . "/../dtos/abbreviation-insert-dto.php");

use ama\models\Abbreviation;
use ama\helpers\ConnectionHelper;
use ama\repositories\AbbreviationRepository;
use ama\services\AbbreviationService;
use ama\dtos\AbbrInsertDTO;

class AbbreviationController
{
    public static function get_abbreviation_by_id(int $id): ?Abbreviation
    {
        $conn = ConnectionHelper::open_connection();
        $abbreviation = AbbreviationRepository::load_abbreviation($conn, $id);
        AbbreviationService::attach_meanings($conn, $abbreviation);
        oci_close($conn);
        return $abbreviation;
    }

    public static function get_all_abbreviations(): ?array
    {
        $conn = ConnectionHelper::open_connection();
        $abbreviations = AbbreviationRepository::load_all_abbreviations($conn);
        oci_close($conn);
        return $abbreviations;
    }

    public static function create_abbreviation($dto) : Abbreviation
    {
        $conn = ConnectionHelper::open_connection();
        AbbreviationRepository::insert_abbreviation($conn, $dto);
        $abbreviation = AbbreviationRepository::load_abbreviation_by_name($conn, $dto->name);
        AbbreviationService::attach_meanings($conn, $abbreviation);
        oci_close($conn);
        return $abbreviation;
    }
    public static function handle_get()
    {
        $url = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $query_components = array();
        parse_str($_SERVER['QUERY_STRING'], $query_components);

        if(str_starts_with($url, "/abbreviations"))
        {
            if(isset($query_components["id"]))
            {
                header("Content-Type: application/json");
                echo json_encode(AbbreviationController::get_abbreviation_by_id($query_components["id"]));
            }
            else
            {
                header("Content-Type: application/json");
                echo json_encode(AbbreviationController::get_all_abbreviations());
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

            header("Content-Type: application/json");
            echo json_encode(AbbreviationController::create_abbreviation($dto));
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

AbbreviationController::handle_request();

?>