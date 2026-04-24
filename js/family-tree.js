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

let activePath = null;
let activeMode = null;
let activeTreeId = "main";
let currentTreeData = null;
let isFirstLoad = true;
let currentZoom = 1;
let isAdmin = false;

let connectMode = null;
let connectSourcePath = null;
let connectSourceTreeId = null;

async function loadTree() {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/get-tree?id=1`);
    const data = await res.json();
    currentTreeData = data;
    resetSiblingColors();
    assignSiblingGroups(currentTreeData);

    if (typeof loadMultiState === "function") {
      await loadMultiState();
    }

    renderTree();
  } catch (err) {
    console.error("Gagal load tree:", err);
    showCustomPopup("Gagal memuat data. Periksa koneksi.", "Error");
  }
}

function getAllTrees() {
  const list = [];
  if (currentTreeData) {
    list.push({
      id: "main",
      name: (currentTreeData.name || "Utama").split("|")[0].trim(),
      data: currentTreeData,
      offset: getTreeOffset("main")
    });
  }
  if (typeof extraTrees !== "undefined" && Array.isArray(extraTrees)) {
    extraTrees.forEach(t => {
      list.push({
        id: t.id,
        name: t.name || (t.data && t.data.name) || "Tree",
        data: t.data,
        offset: getTreeOffset(t.id)
      });
    });
  }
  return list;
}

window.getAllTrees = getAllTrees;

function getTreeDataById(treeId) {
  if (treeId === "main") return currentTreeData;
  if (typeof extraTrees === "undefined") return null;
  const t = extraTrees.find(x => x.id === treeId);
  return t ? t.data : null;
}

function isTreeVisible(treeId) {
  if (typeof visibleTrees === "undefined" || visibleTrees === "all") return true;
  if (Array.isArray(visibleTrees)) return visibleTrees.includes(treeId);
  return true;
}

window.isTreeVisible = isTreeVisible;

function renderTree() {
  const container = document.getElementById("tree");
  if (!container) return;

  const wrapper = document.getElementById("tree-wrapper");
  const savedLeft = wrapper ? wrapper.scrollLeft : 800;
  const savedTop = wrapper ? wrapper.scrollTop : 400;

  container.innerHTML = "";

  const svgNS = "http://www.w3.org/2000/svg";
  const overlay = document.createElementNS(svgNS, "svg");
  overlay.setAttribute("id", "manual-links-svg");
  overlay.setAttribute("class", "manual-links-svg");
  overlay.setAttribute("width", "10000");
  overlay.setAttribute("height", "10000");
  container.appendChild(overlay);

  const trees = getAllTrees();
  trees.forEach(t => {
    if (!isTreeVisible(t.id)) return;
    if (!t.data) return;

    const div = document.createElement("div");
    div.className = "tree-instance";
    div.id = `tree-instance-${t.id}`;
    div.dataset.treeId = t.id;
    div.style.transform = `translate(${t.offset.x}px, ${t.offset.y}px)`;
    div.style.position = 'absolute';
    div.style.overflow = 'visible';
    
    container.appendChild(div);

    if (t.id !== "main") {
      assignSiblingGroups(t.data);
    }

    try {
      new Treant({
        chart: {
          container: `#tree-instance-${t.id}`,
          rootOrientation: "NORTH",
          connectors: { type: "bCurve" },
          animateOnInit: false,
          levelSeparation: 50,
          siblingSeparation: 15,
          subTeeSeparation: 30,
          padding: 50
        },
        nodeStructure: convert(t.data, [], 1, t.id)
      });
    } catch (err) {
      console.error("Treant error tree", t.id, err);
    }
  });

  setTimeout(() => {
    trees.forEach(t => {
      if (!isTreeVisible(t.id)) return;
      const inst = document.getElementById(`tree-instance-${t.id}`);
      if (!inst) return;
      
      const treantDiv = inst.querySelector('.Treant');
      const svg = inst.querySelector('svg');
      if (!treantDiv || !svg) return;
      
      treantDiv.style.width = '100%';
      treantDiv.style.height = '100%';
      
      let contentWidth = 0, contentHeight = 0;
      try {
        const bbox = svg.getBBox();
        contentWidth = bbox.width;
        contentHeight = bbox.height;
      } catch (e) {
        contentWidth = 500;
        contentHeight = 300;
      }
      
      const PADDING = 10;
      const newWidth = contentWidth + PADDING;
      const newHeight = contentHeight + PADDING;
      
      treantDiv.style.width = newWidth + 'px';
      treantDiv.style.height = newHeight + 'px';
    });
    
    if (typeof isAdmin !== 'undefined' && isAdmin && typeof onEdgeClickForConnect === 'function') {
      document.querySelectorAll('.node-edge-left').forEach(edge => {
        edge.removeEventListener('dblclick', onEdgeClickForConnect);
        edge.addEventListener('dblclick', onEdgeClickForConnect);
      });
    }
    
    attachConnectTargetListener();
    
    if (wrapper) {
      if (isFirstLoad) {
        if (typeof loadViewState === "function") loadViewState();
        else if (typeof centerOnMainTree === "function") centerOnMainTree();
        isFirstLoad = false;
      } else {
        wrapper.scrollLeft = savedLeft;
        wrapper.scrollTop = savedTop;
      }
    }
    if (typeof drawManualLinks === "function") drawManualLinks();
  }, 200);
}

