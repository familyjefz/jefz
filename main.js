// ========== ZOOM FUNCTIONS ==========
function setZoom(zoom) {
  const oldZoom = currentZoom;
  const newZoom = zoom / 100; // tetap benar
  
  currentZoom = newZoom;
  
  const zoomContainer = document.getElementById("tree-zoom-container");
  const wrapper = document.getElementById("tree-wrapper");
  
  if (zoomContainer && wrapper && oldZoom !== newZoom) {
    const rect = wrapper.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const oldScrollLeft = wrapper.scrollLeft;
    const oldScrollTop = wrapper.scrollTop;
    
    zoomContainer.style.transform = `scale(${newZoom})`;
    zoomContainer.style.transformOrigin = "0 0";
    
    const newScrollLeft = (oldScrollLeft + centerX) * (newZoom / oldZoom) - centerX;
    const newScrollTop = (oldScrollTop + centerY) * (newZoom / oldZoom) - centerY;
    
    setTimeout(() => {
      wrapper.scrollLeft = newScrollLeft;
      wrapper.scrollTop = newScrollTop;
    }, 10);
  }
  
  const zoomValue = document.getElementById("zoom-value");
  if (zoomValue) {
    zoomValue.textContent = Math.round(zoom) + "%";
  }

  const slider = document.getElementById("zoom-slider");
  if (slider && slider.value != zoom) {
    slider.value = zoom;
  }
}

function updateZoomFromSlider() {
  const slider = document.getElementById("zoom-slider");
  if (slider) {
    setZoom(parseInt(slider.value));
  }
}

// ✅ RESET KE 50
function zoomReset() { 
  setZoom(50); 
}

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

// ========== SESSION ==========
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

// ========== LOGIN MODAL ==========
function showLoginModal() {
  const modal = document.getElementById("login-modal");
  modal.style.display = "block";
  document.getElementById("pin-input").value = "";
  document.getElementById("pin-error").innerText = "";
  
  setTimeout(() => {
    const modalContent = document.querySelector("#login-modal .modal-content");
    if (modalContent) {
      modalContent.style.top = "50%";
      modalContent.style.left = "50%";
      modalContent.style.transform = "translate(-50%, -50%)";
    }
    document.getElementById("pin-input").focus();
  }, 10);
}

function closeLoginModal() {
  document.getElementById("login-modal").style.display = "none";
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

    slider.value = "50"; // ✅ default ikut kamu
    setZoom(50);         // ✅ default ikut kamu

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

window.addEventListener("click", (e) => {
  if (e.target === document.getElementById("login-modal")) {
    closeLoginModal();
  }
  if (e.target === document.getElementById("info-modal")) {
    closeInfoModal();
  }
  if (e.target === document.getElementById("custom-popup")) {
    closeCustomPopup();
  }
});

loadTree();
