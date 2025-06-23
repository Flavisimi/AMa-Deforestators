let meanings = [];

async function loadMeanings() {
    const overlay = document.getElementById('loading-overlay');
    const errorMessage = document.getElementById('error-message');
    
    try {
        overlay.style.display = 'flex';
        const response = await fetch('/meanings');
        
        if (!response.ok) {
            throw new Error('Failed to load meanings');
        }
        
        meanings = await response.json();
        renderMeanings();
    } catch (error) {
        errorMessage.textContent = 'Error loading meanings: ' + error.message;
        errorMessage.style.display = 'block';
    } finally {
        overlay.style.display = 'none';
    }
}

function renderMeanings() {
    const container = document.getElementById('meanings-container');
    
    if (!meanings || Object.keys(meanings).length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; font-size: 1.1rem;">No meanings available to vote on.</p>';
        return;
    }

    container.innerHTML = '';
    let delay = 0;

    Object.values(meanings).forEach(meaning => {
        const card = createMeaningCard(meaning, delay);
        container.appendChild(card);
        delay += 0.1;
    });
}

function createMeaningCard(meaning, animationDelay) {
    const card = document.createElement('div');
    card.className = 'meaning-card';
    card.style.animationDelay = `${animationDelay}s`;

    card.innerHTML = `
        <div class="meaning-header">
            <div>
                <h3 class="meaning-name">${meaning.name}</h3>
                <p class="meaning-expansion">${meaning.short_expansion}</p>
            </div>
        </div>
        <div class="meaning-meta">
            <div class="meta-item">
                <span>Language: ${meaning.lang.toUpperCase()}</span>
            </div>
            <div class="meta-item">
                <span>Domain: ${meaning.domain}</span>
            </div>
        </div>
        <div class="vote-actions">
            <button class="vote-btn upvote-btn" onclick="vote(${meaning.id}, true)">
                👍 Upvote
            </button>
            <button class="vote-btn downvote-btn" onclick="vote(${meaning.id}, false)">
                👎 Downvote
            </button>
            <span class="vote-score">Score: ${meaning.score || 0}</span>
        </div>
    `;

    return card;
}

async function vote(meaningId, isUpvote) {
    const overlay = document.getElementById('loading-overlay');
    const errorMessage = document.getElementById('error-message');
    
    try {
        overlay.style.display = 'flex';
        overlay.querySelector('p').textContent = 'Submitting vote...';
        
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
        
        await loadMeanings();
        
    } catch (error) {
        errorMessage.textContent = 'Error submitting vote: ' + error.message;
        errorMessage.style.display = 'block';
        overlay.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', loadMeanings);