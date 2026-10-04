/* ================================================================
   AURA LOCK - SCRIPT
   ================================================================ */

const STORAGE_KEY = 'aura_features';
const STORAGE_START = 'aura_start_times';
const STORAGE_PANEL = 'aura_panel_rect';

// ==================== DOM ====================
const loadingScreen = document.getElementById('loadingScreen');
const loadingProgress = document.getElementById('loadingProgress');
const loadingText = document.getElementById('loadingText');
const mainPanel = document.getElementById('mainPanel');
const minimizedIcon = document.getElementById('minimizedIcon');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const statusTime = document.getElementById('statusTime');
const toast = document.getElementById('toast');
const dragHeader = document.getElementById('dragHeader');
const minimizeBtn = document.getElementById('minimizeBtn');
const closeBtn = document.getElementById('closeBtn');

// ==================== LOADING ====================
const loadingSteps = [
  { text: 'Đang khởi tạo...', duration: 500 },
  { text: 'Đang kết nối server...', duration: 700 },
  { text: 'Đang tải cấu hình...', duration: 600 },
  { text: 'Đang khởi động module...', duration: 500 },
  { text: 'Hoàn tất!', duration: 300 }
];

async function runLoading() {
  let total = loadingSteps.reduce((s, x) => s + x.duration, 0);
  let elapsed = 0;
  for (const step of loadingSteps) {
    loadingText.textContent = step.text;
    await sleep(step.duration);
    elapsed += step.duration;
    loadingProgress.style.width = Math.min((elapsed / total) * 100, 100) + '%';
  }
  loadingScreen.classList.add('hide');
  await sleep(600);
  mainPanel.classList.add('show');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ==================== CLOCK ====================
function updateClock() {
  const now = new Date();
  statusTime.textContent = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map(n => String(n).padStart(2,'0')).join(':');
}
setInterval(updateClock, 1000);
updateClock();

// ==================== ONLINE ====================
function checkConnection() {
  if (navigator.onLine) {
    statusDot.classList.remove('offline');
    statusText.textContent = 'Online';
  } else {
    statusDot.classList.add('offline');
    statusText.textContent = 'Offline';
  }
}
window.addEventListener('online', checkConnection);
window.addEventListener('offline', checkConnection);
checkConnection();

// ==================== TIME FORMAT ====================
function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// ==================== STORAGE ====================
function loadFeatures() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}
function saveFeatures(f) { localStorage.setItem(STORAGE_KEY, JSON.stringify(f)); }
function loadStartTimes() {
  try { return JSON.parse(localStorage.getItem(STORAGE_START) || '{}'); } catch { return {}; }
}
function saveStartTimes(t) { localStorage.setItem(STORAGE_START, JSON.stringify(t)); }

// ==================== TIMERS ====================
const activeTimers = {};

function startTimer(id, timerEl, startTime) {
  if (activeTimers[id]) clearInterval(activeTimers[id].intervalId);
  const start = startTime || Date.now();
  timerEl.textContent = formatTime(Math.floor((Date.now() - start) / 1000));
  const intervalId = setInterval(() => {
    timerEl.textContent = formatTime(Math.floor((Date.now() - start) / 1000));
  }, 1000);
  activeTimers[id] = { startTime: start, intervalId };
}

function stopTimer(id, timerEl) {
  if (activeTimers[id]) {
    clearInterval(activeTimers[id].intervalId);
    delete activeTimers[id];
  }
  timerEl.textContent = '--:--:--';
}

// ==================== FEATURE TOGGLE ====================
const featureItems = document.querySelectorAll('.feature-item');
const savedFeatures = loadFeatures();
const savedStartTimes = loadStartTimes();

featureItems.forEach(item => {
  const id = item.dataset.id;
  const timerEl = item.querySelector('.feature-timer');

  if (id in savedFeatures) {
    if (savedFeatures[id]) {
      item.classList.add('active');
      startTimer(id, timerEl, savedStartTimes[id] || Date.now());
    } else {
      item.classList.remove('active');
      timerEl.textContent = '--:--:--';
    }
  }

  item.addEventListener('click', (e) => {
    e.stopPropagation();
    const name = item.querySelector('.feature-name').textContent.replace(/[|]/g,'').trim();
    item.classList.toggle('active');
    const isActive = item.classList.contains('active');

    const features = loadFeatures();
    features[id] = isActive;
    saveFeatures(features);

    const startTimes = loadStartTimes();
    if (isActive) {
      const t = Date.now();
      startTimes[id] = t;
      saveStartTimes(startTimes);
      startTimer(id, timerEl, t);
    } else {
      stopTimer(id, timerEl);
      delete startTimes[id];
      saveStartTimes(startTimes);
    }

    showToast(`${name} ${isActive ? 'BẬT' : 'TẮT'}`, isActive);
    if (navigator.vibrate) navigator.vibrate(isActive ? [50,30,50] : 30);

    const icon = item.querySelector('.feature-icon');
    icon.style.transform = 'scale(1.3)';
    setTimeout(() => { icon.style.transform = ''; }, 200);
  });
});

