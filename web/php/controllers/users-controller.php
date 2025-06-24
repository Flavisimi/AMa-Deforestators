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

    public static function change_user_role(int $user_id, string $new_role): bool
    {
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
                            'created_at' => $user->created_at,
                            'updated_at' => $user->updated_at
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
                echo json_encode(['error' => $e->err_msg]);
            }
        }
        else
        {
            http_response_code(404);
            header("Content-Type: application/json");
            echo json_encode(['error' => 'Endpoint not found']);
        }
    }

    public static function handle_post()
    {
        $url = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        
        if($url === "/api/all-users/change-role")
        {
            $request_body = file_get_contents("php://input");
            $data = json_decode($request_body, true);
            
            $user_id = isset($data['user_id']) ? (int)$data['user_id'] : 0;
            $new_role = isset($data['new_role']) ? trim($data['new_role']) : '';
            
            if ($user_id <= 0 || empty($new_role)) {
                http_response_code(400);
                header("Content-Type: application/json");
                echo json_encode(['error' => 'Invalid user ID or role']);
                return;
            }
            
            try {
                UsersController::change_user_role($user_id, $new_role);
                header("Content-Type: application/json");
                echo json_encode(['success' => true, 'message' => 'User role updated successfully']);
            } catch (ApiException $e) {
                http_response_code($e->status_code);
                header("Content-Type: application/json");
                echo json_encode(['error' => $e->err_msg]);
            }
        }
        else if($url === "/api/all-users") 
        {
            // Handle other POST requests to /api/all-users if needed
            http_response_code(404);
            header("Content-Type: application/json");
            echo json_encode(['error' => 'POST method not supported for this endpoint']);
        }
        else
        {
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
        
        if($url === "/api/all-users/delete")
        {
            $user_id = isset($query_components['user_id']) ? (int)$query_components['user_id'] : 0;
            
            if ($user_id <= 0) {
                http_response_code(400);
                header("Content-Type: application/json");
                echo json_encode(['error' => 'Invalid user ID']);
                return;
            }
            
            try {
                UsersController::delete_user($user_id);
                header("Content-Type: application/json");
                echo json_encode(['success' => true, 'message' => 'User deleted successfully']);
            } catch (ApiException $e) {
                http_response_code($e->status_code);
                header("Content-Type: application/json");
                echo json_encode(['error' => $e->err_msg]);
            }
        }
        else if($url === "/api/all-users")
        {
            // Handle other DELETE requests to /api/all-users if needed  
            http_response_code(404);
            header("Content-Type: application/json");
            echo json_encode(['error' => 'DELETE method not supported for this endpoint']);
        }
        else
        {
            http_response_code(404);
            header("Content-Type: application/json");
            echo json_encode(['error' => 'Endpoint not found']);
        }
    }

    public static function handle_request()
    {
        session_start();
        if($_SERVER['REQUEST_METHOD'] === 'GET')
            UsersController::handle_get();
        else if($_SERVER['REQUEST_METHOD'] === 'POST')
            UsersController::handle_post();
        else if($_SERVER['REQUEST_METHOD'] === 'DELETE')
            UsersController::handle_delete();
        else
        {
            http_response_code(405);
            header("Content-Type: application/json");
            echo json_encode(['error' => 'Method not allowed']);
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
    echo json_encode($e);
}
catch(\Exception $e)
{
    http_response_code(500);
    header("Content-Type: application/json");
    echo json_encode(['error' => 'Internal server error']);
}

?>