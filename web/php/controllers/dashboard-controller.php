<?php
namespace ama\controllers;

require_once(__DIR__ . "/../helpers/connection-helper.php");
require_once(__DIR__ . "/../repositories/dashboard-repository.php");
require_once(__DIR__ . "/../models/abbreviation.php");

use ama\helpers\ConnectionHelper;
use ama\repositories\DashboardRepository;
use ama\models\Abbreviation;

class DashboardController
{
    public static function get_user_info()
    {
        if (!isset($_SESSION['username'])) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Not logged in']);
            exit;
        }

        header("Content-Type: application/json");
        echo json_encode(['success' => true, 'username' => $_SESSION['username']]);
    }

    public static function search_abbreviations(string $search_term, string $search_type, ?string $language = null, ?string $domain = null): ?array
    {
        $search_term = trim($search_term);
        
        if (empty($search_term) && empty($language) && empty($domain)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Search term or filters required']);
            exit;
        }

        if (!in_array($search_type, ['name', 'signification'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid search type']);
            exit;
        }

        $search_type = ($search_type === 'signification') ? 'meaning' : $search_type;

        $conn = ConnectionHelper::open_connection();
        $abbreviations = DashboardRepository::search_abbreviations_with_filters($conn, $search_term, $search_type, $language, $domain);
        oci_close($conn);

        return $abbreviations;
    }

    public static function get_filter_data()
    {
        $conn = ConnectionHelper::open_connection();
        
        $languages = DashboardRepository::get_available_languages($conn);
        $domains = DashboardRepository::get_available_domains($conn);
        
        oci_close($conn);

        header("Content-Type: application/json");
        echo json_encode([
            'success' => true, 
            'languages' => $languages, 
            'domains' => $domains
        ]);
    }

    public static function handle_get()
    {
        $url = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

        if ($url === "/dashboard/user") {
            self::get_user_info();
        } elseif ($url === "/dashboard/filters") {
            self::get_filter_data();
        } else {
            http_response_code(400);
        }
    }

    public static function handle_post()
    {
        $url = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

        if ($url === "/dashboard/search") {
            $request_body = file_get_contents("php://input");
            $data = json_decode($request_body, true);
            
            $search_term = $data['search_term'] ?? '';
            $search_type = $data['search_type'] ?? '';
            $language = !empty($data['language']) ? trim($data['language']) : null;
            $domain = !empty($data['domain']) ? trim($data['domain']) : null;

            header("Content-Type: application/json");
            echo json_encode([
                'success' => true, 
                'results' => self::search_abbreviations($search_term, $search_type, $language, $domain)
            ]);
        } else {
            http_response_code(400);
        }
    }

    public static function handle_request()
    {
        session_start();
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            self::handle_get();
        } else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            self::handle_post();
        } else {
            http_response_code(400);
        }
    }
}

DashboardController::handle_request();
?>