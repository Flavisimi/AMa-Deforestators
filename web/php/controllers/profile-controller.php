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
        if(!isset($_SESSION["user_id"]) || $_SESSION["user_id"] !== $user_id)
            throw new ApiException(403, "You can only edit your own profile");

        $conn = ConnectionHelper::open_connection();
        try
        {
            $profile_picture = null;
            
            if (isset($_FILES['profile_picture']) && $_FILES['profile_picture']['error'] === UPLOAD_ERR_OK) {
                $file = $_FILES['profile_picture'];
                $allowed_types = ['image/jpeg', 'image/png', 'image/gif'];
                $max_size = 5 * 1024 * 1024;
                
                if (!in_array($file['type'], $allowed_types)) {
                    throw new ApiException(400, 'Invalid file type. Only JPG, PNG and GIF are allowed.');
                }
                
                if ($file['size'] > $max_size) {
                    throw new ApiException(400, 'File too large. Maximum size is 5MB.');
                }
                
                if (function_exists('exif_imagetype')) {
                    $image_type = exif_imagetype($file['tmp_name']);
                    if (!in_array($image_type, [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_GIF])) {
                        throw new ApiException(400, 'Invalid image file.');
                    }
                }
                
                $upload_dir = __DIR__ . '/../../uploads/profiles/';
                if (!is_dir($upload_dir)) {
                    mkdir($upload_dir, 0755, true);
                }
                
                $file_extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
                $new_filename = 'profile_' . $user_id . '_' . time() . '.' . $file_extension;
                $upload_path = $upload_dir . $new_filename;
                
                if (move_uploaded_file($file['tmp_name'], $upload_path)) {
                    $current_user = UserRepository::load_user($conn, $user_id);
                    if ($current_user && $current_user->profile_picture !== 'default-avatar.png') {
                        $old_file = $upload_dir . $current_user->profile_picture;
                        if (file_exists($old_file)) {
                            unlink($old_file);
                        }
                    }
                    $profile_picture = $new_filename;
                } else {
                    throw new ApiException(500, 'Failed to upload file.');
                }
            }
            
            UserRepository::update_profile($conn, $user_id, $data, $profile_picture);
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
            $user_id = isset($query_components["id"]) ? (int)$query_components["id"] : $_SESSION["user_id"];
            
            if(!is_numeric($user_id))
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
            if(!isset($_SESSION["user_id"]))
                throw new ApiException(401, "You need to be logged in");

            $data = [
                'description' => trim($_POST['description'] ?? ''),
                'date_of_birth' => $_POST['date_of_birth'] ?? null
            ];
            
            if (empty($data['date_of_birth'])) {
                $data['date_of_birth'] = null;
            }
            
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