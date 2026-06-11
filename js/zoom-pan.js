// ========== STATE ZOOM & PAN ==========
let scale = 1;
let offsetX = 0;
let offsetY = 0;

let isDragging = false;
let pendingDrag = false;
let startX = 0, startY = 0;
let startOffsetX = 0, startOffsetY = 0;

// Fling / momentum
let velX = 0, velY = 0;
let lastX = 0, lastY = 0;
let lastT = 0;
let flingRAF = null;

let isPinching = false;
let startDist = 0, startScale = 1;
let pinchCooldown = 0;

let isInfoPinching = false;
let infoZoom = 1, startInfoZoom = 1;

let repositionMode = false;

const DRAG_THRESHOLD = 4;
const INFO_ZOOM_MIN = 0.6;
const INFO_ZOOM_MAX = 4;
const VIEW_KEY = "silsilah_view_state_v2";

const getContainer = () => document.getElementById("tree-zoom-container");
const getInfoModal = () => document.getElementById("info-modal");

function isInfoModalOpen() {
  const m = getInfoModal();
  if (!m) return false;
  const d = m.style.display;
  return d === "flex" || d === "block";
}

function applyInfoZoom() {
  const body = document.getElementById("info-body");
  if (body) body.style.setProperty("--info-zoom", String(infoZoom));
}

function resetInfoZoom() { infoZoom = 1; applyInfoZoom(); }

// applyTransform: NO willChange here (set once in CSS), NO transition
function applyTransform() {
  const el = getContainer();
  if (!el) return;
  el.style.transform = `translate(${offsetX}px,${offsetY}px) scale(${scale})`;
}

function setZoom(zoom, centerX = null, centerY = null) {
  zoom = Math.max(30, Math.min(300, zoom));
  const newScale = zoom / 100;
  const el = getContainer();
  if (!el) return;

  if (centerX === null) centerX = window.innerWidth  / 2;
  if (centerY === null) centerY = window.innerHeight / 2;

  const rect = el.getBoundingClientRect();
  const dx = centerX - rect.left;
  const dy = centerY - rect.top;

  offsetX -= dx * (newScale / scale - 1);
  offsetY -= dy * (newScale / scale - 1);
  scale = newScale;

  applyTransform();
  updateZoomUI(zoom);
  currentZoom = newScale;
  saveViewState();
}

function updateZoomUI(zoom) {
  const zv = document.getElementById("zoom-value");
  if (zv) zv.textContent = Math.round(zoom) + "%";
  const sl = document.getElementById("zoom-slider");
  if (sl && sl.value != zoom) sl.value = zoom;
}

function updateZoomFromSlider(e) {
  setZoom(parseInt(e.target.value));
}

// ── Reset zoom → Muhammad Jabbar @ 150% ──
function zoomReset() {
  if (typeof zoomResetToJabbar === "function") {
    zoomResetToJabbar();
  } else {
    _resetToDefault();
  }
}

function _resetToDefault() {
  scale = 1; offsetX = 0; offsetY = 0; currentZoom = 1;
  applyTransform(); updateZoomUI(100);
  const sl = document.getElementById("zoom-slider");
  if (sl) sl.value = 100;
  centerOnMainTree(); saveViewState();
}

function centerOnMainTree() {
  scale = 1; offsetX = 0; offsetY = 0; currentZoom = 1;
  applyTransform(); updateZoomUI(100);
  const wrapper = document.getElementById("tree-wrapper");
  const rootNode = document.querySelector("#tree-instance-main .node-box");
  if (!wrapper || !rootNode) return;
  const rootRect = rootNode.getBoundingClientRect();
  const wrapperRect = wrapper.getBoundingClientRect();
  wrapper.scrollLeft = Math.max(0,
    wrapper.scrollLeft + (rootRect.left - wrapperRect.left) - (wrapper.clientWidth / 2) + (rootRect.width / 2));
  wrapper.scrollTop = Math.max(0,
    wrapper.scrollTop + (rootRect.top - wrapperRect.top) - (wrapper.clientHeight / 2) + (rootRect.height / 2));
  saveViewState();
}

function saveViewState() {
  try {
    const w = document.getElementById("tree-wrapper");
    localStorage.setItem(VIEW_KEY, JSON.stringify({
      scale, offsetX, offsetY,
      scrollLeft: w ? w.scrollLeft : 0,
      scrollTop:  w ? w.scrollTop  : 0
    }));
  } catch(e) {}
}

function loadViewState() {
  try {
    const raw = localStorage.getItem(VIEW_KEY);
    const w   = document.getElementById("tree-wrapper");
    if (!raw) return false;
    const d = JSON.parse(raw);
    scale = d.scale || 1; offsetX = d.offsetX || 0; offsetY = d.offsetY || 0;
    currentZoom = scale;
    applyTransform(); updateZoomUI(Math.round(scale * 100));
    if (w) { w.scrollLeft = d.scrollLeft || 0; w.scrollTop = d.scrollTop || 0; }
    return true;
  } catch(e) { return false; }
}

