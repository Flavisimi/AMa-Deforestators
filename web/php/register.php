<?php
session_start();
header('Content-Type: application/json');
ini_set('display_errors', 0);
error_reporting(0);
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'] ?? '';
    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';
    if (empty($username) || empty($email) || empty($password)) 
    {
        echo json_encode(['success' => false, 'error' => 'Please fill in all fields.']);
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
    try 
    {
        $sql = 'BEGIN auth_package.register_user(:username, :password, :email, :user_id); END;';
        $stmt = oci_parse($conn, $sql);
        if (!$stmt) throw new Exception('Failed to parse SQL statement');
        
        oci_bind_by_name($stmt, ':username', $username);
        oci_bind_by_name($stmt, ':password', $password);
        oci_bind_by_name($stmt, ':email', $email);
        oci_bind_by_name($stmt, ':user_id', $user_id, -1, SQLT_INT);
        if (!@oci_execute($stmt)) 
        {
            $e = oci_error($stmt);
            $error = $e['message'] ?? 'Unknown error';
            if (strpos($error, 'Username already exists') !== false) $error = 'Username already exists';
            elseif (strpos($error, 'Email already exists') !== false) $error = 'Email already exists';
            else $error = 'Registration failed';
            echo json_encode(['success' => false, 'error' => $error]);
        } 
        else echo json_encode(['success' => true, 'message' => 'Registration successful']);
    } 
    catch (Exception $e) 
    {
        $error = $e->getMessage();
        if (strpos($error, 'Username already exists') !== false) $error = 'Username already exists';
        elseif (strpos($error, 'Email already exists') !== false) $error = 'Email already exists';
        else $error = 'Registration failed: ' . $error;  
        echo json_encode(['success' => false, 'error' => $error]);
    }
    if ($stmt) oci_free_statement($stmt);
    oci_close($conn);
}
else echo json_encode(['success' => false, 'error' => 'Invalid request method']);
?>
