async function absoluteFilePath(id) {
  const authToken = localStorage.getItem('authToken');
  const apiUrl = `/files/${id}/data`;

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-Token': authToken,
        'Content-Type': 'application/json',
      },
    });
    // Server response
    if (response.status === 200) {
      return response.blob();
    }
    console.error('Error retrieving file Path', response.status);
  } catch (error) {
    console.error('Error during path retrieval', error);
  }
  return null;
}
function handleImageBlobs(file, blobUrl, listItem) {
  const imageContainer = document.createElement('div');
  const image = document.createElement('img');
  const spinner = document.getElementById('loading-spinner');
  const fixedWidth = 200;
  const fixedHeight = 150;
  image.style.width = `${fixedWidth}px`;
  image.style.height = `${fixedHeight}px`;
  image.style.display = 'none';
  image.src = blobUrl;
  image.alt = 'Image Preview';
  image.onload = () => {
    spinner.style.display = 'none';
    image.style.display = 'block';
  };
  image.onerror = () => {
    spinner.style.display = 'none';
    const errorImg = document.createElement('img');
    errorImg.src = 'images/error-image.png';
    errorImg.alt = 'Failed to Load Image';
    listItem.appendChild(errorImg);
  };
  const downloadBtn = document.createElement('button');
  downloadBtn.textContent = 'Download';
  downloadBtn.addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = file.name;
    a.click();
  });
  imageContainer.appendChild(image);
  listItem.appendChild(imageContainer);
  listItem.appendChild(downloadBtn);
  // display the spinner initially
  spinner.style.display = 'block';
}

function handleFileBlobs(file, blobUrl, listItem) {
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = file.name;
  a.textContent = 'Download File';
  listItem.appendChild(a);
}

async function fetchFile(id) {
  const authToken = localStorage.getItem('authToken');
  const apiUrl = `/files/${id}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-Token': authToken,
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    if (response.status === 200) {
      console.log('Document retrieved successfuly', data);
      return data;
    }
    console.error('Error fetching files', data.error);
    return null;
  } catch (error) {
    console.error('Error retrieving document:', error);
  }
  return null;
}

function updateFormFields(fileData) {
  document.getElementById('file-name').value = fileData.name;
  document.getElementById('file-type').value = fileData.type;
  document.getElementById('parent-id').value = fileData.parentId;
  document.getElementById('is-public').checked = fileData.isPublic;
  document.getElementById('file-id').value = fileData.id;
}

async function updateFormWithFileData(fileId) {
  try {
    const existingFileData = await fetchFile(fileId);
    if (existingFileData) {
      updateFormFields(existingFileData);
      document.getElementById('file-upload-form').scrollIntoView({ behavior: 'smooth' });
    } else {
      console.error('Unable to fetch file data');
    }
  } catch (error) {
    console.error('Error while updating form with file data:', error);
  }
}

async function updateBtn(idFile, listItem) {
  const updateButton = document.createElement('button');
  updateButton.textContent = 'Update';
  updateButton.addEventListener('click', async () => {
    const fileId = idFile;
    if (fileId) {
      updateFormWithFileData(fileId);
    } else {
      console.error('File Id required for updating');
    }
  });
  listItem.appendChild(updateButton);
}

async function deleteBtn(id, listItem) {
  const authToken = localStorage.getItem('authToken');
  const apiUrl = `/files/${id}`;
  const confirmationModal = document.getElementById('confirmationModal');
  const confirmDelBtn = document.getElementById('confirmDelete');
  const cancelDelBtn = document.getElementById('cancelDelete');
  const deleteButton = document.createElement('button');
  const errorMessage = document.getElementById('error-message');
  const successMessage = document.getElementById('success-message');
  deleteButton.textContent = 'Delete';
  deleteButton.addEventListener('click', async () => {
    confirmationModal.style.display = 'block';
    confirmDelBtn.addEventListener('click', async () => {
      try {
        const response = await fetch(apiUrl, {
          method: 'DELETE',
          headers: {
            'X-Token': authToken,
            'Content-Type': 'application/json',
          },
        });
        if (response.status === 200) {
          successMessage.text = 'File deleted successfully';
          errorMessage.text = '';
        } else {
          errorMessage.textContent = 'Failed to delete file';
          successMessage.textContent = '';
        }
      } catch (error) {
        console.error('Error occured', error);
      }
      confirmationModal.style.display = 'none';
    });
    cancelDelBtn.addEventListener('click', () => {
      confirmationModal.style.display = 'none';
    });
  });
  listItem.appendChild(deleteButton);
}

async function fetchFiles(parentId, page) {
  const authToken = localStorage.getItem('authToken');
  const apiUrl = `/files?parentId=${parentId}&page=${page}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-Token': authToken,
        'Content-Type': 'application/json',
      },
    });
    // Handle server response
    const data = await response.json();
    if (response.status === 200) {
      const fileList = document.getElementById('file-list');
      await Promise.all(data.map(async (file) => {
        const divItem = document.createElement('div');
        const listItem = document.createElement('li');
        divItem.classList.add('file-item');
        listItem.textContent = `File name: ${file.name} Id: ${file.id} userId: ${file.userId} type: ${file.type} isPublic: ${file.isPublic} parentId: ${file.parentId}`;
        // const size = null;
        // const idFile = file.id;
        // updateBtn(idFile, listItem);
        const blob = await absoluteFilePath(file.id);
        const blobUrl = URL.createObjectURL(blob);
        if (file.type === 'image' && blob) {
          handleImageBlobs(file, blobUrl, listItem);
        } else {
          // handle other file types
          handleFileBlobs(file, blobUrl, listItem);
        }
        updateBtn(file.id, listItem);
        deleteBtn(file.id, listItem);
        divItem.appendChild(listItem);
        fileList.appendChild(divItem);
      }));
      // console.log('Files retrieved', data);
    } else {
      console.error('Error fetching files:');
    }
  } catch (error) {
    console.error('Error during file retrieval', error);
  }
}

