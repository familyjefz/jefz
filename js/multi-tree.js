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

// Escape HTML lokal
function escapeHtmlMT(str) {
  if (!str) return "";
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

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
  
  // Gunakan window.getAllTrees jika ada, atau fallback
  const trees = (typeof window.getAllTrees === 'function') ? window.getAllTrees() : [];
  
  trees.forEach((t, index) => {
    const id = `flt-${t.id}`;
    const checked = (typeof isTreeVisible === 'function') ? isTreeVisible(t.id) : true;
    const row = document.createElement("label");
    row.innerHTML = `<input type="checkbox" id="${id}" data-tree-id="${t.id}" ${checked ? 'checked' : ''}> ${index + 1}. ${escapeHtmlMT(t.name)}`;
    list.appendChild(row);
    
    const checkbox = row.querySelector('input');
    checkbox.addEventListener('change', updateFilterAllCheckbox);
  });
  
  updateFilterAllCheckbox();
  
  const allBox = document.getElementById("filter-all-checkbox");
  allBox.checked = (visibleTrees === "all");
  
  document.getElementById("filter-modal").style.display = "flex";
}

function updateFilterAllCheckbox() {
  const allCheckboxes = document.querySelectorAll("#filter-tree-list input[type=checkbox]");
  const allBox = document.getElementById("filter-all-checkbox");
  
  if (allCheckboxes.length === 0) {
    allBox.checked = false;
    return;
  }
  
  const allChecked = Array.from(allCheckboxes).every(cb => cb.checked);
  allBox.checked = allChecked;
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
  if (on) el.classList.add("connect-source");
  else el.classList.remove("connect-source");
}

function enterConnectMode(fromKey) {
  if (connectFromKey) exitConnectMode();
  connectFromKey = fromKey;
  document.body.classList.add("connect-mode");
  highlightConnectSource(fromKey, true);
  showConnectBanner();
}

function exitConnectMode() {
  if (connectFromKey) highlightConnectSource(connectFromKey, false);
  connectFromKey = null;
  document.body.classList.remove("connect-mode");
  hideConnectBanner();
}

function nodeKeyExists(nodeKey) {
  return !!document.querySelector(`.node-box[data-node-key="${cssEscapeMT(nodeKey)}"]`);
}

async function finalizeManualLink(fromKey, toKey) {
  if (fromKey === toKey) { exitConnectMode(); return; }
  const exists = manualLinks.some(l =>
    (l.from === fromKey && l.to === toKey) ||
    (l.from === toKey && l.to === fromKey)
  );
  if (exists) {
    showCustomPopup("Tautan sudah ada antara dua node ini.", "Info");
    exitConnectMode();
    return;
  }
  saveToUndo();
  manualLinks.push({ id: newId("l"), from: fromKey, to: toKey });
  exitConnectMode();
  await persistMultiState();
  drawManualLinks();
  showCustomPopup("Tautan manual dibuat!", "Sukses");
}

window.onEdgeClickForConnect = function(e) {
  if (!isAdmin) return;
  const edge = e.target.closest(".node-edge-left");
  if (!edge) return;
  const key = edge.getAttribute("data-edge-key");
  if (!key) return;

  if (connectFromKey) {
    e.preventDefault(); e.stopPropagation();
    if (nodeKeyExists(key) && key !== connectFromKey) {
      finalizeManualLink(connectFromKey, key);
    } else {
      exitConnectMode();
    }
    return;
  }

  const now = Date.now();
  if (lastEdgeTap.key === key && (now - lastEdgeTap.time) < DBLTAP_MS) {
    e.preventDefault(); e.stopPropagation();
    lastEdgeTap = { key: null, time: 0 };
    enterConnectMode(key);
  } else {
    lastEdgeTap = { key, time: now };
  }
};

function onNodeClickForConnectTarget(e) {
  if (!connectFromKey) return;
  if (e.target.closest("#connect-banner") ||
      e.target.closest(".modal") ||
      e.target.closest(".custom-popup")) return;

  const box = e.target.closest(".node-box");
  if (box) {
    const targetKey = box.getAttribute("data-node-key");
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    if (targetKey && targetKey !== connectFromKey) {
      finalizeManualLink(connectFromKey, targetKey);
    } else {
      exitConnectMode();
    }
    return;
  }
  e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
  exitConnectMode();
}

