// ================= STATE =================
let scale = 1;
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
const wrapper = () => document.getElementById("tree-wrapper");

// ================= APPLY =================
function applyTransform() {
  const el = container();
  if (!el) return;
  el.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
}

// ================= ZOOM =================
function setZoom(zoom, cx = null, cy = null) {
  zoom = Math.max(15, Math.min(300, zoom));
  const newScale = zoom / 50;

  const wrap = wrapper();
  const el = container();
  if (!wrap || !el) return;

  const rect = wrap.getBoundingClientRect();

  if (cx === null || cy === null) {
    cx = rect.width / 2;
    cy = rect.height / 2;
  }

  const dx = cx - rect.left;
  const dy = cy - rect.top;

  offsetX -= dx * (newScale / scale - 1);
  offsetY -= dy * (newScale / scale - 1);

  scale = newScale;

  applyTransform();

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

// ================= FILTER AREA =================
function isUIElement(target) {
  return (
    target.closest(".modal") ||
    target.closest("button") ||
    target.closest("textarea") ||
    target.closest("input")
  );
}

// ================= DRAG =================
function startDrag(e) {
  if (isUIElement(e.target)) return;

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
function getDist(t) {
  const dx = t[0].clientX - t[1].clientX;
  const dy = t[0].clientY - t[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function touchStart(e) {
  if (isUIElement(e.target)) return;

  if (e.touches.length === 2) {
    isPinching = true;
    startDist = getDist(e.touches);
    startScale = scale;
  } else if (e.touches.length === 1) {
    startDrag(e.touches[0]);
  }
}

function touchMove(e) {
  if (isUIElement(e.target)) return;

  if (isPinching && e.touches.length === 2) {
    const dist = getDist(e.touches);
    const factor = dist / startDist;

    const zoom = (startScale * factor) * 50;

    const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;

    setZoom(zoom, cx, cy);
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
  zoomReset();

  const wrap = wrapper();

  // EVENT HANYA DI AREA TREE
  wrap.addEventListener("mousedown", startDrag);
  wrap.addEventListener("mousemove", moveDrag);
  wrap.addEventListener("mouseup", endDrag);
  wrap.addEventListener("mouseleave", endDrag);

  wrap.addEventListener("touchstart", touchStart, { passive: false });
  wrap.addEventListener("touchmove", touchMove, { passive: false });
  wrap.addEventListener("touchend", touchEnd);

  document.getElementById("zoom-slider")?.addEventListener("input", updateZoomFromSlider);
  document.getElementById("zoom-reset")?.addEventListener("click", zoomReset);

  document.getElementById("login-btn")?.addEventListener("click", onLoginLogoutClick);

  document.querySelector(".close")?.addEventListener("click", closeLoginModal);
  document.querySelector(".close-info")?.addEventListener("click", closeInfoModal);

  document.getElementById("submit-pin")?.addEventListener("click", checkPin);

  window.addEventListener("click", (e) => {
    if (e.target.id === "login-modal") closeLoginModal();
    if (e.target.id === "info-modal") closeInfoModal();
  });
});

loadTree();
