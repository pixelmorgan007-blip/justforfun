const ADMIN_USER = '978504';
const ADMIN_PASS = '9766348617';
const loggedInKey = 'photoUPAdminLoggedIn';
const photoStorageKey = 'photoUPGallery';
const noticeStorageKey = 'photoUPNotice';

const defaultPhotos = [
  { name: 'Cat.jpg', url: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=900&q=80' },
  { name: 'Beach.png', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80' },
  { name: 'Sunset.jpg', url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80' },
  { name: 'Mountain.png', url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=900&q=80' },
  { name: 'Flower.jpg', url: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=80' }
];

function getStoredPhotos() {
  const stored = localStorage.getItem(photoStorageKey);
  if (!stored) return defaultPhotos.slice();
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : defaultPhotos.slice();
  } catch {
    return defaultPhotos.slice();
  }
}

function savePhotos(photos) {
  localStorage.setItem(photoStorageKey, JSON.stringify(photos));
}

function getStoredNotice() {
  return localStorage.getItem(noticeStorageKey) || '';
}

function saveNotice(value) {
  localStorage.setItem(noticeStorageKey, value);
}

function isAdminLoggedIn() {
  return localStorage.getItem(loggedInKey) === 'true';
}

function setAdminLoggedIn(value) {
  localStorage.setItem(loggedInKey, value ? 'true' : 'false');
}

function getStorageSizeInfo() {
  try {
    const stored = localStorage.getItem(photoStorageKey);
    const sizeInBytes = stored ? new Blob([stored]).size : 0;
    const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
    return { sizeInBytes, sizeInMB, maxMB: 5 };
  } catch {
    return { sizeInBytes: 0, sizeInMB: 0, maxMB: 5 };
  }
}

function initLoginPage() {
  if (isAdminLoggedIn()) {
    window.location.href = 'admin.html';
    return;
  }

  const form = document.getElementById('loginForm');
  const status = document.getElementById('loginStatus');

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (username === ADMIN_USER && password === ADMIN_PASS) {
      setAdminLoggedIn(true);
      window.location.href = 'admin.html';
    } else {
      status.textContent = 'Incorrect admin username or password.';
    }
  });
}

function renderPhotoList() {
  const list = document.getElementById('photoList');
  const photos = getStoredPhotos();
  list.innerHTML = '';

  if (!photos.length) {
    list.innerHTML = '<p class="empty-state">No uploaded photos yet.</p>';
    return;
  }

  photos.forEach((photo, index) => {
    const item = document.createElement('li');
    item.className = 'admin-photo-item';
    item.innerHTML = `
      <span>${photo.name}</span>
      <div>
        <a href="${photo.url}" target="_blank" rel="noreferrer">Preview</a>
        <button type="button" class="danger" data-index="${index}">Remove</button>
      </div>
    `;
    list.appendChild(item);
  });

  list.querySelectorAll('button[data-index]').forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.index);
      const photos = getStoredPhotos();
      photos.splice(index, 1);
      savePhotos(photos);
      renderPhotoList();
    });
  });
}

function initAdminPage() {
  if (!isAdminLoggedIn()) {
    window.location.href = 'admin-login.html';
    return;
  }

  const noticeTextarea = document.getElementById('noticeTextarea');
  const noticeSave = document.getElementById('saveNoticeButton');
  const nameInput = document.getElementById('photoName');
  const urlInput = document.getElementById('photoUrl');
  const addPhotoButton = document.getElementById('addPhotoButton');
  const status = document.getElementById('adminStatus');
  const logoutButton = document.getElementById('logoutButton');
  const goToGallery = document.getElementById('goToGalleryButton');

  noticeTextarea.value = getStoredNotice();
  renderPhotoList();

  noticeSave.addEventListener('click', () => {
    saveNotice(noticeTextarea.value.trim());
    status.textContent = '✓ Notice saved permanently.';
    status.style.color = '#10b981';
  });

  addPhotoButton.addEventListener('click', () => {
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();

    if (!name || !url) {
      status.textContent = 'Please enter both a photo name and image URL.';
      status.style.color = '#dc2626';
      return;
    }

    const photos = getStoredPhotos();
    photos.unshift({ name, url });
    try {
      savePhotos(photos);
      const { sizeInMB } = getStorageSizeInfo();
      status.textContent = `✓ Photo saved permanently! (${sizeInMB}MB used)`;
      status.style.color = '#10b981';
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        status.textContent = 'Storage full. Please remove some photos.';
        status.style.color = '#dc2626';
        return;
      }
      status.textContent = 'Could not save photo. Please try again.';
      status.style.color = '#dc2626';
      return;
    }
    renderPhotoList();
    nameInput.value = '';
    urlInput.value = '';
  });

  logoutButton.addEventListener('click', () => {
    setAdminLoggedIn(false);
    window.location.href = 'admin-login.html';
  });

  goToGallery.addEventListener('click', () => {
    window.location.href = 'photoUP.html';
  });
}

window.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('loginForm')) {
    initLoginPage();
  }

  if (document.getElementById('adminPanel')) {
    initAdminPage();
  }
});
