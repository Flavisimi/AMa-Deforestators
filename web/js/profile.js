document.addEventListener('DOMContentLoaded', function() {
    const editBtn = document.getElementById('editProfileBtn');
    const cancelBtn = document.getElementById('cancelEditBtn');
    const editFormContainer = document.getElementById('editFormContainer');
    const profilePictureInput = document.getElementById('profile_picture');
    const avatarImg = document.getElementById('avatarImg');
    const profileForm = document.getElementById('profileForm');
    
    document.querySelector('.hamburger').addEventListener('click', function() {
        document.querySelector('.navigator').classList.toggle('active');
    });

    document.querySelector('.user-profile').addEventListener('click', function(e) {
        e.stopPropagation();
        this.querySelector('.profile-menu').classList.toggle('active');
    });

    document.addEventListener('click', function(e) {
        const profileMenu = document.querySelector('.profile-menu');
        if (!profileMenu.contains(e.target) && profileMenu.classList.contains('active')) {
            profileMenu.classList.remove('active');
        }
    });
    
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
            const url = userId ? `/profile?id=${userId}` : '/profile';
            
            const response = await fetch(url);
            
            if (!response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const error = await response.json();
                    throw new Error(error.err_msg || `HTTP ${response.status}: ${response.statusText}`);
                } else {
                    const text = await response.text();
                    console.error('Server response:', text);
                    throw new Error(`Server error (${response.status}): Expected JSON but got HTML. Check browser console for details.`);
                }
            }
            
            const user = await response.json();
            displayProfile(user);
            
            if (!userId || parseInt(userId) === getCurrentUserId()) {
                editBtn.style.display = 'block';
                document.getElementById('profileTitle').textContent = 'My Profile';
            } else {
                document.getElementById('profileTitle').textContent = `${user.name}'s Profile`;
            }
            
        } catch (error) {
            console.error('Profile loading error:', error);
            showAlert('Error loading profile: ' + error.message, 'error');
        } finally {
            showLoading(false);
        }
    }
    
    function displayProfile(user) {
        document.getElementById('usernameDisplay').textContent = user.name;
        document.getElementById('emailDisplay').textContent = user.email;
        document.getElementById('roleDisplay').textContent = user.role;
        
        if (user.created_at) {
            const createdDate = new Date(user.created_at.date || user.created_at);
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
        
        avatarImg.src = '../assets/default-avatar.png';
        
        document.getElementById('description').value = user.description || '';
        
        if (user.date_of_birth && user.date_of_birth.trim() !== '') {
            const dobForInput = new Date(user.date_of_birth).toISOString().split('T')[0];
            document.getElementById('date_of_birth').value = dobForInput;
        } else {
            document.getElementById('date_of_birth').value = '';
        }
    }
    
    async function saveProfile() {
        try {
            showLoading(true);
            
            const formData = new FormData();
            const description = document.getElementById('description').value.trim();
            const dateOfBirth = document.getElementById('date_of_birth').value;
            
            console.log('Saving profile with:', { description, dateOfBirth }); // Debug log
            
            formData.append('description', description);
            if (dateOfBirth) {
                formData.append('date_of_birth', dateOfBirth);
            }
            
            const response = await fetch('/profile/update', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const error = await response.json();
                    throw new Error(error.err_msg || 'Failed to update profile');
                } else {
                    const text = await response.text();
                    console.error('Server response:', text);
                    throw new Error('Server error: Expected JSON but got HTML');
                }
            }
            
            const user = await response.json();
            console.log('Profile updated successfully:', user); // Debug log
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
    
    function getCurrentUserId() {
        return 1;
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