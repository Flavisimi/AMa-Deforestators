
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
        <p>
            ${list.private ? 'Private' : 'Public'} list
        </p>
        <div class="list-stats">
            <div class="stat-item">
                <span class="stat-data">${(list.meanings || []).length}</span>
                <span class="stat-label">Abbreviations</span>
            </div>
            <div class="stat-item">
                <span class="stat-data">${createdDate}</span>
                <span class="stat-label">Created</span>
            </div>
            <div class="stat-item">
                <span class="stat-data">${updatedDate}</span>
                <span class="stat-label">Last Updated</span>
            </div>
            <div class="stat-item">
                <span class="stat-data">${list.creator_name}</span>
                <span class="stat-label">Creator</span>
            </div>
        </div>
    `;
    
    document.getElementById("listDetails").querySelector("p").style = "color: #666; margin: 10px 0;";
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

    const grid = createMeaningsGrid(meanings, null, null, null, null);
    container.innerHTML = '';
    container.appendChild(grid);
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
            ${alreadyInList ? '<div>Already in list</div>' : ''}
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
        else
        {
            resultItem.querySelectorAll("div")[2].style = "color: #666; font-size: 0.9rem; margin-top: 5px;";
        }

        container.appendChild(resultItem);
    });
}

function initializePage() {
    loadListDetails();
    
    setupSearch();
    setupAbbreviationSearch();
}

document.addEventListener('DOMContentLoaded', initializePage);