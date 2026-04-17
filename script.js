let activePath = null;
let activeMode = null;
let currentTreeData = null;

async function loadTree() {
  try {
    const res = await fetch("data.json?v=" + Date.now());
    const data = await res.json();
    currentTreeData = data;
    render();
  } catch (err) {
    console.error("Gagal load tree:", err);
  }
}

function render() {
  const container = document.getElementById("tree");
  if (!container) return;
  
  // Kosongkan container
  container.innerHTML = "";
  
  // Buat wrapper untuk Treant dengan ukuran minimal yang besar
  const wrapper = document.createElement("div");
  wrapper.id = "treant-wrapper";
  wrapper.style.position = "relative";
  wrapper.style.minWidth = "2500px";
  wrapper.style.minHeight = "1200px";
  container.appendChild(wrapper);
  
  try {
    new Treant({
      chart: {
        container: "#treant-wrapper",
        rootOrientation: "NORTH",
        connectors: { type: "step" },
        animateOnInit: false,
        levelSeparation: 80,
        siblingSeparation: 50,
        subTeeSeparation: 50
      },
      nodeStructure: convert(currentTreeData)
    });
    
    // Scroll ke tengah setelah render
    setTimeout(() => {
      const wrapperEl = document.querySelector(".tree-wrapper");
      if (wrapperEl) {
        wrapperEl.scrollLeft = 800;
        wrapperEl.scrollTop = 400;
      }
    }, 100);
    
  } catch (err) {
    console.error("Treant error:", err);
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
  const wrapper = document.querySelector(".tree-wrapper");
  return {
    left: wrapper ? wrapper.scrollLeft : 800,
    top: wrapper ? wrapper.scrollTop : 400
  };
}

function restoreScroll(left, top) {
  setTimeout(() => {
    const wrapper = document.querySelector(".tree-wrapper");
    if (wrapper) {
      wrapper.scrollLeft = left;
      wrapper.scrollTop = top;
    }
  }, 30);
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
