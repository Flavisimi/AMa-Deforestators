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

function openCreateModal() {
    document.getElementById('createModal').classList.add('active');
}

function closeCreateModal() {
    document.getElementById('createModal').classList.remove('active');
    document.getElementById('createListForm').reset();
}

function loadAbbreviationLists() {
    const content = document.getElementById('lists-content');
    content.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Loading your lists...</p>
        </div>
    `;

    fetch('/abbr-lists/mine')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            displayAbbreviationLists(data);
        })
        .catch(error => {
            console.error('Error loading lists:', error);
            content.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚠️</div>
                    <h3>Failed to load lists</h3>
                    <p>${error.message}</p>
                    <button onclick="loadAbbreviationLists()" class="btn-primary" style="margin-top: 20px;">Retry</button>
                </div>
            `;
        });
}

function displayAbbreviationLists(data) {
    const content = document.getElementById('lists-content');
    const lists = Object.values(data || {});

    if (lists.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <h3>No lists yet</h3>
                <p>Create your first abbreviation list to get started!</p>
            </div>
        `;
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'lists-grid';

    lists.forEach(list => {
        const listCard = createListCard(list);
        grid.appendChild(listCard);
    });

    content.innerHTML = '';
    content.appendChild(grid);
}

function createListCard(list) {
    const card = document.createElement('div');
    card.className = 'list-card';

    const createdDate = list.created_at ? 
        new Date(list.created_at.date || list.created_at).toLocaleDateString() : 'N/A';
    const updatedDate = list.updated_at ? 
        new Date(list.updated_at.date || list.updated_at).toLocaleDateString() : 'N/A';

    // Escape quotes in list name to prevent XSS and onclick issues
    const escapedName = list.name.replace(/'/g, "\\'").replace(/"/g, '\\"');

    card.innerHTML = `
        <div class="list-header">
            <h3 class="list-name">${list.name}</h3>
            <span class="privacy-badge">${list.private ? 'Private' : 'Public'}</span>
        </div>
        <div class="list-body">
            <div class="list-meta">
                <span>Created: ${createdDate}</span>
                <span>Updated: ${updatedDate}</span>
            </div>
            <div class="list-actions">
                <button class="view-btn" onclick="viewList(${list.id})">View List</button>
                <button class="delete-btn" onclick="deleteList(${list.id}, '${escapedName}')">Delete</button>
            </div>
        </div>
    `;

    return card;
}

document.getElementById('createListForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const name = document.getElementById('listName').value.trim();
    const isPrivate = document.getElementById('isPrivate').checked;

    if (!name) {
        alert('Please enter a list name');
        return;
    }

    const submitBtn = this.querySelector('.btn-primary');
    submitBtn.textContent = 'Creating...';
    submitBtn.disabled = true;

    // Convert boolean to string that PHP can understand
    const privateValue = isPrivate ? 'true' : 'false';

    // Server expects query parameters for POST
    fetch(`/abbr-lists?name=${encodeURIComponent(name)}&private=${privateValue}`, {
        method: 'POST'
    })
    .then(response => {
        if (!response.ok) {
            // Handle cases where response might not be JSON
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return response.json().then(err => Promise.reject(err));
            } else {
                return response.text().then(text => 
                    Promise.reject({ message: text || `HTTP ${response.status}: ${response.statusText}` })
                );
            }
        }
        
        // Check if response has content before parsing JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return response.json();
        } else {
            return {}; // Return empty object if no JSON content
        }
    })
    .then(data => {
        closeCreateModal();
        loadAbbreviationLists();
    })
    .catch(error => {
        console.error('Error creating list:', error);
        // Better error message display
        let errorMessage = 'Failed to create list';
        if (error && typeof error === 'object') {
            errorMessage = error.err_msg || error.message || errorMessage;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        alert(errorMessage);
    })
    .finally(() => {
        submitBtn.textContent = 'Create List';
        submitBtn.disabled = false;
    });
});

function viewList(listId) {
     window.location.href = `../html/mylist.html?id=${listId}`;
}

function deleteList(listId, listName) {
    if (!confirm(`Are you sure you want to delete the list "${listName}"? This action cannot be undone.`)) {
        return;
    }

    // Server expects query parameter for DELETE
    fetch(`/abbr-lists?id=${listId}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (!response.ok) {
            // Handle different response types
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return response.json().then(err => Promise.reject(err));
            } else {
                return response.text().then(text => 
                    Promise.reject({ message: text || `HTTP ${response.status}: ${response.statusText}` })
                );
            }
        }
        
        // Successfully deleted
        loadAbbreviationLists();
    })
    .catch(error => {
        console.error('Error deleting list:', error);
        // Better error message display
        let errorMessage = 'Failed to delete list';
        if (error && typeof error === 'object') {
            errorMessage = error.err_msg || error.message || errorMessage;
            
            // Handle specific error cases
            if (error.status_code === 403 || errorMessage.includes('may not delete')) {
                errorMessage = 'You can only delete your own lists.';
            } else if (error.status_code === 400 && errorMessage.includes('Missing ID')) {
                errorMessage = 'Invalid list ID provided.';
            }
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        
        alert(errorMessage);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    loadAbbreviationLists();
});

document.getElementById('createModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeCreateModal();
    }
});