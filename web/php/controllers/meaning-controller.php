<?php

namespace ama\controllers;

require_once( __DIR__ . "/../models/meaning.php");
require_once( __DIR__ . "/../helpers/connection-helper.php");
require_once( __DIR__ . "/../repositories/meaning-repository.php");

use ama\models\Meaning;
use ama\helpers\ConnectionHelper;
use ama\repositories\MeaningRepository;

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
        $abbreviations = MeaningRepository::load_all_meanings($conn);
        oci_close($conn);
        return $abbreviations;
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
    public static function handle_request()
    {
        if($_SERVER['REQUEST_METHOD'] === 'GET')
            MeaningController::handle_get();
        else
        {
            http_response_code(400);
        }
    }
}

MeaningController::handle_request();

?>