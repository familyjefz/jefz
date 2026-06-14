// ========== STATE ZOOM & PAN ==========
let scale = 1;
let offsetX = 0;
let offsetY = 0;

let isDragging = false;
let pendingDrag = false;
let startX = 0;
let startY = 0;
let startOffsetX = 0;
let startOffsetY = 0;

// Momentum/fling
let velX = 0;
let velY = 0;
let lastMoveTime = 0;
let lastMoveX = 0;
let lastMoveY = 0;
let _flingRaf = null;
// Rolling samples untuk velocity yang akurat
const VEL_SAMPLES = 4;
let moveSamples = [];

let isPinching = false;
let startDist = 0;
let startScale = 1;
let pinchCooldown = 0;

let isInfoPinching = false;
let infoZoom = 1;
let startInfoZoom = 1;

let repositionMode = false;

const DRAG_THRESHOLD = 4;
const INFO_ZOOM_MIN = 0.6;
const INFO_ZOOM_MAX = 4;
const FRICTION = 0.96;   // lebih lambat berhenti = terasa lebih natural
const MIN_VEL = 0.15;  // berhenti saat benar-benar lambat

const VIEW_KEY = "silsilah_view_state_v2";

const getContainer = () => document.getElementById("tree-zoom-container");
const getInfoModal = () => document.getElementById("info-modal");

function isInfoModalOpen() {
  const m = getInfoModal();
  if (!m) return false;
  return m.style.display === "flex" || m.style.display === "block";
}

function applyInfoZoom() {
  const body = document.getElementById("info-body");
  if (body) body.style.setProperty("--info-zoom", String(infoZoom));
}

function resetInfoZoom() {
  infoZoom = 1;
  applyInfoZoom();
}

let _lastTransform = "";
function applyTransform() {
  const el = getContainer();
  if (!el) return;
  const t = `translate(${offsetX}px,${offsetY}px) scale(${scale})`;
  if (t === _lastTransform) return; // skip jika tidak ada perubahan
  _lastTransform = t;
  el.style.transform = t;
  el.style.transformOrigin = "0 0";
}

function setZoom(zoom, centerX = null, centerY = null) {
  zoom = Math.max(30, Math.min(300, zoom));
  const newScale = zoom / 100;
  const el = getContainer();
  if (!el) return;

  if (centerX === null || centerY === null) {
    centerX = window.innerWidth / 2;
    centerY = window.innerHeight / 2;
  }

  const rect = el.getBoundingClientRect();
  const dx = centerX - rect.left;
  const dy = centerY - rect.top;

  offsetX -= dx * (newScale / scale - 1);
  offsetY -= dy * (newScale / scale - 1);

  // Round offset untuk anti-blur
  offsetX = Math.round(offsetX);
  offsetY = Math.round(offsetY);

  scale = newScale;
  applyTransform();
  updateZoomUI(zoom);
  currentZoom = newScale;
  saveViewState();
}

function updateZoomUI(zoom) {
  const zoomValue = document.getElementById("zoom-value");
  if (zoomValue) zoomValue.textContent = Math.round(zoom) + "%";
  const slider = document.getElementById("zoom-slider");
  if (slider && slider.value != zoom) slider.value = zoom;
}

function updateZoomFromSlider(e) {
  setZoom(parseInt(e.target.value));
}

function zoomReset() {
  if (typeof zoomResetToJabbar === "function") {
    zoomResetToJabbar();
  } else {
    scale = 1; offsetX = 0; offsetY = 0; currentZoom = 1;
    applyTransform(); updateZoomUI(100);
    const slider = document.getElementById("zoom-slider");
    if (slider) slider.value = 100;
    if (typeof centerOnMainTree === "function") centerOnMainTree();
    saveViewState();
  }
}

function centerOnMainTree() {
  scale = 1; offsetX = 0; offsetY = 0; currentZoom = 1;
  applyTransform(); updateZoomUI(100);
  const wrapper = document.getElementById("tree-wrapper");
  const rootNode = document.querySelector("#tree-instance-main .node-box");
  if (!wrapper || !rootNode) return;
  const rootRect    = rootNode.getBoundingClientRect();
  const wrapperRect = wrapper.getBoundingClientRect();
  wrapper.scrollLeft = Math.max(0, wrapper.scrollLeft + (rootRect.left - wrapperRect.left) - wrapper.clientWidth  / 2 + rootRect.width  / 2);
  wrapper.scrollTop  = Math.max(0, wrapper.scrollTop  + (rootRect.top  - wrapperRect.top)  - wrapper.clientHeight / 2 + rootRect.height / 2);
  saveViewState();
}

