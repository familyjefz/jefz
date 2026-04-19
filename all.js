// ========== CONFIG ==========
let currentView = "all";
let currentZoom = 1;
let isAdmin = false;
let currentEditPath = null;
let currentEditFamilyId = null;
let currentEditMode = null;
let FAMILIES = [];

// ========== FUNGSI BANTU ==========
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m]));
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

function getNodeByPath(node, path) {
  if (!path || path.length === 0) return node;
  let current = node;
  for (let i = 0; i < path.length; i++) {
    if (!current.children || !current.children[path[i]]) return null;
    current = current.children[path[i]];
  }
  return current;
}

// ========== LOAD DARI SUPABASE ==========
async function loadFromSupabase() {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/get-all-families`);
    if (!res.ok) throw new Error("HTTP error");
    const data = await res.json();
    
    if (Array.isArray(data) && data.length > 0) {
      FAMILIES = data.map((family, idx) => ({
        id: idx + 1,
        name: family.name ? (family.name.includes("|") ? family.name.split("|")[0].trim() : family.name) : `Keluarga ${idx + 1}`,
        data: cleanData(family)
      }));
    } else {
      useStaticData();
    }
  } catch (err) {
    console.error("Gagal load dari Supabase, pakai data statis:", err);
    useStaticData();
  }
  updateFamilySelector();
  render();
}

function useStaticData() {
  FAMILIES = [
    {
      id: 1,
      name: "Sekghor",
      data: {
        name: ">Sekghor |",
        children: [
          { name: ">Salama | Tohin", children: [] },
          { name: ">Ryfan |", children: [] },
          { name: ">Abd Hary |", children: [] }
        ]
      }
    }
  ];
}

// ========== SAVE KE SUPABASE ==========
async function saveToSupabase() {
  const dataToSave = FAMILIES.map(f => f.data);
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/update-tree`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "replace", data: dataToSave })
    });
  } catch (err) {
    console.error("Gagal save ke Supabase:", err);
  }
}

// ========== GENERATE INFO ==========
function generateInfo(node, familyName) {
  let spouse = null;
  if (node.name && node.name.includes("|")) {
    const parts = node.name.split("|");
    if (parts.length > 1 && parts[1].trim()) spouse = parts[1].trim();
  }
  
  const children = node.children || [];
  const childrenList = children.length > 0 ? children.map((c, i) => `${i+1}. ${c.name}`).join('<br>') : null;
  
  let grandchildren = [];
  children.forEach(child => {
    if (child.children) grandchildren = grandchildren.concat(child.children);
  });
  const grandchildrenList = grandchildren.length > 0 ? grandchildren.map((gc, i) => `${i+1}. ${gc.name}`).join('<br>') : null;
  
  return `
    <div class="info-grid">
      <div><div class="info-label">👤 Nama</div><div class="info-value">${escapeHtml(node.name.split("|")[0].trim())}</div></div>
      <div><div class="info-label">💑 Pasangan</div><div class="info-value">${spouse ? escapeHtml(spouse) : '<span class="empty-info">-</span>'}</div></div>
      <div><div class="info-label">👶 Anak</div><div class="info-value">${childrenList ? escapeHtml(childrenList).replace(/\n/g,'<br>') : '<span class="empty-info">-</span>'}</div></div>
      <div><div class="info-label">👶 Cucu</div><div class="info-value">${grandchildrenList ? escapeHtml(grandchildrenList).replace(/\n/g,'<br>') : '<span class="empty-info">-</span>'}</div></div>
      <div><div class="info-label">🏠 Keluarga</div><div class="info-value">${escapeHtml(familyName)}</div></div>
    </div>
  `;
}

// ========== RENDER TREE ==========
function render() {
  const container = document.getElementById("tree");
  if (!container) return;
  
  container.innerHTML = "";
  
  if (currentView === "all") {
    const forestDiv = document.createElement("div");
    forestDiv.className = "forest-container";
    
    FAMILIES.forEach(family => {
      const treeDiv = document.createElement("div");
      treeDiv.className = "tree-container";
      
      const title = document.createElement("div");
      title.className = "tree-title";
      title.innerText = family.name;
      treeDiv.appendChild(title);
      
      const tempDiv = document.createElement("div");
      tempDiv.id = `tree-${family.id}`;
      treeDiv.appendChild(tempDiv);
      
      forestDiv.appendChild(treeDiv);
      
      new Treant({
        chart: {
          container: `#tree-${family.id}`,
          rootOrientation: "NORTH",
          connectors: { type: "step" },
          animateOnInit: false,
          levelSeparation: 30,
          siblingSeparation: 30
        },
        nodeStructure: convertWithButtons(family.data, family.id, [])
      });
    });
    
    container.appendChild(forestDiv);
  } else {
    const family = FAMILIES.find(f => f.id == currentView);
    if (family) {
      new Treant({
        chart: {
          container: "#tree",
          rootOrientation: "NORTH",
          connectors: { type: "step" },
          animateOnInit: false,
          levelSeparation: 30,
          siblingSeparation: 30
        },
        nodeStructure: convertWithButtons(family.data, family.id, [])
      });
    }
  }
}

