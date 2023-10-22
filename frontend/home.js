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

  if (!authToken) {
    // Handle the case where authToken is not available (user is not logged in)
    window.location.href = '/login.html';
    return;
  }

  try {
    const userEmailFromToken = await getUserEmailFromToken(authToken);
    userEmail.textContent = userEmailFromToken;

    logoutBtn.addEventListener('click', async () => {
      try {
        const response = await fetch('/disconnect', {
          method: 'POST',
          headers: {
            'X-Token': authToken,
            'Content-Type': 'application/json',
          },
        });

        if (response.status === 204) {
          // Logout success
          console.log('User logged out successfully');
          localStorage.removeItem('authToken');
          window.location.href = '/login.html';
        } else {
          // Logout failed
          errorMessage.textContent = 'Logout failed';
          console.log('Logout failed');
        }
      } catch (error) {
        console.error('Error during logout:', error);
        errorMessage.textContent = 'An error occurred during logout';
      }
    });
  } catch (error) {
    // Handle error while retrieving user email (e.g., redirect to login page)
    console.error('Error retrieving user email:', error);
    errorMessage.textContent = 'An error occurred while retrieving user email';
  }

  const fileUploadForm = document.getElementById('file-upload-form');
  const fileName = document.getElementById('file-name').value;
  const fileType = document.getElementById('file-type').value;
  const parentId = document.getElementById('parent-id').value || 0;
  const isPublic = document.getElementById('is-public').checked;
  const fileInput = document.getElementById('file-input');
  const file = fileInput.files[0];
  fileUploadForm.addEventListener('submit', async () => {
    event.preventDefault();
    const reader = new FileReader();
    reader.onloaded = async funtion() {
      const data = reader.result.split(',')[1];

      // Create a formData object, append form fields
      const formData = new FormData();
      formData.append('name', fileName);
      formData.append('type', fileType);
      formData.append('parentId', parentId);
      formData.append('isPublic', isPublic);
      formData.append('data', fileType === 'file' || fileType === 'image' ? data : null);

      // Make POST request to the server with the formData object
      try {
        const response = await fetch('/files', {
          method: 'POST',
          headers: {
            'X-Token': authToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            formData,
          )}
        });

        // Handle server response
        const data = await response.json();
      } catch (error) {
      
      }
    };
    // Read the file as Data URL triggering the onloaded event(above)
    reader.readAsDataURL(file);
  });
});
