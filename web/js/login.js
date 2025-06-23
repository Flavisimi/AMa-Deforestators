document.addEventListener('DOMContentLoaded', function() {
    console.log('login.js loaded'); 
    const form = document.getElementById('login-form');
    if (!form) {
        console.error('Login form not found');
        return;
    }

    form.addEventListener('submit', function(e) {
        e.preventDefault(); 
        console.log('Form submitted'); 

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (username.trim() === '' || password.trim() === '') 
        {
            console.log('Validation failed: Empty fields'); 
            showError('Please fill in both username and password.');
            return;
        }

        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        console.log('Sending fetch to php/login.php');
        fetch('/php/login.php', 
        {
            method: 'POST',
            body: formData
        })
        .then(response => 
        {
            console.log('Fetch response received:', response.status); 
            if (!response.ok) throw new Error('Network response was not ok: ' + response.status);
            return response.json();
        })
        .then(data => 
        {
            console.log('JSON response:', data); 
            if (data.success) 
            {
                console.log('Login successful, redirecting to dashboard.php');
                window.location.href = 'main';
            } 
            else
            {
                console.log('Login failed:', data.error); 
                showError(data.error || 'An unexpected error occurred.');
            }
        })
        .catch(error => 
        {
            console.error('Fetch error:', error); 
            showError('An error occurred while processing your request.');
        });
    });
});

function showError(message) {
    console.log('Displaying error:', message); 
    let errorDiv = document.querySelector('.error-message');
    if (!errorDiv) 
    {
        errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        const form = document.getElementById('login-form');
        if (form) form.parentNode.insertBefore(errorDiv, form);
        else console.error('Form not found for error display'); 
    }
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}