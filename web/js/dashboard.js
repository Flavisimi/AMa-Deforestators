let availableLanguages = [];
let availableDomains = [];
let currentPage = 1;
let isLoading = false;
let hasMore = true;
let currentAbbreviations = [];
let isSearchMode = false;

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
            <button class="view-meanings-btn">
                View Meanings
            </button>
            <button class="export-meanings-btn">
                Export as HTML
            </button>
        </div>
    `;

    // card.querySelector(".view-meanings-btn").addEventListener("click", ev => fetchMeanings(abbreviation.id));
    card.querySelector(".view-meanings-btn").addEventListener("click", ev => window.location.href = "/main?initialAbbrId=" + abbreviation.id);
    card.querySelector(".export-meanings-btn").addEventListener("click", ev => exportMeaningsAsHtml(abbreviation));

    return card;
}

async function exportMeaningsAsHtml(abbreviation)
{
    abbreviation = await loadMeaningsByAbbrId(abbreviation.id);
    
    const defList = document.createElement("dl");
    defList.className = "meanings";

    Object.values(abbreviation.meanings).forEach(meaning => {
        const term = document.createElement("dt");
        term.className = "meaning-name";
        term.textContent = escapeHtml(meaning.name);

        const definition = document.createElement("dd");
        definition.innerHTML = `
            <h2 class="short_expansion">Short expansion</h2>
            <p>${escapeHtml(meaning.short_expansion)}</p>
            <h2 class="description">Description</h2>
            <p>${escapeHtml(meaning.description)}</p>
            <h2 class="language">Language</h2>
            <p>${escapeHtml(meaning.lang)}</p>
            <h2 class="domain">Domain</h2>
            <p>${escapeHtml(meaning.domain)}</p>
        `;

        defList.appendChild(term);
        defList.appendChild(definition);
    });

    const htmlString = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${abbreviation.searchable_name}</title>
    </head>
    <body>
        <h1 class="searchable_name">${abbreviation.searchable_name}</h1>
        ${defList.getHTML()}
    </body>
    </html>
    `;

    const blob = new Blob([htmlString]);

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = abbreviation.searchable_name + ".html";
    link.click();

    URL.revokeObjectURL(link.href);
}

