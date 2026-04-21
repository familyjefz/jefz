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

const DRAG_THRESHOLD = 8;

// ========== ELEMENT REFERENCES ==========
const getContainer = () => document.getElementById("tree-zoom-container");

// ========== APPLY TRANSFORM ==========
function applyTransform() {
  const el = getContainer();
  if (!el) return;
  el.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
  el.style.transformOrigin = "0 0";
}

// ========== ZOOM FUNCTION ==========
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
  document.getElementById("zoom-slider").value = 100;
}

// ========== HELPERS ==========
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
  // Safety: remove if no click fires
  setTimeout(() => {
    document.removeEventListener("click", handler, { capture: true });
  }, 400);
}

// ========== MOUSE / PEN DRAG PAN ==========
function startDrag(e) {
  const t = e.target;
  if (isAlwaysInteractive(t)) return;

  pendingDrag = true;
  isDragging = false;
  startX = e.clientX;
  startY = e.clientY;
  startOffsetX = offsetX;
  startOffsetY = offsetY;

  // If not on a clickable, we can drag right away and prevent text selection
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
      // A real pan happened — swallow the resulting click on buttons
      suppressNextClick();
    }
  }
  isDragging = false;
  pendingDrag = false;
}

// ========== PINCH ZOOM ==========
function getDist(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function touchStart(e) {
  if (e.touches.length >= 2) {
    isPinching = true;
    isDragging = false;
    pendingDrag = false;
    startDist = getDist(e.touches);
    startScale = scale;
    e.preventDefault();
    return;
  }

  if (e.touches.length === 1) {
    // If we are still inside the pinch cooldown, don't start a drag —
    // this prevents jumps when fingers are released non-simultaneously.
    if (isPinching || Date.now() < pinchCooldown) return;

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

  if ((isDragging || pendingDrag) && e.touches.length === 1 && !isPinching) {
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
  // Coming out of pinch: when fewer than 2 touches remain, end the pinch
  // and DO NOT promote the leftover finger into a drag (that's what
  // caused the tree to "loncat" when fingers lifted at different times).
  if (isPinching && e.touches.length < 2) {
    isPinching = false;
    isDragging = false;
    pendingDrag = false;
    // Brief cooldown so a stray remaining finger can't immediately start a drag
    pinchCooldown = Date.now() + 250;
  }

  if (e.touches.length === 0) {
    if (isDragging) {
      const ct = e.changedTouches && e.changedTouches[0];
      const dx = (ct ? ct.clientX : startX) - startX;
      const dy = (ct ? ct.clientY : startY) - startY;
      if (Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
        suppressNextClick();
      }
    }
    isDragging = false;
    pendingDrag = false;
  }
}
/*Stable*/
