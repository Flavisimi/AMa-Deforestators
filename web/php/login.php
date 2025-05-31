<?php
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
                $_SESSION['user_id'] = $result;
                $_SESSION['username'] = $username;
                echo json_encode(['success' => true]);
            } 
            else echo json_encode(['success' => false, 'error' => 'Invalid username or password']);
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
 else echo json_encode(['success' => false, 'error' => 'Invalid request method']);
?>