// ========== SEARCH ==========
function getAllNodeNames() {
  const results = [];
  function walk(node, treeId, path) {
    if (!node) return;
    const displayName = (node.name || "").split("|")[0].replace(/^>/, "").trim();
    if (displayName) results.push({ name: displayName, fullName: node.name, treeId, path: [...path] });
    if (node.children) node.children.forEach((c, i) => walk(c, treeId, [...path, i]));
  }
  if (typeof currentTreeData !== "undefined" && currentTreeData) walk(currentTreeData, "main", []);
  if (typeof extraTrees !== "undefined") extraTrees.forEach(t => walk(t.data, t.id, []));
  return results;
}

function searchAndGoTo(query) {
  if (!query) return;
  const all = getAllNodeNames();
  const q = query.toLowerCase();
  const match = all.find(n => n.name.toLowerCase() === q)
    || all.find(n => n.name.toLowerCase().startsWith(q))
    || all.find(n => n.name.toLowerCase().includes(q));
  if (!match) { showCustomPopup("Nama tidak ditemukan.", "Pencarian"); return; }
  goToNode(match.treeId, match.path);
  closeSearch();
}

function goToNode(treeId, path) {
  // 1. Buka semua collapse di jalur
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

  // 2. Render ulang
  renderTree();

  // 3. Setelah render, cari posisi node dan center viewport ke sana
  // Gunakan requestAnimationFrame untuk pastikan DOM sudah settle
  const attempts = [80, 180, 350];
  attempts.forEach(delay => {
    setTimeout(() => _centerOnNode(treeId, path), delay);
  });
}

function _centerOnNode(treeId, path) {
  const nodeKey = `${treeId}|${path.join(",")}`;
  const el = document.querySelector(`.node-box[data-node-key="${CSS.escape(nodeKey)}"]`);
  if (!el) return;

  const wrapper = document.getElementById("tree-wrapper");
  if (!wrapper) return;

  // Dapatkan scale dari transform string
  const zc = document.getElementById("tree-zoom-container");
  let sc = 1;
  if (zc && zc.style.transform) {
    const m = zc.style.transform.match(/scale\(([^)]+)\)/);
    if (m) sc = parseFloat(m[1]) || 1;
  }

  // Posisi node relatif ke viewport
  const elRect = el.getBoundingClientRect();
  const wrapRect = wrapper.getBoundingClientRect();

  // Center node di dalam wrapper
  // elRect.left/top = posisi di viewport
  // Kita mau node center = wrapper center
  const wrapCX = wrapRect.left + wrapRect.width  / 2;
  const wrapCY = wrapRect.top  + wrapRect.height / 2;

  const nodeCX = elRect.left + elRect.width  / 2;
  const nodeCY = elRect.top  + elRect.height / 2;

  // Delta yang perlu digeser (dalam pixel viewport)
  const dx = wrapCX - nodeCX;
  const dy = wrapCY - nodeCY;

  // Update offset global (zoom-pan.js)
  offsetX = (offsetX || 0) + dx;
  offsetY = (offsetY || 0) + dy;

  if (typeof applyTransform === "function") applyTransform();
  if (typeof saveViewState === "function") saveViewState();

  // Highlight
  el.style.outline = "3px solid #f44336";
  el.style.outlineOffset = "3px";
  el.style.transition = "outline 0.3s";
  setTimeout(() => {
    el.style.outline = "";
    el.style.outlineOffset = "";
  }, 2500);
}
window.goToNode = goToNode;

function openSearch() {
  const bar = document.getElementById("search-bar");
  if (bar) {
    bar.style.display = "flex";
    setTimeout(() => document.getElementById("search-input")?.focus(), 50);
  }
}
function closeSearch() {
  const bar = document.getElementById("search-bar");
  if (bar) bar.style.display = "none";
  const sug = document.getElementById("search-suggestions");
  if (sug) sug.innerHTML = "";
  const inp = document.getElementById("search-input");
  if (inp) inp.value = "";
}
window.openSearch = openSearch;
window.closeSearch = closeSearch;

function initSearch() {
  const input = document.getElementById("search-input");
  const sug   = document.getElementById("search-suggestions");
  if (!input || !sug) return;

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    sug.innerHTML = "";
    if (!q) return;
    const all = getAllNodeNames();
    const matches = all.filter(n => n.name.toLowerCase().includes(q)).slice(0, 8);
    matches.forEach(m => {
      const li = document.createElement("div");
      li.className = "search-suggestion-item";
      li.textContent = m.name;
      li.addEventListener("mousedown", (e) => {
        // mousedown bukan click agar tidak tertutup blur event
        e.preventDefault();
        input.value = m.name;
        sug.innerHTML = "";
        goToNode(m.treeId, m.path);
        closeSearch();
      });
      sug.appendChild(li);
    });
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); searchAndGoTo(input.value.trim()); }
    if (e.key === "Escape") closeSearch();
  });

  document.getElementById("search-btn-go")?.addEventListener("click", () => {
    searchAndGoTo(input.value.trim());
  });
}
