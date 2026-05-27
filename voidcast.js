/* =====================================================
   VOIDCAST — script.js
   All interactivity: starfield, posts, modals, feed
   ===================================================== */

'use strict';

/* =====================================================
   1. STARFIELD ENGINE
   ===================================================== */
(function initStarfield() {
  const canvas = document.getElementById('starfield');
  const ctx = canvas.getContext('2d');
  let W, H, stars = [], shootingStars = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function randomStar() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 0.2,
      alpha: Math.random() * 0.7 + 0.3,
      speed: Math.random() * 0.008 + 0.002,
      phase: Math.random() * Math.PI * 2,
      color: randomStarColor(),
    };
  }

  function randomStarColor() {
    const palettes = [
      '#e8eaf6', '#b3c5ef', '#7986cb',
      '#4fc3f7', '#b39ddb', '#f48fb1',
      '#ffffff'
    ];
    return palettes[Math.floor(Math.random() * palettes.length)];
  }

  function initStars() {
    const count = Math.floor((W * H) / 3500);
    stars = Array.from({ length: count }, randomStar);
  }

  function spawnShootingStar() {
    shootingStars.push({
      x: Math.random() * W * 0.7,
      y: Math.random() * H * 0.4,
      len: Math.random() * 140 + 60,
      speed: Math.random() * 7 + 5,
      alpha: 1,
      angle: Math.PI / 5 + (Math.random() * 0.2 - 0.1),
      trail: [],
    });
  }

  function drawStars(t) {
    stars.forEach(s => {
      s.alpha = 0.3 + 0.6 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.globalAlpha = s.alpha;
      ctx.fill();

      // tiny glow for bigger stars
      if (s.r > 1.1) {
        ctx.beginPath();
        const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4);
        grd.addColorStop(0, s.color + '55');
        grd.addColorStop(1, 'transparent');
        ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.globalAlpha = s.alpha * 0.5;
        ctx.fill();
      }
    });
    ctx.globalAlpha = 1;
  }

  function drawShootingStars() {
    shootingStars = shootingStars.filter(ss => ss.alpha > 0.01);
    shootingStars.forEach(ss => {
      const dx = Math.cos(ss.angle) * ss.speed;
      const dy = Math.sin(ss.angle) * ss.speed;
      ss.trail.push({ x: ss.x, y: ss.y });
      if (ss.trail.length > 18) ss.trail.shift();
      ss.x += dx;
      ss.y += dy;
      ss.alpha -= 0.018;

      if (ss.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(ss.trail[0].x, ss.trail[0].y);
        ss.trail.forEach(pt => ctx.lineTo(pt.x, pt.y));
        ctx.strokeStyle = `rgba(200,230,255,${ss.alpha})`;
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.stroke();

        // head glow
        ctx.beginPath();
        ctx.arc(ss.x, ss.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(230,245,255,${ss.alpha})`;
        ctx.fill();
      }
    });
  }

  let lastShoot = 0;
  function animate(t) {
    ctx.clearRect(0, 0, W, H);
    drawStars(t * 0.001);
    drawShootingStars();

    if (t - lastShoot > 3200 && Math.random() < 0.35) {
      spawnShootingStar();
      lastShoot = t;
    }

    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', () => { resize(); initStars(); });
  resize();
  initStars();
  requestAnimationFrame(animate);
})();


/* =====================================================
   2. STATE
   ===================================================== */
const State = {
  username: localStorage.getItem('vc_username') || '',
  currentTab: 'text',
  currentFeed: 'all',
  mediaFile: null,
  mediaDataURL: null,
  posts: JSON.parse(localStorage.getItem('vc_posts') || '[]'),
  notifications: JSON.parse(localStorage.getItem('vc_notifications') || '[]'),
};

function savePosts() {
  // only save last 60 posts to keep localStorage light
  const toSave = State.posts.slice(0, 60).map(p => ({
    ...p,
    mediaDataURL: p.mediaDataURL ? p.mediaDataURL : null,
  }));
  localStorage.setItem('vc_posts', JSON.stringify(toSave));
}

function saveNotifications() {
  const toSave = State.notifications.slice(0, 100);
  localStorage.setItem('vc_notifications', JSON.stringify(toSave));
}

function addNotification(type, fromUser, postId, itemType, preview) {
  // Don't notify user about their own activity
  if (fromUser === State.username) return;

  const existingIdx = State.notifications.findIndex(n => 
    n.type === type && n.fromUser === fromUser && n.postId === postId && n.itemType === itemType
  );

  if (existingIdx !== -1) {
    // Update existing notification
    State.notifications[existingIdx].timestamp = new Date().toISOString();
    State.notifications[existingIdx].count = (State.notifications[existingIdx].count || 1) + 1;
    State.notifications.unshift(State.notifications.splice(existingIdx, 1)[0]);
  } else {
    // Add new notification
    State.notifications.unshift({
      type,
      fromUser,
      postId,
      itemType,
      preview,
      timestamp: new Date().toISOString(),
      count: 1,
    });
  }

  saveNotifications();
  updateNotificationBadge();
  renderNotifications();
}

function updateNotificationBadge() {
  const count = State.notifications.length;
  if (count > 0) {
    DOM.notificationBadge.textContent = count > 99 ? '99+' : count;
    DOM.notificationBadge.classList.remove('hidden');
  } else {
    DOM.notificationBadge.classList.add('hidden');
  }
}

function renderNotifications() {
  if (State.notifications.length === 0) {
    DOM.notificationsList.innerHTML = `
      <div class="notifications-empty">
        <div class="notifications-empty-icon">✦</div>
        <div>No activity yet</div>
      </div>
    `;
    return;
  }

  DOM.notificationsList.innerHTML = State.notifications.map((n, idx) => `
    <div class="notification-item">
      <div class="notification-avatar" style="background:${avatarStyle(n.fromUser).bg};color:${avatarStyle(n.fromUser).fg};border-color:${avatarStyle(n.fromUser).fg}33">
        ${avatarStyle(n.fromUser).initials}
      </div>
      <div class="notification-content">
        <div class="notification-user">@${escapeHTML(n.fromUser)}</div>
        <div class="notification-action">
          ${n.count > 1 ? `<strong>${n.count}</strong> ` : ''}
          ${n.type === 'like-post' ? '♥ liked your post' : 
            n.type === 'like-comment' ? '♥ liked your comment' : 
            n.type === 'like-reply' ? '♥ liked your reply' : n.type}
          <span class="action-type">(${n.itemType})</span>
        </div>
        <div class="notification-preview">"${escapeHTML(n.preview.substring(0, 60))}${n.preview.length > 60 ? '...' : ''}"</div>
        <div class="notification-time">${timeAgo(n.timestamp)}</div>
      </div>
    </div>
  `).join('');
}


/* =====================================================
   3. DOM REFS
   ===================================================== */
const $  = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

const DOM = {
  usernameModal:   $('username-modal'),
  usernameInput:   $('username-input'),
  usernameConfirm: $('username-confirm'),
  usernameError:   $('username-error'),
  headerUsername:  $('header-username'),
  editUsernameBtn: $('edit-username-btn'),

  postModal:       $('post-modal'),
  openPostModal:   $('open-post-modal'),
  closePostModal:  $('close-post-modal'),
  fabPost:         $('fab-post'),

  postText:        $('post-text'),
  charNum:         $('char-num'),
  dropZone:        $('drop-zone'),
  dropIcon:        $('drop-icon'),
  dropLabel:       $('drop-label'),
  fileInput:       $('file-input'),
  mediaUpload:     $('media-upload-area'),
  mediaPreview:    $('media-preview'),
  submitPost:      $('submit-post'),

  postFeed:        $('post-feed'),
  toast:           $('toast'),
  recentUsers:     $('recent-users'),

  commentsModal:   $('comments-modal'),
  closeCommentsModal: $('close-comments-modal'),
  commentsList:    $('comments-list'),
  commentInput:    $('comment-input'),
  submitComment:   $('submit-comment'),

  notificationsBtn: $('notifications-btn'),
  notificationsModal: $('notifications-modal'),
  closeNotificationsModal: $('close-notifications-modal'),
  notificationsList: $('notifications-list'),
  notificationBadge: $('notification-badge'),
};

let currentCommentingPostId = null;


/* =====================================================
   4. AVATAR COLOR PALETTE
   ===================================================== */
const AVATAR_COLORS = [
  ['#1a1a4e','#4fc3f7'], ['#1e1034','#b39ddb'], ['#1a2e1a','#81c784'],
  ['#2e1020','#f06292'], ['#1a2030','#64b5f6'], ['#2e2000','#ffb74d'],
  ['#1e3040','#4dd0e1'], ['#2a1a3e','#ce93d8'], ['#0a2020','#4db6ac'],
];

function avatarStyle(username) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = (hash * 31 + username.charCodeAt(i)) >>> 0;
  const [bg, fg] = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  return { bg, fg, initials: username.slice(0, 2).toUpperCase() };
}


/* =====================================================
   5. TOAST
   ===================================================== */
let toastTimer;
function showToast(msg) {
  DOM.toast.textContent = msg;
  DOM.toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => DOM.toast.classList.add('hidden'), 2800);
}


/* =====================================================
   6. USERNAME FLOW
   ===================================================== */
function applyUsername(name) {
  State.username = name;
  localStorage.setItem('vc_username', name);
  DOM.headerUsername.textContent = name;
}

function validateUsername(val) {
  if (!val || val.length < 3 || val.length > 24) return 'Pick a name (3–24 chars, no spaces)';
  if (/\s/.test(val)) return 'No spaces allowed';
  return null;
}

function openUsernameModal(isEdit) {
  DOM.usernameInput.value = isEdit ? State.username : '';
  DOM.usernameError.classList.add('hidden');
  DOM.usernameModal.classList.add('active');
  setTimeout(() => DOM.usernameInput.focus(), 200);
}

function closeUsernameModal() {
  DOM.usernameModal.classList.remove('active');
}

DOM.usernameConfirm.addEventListener('click', () => {
  const val = DOM.usernameInput.value.trim();
  const err = validateUsername(val);
  if (err) {
    DOM.usernameError.textContent = err;
    DOM.usernameError.classList.remove('hidden');
    return;
  }
  applyUsername(val);
  closeUsernameModal();
  showToast(`Signal name set: @${val}`);
});

DOM.usernameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') DOM.usernameConfirm.click();
});

DOM.editUsernameBtn.addEventListener('click', () => openUsernameModal(true));

// On load: show modal if no username set
if (!State.username) {
  openUsernameModal(false);
} else {
  applyUsername(State.username);
}


/* =====================================================
   7. POST MODAL
   ===================================================== */
function openPostModal() {
  if (!State.username) { openUsernameModal(false); return; }
  DOM.postModal.classList.add('active');
  setTimeout(() => DOM.postText.focus(), 200);
}

function closePostModal() {
  DOM.postModal.classList.remove('active');
  DOM.postText.value = '';
  DOM.charNum.textContent = '0';
  clearMediaPreview();
  switchTab('text');
}

DOM.openPostModal.addEventListener('click', openPostModal);
DOM.fabPost.addEventListener('click', openPostModal);
DOM.closePostModal.addEventListener('click', closePostModal);

DOM.postModal.addEventListener('click', e => {
  if (e.target === DOM.postModal) closePostModal();
});

DOM.postText.addEventListener('input', () => {
  const len = DOM.postText.value.length;
  DOM.charNum.textContent = len;
  DOM.charNum.style.color = len > 460 ? '#f06292' : '';
});

// Tab switching
$$('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

function switchTab(tab) {
  State.currentTab = tab;
  $$('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  DOM.mediaUpload.classList.toggle('hidden', tab === 'text');
  if (tab !== 'text') {
    DOM.fileInput.accept = tab === 'photo' ? 'image/*' : 'video/*';
  }
}


/* =====================================================
   8. MEDIA UPLOAD
   ===================================================== */
function handleFile(file) {
  if (!file) return;
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  if (!isImage && !isVideo) { showToast('Only images and videos please!'); return; }
  if (file.size > 80 * 1024 * 1024) { showToast('File too large (max 80MB)'); return; }

  State.mediaFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    State.mediaDataURL = e.target.result;
    renderMediaPreview(isImage);
  };
  reader.readAsDataURL(file);
}

function renderMediaPreview(isImage) {
  DOM.dropZone.classList.add('hidden');
  DOM.mediaPreview.classList.remove('hidden');
  DOM.mediaPreview.innerHTML = '';

  const el = document.createElement(isImage ? 'img' : 'video');
  el.src = State.mediaDataURL;
  if (!isImage) { el.controls = true; el.muted = true; }
  DOM.mediaPreview.appendChild(el);

  const rm = document.createElement('button');
  rm.className = 'remove-media';
  rm.textContent = '✕';
  rm.addEventListener('click', clearMediaPreview);
  DOM.mediaPreview.appendChild(rm);
}

function clearMediaPreview() {
  State.mediaFile = null;
  State.mediaDataURL = null;
  DOM.mediaPreview.classList.add('hidden');
  DOM.mediaPreview.innerHTML = '';
  DOM.dropZone.classList.remove('hidden');
  DOM.fileInput.value = '';
}

DOM.fileInput.addEventListener('change', e => handleFile(e.target.files[0]));

DOM.dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  DOM.dropZone.classList.add('drag-over');
});
DOM.dropZone.addEventListener('dragleave', () => DOM.dropZone.classList.remove('drag-over'));
DOM.dropZone.addEventListener('drop', e => {
  e.preventDefault();
  DOM.dropZone.classList.remove('drag-over');
  handleFile(e.dataTransfer.files[0]);
});


/* =====================================================
   9. SUBMIT POST
   ===================================================== */
DOM.submitPost.addEventListener('click', submitPost);

function submitPost() {
  const text  = DOM.postText.value.trim();
  const media = State.mediaDataURL;
  const type  = State.currentTab;

  if (!text && !media) { showToast('Add some content first!'); return; }
  if (text.length > 500) { showToast('Too many characters!'); return; }

  const post = {
    id: Date.now(),
    username: State.username,
    text,
    mediaDataURL: media,
    mediaIsVideo: State.mediaFile ? State.mediaFile.type.startsWith('video/') : false,
    type: media ? (State.mediaFile && State.mediaFile.type.startsWith('video/') ? 'video' : 'photo') : 'text',
    timestamp: new Date().toISOString(),
    likes: 0,
    boosts: 0,
    comments: 0,
    likedByMe: false,
    boostedByMe: false,
  };

  State.posts.unshift(post);
  savePosts();
  renderFeed();
  closePostModal();
  showToast('✦ Signal cast into the void!');
  updateRecentUsers();
}


/* =====================================================
   10. FEED RENDERING
   ===================================================== */
function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

function renderFeed() {
  const filter = State.currentFeed;
  const posts  = filter === 'all' ? State.posts : State.posts.filter(p => p.type === filter);

  if (posts.length === 0) {
    DOM.postFeed.innerHTML = `
      <div style="text-align:center;padding:80px 0;color:var(--text-dim);font-family:var(--font-mono);font-size:.8rem;letter-spacing:.08em;">
        ✦ THE VOID IS SILENT — BE THE FIRST TO BROADCAST ✦
      </div>`;
    return;
  }

  DOM.postFeed.innerHTML = posts.map(p => buildPostCard(p)).join('');

  // bind action buttons
  DOM.postFeed.querySelectorAll('.action-like').forEach(btn => {
    btn.addEventListener('click', () => handleLike(+btn.dataset.id));
  });
  DOM.postFeed.querySelectorAll('.action-boost').forEach(btn => {
    btn.addEventListener('click', () => handleBoost(+btn.dataset.id));
  });
}

function buildPostCard(p) {
  const av  = avatarStyle(p.username);
  const badge = p.type === 'text'
    ? '<span class="post-type-badge badge-text">TEXT</span>'
    : p.type === 'photo'
      ? '<span class="post-type-badge badge-photo">PHOTO</span>'
      : '<span class="post-type-badge badge-video">VIDEO</span>';

  const mediaHTML = p.mediaDataURL
    ? `<div class="post-media">
        ${ p.mediaIsVideo
            ? `<video src="${p.mediaDataURL}" controls muted playsinline></video>`
            : `<img src="${p.mediaDataURL}" alt="post media" loading="lazy" />`
        }
       </div>`
    : '';

  return `
  <article class="post-card" data-id="${p.id}">
    <div class="post-card-header">
      <div class="post-avatar" style="background:${av.bg};color:${av.fg};border-color:${av.fg}33">
        ${av.initials}
      </div>
      <div class="post-meta">
        <span class="post-username">@${escapeHTML(p.username)}</span>
        <span class="post-time">${timeAgo(p.timestamp)}</span>
      </div>
      ${badge}
    </div>
    ${p.text ? `<div class="post-body">${escapeHTML(p.text)}</div>` : ''}
    ${mediaHTML}
    <div class="post-actions">
      <button class="action-btn action-like ${p.likedByMe ? 'liked' : ''}" data-id="${p.id}">
        ${p.likedByMe ? '♥' : '♡'} <span>${p.likes}</span>
      </button>
      <button class="action-btn action-boost ${p.boostedByMe ? 'boosted' : ''}" data-id="${p.id}">
        ↺ <span>${p.boosts}</span>
      </button>
      <button class="action-btn action-comment" data-id="${p.id}" onclick="openCommentsModal(${p.id})">
        ◎ <span>${p.comments}</span>
      </button>
      <span class="action-sep"></span>
      <button class="action-btn" style="color:var(--text-dim)" onclick="copySignal(${p.id})">
        ⧉ Share
      </button>
    </div>
  </article>`;
}

function escapeHTML(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}


/* =====================================================
   11. INTERACTIONS
   ===================================================== */
function handleLike(id) {
  const p = State.posts.find(x => x.id === id);
  if (!p) return;
  p.likedByMe = !p.likedByMe;
  p.likes += p.likedByMe ? 1 : -1;
  
  if (p.likedByMe) {
    addNotification('like-post', State.username, p.id, p.type, p.text || p.type);
  }
  
  savePosts();
  renderFeed();
}

function handleBoost(id) {
  const p = State.posts.find(x => x.id === id);
  if (!p) return;
  p.boostedByMe = !p.boostedByMe;
  p.boosts += p.boostedByMe ? 1 : -1;
  savePosts();
  renderFeed();
  if (p.boostedByMe) showToast('↺ Signal boosted into the void!');
}

window.copySignal = function(id) {
  navigator.clipboard.writeText(`${location.href}#signal-${id}`).catch(() => {});
  showToast('⧉ Signal link copied!');
};


/* =====================================================
   12. FEED FILTER
   ===================================================== */
$$('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    State.currentFeed = btn.dataset.feed;
    $$('.nav-btn').forEach(b => b.classList.toggle('active', b === btn));
    renderFeed();
  });
});


/* =====================================================
   13. SEED DATA (first run)
   ===================================================== */
const SEED_POSTS = [
  {
    id: 1000001,
    username: 'nebula_drifter',
    text: 'Just found a signal buried in the static. Anyone else picking up on the 2.4GHz anomaly near Sector 7? The void is speaking tonight. 📡',
    type: 'text', mediaDataURL: null, mediaIsVideo: false,
    timestamp: new Date(Date.now() - 8 * 60000).toISOString(),
    likes: 47, boosts: 12, comments: 8, likedByMe: false, boostedByMe: false
  },
  {
    id: 1000002,
    username: 'xn_unnamed',
    text: 'No registration. No tracking. No ads. Just raw signal into the dark. This is the way.',
    type: 'text', mediaDataURL: null, mediaIsVideo: false,
    timestamp: new Date(Date.now() - 23 * 60000).toISOString(),
    likes: 134, boosts: 89, comments: 21, likedByMe: false, boostedByMe: false
  },
  {
    id: 1000003,
    username: 'void_witness',
    text: 'Anyone else notice the sky looked different tonight? Something is shifting at the edge of things.',
    type: 'text', mediaDataURL: null, mediaIsVideo: false,
    timestamp: new Date(Date.now() - 55 * 60000).toISOString(),
    likes: 28, boosts: 5, comments: 14, likedByMe: false, boostedByMe: false
  },
  {
    id: 1000004,
    username: 'anon_7f3bc',
    text: 'Reminder that you are an impossibly rare arrangement of atoms that somehow became aware of itself. Drift boldly. ✦',
    type: 'text', mediaDataURL: null, mediaIsVideo: false,
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
    likes: 312, boosts: 201, comments: 44, likedByMe: false, boostedByMe: false
  },
];

if (State.posts.length === 0) {
  State.posts = SEED_POSTS;
  savePosts();
}


/* =====================================================
   14. RECENT USERS SIDEBAR
   ===================================================== */
function updateRecentUsers() {
  const seen = new Map();
  State.posts.forEach(p => {
    if (!seen.has(p.username)) seen.set(p.username, p.timestamp);
  });
  const recent = [...seen.entries()]
    .sort((a, b) => new Date(b[1]) - new Date(a[1]))
    .slice(0, 6);

  DOM.recentUsers.innerHTML = recent.map(([name]) => {
    const av = avatarStyle(name);
    return `<div class="recent-user-item">
      <div class="user-avatar" style="background:${av.bg};color:${av.fg}">${av.initials}</div>
      <span style="font-family:var(--font-mono);font-size:.8rem;color:var(--text-secondary)">@${escapeHTML(name)}</span>
    </div>`;
  }).join('');
}


/* =====================================================
   15. LIVE STATS TICKER
   ===================================================== */
(function liveStats() {
  const travelers = $('stat-travelers');
  const signals   = $('stat-signals');
  let tv = 12847, sv = 3291;

  setInterval(() => {
    tv += Math.floor(Math.random() * 5) - 1;
    sv += Math.floor(Math.random() * 3);
    if (travelers) travelers.textContent = tv.toLocaleString();
    if (signals)   signals.textContent   = sv.toLocaleString();
  }, 4000);
})();


/* =====================================================
   16. KEYBOARD SHORTCUTS
   ===================================================== */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (DOM.postModal.classList.contains('active')) closePostModal();
    if (DOM.usernameModal.classList.contains('active') && State.username) closeUsernameModal();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    if (DOM.postModal.classList.contains('active')) submitPost();
  }
});


