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

// ========== FUNGSI BANTU ==========
function getNodeByPath(nodes, path) {
  if (!path || path.length === 0) return null;
  
  // Jika nodes adalah array (multi-root) dan path[0] adalah index root
  if (Array.isArray(nodes) && typeof path[0] === 'number') {
    const rootIndex = path[0];
    if (!nodes[rootIndex]) return null;
    let current = nodes[rootIndex];
    for (let i = 1; i < path.length; i++) {
      if (!current.children || !current.children[path[i]]) return null;
      current = current.children[path[i]];
    }
    return current;
  }
  
  // Single root
  let current = nodes;
  for (let i = 0; i < path.length; i++) {
    if (!current.children || !current.children[path[i]]) return null;
    current = current.children[path[i]];
  }
  return current;
}

function getPathOfNode(nodes, targetNode) {
  // Single root
  if (!Array.isArray(nodes)) {
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
    return search(nodes, []);
  }
  
  // Multi-root
  for (let rootIdx = 0; rootIdx < nodes.length; rootIdx++) {
    function search(node, path) {
      if (node === targetNode) return [rootIdx, ...path];
      if (node.children) {
        for (let i = 0; i < node.children.length; i++) {
          const result = search(node.children[i], [...path, i]);
          if (result) return result;
        }
      }
      return null;
    }
    const result = search(nodes[rootIdx], []);
    if (result) return result;
  }
  return null;
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

// ========== RENDER TREE ==========
let activePath = null;
let activeMode = null;
let currentTreeData = null;
let isFirstLoad = true;
let currentZoom = 1;
let isAdmin = false;

async function loadTree() {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/get-tree`);
    let data = await res.json();
    
    currentTreeData = data;
    resetSiblingColors();
    
    if (Array.isArray(currentTreeData)) {
      currentTreeData.forEach(root => assignSiblingGroups(root));
    } else {
      assignSiblingGroups(currentTreeData);
    }
    
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
  
  // Jika multi-root
  if (Array.isArray(currentTreeData) && currentTreeData.length > 1) {
    const forestContainer = document.createElement("div");
    forestContainer.style.display = "flex";
    forestContainer.style.flexDirection = "row";
    forestContainer.style.justifyContent = "center";
    forestContainer.style.alignItems = "flex-start";
    forestContainer.style.gap = "50px";
    forestContainer.style.flexWrap = "wrap";
    
    currentTreeData.forEach((root, idx) => {
      const treeContainer = document.createElement("div");
      treeContainer.style.display = "inline-block";
      treeContainer.style.verticalAlign = "top";
      
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
  } else {
    // Single root
    const singleRoot = Array.isArray(currentTreeData) ? currentTreeData[0] : currentTreeData;
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
      nodeStructure: convert(singleRoot, [0], 1)
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

function convert(node, path = [], generation = 1) {
  const isActiveNode = isActive(path);
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

// ========== TAMBAH ROOT / KELUARGA BARU ==========
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
    let currentData = currentTreeData;
    if (!Array.isArray(currentData)) {
      currentData = [currentData];
    }
    
    const newRoot = {
      name: familyName,
      children: []
    };
    currentData.push(newRoot);
    
    const res = await fetch(`${SUPABASE_URL}/functions/v1/update-tree`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        action: "replace", 
        data: currentData 
      })
    });
    const result = await res.json();
    if (result.success) {
      alert("Keluarga baru berhasil ditambahkan!");
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
