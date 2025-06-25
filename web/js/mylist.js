
let currentList = null;
let allAbbreviations = [];
let filteredAbbreviations = [];
let selectedMeaningId = null;

function getListIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

function checkAuthentication() {

    return fetch('/auth/check', { 
        credentials: 'include' 
    })
    .then(response => response.ok)
    .catch(() => false);
}

function loadListDetails() {
    const listId = getListIdFromUrl();
    if (!listId) {
        alert('No list ID provided');
        window.location.href = 'my_lists';
        return;
    }

    fetch(`/abbr-lists?id=${listId}`, {
        credentials: 'include' 
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) {
                alert('Please log in to access this list');
                window.location.href = 'login';
                return;
            } else if (response.status === 403) {
                alert('You do not have permission to access this list');
                window.location.href = 'my_lists';
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data) {
            currentList = data;
            displayListDetails(data);
            displayAbbreviations(data.meanings || []);
        }
    })
    .catch(error => {
        console.error('Error loading list:', error);
        document.getElementById('listDetails').innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <h3>Failed to load list</h3>
                <p>${error.message}</p>
            </div>
        `;
    });
}

function displayListDetails(list) {
    document.getElementById('listTitle').textContent = list.name;
    document.title = `${list.name} - Abbreviations Manager`;

    const createdDate = list.created_at ? 
        new Date(list.created_at.date || list.created_at).toLocaleDateString() : 'N/A';
    const updatedDate = list.updated_at ? 
        new Date(list.updated_at.date || list.updated_at).toLocaleDateString() : 'N/A';

    document.getElementById('listDetails').innerHTML = `
        <h3>${escapeHtml(list.name)}</h3>
        <p style="color: #666; margin: 10px 0;">
            ${list.private ? 'Private' : 'Public'} list
        </p>
        <div class="list-stats">
            <div class="stat-item">
                <span class="stat-number">${(list.meanings || []).length}</span>
                <span class="stat-label">Abbreviations</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${createdDate}</span>
                <span class="stat-label">Created</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${updatedDate}</span>
                <span class="stat-label">Last Updated</span>
            </div>
        </div>
    `;
}

function displayAbbreviations(meanings) {
    allAbbreviations = meanings;
    filteredAbbreviations = meanings;
    
    const container = document.getElementById('abbreviationsContainer');

    if (meanings.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <h3>No abbreviations yet</h3>
                <p>Add your first abbreviation to get started!</p>
            </div>
        `;
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'abbreviations-grid';

    meanings.forEach((meaning, index) => {
        const card = createAbbreviationCard(meaning, index);
        grid.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(grid);
}

function createAbbreviationCard(meaning, index) {
    const card = document.createElement('div');
    card.className = 'meaning-card';

    card.innerHTML = `
        <div class="meaning-header">
            <h4>${meaning.name}</h4>
            <span class="status-badge status-${meaning.approval_status.toLowerCase()}">${meaning.approval_status}</span>
            <button class="remove-btn" onclick="removeAbbreviation(${index})" title="Remove from list">×</button>
        </div>
        <div class="meaning-body">
            <h3 class="meaning-expansion">${meaning.short_expansion}</h3>
            <p class="meaning-description">${meaning.description}</p>
            <div class="meaning-meta">
                <span class="meta-item">
                    <strong>Language:</strong> ${meaning.lang}
                </span>
                <span class="meta-item">
                    <strong>Domain:</strong> ${meaning.domain}
                </span>
                <span class="meta-item">
                    <strong>Submitted by:</strong> ${meaning.uploader_name}
                </span>
                <span class="meta-item">
                    <strong>Score:</strong> ${meaning.score}
                </span>
            </div>
        </div>
    `;

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

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        
        if (query === '') {
            filteredAbbreviations = allAbbreviations;
        } else {
            filteredAbbreviations = allAbbreviations.filter(meaning => 
                (meaning.abbreviation && meaning.abbreviation.toLowerCase().includes(query)) ||
                (meaning.meaning && meaning.meaning.toLowerCase().includes(query))
            );
        }
        
        displayAbbreviations(filteredAbbreviations);
    });
}

function removeAbbreviation(index) {
    if (!confirm('Are you sure you want to remove this abbreviation from the list?')) {
        return;
    }

    const listId = getListIdFromUrl();
    
    fetch(`/abbr-lists/entry?id=${listId}&index=${index}`, {
        method: 'DELETE',
        credentials: 'include' 
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) {
                alert('Please log in to remove abbreviations');
                window.location.href = 'login';
                return;
            } else if (response.status === 403) {
                alert('You do not have permission to modify this list');
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        loadListDetails();
    })
    .catch(error => {
        console.error('Error removing abbreviation:', error);
        alert('Failed to remove abbreviation: ' + error.message);
    });
}

function openAddModal() {
    const modal = document.getElementById('addModal');
    if (modal) {
        modal.classList.add('active');
        const searchInput = document.getElementById('abbreviationSearch');
        if (searchInput) {
            searchInput.focus();
        }
        resetSearchResults();
    }
}

function closeAddModal() {
    const modal = document.getElementById('addModal');
    if (modal) {
        modal.classList.remove('active');
        const searchInput = document.getElementById('abbreviationSearch');
        if (searchInput) {
            searchInput.value = '';
        }
        resetSearchResults();
        selectedMeaningId = null;
        const addBtn = document.getElementById('addSelectedBtn');
        if (addBtn) {
            addBtn.disabled = true;
        }
    }
}

function resetSearchResults() {
    const resultsContainer = document.getElementById('searchResults');
    if (resultsContainer) {
        resultsContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <h3>Search for abbreviations</h3>
                <p>Type in the search box above to find abbreviations to add to your list.</p>
            </div>
        `;
    }
}

function setupAbbreviationSearch() {
    const searchInput = document.getElementById('abbreviationSearch');
    if (!searchInput) return;
    
    let searchTimeout;

    searchInput.addEventListener('input', function() {
        const query = this.value.trim();
        
        clearTimeout(searchTimeout);
        
        if (query.length < 2) {
            document.getElementById('searchResults').innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <h3>Search for abbreviations</h3>
                    <p>Type at least 2 characters to search.</p>
                </div>
            `;
            selectedMeaningId = null;
            const addBtn = document.getElementById('addSelectedBtn');
            if (addBtn) addBtn.disabled = true;
            return;
        }

        const resultsContainer = document.getElementById('searchResults');
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>Searching...</p>
                </div>
            `;
        }

        searchTimeout = setTimeout(() => {
            searchAbbreviations(query);
        }, 500);
    });
}

function searchAbbreviations(query) {
    fetch(`/abbreviations/search?q=${encodeURIComponent(query)}`, {
        credentials: 'include' 
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) {
                alert('Please log in to search abbreviations');
                window.location.href = 'login';
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(results => {
        displaySearchResults(results);
    })
    .catch(error => {
        console.error('Error searching abbreviations:', error);
        const mockResults = getMockSearchResults(query);
        displaySearchResults(mockResults);
    });
}

function getMockSearchResults(query) {
    const mockData = [
        { id: 1, abbreviation: 'API', meaning: 'Application Programming Interface' },
        { id: 2, abbreviation: 'CPU', meaning: 'Central Processing Unit' },
        { id: 3, abbreviation: 'GPU', meaning: 'Graphics Processing Unit' },
        { id: 4, abbreviation: 'RAM', meaning: 'Random Access Memory' },
        { id: 5, abbreviation: 'SSD', meaning: 'Solid State Drive' },
        { id: 6, abbreviation: 'HTTP', meaning: 'HyperText Transfer Protocol' },
        { id: 7, abbreviation: 'HTML', meaning: 'HyperText Markup Language' },
        { id: 8, abbreviation: 'CSS', meaning: 'Cascading Style Sheets' },
        { id: 9, abbreviation: 'JS', meaning: 'JavaScript' },
        { id: 10, abbreviation: 'SQL', meaning: 'Structured Query Language' }
    ];

    return mockData.filter(item => 
        item.abbreviation.toLowerCase().includes(query.toLowerCase()) ||
        item.meaning.toLowerCase().includes(query.toLowerCase())
    );
}

function displaySearchResults(results) {
    const container = document.getElementById('searchResults');
    if (!container) return;

    if (results.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">😕</div>
                <h3>No results found</h3>
                <p>Try searching with different keywords.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';

    results.forEach(result => {
        const alreadyInList = currentList && currentList.meanings && 
            currentList.meanings.some(m => 
                m.id === result.id || 
                (m.abbreviation === result.abbreviation && m.meaning === result.meaning)
            );
        
        const resultItem = document.createElement('div');
        resultItem.className = `result-item ${alreadyInList ? 'disabled' : ''}`;
        resultItem.innerHTML = `
            <div class="result-abbreviation">${escapeHtml(result.abbreviation)}</div>
            <div class="result-meaning">${escapeHtml(result.meaning)}</div>
            ${alreadyInList ? '<div style="color: #666; font-size: 0.9rem; margin-top: 5px;">Already in list</div>' : ''}
        `;

        if (!alreadyInList) {
            resultItem.addEventListener('click', function() {
                document.querySelectorAll('.result-item').forEach(item => {
                    item.classList.remove('selected');
                });
                
                this.classList.add('selected');
                selectedMeaningId = result.id;
                const addBtn = document.getElementById('addSelectedBtn');
                if (addBtn) addBtn.disabled = false;
            });
        }

        container.appendChild(resultItem);
    });
}

function addSelectedAbbreviation() {
    if (!selectedMeaningId) {
        alert('Please select an abbreviation to add');
        return;
    }

    const listId = getListIdFromUrl();
    const addBtn = document.getElementById('addSelectedBtn');
    
    if (addBtn) {
        addBtn.textContent = 'Adding...';
        addBtn.disabled = true;
    }

    fetch(`/abbr-lists/entry?id=${listId}&meaning=${selectedMeaningId}`, {
        method: 'POST',
        credentials: 'include' 
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) {
                alert('Please log in to add abbreviations');
                window.location.href = 'login';
                return;
            } else if (response.status === 403) {
                alert('You do not have permission to modify this list');
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        closeAddModal();
        loadListDetails(); 
    })
    .catch(error => {
        console.error('Error adding abbreviation:', error);
        alert('Failed to add abbreviation: ' + error.message);
    })
    .finally(() => {
        if (addBtn) {
            addBtn.textContent = 'Add Selected';
            addBtn.disabled = false;
        }
    });
}

function initializePage() {
    loadListDetails();
    
    setupSearch();
    setupAbbreviationSearch();
    
    setupUserProfile();
}

document.addEventListener('DOMContentLoaded', initializePage);