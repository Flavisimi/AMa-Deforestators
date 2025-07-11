document.getElementById('abbreviation-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const data = {
        name: formData.get('name').trim(),
        short_expansion: formData.get('short_expansion').trim(),
        description: formData.get('description').trim(),
        lang: formData.get('lang'),
        domain: formData.get('domain')
    };

    if (!data.name || !data.short_expansion || !data.description || !data.lang || !data.domain) {
        showError('Please fill in all required fields.');
        return;
    }

    document.getElementById('loading-overlay').style.display = 'flex';
    hideMessages();

    fetch('/api/abbreviations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => Promise.reject(err));
        }
        return response.json();
    })
    .then(result => {
        document.getElementById('loading-overlay').style.display = 'none';
        showSuccess('Abbreviation created successfully! Redirecting to dashboard...');
        document.getElementById('abbreviation-form').reset();
        
        setTimeout(() => {
            window.location.href = 'main';
        }, 1000);
    })
    .catch(error => {
        document.getElementById('loading-overlay').style.display = 'none';
        console.error('Error:', error);
        
        let errorMessage = 'Failed to create abbreviation. Please try again.';
        if (error && error.message) {
            errorMessage = error.message;
        } else if (error && typeof error === 'string') {
            errorMessage = error;
        }
        
        showError(errorMessage);
    });
});

function showSuccess(message) {
    const successDiv = document.getElementById('success-message');
    successDiv.textContent = escapeHtml(message);
    successDiv.style.display = 'block';
    successDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = escapeHtml(message);
    errorDiv.style.display = 'block';
    errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideMessages() {
    document.getElementById('success-message').style.display = 'none';
    document.getElementById('error-message').style.display = 'none';
}

document.querySelectorAll('.form-input, .form-textarea, .form-select').forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.style.transform = 'scale(1.02)';
    });
    
    input.addEventListener('blur', function() {
        this.parentElement.style.transform = 'scale(1)';
    });
});

document.querySelector(".extra-actions > button").onclick = (ev) =>
{
    const fileInput = document.createElement("input");
    fileInput.setAttribute("type", "file");
    
    fileInput.addEventListener("change", async ev => {
        hideMessages();
        const file = fileInput.files[0];
        // if(file.type != "text/csv")
        // {
        //     showError("Invalid file type!");
        //     return;
        // }

        const data = await file.text();

        fetch("/api/abbreviations/csv", {
            method: "POST",
            headers: {"Content-Type": "text/csv"},
            body: data
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => Promise.reject(err));
            }
            return response.json();
        })
        .then(result => {
            document.getElementById('loading-overlay').style.display = 'none';
            showSuccess(`Created ${result.count} abbreviations successfully! Redirecting to dashboard...`);
            document.getElementById('abbreviation-form').reset();
            
            setTimeout(() => {
                window.location.href = 'main';
            }, 1000);
        })
        .catch(error => {
            document.getElementById('loading-overlay').style.display = 'none';
            console.error('Error:', error);
            
            let errorMessage = 'Failed to submit CSV file. Please try again.';
            if (error && error.message) {
                errorMessage = error.message;
            } else if (error && typeof error === 'string') {
                errorMessage = error;
            }
            
            showError(errorMessage);
        });
    });

    fileInput.click();
}


document.addEventListener('DOMContentLoaded', () => {
    loadFilterOptions();
});