/* =====================================================
   17. INIT
   ===================================================== */
renderFeed();
updateRecentUsers();

/* =====================================================
    11.5. COMMENTS MODAL
    ===================================================== */
window.openCommentsModal = function(postId) {
  currentCommentingPostId = postId;
  const post = State.posts.find(p => p.id === postId);
  if (!post) return;

  renderCommentsList(post);
  DOM.commentInput.value = '';
  DOM.commentsModal.classList.add('active');
  DOM.commentInput.focus();
};

function closeCommentsModal() {
  DOM.commentsModal.classList.remove('active');
  currentCommentingPostId = null;
}

function renderCommentsList(post) {
  if (!post.commentsList) post.commentsList = [];
  
  if (post.commentsList.length === 0) {
    DOM.commentsList.innerHTML = '<div class="comments-empty">No responses yet. Be the first to reply!</div>';
  } else {
    DOM.commentsList.innerHTML = post.commentsList.map((c, idx) => `
      <div class="comment-item" data-comment-idx="${idx}">
        <div class="comment-avatar" style="background:${c.av.bg};color:${c.av.fg};border-color:${c.av.fg}33">
          ${c.av.initials}
        </div>
        <div class="comment-content">
          <div class="comment-author">@${escapeHTML(c.username)}</div>
          <div class="comment-text">${escapeHTML(c.text)}</div>
          <div class="comment-time">${timeAgo(c.timestamp)}</div>
          <div class="comment-actions">
            <button class="comment-action-btn comment-like-btn" data-comment-idx="${idx}" data-post-id="${post.id}" onclick="likeComment(event)">
              ${c.likedByMe ? '♥' : '♡'} <span>${c.likes || 0}</span>
            </button>
            <button class="comment-action-btn" onclick="toggleReplyInput(${idx})">
              ↩ Reply
            </button>
          </div>
          ${renderReplies(c.replies || [], idx, post.id)}
          ${renderReplyInput(idx, post.id)}
        </div>
      </div>
    `).join('');

    // Attach event listeners for reply submissions
    document.querySelectorAll('.reply-submit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => submitReply(e));
    });
  }
}

