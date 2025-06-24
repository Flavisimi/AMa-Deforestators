function setupLoadMoreButton() {
    const loadMoreBtn = document.getElementById('load-more-btn');
    
    loadMoreBtn.addEventListener('click', function() {
        loadMoreUsers();
    });
}

function toggleAdminMenu(userId) {
    const menu = document.getElementById(`admin-menu-${userId}`);
    const allMenus = document.querySelectorAll('.admin-menu');
    
    // Close all other menus first
    allMenus.forEach(m => {
        if (m !== menu) {
            m.style.display = 'none';
        }
    });
    
    // Toggle current menu
    if (menu.style.display === 'none' || menu.style.display === '') {
        menu.style.display = 'block';
        // Force reflow to ensure the element is rendered
        menu.offsetHeight;
        // Add a small delay to ensure visibility
        setTimeout(() => {
            menu.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 10);
    } else {
        menu.style.display = 'none';
    }
}

function showRoleChangeModal(userId, currentRole, userName) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="role-modal">
            <div class="modal-header">
                <h3>Change Role for ${userName}</h3>
                <button class="modal-close" onclick="closeModal(this)">×</button>
            </div>
            <div class="modal-body">
                <p>Current role: <strong>${currentRole}</strong></p>
                <div class="role-options">
                    <button class="role-btn ${currentRole === 'USER' ? 'active' : ''}" onclick="changeUserRole(${userId}, 'USER', this)">
                        👤 USER
                    </button>
                    <button class="role-btn ${currentRole === 'MOD' ? 'active' : ''}" onclick="changeUserRole(${userId}, 'MOD', this)">
                        🛡️ MODERATOR
                    </button>
                    <button class="role-btn ${currentRole === 'ADMIN' ? 'active' : ''}" onclick="changeUserRole(${userId}, 'ADMIN', this)">
                        👑 ADMIN
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function confirmDeleteUser(userId, userName) {
    if (confirm(`Are you sure you want to permanently delete the user "${userName}"? This action cannot be undone.`)) {
        deleteUser(userId);
    }
}

async function changeUserRole(userId, newRole, buttonElement) {
    try {
        const response = await fetch('/api/all-users/change-role', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                new_role: newRole
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to change user role');
        }
        
        const result = await response.json();
        if (result.success) {
            closeModal(buttonElement);
            showSuccessMessage('User role updated successfully');
            currentPage = 1;
            allUsers = [];
            await loadUsers(1, false);
        }
    } catch (error) {
        console.error('Error changing user role:', error);
        showError('Failed to change user role: ' + error.message);
    }
}

async function deleteUser(userId) {
    try {
        const response = await fetch(`/api/all-users/delete?user_id=${userId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete user');
        }
        
        const result = await response.json();
        if (result.success) {
            showSuccessMessage('User deleted successfully');
            currentPage = 1;
            allUsers = [];
            await loadUsers(1, false);
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showError('Failed to delete user: ' + error.message);
    }
}

function closeModal(element) {
    const modal = element.closest('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    
    const container = document.querySelector('.main-content');
    container.insertBefore(successDiv, container.firstChild);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('.admin-controls')) {
        document.querySelectorAll('.admin-menu').forEach(menu => {
            menu.style.display = 'none';
        });
    }
});let currentPage = 1;
let isLoading = false;
let hasMoreUsers = true;
let allUsers = [];
let filteredUsers = [];
let isSearchMode = false;
let searchQuery = '';
let currentUserRole = 'GUEST';
let currentUserId = null;

const USERS_PER_PAGE = 20;

function showLoading() {
    document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

function showError(message) {
    const errorElement = document.getElementById('error-message');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 5000);
}

function showLoadingMore() {
    document.getElementById('loading-more').style.display = 'block';
    document.getElementById('load-more-container').style.display = 'none';
}

function hideLoadingMore() {
    document.getElementById('loading-more').style.display = 'none';
    if (hasMoreUsers && !isSearchMode) {
        document.getElementById('load-more-container').style.display = 'block';
    }
}

function createUserCard(user, index = 0) {
    const card = document.createElement('div');
    card.className = 'user-card';
    card.style.animationDelay = `${index * 0.1}s`;
    
    const memberSince = user.created_at ? 
        new Date(user.created_at.date || user.created_at).toLocaleDateString() : 'N/A';
    
    const userInitial = user.name ? user.name.charAt(0).toUpperCase() : '?';
    
    const avatarContent = user.profile_picture ? 
        `<img src="/api/profile/picture?id=${user.id}&v=${Date.now()}" alt="${user.name}" onerror="this.style.display='none'; this.parentElement.classList.add('no-image'); this.parentElement.setAttribute('data-initial', '${userInitial}');">` :
        '';
    
    const isCurrentUser = user.id === currentUserId;
    const showAdminControls = currentUserRole === 'ADMIN' && !isCurrentUser;
    
    const adminControlsHtml = showAdminControls ? `
        <div class="admin-controls">
            <button class="admin-menu-btn" onclick="toggleAdminMenu(${user.id})" title="Admin Actions">
                ⚙️
            </button>
            <div class="admin-menu" id="admin-menu-${user.id}">
                <button class="admin-action-btn change-role-btn" onclick="showRoleChangeModal(${user.id}, '${user.role}', '${escapeHtml(user.name)}')">
                    👑 Change Role
                </button>
                <button class="admin-action-btn delete-user-btn" onclick="confirmDeleteUser(${user.id}, '${escapeHtml(user.name)}')">
                    🗑️ Delete User
                </button>
            </div>
        </div>
    ` : '';
    
    card.innerHTML = `
        <div class="user-card-header">
            <div class="user-avatar ${!user.profile_picture ? 'no-image' : ''}" ${!user.profile_picture ? `data-initial="${userInitial}"` : ''}>
                ${avatarContent}
            </div>
            <h3 class="user-name">${escapeHtml(user.name)}</h3>
            ${isCurrentUser ? '<span class="current-user-badge">You</span>' : ''}
        </div>
        <div class="user-card-body">
            <span class="user-role role-${user.role.toLowerCase()}">${user.role}</span>
            <div class="user-info">
                <div class="user-info-item">
                    <span class="user-info-label">Email:</span>
                    <span class="user-info-value">${escapeHtml(user.email)}</span>
                </div>
                <div class="user-info-item">
                    <span class="user-info-label">Member Since:</span>
                    <span class="user-info-value">${memberSince}</span>
                </div>
            </div>
            ${adminControlsHtml}
        </div>
    `;
    
    card.addEventListener('click', (e) => {
        if (!e.target.closest('.admin-controls')) {
            window.location.href = `profile?id=${user.id}`;
        }
    });
    
    return card;
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

async function loadUsers(page = 1, append = false) {
    if (isLoading) return;
    
    try {
        isLoading = true;
        
        if (!append && page === 1) {
            showLoading();
        } else if (append) {
            showLoadingMore();
        }
        
        const response = await fetch(`/api/all-users?page=${page}&limit=${USERS_PER_PAGE}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const users = Object.values(data.users || {});
        
        if (data.current_user_role) {
            currentUserRole = data.current_user_role;
        }
        if (data.current_user_id) {
            currentUserId = data.current_user_id;
        }
        
        if (page === 1 && !append) {
            allUsers = users;
            displayUsers(users, false);
        } else {
            allUsers = [...allUsers, ...users];
            displayUsers(users, true);
        }
        
        hasMoreUsers = users.length === USERS_PER_PAGE;
        
        if (!hasMoreUsers && append) {
            showNoMoreUsers();
        }
        
    } catch (error) {
        console.error('Error loading users:', error);
        showError('Failed to load users: ' + error.message);
        
        if (page === 1 && !append) {
            displayEmptyState('Failed to load users', 'Please try again later');
        }
    } finally {
        isLoading = false;
        hideLoading();
        hideLoadingMore();
    }
}

function displayUsers(users, append = false) {
    const container = document.getElementById('users-grid');
    
    if (!append) {
        container.innerHTML = '';
    }
    
    if (users.length === 0 && !append) {
        displayEmptyState('No users found', 'There are no users to display');
        return;
    }
    
    users.forEach((user, index) => {
        const card = createUserCard(user, append ? 0 : index);
        container.appendChild(card);
    });
    
    updateLoadMoreButton();
}

function displayEmptyState(title, message) {
    const container = document.getElementById('users-grid');
    container.innerHTML = `
        <div class="no-results" style="grid-column: 1 / -1;">
            <div class="no-results-icon">👥</div>
            <h3>${title}</h3>
            <p>${message}</p>
        </div>
    `;
    document.getElementById('load-more-container').style.display = 'none';
}

function showNoMoreUsers() {
    const container = document.getElementById('users-grid');
    const noMoreDiv = document.createElement('div');
    noMoreDiv.className = 'no-more-users';
    noMoreDiv.style.gridColumn = '1 / -1';
    noMoreDiv.textContent = 'No more users to load';
    container.appendChild(noMoreDiv);
    document.getElementById('load-more-container').style.display = 'none';
}

function updateLoadMoreButton() {
    const loadMoreContainer = document.getElementById('load-more-container');
    
    if (hasMoreUsers && !isSearchMode) {
        loadMoreContainer.style.display = 'block';
    } else {
        loadMoreContainer.style.display = 'none';
    }
}

function setupSearch() {
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    
    let searchTimeout;
    
    function performSearch() {
        const query = searchInput.value.trim().toLowerCase();
        searchQuery = query;
        
        if (query === '') {
            isSearchMode = false;
            displayUsers(allUsers, false);
            currentPage = Math.ceil(allUsers.length / USERS_PER_PAGE);
            updateLoadMoreButton();
            return;
        }
        
        isSearchMode = true;
        filteredUsers = allUsers.filter(user => 
            user.name.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query) ||
            user.role.toLowerCase().includes(query)
        );
        
        displaySearchResults(filteredUsers, query);
    }
    
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(performSearch, 300);
    });
    
    searchButton.addEventListener('click', performSearch);
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            clearTimeout(searchTimeout);
            performSearch();
        }
    });
}

