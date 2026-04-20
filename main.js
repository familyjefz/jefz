// ========== ZOOM ==========
function setZoom(zoom, cx = null, cy = null) {
  zoom = Math.max(15, Math.min(300, zoom));

  const wrapper = document.getElementById("tree-wrapper");
  const container = document.getElementById("tree-zoom-container");

  if (!wrapper || !container) return;

  const oldZoom = currentZoom;
  const newZoom = zoom / 50;

  const rect = wrapper.getBoundingClientRect();

  if (cx === null || cy === null) {
    cx = rect.width / 2;
    cy = rect.height / 2;
  }

  const worldX = (wrapper.scrollLeft + cx) / oldZoom;
  const worldY = (wrapper.scrollTop + cy) / oldZoom;

  container.style.transform = `scale(${newZoom})`;
  container.style.transformOrigin = "0 0";

  currentZoom = newZoom;

  wrapper.scrollLeft = worldX * newZoom - cx;
  wrapper.scrollTop = worldY * newZoom - cy;

  // sync UI
  const zoomValue = document.getElementById("zoom-value");
  if (zoomValue) zoomValue.textContent = Math.round(zoom) + "%";

  const slider = document.getElementById("zoom-slider");
  if (slider && slider.value != zoom) slider.value = zoom;
}

function updateZoomFromSlider(e) {
  setZoom(parseInt(e.target.value));
}

function zoomReset() {
  setZoom(50);
}

// ========== PINCH SMOOTH ==========
let pinchStartDist = 0;
let pinchStartZoom = 50;

function getDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function touchStart(e) {
  if (e.touches.length === 2) {
    pinchStartDist = getDistance(e.touches);
    pinchStartZoom = currentZoom * 50;
  }
}

function touchMove(e) {
  if (e.touches.length === 2) {
    e.preventDefault();

    const newDist = getDistance(e.touches);
    const ratio = newDist / pinchStartDist;

    const zoom = pinchStartZoom * ratio;

    const wrapper = document.getElementById("tree-wrapper");
    const rect = wrapper.getBoundingClientRect();

    const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
    const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

    setZoom(zoom, cx, cy);
  }
}

// ========== MODAL ==========
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

// ========== INIT ==========
document.addEventListener("DOMContentLoaded", () => {
  loadInvertSetting();

  if (isLoggedIn()) {
    isAdmin = true;
    updateLoginButton();
    updateUndoRedoButtons();
  }

  const slider = document.getElementById("zoom-slider");
  if (slider) {
    slider.min = "15";
    slider.max = "300";
    slider.value = "50";
    setZoom(50);
    slider.addEventListener("input", updateZoomFromSlider);
  }

  // pinch hanya di tree (AMAN)
  const wrapper = document.getElementById("tree-wrapper");
  wrapper.addEventListener("touchstart", touchStart, { passive: false });
  wrapper.addEventListener("touchmove", touchMove, { passive: false });

  // tombol
  document.getElementById("zoom-reset")?.addEventListener("click", zoomReset);
  document.getElementById("invert-btn")?.addEventListener("click", toggleInvert);
  document.getElementById("login-btn")?.addEventListener("click", onLoginLogoutClick);
  document.getElementById("undo-btn")?.addEventListener("click", undoAction);
  document.getElementById("redo-btn")?.addEventListener("click", redoAction);

  document.querySelector(".close")?.addEventListener("click", closeLoginModal);
  document.querySelector(".close-info")?.addEventListener("click", closeInfoModal);

  document.getElementById("submit-pin")?.addEventListener("click", checkPin);

  window.addEventListener("click", (e) => {
    if (e.target.id === "login-modal") closeLoginModal();
    if (e.target.id === "info-modal") closeInfoModal();
  });
});

loadTree();