function convert(node, path = [], generation = 1, treeId = "main") {
  const isActive = activePath && activeTreeId === treeId &&
                   JSON.stringify(path) === JSON.stringify(activePath);
  const borderColor = getNodeColor(node);
  const inputId = `input-${treeId}-${path.join("-")}`;
  const nodeKey = `${treeId}|${path.join(",")}`;
  const pathJson = JSON.stringify(path);
  const tIdQ = `"${treeId}"`;

  const edgeHtml = `<div class="node-edge-left" data-edge-key="${nodeKey}"></div>`;

  let innerHTML = "";

  if (isActive && activeMode && isAdmin) {
    let inputValue = "";
    let placeholder = "";
    if (activeMode === "edit") { inputValue = node.name; placeholder = "Tulis nama (Enter untuk baris baru)"; }
    else if (activeMode === "add") placeholder = "Tulis nama anak (Enter untuk baris baru)";
    else if (activeMode === "parent") placeholder = "Tulis nama parent (Enter untuk baris baru)";
    else if (activeMode === "order") placeholder = "Masukkan nomor urutan (0=pertama)";

    innerHTML = `
      <div class="node-box active-node" data-node-key="${nodeKey}" style="border-left: 4px solid ${borderColor};">
        ${edgeHtml}
        <div class="node-name">${escapeHtml(node.name)}</div>
        <textarea class="node-input" id="${inputId}"
          placeholder="${placeholder}" rows="2">${escapeHtml(inputValue)}</textarea>
        <div class="node-actions">
          <button onclick='submitInline(${pathJson})'>✔ Simpan</button>
          <button onclick='cancelInline()'>✖ Batal</button>
        </div>
      </div>
    `;
  }
  else if (isActive && isAdmin) {
    innerHTML = `
      <div class="node-box active-node" data-node-key="${nodeKey}" style="border-left: 4px solid ${borderColor};">
        ${edgeHtml}
        <div class="node-name">${escapeHtml(node.name)}</div>
        <div class="node-menu">
          <button onclick='setMode(${pathJson}, "add", ${tIdQ})'>➕ Tambah Anak</button>
          <button onclick='setMode(${pathJson}, "edit", ${tIdQ})'>✏️ Ubah Nama</button>
          <button onclick='showHapusPopup(${pathJson}, ${tIdQ})'>❌ Hapus</button>
          <button onclick='setMode(${pathJson}, "parent", ${tIdQ})'>⬆️ Tambah Parent</button>
          <button onclick='setMode(${pathJson}, "order", ${tIdQ})'>🔢 Ubah Urutan</button>
          <button onclick='startConnect(${pathJson}, ${tIdQ})'>🔗 Hubungkan</button>
          <button onclick='disconnectNode(${pathJson}, ${tIdQ})'>✂️ Putuskan</button>
        </div>
      </div>
    `;
  }
  else {
    const displayName = escapeHtml(node.name).replace(/\n/g, '<br>');
    let buttons = `<button class="btn-info" onclick='showInfoFor(${tIdQ}, ${pathJson})'>📄 Info</button>`;
    if (isAdmin) {
      buttons = `<button class="btn-option" onclick='openOptions(${pathJson}, ${tIdQ})'>⚙️ Option</button>${buttons}`;
    }

    innerHTML = `
      <div class="node-box" data-node-key="${nodeKey}" style="border-left: 4px solid ${borderColor};">
        ${edgeHtml}
        <div class="node-name">${displayName}</div>
        <div class="node-buttons">
          ${buttons}
        </div>
      </div>
    `;
  }

  return {
    innerHTML: innerHTML,
    children: node.children?.map((child, i) => convert(child, [...path, i], generation + 1, treeId))
  };
}

// ========== HELPER ==========

