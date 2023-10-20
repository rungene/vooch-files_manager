document.addEventListener('DOMContentLoaded', () => {
  const registrationForm = document.getElementById('registration-form');
  const errorMessage = document.getElementById('error-message');
  const userRegistration = document.getElementById('user-registration');

  registrationForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      const response = await fetch('/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (response.status === 201) {
        // Registration successful
        userRegistration.innerHTML = 'User Registered Successfully';
        setTimeout(() => {
          window.location.href = '/login.html';
        }, 2000);
        console.log('User registered successfully:', data);
      } else {
        // Registration failed
        errorMessage.textContent = data.error || 'Registration failed';
      }
    } catch (error) {
      console.error('Error during registration:', error);
      errorMessage.textContent = 'An error occurred during registration';
    }
  });
});
