let currentUser = null;
let allLists = [];
let isViewingMeanings = false;
let currentListId = null;

document.addEventListener('DOMContentLoaded', function() {
    initializePage();
});

async function initializePage() {
    await loadCurrentUser();
    await loadAbbreviationLists();
}

async function loadCurrentUser() {
    try {
        const response = await fetch('/api/users/current');
        if (response.ok) {
            currentUser = await response.json();
        } else {
            const altResponse = await fetch('/api/profile');
            if (altResponse.ok) {
                currentUser = await altResponse.json();
            }
        }
    } catch (error) {
        console.warn('Could not load user info:', error);
    }
}

async function loadAbbreviationLists() {
    try {
        showLoading();
        const response = await fetch('/api/abbr-lists');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        allLists = await response.json();
        displayLists(allLists);
    } catch (error) {
        console.error('Error loading lists:', error);
        showError('Failed to load abbreviation lists');
    } finally {
        hideLoading();
    }
}

function displayLists(lists) {
    const container = document.getElementById('lists-content');
    
    if (!lists || lists.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <h3>No lists available</h3>
                <p>There are currently no abbreviation lists to display.</p>
            </div>
        `;
        return;
    }

    const filteredLists = getFilteredLists(lists);
    
    if (filteredLists.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔒</div>
                <h3>No accessible lists</h3>
                <p>You don't have access to any abbreviation lists at the moment.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    
    const grid = document.createElement('div');
    grid.className = 'lists-grid';
    
    filteredLists.forEach((list, index) => {
        const listCard = createListCard(list, index);
        grid.appendChild(listCard);
    });
    
    container.appendChild(grid);
}

function getFilteredLists(lists) {
    if (!currentUser) {
        return lists.filter(list => !list.private);
    }
    
    const userRole = currentUser.current_user_role || currentUser.role;
    const userId = currentUser.current_user_id || currentUser.id;
    
    if (userRole === 'ADMIN') {
        return lists;
    }
    
    if (userRole === 'MOD') {
        return lists.filter(list => 
            !list.private || 
            list.creator_id === userId ||
            (list.creator_role !== 'ADMIN')
        );
    }
    
    return lists.filter(list => 
        !list.private || list.creator_id === userId
    );
}

function createListCard(list, index) {
    const card = document.createElement('div');
    card.className = 'list-card';
    card.style.animationDelay = `${index * 0.1}s`;
    
    const createdDate = list.created_at ? 
        new Date(list.created_at.date || list.created_at).toLocaleDateString() : 'Unknown';
    
    const canEdit = canUserEditList(list);
    const canDelete = canUserDeleteList(list);
    
    let actionsHtml = `<button class="view-btn">View List</button>`;
    
    if (canEdit) {
        actionsHtml += `<button class="edit-btn">Edit</button>`;
    }
    
    if (canDelete) {
        actionsHtml += `<button class="delete-btn">Delete</button>`;
    }
    
    card.innerHTML = `
        <div class="list-header">
            <h3 class="list-name">${escapeHtml(list.name)}</h3>
            <div class="list-badges">
                <span class="privacy-badge">
                    ${list.private ? '🔒 Private' : '🌐 Public'}
                </span>
            </div>
        </div>
        <div class="list-body">
            <div class="list-info">
                <div class="info-item">
                    <span class="info-label">Creator:</span>
                    <span class="info-value">${escapeHtml(list.creator_name)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Meanings:</span>
                    <span class="info-value">${list.meanings_count || 0}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Created:</span>
                    <span class="info-value">${createdDate}</span>
                </div>
            </div>
        </div>
        <div class="list-actions">
            ${actionsHtml}
        </div>
    `;
    
    const viewBtn = card.querySelector('.view-btn');
    viewBtn.addEventListener('click', () => viewList(list.id));
    
    if (canEdit) {
        const editBtn = card.querySelector('.edit-btn');
        editBtn.addEventListener('click', () => editList(list));
    }
    
    if (canDelete) {
        const deleteBtn = card.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => deleteList(list.id, list.name));
    }
    
    return card;
}

function canUserEditList(list) {
    if (!currentUser) return false;
    
    const userRole = currentUser.current_user_role || currentUser.role;
    const userId = currentUser.current_user_id || currentUser.id;
    
    if (userRole === 'ADMIN') return true;
    
    if (userRole === 'MOD') {
        return list.creator_id === userId || (list.creator_role !== 'ADMIN');
    }
    
    return list.creator_id === userId;
}

function canUserDeleteList(list) {
    if (!currentUser) return false;
    
    const userRole = currentUser.current_user_role || currentUser.role;
    const userId = currentUser.current_user_id || currentUser.id;
    
    if (userRole === 'ADMIN') return true;
    
    if (userRole === 'MOD') {
        return list.creator_id === userId || (list.creator_role !== 'ADMIN');
    }
    
    return list.creator_id === userId;
}

async function viewList(listId) {
    try {
        showLoading();
        currentListId = listId;
        
        const response = await fetch(`/api/abbr-lists?id=${listId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const list = await response.json();
        displayListContents(list);
        isViewingMeanings = true;
        
    } catch (error) {
        console.error('Error loading list:', error);
        showError('Failed to load list contents');
    } finally {
        hideLoading();
    }
}

function displayListContents(list) {
    const container = document.getElementById('lists-content');
    
    container.innerHTML = `
        <div class="list-view">
            <div class="list-header-section">
                <button class="back-btn" id="backToListsBtn">
                    ← Back to Lists
                </button>
                <div class="list-title-section">
                    <h2>${escapeHtml(list.name)}</h2>
                    <span class="privacy-badge">
                        ${list.private ? '🔒 Private' : '🌐 Public'}
                    </span>
                </div>
                <div class="list-meta">
                    <span>Created by ${escapeHtml(list.creator_name)}</span>
                    <span>${list.meanings_count || 0} meanings</span>
                </div>
            </div>
            <div class="meanings-container" id="meaningsContainer">
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>Loading meanings...</p>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('backToListsBtn').addEventListener('click', goBackToLists);
    
    displayMeanings(list.meanings || []);
}

function displayMeanings(meanings) {
    const container = document.getElementById('meaningsContainer');
    
    if (!meanings || meanings.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <h3>No meanings in this list</h3>
                <p>This list doesn't contain any meanings yet.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    const grid = createMeaningsGrid(
        meanings,
        handleVote,
        false,
        canUserEditList(getCurrentList()) ? handleDeleteMeaning : null,
        canUserEditList(getCurrentList()) ? handleEditMeaning : null
    );
    
    // Add remove buttons if user can edit
    if (canUserEditList(getCurrentList())) {
        grid.querySelectorAll('.meaning-card').forEach((card, index) => {
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-from-list-btn';
            removeBtn.title = 'Remove from list';
            removeBtn.innerHTML = '✖';
            removeBtn.addEventListener('click', () => removeMeaningFromList(meanings[index].id));
            
            const header = card.querySelector('.meaning-header');
            if (header) {
                header.appendChild(removeBtn);
            }
        });
    }
    
    container.appendChild(grid);
}

function getCurrentList() {
    return allLists.find(list => list.id === currentListId) || {};
}

async function handleVote(event, meaningId, isUpvote) {
    event.preventDefault();
    event.stopPropagation();
    
    if (!currentUser) {
        showError('You must be logged in to vote');
        return;
    }
    
    const button = event.target;
    const meaningCard = button.closest('.meaning-card');
    const originalDisabled = button.disabled;
    
    button.disabled = true;
    
    try {
        await voteMeaning(event, meaningId, isUpvote);
        await refreshMeaning(meaningCard, meaningId);
        showSuccess(isUpvote ? 'Upvoted successfully!' : 'Downvoted successfully!');
    } catch (error) {
        console.error('Error voting:', error);
        showError('Failed to vote. Please try again.');
    } finally {
        button.disabled = originalDisabled;
    }
}

async function handleDeleteMeaning(btn, meaningId) {
    if (!confirm('Are you sure you want to delete this meaning? This action cannot be undone.')) {
        return;
    }

    try {
        await deleteMeaning(meaningId);
        showSuccess('Meaning deleted successfully');
        await viewList(currentListId);
    } catch (error) {
        console.error('Error deleting meaning:', error);
        showError('Failed to delete meaning: ' + error);
    }
}

async function handleEditMeaning(ev, meaningCard, meaning, submitHandler) {
    await openEditModal(ev, meaningCard, meaning, async (ev, meaningCard, meaning) => {
        try {
            const result = await submitEditModal(ev, meaning);
            if (result.success) {
                showSuccess('Meaning updated successfully');
                closeEditModal();
                await refreshMeaning(meaningCard, meaning.id);
            } else {
                showError(result.error || 'Failed to update meaning');
            }
        } catch (error) {
            console.error('Error updating meaning:', error);
            showError('Failed to update meaning');
        }
    });
}

async function removeMeaningFromList(meaningId) {
    if (!confirm('Are you sure you want to remove this meaning from the list?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/abbr-lists/entry?id=${currentListId}&meaning=${meaningId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        showSuccess('Meaning removed from list successfully');
        await viewList(currentListId);
        
    } catch (error) {
        console.error('Error removing meaning from list:', error);
        showError('Failed to remove meaning from list');
    }
}

function editList(list) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'edit-list-modal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Edit List</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <form id="edit-list-form">
                    <div class="form-group">
                        <label for="edit-list-name">List Name:</label>
                        <input type="text" id="edit-list-name" value="${escapeHtml(list.name)}" required>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="edit-list-private" ${list.private ? 'checked' : ''}>
                            Make this list private
                        </label>
                    </div>
                </form>
            </div>
            <div class="form-actions">
                <button type="button" class="cancel-btn">Cancel</button>
                <button type="submit" class="save-btn" form="edit-list-form">Save Changes</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.classList.add('active');
    
    const closeModal = () => {
        modal.remove();
    };
    
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.querySelector('.cancel-btn').addEventListener('click', closeModal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    modal.querySelector('#edit-list-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateList(list.id, closeModal);
    });
}

async function updateList(listId, closeModal) {
    const name = document.getElementById('edit-list-name').value.trim();
    const isPrivate = document.getElementById('edit-list-private').checked;
    
    if (!name) {
        showError('List name is required');
        return;
    }
    
    try {
        const response = await fetch(`/api/abbr-lists?id=${listId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                private: isPrivate
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update list');
        }
        
        showSuccess('List updated successfully');
        closeModal();
        await loadAbbreviationLists();
        
    } catch (error) {
        console.error('Error updating list:', error);
        showError('Failed to update list: ' + error.message);
    }
}

async function deleteList(listId, listName) {
    if (!confirm(`Are you sure you want to delete the list "${listName}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/abbr-lists?id=${listId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete list');
        }
        
        showSuccess('List deleted successfully');
        
        if (isViewingMeanings && currentListId === listId) {
            goBackToLists();
        } else {
            await loadAbbreviationLists();
        }
        
    } catch (error) {
        console.error('Error deleting list:', error);
        showError('Failed to delete list: ' + error.message);
    }
}

function goBackToLists() {
    isViewingMeanings = false;
    currentListId = null;
    displayLists(allLists);
}

function showLoading() {
    const container = document.getElementById('lists-content');
    container.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Loading...</p>
        </div>
    `;
}

function hideLoading() {
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}