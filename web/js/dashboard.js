document.querySelectorAll('.nav-button').forEach(button => {
    button.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        
        if (href === '#create') {
            e.preventDefault();
            window.location.href = '../html/create-abbreviation.html';
            return;
        }
        if (href === '#myabv') {
            e.preventDefault();
            window.location.href = '../html/my_abbreviations.html';
            return;
        }
        if (href === '#vote') {
            e.preventDefault();
            window.location.href = '../html/vote.html';
            return;
        }
        if (href === '#stats') {
            e.preventDefault();
            window.location.href = '../html/stats.html';
            return;
        }
        if (href.startsWith('#')) {
            e.preventDefault();
        }
    });
});

function createAbbreviationCard(abbreviation) {
    const card = document.createElement('div');
    card.className = 'abbreviation-card';
    
    let createdDate = 'N/A';
    let updatedDate = 'N/A';
    
    try {
        if (abbreviation.created_at) {
            createdDate = abbreviation.created_at.date ? 
                new Date(abbreviation.created_at.date).toLocaleDateString() :
                new Date(abbreviation.created_at).toLocaleDateString();
        }
        
        if (abbreviation.updated_at) {
            updatedDate = abbreviation.updated_at.date ? 
                new Date(abbreviation.updated_at.date).toLocaleDateString() :
                new Date(abbreviation.updated_at).toLocaleDateString();
        }
    } catch (e) {
        console.warn('Date parsing error:', e);
    }
    
    card.innerHTML = `
        <div class="card-header">
            <h3 class="abbreviation-name">${abbreviation.searchable_name}</h3>
            <span class="meaning-count">${abbreviation.meaning_count} meanings</span>
        </div>
        <div class="card-body">
            <div class="card-info">
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
        <div class="card-footer">
            <button class="view-meanings-btn" onclick="fetchMeanings(${abbreviation.id})">
                View Meanings
            </button>
        </div>
    `;
    
    return card;
}

function displayAbbreviations(data, isSearchResult = false) {
    const placeholder = document.querySelector('.content-placeholder');
    //const errorMessage = document.getElementById('error-message');
    placeholder.innerHTML = '';
    //errorMessage.innerHTML = '';
    
    const abbreviations = Object.values(data);
    
    if (abbreviations.length === 0) {
        placeholder.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <h3>No abbreviations found</h3>
                <p>${isSearchResult ? 'Try adjusting your search terms' : 'No abbreviations available at the moment'}</p>
                <div style="margin-top: 20px;">
                    <a href="create-abbreviation.html" class="btn btn-primary" style="padding: 12px 24px; background: linear-gradient(135deg, #4caf50, #45a049); color: white; text-decoration: none; border-radius: 25px; font-weight: 500; transition: all 0.3s ease;">
                        Create First Abbreviation
                    </a>
                </div>
            </div>
        `;
        return;
    }
    
    const gridContainer = document.createElement('div');
    gridContainer.className = 'abbreviation-grid';
    
    abbreviations.forEach((abbreviation, index) => {
        const card = createAbbreviationCard(abbreviation);
        card.style.animationDelay = `${index * 0.1}s`;
        gridContainer.appendChild(card);
    });
    
    placeholder.appendChild(gridContainer);
}

function loadAllAbbreviations() {
    const placeholder = document.querySelector('.content-placeholder');
    placeholder.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Loading abbreviations...</p>
        </div>
    `;
    
    fetch('/abbreviations')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            displayAbbreviations(data);
        })
        .catch(error => {
            console.error('Error loading abbreviations:', error);
            placeholder.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <h3>Failed to load abbreviations</h3>
                    <p>${error.message}</p>
                    <button onclick="loadAllAbbreviations()" class="retry-btn">Retry</button>
                </div>
            `;
        });
}

function fetchMeanings(abbrId) {
    const placeholder = document.querySelector('.content-placeholder');
    placeholder.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Loading meanings...</p>
        </div>
    `;
    
    fetch(`/abbreviations?id=${abbrId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            displayMeanings(data);
        })
        .catch(error => {
            console.error('Error fetching meanings:', error);
            placeholder.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <h3>Failed to load meanings</h3>
                    <p>${error.message}</p>
                    <button onclick="loadAllAbbreviations()" class="back-btn">Back to All</button>
                </div>
            `;
        });
}

function refreshMeaning(meaningCard, meaningId)
{
    const placeholder = document.querySelector('.content-placeholder');
    fetch(`/meanings?id=${meaningId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(meaning => {
            meaningCard.innerHTML = getMeaningCardHTML(meaning);
        })
        .catch(error => {
            console.error('Error refreshing meaning:', error);
            placeholder.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <h3>Failed to refresh meaning</h3>
                    <p>${error.message}</p>
                    <button onclick="loadAllAbbreviations()" class="back-btn">Back to All</button>
                </div>
            `;
        });
}

