<?php
session_start();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'];
    $password = $_POST['password'];

    $conn = oci_connect(
    getenv('ORACLE_USER'),
    getenv('ORACLE_PASSWORD'),
    '//' . getenv('ORACLE_HOST') . ':' . getenv('ORACLE_PORT') . '/' . getenv('ORACLE_SID')
    );
    if (!$conn) 
    {
        $e = oci_error();
        die("Connection failed: " . $e['message']);
    }

    // Call PL/SQL function
    $sql = 'BEGIN :result := auth_package.validate_login(:username, :password); END;';
    $stmt = oci_parse($conn, $sql);
    oci_bind_by_name($stmt, ':username', $username);
    oci_bind_by_name($stmt, ':password', $password);
    oci_bind_by_name($stmt, ':result', $result, -1, SQLT_INT);
    oci_execute($stmt);

    if ($result > 0) {
        $_SESSION['user_id'] = $result;
        $_SESSION['username'] = $username;
        header('Location: dashboard.php'); // Redirect to dashboard (not implemented)
        exit;
    } else {
        $error = "Invalid username or password";
    }

    oci_free_statement($stmt);
    oci_close($conn);
}
?>