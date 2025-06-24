document.addEventListener('DOMContentLoaded', function() {
    console.log('register.js loaded'); 
    const form = document.getElementById('register-form');
    if (!form) 
    {
        console.error('Register form not found');
        return;
    }
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('Form submitted'); 
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        if (username.trim() === '' || email.trim() === '' || password.trim() === '' || confirmPassword.trim() === '') 
        {
            console.log('Validation failed: Empty fields');
            showError('Please fill in all fields.');
            return;
        }
        if (password !== confirmPassword) 
        {
            console.log('Validation failed: Passwords do not match'); 
            showError('Passwords do not match.');
            return;
        }
        if (password.length < 6) 
        {
            console.log('Validation failed: Password too short'); 
            showError('Password must be at least 6 characters long.');
            return;
        }
        const formData = new FormData();
        formData.append('username', username);
        formData.append('email', email);
        formData.append('password', password);
        console.log('Sending fetch to php/register.php'); 
        fetch('/php/register.php', 
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
                console.log('Registration successful, redirecting to index.html');
                window.location.href = '/';
            } 
            else 
            {
                console.log('Registration failed:', data.error); 
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
        const form = document.getElementById('register-form');
        if (form) form.parentNode.insertBefore(errorDiv, form);
        else console.error('Form not found for error display'); 
    }
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}