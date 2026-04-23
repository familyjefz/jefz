// ========== MULTI-TREE / LINKS / OFFSETS / VISIBILITY ==========
const MULTI_LS_KEY    = "silsilah_multi_state";
const MULTI_TREE_ID   = 2;
const HEADER_BG_COLOR = "#8cabe5";

let extraTrees   = [];
let manualLinks  = [];
let treeOffsets  = {};
let visibleTrees = "all";

const DEFAULT_MAIN_OFFSET = { x: 2300, y: 50 };
const TREE_VERTICAL_GAP   = 600;

function newId(prefix) {
  return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);
}

function getTreeOffset(treeId) {
  if (!treeOffsets[treeId]) {
    if (treeId === "main") {
      treeOffsets[treeId] = { ...DEFAULT_MAIN_OFFSET };
    } else {
      const idx = extraTrees.findIndex(t => t.id === treeId);
      treeOffsets[treeId] = {
        x: DEFAULT_MAIN_OFFSET.x,
        y: DEFAULT_MAIN_OFFSET.y + TREE_VERTICAL_GAP * (idx + 1)
      };
    }
  }
  return treeOffsets[treeId];
}

function multiStateObject() {
  return {
    extras: extraTrees,
    links: manualLinks,
    offsets: treeOffsets,
    visible: visibleTrees
  };
}

function applyMultiStateObject(obj) {
  if (!obj || typeof obj !== "object") return;
  extraTrees   = Array.isArray(obj.extras) ? obj.extras : [];
  manualLinks  = Array.isArray(obj.links)  ? obj.links  : [];
  treeOffsets  = (obj.offsets && typeof obj.offsets === "object") ? obj.offsets : {};
  visibleTrees = (obj.visible === "all" || Array.isArray(obj.visible)) ? obj.visible : "all";

  Object.keys(treeOffsets).forEach(k => {
    const o = treeOffsets[k];
    if (!o || (o.x === 0 && o.y === 0)) delete treeOffsets[k];
  });
}

async function loadMultiState() {
  let loaded = false;
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/get-tree?id=${MULTI_TREE_ID}`);
    if (res.ok) {
      const data = await res.json();
      if (data && (data.extras || data.links || data.offsets || data.visible)) {
        applyMultiStateObject(data);
        loaded = true;
      }
    }
  } catch (e) {}
  if (!loaded) {
    try {
      const raw = localStorage.getItem(MULTI_LS_KEY);
      if (raw) applyMultiStateObject(JSON.parse(raw));
    } catch (e) {}
  }
}

async function persistMultiState() {
  const obj = multiStateObject();
  try { localStorage.setItem(MULTI_LS_KEY, JSON.stringify(obj)); } catch (e) {}
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/update-tree`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "replace", id: MULTI_TREE_ID, data: obj })
    });
  } catch (e) {
    console.warn("Gagal save multi-state ke Supabase:", e);
  }
}

// ========== ADD TREE ==========
function openAddTreeModal() {
  if (!isAdmin) return;
  const m = document.getElementById("addtree-modal");
  document.getElementById("addtree-name-input").value = "";
  m.style.display = "flex";
  setTimeout(() => document.getElementById("addtree-name-input").focus(), 10);
}

function closeAddTreeModal() {
  document.getElementById("addtree-modal").style.display = "none";
}

async function submitAddTree() {
  const input = document.getElementById("addtree-name-input");
  const val = (input.value || "").trim();
  if (!val) {
    showCustomPopup("Nama tidak boleh kosong!", "Peringatan");
    return;
  }
  saveToUndo();
  const id = newId("t");
  extraTrees.push({
    id,
    name: val,
    data: { name: val, children: [] }
  });
  treeOffsets[id] = {
    x: DEFAULT_MAIN_OFFSET.x,
    y: DEFAULT_MAIN_OFFSET.y + TREE_VERTICAL_GAP * extraTrees.length
  };
  visibleTrees = "all";
  closeAddTreeModal();

  await persistMultiState();
  renderTree();

  setTimeout(() => focusOnNodeKey(`${id}|`), 200);
  showCustomPopup("Tree baru berhasil dibuat!", "Sukses");
}

function focusOnNodeKey(nodeKey) {
  const wrapper = document.getElementById("tree-wrapper");
  const el = document.querySelector(`.node-box[data-node-key="${cssEscapeMT(nodeKey)}"]`);
  if (!wrapper || !el) return;
  const wrapRect = wrapper.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const dx = (elRect.left + elRect.width / 2) - (wrapRect.left + wrapRect.width / 2);
  const dy = (elRect.top  + elRect.height / 2) - (wrapRect.top  + wrapRect.height / 2);
  wrapper.scrollLeft += dx;
  wrapper.scrollTop  += dy;
  saveViewState();
}

function cssEscapeMT(s) {
  if (window.CSS && CSS.escape) return CSS.escape(s);
  return String(s).replace(/[^a-zA-Z0-9_-]/g, c => "\\" + c);
}

// ========== FILTER MODAL DENGAN NOMOR & CHECKBOX OTOMATIS ==========
function openFilterModal() {
  const list = document.getElementById("filter-tree-list");
  list.innerHTML = "";
  const trees = getAllTrees();
  trees.forEach((t, index) => {
    const id = `flt-${t.id}`;
    const checked = isTreeVisible(t.id) ? "checked" : "";
    const row = document.createElement("label");
    row.innerHTML = `<input type="checkbox" id="${id}" data-tree-id="${t.id}" ${checked}> ${index + 1}. ${escapeHtml(t.name)}`;
    list.appendChild(row);
  });
  const allBox = document.getElementById("filter-all-checkbox");
  allBox.checked = (visibleTrees === "all");
  document.getElementById("filter-modal").style.display = "flex";
}

function closeFilterModal() {
  document.getElementById("filter-modal").style.display = "none";
}

function filterSelectAll() {
  document.querySelectorAll("#filter-tree-list input[type=checkbox]")
    .forEach(c => c.checked = true);
  document.getElementById("filter-all-checkbox").checked = true;
}

function filterDeselectAll() {
  document.querySelectorAll("#filter-tree-list input[type=checkbox]")
    .forEach(c => c.checked = false);
  document.getElementById("filter-all-checkbox").checked = false;
}

async function applyFilter() {
  const allBox = document.getElementById("filter-all-checkbox");
  if (allBox.checked) {
    visibleTrees = "all";
  } else {
    const ids = [];
    document.querySelectorAll("#filter-tree-list input[type=checkbox]:checked")
      .forEach(c => ids.push(c.getAttribute("data-tree-id")));
    visibleTrees = ids;
  }
  closeFilterModal();
  await persistMultiState();
  renderTree();
}

// ========== MANUAL LINKS ==========
const DBLTAP_MS = 350;
let lastEdgeTap = { key: null, time: 0 };
let connectFromKey = null;

function showConnectBanner() {
  const b = document.getElementById("connect-banner");
  if (b) b.style.display = "flex";
}
function hideConnectBanner() {
  const b = document.getElementById("connect-banner");
  if (b) b.style.display = "none";
}

function highlightConnectSource(nodeKey, on) {
  const el = document.querySelector(`.node-box[data-node-key="${cssEscapeMT(nodeKey)}"]`);
  if (!el) return;
