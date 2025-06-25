let currentUser = null;
let targetUserId = null;
let editingMeaningId = null;

document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    attachEventListeners();
});

async function initializePage() {
    const urlParams = new URLSearchParams(window.location.search);
    targetUserId = urlParams.get('user_id');
    
    if (!targetUserId) {
        showError('User ID not provided');
        return;
    }
    
    await loadCurrentUser();
    await loadUserContributions();
}

function attachEventListeners() {
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            window.location.href = `profile?id=${targetUserId}`;
        });
    }
    
    const closeEditModalBtn = document.getElementById('closeEditModal');
    if (closeEditModalBtn) {
        closeEditModalBtn.addEventListener('click', closeEditModal);
    }
    
    const cancelEdit = document.getElementById('cancelEdit');
    if (cancelEdit) {
        cancelEdit.addEventListener('click', closeEditModal);
    }
    
    const editForm = document.getElementById('editForm');
    if (editForm) {
        editForm.addEventListener('submit', handleEditSubmit);
    }
    
    const editModal = document.getElementById('editModal');
    if (editModal) {
        editModal.addEventListener('click', function(e) {
            if (e.target === editModal) {
                closeEditModal();
            }
        });
    }
}

async function loadCurrentUser() {
    try {
        const response = await fetch('/api/profile');
        if (response.ok) {
            const userData = await response.json();
            currentUser = userData;
            updateUserInterface();
            console.log('Current user loaded:', currentUser);
        } else {
            currentUser = null;
        }
    } catch (error) {
        console.error('Error loading current user:', error);
        currentUser = null;
    }
}

function updateUserInterface() {
    const username = document.querySelector('.username');
    const avatar = document.querySelector('.avatar');
    
    if (currentUser && currentUser.name) {
        username.textContent = currentUser.name;
        if (currentUser.profile_picture) {
            avatar.style.backgroundImage = `url(${currentUser.profile_picture})`;
            avatar.style.backgroundSize = 'cover';
            avatar.style.backgroundPosition = 'center';
        }
    }
}

async function loadUserContributions() {
    try {
        const response = await fetch(`/api/contributions?user_id=${targetUserId}`);
        const data = await response.json();
        
        if (data.success) {
            displayContributions(data.contributions);
        } else {
            showError(data.error || 'Failed to load contributions');
        }
    } catch (error) {
        console.error('Error loading contributions:', error);
        showError('Failed to load contributions');
    }
}

function displayContributions(contributions) {
    const container = document.getElementById('contributions-content');
    
    if (!contributions || contributions.length === 0) {
        container.innerHTML = `
            <div class="no-contributions">
                <h3>No Contributions Found</h3>
                <p>This user didn't create any meanings yet.</p>
            </div>
        `;
        return;
    }
    
    const contributionsGrid = document.createElement('div');
    contributionsGrid.className = 'contributions-grid';
    
    contributions.forEach(contribution => {
        const card = createContributionCard(contribution);
        contributionsGrid.appendChild(card);
    });
    
    container.innerHTML = '';
    container.appendChild(contributionsGrid);
}

