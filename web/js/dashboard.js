let availableLanguages = [];
let availableDomains = [];

document.querySelectorAll('.nav-button').forEach(button => {
    button.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        
       if (href.startsWith('#')) {
            e.preventDefault();
            
            if (href === '#create') {
                window.location.href = 'create-abbreviation';
                return;
            }
            if (href === '#myabv') {
                window.location.href = 'my_abbreviations';
                return;
            }
            if (href === '#vote') {
                window.location.href = 'vote';
                return;
            }
            if (href === '#stats') {
                window.location.href = 'stats';
                return;
            }
            if (href === '#top') {
                // Handle top abbreviations
                return;
            }
            if (href === '#feed') {
                // Handle feed
                return;
            }
        }
    });
});

function loadFilterOptions() {
    fetch('/dashboard/filters')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                availableLanguages = data.languages || [];
                availableDomains = data.domains || [];
                
                populateDatalist('language-options', availableLanguages);
                populateDatalist('domain-options', availableDomains);
            }
        })
        .catch(error => {
            console.error('Error loading filter options:', error);
        });
}

function populateDatalist(datalistId, options) {
    const datalist = document.getElementById(datalistId);
    if (datalist) {
        datalist.innerHTML = '';
        
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            datalist.appendChild(optionElement);
        });
    }
}

function clearLanguageFilter() {
    document.getElementById('language-filter').value = '';
    const searchTerm = document.querySelector('#search-bar').value.trim();
    if (searchTerm) {
        performSearch();
    }
}

function clearDomainFilter() {
    document.getElementById('domain-filter').value = '';
    const searchTerm = document.querySelector('#search-bar').value.trim();
    if (searchTerm) {
        performSearch();
    }
}

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
    placeholder.innerHTML = '';
    
    const abbreviations = Object.values(data);
    
    if (abbreviations.length === 0) {
        placeholder.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <h3>No abbreviations found</h3>
                <p>${isSearchResult ? 'Try adjusting your search terms' : 'No abbreviations available at the moment'}</p>
                <div style="margin-top: 20px;">
                    <a href="create-abbreviation" class="btn btn-primary" style="padding: 12px 24px; background: linear-gradient(135deg, #4caf50, #45a049); color: white; text-decoration: none; border-radius: 25px; font-weight: 500; transition: all 0.3s ease;">
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
    
    loadMeaningsByAbbrId(abbrId)
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

async function handleVote(event, meaningId, isUpvote) {
    const placeholder = document.querySelector('.content-placeholder');
    const meaningCard = event.target.closest('.meaning-card');

    voteMeaning(event, meaningId, isUpvote)
    .catch(error => {
        console.error('Error voting:', error);
        placeholder.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <h3>Failed to vote meaning</h3>
                <p>${error.message}</p>
                <button onclick="loadAllAbbreviations()" class="back-btn">Back to All</button>
            </div>
        `;
    })
    .then(() => refreshMeaning(meaningCard, meaningId))
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

    meaningsContainer.appendChild(createMeaningsGrid(meanings, handleVote, showListModal, handleDeleteMeaning, null));
    placeholder.appendChild(meaningsContainer);
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
            console.log('Raw API response:', data);
            
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
            
            console.log('Lists in modal:', lists, 'Type:', typeof lists, 'Is Array:', Array.isArray(lists));
            
            if (!lists || !Array.isArray(lists) || lists.length === 0) {
                modalBody.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📋</div>
                        <h4>No lists found</h4>
                        <p>You don't have any lists yet. Create one first!</p>
                        <button class="btn btn-primary" onclick="window.location.href='my_abbreviations'">
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
                        <div class="list-item" onclick="handleAddMeaningToList(${meaningId}, ${listId}, '${listName.replace(/'/g, "\\'")}')">
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

function handleAddMeaningToList(meaningId, listId, listName) {
    const modalBody = document.querySelector('.modal-body');
    modalBody.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Adding to list...</p>
        </div>
    `;
    
    addMeaningToList(meaningId, listId)
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

function performSearch() {
    const searchTerm = document.querySelector('#search-bar').value.trim();
    const searchType = document.querySelector('#search-type').value;
    const languageFilter = document.querySelector('#language-filter');
    const domainFilter = document.querySelector('#domain-filter');
    
    const language = languageFilter ? languageFilter.value.trim() : '';
    const domain = domainFilter ? domainFilter.value.trim() : '';
    
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
    
    const searchData = {
        search_term: searchTerm,
        search_type: searchType
    };
    
    if (language) {
        searchData.language = language;
    }
    
    if (domain) {
        searchData.domain = domain;
    }
    
    fetch('/dashboard/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchData)
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
                <button onclick="performSearch()" class="retry-btn">Retry</button>
                <button onclick="loadAllAbbreviations()" class="back-btn">Back to All</button>
            </div>
        `;
    });
}

function handleDeleteMeaning(btn, id)
{
    deleteMeaning(id)
    .then(() => {
        const card = btn.closest(".meaning-card");
        const grid = card.parentElement;
        grid.removeChild(card);

        if(grid.childElementCount == 0)
            loadAllAbbreviations();
    })
    .catch(error => {
        const placeholder = document.querySelector('.content-placeholder');
        console.error('Error:', error);
        placeholder.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <h3>Delete failed</h3>
                <p>${error}</p>
                <button onclick="loadAllAbbreviations()" class="back-btn">Back to All</button>
            </div>
        `;
    });
}


document.querySelector('.search-button').addEventListener('click', function() {
    performSearch();
});

document.querySelector('#search-bar').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        performSearch();
    }
});

// Add event listeners for filter inputs if they exist
document.addEventListener('DOMContentLoaded', function() {
    loadFilterOptions();
    loadAllAbbreviations();
    
    const languageFilter = document.querySelector('#language-filter');
    const domainFilter = document.querySelector('#domain-filter');
    
    if (languageFilter) {
        languageFilter.addEventListener('input', function() {
            const searchTerm = document.querySelector('#search-bar').value.trim();
            if (searchTerm) {
                performSearch();
            }
        });
    }
    
    if (domainFilter) {
        domainFilter.addEventListener('input', function() {
            const searchTerm = document.querySelector('#search-bar').value.trim();
            if (searchTerm) {
                performSearch();
            }
        });
    }
});