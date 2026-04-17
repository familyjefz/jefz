let activePath = null;
let activeMode = null;
let currentTreeData = null;
let isRendering = false;

async function loadTree() {
  if (isRendering) return;
  isRendering = true;
  
  try {
    const res = await fetch("data.json?v=" + Date.now());
    const data = await res.json();
    currentTreeData = data;
    render();
  } catch (err) {
    console.error("Gagal load tree:", err);
    isRendering = false;
  }
}

function render() {
  const container = document.getElementById("tree");
  if (!container) return;
  
  // Simpan scroll position SEBELUM render
  const wrapper = document.getElementById("tree-wrapper");
  const savedLeft = wrapper ? wrapper.scrollLeft : 0;
  const savedTop = wrapper ? wrapper.scrollTop : 0;
  
  // Kosongkan container
  container.innerHTML = "";
  
  try {
    new Treant({
      chart: {
        container: "#tree",
        rootOrientation: "NORTH",
        connectors: { type: "step" },
        animateOnInit: false,  // Matikan animasi
        levelSeparation: 40,   // Perkecil jarak vertikal (dari 80 jadi 40)
        siblingSeparation: 30,  // Perkecil jarak horizontal (dari 50 jadi 30)
        subTeeSeparation: 30,
        nodeAlign: "CENTER",
        scrollbar: "none"  // Matikan scrollbar bawaan Treant
      },
      nodeStructure: convert(currentTreeData)
    });
    
    // Restore scroll position TANPA perubahan posisi
    setTimeout(() => {
      if (wrapper) {
        wrapper.scrollLeft = savedLeft;
        wrapper.scrollTop = savedTop;
      }
      isRendering = false;
    }, 20);
    
  } catch (err) {
    console.error("Treant error:", err);
    isRendering = false;
  }
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
      placeholder = "Masukkan nomor urutan (0 = pertama)";
    }
    
    content = `
      <div class="node-box active-node">
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
  
  else if (isActive(path)) {
    content = `
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
    content = `
      <div class="node-box">
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

function getCurrentScroll() {
  const wrapper = document.getElementById("tree-wrapper");
  return {
    left: wrapper ? wrapper.scrollLeft : 0,
    top: wrapper ? wrapper.scrollTop : 0
  };
}

function restoreScroll(left, top) {
  const wrapper = document.getElementById("tree-wrapper");
  if (wrapper) {
    wrapper.scrollLeft = left;
    wrapper.scrollTop = top;
  }
}

function openOptions(path) {
  const scroll = getCurrentScroll();
  activePath = path;
  activeMode = null;
  render();
  restoreScroll(scroll.left, scroll.top);
}

function setMode(path, mode) {
  const scroll = getCurrentScroll();
  activePath = path;
  activeMode = mode;
  render();
  restoreScroll(scroll.left, scroll.top);
}

function cancelInline() {
  const scroll = getCurrentScroll();
  activePath = null;
  activeMode = null;
  render();
  restoreScroll(scroll.left, scroll.top);
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
    action = "reorder";
    bodyData = { action, path, position: newIndex };
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

// Klik luar
document.addEventListener("click", (e) => {
  const isButton = e.target.closest("button");
  const isInput = e.target.tagName === "INPUT";
  
  if (!e.target.closest(".node-box") && !isButton && !isInput) {
    const scroll = getCurrentScroll();
    activePath = null;
    activeMode = null;
    render();
    restoreScroll(scroll.left, scroll.top);
  }
});

loadTree();
