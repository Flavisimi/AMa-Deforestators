<?php

namespace ama\controllers;

require_once(__DIR__ . "/../helpers/connection-helper.php");
require_once(__DIR__ . "/../exceptions/api-exception.php");
require_once(__DIR__ . "/../repositories/meaning-repository.php");
require_once(__DIR__ . "/../services/meaning-service.php");
require_once(__DIR__ . "/../helpers/filter-helper.php");

use ama\helpers\ConnectionHelper;
use ama\exceptions\ApiException;
use ama\repositories\MeaningRepository;
use ama\services\MeaningService;
use ama\helpers\FilterHelper;

ini_set('session.cookie_httponly', 1);
ini_set('session.use_strict_mode', 1);
ini_set('session.cookie_samesite', 'Lax');
ini_set('display_errors', 0);
error_reporting(0);

class ContributionsController
{
    public static function get_user_contributions(int $user_id): array
    {
        $conn = ConnectionHelper::open_connection();
        
        try {
            $meanings = MeaningRepository::load_meanings_by_uploader_id($conn, $user_id);
            if($meanings !== null) {
                foreach($meanings as &$meaning) {
                    MeaningService::attach_description($meaning, FilterHelper::get_searchable_name($meaning->name));
                    MeaningService::attach_score($conn, $meaning);
                    MeaningService::attach_user_vote($conn, $meaning);
                }
            }
        } catch (ApiException $e) {
            oci_close($conn);
            throw $e;
        }
        
        oci_close($conn);
        return $meanings;
    }

    public static function handle_get()
    {
        $url = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $query_components = array();
        parse_str($_SERVER['QUERY_STRING'], $query_components);

        if ($url === "/api/contributions") {
            if (!isset($query_components["user_id"])) {
                http_response_code(400);
                header("Content-Type: application/json");
                echo json_encode(['error' => 'User ID is required']);
                return;
            }
            
            $user_id = (int)$query_components["user_id"];
            
            if (!is_numeric($user_id) || $user_id < 0) {
                http_response_code(400);
                header("Content-Type: application/json");
                echo json_encode(['error' => 'Invalid user ID']);
                return;
            }
            
            try {
                $contributions = self::get_user_contributions($user_id);
                header("Content-Type: application/json");
                echo json_encode([
                    'success' => true,
                    'contributions' => $contributions
                ]);
            } catch (ApiException $e) {
                http_response_code($e->status_code);
                header("Content-Type: application/json");
                echo json_encode(['error' => $e->err_msg]);
            }
        } else {
            http_response_code(404);
            header("Content-Type: application/json");
            echo json_encode(['error' => 'Endpoint not found']);
        }
    }

    public static function handle_request()
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        try {
            switch($_SERVER['REQUEST_METHOD']) {
                case 'GET':
                    self::handle_get();
                    break;
                default:
                    http_response_code(405);
                    header("Content-Type: application/json");
                    echo json_encode(['error' => 'Method not allowed']);
                    break;
            }
        } catch(ApiException $e) {
            http_response_code($e->status_code);
            header("Content-Type: application/json");
            echo json_encode(['error' => $e->err_msg]);
        } catch(\Exception $e) {
            http_response_code(500);
            header("Content-Type: application/json");
            echo json_encode(['error' => 'Internal server error']);
        }
    }
}

try {
    ContributionsController::handle_request();
} catch(\Exception $e) {
    http_response_code(500);
    header("Content-Type: application/json");
    echo json_encode(['error' => 'Internal server error']);
}
?>