let statisticsData = {
    mostVisited: [],
    mostControversial: [],
    highestLikeRate: [],
    mostActiveUsers: []
};

const API_ENDPOINTS = {
    mostVisited: 'statistics/most_visited',
    mostControversial: 'statistics/most_controversial', 
    highestLikeRate: 'statistics/highest_like_rate',
    mostActiveUsers: 'statistics/most_active_users',
    medianAbbreviation: 'statistics/median_abbreviation'
};

function showLoading() {
    document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

function showError(message) {
    const errorElement = document.getElementById('error-message');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 5000);
}

function getRankClass(index) {
    if (index === 0) return 'gold';
    if (index === 1) return 'silver';
    if (index === 2) return 'bronze';
    return '';
}

function renderMostVisited(data) {
    const container = document.getElementById('most-visited-list');
    if (!data || data.length === 0) {
        container.innerHTML = '<li class="stat-item"><span class="stat-name">No data available</span></li>';
        return;
    }

    container.innerHTML = data.map((item, index) => `
        <li class="stat-item">
            <div style="display: flex; align-items: center;">
                <span class="rank-number ${getRankClass(index)}">${index + 1}</span>
                <span class="stat-name">${item.abbreviation || item.searchable_name || 'Unknown'}</span>
            </div>
            <span class="stat-value visited">${item.visits || item.views || item.count || 0}</span>
        </li>
    `).join('');
}

function renderMostControversial(data) {
    const container = document.getElementById('most-controversial-list');
    if (!data || data.length === 0) {
        container.innerHTML = '<li class="stat-item"><span class="stat-name">No data available</span></li>';
        return;
    }

    container.innerHTML = data.map((item, index) => `
        <li class="stat-item">
            <div style="display: flex; align-items: center;">
                <span class="rank-number ${getRankClass(index)}">${index + 1}</span>
                <span class="stat-name">${item.abbreviation || item.name || 'Unknown'}</span>
            </div>
        </li>
    `).join('');
}

function renderHighestLikeRate(data) {
    const container = document.getElementById('highest-like-rate-list');
    if (!data || data.length === 0) {
        container.innerHTML = '<li class="stat-item"><span class="stat-name">No data available</span></li>';
        return;
    }

    container.innerHTML = data.map((item, index) => `
        <li class="stat-item">
            <div style="display: flex; align-items: center;">
                <span class="rank-number ${getRankClass(index)}">${index + 1}</span>
                <span class="stat-name">${item.abbreviation || item.name || 'Unknown'}</span>
            </div>
            <span class="stat-value liked">${Math.round((item.like_rate || item.rate || 0) * 100)}%</span>
        </li>
    `).join('');
}

function renderMostActiveUsers(data) {
    const container = document.getElementById('most-active-users-list');
    if (!data || data.length === 0) {
        container.innerHTML = '<li class="stat-item"><span class="stat-name">No data available</span></li>';
        return;
    }

    container.innerHTML = data.map((item, index) => `
        <li class="stat-item">
            <div style="display: flex; align-items: center;">
                <span class="rank-number ${getRankClass(index)}">${index + 1}</span>
                <span class="stat-name">${item.username || item.user || item.name || 'Anonymous'}</span>
            </div>
            <span class="stat-value active">${item.activity_score || item.score || item.contributions || 0}</span>
        </li>
    `).join('');
}

function renderMedianAbbreviation(data) {
    const container = document.getElementById('median-abbreviation-list');
    if (!data || data.length === 0) {
        container.innerHTML = '<li class="stat-item"><span class="stat-name">No data available</span></li>';
        return;
    }

    container.innerHTML = data.map((item, index) => `
        <li class="stat-item">
            <div style="display: flex; align-items: center;">
                <span class="rank-number ${getRankClass(index)}">${index + 1}</span>
                <span class="stat-name">${item.abbreviation || item.searchable_name || 'Unknown'}</span>
            </div>
        </li>
    `).join('');
}

async function fetchStatistics(endpoint, key) {
    try {
        console.log(`Fetching: ${endpoint}`);
        
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin' 
        });

        console.log(`Response status: ${response.status}`); 

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error response: ${errorText}`);
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log(`Data received for ${key}:`, data); 
        statisticsData[key] = data;
        return data;
    } catch (error) {
        console.error(`Error fetching ${key}:`, error);
        showError(`Failed to load ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}: ${error.message}`);
        return [];
    }
}

async function loadAllStatistics() {
    showLoading();

    try {
        const [mostVisited, mostControversial, highestLikeRate, mostActiveUsers, medianAbbreviation] = await Promise.all([
            fetchStatistics(API_ENDPOINTS.mostVisited, 'mostVisited'),
            fetchStatistics(API_ENDPOINTS.mostControversial, 'mostControversial'),
            fetchStatistics(API_ENDPOINTS.highestLikeRate, 'highestLikeRate'),
            fetchStatistics(API_ENDPOINTS.mostActiveUsers, 'mostActiveUsers'),
            fetchStatistics(API_ENDPOINTS.medianAbbreviation, 'medianAbbreviation')
        ]);

        renderMostVisited(mostVisited);
        renderMostControversial(mostControversial);
        renderHighestLikeRate(highestLikeRate);
        renderMostActiveUsers(mostActiveUsers);
        renderMedianAbbreviation(medianAbbreviation);

    } catch (error) {
        console.error('Error loading statistics:', error);
        showError('Failed to load statistics. Please try again.');
    } finally {
        hideLoading();
    }
}

document.querySelector('.hamburger').addEventListener('click', function() {
    document.querySelector('.navigator').classList.toggle('active');
});

document.addEventListener('DOMContentLoaded', function() {
    loadAllStatistics();
});
setInterval(loadAllStatistics, 300000);