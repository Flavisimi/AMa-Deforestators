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

class ProfileController
{
    public static function get_profile(int $user_id): ?User
    {
        $conn = ConnectionHelper::open_connection();
        try
        {
            $user = UserRepository::load_user($conn, $user_id);
            if($user === null)
                throw new ApiException(404, "User not found");
        } catch(ApiException $e)
        {
            oci_close($conn);
            throw $e;
        }
        
        oci_close($conn);
        return $user;
    }

    public static function update_profile(int $user_id, $data): ?User
    {
        if(!isset($_SESSION["user_id"]) || $_SESSION["user_id"] !== $user_id) {
            throw new ApiException(403, "You can only edit your own profile");
        }

        $conn = ConnectionHelper::open_connection();
        try
        {
            UserRepository::update_profile($conn, $user_id, $data);
            $user = UserRepository::load_user($conn, $user_id);
            
        } catch(ApiException $e)
        {
            oci_close($conn);
            throw $e;
        }
        
        oci_close($conn);
        return $user;
    }

    public static function handle_get()
    {
        $url = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $query_components = array();
        parse_str($_SERVER['QUERY_STRING'], $query_components);

        if($url === "/profile")
        {
            if(isset($query_components["id"])) {
                $user_id = (int)$query_components["id"];
            } else {
                if(!isset($_SESSION["user_id"])) {
                    throw new ApiException(401, "You need to be logged in");
                }
                $user_id = $_SESSION["user_id"];
            }
            
            if(!is_numeric($user_id) || $user_id <= 0)
                throw new ApiException(400, "Invalid ID");
            
            $user = ProfileController::get_profile($user_id);
            header("Content-Type: application/json");
            echo json_encode($user);
        }
        else
        {
            http_response_code(400);
        }
    }

    public static function handle_post()
    {
        $url = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

        if($url === "/profile/update")
        {
            if(!isset($_SESSION["user_id"])) {
                throw new ApiException(401, "You need to be logged in to update your profile");
            }
            
            $description = isset($_POST['description']) ? trim($_POST['description']) : '';
            $date_of_birth = isset($_POST['date_of_birth']) && !empty($_POST['date_of_birth']) ? $_POST['date_of_birth'] : null;

            $data = [
                'description' => $description,
                'date_of_birth' => $date_of_birth
            ];
            
            $user = ProfileController::update_profile($_SESSION["user_id"], $data);
            header("Content-Type: application/json");
            echo json_encode($user);
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
            ProfileController::handle_get();
        else if($_SERVER['REQUEST_METHOD'] === 'POST')
            ProfileController::handle_post();
        else
        {
            http_response_code(400);
        }
    }
}

try
{
    ProfileController::handle_request();
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