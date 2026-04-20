// ================= ZOOM =================
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

  const offsetX = (wrapper.scrollLeft + cx) / oldZoom;
  const offsetY = (wrapper.scrollTop + cy) / oldZoom;

  container.style.transform = `scale(${newZoom})`;
  container.style.transformOrigin = "0 0";

  currentZoom = newZoom;

  wrapper.scrollLeft = offsetX * newZoom - cx;
  wrapper.scrollTop = offsetY * newZoom - cy;

  // sync UI
  document.getElementById("zoom-value").textContent = Math.round(zoom) + "%";
  document.getElementById("zoom-slider").value = zoom;
}

function zoomReset() {
  setZoom(50);
}

function updateZoomFromSlider(e) {
  setZoom(parseInt(e.target.value));
}

// ================= PINCH (FIXED) =================
let lastDist = 0;

function getDist(t) {
  const dx = t[0].clientX - t[1].clientX;
  const dy = t[0].clientY - t[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function touchStart(e) {
  if (e.touches.length === 2) {
    lastDist = getDist(e.touches);
  }
}

function touchMove(e) {
  if (e.touches.length === 2) {
    e.preventDefault();

    const newDist = getDist(e.touches);
    const delta = newDist - lastDist;

    let zoom = currentZoom * 50;

    zoom += delta * 0.5; // sensitif

    const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;

    setZoom(zoom, cx, cy);

    lastDist = newDist;
  }
}

// ================= MODAL =================
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
  // zoom init
  document.getElementById("zoom-slider").value = 50;
  setZoom(50);

  // slider
  document.getElementById("zoom-slider")
    ?.addEventListener("input", updateZoomFromSlider);

  // pinch ONLY on tree
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

  loadInvertSetting();
});

loadTree();
