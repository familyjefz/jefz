let activePath = null;
let activeMode = null;
let currentTreeData = null;
let isFirstLoad = true;
let currentZoom = 1;

// Fungsi untuk mendapatkan warna berdasarkan generasi (HSL)
function getGenerationColor(generation) {
  const hue = (generation * 37) % 360;
  return `hsl(${hue}, 80%, 55%)`;
}

async function loadTree() {
  try {
    const res = await fetch("data.json?v=" + Date.now());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    currentTreeData = data;
    renderTree();
  } catch (err) {
    console.error("Gagal load tree:", err);
    alert("Gagal memuat data silsilah. Periksa koneksi internet Anda.");
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
  
  if (isActiveNode && activeMode) {
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
  else if (isActiveNode) {
    innerHTML = `
      <div class="node-box active-node" style="border-left: 4px solid ${genColor};">
        <div class="node-name">${escapeHtml(node.name)}</div>
        <div class="node-menu">
          <button onclick='setMode(${JSON.stringify(path)}, "add")'>➕ Anak</button>
          <button onclick='setMode(${JSON.stringify(path)}, "edit")'>✏️ Ubah</button>
          <button onclick='hapus(${JSON.stringify(path)})'>❌ Hapus</button>
          <button onclick='setMode(${JSON.stringify(path)}, "parent")'>⬆️ Parent</button>
          <button onclick='setMode(${JSON.stringify(path)}, "order")'>🔢 Urut</button>
        </div>
      </div>
    `;
  }
  else {
    innerHTML = `
      <div class="node-box" style="border-left: 4px solid ${genColor};">
        <div class="node-name">${escapeHtml(node.name)}</div>
        <button class="btn-option" onclick='openOptions(${JSON.stringify(path)})'>⚙️</button>
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
  const scroll = getCurrentScroll();
  activePath = path;
  activeMode = null;
  renderTree();
  restoreScroll(scroll.left, scroll.top);
}

function setMode(path, mode) {
  const scroll = getCurrentScroll();
  activePath = path;
  activeMode = mode;
  renderTree();
  restoreScroll(scroll.left, scroll.top);
}

function cancelInline() {
  const scroll = getCurrentScroll();
  activePath = null;
  activeMode = null;
  renderTree();
  restoreScroll(scroll.left, scroll.top);
}

async function submitInline(path) {
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
    const res = await fetch("https://jefz.vercel.app/api/update", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body })
    });
    
    // Periksa apakah response OK
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    // Ambil response text terlebih dahulu
    const responseText = await res.text();
    
    // Coba parse JSON
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error("Response bukan JSON:", responseText);
      throw new Error("Server merespon dengan format yang tidak valid");
    }
    
    if (result.success) {
      activePath = null;
      activeMode = null;
      await loadTree();
    } else {
      alert("Gagal: " + (result.error || "Unknown error"));
    }
  } catch (err) {
    console.error("Error:", err);
    alert("Error: " + err.message + "\n\nPeriksa koneksi internet atau coba lagi nanti.");
  }
}

async function hapus(path) {
  if (!confirm("Hapus node ini?")) return;
  
  try {
    const res = await fetch("https://jefz.vercel.app/api/update", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", path })
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    const responseText = await res.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error("Response bukan JSON:", responseText);
      throw new Error("Server merespon dengan format yang tidak valid");
    }
    
    if (result.success) {
      activePath = null;
      activeMode = null;
      await loadTree();
    } else {
      alert("Gagal hapus: " + (result.error || "Unknown error"));
    }
  } catch (err) {
    console.error("Error:", err);
    alert("Error: " + err.message + "\n\nPeriksa koneksi internet atau coba lagi nanti.");
  }
}

// ZOOM FUNCTIONS
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

// Event klik luar
document.addEventListener("click", (e) => {
  if (!e.target.closest(".node-box") && !e.target.closest("button") && e.target.tagName !== "INPUT") {
    const scroll = getCurrentScroll();
    activePath = null;
    activeMode = null;
    renderTree();
    restoreScroll(scroll.left, scroll.top);
  }
});

// Setup zoom buttons
document.getElementById("zoom-in")?.addEventListener("click", zoomIn);
document.getElementById("zoom-out")?.addEventListener("click", zoomOut);
document.getElementById("zoom-reset")?.addEventListener("click", zoomReset);

loadTree();