function displaySearchResults(users, query) {
    const container = document.getElementById('users-grid');
    
    if (users.length === 0) {
        container.innerHTML = `
            <div class="no-results" style="grid-column: 1 / -1;">
                <div class="no-results-icon">🔍</div>
                <h3>No users found</h3>
                <p>No users match your search for "${escapeHtml(query)}"</p>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="search-results-info" style="grid-column: 1 / -1;">
                Found ${users.length} user${users.length !== 1 ? 's' : ''} matching "${escapeHtml(query)}"
            </div>
        `;
        
        users.forEach((user, index) => {
            const card = createUserCard(user, index);
            container.appendChild(card);
        });
    }
    
    updateLoadMoreButton();
}

function setupInfiniteScroll() {
    let isNearBottom = false;
    
    function checkScrollPosition() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        
        const distanceFromBottom = documentHeight - (scrollTop + windowHeight);
        isNearBottom = distanceFromBottom < 500;
        
        if (isNearBottom && hasMoreUsers && !isLoading && !isSearchMode) {
            loadMoreUsers();
        }
    }
    
    let ticking = false;
    
    window.addEventListener('scroll', function() {
        if (!ticking) {
            requestAnimationFrame(function() {
                checkScrollPosition();
                ticking = false;
            });
            ticking = true;
        }
    });
}

function loadMoreUsers() {
    if (!hasMoreUsers || isLoading || isSearchMode) return;
    
    currentPage++;
    loadUsers(currentPage, true);
}

function setupLoadMoreButton() {
    const loadMoreBtn = document.getElementById('load-more-btn');
    
    loadMoreBtn.addEventListener('click', function() {
        loadMoreUsers();
    });
}

function initialize() {
    setupSearch();
    setupInfiniteScroll();
    setupLoadMoreButton();
    loadUsers(1, false);
}

document.addEventListener('DOMContentLoaded', initialize);