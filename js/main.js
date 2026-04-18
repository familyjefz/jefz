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
let isFabMenuVisible = true;

function toggleFabMenu() {
  const fabMenu = document.getElementById("fab-menu");
  const fabHide = document.getElementById("fab-hide");
  
  if (isFabMenuVisible) {
    fabMenu.classList.add("hidden");
    fabHide.textContent = "➡️";
    isFabMenuVisible = false;
  } else {
    fabMenu.classList.remove("hidden");
    fabHide.textContent = "⬅️";
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
  document.getElementById("fab-main")?.addEventListener("click", toggleFabMenu);
  document.getElementById("fab-undo")?.addEventListener("click", () => undoAction());
  document.getElementById("fab-redo")?.addEventListener("click", () => redoAction());
  document.getElementById("fab-zoom-in")?.addEventListener("click", zoomIn);
  document.getElementById("fab-zoom-out")?.addEventListener("click", zoomOut);
  document.getElementById("fab-zoom-reset")?.addEventListener("click", zoomReset);
  document.getElementById("fab-login")?.addEventListener("click", showLoginModal);
  document.getElementById("fab-logout")?.addEventListener("click", logout);
  document.getElementById("fab-theme")?.addEventListener("click", toggleTheme);
  document.getElementById("fab-hide")?.addEventListener("click", toggleFabMenu);
  
  // Modal Events
  document.querySelector(".close")?.addEventListener("click", closeLoginModal);
  document.querySelector(".close-info")?.addEventListener("click", closeInfoModal);
  document.getElementById("submit-pin")?.addEventListener("click", checkPin);
  document.getElementById("pin-input")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") checkPin();
  });
  
  // Update FAB buttons after login check
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

// Start
loadTree();
