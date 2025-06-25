<?php

namespace ama\controllers;

require_once( __DIR__ . "/../models/user.php");
require_once( __DIR__ . "/../helpers/connection-helper.php");
require_once( __DIR__ . "/../repositories/users-repository.php");
require_once( __DIR__ . "/../exceptions/api-exception.php");

use ama\models\User;
use ama\helpers\ConnectionHelper;
use ama\repositories\UsersRepository;
use ama\exceptions\ApiException;

ini_set('display_errors', 0);
error_reporting(0);

class UsersController
{
    public static function get_users_paginated(int $page = 1, int $limit = 20): ?array
    {
        if ($page < 1) $page = 1;
        if ($limit < 1 || $limit > 100) $limit = 20;
        
        $offset = ($page - 1) * $limit;
        
        $conn = ConnectionHelper::open_connection();
        try
        {
            $users = UsersRepository::load_users_paginated($conn, $limit, $offset);
        } catch(ApiException $e)
        {
            oci_close($conn);
            throw $e;
        }
        
        oci_close($conn);
        return $users;
    }

    public static function search_users(string $query, int $page = 1, int $limit = 20): ?array
    {
        if ($page < 1) $page = 1;
        if ($limit < 1 || $limit > 1000) $limit = 1000;
        
        $offset = ($page - 1) * $limit;
        
        $conn = ConnectionHelper::open_connection();
        try
        {
            $users = UsersRepository::search_users($conn, $query, $limit, $offset);
        } catch(ApiException $e)
        {
            oci_close($conn);
            throw $e;
        }
        
        oci_close($conn);
        return $users;
    }

    public static function get_users_count(): int
    {
        $conn = ConnectionHelper::open_connection();
        try
        {
            $count = UsersRepository::get_users_count($conn);
        } catch(ApiException $e)
        {
            oci_close($conn);
            throw $e;
        }
        
        oci_close($conn);
        return $count;
    }

    public static function get_search_users_count(string $query): int
    {
        $conn = ConnectionHelper::open_connection();
        try
        {
            $count = UsersRepository::get_search_users_count($conn, $query);
        } catch(ApiException $e)
        {
            oci_close($conn);
            throw $e;
        }
        
        oci_close($conn);
        return $count;
    }

    public static function change_user_role(int $user_id, string $new_role): bool
    {
        if($user_id == 0)
            throw new ApiException(403, "Cannot modify user AMA (id 0)");

        if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'ADMIN') {
            throw new ApiException(403, "Only administrators can change user roles");
        }

        if (!in_array($new_role, ['USER', 'MOD', 'ADMIN'])) {
            throw new ApiException(400, "Invalid role specified");
        }

        if ($user_id === $_SESSION['user_id']) {
            throw new ApiException(400, "You cannot change your own role");
        }

        $conn = ConnectionHelper::open_connection();
        try
        {
            UsersRepository::update_user_role($conn, $user_id, $new_role);
        } catch(ApiException $e)
        {
            oci_close($conn);
            throw $e;
        }
        
