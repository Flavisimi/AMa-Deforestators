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

ini_set('session.cookie_httponly', 1);
ini_set('session.use_strict_mode', 1);
ini_set('session.cookie_samesite', 'Lax');
ini_set('display_errors', 0);
error_reporting(0);

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

    public static function get_profile_picture(int $user_id)
    {
        $conn = ConnectionHelper::open_connection();
        try
        {
            $stmt = oci_parse($conn, "SELECT profile_picture FROM users WHERE id = :id");
            if(!$stmt) 
                throw new ApiException(500, "Failed to parse SQL statement");
            
            oci_bind_by_name($stmt, ":id", $user_id);
            
            if(!oci_execute($stmt)) 
                throw new ApiException(500, oci_error($stmt)['message'] ?? "unknown");
            
            $row = oci_fetch_array($stmt, OCI_ASSOC + OCI_RETURN_LOBS);
            if($row === false)
            {
                oci_free_statement($stmt);
                oci_close($conn);
                return null;
            }

            $image_data = $row['PROFILE_PICTURE'];
            
            oci_free_statement($stmt);
            oci_close($conn);
            
            if ($image_data === null || $image_data === '') {
                return null;
            }
            
            return $image_data;
            
        } catch(ApiException $e)
        {
            oci_close($conn);
            throw $e;
        } catch(\Exception $e)
        {
            oci_close($conn);
            throw new ApiException(500, "Error reading profile picture: " . $e->getMessage());
        }
    }
    public static function update_profile(int $user_id, $data, $profile_picture = null): ?User
    {
        if(!isset($_SESSION["user_id"])) {
            throw new ApiException(401, "You need to be logged in to update a profile");
        }

        $current_user_id = $_SESSION["user_id"];
        $current_user_role = $_SESSION["user_role"] ?? 'USER';
        
        $is_own_profile = ($current_user_id === $user_id);
        $can_edit = false;
        
        if ($is_own_profile) {
            $can_edit = true;
        } else {
            if ($current_user_role === 'ADMIN') {
                $can_edit = true;
            } elseif ($current_user_role === 'MOD') {
                $conn = ConnectionHelper::open_connection();
                try {
                    $target_user = UserRepository::load_user($conn, $user_id);
                    if ($target_user && $target_user->role === 'USER') {
                        $can_edit = true;
                    }
                } catch(ApiException $e) {
                    oci_close($conn);
                    throw $e;
                } finally {
                    oci_close($conn);
                }
            }
        }
        
        if (!$can_edit) {
            throw new ApiException(403, "You don't have permission to edit this profile");
        }

        $conn = ConnectionHelper::open_connection();
        try
        {
            if ($profile_picture && $profile_picture['error'] === UPLOAD_ERR_OK) {
                $allowed_types = ['image/jpeg', 'image/png', 'image/gif'];
                $file_type = $profile_picture['type'];
                
                if (!in_array($file_type, $allowed_types)) {
                    throw new ApiException(400, "Invalid file type. Only JPG, PNG, and GIF are allowed.");
                }
                
                if ($profile_picture['size'] > 5 * 1024 * 1024) {
                    throw new ApiException(400, "File too large. Maximum size is 5MB.");
                }
                
                $image_data = file_get_contents($profile_picture['tmp_name']);
                if ($image_data === false) {
                    throw new ApiException(500, "Failed to read uploaded file.");
                }
                
                $data['profile_picture'] = $image_data;
            }
            
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

        if($url === "/api/profile")
        {
            if(isset($query_components["id"])) {
                $user_id = (int)$query_components["id"];
                $is_own_profile = isset($_SESSION["user_id"]) && $_SESSION["user_id"] == $user_id;
            } else {
                if(!isset($_SESSION["user_id"])) {
                    http_response_code(401);
                    header("Content-Type: application/json");
                    echo json_encode([
                        'error' => 'You need to be logged in',
                        'guest' => true,
                        'redirect' => '/'
                    ]);
                    return;
                }
                $user_id = $_SESSION["user_id"];
                $is_own_profile = true;
            }
            
            if(!is_numeric($user_id) || $user_id <= 0) {
                http_response_code(400);
                header("Content-Type: application/json");
                echo json_encode(['error' => 'Invalid user ID']);
                return;
            }
            
            try {
                $user = ProfileController::get_profile($user_id);
                
                $response_data = [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'description' => $user->description,
                    'date_of_birth' => $user->date_of_birth,
                    'profile_picture' => $user->profile_picture ? "/api/profile/picture?id=" . $user->id . "&v=" . time() : '',
                    'created_at' => $user->created_at->format('Y-m-d H:i:s'),
                    'updated_at' => $user->updated_at->format('Y-m-d H:i:s'),
                    'is_own_profile' => $is_own_profile
                ];
                
                header("Content-Type: application/json");
                echo json_encode($response_data);
            } catch (ApiException $e) {
                http_response_code($e->status_code);
                header("Content-Type: application/json");
                echo json_encode(['error' => $e->err_msg]);
            }
        }
        else if($url === "/api/profile/picture")
        {
            $user_id = isset($query_components["id"]) ? (int)$query_components["id"] : 0;
            
            if ($user_id <= 0) {
                http_response_code(400);
                exit;
            }
            
            $conn = ConnectionHelper::open_connection();
            $stmt = oci_parse($conn, "SELECT profile_picture FROM users WHERE id = :id");
            oci_bind_by_name($stmt, ":id", $user_id);
            oci_execute($stmt);
            
            $row = oci_fetch_array($stmt, OCI_ASSOC + OCI_RETURN_LOBS);
            oci_free_statement($stmt);
            oci_close($conn);
            
            if (!$row || !$row['PROFILE_PICTURE']) {
                http_response_code(404);
                exit;
            }
            
            header("Content-Type: image/jpeg");
            header("Content-Length: " . strlen($row['PROFILE_PICTURE']));
            header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
            header("Pragma: no-cache");
            header("Expires: Thu, 01 Jan 1970 00:00:00 GMT");
            
            echo $row['PROFILE_PICTURE'];
            exit;
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

        if($url === "/api/profile/update")
        {
            if(!isset($_SESSION["user_id"])) {
                http_response_code(401);
                header("Content-Type: application/json");
                echo json_encode(['error' => 'You need to be logged in to update your profile']);
                return;
            }
            
            try {
                $debug_info = [
                    'post_data' => $_POST,
                    'files_data' => $_FILES,
                    'has_profile_picture_file' => isset($_FILES['profile_picture']),
                    'profile_picture_error' => $_FILES['profile_picture']['error'] ?? 'no file'
                ];
                
                $description = isset($_POST['description']) ? trim($_POST['description']) : '';
                $date_of_birth = isset($_POST['date_of_birth']) && !empty($_POST['date_of_birth']) ? $_POST['date_of_birth'] : null;

                $data = [
                    'description' => $description,
                    'date_of_birth' => $date_of_birth
                ];
                
                $profile_picture = null;
                if (isset($_FILES['profile_picture']) && $_FILES['profile_picture']['error'] === UPLOAD_ERR_OK) {
                    $profile_picture = $_FILES['profile_picture'];
                    $debug_info['profile_picture_processed'] = true;
                    $debug_info['file_size'] = $profile_picture['size'];
                    $debug_info['file_type'] = $profile_picture['type'];
                } else {
                    $debug_info['profile_picture_processed'] = false;
                }
                
                $user = ProfileController::update_profile($_SESSION["user_id"], $data, $profile_picture);
                
                $response_data = [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'description' => $user->description,
                    'date_of_birth' => $user->date_of_birth,
                    'profile_picture' => $user->profile_picture ? "/api/profile/picture?id=" . $user->id . "&v=" . time() : '',
                    'created_at' => $user->created_at->format('Y-m-d H:i:s'),
                    'updated_at' => $user->updated_at->format('Y-m-d H:i:s'),
                    'is_own_profile' => true,
                    'debug' => $debug_info
                ];
                
                header("Content-Type: application/json");
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

    public static function handle_request()
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        try {
            if($_SERVER['REQUEST_METHOD'] === 'GET')
                ProfileController::handle_get();
            else if($_SERVER['REQUEST_METHOD'] === 'POST')
                ProfileController::handle_post();
            else
            {
                http_response_code(405);
                header("Content-Type: application/json");
                echo json_encode(['error' => 'Method not allowed']);
            }
        } catch(\Exception $e) {
            http_response_code(500);
            header("Content-Type: application/json");
            echo json_encode([
                'error' => 'Internal server error: ' . $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);
        }
    }
}

ProfileController::handle_request();

?>