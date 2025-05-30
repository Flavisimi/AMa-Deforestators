<?php
session_start();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'];
    $email = $_POST['email'];
    $password = $_POST['password'];

    $conn = oci_connect(
    getenv('ORACLE_USER'),
    getenv('ORACLE_PASSWORD'),
    '//' . getenv('ORACLE_HOST') . ':' . getenv('ORACLE_PORT') . '/' . getenv('ORACLE_SID')
    );
    if (!$conn) {
        $e = oci_error();
        $error = "Connection failed: " . $e['message'];

    } 
    else 
    {
        try {
            // Call PL/SQL procedure
            $sql = 'BEGIN auth_package.register_user(:username, :password, :email, :user_id); END;';
            $stmt = oci_parse($conn, $sql);
            oci_bind_by_name($stmt, ':username', $username);
            oci_bind_by_name($stmt, ':password', $password);
            oci_bind_by_name($stmt, ':email', $email);
            oci_bind_by_name($stmt, ':user_id', $user_id, -1, SQLT_INT);
            oci_execute($stmt);

            $success = "Registration successful! Please <a href='index.html'>login</a>.";
        } 
        catch (Exception $e) 
        {
            $error = "Registration failed: " . oci_error($stmt)['message'];
            if (strpos($error, 'Username already exists') !== false) {
                $error = "Username already exists.";
            } elseif (strpos($error, 'Email already exists') !== false) {
                $error = "Email already exists.";
            }
        }

        oci_free_statement($stmt);
        oci_close($conn);
    }
}
?>
