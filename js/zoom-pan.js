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

let isPinching = false;
let startDist = 0;
let startScale = 1;
let pinchCooldown = 0;

let isInfoPinching = false;
let infoZoom = 1;
let startInfoZoom = 1;

let repositionMode = false;

const DRAG_THRESHOLD = 8;
const INFO_ZOOM_MIN = 0.6;
const INFO_ZOOM_MAX = 4;

const VIEW_KEY = "silsilah_view_state_v2";

const getContainer = () => document.getElementById("tree-zoom-container");
const getInfoModal = () => document.getElementById("info-modal");

function isInfoModalOpen() {
  const m = getInfoModal();
  if (!m) return false;
  const disp = m.style.display;
  return disp === "flex" || disp === "block";
}

function applyInfoZoom() {
  const body = document.getElementById("info-body");
  if (body) body.style.setProperty("--info-zoom", String(infoZoom));
}

function resetInfoZoom() {
  infoZoom = 1;
  applyInfoZoom();
}

function applyTransform() {
  const el = getContainer();
  if (!el) return;
  el.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
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
  scale = 1;
  offsetX = 0;
  offsetY = 0;
  currentZoom = 1;

  applyTransform();
  updateZoomUI(100);
  const slider = document.getElementById("zoom-slider");
  if (slider) slider.value = 100;
  centerOnMainTree();
  saveViewState();
}

// ========== CENTER KE ROOT NODE MAIN TREE ==========
function centerOnMainTree() {
  const wrapper = document.getElementById("tree-wrapper");
  const main = document.getElementById("tree-instance-main");
  if (!wrapper || !main) return;
  
  // Reset zoom ke 100%
  scale = 1;
  offsetX = 0;
  offsetY = 0;
  currentZoom = 1;
  applyTransform();
  updateZoomUI(100);
  
  // Dapatkan root node dari main tree
  const rootNode = main.querySelector('.node-box');
  if (!rootNode) {
    // Fallback ke offset Aqua
    wrapper.scrollLeft = main.offsetLeft - (wrapper.clientWidth / 2) + (main.offsetWidth / 2);
    wrapper.scrollTop = main.offsetTop - (wrapper.clientHeight / 2) + (main.offsetHeight / 2);
    return;
  }
  
  // Hitung posisi root node di dalam Aqua
  const nodeLeft = parseFloat(rootNode.style.left) || 0;
  const nodeTop = parseFloat(rootNode.style.top) || 0;
  const nodeWidth = rootNode.offsetWidth;
  const nodeHeight = rootNode.offsetHeight;
  
  // Posisi absolut root node di container #tree
  const absoluteX = main.offsetLeft + nodeLeft;
  const absoluteY = main.offsetTop + nodeTop;
  
  // Scroll agar root node center
  wrapper.scrollLeft = absoluteX - (wrapper.clientWidth / 2) + (nodeWidth / 2);
  wrapper.scrollTop = absoluteY - (wrapper.clientHeight / 2) + (nodeHeight / 2);
  
  saveViewState();
}

function saveViewState() {
  try {
    const w = document.getElementById("tree-wrapper");
    const data = {
      scale,
      offsetX,
      offsetY,
      scrollLeft: w ? w.scrollLeft : 0,
      scrollTop: w ? w.scrollTop : 0
    };
    localStorage.setItem(VIEW_KEY, JSON.stringify(data));
  } catch (e) {}
}

function loadViewState() {
  try {
    const raw = localStorage.getItem(VIEW_KEY);
    const w = document.getElementById("tree-wrapper");
    if (!raw) {
      centerOnMainTree();
      return;
    }
    const data = JSON.parse(raw);
    scale = data.scale || 1;
    offsetX = data.offsetX || 0;
    offsetY = data.offsetY || 0;
    currentZoom = scale;
    applyTransform();
    updateZoomUI(Math.round(scale * 100));
    if (w) {
      w.scrollLeft = (typeof data.scrollLeft === "number") ? data.scrollLeft : 800;
      w.scrollTop  = (typeof data.scrollTop  === "number") ? data.scrollTop  : 400;
    }
  } catch (e) {
    centerOnMainTree();
  }
}

function isAlwaysInteractive(target) {
  if (!target) return false;
  return !!(target.closest("textarea") ||
            target.closest("input") ||
            target.closest(".zoom-slider") ||
            target.closest(".modal") ||
            target.closest(".custom-popup"));
}

