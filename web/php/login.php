<?php
ini_set('session.cookie_httponly', 1);
ini_set('session.use_strict_mode', 1);
ini_set('session.cookie_samesite', 'Lax');

session_start();
header('Content-Type: application/json');
ini_set('display_errors', 0);
error_reporting(0);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';

    if (empty($username) || empty($password)) 
    {
        echo json_encode(['success' => false, 'error' => 'Please fill in both username and password.']);
        exit;
    }
    
    $conn = oci_connect(
        getenv('ORACLE_USER'),
        getenv('ORACLE_PASSWORD'),
        '//' . getenv('ORACLE_HOST') . ':' . getenv('ORACLE_PORT') . '/' . getenv('ORACLE_SID')
    );

    if (!$conn) 
    {
        echo json_encode(['success' => false, 'error' => 'Database connection failed']);
        exit;
    }
    
    $stmt = null;
    try {
        $sql = 'BEGIN :result := auth_package.validate_login(:username, :password); END;';
        $stmt = oci_parse($conn, $sql);
        if (!$stmt) {
            throw new Exception('Failed to parse SQL statement');
        }
        
        oci_bind_by_name($stmt, ':username', $username);
        oci_bind_by_name($stmt, ':password', $password);
        oci_bind_by_name($stmt, ':result', $result, -1, SQLT_INT);
        
        if (!@oci_execute($stmt)) 
        {
            $e = oci_error($stmt);
            $error = $e['message'] ?? 'Unknown error';
            if (strpos($error, 'User does not exist') !== false) $error = 'Invalid user';
            elseif (strpos($error, 'Incorrect password') !== false) $error = 'Invalid password';
            else $error = 'Login failed';
            echo json_encode(['success' => false, 'error' => $error]);
        } 
        else 
        {
            if ($result > 0) 
            {
                // Get user role from database
                $role_stmt = oci_parse($conn, "SELECT role FROM users WHERE id = :user_id");
                oci_bind_by_name($role_stmt, ':user_id', $result);
                
                if (oci_execute($role_stmt)) {
                    $role_row = oci_fetch_array($role_stmt, OCI_ASSOC);
                    $user_role = $role_row ? $role_row['ROLE'] : 'USER';
                } else {
                    $user_role = 'USER';
                }
                oci_free_statement($role_stmt);
                
                // Regenerate session ID for security
                session_regenerate_id(true);
                
                // Set session variables
                $_SESSION['user_id'] = (int)$result;
                $_SESSION['username'] = $username;
                $_SESSION['user_role'] = $user_role;
                $_SESSION['login_time'] = time();
                
                // Force session write
                session_write_close();
                
                echo json_encode([
                    'success' => true, 
                    'user_id' => (int)$result,
                    'username' => $username,
                    'role' => $user_role,
                    'session_id' => session_id()
                ]);
            } 
            else {
                echo json_encode(['success' => false, 'error' => 'Invalid username or password']);
            }
        }
    } 
    catch (Exception $e) 
    {
        $error = $e->getMessage();
        if (strpos($error, 'User does not exist') !== false) $error = 'Invalid user';
        elseif (strpos($error, 'Incorrect password') !== false) $error = 'Invalid password';
        else $error = 'Login failed: ' . $error;
        echo json_encode(['success' => false, 'error' => $error]);
    }
    
    if ($stmt) oci_free_statement($stmt);
    oci_close($conn);
}
else {
    echo json_encode(['success' => false, 'error' => 'Invalid request method']);
}
?>