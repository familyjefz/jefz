let activePath = null;
let activeMode = null;
let currentTreeData = null;
let isFirstLoad = true;
let currentZoom = 1;
let isAdmin = false;  // Status login admin

// PIN Admin (ganti sesuai keinginan Anda)
const ADMIN_PIN = "00";

// CREDENTIALS SUPABASE
const SUPABASE_URL = "https://btyrorlzdyisuvnwmrqp.supabase.co";

function getGenerationColor(generation) {
  const hue = (generation * 37) % 360;
  return `hsl(${hue}, 75%, 65%)`;
}

async function loadTree() {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/get-tree`);
    const data = await res.json();
    currentTreeData = data;
    renderTree();
  } catch (err) {
    console.error("Gagal load tree:", err);
    alert("Gagal memuat data. Periksa koneksi.");
  }
}

function renderTree() {
  const container = document.getElementById("tree");
  if (!container) return;
  
  const wrapper = document.getElementById("tree-wrapper");
  const savedLeft = wrapper ? wrapper.scrollLeft : 800;
  const savedTop = wrapper ? wrapper.scrollTop : 400;
  
  container.innerHTML = "";
  
  new Treant({
    chart: {
      container: "#tree",
      rootOrientation: "NORTH",
      connectors: { type: "step" },
      animateOnInit: false,
      levelSeparation: 12,
      siblingSeparation: 8,
      subTeeSeparation: 8
    },
    nodeStructure: convert(currentTreeData, [], 1)
  });
  
  setTimeout(() => {
    if (wrapper) {
      if (isFirstLoad) {
        wrapper.scrollLeft = 800;
        wrapper.scrollTop = 400;
        isFirstLoad = false;
      } else {
        wrapper.scrollLeft = savedLeft;
        wrapper.scrollTop = savedTop;
      }
    }
  }, 100);
}

function convert(node, path = [], generation = 1) {
  const isActiveNode = isActive(path);
  const genColor = getGenerationColor(generation);
  
  let innerHTML = "";
  
  // Jika admin, tampilkan menu edit. Jika user, hanya tombol Option tanpa menu
  if (isActiveNode && activeMode && isAdmin) {
    let inputValue = "";
    let placeholder = "";
    if (activeMode === "edit") { inputValue = node.name; placeholder = "Nama baru"; }
    else if (activeMode === "add") placeholder = "Nama anak baru";
    else if (activeMode === "parent") placeholder = "Nama parent baru";
    else if (activeMode === "order") placeholder = "Urutan (0=pertama)";
    
    innerHTML = `
      <div class="node-box active-node" style="border-left: 4px solid ${genColor};">
        <div class="node-name">${escapeHtml(node.name)}</div>
        <input class="node-input" id="input-${path.join("-")}" 
          placeholder="${placeholder}" value="${escapeHtml(inputValue)}" autofocus />
        <div class="node-actions">
          <button onclick='submitInline(${JSON.stringify(path)})'>✔ Simpan</button>
          <button onclick='cancelInline()'>✖ Batal</button>
        </div>
      </div>
    `;
  }
  else if (isActiveNode && isAdmin) {
    innerHTML = `
      <div class="node-box active-node" style="border-left: 4px solid ${genColor};">
        <div class="node-name">${escapeHtml(node.name)}</div>
        <div class="node-menu">
          <button onclick='setMode(${JSON.stringify(path)}, "add")'>➕ Tambah Anak</button>
          <button onclick='setMode(${JSON.stringify(path)}, "edit")'>✏️ Ubah Nama</button>
          <button onclick='hapus(${JSON.stringify(path)})'>❌ Hapus</button>
          <button onclick='setMode(${JSON.stringify(path)}, "parent")'>⬆️ Tambah Parent</button>
          <button onclick='setMode(${JSON.stringify(path)}, "order")'>🔢 Ubah Urutan</button>
        </div>
      </div>
    `;
  }
  else {
    innerHTML = `
      <div class="node-box" style="border-left: 4px solid ${genColor};">
        <div class="node-name">${escapeHtml(node.name)}</div>
        ${isAdmin ? `<button class="btn-option" onclick='openOptions(${JSON.stringify(path)})'>⚙️ Option</button>` : ''}
      </div>
    `;
  }
  
  return {
    innerHTML: innerHTML,
    children: node.children?.map((child, i) => convert(child, [...path, i], generation + 1))
  };
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

function isActive(path) {
  if (!activePath) return false;
  return JSON.stringify(path) === JSON.stringify(activePath);
}

function getCurrentScroll() {
  const w = document.getElementById("tree-wrapper");
  return { left: w ? w.scrollLeft : 800, top: w ? w.scrollTop : 400 };
}

function restoreScroll(left, top) {
  const w = document.getElementById("tree-wrapper");
  if (w) {
    setTimeout(() => {
      w.scrollLeft = left;
      w.scrollTop = top;
    }, 50);
  }
}

function openOptions(path) {
  if (!isAdmin) return;
  const scroll = getCurrentScroll();
  activePath = path;
  activeMode = null;
  renderTree();
  restoreScroll(scroll.left, scroll.top);
}

function setMode(path, mode) {
  if (!isAdmin) return;
  const scroll = getCurrentScroll();
  activePath = path;
  activeMode = mode;
  renderTree();
  restoreScroll(scroll.left, scroll.top);
}

function cancelInline() {
  if (!isAdmin) return;
  const scroll = getCurrentScroll();
  activePath = null;
  activeMode = null;
  renderTree();
  restoreScroll(scroll.left, scroll.top);
}

async function submitInline(path) {
  if (!isAdmin) return;
  const input = document.getElementById(`input-${path.join("-")}`);
  if (!input) return;
  const val = input.value.trim();
  if (activeMode !== "order" && !val) { alert("Tidak boleh kosong!"); return; }
  
  let action, body = { path };
  if (activeMode === "add") { action = "add"; body.name = val; }
  else if (activeMode === "edit") { action = "edit"; body.name = val; }
  else if (activeMode === "parent") { action = "addParent"; body.name = val; }
  else if (activeMode === "order") { action = "reorder"; body.position = parseInt(val); if (isNaN(body.position)) { alert("Masukkan angka!"); return; } }
  else return;
  
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/update-tree`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body })
    });
    const result = await res.json();
    if (result.success) {
      activePath = null; activeMode = null;
      await loadTree();
    } else alert("Gagal: " + (result.error || "Error"));
  } catch (err) { alert("Error: " + err.message); }
}

