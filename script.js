let activePath = null;
let activeMode = null;
let treantInstance = null;
let scrollPosition = { x: 0, y: 0 };
let isRendering = false;
let renderTimeout = null;

async function loadTree() {
  try {
    const res = await fetch("data.json?v=" + Date.now());
    const data = await res.json();
    window.treeData = data;
    render();
  } catch (err) {
    console.error("Gagal load tree:", err);
  }
}

function saveScrollPosition() {
  const container = document.getElementById("tree");
  if (container) {
    scrollPosition = { x: container.scrollLeft, y: container.scrollTop };
  }
}

function restoreScrollPosition() {
  const container = document.getElementById("tree");
  if (container && (scrollPosition.x !== 0 || scrollPosition.y !== 0)) {
    // Gunakan requestAnimationFrame untuk menghindari flicker
    requestAnimationFrame(() => {
      container.scrollLeft = scrollPosition.x;
      container.scrollTop = scrollPosition.y;
    });
  }
}

function render() {
  // Hindari render ganda
  if (isRendering) return;
  isRendering = true;
  
  const container = document.getElementById("tree");
  if (!container) return;
  
  saveScrollPosition();
  
  // Sembunyikan container sebentar untuk menghindari flicker
  container.style.opacity = "0";
  container.style.transition = "opacity 0.05s";
  
  container.innerHTML = "";
  
  // Gunakan setTimeout untuk memberi waktu DOM update
  setTimeout(() => {
    try {
      treantInstance = new Treant({
        chart: {
          container: "#tree",
          rootOrientation: "NORTH",
          connectors: { type: "step" },
          animateOnInit: false, // Matikan animasi awal
          collision: true
        },
        nodeStructure: convert(window.treeData)
      });
    } catch (err) {
      console.error("Treant error:", err);
    }
    
    // Kembalikan opacity dan scroll
    setTimeout(() => {
      container.style.opacity = "1";
      restoreScrollPosition();
      isRendering = false;
    }, 50);
  }, 10);
}

function isActive(path) {
  if (!activePath) return false;
  return JSON.stringify(path) === JSON.stringify(activePath);
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

function convert(node, path = []) {
  let content = "";

  // INPUT MODE
  if (isActive(path) && activeMode) {
    let inputValue = "";
    let placeholder = "";
    
    if (activeMode === "edit") {
      inputValue = node.name;
      placeholder = "Masukkan nama baru";
    } else if (activeMode === "add") {
      inputValue = "";
      placeholder = "Masukkan nama anak baru";
    } else if (activeMode === "parent") {
      inputValue = "";
      placeholder = "Masukkan nama parent baru";
    } else if (activeMode === "order") {
      inputValue = "";
      placeholder = "Masukkan nomor urutan baru (0 = pertama)";
    }
    
    content = `
      <div class="node-box active-node" data-path='${JSON.stringify(path)}'>
        <div class="node-name">${escapeHtml(node.name)}</div>
        <input class="node-input" id="input-${path.join("-")}" 
          placeholder="${placeholder}"
          value="${escapeHtml(inputValue)}"
          autofocus
        />
        <div class="node-actions">
          <button onclick='submitInline(${JSON.stringify(path)})'>✔ Simpan</button>
          <button onclick='cancelInline()'>✖ Batal</button>
        </div>
      </div>
    `;
  }
  
  // OPTION MODE
  else if (isActive(path)) {
    content = `
      <div class="node-box active-node" data-path='${JSON.stringify(path)}'>
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
  
  // NORMAL MODE
  else {
    content = `
      <div class="node-box" data-path='${JSON.stringify(path)}'>
        <div class="node-name">${escapeHtml(node.name)}</div>
        <button class="btn-option" onclick='openOptions(${JSON.stringify(path)})'>⚙️ Option</button>
      </div>
    `;
  }

  return {
    innerHTML: content,
    children: node.children?.map((c, i) =>
      convert(c, [...path, i])
    )
  };
}

function openOptions(path) {
  activePath = path;
  activeMode = null;
  render();
}

function setMode(path, mode) {
  activePath = path;
  activeMode = mode;
  render();
}

function cancelInline() {
  activePath = null;
  activeMode = null;
  render();
}

async function submitInline(path) {
  const inputEl = document.getElementById("input-" + path.join("-"));
  if (!inputEl) return;
  
  const val = inputEl.value.trim();
  
  if (activeMode !== "order") {
    if (!val) {
      alert("Nama tidak boleh kosong!");
      return;
    }
  }
  
  let action = "";
  let bodyData = {};

  if (activeMode === "add") {
    action = "add";
    bodyData = { action, path, name: val };
  }
  else if (activeMode === "edit") {
    action = "edit";
    bodyData = { action, path, name: val };
  }
  else if (activeMode === "parent") {
    action = "addParent";
    bodyData = { action, path, name: val };
  }
  else if (activeMode === "order") {
    const newIndex = parseInt(val);
    if (isNaN(newIndex)) {
      alert("Masukkan angka untuk urutan!");
      return;
    }
    if (newIndex < 0) {
      alert("Urutan tidak boleh negatif!");
      return;
    }
    action = "reorder";
    bodyData = { action, path, position: newIndex };
  }
  else {
    alert("Mode tidak dikenal");
    return;
  }

  try {
    const response = await fetch("https://jefz.vercel.app/api/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      activePath = null;
      activeMode = null;
      await loadTree();
    } else {
      alert("Gagal: " + (result.error || "Unknown error"));
    }
  } catch (err) {
    alert("Error: " + err.message);
  }
}

async function hapus(path) {
  if (!confirm("Yakin ingin menghapus node ini?")) return;

  try {
    const response = await fetch("https://jefz.vercel.app/api/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "delete",
        path
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      activePath = null;
      activeMode = null;
      await loadTree();
    } else {
      alert("Gagal menghapus: " + (result.error || "Unknown error"));
    }
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// Klik luar untuk menutup menu - tapi jangan trigger saat di input
document.addEventListener("click", (e) => {
  const isInput = e.target.tagName === "INPUT" || e.target.tagName === "BUTTON";
  if (!e.target.closest(".node-box") && !isInput) {
    activePath = null;
    activeMode = null;
    render();
  }
});

// Load awal
loadTree();
