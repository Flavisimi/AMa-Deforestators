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
        
        meaningCard.innerHTML = `
            <div class="meaning-header">
                <h4>${meaning.short_expansion}</h4>
                <span class="status-badge status-${meaning.approval_status.toLowerCase()}">${meaning.approval_status}</span>
            </div>
            <div class="meaning-body">
                <p class="meaning-description">${meaning.description}</p>
                <div class="meaning-meta">
                    <span class="meta-item">
                        <strong>Language:</strong> ${meaning.lang}
                    </span>
                    <span class="meta-item">
                        <strong>Domain:</strong> ${meaning.domain}
                    </span>
                </div>
            </div>
        `;
        
        meaningsGrid.appendChild(meaningCard);
    });
    
    meaningsContainer.appendChild(meaningsGrid);
    placeholder.appendChild(meaningsContainer);
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