async function hapus(path) {
  if (!isAdmin) return;
  if (!confirm("Hapus node ini?")) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/update-tree`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", path })
    });
    const result = await res.json();
    if (result.success) {
      activePath = null; activeMode = null;
      await loadTree();
    } else alert("Gagal hapus");
  } catch (err) { alert("Error: " + err.message); }
}

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

// LOGIN MODAL FUNCTIONS
function showLoginModal() {
  document.getElementById("login-modal").style.display = "block";
  document.getElementById("pin-input").value = "";
  document.getElementById("pin-error").innerText = "";
}

function closeLoginModal() {
  document.getElementById("login-modal").style.display = "none";
}

function checkPin() {
  const pin = document.getElementById("pin-input").value;
  if (pin === ADMIN_PIN) {
    isAdmin = true;
    closeLoginModal();
    alert("Login sebagai Admin berhasil! Anda sekarang bisa mengedit silsilah.");
    // Refresh tree untuk menampilkan tombol option
    renderTree();
  } else {
    document.getElementById("pin-error").innerText = "PIN salah! Coba lagi.";
  }
}

function logout() {
  isAdmin = false;
  activePath = null;
  activeMode = null;
  renderTree();
  alert("Anda telah logout dari mode Admin.");
}

// Event listeners
document.addEventListener("click", (e) => {
  if (!e.target.closest(".node-box") && !e.target.closest("button") && e.target.tagName !== "INPUT") {
    const scroll = getCurrentScroll();
    activePath = null;
    activeMode = null;
    renderTree();
    restoreScroll(scroll.left, scroll.top);
  }
});

document.getElementById("zoom-in")?.addEventListener("click", zoomIn);
document.getElementById("zoom-out")?.addEventListener("click", zoomOut);
document.getElementById("zoom-reset")?.addEventListener("click", zoomReset);
document.getElementById("login-btn")?.addEventListener("click", showLoginModal);
document.querySelector(".close")?.addEventListener("click", closeLoginModal);
document.getElementById("submit-pin")?.addEventListener("click", checkPin);
document.getElementById("pin-input")?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") checkPin();
});

// Klik luar modal
window.addEventListener("click", (e) => {
  if (e.target === document.getElementById("login-modal")) {
    closeLoginModal();
  }
});

loadTree();
