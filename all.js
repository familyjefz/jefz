// ========== CONFIG ==========
const SUPABASE_URL = "https://btyrorlzdyisuvnwmrqp.supabase.co";
let currentFamilyId = "all";  // "all" untuk semua keluarga, atau angka untuk satu keluarga

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

// ========== CLEAN DATA FUNCTION ==========
function cleanData(node) {
  if (!node) return node;
  const cleanNode = { ...node };
  delete cleanNode._siblingGroupId;
  if (cleanNode.children && Array.isArray(cleanNode.children)) {
    cleanNode.children = cleanNode.children.map(child => cleanData(child));
  }
  return cleanNode;
}

// ========== LOAD SEMUA KELUARGA ==========
async function loadAllFamilies() {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/get-all-families`);
    const data = await res.json();
    
    if (Array.isArray(data)) {
      return data.map(family => cleanData(family));
    } else if (data && typeof data === 'object') {
      return [cleanData(data)];
    }
    return [];
  } catch (err) {
    console.error("Gagal load semua keluarga:", err);
    return [];
  }
}

async function loadSingleFamily(id) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/get-tree?id=${id}`);
    const data = await res.json();
    return cleanData(data);
  } catch (err) {
    console.error("Gagal load keluarga:", err);
    return null;
  }
}

// ========== UPDATE DROPDOWN ==========
function updateFamilySelector(data) {
  const selector = document.getElementById("family-selector");
  if (!selector) return;
  
  // Hapus opsi lama (kecuali "all")
  while (selector.options.length > 1) {
    selector.remove(1);
  }
  
  if (Array.isArray(data)) {
    data.forEach((family, idx) => {
      const option = document.createElement("option");
      option.value = idx + 1;
      let name = family.name;
      if (name && name.includes("|")) name = name.split("|")[0].trim();
      option.text = name || `Keluarga ${idx + 1}`;
      selector.appendChild(option);
    });
  }
  
  selector.value = currentFamilyId;
}

function onFamilyChange() {
  const selector = document.getElementById("family-selector");
  currentFamilyId = selector.value;
  loadTree();
}

// ========== RENDER TREE ==========
let activePath = null;
let activeMode = null;
let currentTreeData = null;
let isFirstLoad = true;
let currentZoom = 1;
let isAdmin = false;

async function loadTree() {
  try {
    // DATA STATIS UNTUK TEST
    currentTreeData = {
      "name": ">Sekghor |",
      "children": [
        { "name": ">Salama | Tohin", "children": [] },
        { "name": ">Ryfan |", "children": [] },
        { "name": ">Abd Hary |", "children": [] }
      ]
    };
    resetSiblingColors();
    assignSiblingGroups(currentTreeData);
    renderTree();
    console.log("Load tree dengan data statis berhasil");
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
  
  // Jika multi-family (array dengan lebih dari 1 keluarga)
  if (Array.isArray(currentTreeData) && currentTreeData.length > 1) {
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
      
      new Treant({
        chart: {
          container: `#temp-tree-${idx}`,
          rootOrientation: "NORTH",
          connectors: { type: "step" },
          animateOnInit: false,
          levelSeparation: 12,
          siblingSeparation: 8,
          subTeeSeparation: 8
        },
        nodeStructure: convert(root, [idx], 1)
      });
    });
    
    container.appendChild(forestContainer);
  } 
  // Single family
  else {
    const singleRoot = Array.isArray(currentTreeData) ? currentTreeData[0] : currentTreeData;
    if (singleRoot) {
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
        nodeStructure: convert(singleRoot, [], 1)
      });
    }
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