function renderReplies(replies, commentIdx, postId) {
  if (!replies || replies.length === 0) return '';
  
  return `
    <div class="replies-container">
      ${replies.map((r, rIdx) => `
        <div class="reply-item">
          <div class="reply-avatar" style="background:${r.av.bg};color:${r.av.fg};border-color:${r.av.fg}33">
            ${r.av.initials}
          </div>
          <div class="reply-content">
            <div class="reply-author">@${escapeHTML(r.username)}</div>
            <div class="reply-text">${escapeHTML(r.text)}</div>
            <div class="reply-time">${timeAgo(r.timestamp)}</div>
            <div class="reply-actions">
              <button class="reply-action-btn reply-like-btn" data-comment-idx="${commentIdx}" data-reply-idx="${rIdx}" data-post-id="${postId}" onclick="likeReply(event)">
                ${r.likedByMe ? '♥' : '♡'} <span>${r.likes || 0}</span>
              </button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderReplyInput(commentIdx, postId) {
  return `
    <div class="reply-input-container hidden" id="reply-input-${commentIdx}">
      <input type="text" class="reply-input-field" placeholder="Add your response..." maxlength="150" data-comment-idx="${commentIdx}" data-post-id="${postId}" />
      <button class="reply-submit-btn" data-comment-idx="${commentIdx}" data-post-id="${postId}">REPLY</button>
    </div>
  `;
}

function toggleReplyInput(commentIdx) {
  const container = document.getElementById(`reply-input-${commentIdx}`);
  container.classList.toggle('hidden');
  if (!container.classList.contains('hidden')) {
    container.querySelector('.reply-input-field').focus();
  }
}

window.submitReply = function(e) {
  const btn = e.target;
  const commentIdx = +btn.dataset.commentIdx;
  const postId = +btn.dataset.postId;
  const input = btn.previousElementSibling;
  const text = input.value.trim();

  if (!text) { showToast('Say something!'); return; }
  if (text.length > 150) { showToast('Reply too long!'); return; }

  const post = State.posts.find(p => p.id === postId);
  if (!post || !post.commentsList || !post.commentsList[commentIdx]) return;

  const comment = post.commentsList[commentIdx];
  if (!comment.replies) comment.replies = [];

  const reply = {
    username: State.username,
    text: text,
    timestamp: new Date().toISOString(),
    av: avatarStyle(State.username),
    likes: 0,
    likedByMe: false,
  };

  comment.replies.push(reply);
  savePosts();
  renderCommentsList(post);
  input.value = '';
  showToast('✦ Reply added!');
};

window.likeComment = function(e) {
  e.preventDefault();
  const btn = e.target.closest('.comment-like-btn');
  const commentIdx = +btn.dataset.commentIdx;
  const postId = +btn.dataset.postId;

  const post = State.posts.find(p => p.id === postId);
  if (!post || !post.commentsList || !post.commentsList[commentIdx]) return;

  const comment = post.commentsList[commentIdx];
  comment.likedByMe = !comment.likedByMe;
  comment.likes = (comment.likes || 0) + (comment.likedByMe ? 1 : -1);
  
  if (comment.likedByMe) {
    addNotification('like-comment', State.username, postId, 'comment', comment.text);
  }
  
  savePosts();
  renderCommentsList(post);
};

window.likeReply = function(e) {
  e.preventDefault();
  const btn = e.target.closest('.reply-like-btn');
  const commentIdx = +btn.dataset.commentIdx;
  const replyIdx = +btn.dataset.replyIdx;
  const postId = +btn.dataset.postId;

  const post = State.posts.find(p => p.id === postId);
  if (!post || !post.commentsList || !post.commentsList[commentIdx]) return;

  const comment = post.commentsList[commentIdx];
  if (!comment.replies || !comment.replies[replyIdx]) return;

  const reply = comment.replies[replyIdx];
  reply.likedByMe = !reply.likedByMe;
  reply.likes = (reply.likes || 0) + (reply.likedByMe ? 1 : -1);
  
  if (reply.likedByMe) {
    addNotification('like-reply', State.username, postId, 'reply', reply.text);
  }
  
  savePosts();
  renderCommentsList(post);
};

DOM.closeCommentsModal.addEventListener('click', closeCommentsModal);

DOM.submitComment.addEventListener('click', () => {
  const text = DOM.commentInput.value.trim();
  if (!text) { showToast('Say something!'); return; }
  if (text.length > 200) { showToast('Comment too long!'); return; }

  const post = State.posts.find(p => p.id === currentCommentingPostId);
  if (!post) return;

  if (!post.commentsList) post.commentsList = [];
  
  const comment = {
    username: State.username,
    text: text,
    timestamp: new Date().toISOString(),
    av: avatarStyle(State.username),
  };

  post.commentsList.push(comment);
  post.comments = post.commentsList.length;
  
  savePosts();
  renderCommentsList(post);
  DOM.commentInput.value = '';
  renderFeed();
  showToast('✦ Voice added to the signal!');
});

/* =====================================================
    18. NOTIFICATIONS
    ===================================================== */
DOM.notificationsBtn.addEventListener('click', () => {
  DOM.notificationsModal.classList.add('active');
});

DOM.closeNotificationsModal.addEventListener('click', () => {
  DOM.notificationsModal.classList.remove('active');
});

/* Show alert on page load */
alert('This is just prototype am about to build in future.');
updateNotificationBadge();
renderNotifications();