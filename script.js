let activePath = null;
let activeMode = null;
let currentTreeData = null;
let isFirstLoad = true;

async function loadTree() {
  try {
    const res = await fetch("data.json?v=" + Date.now());
    const data = await res.json();
    currentTreeData = data;
    renderTree();
  } catch (err) {
    console.error("Gagal load tree:", err);
  }
}

function renderTree() {
  const container = document.getElementById("tree");
  if (!container) return;
  
  const wrapper = document.getElementById("tree-wrapper");
  
  // Simpan posisi scroll sebelum render
  const savedLeft = wrapper ? wrapper.scrollLeft : 800;
  const savedTop = wrapper ? wrapper.scrollTop : 400;
  
  container.innerHTML = "";
  
  new Treant({
    chart: {
      container: "#tree",
      rootOrientation: "NORTH",
      connectors: { type: "step" },
      animateOnInit: false,
      levelSeparation: 80,
      siblingSeparation: 60,
      subTeeSeparation: 60
    },
    nodeStructure: convert(currentTreeData)
  });
  
  // Kembalikan posisi scroll setelah render
  setTimeout(() => {
    if (wrapper) {
      if (isFirstLoad) {
        // Pertama kali: scroll ke tengah-tengah tree
        // Tree ada di tengah area 2000x1500
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

function convert(node, path = []) {
  const isActiveNode = isActive(path);
  let innerHTML = "";
  
  if (isActiveNode && activeMode) {
    let inputValue = "";
    let placeholder = "";
    if (activeMode === "edit") { inputValue = node.name; placeholder = "Nama baru"; }
    else if (activeMode === "add") placeholder = "Nama anak baru";
    else if (activeMode === "parent") placeholder = "Nama parent baru";
    else if (activeMode === "order") placeholder = "Urutan (0=pertama)";
    
    innerHTML = `
      <div class="node-box active-node">
        <div class="node-name">${escapeHtml(node.name)}</div>
        <input class="node-input" id="input-${path.join("-")}" 
          placeholder="${placeholder}" value="${escapeHtml(inputValue)}" autofocus />
        <div class="node-actions">
          <button onclick='submitInline(${JSON.stringify(path)})'>✔ Simpan</button>
          <button onclick='cancelInline()'>✖ Batal</button>
        </div>
      </div>
    `;
  }
  else if (isActiveNode) {
    innerHTML = `
      <div class="node-box active-node">
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
    innerHTML = `
      <div class="node-box">
        <div class="node-name">${escapeHtml(node.name)}</div>
        <button class="btn-option" onclick='openOptions(${JSON.stringify(path)})'>⚙️ Option</button>
      </div>
    `;
  }
  
  return {
    innerHTML: innerHTML,
    children: node.children?.map((child, i) => convert(child, [...path, i]))
  };
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
  const scroll = getCurrentScroll();
  activePath = path;
  activeMode = null;
  renderTree();
  restoreScroll(scroll.left, scroll.top);
}

function setMode(path, mode) {
  const scroll = getCurrentScroll();
  activePath = path;
  activeMode = mode;
  renderTree();
  restoreScroll(scroll.left, scroll.top);
}

function cancelInline() {
  const scroll = getCurrentScroll();
  activePath = null;
  activeMode = null;
  renderTree();
  restoreScroll(scroll.left, scroll.top);
}

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
    const res = await fetch("https://jefz.vercel.app/api/update", {
      method: "POST", headers: { "Content-Type": "application/json" },
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
  if (!confirm("Hapus node ini?")) return;
  try {
    const res = await fetch("https://jefz.vercel.app/api/update", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", path })
    });
    const result = await res.json();
    if (result.success) {
      activePath = null; activeMode = null;
      await loadTree();
    } else alert("Gagal hapus");
  } catch (err) { alert("Error: " + err.message); }
}

document.addEventListener("click", (e) => {
  if (!e.target.closest(".node-box") && !e.target.closest("button") && e.target.tagName !== "INPUT") {
    const scroll = getCurrentScroll();
    activePath = null;
    activeMode = null;
    renderTree();
    restoreScroll(scroll.left, scroll.top);
  }
});

loadTree();
