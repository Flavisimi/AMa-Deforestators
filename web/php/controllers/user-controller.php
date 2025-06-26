<?php

namespace ama\controllers;

require_once( __DIR__ . "/../models/user.php");
require_once( __DIR__ . "/../helpers/connection-helper.php");
require_once( __DIR__ . "/../repositories/user-repository.php");
require_once( __DIR__ . "/../exceptions/api-exception.php");

use ama\models\User;
use ama\helpers\ConnectionHelper;
use ama\repositories\UserRepository;
use ama\exceptions\ApiException;

class UserController
{
    public static function get_user_by_id(int $id): ?User
    {
        $conn = ConnectionHelper::open_connection();
        try
        {
            $user = UserRepository::load_user($conn, $id);
        } catch(ApiException $e)
        {
            oci_close($conn);
            throw $e;
        }
        
        oci_close($conn);
        return $user;
    }

    public static function get_all_users(): ?array
    {
        $conn = ConnectionHelper::open_connection();
        try
        {
            $users = UserRepository::load_all_users($conn);
        } catch(ApiException $e)
        {
            oci_close($conn);
            throw $e;
        }

        oci_close($conn);
        return $users;
    }

    public static function get_current_user(): ?User
    {
        if(!isset($_SESSION["user_id"]))
            throw new ApiException(401, "You need to be logged in to get your user profile");

        return UserController::get_user_by_id($_SESSION["user_id"]);
    }

    public static function handle_get()
    {
        $url = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $query_components = array();
        parse_str($_SERVER['QUERY_STRING'], $query_components);

        if($url === "/api/users")
        {
            if(isset($query_components["id"]))
            {
                if(!is_numeric($query_components["id"]))
                    throw new ApiException(400, "Invalid ID");
                
                $rez = UserController::get_user_by_id($query_components["id"]);
                header("Content-Type: application/json");
                echo json_encode($rez);
            }
            else
            {
                $rez = UserController::get_all_users();
                header("Content-Type: application/json");
                echo json_encode($rez);
            }
        }
        else if($url === "/api/users/current")
        {
            $rez = UserController::get_current_user();
            header("Content-Type: application/json");
            echo json_encode($rez);
        }
        else
        {
            http_response_code(400);
        }
    }
    public static function handle_request()
    {
        session_start();
        if($_SERVER['REQUEST_METHOD'] === 'GET')
            UserController::handle_get();
        else
        {
            http_response_code(400);
        }
    }
}

try
{
    UserController::handle_request();
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