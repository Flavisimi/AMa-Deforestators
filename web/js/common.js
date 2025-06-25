const GLOBAL_USER = new Promise(async (resolve, reject) =>
{
    await loadUserData(resolve);
});

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

async function loadUserData(resolve_promise)
{
    await fetch('/api/profile', {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) {
                return null;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(user => {
        resolve_promise(user);
    })
    .catch(error => {
        console.error('Error loading user data:', error);
    });
}

function loadUserProfile() {
    fetch('/api/profile', {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) {
                displayGuestProfile();
                return null;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(user => {
        if (user && !user.guest) {
            displayUserProfile(user);
        } else {
            displayGuestProfile();
        }
    })
    .catch(error => {
        console.error('Error loading user profile:', error);
        displayGuestProfile();
    });
}

function displayUserProfile(user) {
    const usernameElement = document.querySelector('.username');
    const avatarElement = document.querySelector('.avatar');
    
    if (usernameElement) {
        usernameElement.textContent = user.name;
    }
    
    if (avatarElement) {
        avatarElement.classList.remove('guest');
        
        if (user.profile_picture && user.profile_picture !== '') {
            avatarElement.classList.add('has-image');
            avatarElement.style.backgroundImage = `url('${user.profile_picture}')`;
            avatarElement.textContent = '';
        } else {
            avatarElement.classList.remove('has-image');
            avatarElement.style.backgroundImage = '';
            const initial = user.name.charAt(0).toUpperCase();
            avatarElement.textContent = initial;
        }
    }
}

function displayGuestProfile() {
    const usernameElement = document.querySelector('.username');
    const avatarElement = document.querySelector('.avatar');
    
    if (usernameElement) {
        usernameElement.textContent = 'Guest';
    }
    
    if (avatarElement) {
        avatarElement.classList.add('guest');
        avatarElement.classList.remove('has-image');
        avatarElement.style.backgroundImage = '';
        avatarElement.textContent = '';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    loadUserProfile();
    
    const logoutLinks = document.querySelectorAll('a[href="/"], a[href="index"], a[href="index.html"]');
    logoutLinks.forEach(link => {
        if (link.textContent.trim().toLowerCase() === 'logout') {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                logout();
            });
        }
    });
});

function logout() {
    fetch('/api/logout', {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.href = '/';
        } else {
            console.error('Logout failed:', data.message);
            window.location.href = '/';
        }
    })
    .catch(error => {
        console.error('Error during logout:', error);
        window.location.href = '/';
    });
}