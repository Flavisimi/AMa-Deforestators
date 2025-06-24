<?php
session_start();
require_once 'config.php';

if (!isset($_SESSION['user_id'])) {
    header('Location: login.php');
    exit();
}

$profile_user_id = isset($_GET['id']) ? (int)$_GET['id'] : $_SESSION['user_id'];
$is_own_profile = ($profile_user_id === $_SESSION['user_id']);

try {
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$profile_user_id]);
    $profile_user = $stmt->fetch();
    
    if (!$profile_user) {
        header('Location: dashboard.php');
        exit();
    }
} catch (PDOException $e) {
    die("Database error: " . $e->getMessage());
}

$success_message = '';
$error_message = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $is_own_profile) {
    $description = trim($_POST['description'] ?? '');
    $date_of_birth = $_POST['date_of_birth'] ?? null;
    
    if (empty($date_of_birth)) {
        $date_of_birth = null;
    }
    
    $upload_dir = 'uploads/profiles/';
    if (!is_dir($upload_dir)) {
        mkdir($upload_dir, 0755, true);
    }
    
    $profile_picture = $profile_user['profile_picture'];
    
    if (isset($_FILES['profile_picture']) && $_FILES['profile_picture']['error'] === UPLOAD_ERR_OK) {
        $file = $_FILES['profile_picture'];
        $allowed_types = ['image/jpeg', 'image/png', 'image/gif'];
        $max_size = 5 * 1024 * 1024;
        
        if (!in_array($file['type'], $allowed_types)) {
            $error_message = 'Invalid file type. Only JPG, PNG and GIF are allowed.';
        } elseif ($file['size'] > $max_size) {
            $error_message = 'File too large. Maximum size is 5MB.';
        } else {
            if (function_exists('exif_imagetype')) {
                $image_type = exif_imagetype($file['tmp_name']);
                if (!in_array($image_type, [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_GIF])) {
                    $error_message = 'Invalid image file.';
                }
            }
            
            if (empty($error_message)) {
                $file_extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
                $new_filename = 'profile_' . $profile_user_id . '_' . time() . '.' . $file_extension;
                $upload_path = $upload_dir . $new_filename;
                
                if (move_uploaded_file($file['tmp_name'], $upload_path)) {
                    if ($profile_user['profile_picture'] !== 'default-avatar.png' && 
                        file_exists($upload_dir . $profile_user['profile_picture'])) {
                        unlink($upload_dir . $profile_user['profile_picture']);
                    }
                    $profile_picture = $new_filename;
                } else {
                    $error_message = 'Failed to upload file.';
                }
            }
        }
    }
    
    if (empty($error_message)) {
        try {
            $stmt = $pdo->prepare("UPDATE users SET description = ?, date_of_birth = ?, profile_picture = ? WHERE id = ?");
            $stmt->execute([$description, $date_of_birth, $profile_picture, $profile_user_id]);
            $success_message = 'Profile updated successfully!';
            
            $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
            $stmt->execute([$profile_user_id]);
            $profile_user = $stmt->fetch();
            
        } catch (PDOException $e) {
            $error_message = 'Database error: ' . $e->getMessage();
        }
    }
}

$page_title = $is_own_profile ? 'My Profile' : $profile_user['username'] . "'s Profile";
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars($page_title); ?></title>
    <link rel="stylesheet" href="common.css">
    <link rel="stylesheet" href="profile.css">
