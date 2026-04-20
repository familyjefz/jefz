// ========== ZOOM FUNCTIONS ==========
function setZoom(zoom) {
  const oldZoom = currentZoom;
  const newZoom = zoom / 100;
  currentZoom = newZoom;
  
  const zoomContainer = document.getElementById("tree-zoom-container");
  const wrapper = document.getElementById("tree-wrapper");
  
  if (zoomContainer && wrapper && oldZoom !== newZoom) {
    // Simpan posisi scroll relatif terhadap center
    const rect = wrapper.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const oldScrollLeft = wrapper.scrollLeft;
    const oldScrollTop = wrapper.scrollTop;
    
    // Terapkan zoom
    zoomContainer.style.transform = `scale(${newZoom})`;
    zoomContainer.style.transformOrigin = "center center";
    
    // Hitung scroll baru agar posisi center tetap sama
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

function zoomReset() { setZoom(100); }

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
  
  popup.style.display = "block";
  
  // Posisikan popup di tengah layar
  setTimeout(() => {
    const popupContent = document.querySelector(".custom-popup-content");
    if (popupContent) {
      popupContent.style.top = "50%";
      popupContent.style.left = "50%";
      popupContent.style.transform = "translate(-50%, -50%)";
    }
  }, 10);
}

function closeCustomPopup() {
  const popup = document.getElementById("custom-popup");
  if (popup) popup.style.display = "none";
}

// ========== LOGIN/LOGOUT SATU TOMBOL ==========
function showLoginModal() {
  const modal = document.getElementById("login-modal");
  modal.style.display = "block";
  document.getElementById("pin-input").value = "";
  document.getElementById("pin-error").innerText = "";
  
  // Posisikan modal di tengah layar
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

function closeInfoModal() {
  const modal = document.getElementById("info-modal");
  modal.style.display = "none";
}

function showInfoModal() {
  const modal = document.getElementById("info-modal");
  modal.style.display = "block";
  
  // Posisikan modal info di tengah layar
  setTimeout(() => {
    const modalContent = document.querySelector("#info-modal .modal-content");
    if (modalContent) {
      modalContent.style.top = "50%";
      modalContent.style.left = "50%";
      modalContent.style.transform = "translate(-50%, -50%)";
      modalContent.style.margin = "0";
    }
  }, 10);
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
  
  popup.style.display = "block";
  
  // Posisikan di tengah
  setTimeout(() => {
    const popupContent = document.querySelector(".custom-popup-content");
    if (popupContent) {
      popupContent.style.top = "50%";
      popupContent.style.left = "50%";
      popupContent.style.transform = "translate(-50%, -50%)";
    }
  }, 10);
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
        showCustomPopup("Root berhasil dihapus. '" + anakPertama.name.split("|")[0].trim() + "' menjadi root baru.", "Sukses");
      } else {
        showCustomPopup("Gagal menghapus root: " + (result.error || "Error"), "Error");
      }
      return;
    }
    
    const parentPath = path.slice(0, -1);
    const nodeIndex = path[path.length - 1];
    let parent = null;
    
    if (parentPath.length === 0) {
      parent = currentTreeData;
    } else {
      parent = getNodeByPath(currentTreeData, parentPath);
    }
    
    if (!parent || !parent.children) {
      showCustomPopup("Gagal menemukan node!", "Error");
      return;
    }
    
    const nodeToDelete = parent.children[nodeIndex];
    if (!nodeToDelete) {
      showCustomPopup("Node tidak ditemukan!", "Error");
      return;
    }
    
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
      showCustomPopup("Node berhasil dihapus (anak-anak naik ke parent)", "Sukses");
    } else {
      showCustomPopup("Gagal menghapus: " + (result.error || "Error"), "Error");
    }
  } catch (err) {
    console.error("Error:", err);
    showCustomPopup("Error: " + err.message, "Error");
  }
}

async function hapusWithChildren(path) {
  if (!isAdmin) return;
  
  try {
    saveToUndo(currentTreeData);
    
    if (!path || path.length === 0) {
      showCustomPopup("Apakah Anda yakin ingin menghapus seluruh silsilah?", "Konfirmasi Hapus Semua", async () => {
        try {
          currentTreeData = {
            name: ">Root |",
            children: []
          };
          
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
            showCustomPopup("Seluruh silsilah berhasil dihapus.", "Sukses");
          } else {
            showCustomPopup("Gagal hapus: " + (result.error || "Error"), "Error");
          }
        } catch (err) {
          showCustomPopup("Error: " + err.message, "Error");
        }
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
      showCustomPopup("Node dan semua keturunannya berhasil dihapus", "Sukses");
    } else {
      showCustomPopup("Gagal hapus: " + (result.error || "Error"), "Error");
    }
  } catch (err) {
    showCustomPopup("Error: " + err.message, "Error");
  }
}

// ========== SAVE TO SUPABASE ==========
async function saveToSupabase() {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/update-tree`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "replace", data: currentTreeData })
    });
    await res.json();
  } catch (err) {
    console.error("Gagal save ke Supabase:", err);
  }
}

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
  // Load invert setting
  loadInvertSetting();
  
  if (isLoggedIn()) {
    isAdmin = true;
    updateLoginButton();
    updateUndoRedoButtons();
  }
  
  const slider = document.getElementById("zoom-slider");
  if (slider) {
    slider.min = "30";
    slider.max = "200";
    slider.step = "1";
    slider.value = "100";
    setZoom(100);
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
/*Stable*/