// ==================== TOAST ====================
let toastTimeout;
function showToast(message, isOn) {
  toast.textContent = message;
  toast.className = 'toast show' + (isOn ? ' on' : '');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 1500);
}

// ==================== DRAG PANEL ====================
let dragState = null;

dragHeader.addEventListener('pointerdown', (e) => {
  // Bỏ qua nếu bấm vào nút control
  if (e.target.closest('.ctrl-btn')) return;
  
  const rect = mainPanel.getBoundingClientRect();
  dragState = {
    startX: e.clientX,
    startY: e.clientY,
    origLeft: rect.left,
    origTop: rect.top,
    pointerId: e.pointerId
  };
  
  mainPanel.classList.add('dragging');
  // Bỏ transform center khi drag
  mainPanel.style.transform = 'none';
  mainPanel.style.top = rect.top + 'px';
  mainPanel.style.left = rect.left + 'px';
  mainPanel.style.right = 'auto';
  mainPanel.style.bottom = 'auto';
  
  dragHeader.setPointerCapture(e.pointerId);
});

dragHeader.addEventListener('pointermove', (e) => {
  if (!dragState) return;
  
  const dx = e.clientX - dragState.startX;
  const dy = e.clientY - dragState.startY;
  
  let newLeft = dragState.origLeft + dx;
  let newTop = dragState.origTop + dy;
  
  // Giữ trong viewport
  const rect = mainPanel.getBoundingClientRect();
  newLeft = Math.max(0, Math.min(window.innerWidth - rect.width, newLeft));
  newTop = Math.max(0, Math.min(window.innerHeight - rect.height, newTop));
  
  mainPanel.style.left = newLeft + 'px';
  mainPanel.style.top = newTop + 'px';
});

dragHeader.addEventListener('pointerup', (e) => {
  if (!dragState) return;
  dragState = null;
  mainPanel.classList.remove('dragging');
  savePanelRect();
});

dragHeader.addEventListener('pointercancel', () => {
  dragState = null;
  mainPanel.classList.remove('dragging');
});

// ==================== RESIZE PANEL ====================
const resizeHandles = document.querySelectorAll('.resize-handle');

resizeHandles.forEach(handle => {
  handle.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    const dir = handle.dataset.dir;
    const rect = mainPanel.getBoundingClientRect();
    
    const state = {
      dir,
      startX: e.clientX,
      startY: e.clientY,
      origLeft: rect.left,
      origTop: rect.top,
      origWidth: rect.width,
      origHeight: rect.height,
      pointerId: e.pointerId
    };
    
    // Chuyển sang positioned mode
    mainPanel.style.transform = 'none';
    mainPanel.style.left = rect.left + 'px';
    mainPanel.style.top = rect.top + 'px';
    mainPanel.style.width = rect.width + 'px';
    mainPanel.style.height = rect.height + 'px';
    
    handle.setPointerCapture(e.pointerId);
    
    function onMove(ev) {
      const dx = ev.clientX - state.startX;
      const dy = ev.clientY - state.startY;
      
      let newLeft = state.origLeft;
      let newTop = state.origTop;
      let newWidth = state.origWidth;
      let newHeight = state.origHeight;
      
      if (dir.includes('r')) newWidth = state.origWidth + dx;
      if (dir.includes('l')) {
        newWidth = state.origWidth - dx;
        newLeft = state.origLeft + dx;
      }
      if (dir.includes('b')) newHeight = state.origHeight + dy;
      if (dir.includes('t')) {
        newHeight = state.origHeight - dy;
        newTop = state.origTop + dy;
      }
      
      // Min/Max
      const MIN_W = 280, MIN_H = 350;
      if (newWidth < MIN_W) {
        if (dir.includes('l')) newLeft -= (MIN_W - newWidth);
        newWidth = MIN_W;
      }
      if (newHeight < MIN_H) {
        if (dir.includes('t')) newTop -= (MIN_H - newHeight);
        newHeight = MIN_H;
      }
      
      mainPanel.style.left = newLeft + 'px';
      mainPanel.style.top = newTop + 'px';
      mainPanel.style.width = newWidth + 'px';
      mainPanel.style.height = newHeight + 'px';
    }
    
    function onUp() {
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
      savePanelRect();
    }
    
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
  });
});

