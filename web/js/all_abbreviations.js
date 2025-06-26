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
    setupCreateListModal(); 
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
    
    const createdDate = new Date(list.created_at.date).toLocaleDateString();
    
    const updatedDate = new Date(list.updated_at.date).toLocaleDateString();
    
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
                    <span class="info-value"><a href="/profile?id=${list.creator_id}">${escapeHtml(list.creator_name)}</a></span>
                </div>
                <div class="info-item">
                    <span class="info-label">Meanings:</span>
                    <span class="info-value">${list.meanings_count}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Created:</span>
                    <span class="info-value">${createdDate}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Updated:</span>
                    <span class="info-value">${updatedDate}</span>
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
                    <span>Created by <a href="/profile?id=${list.creator_id}">${escapeHtml(list.creator_name)}</a></span>
                    <span>${list.meanings_count} meanings</span>
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
        canUserEditList(getCurrentList()) ? submitHandler : null,
        true
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

async function submitHandler(ev, meaningCard, meaning) {
    try
    {
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
function displayListContents(list) {
    const container = document.getElementById('lists-content');
    
    // Check if user can add meanings to this list
    const canAddMeanings = canUserAddMeanings(list);
    
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
                    <span>Created by <a href="/profile?id=${list.creator_id}">${escapeHtml(list.creator_name)}</a></span>
                    <span>${list.meanings_count} meanings</span>
                </div>
                ${canAddMeanings ? `
                <div class="list-actions-section">
                    <button class="add-meanings-btn" id="addMeaningsBtn">+ Add Meanings</button>
                </div>
                ` : ''}
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
    
    if (canAddMeanings) {
        const addMeaningsBtn = document.getElementById('addMeaningsBtn');
        if (addMeaningsBtn) {
            addMeaningsBtn.addEventListener('click', () => openAddMeaningsModal(list.id));
        }
    }
    
    displayMeanings(list.meanings || []);
}

function canUserAddMeanings(list) {
    if (!currentUser) return false;
    
    const userRole = currentUser.current_user_role || currentUser.role;
    const userId = currentUser.current_user_id || currentUser.id;
    
    // Admin and Mod can add to any list
    if (userRole === 'ADMIN' || userRole === 'MOD') return true;
    
    // Regular users can only add to their own lists
    return list.creator_id === userId;
}

function openAddMeaningsModal(listId) {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.id = 'add-meanings-modal';
    
    const modal = document.createElement('div');
    modal.className = 'modal-content add-meanings-modal-content';
    
    modal.innerHTML = `
        <div class="modal-header">
            <h2 class="modal-title">Add Meanings to List</h2>
            <button class="modal-close" id="closeMeaningsModal">&times;</button>
        </div>
        <div class="modal-body">
            <div class="search-section">
                <div class="search-box">
                    <input type="text" class="search-input" id="meaningsSearch" placeholder="Search for meanings to add...">
                </div>
            </div>
            <div id="meaningsSearchResults" class="search-results">
                <div class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <h3>Search for meanings</h3>
                    <p>Type in the search box above to find meanings to add to your list.</p>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn-secondary" id="cancelAddMeanings">Cancel</button>
            <button type="button" class="btn-primary" id="addSelectedMeanings" disabled>Add Selected</button>
        </div>
    `;
    
    modalOverlay.appendChild(modal);
    document.body.appendChild(modalOverlay);
    
    setupAddMeaningsModal(listId, modalOverlay);
}

function setupAddMeaningsModal(listId, modalOverlay) {
    const modal = modalOverlay.querySelector('.modal-content');
    const searchInput = modal.querySelector('#meaningsSearch');
    const searchResults = modal.querySelector('#meaningsSearchResults');
    const addSelectedBtn = modal.querySelector('#addSelectedMeanings');
    const cancelBtn = modal.querySelector('#cancelAddMeanings');
    const closeBtn = modal.querySelector('#closeMeaningsModal');
    
    let selectedMeanings = [];
    let searchTimeout;
    
    const closeModal = () => {
        modalOverlay.remove();
    };
    
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
    
    searchInput.addEventListener('input', function() {
        const query = this.value.trim();
        
        clearTimeout(searchTimeout);
        
        if (query.length < 2) {
            searchResults.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <h3>Search for meanings</h3>
                    <p>Type at least 2 characters to search.</p>
                </div>
            `;
            return;
        }
        
        searchTimeout = setTimeout(() => {
            searchForMeanings(query, listId, searchResults);
        }, 300);
    });
    
    // Add selected meanings
    addSelectedBtn.addEventListener('click', async () => {
        if (selectedMeanings.length === 0) return;
        
        try {
            addSelectedBtn.disabled = true;
            addSelectedBtn.textContent = 'Adding...';
            
            for (const meaningId of selectedMeanings) {
                await addMeaningToList(meaningId, listId);
            }
            
            showSuccess(`Added ${selectedMeanings.length} meaning(s) to the list successfully`);
            closeModal();
            
            await viewList(listId);
            
        } catch (error) {
            console.error('Error adding meanings to list:', error);
            showError('Failed to add meanings to list');
            addSelectedBtn.disabled = false;
            addSelectedBtn.textContent = 'Add Selected';
        }
    });
    
    searchInput.focus();
    
    window.updateSelectedMeanings = function(meaningId, isSelected) {
        if (isSelected) {
            if (!selectedMeanings.includes(meaningId)) {
                selectedMeanings.push(meaningId);
            }
        } else {
            selectedMeanings = selectedMeanings.filter(id => id !== meaningId);
        }
        
        addSelectedBtn.disabled = selectedMeanings.length === 0;
        addSelectedBtn.textContent = selectedMeanings.length > 0 
            ? `Add Selected (${selectedMeanings.length})` 
            : 'Add Selected';
    };
}

async function searchForMeanings(query, listId, resultsContainer) {
    try {
        resultsContainer.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Searching meanings...</p>
            </div>
        `;
        
        const response = await fetch(`/api/abbreviations/search?q=${encodeURIComponent(query)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const meanings = await response.json();
        
        // Get current list contents to filter out already added meanings
        const listResponse = await fetch(`/api/abbr-lists?id=${listId}`);
        const currentList = listResponse.ok ? await listResponse.json() : { meanings: [] };
        const currentMeaningIds = (currentList.meanings || []).map(m => m.id);
        
        displaySearchResults(meanings, currentMeaningIds, resultsContainer);
        
    } catch (error) {
        console.error('Error searching meanings:', error);
        resultsContainer.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <h3>Search failed</h3>
                <p>Failed to search meanings. Please try again.</p>
            </div>
        `;
    }
}

function displaySearchResults(meanings, excludeIds, container) {
    if (!meanings || meanings.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <h3>No meanings found</h3>
                <p>No meanings match your search query.</p>
            </div>
        `;
        return;
    }
    
    const availableMeanings = meanings.filter(meaning => !excludeIds.includes(meaning.id));
    
    if (availableMeanings.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">✅</div>
                <h3>All meanings already in list</h3>
                <p>All found meanings are already in this list.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    const resultsGrid = document.createElement('div');
    resultsGrid.className = 'search-results-grid';
    
    availableMeanings.forEach(meaning => {
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item';
        
        resultItem.innerHTML = `
            <div class="search-result-header">
                <div class="result-checkbox-container">
                    <input type="checkbox" class="result-checkbox" data-meaning-id="${meaning.id}">
                </div>
                <div class="result-content">
                    <div class="result-abbreviation">${escapeHtml(meaning.name)}</div>
                    <div class="result-expansion">${escapeHtml(meaning.short_expansion)}</div>
                    <div class="result-meta">
                        <span class="result-lang">${escapeHtml(meaning.lang)}</span>
                        <span class="result-domain">${escapeHtml(meaning.domain)}</span>
                        <span class="result-score">Score: ${meaning.score || 0}</span>
                    </div>
                </div>
            </div>
        `;
        
        const checkbox = resultItem.querySelector('.result-checkbox');
        checkbox.addEventListener('change', function() {
            window.updateSelectedMeanings(meaning.id, this.checked);
        });
        
        resultItem.addEventListener('click', function(e) {
            if (e.target.type !== 'checkbox') {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            }
        });
        
        resultsGrid.appendChild(resultItem);
    });
    
    container.appendChild(resultsGrid);
}

async function addMeaningToList(meaningId, listId) {
    const response = await fetch(`/api/abbr-lists/entry?id=${listId}&meaning=${meaningId}`, {
        method: 'POST',
        credentials: 'include'
    });
    
    if (!response.ok) {
        let errorMessage = 'Failed to add meaning to list';
        try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.err_msg || errorMessage;
        } catch (e) {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
    }
    
    return response.json();
}
function setupCreateListModal() {
    const createBtn = document.getElementById('createNewListBtn');
    const modal = document.getElementById('createModal');
    const closeBtn = document.getElementById('closeCreateModalBtn');
    const cancelBtn = document.getElementById('cancelCreateBtn');
    const form = document.getElementById('createListForm');

    if (createBtn) {
        createBtn.addEventListener('click', openCreateModal);
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeCreateModal);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeCreateModal);
    }

    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeCreateModal();
            }
        });
    }

    if (form) {
        form.addEventListener('submit', handleCreateList);
    }
}

function openCreateModal() {
    const modal = document.getElementById('createModal');
    if (modal) {
        modal.classList.add('active');
        const input = document.getElementById('listName');
        if (input) {
            input.focus();
        }
    }
}

function closeCreateModal() {
    const modal = document.getElementById('createModal');
    if (modal) {
        modal.classList.remove('active');
        const form = document.getElementById('createListForm');
        if (form) {
            form.reset();
        }
    }
}

async function handleCreateList(e) {
    e.preventDefault();
    
    const name = document.getElementById('listName').value.trim();
    const isPrivate = document.getElementById('isPrivate').checked;

    if (!name) {
        showError('Please enter a list name');
        return;
    }

    const submitBtn = e.target.querySelector('.btn-primary');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating...';
    submitBtn.disabled = true;

    try {
        const privateValue = isPrivate ? 'true' : 'false';

        const response = await fetch(`/api/abbr-lists?name=${encodeURIComponent(name)}&private=${privateValue}`, {
            method: 'POST'
        });

        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const errorData = await response.json();
                throw new Error(errorData.err_msg || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            } else {
                const text = await response.text();
                throw new Error(text || `HTTP ${response.status}: ${response.statusText}`);
            }
        }

        closeCreateModal();
        showSuccess('List created successfully');
        await loadAbbreviationLists();

    } catch (error) {
        console.error('Error creating list:', error);
        let errorMessage = 'Failed to create list';
        if (error && typeof error === 'object') {
            errorMessage = error.err_msg || error.message || errorMessage;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        showError(errorMessage);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}