function isDescendant(ancestor, descendant) {
  if (!ancestor || !descendant) return false;
  if (!ancestor.children) return false;
  for (let child of ancestor.children) {
    if (child === descendant) return true;
    if (isDescendant(child, descendant)) return true;
  }
  return false;
}

function removeNodeFromTree(tree, path) {
  if (!path || path.length === 0) return;
  
  const parentPath = path.slice(0, -1);
  const nodeIndex = path[path.length - 1];
  const parent = parentPath.length === 0 ? tree : getNodeByPath(tree, parentPath);
  
  if (parent && parent.children) {
    parent.children.splice(nodeIndex, 1);
  }
}

function deleteTreeIfEmpty(treeId) {
  if (treeId === 'main') return;
  const tree = getTreeDataById(treeId);
  if (!tree || !tree.name || tree.name === 'Root Kosong' || (tree.children && tree.children.length === 0)) {
    const idx = extraTrees.findIndex(t => t.id === treeId);
    if (idx >= 0) {
      extraTrees.splice(idx, 1);
      delete treeOffsets[treeId];
    }
  }
}

function cleanEmptyTrees() {
  if (!currentTreeData || !currentTreeData.name) {
    currentTreeData = { name: 'Keluarga Utama', children: [] };
  }
  if (typeof extraTrees !== 'undefined') {
    extraTrees = extraTrees.filter(t => {
      if (!t.data || !t.data.name || t.data.name === 'Root Kosong') {
        delete treeOffsets[t.id];
        return false;
      }
      return true;
    });
  }
}

// ========== MODE HUBUNGKAN ==========

function showHubungkanBanner(text) {
  const banner = document.getElementById('hubungkan-banner');
  const textEl = document.getElementById('hubungkan-banner-text');
  if (banner && textEl) {
    textEl.textContent = text;
    banner.style.display = 'flex';
  }
  document.body.classList.add('hubungkan-mode');
}

function hideHubungkanBanner() {
  const banner = document.getElementById('hubungkan-banner');
  if (banner) banner.style.display = 'none';
  document.body.classList.remove('hubungkan-mode');
}

function startConnect(path, treeId) {
  if (!isAdmin) return;
  
  const scroll = getCurrentScroll();
  activePath = null;
  activeMode = null;
  
  showCustomPopup(
    'Pilih peran Node ini terhadap Node target:',
    'Hubungkan Node',
    null,
    true
  );
  
  setTimeout(() => {
    const popupButtons = document.getElementById('popup-buttons');
    if (popupButtons) {
      popupButtons.innerHTML = '';
      
      const btnParent = document.createElement('button');
      btnParent.textContent = '⬆️ Sebagai Orang Tua';
      btnParent.style.background = '#4caf50';
      btnParent.onclick = () => {
        closeCustomPopup();
        connectMode = 'parent';
        connectSourcePath = path;
        connectSourceTreeId = treeId;
        showHubungkanBanner('🔗 Pilih Node yang akan menjadi ANAK...');
      };
      
      const btnChild = document.createElement('button');
      btnChild.textContent = '⬇️ Sebagai Anak';
      btnChild.style.background = '#2196f3';
      btnChild.onclick = () => {
        closeCustomPopup();
        connectMode = 'child';
        connectSourcePath = path;
        connectSourceTreeId = treeId;
        showHubungkanBanner('🔗 Pilih Node yang akan menjadi ORANG TUA...');
      };
      
      const btnCancel = document.createElement('button');
      btnCancel.textContent = 'Batal';
      btnCancel.style.background = '#607d8b';
      btnCancel.onclick = () => {
        closeCustomPopup();
        restoreScroll(scroll.left, scroll.top);
      };
      
      popupButtons.appendChild(btnParent);
      popupButtons.appendChild(btnChild);
      popupButtons.appendChild(btnCancel);
    }
  }, 50);
}

function cancelHubungkanMode() {
  connectMode = null;
  connectSourcePath = null;
  connectSourceTreeId = null;
  hideHubungkanBanner();
}

function attachConnectTargetListener() {
  document.removeEventListener('click', handleConnectTargetClick, true);
  document.addEventListener('click', handleConnectTargetClick, true);
}

function handleConnectTargetClick(e) {
  if (!connectMode) return;
  
  const nodeBox = e.target.closest('.node-box');
  if (!nodeBox) return;
  
  const targetKey = nodeBox.getAttribute('data-node-key');
  if (!targetKey) return;
  
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  
  const parts = targetKey.split('|');
  const targetTreeId = parts[0];
  const targetPath = parts[1] ? parts[1].split(',').map(Number) : [];
  
  const sourceKey = `${connectSourceTreeId}|${connectSourcePath.join(',')}`;
  if (targetKey === sourceKey) {
    showCustomPopup('Tidak bisa menghubungkan ke node yang sama!', 'Peringatan');
    return;
  }
  
  executeConnect(targetPath, targetTreeId);
}