function offsetUpTo(el, ancestor) {
  let x = 0, y = 0;
  let cur = el;
  while (cur && cur !== ancestor) {
    x += cur.offsetLeft;
    y += cur.offsetTop;
    cur = cur.offsetParent;
    if (!cur) break;
  }
  return { x, y };
}

function nodeCenterInTree(nodeEl, treeContainer) {
  const off = offsetUpTo(nodeEl, treeContainer);
  return {
    x: off.x + nodeEl.offsetWidth / 2,
    y: off.y + nodeEl.offsetHeight / 2
  };
}

function drawManualLinks() {
  const svg = document.getElementById("manual-links-svg");
  const treeRoot = document.getElementById("tree");
  if (!svg || !treeRoot) return;
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  if (!manualLinks || manualLinks.length === 0) return;

  const svgNS = "http://www.w3.org/2000/svg";
  manualLinks.forEach(link => {
    const fromEl = document.querySelector(`.node-box[data-node-key="${cssEscapeMT(link.from)}"]`);
    const toEl   = document.querySelector(`.node-box[data-node-key="${cssEscapeMT(link.to)}"]`);
    if (!fromEl || !toEl) return;

    const fromTreeId = link.from.split("|")[0];
    const toTreeId   = link.to.split("|")[0];
    const fromTreeEl = document.getElementById(`tree-instance-${fromTreeId}`);
    const toTreeEl   = document.getElementById(`tree-instance-${toTreeId}`);
    if (!fromTreeEl || !toTreeEl) return;

    const fromOff = treeOffsets[fromTreeId] || { x: 0, y: 0 };
    const toOff   = treeOffsets[toTreeId]   || { x: 0, y: 0 };

    const c1 = nodeCenterInTree(fromEl, fromTreeEl);
    const c2 = nodeCenterInTree(toEl,   toTreeEl);

    const x1 = fromOff.x + c1.x;
    const y1 = fromOff.y + c1.y;
    const x2 = toOff.x   + c2.x;
    const y2 = toOff.y   + c2.y;

    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    line.setAttribute("stroke", HEADER_BG_COLOR);
    line.setAttribute("stroke-width", "2.5");
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute("data-link-id", link.id);
    if (isAdmin) {
      line.style.cursor = "pointer";
      line.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        deleteManualLink(link.id);
      });
    }
    svg.appendChild(line);
  });
}

async function deleteManualLink(linkId) {
  if (!isAdmin) return;
  showCustomPopup("Hapus tautan manual ini?", "Konfirmasi", async () => {
    saveToUndo();
    manualLinks = manualLinks.filter(l => l.id !== linkId);
    await persistMultiState();
    drawManualLinks();
  }, true);
}

// ========== REPOSITION MODE ==========
let repositionSnapshot = null;
let repoDragging = false;
let repoDragTreeId = null;
let repoDragStart = { x: 0, y: 0 };
let repoDragOrig  = { x: 0, y: 0 };

function toggleRepositionMode() {
  if (!isAdmin) return;
  if (!repositionMode) enterRepositionMode();
  else confirmExitReposition();
}

function enterRepositionMode() {
  repositionMode = true;
  repositionSnapshot = JSON.parse(JSON.stringify(treeOffsets));
  document.body.classList.add("reposition-mode");
  const banner = document.getElementById("reposition-banner");
  if (banner) banner.style.display = "flex";
  const btn = document.getElementById("reposition-btn");
  if (btn) btn.classList.add("active");
}

function confirmExitReposition() {
  showCustomPopup(
    "Simpan perubahan posisi tree?",
    "Konfirmasi Reposisi",
    async () => {
      saveToUndo();
      const newOffsets = JSON.parse(JSON.stringify(treeOffsets));
      treeOffsets = newOffsets;
      exitRepositionMode();
      await persistMultiState();
      renderTree();
      showCustomPopup("Posisi tree disimpan.", "Sukses");
    },
    true
  );
  setTimeout(() => {
    const btns = document.querySelectorAll("#popup-buttons button");
    if (btns.length >= 2) {
      btns[1].onclick = () => {
        document.getElementById("custom-popup").style.display = "none";
        if (repositionSnapshot) {
          treeOffsets = repositionSnapshot;
        }
        exitRepositionMode();
        renderTree();
        showCustomPopup("Perubahan posisi dibatalkan.", "Info");
      };
    }
  }, 50);
}

function exitRepositionMode() {
  repositionMode = false;
  repositionSnapshot = null;
  document.body.classList.remove("reposition-mode");
  const banner = document.getElementById("reposition-banner");
  if (banner) banner.style.display = "none";
  const btn = document.getElementById("reposition-btn");
  if (btn) btn.classList.remove("active");
}

