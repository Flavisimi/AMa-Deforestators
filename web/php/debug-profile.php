<?php
// Create this as web/debug_profile_update.php
session_start();
header('Content-Type: application/json');

// Debug what we're receiving
$debug_info = [
    'method' => $_SERVER['REQUEST_METHOD'],
    'post_data' => $_POST,
    'raw_input' => file_get_contents('php://input'),
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'not set',
    'session_user_id' => $_SESSION['user_id'] ?? 'not set'
];

echo json_encode($debug_info, JSON_PRETTY_PRINT);
?>