function populatePageDropdown(totalPages, pageDropdown) {
  for (let i = 0; i < totalPages; i += 1) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = `Page ${i + 1}`;
    pageDropdown.appendChild(option);
  }
}

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
async function logout(logoutBtn, authToken) {
  const errorMessage = document.getElementById('error-message');
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
    logout(logoutBtn, authToken);
  } catch (error) {
    // Handle error while retrieving user email (e.g., redirect to login page)
    console.error('Error retrieving user email:', error);
    errorMessage.textContent = 'An error occurred while retrieving user email';
  }

  const fileUploadForm = document.getElementById('file-upload-form');
  const successMessage = document.getElementById('success-message');
  const previewImg = document.getElementById('preview');
  const fileInput = document.getElementById('file-input');

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    const reader = new FileReader();
    if (/\.(jpe?g|png|gif)$/i.test(file.name)) {
      reader.onload = () => {
        const image = new Image();
        image.height = 100;
        image.title = file.name;
        image.src = reader.result;
        previewImg.innerHTML = '';
        previewImg.appendChild(image);
      };
      reader.readAsDataURL(file);
    } else {
      previewImg.innerHTML = '';
    }
  });
  fileUploadForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const reader = new FileReader();
    let fileName = document.getElementById('file-name').value;
    const fileType = document.getElementById('file-type').value;
    const parentId = document.getElementById('parent-id').value || 0;
    const isPublic = document.getElementById('is-public').checked;
    const fileId = document.getElementById('file-id').value;
    const file = fileInput.files[0];
    const fileExt = file.name.split('.').pop();
    fileName = `${fileName}.${fileExt}`;

    reader.onerror = (event) => {
      // Handle errors here
      switch (event.target.error.code) {
        case event.target.error.NOT_FOUND_ERR:
          console.error('File not found!');
          break;
        case event.target.error.NOT_READABLE_ERR:
          console.error('File is not readbale');
          break;
        case event.target.error.ABORT_ERR:
          console.error('Read operation was aborted');
          break;
        default:
          console.error('An error occured while reading the file');
      }
    };

    if (file) {
      reader.onload = async () => {
        const base64Data = reader.result.split(',')[1];
        const apiEndpoint = fileId ? `/files/${fileId}` : '/files';

        // Make POST request to the server with the json data
        try {
          const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
              'X-Token': authToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: fileName,
              type: fileType,
              parentId,
              isPublic,
              data: fileType === 'file' || fileType === 'image' ? base64Data : null,
            }),
          });

          // Handle server response
          const data = await response.json();

          if (response.status === 201) {
            fileUploadForm.reset();
            previewImg.innerHTML = '';
            successMessage.textContent = 'File uploaded sucessfully';
            errorMessage.textContent = '';
          } else {
            errorMessage.textContent = data.error || 'File upload failed';
            successMessage.textContent = '';
          }
        } catch (error) {
          console.error('Error during file upload', error);
          errorMessage.textContent = 'An error occured during file upload';
          successMessage.textContent = '';
        }
      };
      // Read the file as Data URL triggering the onloaded event(above)
      reader.readAsDataURL(file);
    } else {
      errorMessage.textContent = 'Please select a file to upload';
      successMessage.textContent = '';
    }
  });
  const prevButton = document.getElementById('prev-button');
  const nextButton = document.getElementById('next-button');
  const pageDropdown = document.getElementById('page-dropdown');
  const totalPages = 10;
  populatePageDropdown(totalPages, pageDropdown);
  const parentId = 0;
  let currentPage = 0;
  fetchFiles(parentId, currentPage);

  prevButton.addEventListener('click', () => {
    if (currentPage > 0) {
      currentPage -= 1;
      fetchFiles(parentId, currentPage);
    }
  });

  nextButton.addEventListener('click', () => {
    if (currentPage < totalPages - 1) {
      currentPage += 1;
      fetchFiles(parentId, currentPage);
    }
  });

  pageDropdown.addEventListener('change', () => {
    currentPage = parseInt(pageDropdown.value, 10);
    fetchFiles(parentId, currentPage);
  });
});