function getEventPoint(e) {
  if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  return { x: e.clientX, y: e.clientY };
}

function onRepoStart(e) {
  if (!repositionMode) return;
  const box = e.target.closest(".node-box");
  if (!box) return;
  const inst = box.closest(".tree-instance");
  if (!inst) return;
  const treeId = inst.dataset.treeId;
  if (!treeId) return;

  repoDragging = true;
  repoDragTreeId = treeId;
  const p = getEventPoint(e);
  repoDragStart = { x: p.x, y: p.y };
  const off = treeOffsets[treeId] || { x: 0, y: 0 };
  repoDragOrig = { x: off.x, y: off.y };
  e.preventDefault();
  e.stopPropagation();
}

function onRepoMove(e) {
  if (!repositionMode || !repoDragging) return;
  const p = getEventPoint(e);
  const dx = (p.x - repoDragStart.x) / scale;
  const dy = (p.y - repoDragStart.y) / scale;
  const newOff = { x: repoDragOrig.x + dx, y: repoDragOrig.y + dy };
  treeOffsets[repoDragTreeId] = newOff;
  const inst = document.getElementById(`tree-instance-${repoDragTreeId}`);
  if (inst) inst.style.transform = `translate(${newOff.x}px, ${newOff.y}px)`;
  drawManualLinks();
  e.preventDefault();
}

function onRepoEnd() {
  repoDragging = false;
  repoDragTreeId = null;
}

// ========== INIT ==========
function initMultiTree() {
  document.getElementById("addtree-btn")?.addEventListener("click", openAddTreeModal);
  document.querySelector(".close-addtree")?.addEventListener("click", closeAddTreeModal);
  document.getElementById("addtree-cancel")?.addEventListener("click", closeAddTreeModal);
  document.getElementById("addtree-submit")?.addEventListener("click", submitAddTree);
  document.getElementById("addtree-name-input")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") submitAddTree();
  });

  document.getElementById("filter-btn")?.addEventListener("click", openFilterModal);
  document.querySelector(".close-filter")?.addEventListener("click", closeFilterModal);
  document.getElementById("filter-cancel")?.addEventListener("click", closeFilterModal);
  document.getElementById("filter-apply")?.addEventListener("click", applyFilter);
  document.getElementById("filter-select-all")?.addEventListener("click", filterSelectAll);
  document.getElementById("filter-deselect-all")?.addEventListener("click", filterDeselectAll);
  document.getElementById("filter-all-checkbox")?.addEventListener("change", (e) => {
    if (e.target.checked) filterSelectAll();
    else filterDeselectAll();
  });

  document.getElementById("reposition-btn")?.addEventListener("click", toggleRepositionMode);
  document.getElementById("reposition-done-btn")?.addEventListener("click", confirmExitReposition);

  document.addEventListener("click", onEdgeClickForConnect, true);
  document.addEventListener("click", onNodeClickForConnectTarget, true);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (connectFromKey) exitConnectMode();
    }
  });
  document.getElementById("connect-cancel-btn")?.addEventListener("click", (e) => {
    e.preventDefault(); e.stopPropagation();
    exitConnectMode();
  });

  document.addEventListener("mousedown", onRepoStart, true);
  document.addEventListener("mousemove", onRepoMove, true);
  document.addEventListener("mouseup", onRepoEnd, true);
  document.addEventListener("touchstart", onRepoStart, { passive: false, capture: true });
  document.addEventListener("touchmove",  onRepoMove,  { passive: false, capture: true });
  document.addEventListener("touchend",   onRepoEnd, true);
  document.addEventListener("touchcancel",onRepoEnd, true);

  window.addEventListener("click", (e) => {
    if (e.target.id === "filter-modal") closeFilterModal();
    if (e.target.id === "addtree-modal") closeAddTreeModal();
  });

  updateAdminButtons();
}

function updateAdminButtons() {
  const addBtn = document.getElementById("addtree-btn");
  const repoBtn = document.getElementById("reposition-btn");
  if (addBtn)  addBtn.style.display  = isAdmin ? "inline-block" : "none";
  if (repoBtn) repoBtn.style.display = isAdmin ? "inline-block" : "none";
}

window.initMultiTree = initMultiTree;
window.updateAdminButtons = updateAdminButtons;
/*New: multi-tree + filter-nomor-otomatis + escapeHtml-lokal*/