</head>
<body>
    <div class="app-container">
        <nav class="sidebar">
            <div class="logo">
                <h2>Dashboard</h2>
            </div>
            <ul class="nav-links">
                <li><a href="dashboard.php">Dashboard</a></li>
                <li><a href="profile.php" class="active">Profile</a></li>
                <li><a href="logout.php">Logout</a></li>
            </ul>
        </nav>

        <main class="main-content">
            <div class="profile-container">
                <div class="profile-header">
                    <h1><?php echo htmlspecialchars($page_title); ?></h1>
                </div>

                <?php if ($success_message): ?>
                    <div class="alert alert-success"><?php echo htmlspecialchars($success_message); ?></div>
                <?php endif; ?>

                <?php if ($error_message): ?>
                    <div class="alert alert-error"><?php echo htmlspecialchars($error_message); ?></div>
                <?php endif; ?>

                <div class="profile-content">
                    <div class="profile-card">
                        <div class="profile-avatar">
                            <?php 
                            $avatar_path = 'uploads/profiles/' . $profile_user['profile_picture'];
                            if (!file_exists($avatar_path) || $profile_user['profile_picture'] === 'default-avatar.png') {
                                $avatar_path = 'assets/default-avatar.png';
                            }
                            ?>
                            <img src="<?php echo htmlspecialchars($avatar_path); ?>" 
                                 alt="Profile Picture" 
                                 class="avatar-img"
                                 id="avatarImg">
                        </div>

                        <div class="profile-info">
                            <div class="profile-field">
                                <label>Username:</label>
                                <span><?php echo htmlspecialchars($profile_user['username']); ?></span>
                            </div>

                            <div class="profile-field">
                                <label>Email:</label>
                                <span><?php echo htmlspecialchars($profile_user['email']); ?></span>
                            </div>

                            <div class="profile-field">
                                <label>Role:</label>
                                <span><?php echo htmlspecialchars($profile_user['role']); ?></span>
                            </div>

                            <div class="profile-field">
                                <label>Member Since:</label>
                                <span><?php echo date('F j, Y', strtotime($profile_user['created_at'] ?? 'now')); ?></span>
                            </div>

                            <?php if ($profile_user['date_of_birth']): ?>
                            <div class="profile-field">
                                <label>Date of Birth:</label>
                                <span><?php echo date('F j, Y', strtotime($profile_user['date_of_birth'])); ?></span>
                            </div>
                            <?php endif; ?>

                            <?php if ($profile_user['description']): ?>
                            <div class="profile-field description">
                                <label>Description:</label>
                                <p><?php echo nl2br(htmlspecialchars($profile_user['description'])); ?></p>
                            </div>
                            <?php endif; ?>
                        </div>

                        <?php if ($is_own_profile): ?>
                        <div class="profile-actions">
                            <button type="button" class="btn btn-primary" id="editProfileBtn">
                                Edit Profile
                            </button>
                        </div>
                        <?php endif; ?>
                    </div>

                    <?php if ($is_own_profile): ?>
                    <div class="edit-form-container" id="editFormContainer" style="display: none;">
                        <form method="POST" enctype="multipart/form-data" class="edit-form">
                            <h3>Edit Profile</h3>

                            <div class="form-group">
                                <label for="profile_picture">Profile Picture:</label>
                                <input type="file" 
                                       id="profile_picture" 
                                       name="profile_picture" 
                                       accept="image/*"
                                       class="form-input">
                                <small class="form-help">JPG, PNG or GIF. Max 5MB.</small>
                            </div>

                            <div class="form-group">
                                <label for="description">Description:</label>
                                <textarea id="description" 
                                          name="description" 
                                          rows="4" 
                                          class="form-input"
                                          placeholder="Tell us about yourself..."><?php echo htmlspecialchars($profile_user['description'] ?? ''); ?></textarea>
                            </div>

                            <div class="form-group">
                                <label for="date_of_birth">Date of Birth:</label>
                                <input type="date" 
                                       id="date_of_birth" 
                                       name="date_of_birth" 
                                       value="<?php echo htmlspecialchars($profile_user['date_of_birth'] ?? ''); ?>"
                                       class="form-input">
                            </div>

                            <div class="form-actions">
                                <button type="submit" class="btn btn-primary">Save Changes</button>
                                <button type="button" class="btn btn-secondary" id="cancelEditBtn">Cancel</button>
                            </div>
                        </form>
                    </div>
                    <?php endif; ?>
                </div>
            </div>
        </main>
    </div>

    <script src="profile.js"></script>
</body>
</html>