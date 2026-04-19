// ========== CONFIG ==========
const SUPABASE_URL = "https://btyrorlzdyisuvnwmrqp.supabase.co";
let currentFamilyId = "all";
let currentZoom = 1;
let isAdmin = false;

// ========== DATA STATIS ==========
const FAMILIES_DATA = [
  {
    name: ">Sekghor |",
    children: [
      { name: ">Salama | Tohin", children: [] },
      { name: ">Ryfan |", children: [] },
      { name: ">Abd Hary |", children: [] }
    ]
  },
  {
    name: ">Budi |",
    children: []
  }
];

// ========== RENDER TREE ==========
let currentTreeData = null;
let isFirstLoad = true;

function renderTree() {
  console.log("renderTree dipanggil");
  const container = document.getElementById("tree");
  if (!container) {
    console.error("Element #tree tidak ditemukan");
    return;
  }
  
  const wrapper = document.getElementById("tree-wrapper");
  const savedLeft = wrapper ? wrapper.scrollLeft : 800;
  const savedTop = wrapper ? wrapper.scrollTop : 400;
  
  container.innerHTML = "";
  
  // Jika multi-family (array dengan lebih dari 1 keluarga)
  if (Array.isArray(currentTreeData) && currentTreeData.length > 1) {
    console.log("Render multi-family, jumlah:", currentTreeData.length);
    const forestContainer = document.createElement("div");
    forestContainer.style.display = "flex";
    forestContainer.style.flexDirection = "row";
    forestContainer.style.justifyContent = "center";
    forestContainer.style.alignItems = "flex-start";
    forestContainer.style.gap = "50px";
    forestContainer.style.flexWrap = "wrap";
    forestContainer.style.padding = "20px";
    
    currentTreeData.forEach((root, idx) => {
      const treeContainer = document.createElement("div");
      treeContainer.style.display = "inline-block";
      treeContainer.style.verticalAlign = "top";
      treeContainer.style.border = "1px solid #ddd";
      treeContainer.style.borderRadius = "10px";
      treeContainer.style.padding = "10px";
      treeContainer.style.backgroundColor = "rgba(255,255,255,0.5)";
      
      const title = document.createElement("div");
      title.style.textAlign = "center";
      title.style.fontWeight = "bold";
      title.style.marginBottom = "10px";
      title.style.padding = "5px";
      title.style.backgroundColor = "#f0f0f0";
      title.style.borderRadius = "5px";
      let displayName = root.name;
      if (displayName && displayName.includes("|")) displayName = displayName.split("|")[0].trim();
      title.innerText = displayName;
      treeContainer.appendChild(title);
      
      const tempDiv = document.createElement("div");
      tempDiv.id = `temp-tree-${idx}`;
      treeContainer.appendChild(tempDiv);
      
      forestContainer.appendChild(treeContainer);
      
      // Konversi sederhana untuk Treant
      function simpleConvert(node) {
        return {
          innerHTML: `<div class="node-box"><div class="node-name">${escapeHtml(node.name)}</div></div>`,
          children: node.children?.map(child => simpleConvert(child)) || []
        };
      }
      
      new Treant({
        chart: {
          container: `#temp-tree-${idx}`,
          rootOrientation: "NORTH",
          connectors: { type: "step" },
          animateOnInit: false,
          levelSeparation: 30,
          siblingSeparation: 30
        },
        nodeStructure: simpleConvert(root)
      });
    });
    
    container.appendChild(forestContainer);
  } 
  // Single family
  else if (currentTreeData && !Array.isArray(currentTreeData)) {
    console.log("Render single family");
    function simpleConvert(node) {
      return {
        innerHTML: `<div class="node-box"><div class="node-name">${escapeHtml(node.name)}</div></div>`,
        children: node.children?.map(child => simpleConvert(child)) || []
      };
    }
    
    new Treant({
      chart: {
        container: "#tree",
        rootOrientation: "NORTH",
        connectors: { type: "step" },
        animateOnInit: false,
        levelSeparation: 30,
        siblingSeparation: 30
      },
      nodeStructure: simpleConvert(currentTreeData)
    });
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

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// ========== LOAD TREE ==========
async function loadTree() {
  console.log("loadTree mulai, currentFamilyId =", currentFamilyId);
  
  if (currentFamilyId === "all") {
    currentTreeData = FAMILIES_DATA;
  } else {
    const idx = parseInt(currentFamilyId) - 1;
    currentTreeData = FAMILIES_DATA[idx];
  }
  
  console.log("currentTreeData:", currentTreeData);
  renderTree();
  updateFamilySelector();
}

// ========== UPDATE DROPDOWN ==========
function updateFamilySelector() {
  const selector = document.getElementById("family-selector");
  if (!selector) return;
  
  while (selector.options.length > 1) {
    selector.remove(1);
  }
  
  FAMILIES_DATA.forEach((family, idx) => {
    const option = document.createElement("option");
    option.value = (idx + 1).toString();
    let name = family.name;
    if (name && name.includes("|")) name = name.split("|")[0].trim();
    option.text = name || `Keluarga ${idx + 1}`;
    selector.appendChild(option);
  });
  
  selector.value = currentFamilyId;
}

function onFamilyChange() {
  const selector = document.getElementById("family-selector");
  currentFamilyId = selector.value;
  loadTree();
}

// ========== ZOOM ==========
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

// ========== LOGIN ==========
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
      alert("Login sebagai Admin berhasil!");
      const addBtn = document.getElementById("add-family-btn");
      if (addBtn) addBtn.style.display = "inline-block";
    } else {
      document.getElementById("pin-error").innerText = "PIN salah! Coba lagi.";
    }
  } catch (err) {
    document.getElementById("pin-error").innerText = "Gagal verifikasi.";
  }
}

// ========== FUNGSI KOSONG ==========
function openOptions(path) {}
function setMode(path, mode) {}
function cancelInline() {}
async function submitInline(path) {}
async function hapus(path) {}
async function addNewFamily() { alert("Fitur tambah keluarga akan segera hadir"); }
function showAddFamilyModal() {}
function closeAddFamilyModal() {}
async function showInfo(path) { alert("Info: " + path); }
function getCurrentScroll() { return { left: 800, top: 400 }; }
function restoreScroll(left, top) {}

// ========== EVENT LISTENERS ==========
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded");
  
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
  
  const selector = document.getElementById("family-selector");
  if (selector) {
    selector.addEventListener("change", onFamilyChange);
  }
  
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