// ==================== SAVE/RESTORE PANEL RECT ====================
function savePanelRect() {
  const rect = mainPanel.getBoundingClientRect();
  localStorage.setItem(STORAGE_PANEL, JSON.stringify({
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height
  }));
}

function restorePanelRect() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_PANEL) || 'null');
    if (saved) {
      // Kiểm tra nằm trong viewport
      if (saved.left >= 0 && saved.top >= 0 &&
          saved.left + saved.width <= window.innerWidth + 10 &&
          saved.top + saved.height <= window.innerHeight + 10) {
        mainPanel.style.transform = 'none';
        mainPanel.style.left = saved.left + 'px';
        mainPanel.style.top = saved.top + 'px';
        mainPanel.style.width = saved.width + 'px';
        mainPanel.style.height = saved.height + 'px';
      }
    }
  } catch {}
}

// ==================== MINIMIZE / RESTORE ====================
let isMinimized = false;

function minimizePanel() {
  if (isMinimized) return;
  isMinimized = true;
  mainPanel.classList.add('hidden');
  minimizedIcon.classList.add('show');
  if (navigator.vibrate) navigator.vibrate(30);
  showToast('THU NHỎ', true);
}

function restorePanel() {
  if (!isMinimized) return;
  isMinimized = false;
  mainPanel.classList.remove('hidden');
  minimizedIcon.classList.remove('show');
  if (navigator.vibrate) navigator.vibrate(30);
  showToast('MỞ RỘNG', true);
}

minimizeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  minimizePanel();
});

minimizedIcon.addEventListener('click', restorePanel);

// Drag minimized icon
let miniDrag = null;
minimizedIcon.addEventListener('pointerdown', (e) => {
  miniDrag = {
    startX: e.clientX,
    startY: e.clientY,
    origLeft: minimizedIcon.offsetLeft,
    origTop: minimizedIcon.offsetTop,
    moved: false
  };
  minimizedIcon.setPointerCapture(e.pointerId);
});

minimizedIcon.addEventListener('pointermove', (e) => {
  if (!miniDrag) return;
  const dx = e.clientX - miniDrag.startX;
  const dy = e.clientY - miniDrag.startY;
  if (Math.abs(dx) > 5 || Math.abs(dy) > 5) miniDrag.moved = true;
  
  let newLeft = miniDrag.origLeft + dx;
  let newTop = miniDrag.origTop + dy;
  
  newLeft = Math.max(0, Math.min(window.innerWidth - 60, newLeft));
  newTop = Math.max(0, Math.min(window.innerHeight - 60, newTop));
  
  minimizedIcon.style.left = newLeft + 'px';
  minimizedIcon.style.top = newTop + 'px';
  minimizedIcon.style.right = 'auto';
});

minimizedIcon.addEventListener('pointerup', (e) => {
  if (miniDrag && !miniDrag.moved) {
    restorePanel();
  }
  miniDrag = null;
});

// ==================== CLOSE ====================
closeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (confirm('Đóng AURA LOCK?')) {
    minimizePanel();
  }
});

// ==================== FLOAT BUTTON ====================
document.getElementById('floatBtn').addEventListener('click', () => {
  if (navigator.vibrate) navigator.vibrate([80,40,80]);
  const count = document.querySelectorAll('.feature-item.active').length;
  showToast(`ĐANG CHẠY: ${count} CHỨC NĂNG`, true);
});

// ==================== KEYBOARD ====================
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (isMinimized) restorePanel();
  }
});

// ==================== INIT ====================
(async () => {
  console.log('%c🔒 AURA LOCK', 'color: #ff0033; font-size: 24px; font-weight: 900;');
  await runLoading();
  restorePanelRect();
  const count = document.querySelectorAll('.feature-item.active').length;
  console.log(`%c✓ ${count} chức năng đang chạy`, 'color: #00c853; font-weight: bold;');
})();

window.addEventListener('beforeunload', () => {
  Object.keys(activeTimers).forEach(id => clearInterval(activeTimers[id].intervalId));
  savePanelRect();
});