async function executeConnect(targetPath, targetTreeId) {
  if (!connectMode || !connectSourcePath || !connectSourceTreeId) return;
  
  saveToUndo();
  
  const sourceTree = getTreeDataById(connectSourceTreeId);
  const targetTree = getTreeDataById(targetTreeId);
  if (!sourceTree || !targetTree) {
    cancelHubungkanMode();
    return;
  }
  
  let sourceNode = getNodeByPath(sourceTree, connectSourcePath);
  let targetNode = getNodeByPath(targetTree, targetPath);
  
  if (!sourceNode || !targetNode) {
    showCustomPopup('Node tidak ditemukan', 'Error');
    cancelHubungkanMode();
    return;
  }
  
  if (isDescendant(sourceNode, targetNode) || isDescendant(targetNode, sourceNode)) {
    showCustomPopup('Tidak bisa menghubungkan ke keturunan sendiri!', 'Peringatan');
    cancelHubungkanMode();
    return;
  }
  
  if (connectMode === 'child') {
    const nodeToMove = JSON.parse(JSON.stringify(sourceNode));
    
    // Jika yang dipindah adalah ROOT
    if (!connectSourcePath || connectSourcePath.length === 0) {
      if (connectSourceTreeId !== 'main') {
        const idx = extraTrees.findIndex(t => t.id === connectSourceTreeId);
        if (idx >= 0) {
          extraTrees.splice(idx, 1);
          delete treeOffsets[connectSourceTreeId];
        }
      } else {
        if (sourceTree.children && sourceTree.children.length > 0) {
          const firstChild = sourceTree.children[0];
          sourceTree.name = firstChild.name;
          sourceTree.children = firstChild.children || [];
        } else {
          sourceTree.name = 'Keluarga Utama';
          sourceTree.children = [];
        }
      }
    } else {
      removeNodeFromTree(sourceTree, connectSourcePath);
    }
    
    deleteTreeIfEmpty(connectSourceTreeId);
    
    targetNode = getNodeByPath(targetTree, targetPath);
    if (!targetNode.children) targetNode.children = [];
    targetNode.children.push(nodeToMove);
    
  } else if (connectMode === 'parent') {
    const nodeToMove = JSON.parse(JSON.stringify(targetNode));
    
    if (!targetPath || targetPath.length === 0) {
      if (targetTreeId !== 'main') {
        const idx = extraTrees.findIndex(t => t.id === targetTreeId);
        if (idx >= 0) {
          extraTrees.splice(idx, 1);
          delete treeOffsets[targetTreeId];
        }
      } else {
        if (targetTree.children && targetTree.children.length > 0) {
          const firstChild = targetTree.children[0];
          targetTree.name = firstChild.name;
          targetTree.children = firstChild.children || [];
        } else {
          targetTree.name = 'Keluarga Utama';
          targetTree.children = [];
        }
      }
    } else {
      removeNodeFromTree(targetTree, targetPath);
    }
    
    deleteTreeIfEmpty(targetTreeId);
    
    sourceNode = getNodeByPath(sourceTree, connectSourcePath);
    if (!sourceNode.children) sourceNode.children = [];
    sourceNode.children.push(nodeToMove);
  }
  
  cleanEmptyTrees();
  cancelHubungkanMode();
  
  await persistMultiState();
  resetSiblingColors();
  assignSiblingGroups(currentTreeData);
  renderTree();
  showCustomPopup('Node berhasil dihubungkan!', 'Sukses');
}

// ========== PUTUSKAN (HANYA PUTUS GARIS, TIDAK PINDAH POSISI) ==========

async function disconnectNode(path, treeId) {
  if (!isAdmin) return;
  
  const tree = getTreeDataById(treeId);
  if (!tree) return;
  
  const node = getNodeByPath(tree, path);
  if (!node) return;
  
  if (!path || path.length === 0) {
    showCustomPopup('Node ini sudah menjadi Root', 'Info');
    return;
  }
  
  saveToUndo();
  
  const parentPath = path.slice(0, -1);
  const nodeIndex = path[path.length - 1];
  const parent = parentPath.length === 0 ? tree : getNodeByPath(tree, parentPath);
  
  if (parent && parent.children) {
    parent.children.splice(nodeIndex, 1);
  }
  
  const newId = (typeof newIdMT === 'function') ? newIdMT('t') : 't_' + Date.now().toString(36);
  const currentOffset = treeOffsets[treeId] || { x: DEFAULT_MAIN_OFFSET.x, y: DEFAULT_MAIN_OFFSET.y };
  
  extraTrees.push({
    id: newId,
    name: node.name.split('|')[0].trim(),
    data: node
  });
  
  treeOffsets[newId] = { ...currentOffset };
  
  await persistMultiState();
  resetSiblingColors();
  assignSiblingGroups(currentTreeData);
  renderTree();
  showCustomPopup('Node diputuskan dan menjadi Root mandiri!', 'Sukses');
}