function convertWithButtons(node, familyId, path) {
  const currentPath = [...path];
  
  let buttonsHtml = '';
  if (isAdmin) {
    buttonsHtml = `<div class="node-buttons">
      <button onclick='showEdit(${familyId}, ${JSON.stringify(currentPath)}, \`${escapeHtml(node.name).replace(/`/g, '\\`')}\`)' style="background:#2196f3">✏️</button>
      <button onclick='showDelete(${familyId}, ${JSON.stringify(currentPath)})' style="background:#f44336">🗑️</button>
      <button onclick='showAddChild(${familyId}, ${JSON.stringify(currentPath)})' style="background:#4caf50">➕</button>
    </div>`;
  }
  buttonsHtml += `<div class="node-buttons"><button onclick='showInfo(${familyId}, ${JSON.stringify(currentPath)})' style="background:#5391c4">📄 Info</button></div>`;
  
  return {
    innerHTML: `<div class="node-box"><div class="node-name">${escapeHtml(node.name)}</div>${buttonsHtml}</div>`,
    children: node.children?.map((child, idx) => convertWithButtons(child, familyId, [...currentPath, idx])) || []
  };
}

// ========== INFO ==========
function showInfo(familyId, pathStr) {
  const family = FAMILIES.find(f => f.id == familyId);
  if (!family) return;
  const path = JSON.parse(pathStr);
  const node = getNodeByPath(family.data, path);
  if (!node) return;
  
  const infoHtml = generateInfo(node, family.name);
  document.getElementById("info-title").innerHTML = `📋 Info: ${escapeHtml(node.name.split("|")[0].trim())}`;
  document.getElementById("info-body").innerHTML = infoHtml;
  document.getElementById("info-modal").style.display = "block";
}

// ========== EDIT ==========
function showEdit(familyId, pathStr, currentName) {
  if (!isAdmin) return;
  currentEditFamilyId = familyId;
  currentEditPath = JSON.parse(pathStr);
  currentEditMode = "edit";
  document.getElementById("edit-input").value = currentName;
  document.getElementById("edit-modal").style.display = "block";
}

function saveEdit() {
  if (!isAdmin) return;
  const newName = document.getElementById("edit-input").value.trim();
  if (!newName) { alert("Nama tidak boleh kosong!"); return; }
  
  const family = FAMILIES.find(f => f.id === currentEditFamilyId);
  if (family) {
    const node = getNodeByPath(family.data, currentEditPath);
    if (node) node.name = newName;
  }
  closeEditModal();
  render();
  saveToSupabase();
  alert("Nama berhasil diubah!");
}

// ========== DELETE ==========
function showDelete(familyId, pathStr) {
  if (!isAdmin) return;
  if (!confirm("Hapus node ini?")) return;
  
  const family = FAMILIES.find(f => f.id == familyId);
  if (!family) return;
  const path = JSON.parse(pathStr);
  
  if (path.length === 0) {
    if (confirm("Hapus seluruh keluarga ini?")) {
      const idx = FAMILIES.findIndex(f => f.id == familyId);
      if (idx !== -1) FAMILIES.splice(idx, 1);
      updateFamilySelector();
      render();
      saveToSupabase();
    }
    return;
  }
  
  const parentPath = path.slice(0, -1);
  const childIndex = path[path.length - 1];
  const parent = parentPath.length === 0 ? family.data : getNodeByPath(family.data, parentPath);
  if (parent && parent.children) {
    parent.children.splice(childIndex, 1);
    render();
    saveToSupabase();
  }
}

// ========== ADD CHILD ==========
function showAddChild(familyId, pathStr) {
  if (!isAdmin) return;
  currentEditFamilyId = familyId;
  currentEditPath = JSON.parse(pathStr);
  currentEditMode = "add";
  document.getElementById("edit-input").value = "";
  document.getElementById("edit-title").innerHTML = "➕ Tambah Anak";
  document.getElementById("edit-modal").style.display = "block";
}

