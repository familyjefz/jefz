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

// ========== CEK PIN KE SUPABASE ==========
async function checkPin() {
  const pin = document.getElementById("pin-input").value;
  
  if (!pin) {
    document.getElementById("pin-error").innerText = "Masukkan PIN!";
    return;
  }
  
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/check-pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: pin })
    });
    const result = await res.json();
    
    if (result.success) {
      isAdmin = true;
      closeLoginModal();
      alert("Login sebagai Admin berhasil! Anda sekarang bisa mengedit silsilah.");
      updateAddFamilyButton();
      renderTree();
    } else {
      document.getElementById("pin-error").innerText = "PIN salah! Coba lagi.";
    }
  } catch (err) {
    console.error("Error:", err);
    document.getElementById("pin-error").innerText = "Gagal verifikasi. Periksa koneksi.";
  }
}

function updateAddFamilyButton() {
  const addBtn = document.getElementById("add-family-btn");
  if (addBtn) {
    addBtn.style.display = isAdmin ? "inline-block" : "none";
  }
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
  // Cek session login (opsional, bisa ditambahkan nanti)
  isAdmin = false;
  updateAddFamilyButton();
  
  document.getElementById("zoom-in")?.addEventListener("click", zoomIn);
  document.getElementById("zoom-out")?.addEventListener("click", zoomOut);
  document.getElementById("zoom-reset")?.addEventListener("click", zoomReset);
  document.getElementById("login-btn")?.addEventListener("click", showLoginModal);
  document.querySelector(".close")?.addEventListener("click", closeLoginModal);
  document.querySelector(".close-info")?.addEventListener("click", closeInfoModal);
  document.getElementById("submit-pin")?.addEventListener("click", checkPin);
  document.getElementById("pin-input")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") checkPin();
  });
  
  // Event untuk keluarga
  document.getElementById("family-selector")?.addEventListener("change", onFamilyChange);
  document.getElementById("add-family-btn")?.addEventListener("click", showAddFamilyModal);
  document.querySelector(".close-family")?.addEventListener("click", closeAddFamilyModal);
  document.getElementById("submit-family")?.addEventListener("click", addNewFamily);
  document.getElementById("new-family-name")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addNewFamily();
  });
});

window.addEventListener("click", (e) => {
  if (e.target === document.getElementById("login-modal")) {
    closeLoginModal();
  }
  if (e.target === document.getElementById("info-modal")) {
    closeInfoModal();
  }
  if (e.target === document.getElementById("add-family-modal")) {
    closeAddFamilyModal();
  }
});

loadTree();
