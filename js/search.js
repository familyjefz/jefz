// ========== SEARCH ==========
function getAllNodeNames() {
  const results = [];
  function walk(node, treeId, path) {
    if (!node) return;
    const raw = node.name || "";

    // Nama utama (sebelum |), hilangkan prefix >
    const mainName = raw.split("|")[0].replace(/^>/, "").trim();
    // Nama pasangan (setelah |)
    const spousePart = raw.includes("|") ? raw.split("|").slice(1).join("|").trim() : "";
    // Bisa multi-baris, ambil baris pertama saja untuk pasangan
    const spouseName = spousePart.split("\n")[0].trim();

    if (mainName) {
      results.push({ name: mainName, treeId, path: [...path], isSpouse: false });
    }
    if (spouseName) {
      // Pasangan juga bisa dicari, tapi tetap navigate ke node yang sama
      results.push({ name: spouseName, treeId, path: [...path], isSpouse: true });
    }

    if (node.children) node.children.forEach((c, i) => walk(c, treeId, [...path, i]));
  }
  if (typeof currentTreeData !== "undefined" && currentTreeData) walk(currentTreeData, "main", []);
  if (typeof extraTrees !== "undefined") extraTrees.forEach(t => walk(t.data, t.id, []));
  return results;
}

function searchAndGoTo(query) {
  if (!query) return;
  const all = getAllNodeNames();
  const q = query.toLowerCase().trim();
  const match =
    all.find(n => n.name.toLowerCase() === q) ||
    all.find(n => n.name.toLowerCase().startsWith(q)) ||
    all.find(n => n.name.toLowerCase().includes(q));
  if (!match) { showCustomPopup("Nama tidak ditemukan.", "Pencarian"); return; }
  clearSuggestions();
  const inp2 = document.getElementById("search-input");
  if (inp2) { inp2.value = ""; inp2.blur(); }
  goToNode(match.treeId, match.path);
}

function goToNode(treeId, path) {
  // Buka semua collapse di jalur
  function openPath(node, remainPath) {
    if (!node || !remainPath.length) return;
    node._collapsed = false;
    const idx = remainPath[0];
    if (node.children && node.children[idx]) openPath(node.children[idx], remainPath.slice(1));
  }
  const tree = (treeId === "main")
    ? currentTreeData
    : (typeof extraTrees !== "undefined" ? extraTrees.find(t => t.id === treeId) : null)?.data;
  if (tree && path.length > 0) openPath(tree, path);

  renderTree();

  // Center ke node setelah DOM siap — coba 3x dengan delay meningkat
  [80, 200, 400].forEach(d => setTimeout(() => _centerOnNode(treeId, path), d));
}

function _centerOnNode(treeId, path) {
  const nodeKey = `${treeId}|${path.join(",")}`;
  const el = document.querySelector(`.node-box[data-node-key="${CSS.escape(nodeKey)}"]`);
  if (!el) return;

  const wrapper = document.getElementById("tree-wrapper");
  if (!wrapper) return;

  const wrapRect = wrapper.getBoundingClientRect();
  const elRect   = el.getBoundingClientRect();

  // Delta antara center wrapper dan center node di viewport
  const dx = (wrapRect.left + wrapRect.width  / 2) - (elRect.left + elRect.width  / 2);
  const dy = (wrapRect.top  + wrapRect.height / 2) - (elRect.top  + elRect.height / 2);

  offsetX = (offsetX || 0) + dx;
  offsetY = (offsetY || 0) + dy;

  if (typeof applyTransform === "function") applyTransform();
  if (typeof saveViewState  === "function") saveViewState();

  // Highlight
  el.style.outline = "3px solid #f44336";
  el.style.outlineOffset = "3px";
  setTimeout(() => { el.style.outline = ""; el.style.outlineOffset = ""; }, 2500);
}
window.goToNode = goToNode;

function clearSuggestions() {
  const sug = document.getElementById("search-suggestions");
  if (sug) sug.innerHTML = "";
}

function initSearch() {
  const input = document.getElementById("search-input");
  const sug   = document.getElementById("search-suggestions");
  if (!input || !sug) return;

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    sug.innerHTML = "";
    if (!q) return;

    const all = getAllNodeNames();
    // Dedup: satu path satu hasil, prioritas nama utama
    const seen = new Set();
    const matches = [];
    for (const n of all) {
      if (!n.name.toLowerCase().includes(q)) continue;
      const key = `${n.treeId}|${n.path.join(",")}`;
      if (seen.has(key)) continue;
      seen.add(key);
      matches.push(n);
      if (matches.length >= 8) break;
    }

    matches.forEach(m => {
      const li = document.createElement("div");
      li.className = "search-suggestion-item";
      li.textContent = m.name + (m.isSpouse ? " (pasangan)" : "");
      li.addEventListener("mousedown", (e) => {
        e.preventDefault();
        sug.innerHTML = "";
        input.value = "";
        input.blur();
        goToNode(m.treeId, m.path);
      });
      sug.appendChild(li);
    });
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter")  { e.preventDefault(); searchAndGoTo(input.value.trim()); }
    if (e.key === "Escape") { clearSuggestions(); input.blur(); }
  });

  // Tutup suggest saat klik di luar
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".header-search-wrap")) {
      clearSuggestions();
      input.blur();
    }
  });

  document.getElementById("search-btn-go")?.addEventListener("click", () => {
    searchAndGoTo(input.value.trim());
  });
}

// Compat (tidak dipakai lagi tapi jangan error)
function openSearch() {}
function closeSearch() { clearSuggestions(); }
window.openSearch  = openSearch;
window.closeSearch = closeSearch;
