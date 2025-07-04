let currentUser = null;
let targetUserId = null;

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
}

async function loadCurrentUser() {
    currentUser = await GLOBAL_USER;
}

function updateUserInterface() {
    const username = document.querySelector('.username');
    const avatar = document.querySelector('.avatar');
    
    if (currentUser && currentUser.name) {
        username.textContent = escapeHtml(currentUser.name);
        if (currentUser.profile_picture) {
            avatar.style.backgroundImage = `url(${currentUser.profile_picture})`;
            avatar.style.backgroundSize = 'cover';
            avatar.style.backgroundPosition = 'center';
        }
    }
}

async function loadUserContributions()
{
    await loadMeaningsByUploaderId(targetUserId)
    .then(data => {
        if (data.success) {
            displayContributions(data.contributions);
        } else {
            showError(data.error || 'Failed to load contributions');
        }
    })
    .catch(error => {
        console.error('Error loading contributions:', error);
        showError('Failed to load contributions');
    })
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

    const meanings = Object.values(contributions);

    container.innerHTML = '';
    const grid = createMeaningsGrid(meanings, handleVote, true, handleDelete, handleSubmit, true);
    container.appendChild(grid);
}

async function handleSubmit(ev, meaningCard, meaning)
{
    await submitEditModal(ev, meaning)
    .then(result => {
        if (result.success) {
            showSuccess('Meaning updated successfully');
            closeEditModal();
            refreshMeaning(meaningCard, meaning.id);
        } else {
            showError(result.error || 'Failed to update meaning');
        }
    })
    .catch(error => {
        console.error('Error updating meaning:', error);
        showError('Failed to update meaning');
    });
}

async function handleDelete(btn, id)
{
    if (!confirm('Are you sure you want to delete this meaning? This action cannot be undone.')) {
        return;
    }

    await deleteMeaning(id)
    .then(() => {showSuccess('Meaning deleted successfully'); loadUserContributions();})
    .catch(error => {
        console.error('Error deleting meaning:', error);
        showError('Failed to delete meaning: ' + error);
    });
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

async function handleVote(event, meaningId, isUpvote)
{
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
    
    await voteMeaning(event, meaningId, isUpvote)
    .then(() => refreshMeaning(button.closest(".meaning-card"), meaningId))
    .then(() => showSuccess(isUpvote ? 'Upvoted successfully!' : 'Downvoted successfully!'))
    .catch(error => {
        console.error('Error voting:', error);
        showError('Failed to vote. Please try again.');
    }).finally(() => {
        button.disabled = false;
        button.textContent = originalText;
    });
}

function showSuccess(message) {
    const successDiv = document.getElementById('success-message');
    if (successDiv) {
        successDiv.textContent = escapeHtml(message);
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
        errorDiv.textContent = escapeHtml(message);
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