async function vote(event, meaningId, isUpvote) {
    const errorMessage = document.getElementById('error-message');
    const placeholder = document.querySelector('.content-placeholder');

    try {
        const endpoint = isUpvote ? '/meanings/upvote' : '/meanings/downvote';
        const response = await fetch(`${endpoint}?id=${meaningId}`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('You need to be logged in to vote');
            }
            throw new Error('Failed to submit vote');
        }
        
        refreshMeaning(event.srcElement.parentElement.parentElement.parentElement.parentElement, meaningId);
        
    } catch (error) {
        //errorMessage.textContent = 'Error submitting vote: ' + error.message;
            placeholder.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <h3>Failed to vote meaning</h3>
                    <p>${error.message}</p>
                    <button onclick="loadAllAbbreviations()" class="back-btn">Back to All</button>
                </div>
            `;
    }
}

function displayMeanings(data) {
    const placeholder = document.querySelector('.content-placeholder');
    placeholder.innerHTML = '';
    
    const meanings = Object.values(data.meanings);
    
    if (meanings.length === 0) {
        placeholder.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📖</div>
                <h3>No meanings found</h3>
                <p>This abbreviation doesn't have any meanings yet</p>
                <button onclick="loadAllAbbreviations()" class="back-btn">Back to All</button>
            </div>
        `;
        return;
    }
    
    const meaningsContainer = document.createElement('div');
    meaningsContainer.className = 'meanings-container';
    
    const header = document.createElement('div');
    header.className = 'meanings-header';
    header.innerHTML = `
        <button onclick="loadAllAbbreviations()" class="back-btn">← Back to All</button>
        <h2>Meanings for "${data.searchable_name}"</h2>
    `;
    meaningsContainer.appendChild(header);
    
    const meaningsGrid = document.createElement('div');
    meaningsGrid.className = 'meanings-grid';
    
    meanings.forEach((meaning, index) => {
        const meaningCard = document.createElement('div');
        meaningCard.className = 'meaning-card';
        meaningCard.style.animationDelay = `${index * 0.1}s`;
        
        meaningCard.innerHTML = getMeaningCardHTML(meaning);
        
        meaningsGrid.appendChild(meaningCard);
    });
    
    meaningsContainer.appendChild(meaningsGrid);
    placeholder.appendChild(meaningsContainer);
}

function getMeaningCardHTML(meaning)
{
    return `
            <div class="meaning-header">
                <h4>${meaning.name}</h4>
                <span class="status-badge status-${meaning.approval_status.toLowerCase()}">${meaning.approval_status}</span>
            </div>
            <div class="meaning-body">
                <h3 class="meaning-description">${meaning.short_expansion}</h3>
                <p class="meaning-description">${meaning.description}</p>
                <div class="meaning-meta">
                    <span class="meta-item">
                        <strong>Language:</strong> ${meaning.lang}
                    </span>
                    <span class="meta-item">
                        <strong>Domain:</strong> ${meaning.domain}
                    </span>
                    <span class="meta-item">
                        <strong>Score:</strong> ${meaning.score}
                        <button class="vote-btn upvote-btn" onclick="vote(event, ${meaning.id}, true)">
                            👍 Upvote
                        </button>
                        <button class="vote-btn downvote-btn" onclick="vote(event, ${meaning.id}, false)">
                            👎 Downvote
                        </button>
                    </span>
                </div>
                <div class="meaning-actions">
                    <button class="add-to-list-btn action-btn" onclick="showListModal(${meaning.id}, '${meaning.short_expansion}')">
                        ➕ Add to List
                    </button>
                    <button class="delete-btn action-btn" onclick="">
                        Delete
                    </button>
                    <button class="edit-btn action-btn" onclick="">
                        Edit
                    </button>
                </div>
            </div>
        `;
}

function loadUserLists() {
    return fetch('/abbr-lists/mine')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Raw API response:', data); // Debug log
            
            let lists = [];
            
            if (Array.isArray(data)) {
                lists = data;
            } else if (data && Array.isArray(data.lists)) {
                lists = data.lists;
            } else if (data && Array.isArray(data.data)) {
                lists = data.data;
            } else if (data && typeof data === 'object') {
                const values = Object.values(data);
                const arrayValue = values.find(val => Array.isArray(val));
                if (arrayValue) {
                    lists = arrayValue;
                } else {
                    lists = values.filter(val => val && typeof val === 'object');
                }
            }
            
            console.log('Processed lists:', lists);
            return lists;
        })
        .catch(error => {
            console.error('Error loading user lists:', error);
            throw error;
        });
}