function convert(node, path = [], generation = 1) {
  const isActiveNode = activePath && JSON.stringify(path) === JSON.stringify(activePath);
  const borderColor = getNodeColor(node);
  const inputId = `input-${path.join("-")}`;
  
  let innerHTML = "";
  
  if (isActiveNode && activeMode && isAdmin) {
    let inputValue = "";
    let placeholder = "";
    if (activeMode === "edit") { inputValue = node.name; placeholder = "Tulis nama (Enter untuk baris baru)"; }
    else if (activeMode === "add") placeholder = "Tulis nama anak (Enter untuk baris baru)";
    else if (activeMode === "parent") placeholder = "Tulis nama parent (Enter untuk baris baru)";
    else if (activeMode === "order") placeholder = "Masukkan nomor urutan (0=pertama)";
    
    innerHTML = `
      <div class="node-box active-node" style="border-left: 4px solid ${borderColor};">
        <div class="node-name">${escapeHtml(node.name)}</div>
        <textarea class="node-input" id="${inputId}" 
          placeholder="${placeholder}" rows="2">${escapeHtml(inputValue)}</textarea>
        <div class="node-actions">
          <button onclick='submitInline(${JSON.stringify(path)})'>✔ Simpan</button>
          <button onclick='cancelInline()'>✖ Batal</button>
        </div>
      </div>
    `;
  }
  else if (isActiveNode && isAdmin) {
    innerHTML = `
      <div class="node-box active-node" style="border-left: 4px solid ${borderColor};">
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
    const displayName = escapeHtml(node.name).replace(/\n/g, '<br>');
    let buttons = `<button class="btn-info" onclick='showInfo(${JSON.stringify(path)})'>📄 Info</button>`;
    if (isAdmin) {
      buttons = `<button class="btn-option" onclick='openOptions(${JSON.stringify(path)})'>⚙️ Option</button>${buttons}`;
    }
    
    innerHTML = `
      <div class="node-box" style="border-left: 4px solid ${borderColor};">
        <div class="node-name">${displayName}</div>
        <div class="node-buttons">
          ${buttons}
        </div>
      </div>
    `;
  }
  
  return {
    innerHTML: innerHTML,
    children: node.children?.map((child, i) => convert(child, [...path, i], generation + 1))
  };
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

// ========== TAMBAH KELUARGA BARU ==========
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

// ========== FITUR INFO ==========
async function showInfo(path) {
  let parsedPath = path;
  if (typeof path === 'string') {
    try {
      parsedPath = JSON.parse(path);
    } catch(e) {
      console.error("Gagal parse path:", e);
      alert("Gagal memuat info. Silakan coba lagi.");
      return;
    }
  }
  
  let node = null;
  if (!parsedPath || parsedPath.length === 0) {
    node = currentTreeData;
  } else {
    node = getNodeByPath(currentTreeData, parsedPath);
  }
  
  if (!node) {
    console.error("Node tidak ditemukan untuk path:", parsedPath);
    alert("Gagal memuat info. Silakan coba lagi.");
    return;
  }
  
  const info = generateFamilyInfo(currentTreeData, parsedPath || [], node);
  
  const modal = document.getElementById("info-modal");
  const title = document.getElementById("info-title");
  const body = document.getElementById("info-body");
  
  let displayName = node.name;
  if (displayName && displayName.includes("|")) {
    displayName = displayName.split("|")[0].trim();
  }
  
  title.innerHTML = `📋 Info: ${escapeHtml(displayName).replace(/\n/g, '<br>')}`;
  
  body.innerHTML = `
    <div class="info-grid-2col">
      <div class="info-section">
        <div class="info-label">👤 Nama</div>
        <div class="info-value">${escapeHtml(displayName).replace(/\n/g, '<br>')}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">💑 Pasangan</div>
        <div class="info-value">${info.spouse || '<span class="empty-info">- Tidak ada</span>'}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">👶 Anak</div>
        <div class="info-value">${info.childrenList || '<span class="empty-info">- Tidak ada</span>'}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">👶 Cucu</div>
        <div class="info-value">${info.grandchildrenList || '<span class="empty-info">- Tidak ada</span>'}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">👨‍👩‍👧‍👦 Orang Tua</div>
        <div class="info-value">${info.parents || '<span class="empty-info">- Tidak ada</span>'}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">👴👵 Kakek/Nenek</div>
        <div class="info-value">${info.grandparents || '<span class="empty-info">- Tidak ada</span>'}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">👨‍👩‍👧‍👦 Saudara Kandung</div>
        <div class="info-value">${info.siblings || '<span class="empty-info">- Tidak ada</span>'}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">👶 Ponakan</div>
        <div class="info-value">${info.nephews || '<span class="empty-info">- Tidak ada</span>'}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">👨‍👩‍👧‍👦 Paman/Bibi</div>
        <div class="info-value">${info.auntsUncles || '<span class="empty-info">- Tidak ada</span>'}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">👨‍👩‍👧‍👦 Sepupu</div>
        <div class="info-value">${info.cousins || '<span class="empty-info">- Tidak ada</span>'}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">📜 7 Keturunan ke Atas</div>
        <div class="info-value">${info.ancestors7 || '<span class="empty-info">- Tidak ada</span>'}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">📜 7 Keturunan ke Bawah</div>
        <div class="info-value">${info.descendants7 || '<span class="empty-info">- Tidak ada</span>'}</div>
      </div>
    </div>
  `;
  
  modal.style.display = "block";
}

function generateFamilyInfo(treeData, path, node) {
  const parentPath = path.slice(0, -1);
  let parent = null;
  
  if (path.length === 0) {
    parent = null;
  } else if (parentPath.length === 0) {
    parent = treeData;
  } else {
    parent = getNodeByPath(treeData, parentPath);
  }
  
  let siblings = [];
  let currentNodeIndex = -1;
  
  if (parent && parent.children && path.length > 0) {
    if (parentPath.length === 0) {
      currentNodeIndex = parent.children.findIndex(c => c.name === node.name);
    } else {
      currentNodeIndex = path[path.length - 1];
    }
    
    if (currentNodeIndex !== -1) {
      siblings = parent.children.filter((_, idx) => idx !== currentNodeIndex);
    } else {
      siblings = parent.children.filter(c => c.name !== node.name);
    }
  }
  
  let nephews = [];
  siblings.forEach(sibling => {
    if (sibling.children && sibling.children.length > 0) {
      nephews = nephews.concat(sibling.children);
    }
  });
  
  let auntsUncles = [];
  if (parent && parentPath.length > 0) {
    let grandparent = null;
    if (parentPath.length === 1) {
      grandparent = treeData;
    } else {
      const grandparentPath = parentPath.slice(0, -1);
      grandparent = getNodeByPath(treeData, grandparentPath);
    }
    
    if (grandparent && grandparent.children) {
      auntsUncles = grandparent.children.filter(p => p !== parent);
    }
  }
  
  let cousins = [];
  auntsUncles.forEach(au => {
    if (au.children && au.children.length > 0) {
      cousins = cousins.concat(au.children);
    }
  });
  
  let spouse = null;
  if (node.name && node.name.includes("|")) {
    const parts = node.name.split("|");
    if (parts.length > 1 && parts[1].trim()) {
      spouse = parts[1].trim();
    }
  }
  
  const children = node.children || [];
  const childrenList = children.length > 0 
    ? children.map((c, i) => `${i + 1}. ${c.name.replace(/\n/g, '<br>')}`).join('<br>')
    : null;
  
  let grandchildren = [];
  children.forEach(child => {
    if (child.children && child.children.length > 0) {
      grandchildren = grandchildren.concat(child.children);
    }
  });
  const grandchildrenList = grandchildren.length > 0
    ? grandchildren.map((gc, i) => `${i + 1}. ${gc.name.replace(/\n/g, '<br>')}`).join('<br>')
    : null;
  
  const parents = parent ? parent.name.replace(/\n/g, '<br>') : null;
  
  let grandparent = null;
  if (parentPath.length > 0) {
    const grandparentPath = parentPath.slice(0, -1);
    let grandparentNode = null;
    if (grandparentPath.length === 0) {
      grandparentNode = treeData;
    } else {
      grandparentNode = getNodeByPath(treeData, grandparentPath);
    }
    if (grandparentNode && grandparentNode !== node && grandparentNode !== parent) {
      grandparent = grandparentNode.name.replace(/\n/g, '<br>');
    }
  }
  
  let ancestors = [];
  let currentParent = parent;
  let gen = 1;
  let maxGen = 7;
  
  while (currentParent && gen <= maxGen) {
    ancestors.push(`Generasi ke-${gen}: ${currentParent.name.replace(/\n/g, '<br>')}`);
    const currentParentPath = getPathOfNode(treeData, currentParent);
    if (currentParentPath && currentParentPath.length > 0) {
      const newParentPath = currentParentPath.slice(0, -1);
      if (newParentPath.length === 0) {
        currentParent = treeData;
        if (currentParent === treeData && ancestors.length > 0 && ancestors[ancestors.length-1].includes(treeData.name)) {
          break;
        }
      } else {
        currentParent = getNodeByPath(treeData, newParentPath);
      }
    } else {
      break;
    }
    gen++;
  }
  const ancestors7 = ancestors.length > 0 ? ancestors.join('<br>') : null;
  
  let descendants = [];
  let queue = [{ node: node, level: 1 }];
  while (queue.length > 0) {
    const { node: n, level } = queue.shift();
    if (level > 1 && level <= 7) {
      descendants.push(`Generasi ke-${level - 1}: ${n.name.replace(/\n/g, '<br>')}`);
    }
    if (n.children && level < 7) {
      n.children.forEach(child => queue.push({ node: child, level: level + 1 }));
    }
  }
  const descendants7 = descendants.length > 0 ? descendants.join('<br>') : null;
  
  return {
    spouse,
    childrenList,
    grandchildrenList,
    parents,
    grandparents: grandparent,
    ancestors7,
    siblings: siblings.length > 0 ? siblings.map((s, i) => `${i + 1}. ${s.name.replace(/\n/g, '<br>')}`).join('<br>') : null,
    nephews: nephews.length > 0 ? nephews.map((n, i) => `${i + 1}. ${n.name.replace(/\n/g, '<br>')}`).join('<br>') : null,
    auntsUncles: auntsUncles.length > 0 ? auntsUncles.map((au, i) => `${i + 1}. ${au.name.replace(/\n/g, '<br>')}`).join('<br>') : null,
    cousins: cousins.length > 0 ? cousins.map((c, i) => `${i + 1}. ${c.name.replace(/\n/g, '<br>')}`).join('<br>') : null,
    descendants7
  };
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
