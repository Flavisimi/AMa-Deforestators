// Hamburger menu toggle
document.querySelector('.hamburger').addEventListener('click', function() {
    document.querySelector('.navigator').classList.toggle('active');
});

// Profile menu toggle
document.querySelector('.user-profile').addEventListener('click', function(e) {
    e.stopPropagation();
    this.querySelector('.profile-menu').classList.toggle('active');
});

// Close profile menu on outside click
document.addEventListener('click', function(e) {
    const profileMenu = document.querySelector('.profile-menu');
    if (!profileMenu.contains(e.target) && profileMenu.classList.contains('active')) {
        profileMenu.classList.remove('active');
    }
});

// Fetch meanings for an abbreviation
function fetchMeanings(abbrId) {
    fetch(`/abbreviations?id=${abbrId}`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            const placeholder = document.querySelector('.content-placeholder');
            placeholder.innerHTML = '';
            if (data && data.meanings && data.meanings.length > 0) {
                const meaningsDiv = document.createElement('div');
                meaningsDiv.className = 'search-results';
                data.meanings.forEach(meaning => {
                    const meaningP = document.createElement('p');
                    meaningP.innerHTML = `
                        <strong>${data.searchable_name}</strong>: ${meaning.short_expansion}<br>
                        ${meaning.description}<br>
                        Status: ${meaning.approval_status}, Language: ${meaning.lang}, Domain: ${meaning.domain}
                    `;
                    meaningsDiv.appendChild(meaningP);
                });
                placeholder.appendChild(meaningsDiv);
            } else {
                placeholder.innerHTML = '<p>No meanings found</p>';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to fetch meanings');
        });
}

// Search button handler
document.querySelector('.search-button').addEventListener('click', function() {
    const searchTerm = document.querySelector('#search-bar').value.trim();
    const searchType = document.querySelector('#search-type').value;
    if (!searchTerm) {
        alert('Please enter a search term');
        return;
    }

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
        const placeholder = document.querySelector('.content-placeholder');
        placeholder.innerHTML = '';
        if (data.success && data.results.length > 0) {
            const resultsDiv = document.createElement('div');
            resultsDiv.className = 'search-results';
            data.results.forEach(result => {
                const resultP = document.createElement('p');
                const abbrLink = document.createElement('a');
                abbrLink.href = '#';
                abbrLink.textContent = result.searchable_name;
                abbrLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    fetchMeanings(result.id);
                });
                resultP.appendChild(abbrLink);
                const distanceText = searchType === 'name' ? ` [Distance: ${result.distance}]` : '';
                resultP.innerHTML += `${distanceText} (Meanings: ${result.meaning_count})`;
                resultsDiv.appendChild(resultP);
            });
            placeholder.appendChild(resultsDiv);
        } else {
            placeholder.innerHTML = '<p>No results found</p>';
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Search failed');
    });
});