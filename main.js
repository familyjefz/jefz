// ========== ZOOM FUNCTIONS ==========
function setZoom(zoom) {
  const oldZoom = currentZoom;
  const newZoom = zoom / 50;
  currentZoom = newZoom;
  
  const zoomContainer = document.getElementById("tree-zoom-container");
  const wrapper = document.getElementById("tree-wrapper");
  
  if (zoomContainer && wrapper && oldZoom !== newZoom) {

    const rect = wrapper.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const worldX = (wrapper.scrollLeft + centerX) / oldZoom;
    const worldY = (wrapper.scrollTop + centerY) / oldZoom;

    zoomContainer.style.transform = `scale(${newZoom})`;
    zoomContainer.style.transformOrigin = "0 0";

    wrapper.scrollLeft = worldX * newZoom - centerX;
    wrapper.scrollTop = worldY * newZoom - centerY;
  }
  
  const zoomValue = document.getElementById("zoom-value");
  if (zoomValue) zoomValue.textContent = Math.round(zoom) + "%";

  const slider = document.getElementById("zoom-slider");
  if (slider && slider.value != zoom) slider.value = zoom;
}

function updateZoomFromSlider() {
  const slider = document.getElementById("zoom-slider");
  if (slider) setZoom(parseInt(slider.value));
}

function zoomReset() { setZoom(50); }

// ========== INVERT ==========
const INVERT_KEY = "silsilah_invert_mode";

function toggleInvert() {
  document.body.classList.toggle("invert-mode");
  const isInvert = document.body.classList.contains("invert-mode");
  localStorage.setItem(INVERT_KEY, isInvert ? "true" : "false");
}

function loadInvertSetting() {
  const savedInvert = localStorage.getItem(INVERT_KEY);
  if (savedInvert === "true") {
    document.body.classList.add("invert-mode");
  }
}

// ========== SESSION LOGIN ==========
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

// ========== CUSTOM POPUP ==========
function showCustomPopup(message, title = "Informasi", onConfirm = null, showCancel = false) {
  const popup = document.getElementById("custom-popup");
  if (!popup) {
    alert(message);
    if (onConfirm) onConfirm();
    return;
  }
  
  const popupTitle = document.getElementById("popup-title");
  const popupMessage = document.getElementById("popup-message");
  const popupButtons = document.getElementById("popup-buttons");
  
  popupTitle.textContent = title;
  popupMessage.innerHTML = message;
  
  popupButtons.innerHTML = "";
  
  const confirmBtn = document.createElement("button");
  confirmBtn.textContent = "OK";
  confirmBtn.onclick = () => {
    popup.style.display = "none";
    if (onConfirm) onConfirm();
  };

  popupButtons.appendChild(confirmBtn);

  if (showCancel) {
    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Batal";
    cancelBtn.onclick = () => popup.style.display = "none";
    popupButtons.appendChild(cancelBtn);
  }
  
  popup.style.display = "flex";
}

function closeCustomPopup() {
  const popup = document.getElementById("custom-popup");
  if (popup) popup.style.display = "none";
}

// ========== MODAL (FIX CENTER) ==========
function showLoginModal() {
  const modal = document.getElementById("login-modal");
  modal.style.display = "flex";
  document.getElementById("pin-input").value = "";
  document.getElementById("pin-error").innerText = "";
}

function closeLoginModal() {
  document.getElementById("login-modal").style.display = "none";
}

function closeInfoModal() {
  document.getElementById("info-modal").style.display = "none";
}

function showInfoModal() {
  document.getElementById("info-modal").style.display = "flex";
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

  document.querySelector(".close")?.addEventListener("click", closeLoginModal);
  document.querySelector(".close-info")?.addEventListener("click", closeInfoModal);

  document.getElementById("submit-pin")?.addEventListener("click", checkPin);
  document.getElementById("pin-input")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") checkPin();
  });

  window.addEventListener("click", (e) => {
    if (e.target.id === "login-modal") closeLoginModal();
    if (e.target.id === "info-modal") closeInfoModal();
    if (e.target.id === "custom-popup") closeCustomPopup();
  });
});

loadTree();
