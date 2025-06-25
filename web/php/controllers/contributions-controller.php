<?php

namespace ama\controllers;

require_once(__DIR__ . "/../helpers/connection-helper.php");
require_once(__DIR__ . "/../exceptions/api-exception.php");
require_once(__DIR__ . "/../repositories/meaning-repository.php");
require_once(__DIR__ . "/../services/meaning-service.php");

use ama\helpers\ConnectionHelper;
use ama\exceptions\ApiException;
use ama\repositories\MeaningRepository;
use ama\services\MeaningService;

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
                    MeaningService::attach_description($meaning, MeaningService::get_searchable_name($meaning->name));
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

    public static function update_meaning(int $meaning_id, string $name, string $lang, string $domain, string $short_expansion): bool
    {
        if (!isset($_SESSION['user_id'])) {
            throw new ApiException(401, "Authentication required");
        }
        
        $current_user_role = $_SESSION['user_role'] ?? 'USER';
        if (!in_array($current_user_role, ['ADMIN', 'MOD'])) {
            throw new ApiException(403, "Insufficient permissions");
        }
        
        $conn = ConnectionHelper::open_connection();
        
        try {
            $stmt = oci_parse($conn, "
                UPDATE meanings 
                SET name = :name, lang = :lang, domain = :domain, short_expansion = :short_expansion,
                    updated_at = SYSDATE
                WHERE id = :meaning_id
            ");
            
            if (!$stmt) {
                throw new ApiException(500, "Failed to prepare statement");
            }
            
            oci_bind_by_name($stmt, ":name", $name);
            oci_bind_by_name($stmt, ":lang", $lang);
            oci_bind_by_name($stmt, ":domain", $domain);
            oci_bind_by_name($stmt, ":short_expansion", $short_expansion);
            oci_bind_by_name($stmt, ":meaning_id", $meaning_id);
            
            if (!oci_execute($stmt)) {
                $error = oci_error($stmt);
                throw new ApiException(500, "Database error: " . ($error['message'] ?? 'unknown'));
            }
            
            oci_free_statement($stmt);
            oci_commit($conn);
            
        } catch (ApiException $e) {
            oci_close($conn);
            throw $e;
        }
        
        oci_close($conn);
        return true;
    }

    public static function delete_meaning(int $meaning_id): bool
    {
        if (!isset($_SESSION['user_id'])) {
            throw new ApiException(401, "Authentication required");
        }
        
        $current_user_role = $_SESSION['user_role'] ?? 'USER';
        if (!in_array($current_user_role, ['ADMIN', 'MOD'])) {
            throw new ApiException(403, "Insufficient permissions");
        }
        
        $conn = ConnectionHelper::open_connection();
        
        try {
            $stmt = oci_parse($conn, "DELETE FROM meanings WHERE id = :meaning_id");
            
            if (!$stmt) {
                throw new ApiException(500, "Failed to prepare statement");
            }
            
            oci_bind_by_name($stmt, ":meaning_id", $meaning_id);
            
            if (!oci_execute($stmt)) {
                $error = oci_error($stmt);
                throw new ApiException(500, "Database error: " . ($error['message'] ?? 'unknown'));
            }
            
            oci_free_statement($stmt);
            oci_commit($conn);
            
        } catch (ApiException $e) {
            oci_close($conn);
            throw $e;
        }
        
        oci_close($conn);
        return true;
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
            
            if (!is_numeric($user_id) || $user_id <= 0) {
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

    public static function handle_put()
    {
        $url = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        
        if ($url === "/api/contributions/update") {
            $request_body = file_get_contents("php://input");
            $data = json_decode($request_body, true);
            
            if (!$data) {
                http_response_code(400);
                header("Content-Type: application/json");
                echo json_encode(['error' => 'Invalid JSON data']);
                return;
            }
            
            $meaning_id = $data['meaning_id'] ?? null;
            $name = trim($data['name'] ?? '');
            $lang = trim($data['lang'] ?? '');
            $domain = trim($data['domain'] ?? '');
            $short_expansion = trim($data['short_expansion'] ?? '');
            
            if (!$meaning_id || !$name || !$lang || !$domain || !$short_expansion) {
                http_response_code(400);
                header("Content-Type: application/json");
                echo json_encode(['error' => 'All fields are required']);
                return;
            }
            
            try {
                self::update_meaning($meaning_id, $name, $lang, $domain, $short_expansion);
                header("Content-Type: application/json");
                echo json_encode(['success' => true, 'message' => 'Meaning updated successfully']);
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

    public static function handle_delete()
    {
        $url = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $query_components = array();
        parse_str($_SERVER['QUERY_STRING'], $query_components);
        
        if ($url === "/api/contributions/delete") {
            if (!isset($query_components["meaning_id"])) {
                http_response_code(400);
                header("Content-Type: application/json");
                echo json_encode(['error' => 'Meaning ID is required']);
                return;
            }
            
            $meaning_id = (int)$query_components["meaning_id"];
            
            if (!is_numeric($meaning_id) || $meaning_id <= 0) {
                http_response_code(400);
                header("Content-Type: application/json");
                echo json_encode(['error' => 'Invalid meaning ID']);
                return;
            }
            
            try {
                self::delete_meaning($meaning_id);
                header("Content-Type: application/json");
                echo json_encode(['success' => true, 'message' => 'Meaning deleted successfully']);
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
                case 'PUT':
                    self::handle_put();
                    break;
                case 'DELETE':
                    self::handle_delete();
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