function isClickable(target) {
  if (!target) return false;
  return !!(target.closest("button") || target.closest(".node-box"));
}

function suppressNextClick() {
  const handler = (ev) => {
    ev.stopPropagation();
    ev.preventDefault();
  };
  document.addEventListener("click", handler, { capture: true, once: true });
  setTimeout(() => {
    document.removeEventListener("click", handler, { capture: true });
  }, 400);
}

function startDrag(e) {
  const t = e.target;
  if (isAlwaysInteractive(t)) return;

  pendingDrag = true;
  isDragging = false;
  startX = e.clientX;
  startY = e.clientY;
  startOffsetX = offsetX;
  startOffsetY = offsetY;

  if (!isClickable(t)) {
    isDragging = true;
    e.preventDefault();
  }
}

function moveDrag(e) {
  if (!pendingDrag && !isDragging) return;

  const dx = e.clientX - startX;
  const dy = e.clientY - startY;

  if (!isDragging) {
    if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    isDragging = true;
  }

  offsetX = startOffsetX + dx;
  offsetY = startOffsetY + dy;
  applyTransform();
}

function endDrag(e) {
  if (isDragging && e) {
    const dx = (e.clientX ?? startX) - startX;
    const dy = (e.clientY ?? startY) - startY;
    if (Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
      suppressNextClick();
    }
    saveViewState();
  }
  isDragging = false;
  pendingDrag = false;
}

function getDist(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function touchStart(e) {
  if (e.touches.length >= 2) {
    if (isInfoModalOpen()) {
      isInfoPinching = true;
      isPinching = false;
      isDragging = false;
      pendingDrag = false;
      startDist = getDist(e.touches);
      startInfoZoom = infoZoom;
      e.preventDefault();
      return;
    }
    isPinching = true;
    isDragging = false;
    pendingDrag = false;
    startDist = getDist(e.touches);
    startScale = scale;
    e.preventDefault();
    return;
  }

  if (e.touches.length === 1) {
    if (isPinching || isInfoPinching || Date.now() < pinchCooldown) return;

    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);

    if (isAlwaysInteractive(target)) return;

    pendingDrag = true;
    isDragging = false;
    startX = touch.clientX;
    startY = touch.clientY;
    startOffsetX = offsetX;
    startOffsetY = offsetY;

    if (!isClickable(target)) {
      isDragging = true;
    }
  }
}

function touchMove(e) {
  if (isInfoPinching && e.touches.length >= 2) {
    e.preventDefault();
    const dist = getDist(e.touches);
    if (startDist <= 0) return;
    const factor = dist / startDist;
    let z = startInfoZoom * factor;
    z = Math.max(INFO_ZOOM_MIN, Math.min(INFO_ZOOM_MAX, z));
    infoZoom = z;
    applyInfoZoom();
    return;
  }

  if (isPinching && e.touches.length >= 2) {
    e.preventDefault();
    const dist = getDist(e.touches);
    if (startDist <= 0) return;
    const factor = dist / startDist;
    const zoom = (startScale * factor) * 100;
    const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    setZoom(zoom, centerX, centerY);
    return;
  }

  if ((isDragging || pendingDrag) && e.touches.length === 1 && !isPinching && !isInfoPinching) {
    const t = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;

    if (!isDragging) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      isDragging = true;
    }

    e.preventDefault();
    offsetX = startOffsetX + dx;
    offsetY = startOffsetY + dy;
    applyTransform();
  }
}

function touchEnd(e) {
  if ((isPinching || isInfoPinching) && e.touches.length < 2) {
    isPinching = false;
    isInfoPinching = false;
    isDragging = false;
    pendingDrag = false;
    pinchCooldown = Date.now() + 250;
    saveViewState();
  }

  if (e.touches.length === 0) {
    if (isDragging) {
      const ct = e.changedTouches && e.changedTouches[0];
      const dx = (ct ? ct.clientX : startX) - startX;
      const dy = (ct ? ct.clientY : startY) - startY;
      if (Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
        suppressNextClick();
      }
      saveViewState();
    }
    isDragging = false;
    pendingDrag = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const w = document.getElementById("tree-wrapper");
  if (w) {
    let t = null;
    w.addEventListener("scroll", () => {
      clearTimeout(t);
      t = setTimeout(saveViewState, 200);
    });
  }
});
/*Stable + center-root-node*/
