// ========== STATE ZOOM & PAN ==========
let scale = 1;          // zoom (1 = 100%)
let offsetX = 0;
let offsetY = 0;

let isDragging = false;
let startX = 0;
let startY = 0;
let startOffsetX = 0;
let startOffsetY = 0;

let isPinching = false;
let startDist = 0;
let startScale = 1;

// ========== ELEMENT REFERENCES ==========
const getContainer = () => document.getElementById("tree-zoom-container");

// ========== APPLY TRANSFORM (SMOOTH) ==========
function applyTransform() {
  const el = getContainer();
  if (!el) return;
  el.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
  el.style.transformOrigin = "0 0";
}

// ========== ZOOM FUNCTION (SMOOTH) ==========
function setZoom(zoom, centerX = null, centerY = null) {
  // Batasi zoom 30% - 200%
  zoom = Math.max(30, Math.min(200, zoom));
  
  const newScale = zoom / 100;
  const el = getContainer();
  if (!el) return;
  
  // Jika tidak ada titik fokus, gunakan center window
  if (centerX === null || centerY === null) {
    centerX = window.innerWidth / 2;
    centerY = window.innerHeight / 2;
  }
  
  const rect = el.getBoundingClientRect();
  
  // Hitung posisi relatif titik fokus terhadap container
  const dx = centerX - rect.left;
  const dy = centerY - rect.top;
  
  // Sesuaikan offset agar titik fokus tetap di posisi yang sama
  offsetX -= dx * (newScale / scale - 1);
  offsetY -= dy * (newScale / scale - 1);
  
  scale = newScale;
  
  applyTransform();
  
  // Update UI
  updateZoomUI(zoom);
  
  // Update currentZoom untuk kompatibilitas
  currentZoom = newScale;
}

function updateZoomUI(zoom) {
  const zoomValue = document.getElementById("zoom-value");
  if (zoomValue) {
    zoomValue.textContent = Math.round(zoom) + "%";
  }
  
  const slider = document.getElementById("zoom-slider");
  if (slider && slider.value != zoom) {
    slider.value = zoom;
  }
}

function updateZoomFromSlider(e) {
  setZoom(parseInt(e.target.value));
}

function zoomReset() {
  scale = 1;
  offsetX = 0;
  offsetY = 0;
  currentZoom = 1;
  
  applyTransform();
  
  updateZoomUI(100);
  document.getElementById("zoom-slider").value = 100;
}

// ========== DRAG PAN (SMOOTH) ==========
function startDrag(e) {
  // Jangan drag jika klik pada elemen interaktif
  if (e.target.closest("button") || 
      e.target.closest("textarea") || 
      e.target.closest(".node-box") ||
      e.target.closest("input") ||
      e.target.closest(".zoom-slider")) {
    return;
  }
  
  isDragging = true;
  
  startX = e.clientX;
  startY = e.clientY;
  
  startOffsetX = offsetX;
  startOffsetY = offsetY;
  
  e.preventDefault();
}

function moveDrag(e) {
  if (!isDragging) return;
  
  offsetX = startOffsetX + (e.clientX - startX);
  offsetY = startOffsetY + (e.clientY - startY);
  
  applyTransform();
}

function endDrag() {
  isDragging = false;
}

// ========== PINCH ZOOM (SMOOTH) ==========
function getDist(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function touchStart(e) {
  if (e.touches.length === 2) {
    isPinching = true;
    startDist = getDist(e.touches);
    startScale = scale;
    e.preventDefault();
  } else if (e.touches.length === 1) {
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    
    // Jangan drag jika menyentuh elemen interaktif
    if (target && (
      target.closest("button") || 
      target.closest("textarea") || 
      target.closest(".node-box") ||
      target.closest("input") ||
      target.closest(".zoom-slider")
    )) {
      return;
    }
    
    isDragging = true;
    startX = touch.clientX;
    startY = touch.clientY;
    startOffsetX = offsetX;
    startOffsetY = offsetY;
  }
}

function touchMove(e) {
  if (isPinching && e.touches.length === 2) {
    e.preventDefault();
    
    const dist = getDist(e.touches);
    const factor = dist / startDist;
    
    // Hitung zoom dalam persen
    const zoom = (startScale * factor) * 100;
    
    // Titik tengah dua jari
    const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    
    setZoom(zoom, centerX, centerY);
  } else if (isDragging && e.touches.length === 1) {
    e.preventDefault();
    
    offsetX = startOffsetX + (e.touches[0].clientX - startX);
    offsetY = startOffsetY + (e.touches[0].clientY - startY);
    
    applyTransform();
  }
}

function touchEnd(e) {
  if (e.touches.length < 2) {
    isPinching = false;
  }
  if (e.touches.length === 0) {
    isDragging = false;
  }
}

// ========== INVERT COLOR dengan localStorage ==========
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

// ========== LOGIN/LOGOUT SATU TOMBOL ==========
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
}

