async function getUserEmailFromToken(token) {
  try {
    const response = await fetch('/users/me', {
      method: 'GET',
      headers: {
        'X-Token': token,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    if (response.status === 200) {
      const { email } = data;
      return email;
    }
    return data.error || 'Error retrieving email';
  } catch (error) {
    console.error('Error retrieving email', error);
    return 'Error occured during email retrieval';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const userEmail = document.getElementById('user-email-home');
  const logoutBtn = document.getElementById('logout-btn');
  const errorMessage = document.getElementById('error-message');
  const authToken = localStorage.getItem('authToken');
  if (authToken) {
    userEmail.textContent = getUserEmailFromToken(authToken);
  }
  logoutBtn.addEventListener('click', async () => {
    localStorage.removeItem('authToken');

    try {
      const response = await fetch('/disconnect', {
        method: 'POST',
        headers: {
          'X-Token': authToken,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();

      if (response.status === 204) {
        // Logout success
        console.log('User logged out sucessfully');
        window.location.href = '/login.html';
      } else {
        // Logout failed
        errorMessage.textContent = data.error || 'Logout Failed';
        console.log('Logout failed');
      }
    } catch (error) {
      console.error('Error during logout:', error);
      errorMessage.textContent = 'An error occurred during logout';
    }
  });
});
