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

// ========== UNDO/REDO STACK ==========
let undoStack = [];
let redoStack = [];
let maxStackSize = 50;

function saveToUndo(data) {
  if (data) {
    undoStack.push(JSON.parse(JSON.stringify(data)));
    redoStack = [];
    if (undoStack.length > maxStackSize) {
      undoStack.shift();
    }
  }
}

function undo() {
  if (undoStack.length === 0) {
    showPopup("Tidak ada aksi yang bisa di-undo", "Info", null, null, false);
    return false;
  }
  const previousData = undoStack.pop();
  redoStack.push(JSON.parse(JSON.stringify(currentTreeData)));
  return previousData;
}

function redo() {
  if (redoStack.length === 0) {
    showPopup("Tidak ada aksi yang bisa di-redo", "Info", null, null, false);
    return false;
  }
  const nextData = redoStack.pop();
  undoStack.push(JSON.parse(JSON.stringify(currentTreeData)));
  return nextData;
}

async function applyUndoRedo(newData) {
  if (!newData) return;
  currentTreeData = newData;
  resetSiblingColors();
  assignSiblingGroups(currentTreeData);
  renderTree();
  
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/update-tree`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "replace", data: currentTreeData })
    });
    await res.json();
  } catch (err) {
    console.error("Gagal simpan ke database:", err);
  }
}

async function undoAction() {
  const previousData = undo();
  if (previousData) {
    await applyUndoRedo(previousData);
  }
}

async function redoAction() {
  const nextData = redo();
  if (nextData) {
    await applyUndoRedo(nextData);
  }
}

// ========== HAPUS DENGAN OPSI ==========
let pendingHapusPath = null;

async function hapusWithOption(path) {
  if (!isAdmin) return;
  pendingHapusPath = path;
  showHapusPopup(
    () => hapusNodeOnly(pendingHapusPath),
    () => hapusWithChildren(pendingHapusPath)
  );
}

async function hapusNodeOnly(path) {
  if (!isAdmin) return;
  
  try {
    saveToUndo(currentTreeData);
    
    const parentPath = path.slice(0, -1);
    const nodeIndex = path[path.length - 1];
    let parent = null;
    
    if (parentPath.length === 0) {
      parent = currentTreeData;
    } else {
      parent = getNodeByPath(currentTreeData, parentPath);
    }
    
    if (!parent || !parent.children) return;
    
    const nodeToDelete = parent.children[nodeIndex];
    if (!nodeToDelete) return;
    
    const grandchildren = nodeToDelete.children || [];
    
    parent.children.splice(nodeIndex, 1);
    
    if (grandchildren.length > 0) {
      parent.children.splice(nodeIndex, 0, ...grandchildren);
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
      showPopup("Node berhasil dihapus (anak-anak naik ke parent)", "Sukses", null, null, false);
    } else {
      showPopup("Gagal menghapus: " + (result.error || "Error"), "Error", null, null, false);
    }
  } catch (err) {
    showPopup("Error: " + err.message, "Error", null, null, false);
  }
}

async function hapusWithChildren(path) {
  if (!isAdmin) return;
  
  try {
    saveToUndo(currentTreeData);
    
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
      showPopup("Node dan semua keturunannya berhasil dihapus", "Sukses", null, null, false);
    } else {
      showPopup("Gagal hapus: " + (result.error || "Error"), "Error", null, null, false);
    }
  } catch (err) {
    showPopup("Error: " + err.message, "Error", null, null, false);
  }
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
    const data = await res.json();
    currentTreeData = data;
    resetSiblingColors();
    assignSiblingGroups(currentTreeData);
    
    saveToUndo(currentTreeData);
    
    renderTree();
  } catch (err) {
    console.error("Gagal load tree:", err);
    showPopup("Gagal memuat data. Periksa koneksi.", "Error", null, null, false);
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
          <button onclick='hapusWithOption(${JSON.stringify(path)})'>❌ Hapus</button>
          <button onclick='setMode(${JSON.stringify(path)}, "parent")'>⬆️ Tambah Parent</button>
          <button onclick='setMode(${JSON.stringify(path)}, "order")'>🔢 Ubah Urutan</button>
        </div>
        <div class="undo-redo-buttons">
          <button onclick='undoAction()'>↩️ Undo</button>
          <button onclick='redoAction()'>↪️ Redo</button>
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
  if (activeMode !== "order" && !val) { showPopup("Nama tidak boleh kosong!", "Peringatan", null, null, false); return; }
  
  let action, body = { path };
  if (activeMode === "add") { action = "add"; body.name = val; }
  else if (activeMode === "edit") { action = "edit"; body.name = val; }
  else if (activeMode === "parent") { action = "addParent"; body.name = val; }
  else if (activeMode === "order") { action = "reorder"; body.position = parseInt(val); if (isNaN(body.position)) { showPopup("Masukkan angka untuk urutan!", "Peringatan", null, null, false); return; } }
  else return;
  
  try {
    saveToUndo(currentTreeData);
    
    const res = await fetch(`${SUPABASE_URL}/functions/v1/update-tree`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body })
    });
    const result = await res.json();
    if (result.success) {
      activePath = null; activeMode = null;
      await loadTree();
    } else {
      showPopup("Gagal: " + (result.error || "Error"), "Error", null, null, false);
    }
  } catch (err) { 
    showPopup("Error: " + err.message, "Error", null, null, false);
  }
}
