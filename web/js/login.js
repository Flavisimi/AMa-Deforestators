document.getElementById('login-form').addEventListener('submit', function(e) {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username.trim() === '' || password.trim() === '') {
        e.preventDefault();
        alert('Please fill in both username and password.');
    }
});