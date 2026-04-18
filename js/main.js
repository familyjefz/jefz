// ========== ZOOM FUNCTIONS ==========
function setZoom(zoom) {
  currentZoom = zoom;
  const zoomContainer = document.getElementById("tree-zoom-container");
  if (zoomContainer) {
    zoomContainer.style.transform = `scale(${currentZoom})`;
  }
}

function zoomIn() { setZoom(currentZoom + 0.1); }
function zoomOut() { setZoom(currentZoom - 0.1); }
function zoomReset() { setZoom(1); }

// ========== FAB MENU ==========
let isFabMenuVisible = false;

function toggleFabMenu() {
  const fabMenu = document.getElementById("fab-menu");
  
  if (isFabMenuVisible) {
    fabMenu.classList.add("hidden");
    isFabMenuVisible = false;
  } else {
    fabMenu.classList.remove("hidden");
    isFabMenuVisible = true;
  }
}

function updateFabButtons() {
  const undoBtn = document.getElementById("fab-undo");
  const redoBtn = document.getElementById("fab-redo");
  const loginBtn = document.getElementById("fab-login");
  const logoutBtn = document.getElementById("fab-logout");
  
  if (isAdmin) {
    if (undoBtn) undoBtn.style.display = "flex";
    if (redoBtn) redoBtn.style.display = "flex";
    if (loginBtn) loginBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "flex";
  } else {
    if (undoBtn) undoBtn.style.display = "none";
    if (redoBtn) redoBtn.style.display = "none";
    if (loginBtn) loginBtn.style.display = "flex";
    if (logoutBtn) logoutBtn.style.display = "none";
  }
}

// ========== LOGIN MODAL ==========
function showLoginModal() {
  document.getElementById("login-modal").style.display = "block";
  document.getElementById("pin-input").value = "";
  document.getElementById("pin-error").innerText = "";
  setTimeout(() => document.getElementById("pin-input").focus(), 100);
}

function closeLoginModal() {
  document.getElementById("login-modal").style.display = "none";
}

function closeInfoModal() {
  document.getElementById("info-modal").style.display = "none";
}

function checkPin() {
  const pin = document.getElementById("pin-input").value;
  if (pin === ADMIN_PIN) {
    isAdmin = true;
    saveLoginSession();
    closeLoginModal();
    updateFabButtons();
    showPopup("Login sebagai Admin berhasil! Anda sekarang bisa mengedit silsilah.", "Sukses", null, null, false);
    renderTree();
  } else {
    document.getElementById("pin-error").innerText = "PIN salah! Coba lagi.";
  }
}

function logout() {
  isAdmin = false;
  clearLoginSession();
  activePath = null;
  activeMode = null;
  updateFabButtons();
  showPopup("Anda telah logout dari mode Admin.", "Info", null, null, false);
  renderTree();
}

// ========== EVENT LISTENERS ==========
document.addEventListener("click", (e) => {
  if (!e.target.closest(".node-box") && !e.target.closest("button") && e.target.tagName !== "TEXTAREA") {
    const scroll = getCurrentScroll();
    activePath = null;
    activeMode = null;
    renderTree();
    restoreScroll(scroll.left, scroll.top);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  // Cek session login
  if (isLoggedIn()) {
    isAdmin = true;
    updateFabButtons();
  }
  
  // Load theme
  loadTheme();
  
  // FAB Events
  const fabMain = document.getElementById("fab-main");
  if (fabMain) {
    fabMain.addEventListener("click", (e) => {
      e.preventDefault();
      toggleFabMenu();
    });
  }
  
  // Tombol FAB lainnya
  const fabUndo = document.getElementById("fab-undo");
  if (fabUndo) {
    fabUndo.addEventListener("click", (e) => {
      e.preventDefault();
      undoAction();
    });
  }
  
  const fabRedo = document.getElementById("fab-redo");
  if (fabRedo) {
    fabRedo.addEventListener("click", (e) => {
      e.preventDefault();
      redoAction();
    });
  }
  
  const fabZoomIn = document.getElementById("fab-zoom-in");
  if (fabZoomIn) {
    fabZoomIn.addEventListener("click", (e) => {
      e.preventDefault();
      zoomIn();
    });
  }
  
  const fabZoomOut = document.getElementById("fab-zoom-out");
  if (fabZoomOut) {
    fabZoomOut.addEventListener("click", (e) => {
      e.preventDefault();
      zoomOut();
    });
  }
  
  const fabZoomReset = document.getElementById("fab-zoom-reset");
  if (fabZoomReset) {
    fabZoomReset.addEventListener("click", (e) => {
      e.preventDefault();
      zoomReset();
    });
  }
  
  const fabLogin = document.getElementById("fab-login");
  if (fabLogin) {
    fabLogin.addEventListener("click", (e) => {
      e.preventDefault();
      showLoginModal();
    });
  }
  
  const fabLogout = document.getElementById("fab-logout");
  if (fabLogout) {
    fabLogout.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
  }
  
  const fabTheme = document.getElementById("fab-theme");
  if (fabTheme) {
    fabTheme.addEventListener("click", (e) => {
      e.preventDefault();
      toggleTheme();
    });
  }
  
  // Modal Events
  document.querySelector(".close")?.addEventListener("click", closeLoginModal);
  document.querySelector(".close-info")?.addEventListener("click", closeInfoModal);
  document.getElementById("submit-pin")?.addEventListener("click", checkPin);
  document.getElementById("pin-input")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") checkPin();
  });
  
  // FAB awal hidden
  const fabMenu = document.getElementById("fab-menu");
  if (fabMenu) {
    fabMenu.classList.add("hidden");
    isFabMenuVisible = false;
  }
  
  updateFabButtons();
});

window.addEventListener("click", (e) => {
  if (e.target === document.getElementById("login-modal")) {
    closeLoginModal();
  }
  if (e.target === document.getElementById("info-modal")) {
    closeInfoModal();
  }
  if (e.target === document.getElementById("custom-popup")) {
    closePopup();
  }
});

loadTree();
