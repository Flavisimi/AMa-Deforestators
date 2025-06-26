document.addEventListener('DOMContentLoaded', function() {
    const editBtn = document.getElementById('editProfileBtn');
    const cancelBtn = document.getElementById('cancelEditBtn');
    const editFormContainer = document.getElementById('editFormContainer');
    const profilePictureInput = document.getElementById('profile_picture');
    const avatarImg = document.getElementById('avatarImg');
    const profileForm = document.getElementById('profileForm');
    
    loadUserProfile();
    loadProfile();
    
    if (editBtn && editFormContainer) {
        editBtn.addEventListener('click', function() {
            toggleEditForm(true);
        });
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            toggleEditForm(false);
            resetForm();
        });
    }
    
    if (profilePictureInput && avatarImg) {
        profilePictureInput.addEventListener('change', function(e) {
            previewImage(e.target.files[0]);
        });
    }
    
    if (profileForm) {
        profileForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveProfile();
        });
    }
    
    async function loadProfile() {
        try {
            showLoading(true);
            const urlParams = new URLSearchParams(window.location.search);
            const userId = urlParams.get('id');
            const url = userId ? `/api/profile?id=${userId}` : '/api/profile';
            
            const response = await fetch(url);
            
            if (!response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const error = await response.json();
                    
                    if (error.guest) {
                        displayGuestMessage();
                        return;
                    }
                    
                    throw new Error(error.error || error.err_msg || `HTTP ${response.status}: ${response.statusText}`);
                } else {
                    const text = await response.text();
                    console.error('Server response:', text);
                    throw new Error(`Server error (${response.status}): Expected JSON but got HTML. Check server logs for PHP errors.`);
                }
            }
            
            const user = await response.json();
            
            if (user.guest) {
                displayGuestMessage();
                return;
            }
            
            displayProfile(user);
            
            if (user.is_own_profile) {
                editBtn.style.display = 'block';
                document.getElementById('profileTitle').textContent = 'My Profile';
            } else {
                editBtn.style.display = 'none';
                document.getElementById('profileTitle').textContent = `${user.name}'s Profile`;
            }
            
        } catch (error) {
            console.error('Profile loading error:', error);
            showAlert('Error loading profile: ' + error.message, 'error');
        } finally {
            showLoading(false);
        }
    }
    
    function displayGuestMessage() {
        document.getElementById('profileTitle').textContent = 'Profile';
        document.getElementById('usernameDisplay').textContent = 'Not logged in';
        document.getElementById('emailDisplay').textContent = 'Please log in';
        document.getElementById('roleDisplay').textContent = 'Guest';
        document.getElementById('memberSinceDisplay').textContent = 'N/A';
        document.getElementById('dobField').style.display = 'none';
        document.getElementById('descriptionField').style.display = 'none';
        editBtn.style.display = 'none';
        
        showAlert('You need to log in to view your profile. Redirecting to login...', 'error');
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
    }
    
    function displayProfile(user) {
        document.getElementById('usernameDisplay').textContent = user.name;
        document.getElementById('emailDisplay').textContent = user.email;
        document.getElementById('roleDisplay').textContent = user.role;
        
        if (user.created_at) {
            const createdDate = new Date(user.created_at);
            document.getElementById('memberSinceDisplay').textContent = createdDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
        
        if (user.date_of_birth && user.date_of_birth.trim() !== '') {
            const dobDate = new Date(user.date_of_birth);
            document.getElementById('dobDisplay').textContent = dobDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            document.getElementById('dobField').style.display = 'flex';
        } else {
            document.getElementById('dobField').style.display = 'none';
        }
        
        if (user.description && user.description.trim() !== '') {
            document.getElementById('descriptionDisplay').textContent = user.description;
            document.getElementById('descriptionField').style.display = 'flex';
        } else {
            document.getElementById('descriptionField').style.display = 'none';
        }
        
        if (user.profile_picture && user.profile_picture !== '') {
            avatarImg.src = user.profile_picture;
        } else {
            avatarImg.src = '../assets/default-avatar.png';
        }
        addContributionButton(user);
        
        document.getElementById('description').value = user.description || '';
        
        if (user.date_of_birth && user.date_of_birth.trim() !== '') {
            const dobForInput = new Date(user.date_of_birth).toISOString().split('T')[0];
            document.getElementById('date_of_birth').value = dobForInput;
        } else {
            document.getElementById('date_of_birth').value = '';
        }
        
        const editBtn = document.getElementById('editProfileBtn');
        if (editBtn) {
            if (user.can_edit) {
                editBtn.style.display = 'block';
                if (user.is_own_profile) {
                    editBtn.textContent = 'Edit Profile';
                } else {
                    editBtn.textContent = `Edit ${user.name}'s Profile`;
                }
            } else {
                editBtn.style.display = 'none';
            }
        }
        
        const titleElement = document.getElementById('profileTitle');
        if (titleElement) {
            if (user.is_own_profile) {
                titleElement.textContent = 'My Profile';
            } else {
                titleElement.textContent = `${user.name}'s Profile`;
            }
        }
        if (user.is_own_profile) {
        addChangeCredentialsButton();
        }
        
        addAdminActions(user);
    }
    
    function addAdminActions(user) {
    const existingActions = document.querySelector('.admin-profile-actions');
    if (existingActions) {
        existingActions.remove();
    }
    
    if (user.current_user_role === 'ADMIN' && !user.is_own_profile) {
        const profileCard = document.querySelector('.profile-card');
        if (profileCard) {
            const adminActionsDiv = document.createElement('div');
            adminActionsDiv.className = 'admin-profile-actions';
            adminActionsDiv.innerHTML = `
                <div>
                    <h4>Admin Actions</h4>
                    <div>
                        <button type="button" class="btn btn-primary">
                            Edit Profile
                        </button>
                        <button type="button" class="btn btn-info">
                            Edit Credentials
                        </button>
                        <button type="button" class="btn btn-warning">
                            Change Role
                        </button>
                        <button type="button" class="btn btn-danger">
                            Delete User
                        </button>
                        <button type="button" class="btn btn-secondary">
                            Remove Picture
                        </button>
                    </div>
                </div>
            `;

            adminActionsDiv.querySelectorAll("div")[0].style = "border-top: 1px solid #e9ecef; padding-top: 20px; margin-top: 20px;";
            adminActionsDiv.querySelector("h4").style = "color: #dc3545; margin-bottom: 15px; font-size: 1.1rem;";
            adminActionsDiv.querySelectorAll("div")[1].style = "display: flex; gap: 10px; flex-wrap: wrap;";

            adminActionsDiv.querySelector(".btn-primary").addEventListener("click", ev => enableProfileEdit());
            adminActionsDiv.querySelector(".btn-info").addEventListener("click", ev => showAdminEditModal(user.id, user.role, user.name));
            adminActionsDiv.querySelector(".btn-warning").addEventListener("click", ev => showRoleChangeModal(user.id, user.role, user.name));
            adminActionsDiv.querySelector(".btn-danger").addEventListener("click", ev => confirmDeleteUser(user.id, user.name));
            adminActionsDiv.querySelector(".btn-secondary").addEventListener("click", ev => clearProfilePicture(user.id, user.name));

            profileCard.appendChild(adminActionsDiv);
        }
    } else if (user.current_user_role === 'MOD' && !user.is_own_profile && user.role === 'USER') {
        const profileCard = document.querySelector('.profile-card');
        if (profileCard) {
            const modActionsDiv = document.createElement('div');
            modActionsDiv.className = 'admin-profile-actions';
            modActionsDiv.innerHTML = `
                <div>
                    <h4 >Moderator Actions</h4>
                    <div>
                        <button type="button" class="btn btn-primary">
                            Edit Profile
                        </button>
                        <button type="button" class="btn btn-secondary">
                            Remove Picture
                        </button>
                    </div>
                </div>
            `;

            adminActionsDiv.querySelectorAll("div")[0].style = "border-top: 1px solid #e9ecef; padding-top: 20px; margin-top: 20px;";
            adminActionsDiv.querySelector("h4").style = "color: #ffc107; margin-bottom: 15px; font-size: 1.1rem;"
            adminActionsDiv.querySelectorAll("div")[1].style = "display: flex; gap: 10px; flex-wrap: wrap;";

            adminActionsDiv.querySelector(".btn-primary").addEventListener("click", ev => enableProfileEdit());
            adminActionsDiv.querySelector(".btn-info").addEventListener("click", ev => showAdminEditModal(user.id, user.role, user.name));
            adminActionsDiv.querySelector(".btn-warning").addEventListener("click", ev => showRoleChangeModal(user.id, user.role, user.name));
            adminActionsDiv.querySelector(".btn-danger").addEventListener("click", ev => confirmDeleteUser(user.id, user.name));
            adminActionsDiv.querySelector(".btn-secondary").addEventListener("click", ev => clearProfilePicture(user.id, user.name));

            profileCard.appendChild(modActionsDiv);
        }
    }
}
    
    async function saveProfile() {
        try {
            showLoading(true);
            
            const formData = new FormData();
            const description = document.getElementById('description').value.trim();
            const dateOfBirth = document.getElementById('date_of_birth').value;
            const profilePictureFile = document.getElementById('profile_picture').files[0];
            
            const urlParams = new URLSearchParams(window.location.search);
            const targetUserId = urlParams.get('id');
            
            console.log('Saving profile with:', { 
                description, 
                dateOfBirth, 
                targetUserId,
                hasProfilePicture: !!profilePictureFile,
                profilePictureSize: profilePictureFile?.size,
                profilePictureType: profilePictureFile?.type
            });
            
            formData.append('description', description);
            if (dateOfBirth) {
                formData.append('date_of_birth', dateOfBirth);
            }
            if (targetUserId) {
                formData.append('user_id', targetUserId);
            }
            
            if (profilePictureFile) {
                formData.append('profile_picture', profilePictureFile);
            }
            
            const response = await fetch('/api/profile/update', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const error = await response.json();
                    throw new Error(error.error || error.err_msg || 'Failed to update profile');
                } else {
                    const text = await response.text();
                    console.error('Server response:', text);
                    throw new Error('Server error: Expected JSON but got HTML. Check server logs for PHP errors.');
                }
            }
            
            const user = await response.json();
            console.log('Profile updated successfully:', user);
            displayProfile(user);
            toggleEditForm(false);
            showAlert('Profile updated successfully!', 'success');
            
        } catch (error) {
            console.error('Profile update error:', error);
            showAlert('Error updating profile: ' + error.message, 'error');
        } finally {
            showLoading(false);
        }
    }
    
    function toggleEditForm(show) {
        if (show) {
            editFormContainer.style.display = 'block';
            setTimeout(() => {
                editFormContainer.classList.add('show');
            }, 10);
            editBtn.style.display = 'none';
            
            editFormContainer.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        } else {
            editFormContainer.classList.remove('show');
            setTimeout(() => {
                editFormContainer.style.display = 'none';
                editBtn.style.display = 'inline-block';
            }, 300);
        }
    }
    
    function showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        overlay.style.display = show ? 'flex' : 'none';
    }
    
    function resetForm() {
        const form = editFormContainer.querySelector('form');
        if (form) {
            form.reset();
        }
        
        const originalSrc = avatarImg.getAttribute('src');
        avatarImg.src = originalSrc;
    }
    
    function previewImage(file) {
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            showAlert('Please select a valid image file.', 'error');
            profilePictureInput.value = '';
            return;
        }
        
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            showAlert('File too large. Maximum size is 5MB.', 'error');
            profilePictureInput.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            avatarImg.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    function showAlert(message, type) {
        const successDiv = document.getElementById('success-message');
        const errorDiv = document.getElementById('error-message');
        
        successDiv.style.display = 'none';
        errorDiv.style.display = 'none';
        
        if (type === 'success') {
            successDiv.textContent = message;
            successDiv.style.display = 'block';
            setTimeout(() => {
                successDiv.style.display = 'none';
            }, 5000);
        } else {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        }
    }
    
    const form = document.querySelector('.edit-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            const description = document.getElementById('description').value.trim();
            
            if (description.length > 1000) {
                e.preventDefault();
                showAlert('Description must be less than 1000 characters.', 'error');
                return;
            }
            
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Saving...';
                
                setTimeout(() => {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Save Changes';
                }, 3000);
            }
        });
    }
    
    window.addEventListener('resize', function() {
        if (window.innerWidth > 1024 && editFormContainer.style.display === 'block') {
            editFormContainer.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && editFormContainer.classList.contains('show')) {
            toggleEditForm(false);
            resetForm();
        }
    });
    
    const avatarImgElement = document.getElementById('avatarImg');
    if (avatarImgElement) {
        avatarImgElement.addEventListener('error', function() {
            this.src = '../assets/default-avatar.png';
        });
    }
});