function displayAbbreviations(data, isSearchResult = false, append = false) {
    const placeholder = document.querySelector('.content-placeholder');
    
    if (!append) {
        placeholder.innerHTML = '';
    }
    
    const abbreviations = Array.isArray(data) ? data : Object.values(data);
    
    if (!append && abbreviations.length === 0) {
        placeholder.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <h3>No abbreviations found</h3>
                <p>${isSearchResult ? 'Try adjusting your search terms' : 'No abbreviations available at the moment'}</p>
                <div>
                    <a href="create-abbreviation" class="btn btn-primary">
                        Create First Abbreviation
                    </a>
                </div>
            </div>
        `;

        const lastDiv = placeholder.querySelectorAll(".empty-state > div")[1];
        lastDiv.style = "margin-top: 20px";
        lastDiv.querySelector(".btn-primary").style = "padding: 12px 24px; background: linear-gradient(135deg, #4caf50, #45a049); color: white; text-decoration: none; border-radius: 25px; font-weight: 500; transition: all 0.3s ease;";
        return;
    }
    
    let gridContainer = placeholder.querySelector('.abbreviation-grid');
    if (!gridContainer) {
        gridContainer = document.createElement('div');
        gridContainer.className = 'abbreviation-grid';
        placeholder.appendChild(gridContainer);
    }
    
    const startIndex = append ? currentAbbreviations.length : 0;
    
    abbreviations.forEach((abbreviation, index) => {
        const card = createAbbreviationCard(abbreviation);
        card.style.animationDelay = `${(startIndex + index) * 0.1}s`;
        gridContainer.appendChild(card);
    });
    
    if (append) {
        currentAbbreviations = currentAbbreviations.concat(abbreviations);
    } else {
        currentAbbreviations = abbreviations;
    }
}

function showLoadingIndicator(append = false) {
    const placeholder = document.querySelector('.content-placeholder');
    
    if (append) {
        let loadingDiv = document.querySelector('.loading-more');
        if (!loadingDiv) {
            loadingDiv = document.createElement('div');
            loadingDiv.className = 'loading-more';
            loadingDiv.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>Loading more abbreviations...</p>
                </div>
            `;
            placeholder.appendChild(loadingDiv);
        }
    } else {
        placeholder.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Loading abbreviations...</p>
            </div>
        `;
    }
}

function hideLoadingIndicator() {
    const loadingMore = document.querySelector('.loading-more');
    if (loadingMore) {
        loadingMore.remove();
    }
}

function loadAbbreviations(page = 1, append = false) {
    if (isLoading) return;
    
    isLoading = true;
    isSearchMode = false;
    
    showLoadingIndicator(append);
    
    fetch(`/api/abbreviations?page=${page}&limit=20`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            hideLoadingIndicator();
            
            if (data.abbreviations) {
                displayAbbreviations(data.abbreviations, false, append);
                hasMore = data.pagination.has_more;
                currentPage = data.pagination.current_page;
            } else {
                displayAbbreviations(data, false, append);
                hasMore = false;
            }
            
            isLoading = false;
        })
        .catch(error => {
            console.error('Error loading abbreviations:', error);
            hideLoadingIndicator();
            isLoading = false;
            
            const placeholder = document.querySelector('.content-placeholder');
            if (!append) {
                placeholder.innerHTML = `
                    <div class="error-state">
                        <div class="error-icon">⚠️</div>
                        <h3>Failed to load abbreviations</h3>
                        <p>${escapeHtml(error.message)}</p>
                        <button class="retry-btn">Retry</button>
                    </div>
                `;

                placeholder.querySelector(".retry-btn").addEventListener("click", ev => backToAll());
            }
        });
}

function backToAll()
{
    // const params = new URLSearchParams(window.location.search);

    // const abbrId = params.get("abbrId");
    // if(abbrId != null)
    // {
    //     window.location.href = "/main";
    // }
    // else
    // {
         loadAllAbbreviations();
    // }
}

function loadAllAbbreviations() {
    currentPage = 1;
    hasMore = true;
    currentAbbreviations = [];
    isSearchMode = false;
    loadAbbreviations(1, false);
}

function loadMoreAbbreviations() {
    if (hasMore && !isLoading && !isSearchMode) {
        loadAbbreviations(currentPage + 1, true);
    }
}

function setupInfiniteScroll() {
    let isScrolling = false;
    
    window.addEventListener('scroll', function() {
        if (isScrolling) return;
        
        isScrolling = true;
        
        requestAnimationFrame(function() {
            const scrollPosition = window.innerHeight + window.scrollY;
            const documentHeight = document.documentElement.offsetHeight;
            const threshold = 300;
            
            if (scrollPosition >= documentHeight - threshold) {
                loadMoreAbbreviations();
            }
            
            isScrolling = false;
        });
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
                    <p>${escapeHtml(error.message)}</p>
                    <button class="back-btn">Back to All</button>
                </div>
            `;
            placeholder.querySelector(".back-btn").addEventListener("click", ev => backToAll());
        });
}