function saveAddChild() {
  if (!isAdmin) return;
  const newName = document.getElementById("edit-input").value.trim();
  if (!newName) { alert("Nama tidak boleh kosong!"); return; }
  
  const family = FAMILIES.find(f => f.id === currentEditFamilyId);
  if (family) {
    const node = currentEditPath.length === 0 ? family.data : getNodeByPath(family.data, currentEditPath);
    if (node) {
      if (!node.children) node.children = [];
      node.children.push({ name: newName, children: [] });
    }
  }
  closeEditModal();
  render();
  saveToSupabase();
  alert("Anak berhasil ditambahkan!");
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
      await loadFromSupabase();
    } else {
      alert("Gagal: " + (result.error || "Error"));
    }
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// ========== UPDATE DROPDOWN ==========
function updateFamilySelector() {
  const selector = document.getElementById("family-selector");
  if (!selector) return;
  while (selector.options.length > 1) selector.remove(1);
  FAMILIES.forEach(family => {
    const opt = document.createElement("option");
    opt.value = family.id;
    opt.text = family.name;
    selector.appendChild(opt);
  });
  selector.value = currentView === "all" ? "all" : currentView;
}

function onFamilyChange() {
  currentView = document.getElementById("family-selector").value;
  render();
}

// ========== ZOOM ==========
function setZoom(z) {
  currentZoom = z;
  const zoomContainer = document.getElementById("tree-zoom-container");
  zoomContainer.style.transform = `scale(${z})`;
}
function zoomIn() { setZoom(currentZoom + 0.1); }
function zoomOut() { setZoom(currentZoom - 0.1); }
function zoomReset() { setZoom(1); }

// ========== LOGIN ==========
function showLoginModal() { document.getElementById("login-modal").style.display = "block"; }
function closeLoginModal() { document.getElementById("login-modal").style.display = "none"; }
function closeInfoModal() { document.getElementById("info-modal").style.display = "none"; }
function closeEditModal() { 
  document.getElementById("edit-modal").style.display = "none";
  document.getElementById("edit-title").innerHTML = "Edit Nama";
}
function closeAddFamilyModal() { document.getElementById("add-family-modal").style.display = "none"; }
function showAddFamilyModal() { if (isAdmin) document.getElementById("add-family-modal").style.display = "block"; }

function checkPin() {
  const pin = document.getElementById("pin-input").value;
  if (pin === "00") {
    isAdmin = true;
    closeLoginModal();
    alert("Login sebagai Admin berhasil!");
    document.getElementById("add-family-btn").style.display = "inline-block";
    render();
  } else {
    document.getElementById("pin-error").innerText = "PIN salah! Coba lagi.";
  }
}

// ========== EVENT ==========
document.getElementById("family-selector")?.addEventListener("change", onFamilyChange);
document.getElementById("zoom-in")?.addEventListener("click", zoomIn);
document.getElementById("zoom-out")?.addEventListener("click", zoomOut);
document.getElementById("zoom-reset")?.addEventListener("click", zoomReset);
document.getElementById("login-btn")?.addEventListener("click", showLoginModal);
document.querySelector(".close")?.addEventListener("click", closeLoginModal);
document.querySelector(".close-info")?.addEventListener("click", closeInfoModal);
document.querySelector(".close-edit")?.addEventListener("click", closeEditModal);
document.querySelector(".close-family")?.addEventListener("click", closeAddFamilyModal);
document.getElementById("submit-pin")?.addEventListener("click", checkPin);
document.getElementById("add-family-btn")?.addEventListener("click", showAddFamilyModal);
document.getElementById("submit-family")?.addEventListener("click", addNewFamily);
document.getElementById("save-edit")?.addEventListener("click", () => {
  if (currentEditMode === "add") saveAddChild();
  else saveEdit();
});
document.getElementById("cancel-edit")?.addEventListener("click", closeEditModal);

window.addEventListener("click", (e) => {
  if (e.target === document.getElementById("login-modal")) closeLoginModal();
  if (e.target === document.getElementById("info-modal")) closeInfoModal();
  if (e.target === document.getElementById("edit-modal")) closeEditModal();
  if (e.target === document.getElementById("add-family-modal")) closeAddFamilyModal();
});

// ========== START ==========
loadFromSupabase();
