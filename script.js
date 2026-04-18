let activePath = null, activeMode = null, currentTreeData = null, isFirstLoad = true, currentZoom = 1;

// ⚠️ GANTI DENGAN DATA DARI SUPABASE ANDA ⚠️
const SUPABASE_URL = "https://btyrorlzdyisuvnwmrqp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0eXJvcmx6ZHlpc3V2bndtcnFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MDM5NjIsImV4cCI6MjA5MjA3OTk2Mn0.ZkXEOkE6KRZlN0YW1usfu7bDff6GlFp50Jru3h9NkKQ"; // GANTI!

function getGenerationColor(g) { return `hsl(${(g * 37) % 360}, 75%, 65%)`; }

async function loadTree() {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/get-tree`, {
      headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
    });
    currentTreeData = await res.json();
    renderTree();
  } catch (err) { alert("Gagal memuat data"); }
}

function renderTree() {
  const container = document.getElementById("tree"), wrapper = document.getElementById("tree-wrapper");
  const savedLeft = wrapper ? wrapper.scrollLeft : 800, savedTop = wrapper ? wrapper.scrollTop : 400;
  container.innerHTML = "";
  new Treant({
    chart: { container: "#tree", rootOrientation: "NORTH", connectors: { type: "step" }, animateOnInit: false, levelSeparation: 12, siblingSeparation: 8, subTeeSeparation: 8 },
    nodeStructure: convert(currentTreeData, [], 1)
  });
  setTimeout(() => { if (wrapper) { if (isFirstLoad) { wrapper.scrollLeft = 800; wrapper.scrollTop = 400; isFirstLoad = false; } else { wrapper.scrollLeft = savedLeft; wrapper.scrollTop = savedTop; } } }, 100);
}

function convert(node, path = [], generation = 1) {
  const isActiveNode = activePath && JSON.stringify(path) === JSON.stringify(activePath);
  const genColor = getGenerationColor(generation);
  let innerHTML = "";
  if (isActiveNode && activeMode) {
    let inputValue = "", placeholder = "";
    if (activeMode === "edit") { inputValue = node.name; placeholder = "Nama baru"; }
    else if (activeMode === "add") placeholder = "Nama anak baru";
    else if (activeMode === "parent") placeholder = "Nama parent baru";
    else if (activeMode === "order") placeholder = "Urutan (0=pertama)";
    innerHTML = `<div class="node-box active-node" style="border-left:4px solid ${genColor}"><div class="node-name">${escapeHtml(node.name)}</div><input class="node-input" id="input-${path.join("-")}" placeholder="${placeholder}" value="${escapeHtml(inputValue)}" autofocus /><div class="node-actions"><button onclick='submitInline(${JSON.stringify(path)})'>✔</button><button onclick='cancelInline()'>✖</button></div></div>`;
  } else if (isActiveNode) {
    innerHTML = `<div class="node-box active-node" style="border-left:4px solid ${genColor}"><div class="node-name">${escapeHtml(node.name)}</div><div class="node-menu"><button onclick='setMode(${JSON.stringify(path)},"add")'>➕ Anak</button><button onclick='setMode(${JSON.stringify(path)},"edit")'>✏️ Ubah</button><button onclick='hapus(${JSON.stringify(path)})'>❌ Hapus</button><button onclick='setMode(${JSON.stringify(path)},"parent")'>⬆️ Parent</button><button onclick='setMode(${JSON.stringify(path)},"order")'>🔢 Urut</button></div></div>`;
  } else {
    innerHTML = `<div class="node-box" style="border-left:4px solid ${genColor}"><div class="node-name">${escapeHtml(node.name)}</div><button class="btn-option" onclick='openOptions(${JSON.stringify(path)})'>⚙️</button></div>`;
  }
  return { innerHTML, children: node.children?.map((c, i) => convert(c, [...path, i], generation + 1)) };
}

function escapeHtml(s) { if (!s) return ""; return s.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m])); }
function getCurrentScroll() { const w = document.getElementById("tree-wrapper"); return { left: w ? w.scrollLeft : 800, top: w ? w.scrollTop : 400 }; }
function restoreScroll(l, t) { const w = document.getElementById("tree-wrapper"); if (w) setTimeout(() => { w.scrollLeft = l; w.scrollTop = t; }, 50); }
function openOptions(p) { const s = getCurrentScroll(); activePath = p; activeMode = null; renderTree(); restoreScroll(s.left, s.top); }
function setMode(p, m) { const s = getCurrentScroll(); activePath = p; activeMode = m; renderTree(); restoreScroll(s.left, s.top); }
function cancelInline() { const s = getCurrentScroll(); activePath = null; activeMode = null; renderTree(); restoreScroll(s.left, s.top); }

async function submitInline(path) {
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
    const res = await fetch(`${SUPABASE_URL}/functions/v1/update-tree`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}` }, body: JSON.stringify({ action, ...body }) });
    const result = await res.json();
    if (result.success) { activePath = null; activeMode = null; await loadTree(); } else alert("Gagal: " + (result.error || "Error"));
  } catch (err) { alert("Error: " + err.message); }
}

async function hapus(path) {
  if (!confirm("Hapus node ini?")) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/update-tree`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}` }, body: JSON.stringify({ action: "delete", path }) });
    const result = await res.json();
    if (result.success) { activePath = null; activeMode = null; await loadTree(); } else alert("Gagal hapus");
  } catch (err) { alert("Error: " + err.message); }
}

function setZoom(z) { currentZoom = z; const c = document.getElementById("tree-zoom-container"); if (c) c.style.transform = `scale(${currentZoom})`; }
function zoomIn() { setZoom(currentZoom + 0.1); }
function zoomOut() { setZoom(currentZoom - 0.1); }
function zoomReset() { setZoom(1); }

document.addEventListener("click", (e) => {
  if (!e.target.closest(".node-box") && !e.target.closest("button") && e.target.tagName !== "INPUT") {
    const s = getCurrentScroll();
    activePath = null; activeMode = null;
    renderTree();
    restoreScroll(s.left, s.top);
  }
});
document.getElementById("zoom-in")?.addEventListener("click", zoomIn);
document.getElementById("zoom-out")?.addEventListener("click", zoomOut);
document.getElementById("zoom-reset")?.addEventListener("click", zoomReset);
loadTree();