function saveViewState() {
  try {
    localStorage.setItem(VIEW_KEY, JSON.stringify({ scale, offsetX, offsetY }));
  } catch (e) {}
}

function loadViewState() {
  try {
    const raw = localStorage.getItem(VIEW_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    scale   = data.scale   || 1;
    offsetX = data.offsetX || 0;
    offsetY = data.offsetY || 0;
    currentZoom = scale;
    applyTransform();
    updateZoomUI(Math.round(scale * 100));
    return true;
  } catch (e) { return false; }
}

function isAlwaysInteractive(target) {
  if (!target) return false;
  return !!(target.closest("textarea") || target.closest("input") ||
            target.closest(".zoom-slider") || target.closest(".modal") ||
            target.closest(".custom-popup"));
}

function isClickable(target) {
  if (!target) return false;
  return !!(target.closest("button") || target.closest(".node-box"));
}

function suppressNextClick() {
  // Hanya suppress event "click" sintetis yang muncul setelah drag/fling.
  // JANGAN intercept touchstart - itu akan "menelan" sentuhan pertama
  // dari gesture pan selanjutnya (menyebabkan butuh 2x sentuh).
  const handler = ev => {
    ev.stopPropagation();
    ev.preventDefault();
    return false;
  };
  document.addEventListener("click", handler, { capture: true, once: true });
  // Auto-remove jika click tidak terjadi dalam 500ms (mencegah listener nyangkut)
  setTimeout(() => {
    document.removeEventListener("click", handler, { capture: true });
  }, 500);
}

function cancelFling() {
  if (_flingRaf) { cancelAnimationFrame(_flingRaf); _flingRaf = null; }
}

function startFling() {
  cancelFling();

  // Hitung velocity dari rolling average sample terbaru (max 80ms terakhir)
  const now = Date.now();
  const recent = moveSamples.filter(s => now - s.t < 80);
  if (recent.length > 0) {
    velX = recent.reduce((s,v)=>s+v.vx,0) / recent.length;
    velY = recent.reduce((s,v)=>s+v.vy,0) / recent.length;
  }

  if (Math.hypot(velX, velY) < MIN_VEL) return;

  function frame() {
    velX *= FRICTION;
    velY *= FRICTION;
    offsetX += velX;
    offsetY += velY;
    applyTransform();
    if (Math.hypot(velX, velY) > MIN_VEL) {
      _flingRaf = requestAnimationFrame(frame);
    } else {
      _flingRaf = null;
      saveViewState();
    }
  }
  _flingRaf = requestAnimationFrame(frame);
}

// ── Mouse drag ──
function startDrag(e) {
  // Stop fling PERTAMA - sebelum cek apapun
  cancelFling();
  const t = e.target;
  if (isAlwaysInteractive(t)) return;
  pendingDrag = true;
  isDragging  = false;
  startX = e.clientX; startY = e.clientY;
  startOffsetX = offsetX; startOffsetY = offsetY;
  velX = 0; velY = 0;
  moveSamples = [];
  lastMoveTime = Date.now();
  lastMoveX = e.clientX; lastMoveY = e.clientY;
  if (!isClickable(t)) { isDragging = true; e.preventDefault(); }
}

function moveDrag(e) {
  if (!pendingDrag && !isDragging) return;
  const dx = e.clientX - startX;
  const dy = e.clientY - startY;
  if (!isDragging) {
    if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    isDragging = true;
  }
  const now = Date.now();
  const dt  = now - lastMoveTime;
  if (dt > 0 && dt < 80) {
    const vx = (e.clientX - lastMoveX) / dt * 16;
    const vy = (e.clientY - lastMoveY) / dt * 16;
    moveSamples.push({ vx, vy, t: now });
    if (moveSamples.length > VEL_SAMPLES) moveSamples.shift();
  }
  lastMoveTime = now;
  lastMoveX = e.clientX;
  lastMoveY = e.clientY;
  offsetX = startOffsetX + dx;
  offsetY = startOffsetY + dy;
  applyTransform();
}

function endDrag(e) {
  const wasDragging = isDragging;
  isDragging = false;
  pendingDrag = false;
  if (wasDragging && e) {
    const dx = (e.clientX ?? startX) - startX;
    const dy = (e.clientY ?? startY) - startY;
    if (Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
      suppressNextClick();
      startFling();
    } else {
      saveViewState();
    }
  }
}

// ── Touch ──
function getDist(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function touchStart(e) {
  const wasFling = !!_flingRaf;
  cancelFling();
  // Blok browser scroll segera - sebelum apapun
  // kecuali jika target adalah elemen interaktif atau modal
  const tgt = e.touches[0] && document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
  if (!isAlwaysInteractive(tgt) && !isInfoModalOpen()) {
    e.preventDefault();
  }
  if (e.touches.length >= 2) {
    if (isInfoModalOpen()) {
      isInfoPinching = true; isPinching = false;
      startDist = getDist(e.touches); startInfoZoom = infoZoom;
      e.preventDefault(); return;
    }
    isPinching = true; isDragging = false; pendingDrag = false;
    startDist = getDist(e.touches); startScale = scale;
    e.preventDefault(); return;
  }
  if (e.touches.length === 1) {
    if (isPinching || isInfoPinching || Date.now() < pinchCooldown) return;
    cancelFling();
    const touch  = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (isAlwaysInteractive(target)) return;
    pendingDrag = true; isDragging = false;
    startX = touch.clientX; startY = touch.clientY;
    startOffsetX = offsetX; startOffsetY = offsetY;
    velX = 0; velY = 0;
    moveSamples = [];
    lastMoveTime = Date.now();
    lastMoveX = touch.clientX; lastMoveY = touch.clientY;
    if (!isClickable(target)) isDragging = true;
  }
}

function touchMove(e) {
  // Info modal pinch
  if (isInfoPinching && e.touches.length >= 2) {
    e.preventDefault();
    const dist = getDist(e.touches);
    if (startDist <= 0) return;
    infoZoom = Math.max(INFO_ZOOM_MIN, Math.min(INFO_ZOOM_MAX, startInfoZoom * dist / startDist));
    applyInfoZoom(); return;
  }
  if (isInfoModalOpen()) return;
  // Selalu blok scroll browser saat ada sentuhan aktif di tree
  if (pendingDrag || isDragging || isPinching) {
    e.preventDefault();
  }
  if (isPinching && e.touches.length >= 2) {
    const dist = getDist(e.touches);
    if (startDist <= 0) return;
    const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    setZoom((startScale * dist / startDist) * 100, cx, cy); return;
  }
  if ((isDragging || pendingDrag) && e.touches.length === 1 && !isPinching) {
    const t  = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (!isDragging) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      isDragging = true;
    }
    const now = Date.now();
    const dt  = now - lastMoveTime;
    if (dt > 0 && dt < 80) {
      const vx = (t.clientX - lastMoveX) / dt * 16;
      const vy = (t.clientY - lastMoveY) / dt * 16;
      moveSamples.push({ vx, vy, t: now });
      if (moveSamples.length > VEL_SAMPLES) moveSamples.shift();
    }
    lastMoveTime = now;
    lastMoveX = t.clientX; lastMoveY = t.clientY;

    offsetX = startOffsetX + dx;
    offsetY = startOffsetY + dy;
    applyTransform();
  }
}

function touchEnd(e) {
  if ((isPinching || isInfoPinching) && e.touches.length < 2) {
    isPinching = false; isInfoPinching = false;
    isDragging = false; pendingDrag = false;
    pinchCooldown = Date.now() + 250;
    saveViewState(); return;
  }
  if (e.touches.length === 0) {
    const wasDrag = isDragging;
    isDragging = false; pendingDrag = false;
    if (wasDrag) {
      const ct = e.changedTouches && e.changedTouches[0];
      const dx = (ct ? ct.clientX : startX) - startX;
      const dy = (ct ? ct.clientY : startY) - startY;
      if (Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
        suppressNextClick();
        startFling();
      } else {
        saveViewState();
      }
    }
  }
}

// scroll state disimpan via offsetX/offsetY
/*Stable + fling + anti-blur*/
