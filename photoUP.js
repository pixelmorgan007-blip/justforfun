const photoStorageKey = 'photoUPGallery';
const noticeStorageKey = 'photoUPNotice';

const defaultPhotos = [
  { name: 'Cyber Neon.jpg', url: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=900&q=80', isVideo: false },
  { name: 'Ocean Stream.mp4', url: 'https://assets.mixkit.co/videos/preview/mixkit-waves-breaking-in-the-ocean-1527-large.mp4', isVideo: true },
  { name: 'Sunset Dream.jpg', url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80', isVideo: false },
  { name: 'Mountain Flight.mp4', url: 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-thick-snow-covered-forest-42200-large.mp4', isVideo: true },
  { name: 'Botanical Liquid.jpg', url: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=900&q=80', isVideo: false }
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

function getStoredNotice() {
  return localStorage.getItem(noticeStorageKey) || 'iOS 26 Liquid Core Active. Streaming Engine Online.';
}

function savePhotos(photos) {
  localStorage.setItem(photoStorageKey, JSON.stringify(photos));
}

function loadNotice() {
  document.getElementById('noticeText').textContent = getStoredNotice();
}

function checkIsVideo(name, url) {
  const target = (name + ' ' + url).toLowerCase();
  return target.includes('.mp4') || target.includes('.webm') || target.includes('.mov') || url.startsWith('data:video/');
}

function displayGallery(filteredPhotos) {
  const gallery = document.getElementById('gallery');
  gallery.innerHTML = '';

  if (!filteredPhotos.length) {
    gallery.innerHTML = `
      <div class="empty-state-card">
        <p>No matches discovered within active partitions.</p>
      </div>
    `;
    return;
  }

  filteredPhotos.forEach((item) => {
    const card = document.createElement('div');
    card.className = `masonry-item ${item.isVideo ? 'video-type' : 'photo-type'}`;
    
    // Dynamic media parsing based on element flags
    const mediaTag = item.isVideo 
      ? `<video src="${item.url}" muted loop playsinline preload="metadata"></video><span class="media-badge">VIDEO</span>`
      : `<img src="${item.url}" alt="${item.name}" loading="lazy" />`;

    card.innerHTML = `
      <div class="media-wrapper">${mediaTag}</div>
      <div class="item-meta">
        <span class="item-title">${item.name}</span>
      </div>
    `;
    
    // Mouse hover preview configurations for videos on desktop
    const videoElement = card.querySelector('video');
    if (videoElement) {
      card.addEventListener('mouseenter', () => videoElement.play().catch(()=>{}));
      card.addEventListener('mouseleave', () => {
        videoElement.pause();
        videoElement.currentTime = 0;
      });
    }

    card.addEventListener('click', () => openModal(item));
    gallery.appendChild(card);
  });
}

function openModal(item) {
  const modal = document.getElementById('photoModal');
  const viewport = document.getElementById('modalViewport');
  const modalCaption = document.getElementById('modalCaption');
  const downloadButton = document.getElementById('downloadButton');

  // Inject structural viewport context elements 
  if (item.isVideo) {
    viewport.innerHTML = `<video src="${item.url}" controls autoplay loop playsinline class="modal-media-target"></video>`;
  } else {
    viewport.innerHTML = `<img src="${item.url}" alt="${item.name}" class="modal-media-target" />`;
  }

  modalCaption.textContent = item.name;
  downloadButton.href = item.url;
  downloadButton.download = item.name;
  
  modal.classList.add('visible');
  modal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  const modal = document.getElementById('photoModal');
  const viewport = document.getElementById('modalViewport');
  viewport.innerHTML = ''; // Kill media buffering loops immediately
  modal.classList.remove('visible');
  modal.setAttribute('aria-hidden', 'true');
}

function updateResultsText(count, query) {
  const info = document.getElementById('resultsInfo');
  info.textContent = query ? `${count} variants isolated for "${query}"` : `${count} active cloud entities distributed.`;
}

function filterPhotos(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return getStoredPhotos();
  return getStoredPhotos().filter(p => p.name.toLowerCase().includes(normalized));
}

function setUploadStatus(message, type = 'info') {
  const uploadStatus = document.getElementById('uploadStatus');
  uploadStatus.textContent = message;
  uploadStatus.className = `runtime-status color-${type}`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('File reading stream broken'));
    reader.readAsDataURL(file);
  });
}

function refreshGallery(query) {
  const searchQuery = typeof query === 'string' ? query : document.getElementById('searchInput').value;
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

  searchInput.addEventListener('input', () => refreshGallery(searchInput.value));

  // Dynamic monitoring context label for local uploads
  uploadFile.addEventListener('change', () => {
    if (uploadFile.files[0]) {
      document.querySelector('.custom-file-label').innerHTML = `✓ ${uploadFile.files[0].name}`;
    }
  });

  uploadButton.addEventListener('click', async () => {
    const name = uploadName.value.trim();
    const url = uploadUrl.value.trim();
    const file = uploadFile.files[0];

    if (!name) {
      setUploadStatus('Process terminated: Assign asset signature name.', 'error');
      return;
    }

    if (!file && !url) {
      setUploadStatus('Data source trace empty: Bind file stream or enter URL endpoint.', 'error');
      return;
    }

    let resolvedUrl = url;
    let computedVideoFlag = checkIsVideo(name, url);

    if (file) {
      computedVideoFlag = file.type.startsWith('video/');
      try {
        setUploadStatus('Encoding file stream blocks...', 'info');
        resolvedUrl = await readFileAsDataUrl(file);
      } catch {
        setUploadStatus('System crash: Stream translation failure.', 'error');
        return;
      }
    }

    const photos = getStoredPhotos();
    photos.unshift({ name, url: resolvedUrl, isVideo: computedVideoFlag });
    
    try {
      savePhotos(photos);
      setUploadStatus('✓ Asset integrated cleanly into structural array.', 'success');
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        setUploadStatus('Domain write failed: Local browser sandboxed storage array full.', 'error');
        return;
      }
      setUploadStatus('Write failure: Matrix collision.', 'error');
      return;
    }

    refreshGallery(searchInput.value);
    
    // Clear elements smoothly
    uploadName.value = '';
    uploadUrl.value = '';
    uploadFile.value = '';
    document.querySelector('.custom-file-label').innerHTML = `<span class="upload-icon">✦</span> Choose Local Media`;
  });

  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('photoModal').addEventListener('click', (e) => {
    if (e.target.id === 'photoModal') closeModal();
  });
}

window.addEventListener('DOMContentLoaded', initGallery);
