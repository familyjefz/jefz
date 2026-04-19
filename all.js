// ========== CONFIG ==========
const SUPABASE_URL = "https://btyrorlzdyisuvnwmrqp.supabase.co";
let currentFamilyId = "all";
let currentZoom = 1;
let isAdmin = false;

// ========== WARNA PER SAUDARA KANDUNG ==========
let siblingColorMap = new Map();
let nextSiblingGroupId = 1;

function resetSiblingColors() {
  siblingColorMap.clear();
  nextSiblingGroupId = 1;
}

function getOrCreateSiblingColor(siblingGroupId) {
  if (siblingColorMap.has(siblingGroupId)) {
    return siblingColorMap.get(siblingGroupId);
  }
  const hue = (siblingGroupId * 37) % 360;
  const color = `hsl(${hue}, 75%, 65%)`;
  siblingColorMap.set(siblingGroupId, color);
  return color;
}

function assignSiblingGroups(node) {
  if (!node) return;
  if (node.children && node.children.length > 0) {
    const childrenGroupId = nextSiblingGroupId++;
    node.children.forEach(child => {
      child._siblingGroupId = childrenGroupId;
      assignSiblingGroups(child);
    });
  }
}

function getNodeColor(node) {
  if (!node || node._siblingGroupId === undefined) {
    return `hsl(0, 75%, 65%)`;
  }
  return getOrCreateSiblingColor(node._siblingGroupId);
}

function getNodeByPath(node, path) {
  if (!path || path.length === 0) return node;
  let current = node;
  for (let i = 0; i < path.length; i++) {
    if (!current.children || !current.children[path[i]]) return null;
    current = current.children[path[i]];
  }
  return current;
}

function getPathOfNode(root, targetNode) {
  function search(node, path) {
    if (node === targetNode) return path;
    if (node.children) {
      for (let i = 0; i < node.children.length; i++) {
        const result = search(node.children[i], [...path, i]);
        if (result) return result;
      }
    }
    return null;
  }
  return search(root, []);
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

// ========== RENDER TREE (VERSI TEST LANGSUNG) ==========
let activePath = null;
let activeMode = null;
let currentTreeData = null;
let isFirstLoad = true;

function renderTree() {
  console.log("renderTree dipanggil");
  const container = document.getElementById("tree");
  console.log("container #tree =", container);
  
  if (!container) {
    console.error("ERROR: Element #tree tidak ditemukan!");
    alert("ERROR: Element #tree tidak ditemukan. Periksa file index.html");
    return;
  }
  
  const wrapper = document.getElementById("tree-wrapper");
  const savedLeft = wrapper ? wrapper.scrollLeft : 800;
  const savedTop = wrapper ? wrapper.scrollTop : 400;
  
  container.innerHTML = "";
  
  // DATA TEST LANGSUNG
  const testData = {
    name: ">Sekghor |",
    children: [
      { name: ">Salama | Tohin", children: [] },
      { name: ">Ryfan |", children: [] },
      { name: ">Abd Hary |", children: [] }
    ]
  };
  
  console.log("Mencoba render dengan data test:", testData);
  
  try {
    new Treant({
      chart: {
        container: "#tree",
        rootOrientation: "NORTH",
        connectors: { type: "step" },
        animateOnInit: false,
        levelSeparation: 30,
        siblingSeparation: 30
      },
      nodeStructure: {
        innerHTML: `<div class="node-box" style="border-left: 4px solid #4caf50;"><div class="node-name">${testData.name}</div></div>`,
        children: testData.children.map(child => ({
          innerHTML: `<div class="node-box" style="border-left: 4px solid #2196f3;"><div class="node-name">${child.name}</div></div>`,
          children: []
        }))
      }
    });
    console.log("Treant berhasil render");
  } catch (err) {
    console.error("Error Treant:", err);
    alert("Error Treant: " + err.message);
  }
  
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

// ========== LOAD TREE (LANGSUNG RENDER) ==========
async function loadTree() {
  console.log("loadTree mulai - versi test");
  
  // Langsung render dengan data test, abaikan Supabase dulu
  renderTree();
}

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
      const addBtn = document.getElementById("add-family-btn");
      if (addBtn) addBtn.style.display = "inline-block";
      renderTree();
    } else {
      document.getElementById("pin-error").innerText = "PIN salah! Coba lagi.";
    }
  } catch (err) {
    document.getElementById("pin-error").innerText = "Gagal verifikasi. Periksa koneksi.";
  }
}

// ========== FUNGSI KOSONG UNTUK HINDARI ERROR ==========
function updateFamilySelector() {}
function onFamilyChange() {}
function openOptions(path) {}
function setMode(path, mode) {}
function cancelInline() {}
async function submitInline(path) {}
async function hapus(path) {}
async function addNewFamily() {}
function showAddFamilyModal() {}
function closeAddFamilyModal() {}
async function showInfo(path) {
  alert("Info: Fitur info sedang dalam perbaikan");
}
function convert(node, path, generation) { return {}; }
function getCurrentScroll() { return { left: 800, top: 400 }; }
function restoreScroll(left, top) {}

// ========== EVENT LISTENERS ==========
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded: mulai init");
  
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
  
  loadTree();
});

window.addEventListener("click", (e) => {
  if (e.target === document.getElementById("login-modal")) {
    closeLoginModal();
  }
  if (e.target === document.getElementById("info-modal")) {
    closeInfoModal();
  }
});
