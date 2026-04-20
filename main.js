// ================= STATE =================
let isPanning = false;
let startX = 0;
let startY = 0;
let scrollLeftStart = 0;
let scrollTopStart = 0;

let velocityX = 0;
let velocityY = 0;
let momentumFrame = null;

let lastTap = 0;

// pinch
let isPinching = false;
let pinchStartDist = 0;
let pinchStartZoom = 50;

// ================= UTIL =================
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// ================= ZOOM CORE =================
function setZoom(zoom, focusX = null, focusY = null) {
  zoom = clamp(zoom, 15, 300);

  const oldZoom = currentZoom;
  const newZoom = zoom / 50;

  const zoomContainer = document.getElementById("tree-zoom-container");
  const wrapper = document.getElementById("tree-wrapper");
  if (!zoomContainer || !wrapper) return;

  const rect = wrapper.getBoundingClientRect();

  if (focusX === null || focusY === null) {
    focusX = wrapper.scrollLeft + rect.width / 2;
    focusY = wrapper.scrollTop + rect.height / 2;
  }

  const relX = focusX / oldZoom;
  const relY = focusY / oldZoom;

  zoomContainer.style.transform = `scale(${newZoom})`;
  zoomContainer.style.transformOrigin = "0 0";

  currentZoom = newZoom;

  wrapper.scrollLeft = relX * newZoom - rect.width / 2;
  wrapper.scrollTop = relY * newZoom - rect.height / 2;

  // UI sync
  const zoomValue = document.getElementById("zoom-value");
  if (zoomValue) zoomValue.textContent = Math.round(zoom) + "%";

  const slider = document.getElementById("zoom-slider");
  if (slider && slider.value != zoom) slider.value = zoom;
}

function zoomReset() {
  setZoom(50);
}

// ================= DOUBLE TAP =================
function handleTap(e) {
  const now = Date.now();
  const delta = now - lastTap;
  lastTap = now;

  if (delta < 300) {
    const wrapper = document.getElementById("tree-wrapper");
    const rect = wrapper.getBoundingClientRect();

    const x = wrapper.scrollLeft + (e.clientX - rect.left);
    const y = wrapper.scrollTop + (e.clientY - rect.top);

    const current = currentZoom * 50;
    const next = current < 100 ? 120 : 50;

    setZoom(next, x, y);
  }
}

// ================= DRAG + MOMENTUM =================
function startPan(e) {
  cancelMomentum();

  const wrapper = document.getElementById("tree-wrapper");

  isPanning = true;
  startX = e.clientX;
  startY = e.clientY;
  scrollLeftStart = wrapper.scrollLeft;
  scrollTopStart = wrapper.scrollTop;

  velocityX = 0;
  velocityY = 0;
}

function movePan(e) {
  if (!isPanning) return;

  const wrapper = document.getElementById("tree-wrapper");

  const dx = e.clientX - startX;
  const dy = e.clientY - startY;

  wrapper.scrollLeft = scrollLeftStart - dx;
  wrapper.scrollTop = scrollTopStart - dy;

  velocityX = dx;
  velocityY = dy;
}

function endPan() {
  if (!isPanning) return;
  isPanning = false;

  startMomentum();
}

function startMomentum() {
  const wrapper = document.getElementById("tree-wrapper");

  function step() {
    velocityX *= 0.92;
    velocityY *= 0.92;

    wrapper.scrollLeft -= velocityX;
    wrapper.scrollTop -= velocityY;

    if (Math.abs(velocityX) > 0.5 || Math.abs(velocityY) > 0.5) {
      momentumFrame = requestAnimationFrame(step);
    }
  }

  momentumFrame = requestAnimationFrame(step);
}

function cancelMomentum() {
  if (momentumFrame) {
    cancelAnimationFrame(momentumFrame);
    momentumFrame = null;
  }
}

// ================= WHEEL ZOOM =================
function handleWheelZoom(e) {
  if (!e.ctrlKey) return;

  e.preventDefault();

  const wrapper = document.getElementById("tree-wrapper");
  const rect = wrapper.getBoundingClientRect();

  const x = wrapper.scrollLeft + (e.clientX - rect.left);
  const y = wrapper.scrollTop + (e.clientY - rect.top);

  let zoom = currentZoom * 50;
  zoom += e.deltaY < 0 ? 10 : -10;

  setZoom(zoom, x, y);
}

// ================= PINCH ZOOM (HP) =================
function getDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function handleTouchStart(e) {
  if (e.touches.length === 2) {
    isPinching = true;
    pinchStartDist = getDistance(e.touches);
    pinchStartZoom = currentZoom * 50;
  } else if (e.touches.length === 1) {
    startPan(e.touches[0]);
  }
}

function handleTouchMove(e) {
  if (isPinching && e.touches.length === 2) {
    const dist = getDistance(e.touches);
    const scale = dist / pinchStartDist;

    const newZoom = pinchStartZoom * scale;

    const wrapper = document.getElementById("tree-wrapper");
    const rect = wrapper.getBoundingClientRect();

    const x = wrapper.scrollLeft + rect.width / 2;
    const y = wrapper.scrollTop + rect.height / 2;

    setZoom(newZoom, x, y);
  } else if (e.touches.length === 1) {
    movePan(e.touches[0]);
  }
}

function handleTouchEnd(e) {
  if (isPinching) {
    isPinching = false;
  } else {
    endPan();
  }
}

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {
  loadInvertSetting();

  const wrapper = document.getElementById("tree-wrapper");

  // slider
  const slider = document.getElementById("zoom-slider");
  if (slider) {
    slider.value = "50";
    setZoom(50);
    slider.addEventListener("input", () => setZoom(parseInt(slider.value)));
  }

  // mouse
  wrapper.addEventListener("mousedown", startPan);
  window.addEventListener("mousemove", movePan);
  window.addEventListener("mouseup", endPan);

  // touch
  wrapper.addEventListener("touchstart", handleTouchStart);
  wrapper.addEventListener("touchmove", handleTouchMove);
  wrapper.addEventListener("touchend", handleTouchEnd);

  // double tap
  wrapper.addEventListener("click", handleTap);

  // wheel
  wrapper.addEventListener("wheel", handleWheelZoom, { passive: false });

  // buttons
  document.getElementById("zoom-reset")?.addEventListener("click", zoomReset);
  document.getElementById("invert-btn")?.addEventListener("click", toggleInvert);
  document.querySelector(".close")?.addEventListener("click", closeLoginModal);
});

loadTree();
