document.getElementById('registrationForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const response = await fetch('/users', {
      method: 'Post',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();

    if (response.ok) {
      // Successful Registration
      document.getElementById('message').innerText = `User with email ${data.email} has been registered with ID ${data.id}`;
    } else {
      document.getElementById('message').innerText = data.error;
    }
  } catch (error) {
    console.error('Error', error);
    document.getElementById('message').innerText = 'An error occured during registration';
  }
});
