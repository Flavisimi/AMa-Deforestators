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
        if($user_id == 0)
            throw new ApiException(403, "Cannot modify user AMA (id 0)");

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
            if (isset($data['clear_picture']) && $data['clear_picture'] === 'true') {
                $data['profile_picture'] = '';
            } elseif ($profile_picture && $profile_picture['error'] === UPLOAD_ERR_OK) {
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

    public static function update_credentials(int $user_id, array $data): bool
    {
        if($user_id == 0)
            throw new ApiException(403, "Cannot modify user AMA (id 0)");
        
        if(!isset($_SESSION["user_id"])) {
            throw new ApiException(401, "You need to be logged in");
        }

        $current_user_role = $_SESSION["user_role"] ?? 'GUEST';
        $current_user_id = $_SESSION["user_id"];
        
        if ($current_user_role !== 'ADMIN' && $current_user_id !== $user_id) {
            throw new ApiException(403, "You don't have permission to update these credentials");
        }

        $conn = ConnectionHelper::open_connection();
        
        try {
            $sql_parts = [];
            $bind_vars = [];
            
            if (isset($data['username'])) {
                $sql_parts[] = "name = :username";
                $bind_vars['username'] = $data['username'];
            }
            
            if (isset($data['email'])) {
                $sql_parts[] = "email = :email";
                $bind_vars['email'] = $data['email'];
            }
            
            if (isset($data['password'])) {
                $stmt = oci_parse($conn, "SELECT auth_package.hash_password(:password) as hashed FROM dual");
                if (!$stmt) {
                    throw new ApiException(500, "Failed to prepare hash statement");
                }
                
                oci_bind_by_name($stmt, ":password", $data['password']);
                
                if (!oci_execute($stmt)) {
                    $error = oci_error($stmt);
                    oci_free_statement($stmt);
                    throw new ApiException(500, "Failed to hash password: " . ($error['message'] ?? 'unknown'));
                }
                
                $hash_row = oci_fetch_array($stmt, OCI_ASSOC);
                oci_free_statement($stmt);
                
                if (!$hash_row) {
                    throw new ApiException(500, "Failed to generate password hash");
                }
                
                $sql_parts[] = "user_password = :password";
                $bind_vars['password'] = $hash_row['HASHED'];
            }
            
            $sql_parts[] = "updated_at = CURRENT_DATE";
            $bind_vars['user_id'] = $user_id;
            
            $sql = "UPDATE users SET " . implode(", ", $sql_parts) . " WHERE id = :user_id";
            
            $stmt = oci_parse($conn, $sql);
            if (!$stmt) {
                throw new ApiException(500, "Failed to parse SQL statement");
            }
            
            foreach ($bind_vars as $key => $value) {
                oci_bind_by_name($stmt, ":$key", $bind_vars[$key]);
            }
            
            if (!oci_execute($stmt, OCI_COMMIT_ON_SUCCESS)) {
                $error = oci_error($stmt);
                oci_free_statement($stmt);
                throw new ApiException(500, "Failed to update credentials: " . ($error['message'] ?? 'unknown'));
            }
            
            oci_free_statement($stmt);
            
        } catch(ApiException $e)
        {
            oci_close($conn);
            throw $e;
        }
        
        oci_close($conn);
        return true;
    }

    public static function update_own_credentials(array $data): bool
    {
        if(!isset($_SESSION["user_id"])) {
            throw new ApiException(401, "You need to be logged in");
        }

        $user_id = $_SESSION["user_id"];
        if($user_id == 0)
            throw new ApiException(403, "Cannot modify user AMA (id 0)");
        
        if (!isset($data['username']) || !isset($data['email']) || !isset($data['current_password'])) {
            throw new ApiException(400, "Username, email and current password are required");
        }

        $username = trim($data['username']);
        $email = trim($data['email']);
        $current_password = $data['current_password'];
        $new_password = isset($data['new_password']) ? $data['new_password'] : null;

        if (empty($username) || empty($email) || empty($current_password)) {
            throw new ApiException(400, "All fields must be filled");
        }

        if (strlen($username) < 3) {
            throw new ApiException(400, "Username must be at least 3 characters long");
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new ApiException(400, "Invalid email format");
        }

        if ($new_password !== null && strlen($new_password) < 6) {
            throw new ApiException(400, "New password must be at least 6 characters long");
        }

        $conn = ConnectionHelper::open_connection();
        
        try {
            // First verify current password
            $verify_stmt = oci_parse($conn, "SELECT name, user_password FROM users WHERE id = :user_id");
            if (!$verify_stmt) {
                throw new ApiException(500, "Failed to prepare verification statement");
            }
            
            oci_bind_by_name($verify_stmt, ":user_id", $user_id);
            
            if (!oci_execute($verify_stmt)) {
                $error = oci_error($verify_stmt);
                oci_free_statement($verify_stmt);
                throw new ApiException(500, "Failed to verify user: " . ($error['message'] ?? 'unknown'));
            }
            
            $user_row = oci_fetch_array($verify_stmt, OCI_ASSOC);
            oci_free_statement($verify_stmt);
            
            if (!$user_row) {
                throw new ApiException(404, "User not found");
            }
            
            // Verify current password using the same hashing method as login
            $hash_stmt = oci_parse($conn, "SELECT auth_package.hash_password(:password) as hashed FROM dual");
            if (!$hash_stmt) {
                throw new ApiException(500, "Failed to prepare hash statement");
            }
            
            oci_bind_by_name($hash_stmt, ":password", $current_password);
            
            if (!oci_execute($hash_stmt)) {
                $error = oci_error($hash_stmt);
                oci_free_statement($hash_stmt);
                throw new ApiException(500, "Failed to hash password: " . ($error['message'] ?? 'unknown'));
            }
            
            $hash_row = oci_fetch_array($hash_stmt, OCI_ASSOC);
            oci_free_statement($hash_stmt);
            
            if (!$hash_row || $hash_row['HASHED'] !== $user_row['USER_PASSWORD']) {
                throw new ApiException(400, "Current password is incorrect");
            }
            
            // Check if username already exists (excluding current user)
            $check_username_stmt = oci_parse($conn, "SELECT COUNT(*) as count FROM users WHERE LOWER(name) = LOWER(:username) AND id != :user_id");
            if (!$check_username_stmt) {
                throw new ApiException(500, "Failed to prepare username check statement");
            }
            
            oci_bind_by_name($check_username_stmt, ":username", $username);
            oci_bind_by_name($check_username_stmt, ":user_id", $user_id);
            
            if (!oci_execute($check_username_stmt)) {
                $error = oci_error($check_username_stmt);
                oci_free_statement($check_username_stmt);
                throw new ApiException(500, "Failed to check username: " . ($error['message'] ?? 'unknown'));
            }
            
            $username_row = oci_fetch_array($check_username_stmt, OCI_ASSOC);
            oci_free_statement($check_username_stmt);
            
            if ($username_row['COUNT'] > 0) {
                throw new ApiException(400, "Username already exists");
            }
            
            // Check if email already exists (excluding current user)
            $check_email_stmt = oci_parse($conn, "SELECT COUNT(*) as count FROM users WHERE LOWER(email) = LOWER(:email) AND id != :user_id");
            if (!$check_email_stmt) {
                throw new ApiException(500, "Failed to prepare email check statement");
            }
            
            oci_bind_by_name($check_email_stmt, ":email", $email);
            oci_bind_by_name($check_email_stmt, ":user_id", $user_id);
            
            if (!oci_execute($check_email_stmt)) {
                $error = oci_error($check_email_stmt);
                oci_free_statement($check_email_stmt);
                throw new ApiException(500, "Failed to check email: " . ($error['message'] ?? 'unknown'));
            }
            
            $email_row = oci_fetch_array($check_email_stmt, OCI_ASSOC);
            oci_free_statement($check_email_stmt);
            
            if ($email_row['COUNT'] > 0) {
                throw new ApiException(400, "Email already exists");
            }
            
            // Build update query
            $sql_parts = [];
            $bind_vars = [];
            
            $sql_parts[] = "name = :username";
            $bind_vars['username'] = $username;
            
            $sql_parts[] = "email = :email";
            $bind_vars['email'] = $email;
            
            $sql_parts[] = "updated_at = CURRENT_DATE";
            
            if ($new_password !== null) {
                // Hash the new password
                $hash_new_stmt = oci_parse($conn, "SELECT auth_package.hash_password(:password) as hashed FROM dual");
                if (!$hash_new_stmt) {
                    throw new ApiException(500, "Failed to prepare new password hash statement");
                }
                
                oci_bind_by_name($hash_new_stmt, ":password", $new_password);
                
                if (!oci_execute($hash_new_stmt)) {
                    $error = oci_error($hash_new_stmt);
                    oci_free_statement($hash_new_stmt);
                    throw new ApiException(500, "Failed to hash new password: " . ($error['message'] ?? 'unknown'));
                }
                
                $new_hash_row = oci_fetch_array($hash_new_stmt, OCI_ASSOC);
                oci_free_statement($hash_new_stmt);
                
                if (!$new_hash_row) {
                    throw new ApiException(500, "Failed to generate password hash");
                }
                
                $sql_parts[] = "user_password = :password";
                $bind_vars['password'] = $new_hash_row['HASHED'];
            }
            
            $bind_vars['user_id'] = $user_id;
            
            // Update user credentials
            $sql = "UPDATE users SET " . implode(", ", $sql_parts) . " WHERE id = :user_id";
            
            $update_stmt = oci_parse($conn, $sql);
            if (!$update_stmt) {
                throw new ApiException(500, "Failed to prepare update statement");
            }
            
            foreach ($bind_vars as $key => $value) {
                oci_bind_by_name($update_stmt, ":$key", $bind_vars[$key]);
            }
            
            if (!oci_execute($update_stmt, OCI_COMMIT_ON_SUCCESS)) {
                $error = oci_error($update_stmt);
                oci_free_statement($update_stmt);
                throw new ApiException(500, "Failed to update credentials: " . ($error['message'] ?? 'unknown'));
            }
            
            oci_free_statement($update_stmt);
            
            // Update session username if it changed
            if ($_SESSION['username'] !== $username) {
                $_SESSION['username'] = $username;
            }
            
        } catch(ApiException $e) {
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
                
                $current_user_role = $_SESSION['user_role'] ?? 'GUEST';
                $current_user_id = $_SESSION['user_id'] ?? null;

                $can_edit = false;
                if ($is_own_profile) {
                    $can_edit = true;
                } else {
                    if ($current_user_role === 'ADMIN') {
                        $can_edit = true;
                    } elseif ($current_user_role === 'MOD' && $user->role === 'USER') {
                        $can_edit = true;
                    }
                }

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
                    'is_own_profile' => $is_own_profile,
                    'can_edit' => $can_edit,
                    'current_user_role' => $current_user_role,
                    'current_user_id' => $current_user_id
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

        if($url === "/api/profile/update-credentials")
        {
            if(!isset($_SESSION["user_id"])) {
                http_response_code(401);
                header("Content-Type: application/json");
                echo json_encode(['error' => 'You need to be logged in']);
                return;
            }
            
            try {
                $request_body = file_get_contents("php://input");
                $data = json_decode($request_body, true);
                
                if (!$data) {
                    throw new ApiException(400, "Invalid JSON data");
                }
                
                $user_id = isset($data['user_id']) ? (int)$data['user_id'] : 0;
                
                if ($user_id <= 0) {
                    throw new ApiException(400, "Invalid user ID");
                }
                
                $update_data = [];
                if (isset($data['username'])) {
                    $update_data['username'] = trim($data['username']);
                }
                if (isset($data['email'])) {
                    $update_data['email'] = trim($data['email']);
                }
                if (isset($data['password']) && !empty($data['password'])) {
                    $update_data['password'] = $data['password'];
                }
                
                ProfileController::update_credentials($user_id, $update_data);
                
                header("Content-Type: application/json");
                echo json_encode(['success' => true, 'message' => 'Credentials updated successfully']);
                
            } catch (ApiException $e) {
                http_response_code($e->status_code);
                header("Content-Type: application/json");
                echo json_encode(['error' => $e->err_msg]);
            }
        }
        else if($url === "/api/profile/update-own-credentials")
        {
            if(!isset($_SESSION["user_id"])) {
                http_response_code(401);
                header("Content-Type: application/json");
                echo json_encode(['error' => 'You need to be logged in']);
                return;
            }
            
            try {
                $request_body = file_get_contents("php://input");
                $data = json_decode($request_body, true);
                
                if ($data === null && json_last_error() !== JSON_ERROR_NONE) {
                    throw new ApiException(400, "Invalid JSON data");
                }
                
                ProfileController::update_own_credentials($data);
                
                header("Content-Type: application/json");
                echo json_encode(['success' => true, 'message' => 'Credentials updated successfully']);
                
            } catch (ApiException $e) {
                http_response_code($e->status_code);
                header("Content-Type: application/json");
                echo json_encode(['error' => $e->err_msg]);
            }
        }
        else if($url === "/api/profile/update")
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
                $clear_picture = isset($_POST['clear_picture']) && $_POST['clear_picture'] === 'true';
                $target_user_id = isset($_POST['user_id']) ? (int)$_POST['user_id'] : $_SESSION["user_id"];

                $data = [
                    'description' => $description,
                    'date_of_birth' => $date_of_birth
                ];

                if ($clear_picture) {
                    $data['clear_picture'] = 'true';
                }
                
                $profile_picture = null;
                if (isset($_FILES['profile_picture']) && $_FILES['profile_picture']['error'] === UPLOAD_ERR_OK) {
                    $profile_picture = $_FILES['profile_picture'];
                    $debug_info['profile_picture_processed'] = true;
                    $debug_info['file_size'] = $profile_picture['size'];
                    $debug_info['file_type'] = $profile_picture['type'];
                } else {
                    $debug_info['profile_picture_processed'] = false;
                }
                
                $user = ProfileController::update_profile($target_user_id, $data, $profile_picture);
                
                $current_user_role = $_SESSION['user_role'] ?? 'GUEST';
                $current_user_id = $_SESSION['user_id'] ?? null;
                $is_own_profile = ($current_user_id === $target_user_id);

                $can_edit = false;
                if ($is_own_profile) {
                    $can_edit = true;
                } else {
                    if ($current_user_role === 'ADMIN') {
                        $can_edit = true;
                    } elseif ($current_user_role === 'MOD' && $user->role === 'USER') {
                        $can_edit = true;
                    }
                }
                
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
                    'is_own_profile' => $is_own_profile,
                    'can_edit' => $can_edit,
                    'current_user_role' => $current_user_role,
                    'current_user_id' => $current_user_id,
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