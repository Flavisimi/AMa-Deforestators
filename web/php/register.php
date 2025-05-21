<?php
session_start();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'];
    $email = $_POST['email'];
    $password = $_POST['password'];

    // Oracle connection using environment variables
    $conn = oci_connect(getenv('ORACLE_USER'), getenv('ORACLE_PASSWORD'), 
                       getenv('ORACLE_HOST') . ':' . getenv('ORACLE_PORT') . '/' . getenv('ORACLE_SID'));
    if (!$conn) {
        $e = oci_error();
        $error = "Connection failed: " . $e['message'];
    } else {
        try {
            // Call PL/SQL procedure
            $sql = 'BEGIN auth_pkg.register_user(:username, :password, :email, :user_id); END;';
            $stmt = oci_parse($conn, $sql);
            oci_bind_by_name($stmt, ':username', $username);
            oci_bind_by_name($stmt, ':password', $password);
            oci_bind_by_name($stmt, ':email', $email);
            oci_bind_by_name($stmt, ':user_id', $user_id, -1, SQLT_INT);
            oci_execute($stmt);

            $success = "Registration successful! Please <a href='index.html'>login</a>.";
        } catch (Exception $e) {
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

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Register - Abbreviations Manager</title>
    <link rel="stylesheet" href="../css/register.css">
</head>
<body>
    <div class="register-container">
        <h2>Abbreviations Manager</h2>
        <form id="register-form" action="register.php" method="POST">
            <div class="form-group">
                <label for="username">Username</label>
                <input type="text" id="username" name="username" value="<?php echo isset($username) ? htmlspecialchars($username) : ''; ?>" required>
            </div>
            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" value="<?php echo isset($email) ? htmlspecialchars($email) : ''; ?>" required>
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required>
            </div>
            <div class="form-group">
                <label for="confirm-password">Confirm Password</label>
                <input type="password" id="confirm-password" name="confirm-password" required>
            </div>
            <button type="submit">Register</button>
            <?php if (isset($error)) { ?>
                <p class="error"><?php echo $error; ?></p>
            <?php } ?>
            <?php if (isset($success)) { ?>
                <p class="success"><?php echo $success; ?></p>
            <?php } ?>
        </form>
        <p>Already have an account? <a href="../index.html">Login</a></p>
    </div>
    <script src="../js/register.js"></script>
</body>
</html>