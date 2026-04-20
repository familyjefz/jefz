// ================= STATE =================
let scale = 1;          // zoom (1 = 50%)
let offsetX = 0;
let offsetY = 0;

let isDragging = false;
let startX = 0;
let startY = 0;

let startOffsetX = 0;
let startOffsetY = 0;

let isPinching = false;
let startDist = 0;
let startScale = 1;

// ================= ELEMENT =================
const container = () => document.getElementById("tree-zoom-container");

// ================= APPLY TRANSFORM =================
function applyTransform() {
  const el = container();
  if (!el) return;

  el.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
}

// ================= ZOOM =================
function setZoom(zoom, centerX = window.innerWidth / 2, centerY = window.innerHeight / 2) {
  zoom = Math.max(15, Math.min(300, zoom));

  const newScale = zoom / 50;

  const el = container();
  if (!el) return;

  const rect = el.getBoundingClientRect();

  const dx = centerX - rect.left;
  const dy = centerY - rect.top;

  offsetX -= dx * (newScale / scale - 1);
  offsetY -= dy * (newScale / scale - 1);

  scale = newScale;

  applyTransform();

  // UI sync
  document.getElementById("zoom-value").textContent = Math.round(zoom) + "%";
  document.getElementById("zoom-slider").value = zoom;
}

function zoomReset() {
  scale = 1;
  offsetX = 0;
  offsetY = 0;

  applyTransform();

  document.getElementById("zoom-value").textContent = "50%";
  document.getElementById("zoom-slider").value = 50;
}

// ================= SLIDER =================
function updateZoomFromSlider(e) {
  setZoom(parseInt(e.target.value));
}

// ================= DRAG =================
function startDrag(e) {
  if (e.target.closest("button") || e.target.closest("textarea")) return;

  isDragging = true;

  startX = e.clientX;
  startY = e.clientY;

  startOffsetX = offsetX;
  startOffsetY = offsetY;
}

function moveDrag(e) {
  if (!isDragging) return;

  offsetX = startOffsetX + (e.clientX - startX);
  offsetY = startOffsetY + (e.clientY - startY);

  applyTransform();
}

function endDrag() {
  isDragging = false;
}

// ================= PINCH =================
function getDist(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function touchStart(e) {
  if (e.touches.length === 2) {
    isPinching = true;
    startDist = getDist(e.touches);
    startScale = scale;
  } else if (e.touches.length === 1) {
    startDrag(e.touches[0]);
  }
}

function touchMove(e) {
  if (isPinching && e.touches.length === 2) {
    const dist = getDist(e.touches);
    const factor = dist / startDist;

    const zoom = (startScale * factor) * 50;

    const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

    setZoom(zoom, centerX, centerY);
  } else if (e.touches.length === 1) {
    moveDrag(e.touches[0]);
  }
}

function touchEnd() {
  isPinching = false;
  endDrag();
}

// ================= MODAL FIX =================
function showLoginModal() {
  document.getElementById("login-modal").style.display = "flex";
}

function closeLoginModal() {
  document.getElementById("login-modal").style.display = "none";
}

function showInfoModal() {
  document.getElementById("info-modal").style.display = "flex";
}

function closeInfoModal() {
  document.getElementById("info-modal").style.display = "none";
}

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {
  // init zoom
  zoomReset();

  // slider
  document.getElementById("zoom-slider")
    ?.addEventListener("input", updateZoomFromSlider);

  // mouse
  document.addEventListener("mousedown", startDrag);
  document.addEventListener("mousemove", moveDrag);
  document.addEventListener("mouseup", endDrag);

  // touch
  document.addEventListener("touchstart", touchStart);
  document.addEventListener("touchmove", touchMove);
  document.addEventListener("touchend", touchEnd);

  // buttons
  document.getElementById("zoom-reset")?.addEventListener("click", zoomReset);
  document.getElementById("login-btn")?.addEventListener("click", onLoginLogoutClick);

  document.querySelector(".close")?.addEventListener("click", closeLoginModal);
  document.querySelector(".close-info")?.addEventListener("click", closeInfoModal);

  document.getElementById("submit-pin")?.addEventListener("click", checkPin);

  // klik luar modal
  window.addEventListener("click", (e) => {
    if (e.target.id === "login-modal") closeLoginModal();
    if (e.target.id === "info-modal") closeInfoModal();
  });
});

loadTree();
