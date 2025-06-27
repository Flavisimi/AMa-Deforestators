<?php
// Debug version - save this as contributions-debug.php temporarily to test

ini_set('display_errors', 1);
error_reporting(E_ALL);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json');

try {
    // Basic connection test
    $conn = oci_connect(
        getenv('ORACLE_USER'),
        getenv('ORACLE_PASSWORD'),
        '//' . getenv('ORACLE_HOST') . ':' . getenv('ORACLE_PORT') . '/' . getenv('ORACLE_SID')
    );

    if (!$conn) {
        throw new Exception('Database connection failed');
    }

    // Get user ID from query string
    $user_id = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;
    
    if ($user_id <= 0) {
        throw new Exception('Invalid user ID');
    }

    // Simple query to test
    $stmt = oci_parse($conn, "
        SELECT m.id, m.name, m.short_expansion, m.lang, m.domain, 
               m.approval_status, TO_CHAR(m.created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
        FROM meanings m
        WHERE m.uploader_id = :user_id
        ORDER BY m.created_at DESC
    ");
    
    if (!$stmt) {
        throw new Exception('Failed to prepare statement');
    }
    
    oci_bind_by_name($stmt, ":user_id", $user_id);
    
    if (!oci_execute($stmt)) {
        $error = oci_error($stmt);
        throw new Exception('Database error: ' . ($error['message'] ?? 'unknown'));
    }
    
    $meanings = [];
    while ($row = oci_fetch_assoc($stmt)) {
        $meanings[] = [
            'id' => (int)$row['ID'],
            'name' => $row['NAME'],
            'short_expansion' => $row['SHORT_EXPANSION'],
            'lang' => $row['LANG'],
            'domain' => $row['DOMAIN'],
            'approval_status' => $row['APPROVAL_STATUS'],
            'created_at' => $row['CREATED_AT'],
            'description' => 'Debug description',
            'score' => 0
        ];
    }
    
    oci_free_statement($stmt);
    oci_close($conn);
    
    echo json_encode([
        'success' => true,
        'contributions' => $meanings,
        'debug' => 'Query executed successfully',
        'user_id' => $user_id
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
?>