// ========== ZOOM FUNCTIONS ==========
function setZoom(zoom) {
  const wrapper = document.getElementById("tree-wrapper");
  const container = document.getElementById("tree-zoom-container");

  if (!wrapper || !container) return;

  zoom = Math.max(15, Math.min(300, zoom));

  const newZoom = zoom / 50;
  const oldZoom = currentZoom || 1;

  const rect = wrapper.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;

  const worldX = (wrapper.scrollLeft + centerX) / oldZoom;
  const worldY = (wrapper.scrollTop + centerY) / oldZoom;

  container.style.transform = `scale(${newZoom})`;
  container.style.transformOrigin = "0 0";

  wrapper.scrollLeft = worldX * newZoom - centerX;
  wrapper.scrollTop = worldY * newZoom - centerY;

  currentZoom = newZoom;

  // sync UI
  const zoomValue = document.getElementById("zoom-value");
  if (zoomValue) zoomValue.textContent = Math.round(zoom) + "%";

  const slider = document.getElementById("zoom-slider");
  if (slider && slider.value != zoom) slider.value = zoom;
}

function updateZoomFromSlider() {
  const slider = document.getElementById("zoom-slider");
  if (slider) setZoom(parseInt(slider.value));
}

function zoomReset() {
  setZoom(50);
}

// ========== MODAL FIX ==========
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
    slider.step = "1";
    slider.value = "50";
    setZoom(50);
    slider.addEventListener("input", updateZoomFromSlider);
  }

  document.getElementById("zoom-reset")?.addEventListener("click", zoomReset);
  document.getElementById("invert-btn")?.addEventListener("click", toggleInvert);
  document.getElementById("login-btn")?.addEventListener("click", onLoginLogoutClick);

  document.getElementById("undo-btn")?.addEventListener("click", undoAction);
  document.getElementById("redo-btn")?.addEventListener("click", redoAction);

  // 🔥 FIX tombol close
  document.querySelector(".close")?.addEventListener("click", (e) => {
    e.stopPropagation();
    closeLoginModal();
  });

  document.querySelector(".close-info")?.addEventListener("click", (e) => {
    e.stopPropagation();
    closeInfoModal();
  });

  document.getElementById("submit-pin")?.addEventListener("click", checkPin);

  document.getElementById("pin-input")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") checkPin();
  });

  // 🔥 FIX klik luar modal TANPA ganggu tombol
  document.getElementById("login-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "login-modal") closeLoginModal();
  });

  document.getElementById("info-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "info-modal") closeInfoModal();
  });

  document.getElementById("custom-popup")?.addEventListener("click", (e) => {
    if (e.target.id === "custom-popup") closeCustomPopup();
  });
});

loadTree();
