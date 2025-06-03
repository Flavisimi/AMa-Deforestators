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

function loadAbbreviationLists() {
    const content = document.getElementById('lists-content');
    content.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Loading lists...</p>
        </div>
    `;

    fetch('/abbr-lists')
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

function viewList(listId) {
     window.location.href = `viewlist.html?id=${listId}`;
}

document.addEventListener('DOMContentLoaded', function() {
    loadAbbreviationLists();
});

document.getElementById('createModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeCreateModal();
    }
});