let allUsers = [];
let filteredUsers = [];
let currentPage = 1;
let hasMoreUsers = true;
let isLoading = false;
let currentUserRole = 'GUEST';
let currentUserId = null;
let isSearchMode = false;
let searchQuery = '';

const USERS_PER_PAGE = 20;

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

function showLoading() {
    const container = document.getElementById('users-grid');
    container.innerHTML = `
        <div class="loading-container" style="grid-column: 1 / -1;">
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Loading users...</p>
            </div>
        </div>
    `;
}

function showLoadingMore() {
    const loadMoreBtn = document.getElementById('load-more-btn');
    const loadingText = document.getElementById('loading-text');
    
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    if (loadingText) loadingText.style.display = 'block';
}

function hideLoading() {
    const loadingContainer = document.querySelector('.loading-container');
    if (loadingContainer) {
        loadingContainer.remove();
    }
}

function hideLoadingMore() {
    const loadMoreBtn = document.getElementById('load-more-btn');
    const loadingText = document.getElementById('loading-text');
    
    if (loadingText) loadingText.style.display = 'none';
    if (loadMoreBtn && hasMoreUsers && !isSearchMode) {
        loadMoreBtn.style.display = 'block';
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
    }

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

        allUsers = allUsers.filter(user => user.id !== userId);
        
        if (isSearchMode) {
            filteredUsers = filteredUsers.filter(user => user.id !== userId);
            displaySearchResults(filteredUsers, searchQuery);
        } else {
            displayUsers(allUsers, false);
        }

        showError('User deleted successfully');
        
    } catch (error) {
        console.error('Error deleting user:', error);
        showError('Failed to delete user: ' + error.message);
    }
}

function openRoleModal(userId, currentRole, userName) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'role-modal';
    
    modal.innerHTML = `
        <div class="role-modal">
            <div class="modal-header">
                <h3>Change Role for ${userName}</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <p>Select a new role for this user:</p>
                <div class="role-options">
                    <button class="role-btn ${currentRole === 'USER' ? 'active' : ''}" onclick="changeUserRole(${userId}, 'USER')">
                        👤 USER
                    </button>
                    <button class="role-btn ${currentRole === 'MOD' ? 'active' : ''}" onclick="changeUserRole(${userId}, 'MOD')">
                        🛡️ MODERATOR
                    </button>
                    <button class="role-btn ${currentRole === 'ADMIN' ? 'active' : ''}" onclick="changeUserRole(${userId}, 'ADMIN')">
                        👑 ADMIN
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
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

        const userIndex = allUsers.findIndex(user => user.id === userId);
        if (userIndex !== -1) {
            allUsers[userIndex].role = newRole;
        }

        if (isSearchMode) {
            const filteredIndex = filteredUsers.findIndex(user => user.id === userId);
            if (filteredIndex !== -1) {
                filteredUsers[filteredIndex].role = newRole;
            }
            displaySearchResults(filteredUsers, searchQuery);
        } else {
            displayUsers(allUsers, false);
        }

        closeModal();
        showError('User role updated successfully');
        
    } catch (error) {
        console.error('Error changing user role:', error);
        showError('Failed to change user role: ' + error.message);
    }
}

function createUserCard(user, index) {
    const card = document.createElement('div');
    card.className = 'user-card';
    card.style.animationDelay = `${index * 0.1}s`;
    
    const isCurrentUser = currentUserId && user.id == currentUserId;
    const canModify = currentUserRole === 'ADMIN' && !isCurrentUser;
    
    let adminControlsHtml = '';
    if (canModify) {
        adminControlsHtml = `
            <div class="admin-controls">
                <button class="change-role-btn" onclick="openRoleModal(${user.id}, '${user.role}', '${escapeHtml(user.name)}'); event.stopPropagation();">
                    Change Role
                </button>
                <button class="delete-user-btn" onclick="deleteUser(${user.id}); event.stopPropagation();">
                    Delete User
                </button>
            </div>
        `;
    }
    
    const userInitial = user.name ? user.name.charAt(0).toUpperCase() : 'U';
    
    let avatarContent = '';
    if (user.profile_picture) {
        avatarContent = `<img src="/api/profile/picture?id=${user.id}" alt="${escapeHtml(user.name)}" onerror="this.style.display='none'; this.parentElement.setAttribute('data-initial', '${userInitial}'); this.parentElement.classList.add('no-image');">`;
    }
    
    let memberSince = 'Unknown';
    if (user.created_at) {
        try {
            const date = new Date(user.created_at);
            memberSince = date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long',
                day: 'numeric'
            });
        } catch (e) {
            memberSince = 'Unknown';
        }
    }
    
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
    
    // Apply styles directly to the buttons after creating the card
    if (canModify) {
        setTimeout(() => {
            const changeRoleBtn = card.querySelector('.change-role-btn');
            const deleteBtn = card.querySelector('.delete-user-btn');
            
            if (changeRoleBtn) {
                changeRoleBtn.style.cssText = `
                    flex: 1;
                    padding: 10px 12px;
                    background: linear-gradient(135deg, #4caf50, #45a049);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    cursor: pointer;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    transition: all 0.3s ease;
                `;
                
                changeRoleBtn.addEventListener('mouseenter', function() {
                    this.style.background = 'linear-gradient(135deg, #45a049, #3d8b40)';
                    this.style.transform = 'translateY(-2px)';
                    this.style.boxShadow = '0 4px 15px rgba(76, 175, 80, 0.3)';
                });
                
                changeRoleBtn.addEventListener('mouseleave', function() {
                    this.style.background = 'linear-gradient(135deg, #4caf50, #45a049)';
                    this.style.transform = 'translateY(0)';
                    this.style.boxShadow = 'none';
                });
            }
            
            if (deleteBtn) {
                deleteBtn.style.cssText = `
                    flex: 1;
                    padding: 10px 12px;
                    background: linear-gradient(135deg, #dc3545, #c82333);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    cursor: pointer;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    transition: all 0.3s ease;
                `;
                
                deleteBtn.addEventListener('mouseenter', function() {
                    this.style.background = 'linear-gradient(135deg, #c82333, #bd2130)';
                    this.style.transform = 'translateY(-2px)';
                    this.style.boxShadow = '0 4px 15px rgba(220, 53, 69, 0.3)';
                });
                
                deleteBtn.addEventListener('mouseleave', function() {
                    this.style.background = 'linear-gradient(135deg, #dc3545, #c82333)';
                    this.style.transform = 'translateY(0)';
                    this.style.boxShadow = 'none';
                });
            }
        }, 0);
    }
    
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

async function searchUsers(query, page = 1) {
    if (isLoading) return;
    
    try {
        isLoading = true;
        showLoading();
        
        const response = await fetch(`/api/all-users/search?query=${encodeURIComponent(query)}&page=${page}&limit=1000`, {
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
        
        filteredUsers = users;
        displaySearchResults(users, query);
        
    } catch (error) {
        console.error('Error searching users:', error);
        
        filteredUsers = allUsers.filter(user => 
            user.name.toLowerCase().includes(query.toLowerCase()) ||
            user.email.toLowerCase().includes(query.toLowerCase()) ||
            user.role.toLowerCase().includes(query.toLowerCase())
        );
        
        displaySearchResults(filteredUsers, query);
    } finally {
        isLoading = false;
        hideLoading();
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
    
    async function performSearch() {
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
        await searchUsers(query);
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