async function handleSubmit(ev, meaningCard, meaning)
{
    const placeholder = document.querySelector('.content-placeholder');
    await submitEditModal(ev, meaning)
    .then(result => {
        if (result.success) {
            closeEditModal();
            refreshMeaning(meaningCard, meaning.id);
        } else {
            throw new Error(result.error || 'Failed to update meaning');
        }
    })
    .catch(error => {
        console.error('Error updating meaning:', error);
        closeEditModal();
        placeholder.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <h3>Failed to edit meaning</h3>
                    <p>${escapeHtml(error.message)}</p>
                    <button class="back-btn">Back to All</button>
                </div>
            `;

        placeholder.querySelector(".back-btn").addEventListener("click", ev => backToAll());
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
                <p>${escapeHtml(error.message)}</p>
                <button class="back-btn">Back to All</button>
            </div>
        `;

        placeholder.querySelector(".back-btn").addEventListener("click", ev => backToAll());
    })
    .then(() => refreshMeaning(meaningCard, meaningId))
    .catch(error => {
        console.error('Error refreshing meaning:', error);
        placeholder.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <h3>Failed to refresh meaning</h3>
                <p>${escapeHtml(error.message)}</p>
                <button class="back-btn">Back to All</button>
            </div>
        `;

        placeholder.querySelector(".back-btn").addEventListener("click", ev => backToAll());
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
                <button class="back-btn">Back to All</button>
            </div>
        `;

        placeholder.querySelector(".back-btn").addEventListener("click", ev => backToAll());
        return;
    }
    
    const meaningsContainer = document.createElement('div');
    meaningsContainer.className = 'meanings-container';
    
    const header = document.createElement('div');
    header.className = 'meanings-header';
    header.innerHTML = `
        <button class="back-btn">← Back to All</button>
        <h2>Meanings for "${data.searchable_name}"</h2>
    `;
    header.querySelector(".back-btn").addEventListener("click", ev => backToAll());
    meaningsContainer.appendChild(header);

    meaningsContainer.appendChild(createMeaningsGrid(meanings, handleVote, true, handleDeleteMeaning, handleSubmit, true));
    placeholder.appendChild(meaningsContainer);
}

function clearSearchTerm() {
    document.getElementById('search-bar').value = '';
    const language = document.querySelector('#language-filter').value.trim();
    const domain = document.querySelector('#domain-filter').value.trim();
    
    if (language || domain) {
        performSearch();
    } else {
        loadAllAbbreviations();
    }
}

function performSearch() {
    const searchTerm = document.querySelector('#search-bar').value.trim();
    const searchType = document.querySelector('#search-type').value;
    const languageFilter = document.querySelector('#language-filter');
    const domainFilter = document.querySelector('#domain-filter');
    
    const language = languageFilter ? languageFilter.value.trim() : '';
    const domain = domainFilter ? domainFilter.value.trim() : '';
    
    if (!searchTerm && !language && !domain) {
        loadAllAbbreviations();
        return;
    }
    
    isSearchMode = true;
    currentPage = 1;
    hasMore = false;
    currentAbbreviations = [];
    
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
    
    fetch('/api/dashboard/search', {
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
                <button class="retry-btn">Retry</button>
                <button class="back-btn">Back to All</button>
            </div>
        `;

        placeholder.querySelector(".retry-btn").addEventListener("click", ev => performSearch());
        placeholder.querySelector(".back-btn").addEventListener("click", ev => backToAll());
    });
}

function clearLanguageFilter() {
    document.getElementById('language-filter').value = '';
    const searchTerm = document.querySelector('#search-bar').value.trim();
    const domain = document.querySelector('#domain-filter').value.trim();
    
    if (searchTerm || domain) {
        performSearch();
    } else {
        loadAllAbbreviations();
    }
}

function clearDomainFilter() {
    document.getElementById('domain-filter').value = '';
    const searchTerm = document.querySelector('#search-bar').value.trim();
    const language = document.querySelector('#language-filter').value.trim();
    
    if (searchTerm || language) {
        performSearch();
    } else {
        loadAllAbbreviations();
    }
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
                <p>${escapeHtml(error)}</p>
                <button class="back-btn">Back to All</button>
            </div>
        `;

        placeholder.querySelector(".back-btn").addEventListener("click", ev => backToAll());
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

document.addEventListener('DOMContentLoaded', function() {
    loadFilterOptions();
    setupInfiniteScroll();

    const languageFilter = document.querySelector('#language-filter');
    const domainFilter = document.querySelector('#domain-filter');
    
    if (languageFilter) {
        languageFilter.addEventListener('input', function() {
            const searchTerm = document.querySelector('#search-bar').value.trim();
            const domain = document.querySelector('#domain-filter').value.trim();
            
            if (searchTerm || this.value.trim() || domain) {
                performSearch();
            } else {
                loadAllAbbreviations();
            }
        });

        languageFilter.parentElement.querySelector(".clear-filter").addEventListener("click", ev => clearLanguageFilter());
    }
    
    if (domainFilter) {
        domainFilter.addEventListener('input', function() {
            const searchTerm = document.querySelector('#search-bar').value.trim();
            const language = document.querySelector('#language-filter').value.trim();
            
            if (searchTerm || this.value.trim() || language) {
                performSearch();
            } else {
                loadAllAbbreviations();
            }
        });

        domainFilter.parentElement.querySelector(".clear-filter").addEventListener("click", ev => clearDomainFilter());
    }

    const searchClearButton = document.querySelector('.search-wrapper .clear-search');
    if (searchClearButton) {
        searchClearButton.addEventListener('click', function() {
            clearSearchTerm();
        });
    }

    const params = new URLSearchParams(window.location.search);

    const abbrId = params.get("initialAbbrId");
    if(abbrId != null) {
        fetchMeanings(abbrId);
    } else {
        loadAllAbbreviations();
    }
});