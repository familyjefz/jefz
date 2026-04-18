// ========== UTILITY FUNCTIONS ==========

// Custom Popup
function showPopup(message, title = "Peringatan", onConfirm = null, onCancel = null, showCancel = true) {
  const popup = document.getElementById("custom-popup");
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
      if (onCancel) onCancel();
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
  
  popup.style.display = "block";
}

function closePopup() {
  document.getElementById("custom-popup").style.display = "none";
}

// Show popup untuk pilihan hapus
function showHapusPopup(onHapusSaja, onHapusKeturunan) {
  const popup = document.getElementById("custom-popup");
  const popupTitle = document.getElementById("popup-title");
  const popupMessage = document.getElementById("popup-message");
  const popupButtons = document.getElementById("popup-buttons");
  
  popupTitle.textContent = "Hapus Node";
  popupMessage.innerHTML = "Pilih opsi hapus:";
  
  popupButtons.innerHTML = "";
  
  const btnSaja = document.createElement("button");
  btnSaja.textContent = "Hapus ini saja";
  btnSaja.style.background = "#ff9800";
  btnSaja.onclick = () => {
    popup.style.display = "none";
    if (onHapusSaja) onHapusSaja();
  };
  
  const btnKeturunan = document.createElement("button");
  btnKeturunan.textContent = "Hapus dengan keturunan";
  btnKeturunan.style.background = "#f44336";
  btnKeturunan.onclick = () => {
    popup.style.display = "none";
    if (onHapusKeturunan) onHapusKeturunan();
  };
  
  const btnBatal = document.createElement("button");
  btnBatal.textContent = "Batal";
  btnBatal.style.background = "#607d8b";
  btnBatal.onclick = () => {
    popup.style.display = "none";
  };
  
  popupButtons.appendChild(btnSaja);
  popupButtons.appendChild(btnKeturunan);
  popupButtons.appendChild(btnBatal);
  
  popup.style.display = "block";
}

// Dark/Light Mode
function toggleTheme() {
  const body = document.body;
  const themeBtn = document.getElementById("fab-theme");
  
  if (body.classList.contains("dark-mode")) {
    body.classList.remove("dark-mode");
    localStorage.setItem("theme", "light");
    if (themeBtn) themeBtn.textContent = "🌙";
  } else {
    body.classList.add("dark-mode");
    localStorage.setItem("theme", "light");
    if (themeBtn) themeBtn.textContent = "☀️";
  }
}

function loadTheme() {
  const savedTheme = localStorage.getItem("theme");
  const themeBtn = document.getElementById("fab-theme");
  
  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    if (themeBtn) themeBtn.textContent = "☀️";
  } else {
    document.body.classList.remove("dark-mode");
    if (themeBtn) themeBtn.textContent = "🌙";
  }
}

// Login session
function saveLoginSession() {
  localStorage.setItem(STORAGE_KEY, "true");
}

function clearLoginSession() {
  localStorage.removeItem(STORAGE_KEY);
}

function isLoggedIn() {
  return localStorage.getItem(STORAGE_KEY) === "true";
}