function showInfoModal() {
  document.getElementById("info-modal").style.display = "flex";
}

async function checkPin() {
  const pin = document.getElementById("pin-input").value;
  
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/check-pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: pin })
    });
    const result = await res.json();
    
    if (result.success) {
      isAdmin = true;
      saveLoginSession();
      closeLoginModal();
      updateLoginButton();
      updateUndoRedoButtons();
      showCustomPopup("Login sebagai Admin berhasil! Anda sekarang bisa mengedit silsilah.", "Sukses");
      renderTree();
    } else {
      document.getElementById("pin-error").innerText = "PIN salah! Coba lagi.";
    }
  } catch (err) {
    document.getElementById("pin-error").innerText = "Gagal verifikasi. Periksa koneksi.";
  }
}

function logout() {
  isAdmin = false;
  clearLoginSession();
  activePath = null;
  activeMode = null;
  updateLoginButton();
  updateUndoRedoButtons();
  showCustomPopup("Anda telah logout dari mode Admin.", "Info");
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

// ========== UNDO/REDO ==========
let undoStack = [];
let redoStack = [];

function saveToUndo(data) {
  if (data && isAdmin) {
    undoStack.push(JSON.parse(JSON.stringify(data)));
    redoStack = [];
    if (undoStack.length > 50) undoStack.shift();
  }
}

function undo() {
  if (undoStack.length === 0) {
    showCustomPopup("Tidak ada aksi yang bisa di-undo", "Info", null, false);
    return false;
  }
  const previousData = undoStack.pop();
  redoStack.push(JSON.parse(JSON.stringify(currentTreeData)));
  return previousData;
}

function redo() {
  if (redoStack.length === 0) {
    showCustomPopup("Tidak ada aksi yang bisa di-redo", "Info", null, false);
    return false;
  }
  const nextData = redoStack.pop();
  undoStack.push(JSON.parse(JSON.stringify(currentTreeData)));
  return nextData;
}

async function undoAction() {
  if (!isAdmin) return;
  const previousData = undo();
  if (previousData) {
    currentTreeData = previousData;
    resetSiblingColors();
    assignSiblingGroups(currentTreeData);
    renderTree();
    await saveToSupabase();
    showCustomPopup("Undo berhasil!", "Sukses");
  }
}

async function redoAction() {
  if (!isAdmin) return;
  const nextData = redo();
  if (nextData) {
    currentTreeData = nextData;
    resetSiblingColors();
    assignSiblingGroups(currentTreeData);
    renderTree();
    await saveToSupabase();
    showCustomPopup("Redo berhasil!", "Sukses");
  }
}

// ========== POPUP HAPUS 3 PILIHAN ==========
let pendingHapusPath = null;

function showHapusPopup(path) {
  pendingHapusPath = path;
  
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
  btnSaja.style.color = "white";
  btnSaja.onclick = () => {
    popup.style.display = "none";
    hapusNodeOnly(pendingHapusPath);
  };
  
  const btnKeturunan = document.createElement("button");
  btnKeturunan.textContent = "Hapus dengan keturunan";
  btnKeturunan.style.background = "#f44336";
  btnKeturunan.style.color = "white";
  btnKeturunan.onclick = () => {
    popup.style.display = "none";
    hapusWithChildren(pendingHapusPath);
  };
  
  const btnBatal = document.createElement("button");
  btnBatal.textContent = "Batal";
  btnBatal.style.background = "#607d8b";
  btnBatal.style.color = "white";
  btnBatal.onclick = () => {
    popup.style.display = "none";
  };
  
  popupButtons.appendChild(btnSaja);
  popupButtons.appendChild(btnKeturunan);
  popupButtons.appendChild(btnBatal);
  
  popup.style.display = "flex";
  popup.style.alignItems = "center";
  popup.style.justifyContent = "center";
}

async function hapusNodeOnly(path) {
  if (!isAdmin) return;
  
  try {
    saveToUndo(currentTreeData);
    
    if (!path || path.length === 0) {
      if (!currentTreeData.children || currentTreeData.children.length === 0) {
        showCustomPopup("Tidak ada anak yang bisa menjadi root baru!", "Peringatan");
        return;
      }
      
      const anakPertama = currentTreeData.children[0];
      const sisaAnak = currentTreeData.children.slice(1);
      
      currentTreeData = anakPertama;
      
      if (sisaAnak.length > 0) {
        if (!currentTreeData.children) currentTreeData.children = [];
        currentTreeData.children.push(...sisaAnak);
      }
      
      const res = await fetch(`${SUPABASE_URL}/functions/v1/update-tree`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "replace", data: currentTreeData })
      });
      
      const result = await res.json();
      
      if (result.success) {
        activePath = null;
        activeMode = null;
        await loadTree();
        showCustomPopup("Root berhasil dihapus.", "Sukses");
      } else {
        showCustomPopup("Gagal menghapus root.", "Error");
      }
      return;
    }
    
    const parentPath = path.slice(0, -1);
    const nodeIndex = path[path.length - 1];
    let parent = parentPath.length === 0 ? currentTreeData : getNodeByPath(currentTreeData, parentPath);
    
    if (!parent || !parent.children) return;
    
    const nodeToDelete = parent.children[nodeIndex];
    const grandchildren = nodeToDelete.children || [];
    
    parent.children.splice(nodeIndex, 1);
    
    if (grandchildren.length > 0) {
      for (let i = 0; i < grandchildren.length; i++) {
        parent.children.splice(nodeIndex + i, 0, grandchildren[i]);
      }
    }
    
    const res = await fetch(`${SUPABASE_URL}/functions/v1/update-tree`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "replace", data: currentTreeData })
    });
    
    const result = await res.json();
    
    if (result.success) {
      activePath = null;
      activeMode = null;
      await loadTree();
      showCustomPopup("Node berhasil dihapus.", "Sukses");
    }
  } catch (err) {
    showCustomPopup("Error: " + err.message, "Error");
  }
}