function showListModal(meaningId, meaningName) {
    const existingModal = document.querySelector('.list-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'list-modal';
    
    modal.innerHTML = `
        <div class="modal-header">
            <h3>Add "${meaningName}" to List</h3>
            <button class="modal-close" onclick="closeListModal()">×</button>
        </div>
        <div class="modal-body">
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Loading your lists...</p>
            </div>
        </div>
    `;
    
    modalOverlay.appendChild(modal);
    document.body.appendChild(modalOverlay);
    
    loadUserLists()
        .then(lists => {
            const modalBody = modal.querySelector('.modal-body');
            
            console.log('Lists in modal:', lists, 'Type:', typeof lists, 'Is Array:', Array.isArray(lists)); // Debug log
            
            if (!lists || !Array.isArray(lists) || lists.length === 0) {
                modalBody.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📋</div>
                        <h4>No lists found</h4>
                        <p>You don't have any lists yet. Create one first!</p>
                        <button class="btn btn-primary" onclick="window.location.href='../html/my_abbreviations.html'">
                            Create List
                        </button>
                    </div>
                `;
                return;
            }
            
            try {
                const listsHtml = lists.map(list => {
                    const listName = list.name || 'Unnamed List';
                    const listId = list.id || list.list_id || 0;
                    const isPrivate = list.private || list.is_private || false;
                    const createdAt = list.created_at.date || new Date().toISOString();
                    const meaningsCount = list.meanings ? list.meanings.length : (list.meanings_count || 0);
                    
                    return `
                        <div class="list-item" onclick="addMeaningToList(${meaningId}, ${listId}, '${listName.replace(/'/g, "\\'")}')">
                            <div class="list-item-header">
                                <h4>${listName}</h4>
                                <span class="list-privacy ${isPrivate ? 'private' : 'public'}">
                                    ${isPrivate ? '🔒 Private' : '🌐 Public'}
                                </span>
                            </div>
                            <div class="list-item-body">
                                <p class="list-description">
                                    Created: ${new Date(createdAt).toLocaleDateString()}
                                </p>
                                <div class="list-stats">
                                    <span>${meaningsCount} meanings</span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
                
                modalBody.innerHTML = `
                    <div class="lists-container">
                        <p>Select a list to add this meaning to:</p>
                        <div class="lists-grid">
                            ${listsHtml}
                        </div>
                    </div>
                `;
            } catch (mapError) {
                console.error('Error processing lists:', mapError, lists);
                modalBody.innerHTML = `
                    <div class="error-state">
                        <div class="error-icon">⚠️</div>
                        <h4>Error processing lists</h4>
                        <p>There was an issue displaying your lists. Please try again.</p>
                        <button onclick="showListModal(${meaningId}, '${meaningName}')" class="retry-btn">Retry</button>
                    </div>
                `;
            }
        })
        .catch(error => {
            const modalBody = modal.querySelector('.modal-body');
            modalBody.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <h4>Failed to load lists</h4>
                    <p>${error.message}</p>
                    <button onclick="showListModal(${meaningId}, '${meaningName}')" class="retry-btn">Retry</button>
                </div>
            `;
        });
    
    modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) {
            closeListModal();
        }
    });
}

function closeListModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

function addMeaningToList(meaningId, listId, listName) {
    const modalBody = document.querySelector('.modal-body');
    modalBody.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Adding to list...</p>
        </div>
    `;
    
    fetch(`/abbr-lists/entry?id=${listId}&meaning=${meaningId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        modalBody.innerHTML = `
            <div class="success-state">
                <div class="success-icon">✅</div>
                <h4>Success!</h4>
                <p>Meaning added to "${listName}" successfully!</p>
                <button onclick="closeListModal()" class="btn btn-primary">Close</button>
            </div>
        `;
        
        setTimeout(() => {
            closeListModal();
        }, 2000);
    })
    .catch(error => {
        console.error('Error adding meaning to list:', error);
        modalBody.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <h4>Failed to add meaning</h4>
                <p>${error.message}</p>
                <button onclick="addMeaningToList(${meaningId}, ${listId}, '${listName}')" class="retry-btn">Retry</button>
                <button onclick="closeListModal()" class="btn btn-secondary">Cancel</button>
            </div>
        `;
    });
}

document.querySelector('.search-button').addEventListener('click', function() {
    const searchTerm = document.querySelector('#search-bar').value.trim();
    const searchType = document.querySelector('#search-type').value;
    
    if (!searchTerm) {
        loadAllAbbreviations();
        return;
    }
    
    const placeholder = document.querySelector('.content-placeholder');
    placeholder.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Searching...</p>
        </div>
    `;
    
    fetch('/dashboard/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ search_term: searchTerm, search_type: searchType })
    })
    .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    })
    .then(data => {
        if (data.success) {
            displayAbbreviations(data.results, true);
        } else {
            throw new Error(data.error || 'Search failed');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        placeholder.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <h3>Search failed</h3>
                <p>Please try again</p>
                <button onclick="loadAllAbbreviations()" class="back-btn">Back to All</button>
            </div>
        `;
    });
});

document.querySelector('#search-bar').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        document.querySelector('.search-button').click();
    }
});

document.addEventListener('DOMContentLoaded', function() {
    loadAllAbbreviations();
});