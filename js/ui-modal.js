// ========== INVERT COLOR ==========
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

  if (showCancel) {
    const confirmBtn = document.createElement("button");
    confirmBtn.textContent = "OK";
    confirmBtn.onclick = () => {
      popup.style.display = "none";
      if (onConfirm) onConfirm();
    };
    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Batal";
    cancelBtn.onclick = () => {
      popup.style.display = "none";
    };
    popupButtons.appendChild(confirmBtn);
    popupButtons.appendChild(cancelBtn);
  } else {
    const confirmBtn = document.createElement("button");
    confirmBtn.textContent = "OK";
    confirmBtn.onclick = () => {
      popup.style.display = "none";
      if (onConfirm) onConfirm();
    };
    popupButtons.appendChild(confirmBtn);
  }

  popup.style.display = "flex";
  popup.style.alignItems = "center";
  popup.style.justifyContent = "center";
}

function closeCustomPopup() {
  const popup = document.getElementById("custom-popup");
  if (popup) popup.style.display = "none";
}

// ========== MODALS ==========
function showLoginModal() {
  const modal = document.getElementById("login-modal");
  modal.style.display = "flex";
  document.getElementById("pin-input").value = "";
  document.getElementById("pin-error").innerText = "";
  setTimeout(() => document.getElementById("pin-input").focus(), 10);
}

function closeLoginModal() {
  document.getElementById("login-modal").style.display = "none";
}

function closeInfoModal() {
  document.getElementById("info-modal").style.display = "none";
  if (typeof resetInfoZoom === "function") resetInfoZoom();
}

function showInfoModal() {
  if (typeof resetInfoZoom === "function") resetInfoZoom();
  document.getElementById("info-modal").style.display = "flex";
}

// ========== LOGIN/LOGOUT ==========
async function checkPin() {
  const submitBtn = document.getElementById("submit-pin");
  const pinErrEl = document.getElementById("pin-error");
  const pin = document.getElementById("pin-input").value;

  console.log("[login] checkPin called, pin length:", pin.length);

  if (!pin) {
    if (pinErrEl) pinErrEl.innerText = "PIN belum diisi.";
    return;
  }

  // Visual feedback so user always knows the click was registered
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.dataset.originalText = submitBtn.textContent;
    submitBtn.textContent = "Memeriksa...";
  }
  if (pinErrEl) pinErrEl.innerText = "";

  try {
    // Check PIN via Turso
    const pinResult = await tursoFetch(
      "SELECT 1 FROM admin_pins WHERE pin = ? LIMIT 1",
      [{ type: "text", value: pin }]
    );
    const result = { success: (pinResult?.rows?.length ?? 0) > 0 };
    console.log("[login] turso check:", result);

    if (result && result.success) {
      isAdmin = true;
      saveLoginSession();
      closeLoginModal();
      updateLoginButton();
      updateUndoRedoButtons();
      showCustomPopup("Login sebagai Admin berhasil!", "Sukses");
      renderTree();
    } else {
      if (pinErrEl) pinErrEl.innerText = "PIN salah!";
      showCustomPopup("PIN yang Anda masukkan salah.", "Login Gagal");
    }
  } catch (err) {
    console.error("[login] fetch error:", err);
    if (pinErrEl) pinErrEl.innerText = "Gagal verifikasi.";
    showCustomPopup(
      "Tidak bisa menghubungi server verifikasi.<br>Cek koneksi internet lalu coba lagi.",
      "Login Gagal"
    );
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      if (submitBtn.dataset.originalText) {
        submitBtn.textContent = submitBtn.dataset.originalText;
        delete submitBtn.dataset.originalText;
      }
    }
  }
}

function logout() {
  isAdmin = false;
  clearLoginSession();
  activePath = null;
  activeMode = null;
  updateLoginButton();
  updateUndoRedoButtons();
  showCustomPopup("Anda telah logout.", "Info");
  renderTree();
}

function updateLoginButton() {
  const loginBtn = document.getElementById("login-btn");
  if (loginBtn) {
    if (isAdmin) {
      loginBtn.innerHTML = "🚪 Logout";
      loginBtn.classList.add("logout-btn");
      loginBtn.classList.remove("login-btn");
    } else {
      loginBtn.innerHTML = "👤 Login Admin";
      loginBtn.classList.add("login-btn");
      loginBtn.classList.remove("logout-btn");
    }
  }
}

function updateUndoRedoButtons() {
  const undoBtn = document.getElementById("undo-btn");
  const redoBtn = document.getElementById("redo-btn");

  if (isAdmin) {
    if (undoBtn) undoBtn.style.display = "inline-block";
    if (redoBtn) redoBtn.style.display = "inline-block";
  } else {
    if (undoBtn) undoBtn.style.display = "none";
    if (redoBtn) redoBtn.style.display = "none";
  }
}

function onLoginLogoutClick() {
  if (isAdmin) {
    logout();
  } else {
    showLoginModal();
  }
}
/*Stable*/