        oci_close($conn);
        return true;
    }

    public static function delete_user(int $user_id): bool
    {
        if($user_id == 0)
            throw new ApiException(403, "Cannot delete user AMA (id 0)");

        if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'ADMIN') {
            throw new ApiException(403, "Only administrators can delete users");
        }

        if ($user_id === $_SESSION['user_id']) {
            throw new ApiException(400, "You cannot delete your own account");
        }

        $conn = ConnectionHelper::open_connection();
        try
        {
            UsersRepository::delete_user($conn, $user_id);
        } catch(ApiException $e)
        {
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

        if($url === "/api/all-users")
        {
            $page = isset($query_components["page"]) ? (int)$query_components["page"] : 1;
            $limit = isset($query_components["limit"]) ? (int)$query_components["limit"] : 20;
            
            try {
                $users = UsersController::get_users_paginated($page, $limit);
                $total_count = UsersController::get_users_count();
                
                $response = array();
                if ($users) {
                    foreach ($users as $user) {
                        $response[$user->id] = array(
                            'id' => $user->id,
                            'name' => $user->name,
                            'email' => $user->email,
                            'role' => $user->role,
                            'profile_picture' => $user->profile_picture ? true : false,
                            'created_at' => $user->created_at ? $user->created_at->format('Y-m-d H:i:s') : null,
                            'updated_at' => $user->updated_at ? $user->updated_at->format('Y-m-d H:i:s') : null
                        );
                    }
                }
                
                $response_data = array(
                    'users' => $response,
                    'current_user_role' => isset($_SESSION['user_role']) ? $_SESSION['user_role'] : 'GUEST',
                    'current_user_id' => isset($_SESSION['user_id']) ? $_SESSION['user_id'] : null
                );
                
                header("Content-Type: application/json");
                header("X-Total-Count: " . $total_count);
                header("X-Page: " . $page);
                header("X-Per-Page: " . $limit);
                echo json_encode($response_data);
                
            } catch (ApiException $e) {
                http_response_code($e->status_code);
                header("Content-Type: application/json");
                echo json_encode(['error' => $e->getMessage()]);
            }
        }
        elseif($url === "/api/all-users/search")
        {
            if (!isset($query_components["query"])) {
                http_response_code(400);
                header("Content-Type: application/json");
                echo json_encode(['error' => 'Missing search query parameter']);
                return;
            }
            
            $query = trim($query_components["query"]);
            if (empty($query)) {
                http_response_code(400);
                header("Content-Type: application/json");
                echo json_encode(['error' => 'Search query cannot be empty']);
                return;
            }
            
            $page = isset($query_components["page"]) ? (int)$query_components["page"] : 1;
            $limit = isset($query_components["limit"]) ? (int)$query_components["limit"] : 1000;
            
            try {
                $users = UsersController::search_users($query, $page, $limit);
                $total_count = UsersController::get_search_users_count($query);
                
                $response = array();
                if ($users) {
                    foreach ($users as $user) {
                        $response[$user->id] = array(
                            'id' => $user->id,
                            'name' => $user->name,
                            'email' => $user->email,
                            'role' => $user->role,
                            'profile_picture' => $user->profile_picture ? true : false,
                            'created_at' => $user->created_at ? $user->created_at->format('Y-m-d H:i:s') : null,
                            'updated_at' => $user->updated_at ? $user->updated_at->format('Y-m-d H:i:s') : null
                        );
                    }
                }
                
                $response_data = array(
                    'users' => $response,
                    'current_user_role' => isset($_SESSION['user_role']) ? $_SESSION['user_role'] : 'GUEST',
                    'current_user_id' => isset($_SESSION['user_id']) ? $_SESSION['user_id'] : null
                );
                
                header("Content-Type: application/json");
                header("X-Total-Count: " . $total_count);
                header("X-Page: " . $page);
                header("X-Per-Page: " . $limit);
                echo json_encode($response_data);
                
            } catch (ApiException $e) {
                http_response_code($e->status_code);
                header("Content-Type: application/json");
                echo json_encode(['error' => $e->getMessage()]);
            }
        }
        else
        {
            http_response_code(404);
        }
    }

    public static function handle_put()
    {
        $url = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        
        if($url === "/api/all-users/change-role")
        {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['user_id']) || !isset($input['new_role'])) {
                http_response_code(400);
                header("Content-Type: application/json");
                echo json_encode(['error' => 'Missing required parameters']);
                return;
            }
            
            try {
                UsersController::change_user_role((int)$input['user_id'], $input['new_role']);
                header("Content-Type: application/json");
                echo json_encode(['success' => true]);
                
            } catch (ApiException $e) {
                http_response_code($e->status_code);
                header("Content-Type: application/json");
                echo json_encode(['error' => $e->getMessage()]);
            }
        }
        else
        {
            http_response_code(404);
        }
    }

    public static function handle_delete()
    {
        $url = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        
        if($url === "/api/all-users/delete")
        {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['user_id'])) {
                http_response_code(400);
                header("Content-Type: application/json");
                echo json_encode(['error' => 'Missing user_id parameter']);
                return;
            }
            
            try {
                UsersController::delete_user((int)$input['user_id']);
                header("Content-Type: application/json");
                echo json_encode(['success' => true]);
                
            } catch (ApiException $e) {
                http_response_code($e->status_code);
                header("Content-Type: application/json");
                echo json_encode(['error' => $e->getMessage()]);
            }
        }
        else
        {
            http_response_code(404);
        }
    }

    public static function handle_request()
    {
        session_start();
        
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
                break;
        }
    }
}

try
{
    UsersController::handle_request();
} 
catch(ApiException $e)
{
    http_response_code($e->status_code);
    header("Content-Type: application/json");
    echo json_encode(['error' => $e->getMessage()]);
}
catch(\Exception $e)
{
    http_response_code(500);
    header("Content-Type: application/json");
    echo json_encode(['error' => 'Internal server error']);
}

?>