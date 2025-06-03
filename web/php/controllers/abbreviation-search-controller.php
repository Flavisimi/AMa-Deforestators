<?php

namespace ama\controllers;

require_once( __DIR__ . "/../models/meaning.php");
require_once( __DIR__ . "/../helpers/connection-helper.php");
require_once( __DIR__ . "/../repositories/meaning-repository.php");
require_once( __DIR__ . "/../exceptions/api-exception.php");
require_once( __DIR__ . "/../services/meaning-service.php");

use ama\models\Meaning;
use ama\helpers\ConnectionHelper;
use ama\repositories\MeaningRepository;
use ama\exceptions\ApiException;
use ama\services\MeaningService;

class AbbreviationSearchController
{
    public static function search_abbreviations(string $query): array
    {
        if (strlen($query) < 2) {
            throw new ApiException(400, "Query must be at least 2 characters long");
        }

        $conn = ConnectionHelper::open_connection();
        try
        {
            $meanings = MeaningRepository::search_meanings($conn, $query);
            
            if($meanings !== null) {
                foreach($meanings as &$meaning) {
                    MeaningService::attach_score($conn, $meaning);
                }
            }
        } catch(ApiException $e)
        {
            oci_close($conn);
            throw $e;
        }
        
        oci_close($conn);
        return $meanings ?? [];
    }

    public static function handle_get()
    {
        $url = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $query_components = array();
        parse_str($_SERVER['QUERY_STRING'], $query_components);

        if($url === "/abbreviations/search")
        {
            if(!isset($query_components["q"]))
                throw new ApiException(400, "Missing search query parameter 'q'");
            
            $results = self::search_abbreviations($query_components["q"]);
            header("Content-Type: application/json");
            echo json_encode($results);
        }
        else
        {
            http_response_code(404);
        }
    }

    public static function handle_request()
    {
        session_start();
        if($_SERVER['REQUEST_METHOD'] === 'GET')
            self::handle_get();
        else
        {
            http_response_code(405); 
        }
    }
}

try
{
    AbbreviationSearchController::handle_request();
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