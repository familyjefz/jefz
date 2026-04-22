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

function renderTree() {
  const container = document.getElementById("tree");
  if (!container) return;

  const wrapper = document.getElementById("tree-wrapper");
  const savedLeft = wrapper ? wrapper.scrollLeft : 0;
  const savedTop = wrapper ? wrapper.scrollTop : 0;

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
          connectors: { type: "step" },
          animateOnInit: false,
          levelSeparation: 50,
          siblingSeparation: 30,
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
    if (wrapper) {
      if (isFirstLoad) {
        // Scroll ke main tree
        if (typeof centerOnMainTree === "function") {
          centerOnMainTree();
        } else {
          wrapper.scrollLeft = 500;
          wrapper.scrollTop = 200;
        }
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

function getCurrentScroll() {
  const w = document.getElementById("tree-wrapper");
  return { left: w ? w.scrollLeft : 0, top: w ? w.scrollTop : 0 };
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
/*Stable + scroll-center-final*/
