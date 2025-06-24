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
                
                header("Content-Type: application/json");
                header("X-Total-Count: " . $total_count);
                header("X-Page: " . $page);
                header("X-Per-Page: " . $limit);
                echo json_encode($response);
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

    public static function handle_request()
    {
        session_start();
        if($_SERVER['REQUEST_METHOD'] === 'GET')
            UsersController::handle_get();
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