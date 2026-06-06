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
  // Buka semua collapse di jalur menuju node ini
  function openPath(node, remainPath) {
    if (!node || !remainPath.length) return;
    node._collapsed = false;
    const idx = remainPath[0];
    if (node.children && node.children[idx]) openPath(node.children[idx], remainPath.slice(1));
  }
  const tree = (treeId === "main") ? currentTreeData : (extraTrees.find(t => t.id === treeId) || {}).data;
  if (tree && path.length > 0) openPath(tree, path);

  renderTree();

  // Scroll ke node setelah render
  setTimeout(() => {
    const nodeKey = `${treeId}|${path.join(",")}`;
    const el = document.querySelector(`.node-box[data-node-key="${CSS.escape(nodeKey)}"]`);
    if (!el) return;

    const wrapper = document.getElementById("tree-wrapper");
    const zc = document.getElementById("tree-zoom-container");
    const sc = zc ? (parseFloat(zc.style.transform.match(/scale\(([^)]+)\)/)?.[1]) || 1) : 1;

    const treeRect = document.getElementById("tree").getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    // Posisi node di dalam tree container (unscaled)
    const nodeX = (elRect.left - treeRect.left) / sc;
    const nodeY = (elRect.top  - treeRect.top)  / sc;

    // Set offset agar node center di viewport
    const wrapW = wrapper.clientWidth;
    const wrapH = wrapper.clientHeight;

    // Update offsetX/offsetY (zoom-pan.js globals)
    offsetX = -(nodeX * sc) + wrapW / 2 - (elRect.width / 2);
    offsetY = -(nodeY * sc) + wrapH / 2 - (elRect.height / 2);
    if (typeof applyTransform === "function") applyTransform();
    if (typeof saveViewState === "function") saveViewState();

    // Highlight sebentar
    el.style.outline = "3px solid #f44336";
    el.style.outlineOffset = "2px";
    setTimeout(() => { el.style.outline = ""; el.style.outlineOffset = ""; }, 2000);
  }, 120);
}
window.goToNode = goToNode;

function openSearch() {
  const bar = document.getElementById("search-bar");
  if (bar) { bar.style.display = "flex"; document.getElementById("search-input").focus(); }
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
      li.addEventListener("click", () => {
        input.value = m.name;
        sug.innerHTML = "";
        goToNode(m.treeId, m.path);
        closeSearch();
      });
      sug.appendChild(li);
    });
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") searchAndGoTo(input.value.trim());
    if (e.key === "Escape") closeSearch();
  });

  document.getElementById("search-btn-go")?.addEventListener("click", () => {
    searchAndGoTo(input.value.trim());
  });
}
