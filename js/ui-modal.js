// ========== INVERT MODE ==========
const INVERT_KEY = "invertMode";

function toggleInvert() {
  document.body.classList.toggle("invert-mode");
  const isInvert = document.body.classList.contains("invert-mode");
  localStorage.setItem(INVERT_KEY, isInvert ? "1" : "0");
}

function loadInvertSetting() {
  const saved = localStorage.getItem(INVERT_KEY);
  if (saved === "1") {
    document.body.classList.add("invert-mode");
  }
}

// ========== LOGIN / ADMIN ==========
function isLoggedIn() {
  return localStorage.getItem("isAdmin") === "1";
}

function setLoggedIn(v) {
  if (v) localStorage.setItem("isAdmin", "1");
  else localStorage.removeItem("isAdmin");
}

function updateLoginButton() {
  const btn = document.getElementById("login-btn");
  if (!btn) return;
  if (isAdmin) {
    btn.textContent = "🚪 Logout";
  } else {
    btn.textContent = "👤 Login Admin";
  }
}

function updateUndoRedoButtons() {
  const undoBtn = document.getElementById("undo-btn");
  const redoBtn = document.getElementById("redo-btn");
  if (undoBtn) undoBtn.style.display = isAdmin ? "inline-block" : "none";
  if (redoBtn) redoBtn.style.display = isAdmin ? "inline-block" : "none";
}

function onLoginLogoutClick() {
  if (isAdmin) {
    isAdmin = false;
    setLoggedIn(false);
    updateLoginButton();
    updateUndoRedoButtons();
    renderTree();
  } else {
    openLoginModal();
  }
}

function openLoginModal() {
  document.getElementById("login-modal").style.display = "flex";
  document.getElementById("pin-input").value = "";
  document.getElementById("pin-error").textContent = "";
  setTimeout(() => document.getElementById("pin-input").focus(), 100);
}

function closeLoginModal() {
  document.getElementById("login-modal").style.display = "none";
}

function checkPin() {
  const pin = document.getElementById("pin-input").value;
  if (pin === ADMIN_PIN) {
    isAdmin = true;
    setLoggedIn(true);
    updateLoginButton();
    updateUndoRedoButtons();
    closeLoginModal();
    renderTree();
  } else {
    document.getElementById("pin-error").textContent = "PIN salah!";
  }
}

// ========== INFO MODAL ==========
function closeInfoModal() {
  document.getElementById("info-modal").style.display = "none";
  // Reset pinch-zoom state so the next opened info popup starts at 1x
  if (typeof resetInfoZoom === "function") resetInfoZoom();
}

function showInfoModal() {
  // Reset pinch-zoom whenever a fresh info popup is shown
  if (typeof resetInfoZoom === "function") resetInfoZoom();
  document.getElementById("info-modal").style.display = "flex";
}

// ========== CUSTOM POPUP ==========
function showCustomPopup(title, message, buttons) {
  document.getElementById("popup-title").textContent = title;
  document.getElementById("popup-message").textContent = message;

  const btnContainer = document.getElementById("popup-buttons");
  btnContainer.innerHTML = "";

  buttons.forEach((b) => {
    const btn = document.createElement("button");
    btn.textContent = b.text;
    btn.onclick = () => {
      closeCustomPopup();
      if (b.onClick) b.onClick();
    };
    btnContainer.appendChild(btn);
  });

  document.getElementById("custom-popup").style.display = "flex";
}

function closeCustomPopup() {
  document.getElementById("custom-popup").style.display = "none";
}
/*Stable*/
