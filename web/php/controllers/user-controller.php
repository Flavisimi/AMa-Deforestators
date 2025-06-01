<?php

namespace ama\controllers;

require_once( __DIR__ . "/../models/user.php");
require_once( __DIR__ . "/../helpers/connection-helper.php");
require_once( __DIR__ . "/../repositories/user-repository.php");

use ama\models\User;
use ama\helpers\ConnectionHelper;
use ama\repositories\UserRepository;

class UserController
{
    public static function get_user_by_id(int $id): ?User
    {
        $conn = ConnectionHelper::open_connection();
        $meaning = UserRepository::load_user($conn, $id);
        oci_close($conn);
        return $meaning;
    }

    public static function get_all_users(): ?array
    {
        $conn = ConnectionHelper::open_connection();
        $abbreviations = UserRepository::load_all_users($conn);
        oci_close($conn);
        return $abbreviations;
    }

    public static function handle_get()
    {
        $url = $_SERVER['REQUEST_URI'];
        $query_components = array();
        parse_str($_SERVER['QUERY_STRING'], $query_components);

        if(str_starts_with($url, "/users"))
        {
            if(isset($query_components["id"]))
            {
                header("Content-Type: application/json");
                echo json_encode(UserController::get_user_by_id($query_components["id"]));
            }
            else
            {
                header("Content-Type: application/json");
                echo json_encode(UserController::get_all_users());
            }
        }
        else
        {
            http_response_code(400);
        }
    }
    public static function handle_request()
    {
        if($_SERVER['REQUEST_METHOD'] === 'GET')
            UserController::handle_get();
        else
        {
            http_response_code(400);
        }
    }
}

UserController::handle_request();

?>