// ========== STANDARD FUNCTIONS ==========

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

function openOptions(path, treeId = "main") {
  if (!isAdmin) return;
  const scroll = getCurrentScroll();
  activePath = path;
  activeMode = null;
  activeTreeId = treeId;
  renderTree();
  restoreScroll(scroll.left, scroll.top);
}

function setMode(path, mode, treeId = "main") {
  if (!isAdmin) return;
  const scroll = getCurrentScroll();
  activePath = path;
  activeMode = mode;
  activeTreeId = treeId;
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
  const treeId = activeTreeId || "main";
  const input = document.getElementById(`input-${treeId}-${path.join("-")}`);
  if (!input) return;
  const val = input.value.trim();
  if (activeMode !== "order" && !val) {
    showCustomPopup("Nama tidak boleh kosong!", "Peringatan");
    return;
  }

  if (treeId === "main") {
    let action, body = { path };
    if (activeMode === "add") { action = "add"; body.name = val; }
    else if (activeMode === "edit") { action = "edit"; body.name = val; }
    else if (activeMode === "parent") { action = "addParent"; body.name = val; }
    else if (activeMode === "order") {
      action = "reorder"; body.position = parseInt(val);
      if (isNaN(body.position)) {
        showCustomPopup("Masukkan angka untuk urutan!", "Peringatan");
        return;
      }
    } else return;

    try {
      saveToUndo();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/update-tree`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body })
      });
      const result = await res.json();
      if (result.success) {
        activePath = null; activeMode = null;
        await loadTree();
        showCustomPopup("Perubahan berhasil disimpan!", "Sukses");
      } else {
        showCustomPopup("Gagal: " + (result.error || "Error"), "Error");
      }
    } catch (err) {
      showCustomPopup("Error: " + err.message, "Error");
    }
  } else {
    saveToUndo();
    const tree = getTreeDataById(treeId);
    if (!tree) return;

    if (activeMode === "add") {
      const target = getNodeByPath(tree, path);
      if (!target) return;
      if (!target.children) target.children = [];
      target.children.push({ name: val });
    } else if (activeMode === "edit") {
      const target = getNodeByPath(tree, path);
      if (!target) return;
      target.name = val;
    } else if (activeMode === "parent") {
      const target = getNodeByPath(tree, path);
      if (!target) return;
      if (path.length === 0) {
        const newRoot = { name: val, children: [tree] };
        const idx = extraTrees.findIndex(x => x.id === treeId);
        if (idx >= 0) extraTrees[idx].data = newRoot;
      } else {
        const parentPath = path.slice(0, -1);
        const idxInParent = path[path.length - 1];
        const parent = getNodeByPath(tree, parentPath);
        if (!parent || !parent.children) return;
        const orig = parent.children[idxInParent];
        const newParent = { name: val, children: [orig] };
        parent.children[idxInParent] = newParent;
      }
    } else if (activeMode === "order") {
      const pos = parseInt(val);
      if (isNaN(pos)) {
        showCustomPopup("Masukkan angka untuk urutan!", "Peringatan");
        return;
      }
      if (path.length === 0) return;
      const parentPath = path.slice(0, -1);
      const idxInParent = path[path.length - 1];
      const parent = getNodeByPath(tree, parentPath);
      if (!parent || !parent.children) return;
      const item = parent.children.splice(idxInParent, 1)[0];
      const newPos = Math.max(0, Math.min(parent.children.length, pos));
      parent.children.splice(newPos, 0, item);
    }

    activePath = null; activeMode = null;
    await persistMultiState();
    resetSiblingColors();
    assignSiblingGroups(currentTreeData);
    renderTree();
    showCustomPopup("Perubahan berhasil disimpan!", "Sukses");
  }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  const cancelBtn = document.getElementById('hubungkan-cancel-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', cancelHubungkanMode);
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && connectMode) {
      cancelHubungkanMode();
    }
  });
});

window.startConnect = startConnect;
window.disconnectNode = disconnectNode;
/*Stable + cutting-root-fix*/
