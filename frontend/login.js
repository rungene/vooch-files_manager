document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const errorMessage = document.getElementById('error-message');
  const userLogin = document.getElementById('user-login');

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const credentials = `${email}:${password}`;
    const encodedCredentials = btoa(credentials);

    try {
      const response = await fetch('/connect', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${encodedCredentials}`,
          'Content-Type': 'application/json',
        },
        // Add body if needed: body: JSON.stringify({ key: 'value' }),
      });

      const data = await response.json();
      const { token } = data;
      localStorage.setItem('authToken', token);
      if (response.status === 200) {
        // Login successful
        userLogin.innerHTML = `User with email: ${email} Logged In Successfully`;
        setTimeout(() => {
          window.location.href = '/home.html';
        }, 2000);
        console.log('User Logged in successfully:', data);
      } else {
        // Login failed
        errorMessage.textContent = data.error || 'Login failed';
      }
    } catch (error) {
      console.error('Error during login:', error);
      errorMessage.textContent = 'An error occurred during login';
    }
  });
});
