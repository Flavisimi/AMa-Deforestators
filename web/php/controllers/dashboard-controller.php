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

    public static function search_abbreviations(string $search_term, string $search_type): ?array
    {
        if (empty($search_term) || !in_array($search_type, ['name', 'signification'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid input']);
            exit;
        }

        $search_type = ($search_type === 'signification') ? 'meaning' : $search_type;

        $conn = ConnectionHelper::open_connection();
        $abbreviations = DashboardRepository::search_abbreviations($conn, $search_term, $search_type);
        oci_close($conn);

        return $abbreviations;
    }

    public static function handle_get()
    {
        $url = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

        if ($url === "/dashboard/user") {
            self::get_user_info();
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
            $search_term = trim($data['search_term'] ?? '');
            $search_type = $data['search_type'] ?? '';

            header("Content-Type: application/json");
            echo json_encode(['success' => true, 'results' => self::search_abbreviations($search_term, $search_type)]);
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