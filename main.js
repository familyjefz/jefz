// ========== ZOOM FUNCTIONS ==========
function setZoom(zoom) {
  zoom = Math.max(15, Math.min(300, zoom)); // clamp

  const oldZoom = currentZoom;
  const newZoom = zoom / 50;
  currentZoom = newZoom;

  const zoomContainer = document.getElementById("tree-zoom-container");
  const wrapper = document.getElementById("tree-wrapper");

  if (zoomContainer && wrapper) {
    const rect = wrapper.getBoundingClientRect();

    const centerX = wrapper.scrollLeft + rect.width / 2;
    const centerY = wrapper.scrollTop + rect.height / 2;

    const relX = centerX / oldZoom;
    const relY = centerY / oldZoom;

    zoomContainer.style.transform = `scale(${newZoom})`;
    zoomContainer.style.transformOrigin = "0 0";

    wrapper.scrollLeft = relX * newZoom - rect.width / 2;
    wrapper.scrollTop = relY * newZoom - rect.height / 2;
  }

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

// ========== INVERT ==========
const INVERT_KEY = "silsilah_invert_mode";

function toggleInvert() {
  document.body.classList.toggle("invert-mode");
  localStorage.setItem(INVERT_KEY, document.body.classList.contains("invert-mode"));
}

function loadInvertSetting() {
  if (localStorage.getItem(INVERT_KEY) === "true") {
    document.body.classList.add("invert-mode");
  }
}

// ========== LOGIN SESSION ==========
const SESSION_KEY = "silsilah_admin_logged_in";

function saveLoginSession() {
  localStorage.setItem(SESSION_KEY, "true");
}

function clearLoginSession() {
  localStorage.removeItem(SESSION_KEY);
}

function isLoggedIn() {
  return localStorage.getItem(SESSION_KEY) === "true";
}

// ========== MODAL CENTER FIX ==========
function centerModal(selector) {
  const modal = document.querySelector(selector);
  if (!modal) return;

  const content = modal.querySelector(".modal-content");
  if (!content) return;

  content.style.position = "fixed";
  content.style.top = "50%";
  content.style.left = "50%";
  content.style.transform = "translate(-50%, -50%)";
}

// ========== LOGIN ==========
function showLoginModal() {
  const modal = document.getElementById("login-modal");
  modal.style.display = "flex";

  document.getElementById("pin-input").value = "";
  document.getElementById("pin-error").innerText = "";

  setTimeout(() => centerModal("#login-modal"), 10);
}

function closeLoginModal() {
  document.getElementById("login-modal").style.display = "none";
}

function showInfoModal() {
  const modal = document.getElementById("info-modal");
  modal.style.display = "flex";
  setTimeout(() => centerModal("#info-modal"), 10);
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

  document.getElementById("zoom-reset")?.addEventListener("click", zoomReset);
  document.getElementById("invert-btn")?.addEventListener("click", toggleInvert);
  document.getElementById("login-btn")?.addEventListener("click", onLoginLogoutClick);
  document.getElementById("undo-btn")?.addEventListener("click", undoAction);
  document.getElementById("redo-btn")?.addEventListener("click", redoAction);

  document.querySelector(".close")?.addEventListener("click", closeLoginModal);
  document.querySelector(".close-info")?.addEventListener("click", closeInfoModal);

  document.getElementById("submit-pin")?.addEventListener("click", checkPin);
  document.getElementById("pin-input")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") checkPin();
  });
});

// klik luar modal
window.addEventListener("click", (e) => {
  if (e.target.id === "login-modal") closeLoginModal();
  if (e.target.id === "info-modal") closeInfoModal();
});

loadTree();
