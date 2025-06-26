const API_ENDPOINTS = {
    mostVisited: '/statistics/most_visited',
    mostControversial: '/statistics/most_controversial', 
    highestLikeRate: '/statistics/highest_like_rate',
    mostActiveUsers: '/statistics/most_active_users',
    medianAbbreviation: '/statistics/median_abbreviation'
};

function showLoading() {
    document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

function showError(message) {
    const errorElement = document.getElementById('error-message');
    errorElement.textContent = escapeHtml(message);
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

    data = data.slice(0, 10);

    container.innerHTML = data.map((item, index) => `
        <li class="stat-item">
            <div class="stat-item-div">
                <span class="rank-number ${getRankClass(index)}">${index + 1}</span>
                <span class="stat-name">${item.searchable_name}</span>
            </div>
            <span class="stat-value visited">${item.visits || 0}</span>
        </li>
    `).join('');
}

function renderMostControversial(data) {
    const container = document.getElementById('most-controversial-list');
    if (!data || data.length === 0) {
        container.innerHTML = '<li class="stat-item"><span class="stat-name">No data available</span></li>';
        return;
    }

    data = data.slice(0, 10);

    container.innerHTML = data.map((item, index) => `
        <li class="stat-item">
            <div class="stat-item-div">
                <span class="rank-number ${getRankClass(index)}">${index + 1}</span>
                <span class="stat-name">${escapeHtml(item.name)}</span>
            </div>
            <span class="stat-value controversial">${parseFloat(item.controversy).toFixed(2) || 0}</span>
        </li>
    `).join('');
}

function renderHighestLikeRate(data) {
    const container = document.getElementById('highest-like-rate-list');
    if (!data || data.length === 0) {
        container.innerHTML = '<li class="stat-item"><span class="stat-name">No data available</span></li>';
        return;
    }

    data = data.slice(0, 10);

    container.innerHTML = data.map((item, index) => `
        <li class="stat-item">
            <div class="stat-item-div">
                <span class="rank-number ${getRankClass(index)}">${index + 1}</span>
                <span class="stat-name">${escapeHtml(item.name)}</span>
            </div>
            <span class="stat-value liked">${Math.round((item.like_rate || 0) * 100)}%</span>
        </li>
    `).join('');
}

function renderMostActiveUsers(data) {
    const container = document.getElementById('most-active-users-list');
    if (!data || data.length === 0) {
        container.innerHTML = '<li class="stat-item"><span class="stat-name">No data available</span></li>';
        return;
    }

    data = data.slice(0, 10);

    container.innerHTML = data.map((item, index) => `
        <li class="stat-item">
            <div class="stat-item-div">
                <span class="rank-number ${getRankClass(index)}">${index + 1}</span>
                <span class="stat-name">${escapeHtml(item.name)}</span>
            </div>
            <span class="stat-value active">${parseFloat(item.activity).toFixed(2) || 0}</span>
        </li>
    `).join('');
}

function renderMedianAbbreviation(data) {
    const container = document.getElementById('median-abbreviation-list');
    if (!data || data.length === 0) {
        container.innerHTML = '<li class="stat-item"><span class="stat-name">No data available</span></li>';
        return;
    }

    data = data.slice(0, 10);

    container.innerHTML = data.map((item, index) => `
        <li class="stat-item">
            <div class="stat-item-div">
                <span class="rank-number ${getRankClass(index)}">${index + 1}</span>
                <span class="stat-name">${item.searchable_name}</span>
            </div>
        </li>
    `).join('');
}

async function fetchStatistics(endpoint, key, format = "json") {
    try {
        endpoint = endpoint + "?format=" + format;

        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin' 
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error response: ${errorText}`);
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }

        if(format == "json")
            return await response.json();
        else
            return await response.blob();
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

async function initialize()
{
    document.querySelectorAll('.stat-card').forEach((elem, key, parent) =>
    {
        const actions = document.createElement("div");
        actions.setAttribute("class", "stat-actions");
        actions.innerHTML = `
            <button class="export-btn action-btn" type="button">
                Export as CSV
            </button>
            <button class="export-btn action-btn" type="button">
                Export as PDF
            </button>
            `;

        const buttons = actions.querySelectorAll("button");
        buttons[0].addEventListener("click", ev => {handleExport(ev.target, "csv")} );
        buttons[1].addEventListener("click", ev => {handleExport(ev.target, "pdf")} );
        elem.appendChild(actions);
    });

    document.querySelector(".refresh-btn").addEventListener("click", ev => loadAllStatistics());

    loadAllStatistics();
}

async function handleExport(btn, type)
{
    if(type != "pdf" && type != "csv")
        return;

    const statList = btn.closest(".stat-card").querySelector(".stat-list");

    let endpoint = "";
    switch(statList.id)
    {
        case "most-visited-list": {endpoint = API_ENDPOINTS.mostVisited; break;}
        case "most-controversial-list": {endpoint = API_ENDPOINTS.mostControversial; break;}
        case "highest-like-rate-list": {endpoint = API_ENDPOINTS.highestLikeRate; break;}
        case "median-abbreviation-list": {endpoint = API_ENDPOINTS.medianAbbreviation; break;}
        case "most-active-users-list": {endpoint = API_ENDPOINTS.mostActiveUsers; break;}
        default: {showError("Couldn't identify statistics type for export."); return;}
    }

    let data = await fetchStatistics(endpoint, statList.id, type);

    const link = document.createElement("a");
    link.href = URL.createObjectURL(data);
    link.download = statList.id + "." + type;
    link.click();

    URL.revokeObjectURL(link.href);
}

document.addEventListener('DOMContentLoaded', function() {
    initialize();
});

setInterval(loadAllStatistics, 300000);