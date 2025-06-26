const GLOBAL_USER = new Promise(loadUserData);

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

function initializeHamburger()
{
    const button = document.createElement("button");
    button.className = "hamburger";
    button.innerHTML = "<span></span><span></span><span></span>";
    button.addEventListener("click", ev => document.querySelector(".navigator").classList.toggle("active"));

    document.body.appendChild(button);
}

function initializeNavigator()
{
    const navigator = document.createElement("nav");
    navigator.className = "navigator";
    navigator.innerHTML = `
        <ul class="nav-list">
            <li><div class="nav-header"><h2>Abbreviations</h2></div></li>
            <li><a href="main" class="nav-button">Dashboard</a></li>
            <li><a href="create-abbreviation" class="nav-button">Create an Abbreviation</a></li>
            <li><a href="stats" class="nav-button">Statistics</a></li>
            <li><a href="my_abbreviations" class="nav-button">Saved Abbreviations</a></li>
            <li><a href="all_abbreviations" class="nav-button">Abbreviation Lists</a></li>
            <li><a href="users-page" class="nav-button">Users</a></li>
        </ul>
    `;

    document.body.appendChild(navigator);
}

async function loadUserData(resolve, reject)
{
    fetch('/api/profile', {
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
        resolve(user);
    })
    .catch(error => {
        console.error('Error loading user data:', error);
        reject(error);
    });
}

async function loadUserProfile() {
    const user = await GLOBAL_USER;
    if(user)
        displayUserProfile(user);
    else
        displayGuestProfile();
}

function displayUserProfile(user) {
    const usernameElement = document.querySelector('.username');
    const avatarElement = document.querySelector('.avatar');
    
    if (usernameElement) {
        usernameElement.textContent = escapeHtml(user.name);
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
    
    updateProfileMenuForLoggedUser();
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
    
    updateProfileMenuForGuest();
}

function updateProfileMenuForLoggedUser() {
    const profileMenu = document.querySelector('.profile-menu');
    if (profileMenu) {
        profileMenu.innerHTML = `
            <a href="profile">View Profile</a>
            <a href="#" id="logout-btn">Logout</a>
        `;
        
        const logoutBtn = profileMenu.querySelector('#logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                logout();
            });
        }
    }
}

function updateProfileMenuForGuest() {
    const profileMenu = document.querySelector('.profile-menu');
    if (profileMenu) {
        profileMenu.innerHTML = `
            <a href="profile">View Profile</a>
            <a href="#" id="login-btn">Login</a>
        `;
        
        const loginBtn = profileMenu.querySelector('#login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', function(e) {
                e.preventDefault();
                window.location.href = '/';
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    loadUserProfile();
    initializeNavigator();
    initializeHamburger();
    
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