function createContributionCard(contribution) {
    const card = document.createElement('div');
    card.className = 'contribution-card';
    
    let canEdit = false;
    if (currentUser) {
        const userRole = currentUser.role || currentUser.current_user_role || null;
        canEdit = (userRole === 'ADMIN' || userRole === 'MOD');
    }
    
    console.log('Creating card for contribution:', contribution.id, 'Can edit:', canEdit, 'User role:', currentUser?.role);
    
    const upvoteClass = contribution.user_vote === 1 ? 'vote-btn upvote-btn active' : 'vote-btn upvote-btn';
    const downvoteClass = contribution.user_vote === -1 ? 'vote-btn downvote-btn active' : 'vote-btn downvote-btn';
    
    let actionsHtml = '';
    if (canEdit) {
        actionsHtml = `
            <div class="contribution-actions">
                <button class="action-btn edit-btn" onclick="openEditModal(${contribution.id}, '${escapeHtml(contribution.name)}', '${escapeHtml(contribution.lang)}', '${escapeHtml(contribution.domain)}', '${escapeHtml(contribution.short_expansion)}')">
                    ✏️ Edit
                </button>
                <button class="action-btn delete-btn" onclick="deleteMeaning(${contribution.id})">
                    🗑️ Delete
                </button>
            </div>
        `;
    }
    
    card.innerHTML = `
        <div class="contribution-header">
            <h4>${escapeHtml(contribution.name)}</h4>
            <span class="status-badge status-${contribution.approval_status.toLowerCase()}">${contribution.approval_status}</span>
        </div>
        <div class="contribution-body">
            <div class="contribution-expansion">${escapeHtml(contribution.short_expansion)}</div>
            <div class="contribution-description">${escapeHtml(contribution.description || '')}</div>
            <div class="contribution-meta">
                <div class="meta-item">
                    <strong>Language:</strong>
                    <span>${escapeHtml(contribution.lang)}</span>
                </div>
                <div class="meta-item">
                    <strong>Domain:</strong>
                    <span>${escapeHtml(contribution.domain)}</span>
                </div>
                <div class="meta-item vote-section">
                    <strong>Score:</strong>
                    <span class="score-display">${contribution.score || 0}</span>
                    <div class="vote-buttons">
                        <button class="${upvoteClass}" onclick="vote(event, ${contribution.id}, true)">
                            👍 Upvote
                        </button>
                        <button class="${downvoteClass}" onclick="vote(event, ${contribution.id}, false)">
                            👎 Downvote
                        </button>
                    </div>
                </div>
                <div class="meta-item">
                    <strong>Created:</strong>
                    <span>${formatDate(contribution.created_at)}</span>
                </div>
            </div>
        </div>
        ${actionsHtml}
    `;
    
    return card;
}

function openEditModal(meaningId, name, lang, domain, shortExpansion) {
    editingMeaningId = meaningId;
    
    document.getElementById('editName').value = name;
    document.getElementById('editLang').value = lang;
    document.getElementById('editDomain').value = domain;
    document.getElementById('editExpansion').value = shortExpansion;
    
    document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    editingMeaningId = null;
    document.getElementById('editForm').reset();
}

async function handleEditSubmit(e) {
    e.preventDefault();
    
    if (!editingMeaningId) {
        showError('No meaning selected for editing');
        return;
    }
    
    const formData = new FormData(e.target);
    const data = {
        meaning_id: editingMeaningId,
        name: formData.get('name').trim(),
        lang: formData.get('lang').trim(),
        domain: formData.get('domain').trim(),
        short_expansion: formData.get('short_expansion').trim()
    };
    
    if (!data.name || !data.lang || !data.domain || !data.short_expansion) {
        showError('All fields are required');
        return;
    }
    
    try {
        const response = await fetch('/api/contributions/update', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Meaning updated successfully');
            closeEditModal();
            loadUserContributions();
        } else {
            showError(result.error || 'Failed to update meaning');
        }
    } catch (error) {
        console.error('Error updating meaning:', error);
        showError('Failed to update meaning');
    }
}

async function deleteMeaning(meaningId) {
    if (!confirm('Are you sure you want to delete this meaning? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/contributions/delete?meaning_id=${meaningId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Meaning deleted successfully');
            loadUserContributions();
        } else {
            showError(result.error || 'Failed to delete meaning');
        }
    } catch (error) {
        console.error('Error deleting meaning:', error);
        showError('Failed to delete meaning');
    }
}

function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        return 'Unknown';
    }
}

async function vote(event, meaningId, isUpvote) {
    event.preventDefault();
    event.stopPropagation();
    
    if (!currentUser) {
        showError('You must be logged in to vote');
        return;
    }
    
    const button = event.target;
    const originalText = button.textContent;
    
    button.disabled = true;
    button.textContent = isUpvote ? '👍 Voting...' : '👎 Voting...';
    
    try {
        const endpoint = isUpvote ? 'upvote' : 'downvote';
        const response = await fetch(`/meanings/${endpoint}?id=${meaningId}`, {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            await loadUserContributions();
            showSuccess(isUpvote ? 'Upvoted successfully!' : 'Downvoted successfully!');
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to vote');
        }
    } catch (error) {
        console.error('Error voting:', error);
        showError('Failed to vote. Please try again.');
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}

function showSuccess(message) {
    const successDiv = document.getElementById('success-message');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 3000);
    }
    
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
    
    const successDiv = document.getElementById('success-message');
    if (successDiv) {
        successDiv.style.display = 'none';
    }
}