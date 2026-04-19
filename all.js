// ========== CONFIG ==========
const SUPABASE_URL = "https://btyrorlzdyisuvnwmrqp.supabase.co";
let currentFamilyId = "all";
let currentZoom = 1;
let isAdmin = false;

// ========== FUNGSI BANTU ==========
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

function cleanData(node) {
  if (!node) return node;
  const cleanNode = { ...node };
  delete cleanNode._siblingGroupId;
  if (cleanNode.children && Array.isArray(cleanNode.children)) {
    cleanNode.children = cleanNode.children.map(child => cleanData(child));
  }
  return cleanNode;
}

function convert(node) {
  return {
    innerHTML: `<div class="node-box"><div class="node-name">${escapeHtml(node.name)}</div></div>`,
    children: node.children?.map(c => convert(c)) || []
  };
}

// ========== LOAD DARI SUPABASE ==========
async function loadAllFamilies() {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/get-all-families`);
    const data = await res.json();
    console.log("Data dari Supabase:", data);
    if (Array.isArray(data)) {
      return data.map(family => cleanData(family));
    }
    return [];
  } catch (err) {
    console.error("Gagal load:", err);
    return [];
  }
}

async function loadSingleFamily(id) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/get-tree?id=${id}`);
    const data = await res.json();
    return cleanData(data);
  } catch (err) {
    console.error("Gagal load:", err);
    return null;
  }
}

// ========== RENDER TREE ==========
let currentTreeData = null;
let isFirstLoad = true;

function renderTree() {
  const container = document.getElementById("tree");
  if (!container) return;
  
  const wrapper = document.getElementById("tree-wrapper");
  const savedLeft = wrapper ? wrapper.scrollLeft : 800;
  const savedTop = wrapper ? wrapper.scrollTop : 400;
  
  container.innerHTML = "";
  
  if (Array.isArray(currentTreeData) && currentTreeData.length > 0) {
    const forestContainer = document.createElement("div");
    forestContainer.className = "forest-container";
    
    currentTreeData.forEach((root, idx) => {
      const treeContainer = document.createElement("div");
      treeContainer.className = "tree-container";
      
      const title = document.createElement("div");
      title.className = "tree-title";
      let displayName = root.name;
      if (displayName && displayName.includes("|")) displayName = displayName.split("|")[0].trim();
      title.innerText = displayName;
      treeContainer.appendChild(title);
      
      const tempDiv = document.createElement("div");
      tempDiv.id = `temp-tree-${idx}`;
      treeContainer.appendChild(tempDiv);
      
      forestContainer.appendChild(treeContainer);
      
      new Treant({
        chart: {
          container: `#temp-tree-${idx}`,
          rootOrientation: "NORTH",
          connectors: { type: "step" },
          animateOnInit: false,
          levelSeparation: 30,
          siblingSeparation: 30
        },
        nodeStructure: convert(root)
      });
    });
    
    container.appendChild(forestContainer);
  } else if (currentTreeData && !Array.isArray(currentTreeData)) {
    new Treant({
      chart: {
        container: "#tree",
        rootOrientation: "NORTH",
        connectors: { type: "step" },
        animateOnInit: false,
        levelSeparation: 30,
        siblingSeparation: 30
      },
      nodeStructure: convert(currentTreeData)
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

// ========== LOAD TREE ==========
async function loadTree() {
  console.log("loadTree mulai, currentFamilyId =", currentFamilyId);
  
  try {
    let data;
    if (currentFamilyId === "all") {
      data = await loadAllFamilies();
    } else {
      data = await loadSingleFamily(parseInt(currentFamilyId));
    }
    
    currentTreeData = data;
    renderTree();
    updateFamilySelector();
  } catch (err) {
    console.error("Gagal load tree:", err);
  }
}

// ========== UPDATE DROPDOWN ==========
async function updateFamilySelector() {
  const selector = document.getElementById("family-selector");
  if (!selector) return;
  
  const families = await loadAllFamilies();
  
  while (selector.options.length > 1) {
    selector.remove(1);
  }
  
  families.forEach((family, idx) => {
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

// ========== TAMBAH KELUARGA ==========
async function addNewFamily() {
  if (!isAdmin) {
    alert("Hanya admin yang dapat menambah keluarga baru!");
    return;
  }
  
  const familyName = document.getElementById("new-family-name").value.trim();
  if (!familyName) {
    document.getElementById("family-error").innerText = "Nama keluarga tidak boleh kosong!";
    return;
  }
  
  document.getElementById("family-error").innerText = "";
  closeAddFamilyModal();
  
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/add-family`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: familyName })
    });
    const result = await res.json();
    if (result.success) {
      alert("Keluarga baru berhasil ditambahkan!");
      currentFamilyId = "all";
      await loadTree();
    } else {
      alert("Gagal: " + (result.error || "Error"));
    }
  } catch (err) {
    alert("Error: " + err.message);
  }
}

function showAddFamilyModal() {
  if (!isAdmin) return;
  document.getElementById("add-family-modal").style.display = "block";
  document.getElementById("new-family-name").value = "";
  document.getElementById("family-error").innerText = "";
  setTimeout(() => document.getElementById("new-family-name").focus(), 100);
}

function closeAddFamilyModal() {
  document.getElementById("add-family-modal").style.display = "none";
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

// ========== FITUR INFO & EDIT ==========
function getCurrentScroll() { return { left: 800, top: 400 }; }
function restoreScroll(left, top) {}

function openOptions(path) {
  alert("Fitur edit akan segera hadir untuk path: " + JSON.stringify(path));
}
function setMode(path, mode) {}
function cancelInline() {}
async function submitInline(path) { alert("Fitur edit akan segera hadir"); }
async function hapus(path) { alert("Fitur hapus akan segera hadir"); }

async function showInfo(path) {
  alert("Info untuk path: " + JSON.stringify(path) + "\n\nFitur info lengkap akan segera hadir");
}

// ========== EVENT LISTENERS ==========
document.addEventListener("DOMContentLoaded", () => {
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
  
  const addBtn = document.getElementById("add-family-btn");
  if (addBtn) {
    addBtn.addEventListener("click", showAddFamilyModal);
  }
  
  document.querySelector(".close-family")?.addEventListener("click", closeAddFamilyModal);
  document.getElementById("submit-family")?.addEventListener("click", addNewFamily);
  document.getElementById("new-family-name")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addNewFamily();
  });
  
  loadTree();
});

window.addEventListener("click", (e) => {
  if (e.target === document.getElementById("login-modal")) closeLoginModal();
  if (e.target === document.getElementById("info-modal")) closeInfoModal();
  if (e.target === document.getElementById("add-family-modal")) closeAddFamilyModal();
});