async function hapusWithChildren(path) {
  if (!isAdmin) return;
  
  try {
    saveToUndo(currentTreeData);
    
    if (!path || path.length === 0) {
      showCustomPopup("Apakah Anda yakin ingin menghapus seluruh silsilah?", "Konfirmasi", async () => {
        currentTreeData = { name: ">Root |", children: [] };
        
        await fetch(`${SUPABASE_URL}/functions/v1/update-tree`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "replace", data: currentTreeData })
        });
        
        activePath = null;
        activeMode = null;
        await loadTree();
        showCustomPopup("Seluruh silsilah berhasil dihapus.", "Sukses");
      }, true);
      return;
    }
    
    const res = await fetch(`${SUPABASE_URL}/functions/v1/update-tree`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", path })
    });
    
    const result = await res.json();
    
    if (result.success) {
      activePath = null;
      activeMode = null;
      await loadTree();
      showCustomPopup("Node dan keturunannya berhasil dihapus.", "Sukses");
    }
  } catch (err) {
    showCustomPopup("Error: " + err.message, "Error");
  }
}

// ========== SAVE TO SUPABASE ==========
async function saveToSupabase() {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/update-tree`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "replace", data: currentTreeData })
    });
  } catch (err) {
    console.error("Gagal save:", err);
  }
}

// ========== EVENT LISTENERS ==========
document.addEventListener("click", (e) => {
  if (!e.target.closest(".node-box") && !e.target.closest("button") && e.target.tagName !== "TEXTAREA") {
    activePath = null;
    activeMode = null;
    renderTree();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  loadInvertSetting();
  
  if (isLoggedIn()) {
    isAdmin = true;
    updateLoginButton();
    updateUndoRedoButtons();
  }
  
  // Zoom slider
  const slider = document.getElementById("zoom-slider");
  if (slider) {
    slider.min = "30";
    slider.max = "200";
    slider.step = "1";
    slider.value = "100";
    slider.addEventListener("input", updateZoomFromSlider);
  }
  
  // Init zoom
  zoomReset();
  
  // Mouse drag pan
  document.addEventListener("mousedown", startDrag);
  document.addEventListener("mousemove", moveDrag);
  document.addEventListener("mouseup", endDrag);
  
  // Touch events (pinch + pan)
  document.addEventListener("touchstart", touchStart, { passive: false });
  document.addEventListener("touchmove", touchMove, { passive: false });
  document.addEventListener("touchend", touchEnd);
  document.addEventListener("touchcancel", touchEnd);
  
  // Buttons
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
  if (e.target.id === "login-modal") closeLoginModal();
  if (e.target.id === "info-modal") closeInfoModal();
  if (e.target.id === "custom-popup") closeCustomPopup();
});

loadTree();
/*Stable*/
