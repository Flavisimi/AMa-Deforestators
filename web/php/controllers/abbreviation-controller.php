<?php

require_once( __DIR__ . "/../models/abbreviation.php");
require_once( __DIR__ . "/../helpers/connection-helper.php");
require_once( __DIR__ . "/../repositories/abbreviation-repository.php");

use ama\models\Abbreviation;
use ama\helpers\ConnectionHelper;
use ama\repositories\AbbreviationRepository;

class AbbreviationController
{
    public static function get_abbreviation_by_id(int $id): ?Abbreviation
    {
        $conn = ConnectionHelper::open_connection();
        $abbreviation = AbbreviationRepository::load_abbreviation($conn, $id);
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

    public static function handle_get()
    {
        $url = $_SERVER['REQUEST_URI'];
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
    public static function handle_request()
    {
        if($_SERVER['REQUEST_METHOD'] === 'GET')
            AbbreviationController::handle_get();
        else
        {
            http_response_code(400);
        }
    }
}

AbbreviationController::handle_request();

?>