function isAlwaysInteractive(t) {
  if (!t) return false;
  return !!(t.closest("textarea") || t.closest("input") ||
            t.closest(".zoom-slider") || t.closest(".modal") || t.closest(".custom-popup"));
}

function isClickable(t) {
  return !!(t && (t.closest("button") || t.closest(".node-box")));
}

function suppressNextClick() {
  const h = ev => { ev.stopPropagation(); ev.preventDefault(); };
  document.addEventListener("click", h, { capture: true, once: true });
  setTimeout(() => document.removeEventListener("click", h, { capture: true }), 400);
}

// ── Fling ──
function stopFling() {
  if (flingRAF) { cancelAnimationFrame(flingRAF); flingRAF = null; }
  velX = 0; velY = 0;
}

function startFling() {
  stopFling();
  const FRICTION = 0.92;
  const MIN_VEL  = 0.5;
  function step() {
    if (Math.abs(velX) < MIN_VEL && Math.abs(velY) < MIN_VEL) {
      saveViewState(); flingRAF = null; return;
    }
    offsetX += velX; offsetY += velY;
    velX *= FRICTION; velY *= FRICTION;
    applyTransform();
    flingRAF = requestAnimationFrame(step);
  }
  flingRAF = requestAnimationFrame(step);
}

// ── Mouse drag ──
function startDrag(e) {
  stopFling();
  const t = e.target;
  if (isAlwaysInteractive(t)) return;
  pendingDrag = true; isDragging = false;
  startX = e.clientX; startY = e.clientY;
  startOffsetX = offsetX; startOffsetY = offsetY;
  lastX = e.clientX; lastY = e.clientY; lastT = Date.now();
  velX = 0; velY = 0;
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
  const dt  = now - lastT || 16;
  velX = (e.clientX - lastX) / dt * 16;
  velY = (e.clientY - lastY) / dt * 16;
  lastX = e.clientX; lastY = e.clientY; lastT = now;

  offsetX = startOffsetX + dx;
  offsetY = startOffsetY + dy;
  applyTransform();
}

function endDrag(e) {
  if (isDragging) {
    const dx = (e?.clientX ?? startX) - startX;
    const dy = (e?.clientY ?? startY) - startY;
    if (Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
      suppressNextClick();
      startFling();
    } else {
      saveViewState();
    }
  }
  isDragging = false; pendingDrag = false;
}

// ── Touch ──
function getDist(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx*dx + dy*dy);
}

function touchStart(e) {
  stopFling();
  if (e.touches.length >= 2) {
    if (isInfoModalOpen()) {
      isInfoPinching = true; isPinching = false; isDragging = false; pendingDrag = false;
      startDist = getDist(e.touches); startInfoZoom = infoZoom;
      e.preventDefault(); return;
    }
    isPinching = true; isDragging = false; pendingDrag = false;
    startDist = getDist(e.touches); startScale = scale;
    e.preventDefault(); return;
  }
  if (e.touches.length === 1) {
    if (isPinching || isInfoPinching || Date.now() < pinchCooldown) return;
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (isAlwaysInteractive(target)) return;
    pendingDrag = true; isDragging = false;
    startX = touch.clientX; startY = touch.clientY;
    startOffsetX = offsetX; startOffsetY = offsetY;
    lastX = touch.clientX; lastY = touch.clientY; lastT = Date.now();
    velX = 0; velY = 0;
    if (!isClickable(target)) isDragging = true;
  }
}

function touchMove(e) {
  if (isInfoPinching && e.touches.length >= 2) {
    e.preventDefault();
    const f = getDist(e.touches) / startDist;
    infoZoom = Math.max(INFO_ZOOM_MIN, Math.min(INFO_ZOOM_MAX, startInfoZoom * f));
    applyInfoZoom(); return;
  }
  if (isPinching && e.touches.length >= 2) {
    e.preventDefault();
    const dist  = getDist(e.touches);
    const zoom  = (startScale * dist / startDist) * 100;
    const cx    = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const cy    = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    setZoom(zoom, cx, cy); return;
  }
  if ((isDragging || pendingDrag) && e.touches.length === 1 && !isPinching && !isInfoPinching) {
    const t  = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (!isDragging) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      isDragging = true;
    }
    e.preventDefault();

    const now = Date.now();
    const dt  = now - lastT || 16;
    velX = (t.clientX - lastX) / dt * 16;
    velY = (t.clientY - lastY) / dt * 16;
    lastX = t.clientX; lastY = t.clientY; lastT = now;

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
    if (isDragging) {
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
    isDragging = false; pendingDrag = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const w = document.getElementById("tree-wrapper");
  if (w) {
    let t = null;
    w.addEventListener("scroll", () => {
      clearTimeout(t); t = setTimeout(saveViewState, 200);
    });
  }
});
/*Stable + fling + smooth*/