function escapeHtml(text) {
    if (typeof text !== 'string') return text;
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

function enableProfileEdit() {
    const editBtn = document.getElementById('editProfileBtn');
    const editFormContainer = document.getElementById('editFormContainer');
    
    if (editFormContainer) {
        editFormContainer.style.display = 'block';
        setTimeout(() => {
            editFormContainer.classList.add('show');
        }, 10);
        
        if (editBtn) {
            editBtn.style.display = 'none';
        }
        
        editFormContainer.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }
}

function showRoleChangeModal(userId, currentRole, userName) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'role-modal';
    
    modal.innerHTML = `
        <div class="role-modal">
            <div class="modal-header">
                <h3>Change Role for ${userName}</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <p>Select a new role for this user:</p>
                <div class="role-options">
                    <button class="role-btn ${currentRole === 'USER' ? 'active' : ''}">
                        👤 USER
                    </button>
                    <button class="role-btn ${currentRole === 'MOD' ? 'active' : ''}">
                        🛡️ MODERATOR
                    </button>
                    <button class="role-btn ${currentRole === 'ADMIN' ? 'active' : ''}">
                        👑 ADMIN
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.addEventListener('click', function() {
        closeModal();
    });
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    const roleBtns = modal.querySelectorAll('.role-btn');
    roleBtns.forEach((btn, index) => {
        const roles = ['USER', 'MOD', 'ADMIN'];
        const newRole = roles[index];
        
        btn.addEventListener('click', function() {
            changeUserRole(userId, newRole);
        });
    });
}

function confirmDeleteUser(userId, userName) {
    if (confirm(`Are you sure you want to permanently delete the user "${userName}"? This action cannot be undone.`)) {
        deleteUser(userId);
    }
}

function clearProfilePicture(userId, userName) {
    if (confirm(`Are you sure you want to remove the profile picture for "${userName}"?`)) {
        removePicture(userId);
    }
}

function closeModal() {
    const modal = document.getElementById('role-modal');
    if (modal) {
        modal.remove();
    }
}

async function changeUserRole(userId, newRole) {
    try {
        const response = await fetch('/api/all-users/change-role', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                user_id: userId,
                new_role: newRole
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        closeModal();
        
        const successDiv = document.getElementById('success-message');
        if (successDiv) {
            successDiv.textContent = 'User role updated successfully';
            successDiv.style.display = 'block';
        }
        
        setTimeout(() => {
            window.location.reload();
        }, 1500);
        
    } catch (error) {
        console.error('Error changing user role:', error);
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.textContent = 'Failed to change user role: ' + error.message;
            errorDiv.style.display = 'block';
        }
    }
}

async function deleteUser(userId) {
    try {
        const response = await fetch('/api/all-users/delete', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin',
            body: JSON.stringify({ user_id: userId })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const successDiv = document.getElementById('success-message');
        if (successDiv) {
            successDiv.textContent = 'User deleted successfully';
            successDiv.style.display = 'block';
        }
        
        setTimeout(() => {
            window.location.href = '/users-page';
        }, 1500);
        
    } catch (error) {
        console.error('Error deleting user:', error);
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.textContent = 'Failed to delete user: ' + error.message;
            errorDiv.style.display = 'block';
        }
    }
}
function setupAdminButtons() {
    const adminActions = document.querySelector('.admin-profile-actions');
    if (!adminActions) return;
    
    const changeRoleBtn = adminActions.querySelector('.btn-warning');
    const deleteBtn = adminActions.querySelector('.btn-danger');
    
    if (changeRoleBtn) {
        const onclickAttr = changeRoleBtn.getAttribute('onclick');
        if (onclickAttr) {
            const match = onclickAttr.match(/showRoleChangeModal\('([^']+)', '([^']+)', '([^']+)'\)/);
            if (match) {
                const userId = match[1];
                const userRole = match[2]; 
                const userName = match[3];
                
                changeRoleBtn.removeAttribute('onclick');
                changeRoleBtn.addEventListener('click', function() {
                    showRoleChangeModal(userId, userRole, userName);
                });
            }
        }
    }
    
    if (deleteBtn) {
        const onclickAttr = deleteBtn.getAttribute('onclick');
        if (onclickAttr) {
            const match = onclickAttr.match(/confirmDeleteUser\('([^']+)', '([^']+)'\)/);
            if (match) {
                const userId = match[1];
                const userName = match[2];
                
                deleteBtn.removeAttribute('onclick');
                deleteBtn.addEventListener('click', function() {
                    confirmDeleteUser(userId, userName);
                });
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(setupAdminButtons, 100);
    
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1 && node.classList && node.classList.contains('admin-profile-actions')) {
                        setupAdminButtons();
                    }
                });
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});

async function removePicture(userId) {
    try {
        const overlay = document.getElementById('loading-overlay');
        overlay.style.display = 'flex';
        
        const formData = new FormData();
        formData.append('clear_picture', 'true');
        formData.append('user_id', userId);
        
        const response = await fetch('/api/profile/update', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to remove profile picture');
        }
        
        const successDiv = document.getElementById('success-message');
        successDiv.textContent = 'Profile picture removed successfully';
        successDiv.style.display = 'block';
        setTimeout(() => {
            window.location.reload();
        }, 1500);
        
    } catch (error) {
        console.error('Error removing picture:', error);
        const errorDiv = document.getElementById('error-message');
        errorDiv.textContent = 'Failed to remove profile picture: ' + error.message;
        errorDiv.style.display = 'block';
    } finally {
        const overlay = document.getElementById('loading-overlay');
        overlay.style.display = 'none';
    }
}

function showAdminEditModal(userId, currentName, currentEmail) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="admin-edit-modal">
            <div class="modal-header">
                <h3>Edit User Credentials</h3>
                <button class="modal-close">×</button>
            </div>
            <div class="modal-body">
                <form id="adminEditForm">
                    <div class="form-group">
                        <label for="admin-username">Username:</label>
                        <input type="text" id="admin-username" class="form-input" value="${currentName}" required>
                    </div>
                    <div class="form-group">
                        <label for="admin-email">Email:</label>
                        <input type="email" id="admin-email" class="form-input" value="${currentEmail}" required>
                    </div>
                    <div class="form-group">
                        <label for="admin-password">New Password (leave empty to keep current):</label>
                        <input type="password" id="admin-password" class="form-input" placeholder="Enter new password">
                    </div>
                    <div class="form-group">
                        <label for="admin-password-confirm">Confirm New Password:</label>
                        <input type="password" id="admin-password-confirm" class="form-input" placeholder="Confirm new password">
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary">Cancel</button>
                        <button type="submit" class="btn btn-primary">Update Credentials</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    modal.querySelector(".modal-close").addEventListener("click", ev => closeModal(modal));
    modal.querySelector(".form-actions > .btn-secondary").addEventListener("click", ev => closeModal(modal));
    document.body.appendChild(modal);
    
    const form = modal.querySelector('#adminEditForm');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        updateUserCredentials(userId, modal);
    });
}

async function updateUserCredentials(userId, modal) {
    try {
        const username = document.getElementById('admin-username').value.trim();
        const email = document.getElementById('admin-email').value.trim();
        const password = document.getElementById('admin-password').value;
        const passwordConfirm = document.getElementById('admin-password-confirm').value;
        
        if (!username || !email) {
            throw new Error('Username and email are required');
        }
        
        if (password && password !== passwordConfirm) {
            throw new Error('Passwords do not match');
        }
        
        if (password && password.length < 6) {
            throw new Error('Password must be at least 6 characters long');
        }
        
        const overlay = document.getElementById('loading-overlay');
        overlay.style.display = 'flex';
        
        const data = {
            user_id: userId,
            username: username,
            email: email
        };
        
        if (password) {
            data.password = password;
        }
        
        const response = await fetch('/api/profile/update-credentials', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update credentials');
        }
        
        const result = await response.json();
        if (result.success) {
            modal.remove();
            const successDiv = document.getElementById('success-message');
            successDiv.textContent = 'User credentials updated successfully';
            successDiv.style.display = 'block';
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        }
    } catch (error) {
        console.error('Error updating credentials:', error);
        const errorDiv = document.getElementById('error-message');
        errorDiv.textContent = 'Failed to update credentials: ' + error.message;
        errorDiv.style.display = 'block';
    } finally {
        const overlay = document.getElementById('loading-overlay');
        overlay.style.display = 'none';
    }
}

function closeModal(element) {
    if (element) {
        const modal = element.closest('.modal-overlay');
        if (modal) {
            modal.remove();
            return;
        }
    }
    
    const modal = document.getElementById('role-modal');
    if (modal) {
        modal.remove();
    }
}

function initializeCredentialChange() {
    const changePasswordCheckbox = document.getElementById('change-password-checkbox');
    const passwordFields = document.getElementById('password-fields');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    
    if (changePasswordCheckbox) {
        changePasswordCheckbox.addEventListener('change', function() {
            if (this.checked) {
                passwordFields.style.display = 'block';
                newPasswordInput.required = true;
                confirmPasswordInput.required = true;
            } else {
                passwordFields.style.display = 'none';
                newPasswordInput.required = false;
                confirmPasswordInput.required = false;
                newPasswordInput.value = '';
                confirmPasswordInput.value = '';
            }
        });
    }
    
    const closeModalBtn = document.getElementById('closeCredentialsModal');
    const cancelBtn = document.getElementById('cancelCredentials');
    const modal = document.getElementById('credentialsModal');
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeCredentialsModal);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeCredentialsModal);
    }
    
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeCredentialsModal();
            }
        });
    }
    
    const credentialsForm = document.getElementById('credentialsForm');
    if (credentialsForm) {
        credentialsForm.addEventListener('submit', handleCredentialsSubmit);
    }
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal && modal.style.display !== 'none') {
            closeCredentialsModal();
        }
    });
}

function showChangeCredentialsModal(currentUsername, currentEmail) {
    const modal = document.getElementById('credentialsModal');
    const usernameInput = document.getElementById('new-username');
    const emailInput = document.getElementById('new-email');
    const currentPasswordInput = document.getElementById('current-password');
    const changePasswordCheckbox = document.getElementById('change-password-checkbox');
    const passwordFields = document.getElementById('password-fields');
    
    if (usernameInput) usernameInput.value = currentUsername || '';
    if (emailInput) emailInput.value = currentEmail || '';
    if (currentPasswordInput) currentPasswordInput.value = '';
    if (changePasswordCheckbox) changePasswordCheckbox.checked = false;
    if (passwordFields) passwordFields.style.display = 'none';
    
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    if (newPasswordInput) {
        newPasswordInput.value = '';
        newPasswordInput.required = false;
    }
    if (confirmPasswordInput) {
        confirmPasswordInput.value = '';
        confirmPasswordInput.required = false;
    }
    
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => {
            if (usernameInput) usernameInput.focus();
        }, 100);
    }
}

function closeCredentialsModal() {
    const modal = document.getElementById('credentialsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function handleCredentialsSubmit(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    try {
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        submitBtn.textContent = 'Updating...';
        
        const formData = {
            username: document.getElementById('new-username').value.trim(),
            email: document.getElementById('new-email').value.trim(),
            current_password: document.getElementById('current-password').value
        };
        
        if (!formData.username || !formData.email || !formData.current_password) {
            throw new Error('All fields are required');
        }
        
        if (formData.username.length < 3) {
            throw new Error('Username must be at least 3 characters long');
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            throw new Error('Please enter a valid email address');
        }
        
        const changePasswordCheckbox = document.getElementById('change-password-checkbox');
        if (changePasswordCheckbox && changePasswordCheckbox.checked) {
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            if (!newPassword || !confirmPassword) {
                throw new Error('Please fill in both password fields');
            }
            
            if (newPassword.length < 6) {
                throw new Error('New password must be at least 6 characters long');
            }
            
            if (newPassword !== confirmPassword) {
                throw new Error('New passwords do not match');
            }
            
            formData.new_password = newPassword;
        }
        
        const response = await fetch('/api/profile/update-own-credentials', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Server error: Invalid response format');
        }
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Failed to update credentials');
        }
        
        if (result.success) {
            closeCredentialsModal();
            showAlert('Credentials updated successfully!', 'success');
            
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            throw new Error(result.error || 'Failed to update credentials');
        }
        
    } catch (error) {
        console.error('Error updating credentials:', error);
        showAlert('Error: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
        submitBtn.textContent = originalText;
    }
}

function addChangeCredentialsButton() {
    const editBtn = document.getElementById('editProfileBtn');
    
    if (editBtn && editBtn.style.display !== 'none') {
        const existingBtn = document.getElementById('changeCredentialsBtn');
        if (!existingBtn) {
            const changeCredentialsBtn = document.createElement('button');
            changeCredentialsBtn.type = 'button';
            changeCredentialsBtn.className = 'btn change-credentials-btn';
            changeCredentialsBtn.id = 'changeCredentialsBtn';
            changeCredentialsBtn.textContent = 'Change Credentials';
            
            const currentUsername = document.getElementById('usernameDisplay').textContent;
            const currentEmail = document.getElementById('emailDisplay').textContent;
            
            changeCredentialsBtn.addEventListener('click', function() {
                showChangeCredentialsModal(currentUsername, currentEmail);
            });
            
            editBtn.parentNode.appendChild(changeCredentialsBtn);
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    initializeCredentialChange();
});

function showAlert(message, type) {
    const existingAlert = document.querySelector('.temp-alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} temp-alert`;
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1001;
        min-width: 300px;
        padding: 12px 16px;
        border-radius: 6px;
        font-weight: 500;
        animation: slideInRight 0.3s ease-out;
    `;
    
    if (type === 'success') {
        alert.style.background = '#d4edda';
        alert.style.color = '#155724';
        alert.style.border = '1px solid #c3e6cb';
    } else if (type === 'error') {
        alert.style.background = '#f8d7da';
        alert.style.color = '#721c24';
        alert.style.border = '1px solid #f5c6cb';
    }
    
    alert.textContent = message;
    document.body.appendChild(alert);
    
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}
function addContributionButton(user) {
    const profileActionsHeader = document.querySelector('.profile-actions-header');
    
    if (!profileActionsHeader) {
        const profileHeader = document.querySelector('.profile-header');
        if (profileHeader) {
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'profile-actions-header';
            profileHeader.appendChild(actionsDiv);
        }
    }
    
    const actionsHeader = document.querySelector('.profile-actions-header');
    if (actionsHeader) {
        const contributionBtn = document.createElement('button');
        contributionBtn.type = 'button';
        contributionBtn.className = 'btn btn-secondary';
        contributionBtn.textContent = 'Contributions';
        contributionBtn.addEventListener('click', function() {
            window.location.href = `contributions?user_id=${user.id}`;
        });
        
        actionsHeader.appendChild(contributionBtn);
    }
}
