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
  } catch (error) {
    return defaultPhotos.slice();
  }
}

function getStoredNotice() {
  return localStorage.getItem(noticeStorageKey) || 'Welcome to PhotoUP. Search by image name like Cat.jpg or Beach.png.';
}

function savePhotos(photos) {
  localStorage.setItem(photoStorageKey, JSON.stringify(photos));
}

function loadNotice() {
  document.getElementById('noticeText').textContent = getStoredNotice();
}

function displayGallery(filteredPhotos) {
  const gallery = document.getElementById('gallery');
  gallery.innerHTML = '';

  if (!filteredPhotos.length) {
    gallery.innerHTML = '<p class="empty-state">No images match that search. Try "Cat.jpg" or "Beach.png".</p>';
    return;
  }

  filteredPhotos.forEach((photo) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'photo-card';
    card.innerHTML = `
      <img src="${photo.url}" alt="${photo.name}" loading="lazy" />
      <div class="photo-name">${photo.name}</div>
    `;
    card.addEventListener('click', () => openModal(photo));
    gallery.appendChild(card);
  });
}

function openModal(photo) {
  const modal = document.getElementById('photoModal');
  const modalImage = document.getElementById('modalImage');
  const modalCaption = document.getElementById('modalCaption');
  const downloadButton = document.getElementById('downloadButton');

  modalImage.src = photo.url;
  modalImage.alt = photo.name;
  modalCaption.textContent = photo.name;
  downloadButton.href = photo.url;
  downloadButton.download = photo.name;
  modal.classList.add('visible');
  modal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  const modal = document.getElementById('photoModal');
  modal.classList.remove('visible');
  modal.setAttribute('aria-hidden', 'true');
}

function updateResultsText(count, query) {
  const info = document.getElementById('resultsInfo');
  if (!query) {
    info.textContent = `${count} photos available.`;
    return;
  }
  info.textContent = `${count} result(s) for "${query}".`;
}

function filterPhotos(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return getStoredPhotos();
  }
  return getStoredPhotos().filter((photo) => photo.name.toLowerCase().includes(normalized));
}

function setUploadStatus(message, type = 'info') {
  const uploadStatus = document.getElementById('uploadStatus');
  uploadStatus.textContent = message;
  uploadStatus.style.color = type === 'error' ? '#dc2626' : type === 'success' ? '#10b981' : '#38bdf8';
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

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function refreshGallery(query) {
  const searchQuery = query || document.getElementById('searchInput').value;
  const results = filterPhotos(searchQuery);
  displayGallery(results);
  updateResultsText(results.length, searchQuery);
}

async function initGallery() {
  loadNotice();
  const searchInput = document.getElementById('searchInput');
  const uploadName = document.getElementById('uploadName');
  const uploadUrl = document.getElementById('uploadUrl');
  const uploadFile = document.getElementById('uploadFile');
  const uploadButton = document.getElementById('uploadButton');

  refreshGallery('');

  searchInput.addEventListener('input', () => {
    refreshGallery(searchInput.value);
  });

  uploadButton.addEventListener('click', async () => {
    const name = uploadName.value.trim();
    const url = uploadUrl.value.trim();
    const file = uploadFile.files[0];

    if (!name) {
      setUploadStatus('Please enter a photo name.', 'error');
      return;
    }

    if (!file && !url) {
      setUploadStatus('Please provide an image URL or choose a local file.', 'error');
      return;
    }

    let photoUrl = url;
    if (file) {
      if (!file.type.startsWith('image/')) {
        setUploadStatus('Only image files are allowed.', 'error');
        return;
      }
      try {
        photoUrl = await readFileAsDataUrl(file);
      } catch (error) {
        setUploadStatus('Could not read the selected image.', 'error');
        return;
      }
    }

    const photos = getStoredPhotos();
    photos.unshift({ name, url: photoUrl });
    try {
      savePhotos(photos);
      const { sizeInMB } = getStorageSizeInfo();
      setUploadStatus(`✓ Photo saved permanently! (${sizeInMB}MB used)`, 'success');
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        setUploadStatus('Storage full. Try removing photos or using image URLs instead of local files.', 'error');
        return;
      }
      setUploadStatus('Could not save photo. Please try again.', 'error');
      return;
    }
    refreshGallery(searchInput.value);
    uploadName.value = '';
    uploadUrl.value = '';
    uploadFile.value = '';
  });

  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('photoModal').addEventListener('click', (event) => {
    if (event.target.id === 'photoModal') closeModal();
  });
}

window.addEventListener('DOMContentLoaded', initGallery);
