let activePath = null;
let activeMode = null;

// 🔥 simpan path terakhir untuk fokus
let lastFocusPath = null;

async function loadTree() {
  const res = await fetch("data.json?v=" + Date.now());
  const data = await res.json();

  window.treeData = data;
  render();
}

function render() {
  document.getElementById("tree").innerHTML = "";

  new Treant({
    chart: {
      container: "#tree",
      rootOrientation: "NORTH",
      connectors: { type: "step" }
    },
    nodeStructure: convert(window.treeData)
  });

  // 🔥 setelah render, balikin fokus ke node
  setTimeout(() => {
    if (lastFocusPath) focusNode(lastFocusPath);
  }, 100);
}

function isActive(path) {
  return JSON.stringify(path) === JSON.stringify(activePath);
}

function convert(node, path = []) {

  let content = "";

  if (isActive(path) && activeMode) {
    content = `
      <div class="node-box active-node" data-path='${JSON.stringify(path)}'>
        <div class="node-name">${node.name}</div>

        <input class="node-input" id="input-${path.join("-")}" />

        <div class="node-actions">
          <button onclick='submitInline(${JSON.stringify(path)})'>✔ Simpan</button>
          <button onclick='cancelInline()'>✖ Batal</button>
        </div>
      </div>
    `;
  }

  else if (isActive(path)) {
    content = `
      <div class="node-box active-node" data-path='${JSON.stringify(path)}'>
        <div class="node-name">${node.name}</div>

        <div class="node-menu">
          <button onclick='setMode(${JSON.stringify(path)}, "add")'>➕ Tambah</button>
          <button onclick='setMode(${JSON.stringify(path)}, "edit")'>✏️ Ubah</button>
          <button onclick='hapus(${JSON.stringify(path)})'>❌ Hapus</button>
          <button onclick='setMode(${JSON.stringify(path)}, "parent")'>⬆️ Parent</button>
          <button onclick='setMode(${JSON.stringify(path)}, "order")'>🔢 Urut</button>
        </div>
      </div>
    `;
  }

  else {
    content = `
      <div class="node-box" data-path='${JSON.stringify(path)}'>
        <div class="node-name">${node.name}</div>
        <button onclick='openOptions(${JSON.stringify(path)})'>⚙️ Option</button>
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

// 🔥 FOKUS KE NODE (INI KUNCI)
function focusNode(path) {
  const el = document.querySelector(`[data-path='${JSON.stringify(path)}']`);
  if (el) {
    el.scrollIntoView({
      behavior: "instant", // 🔥 no animasi biar ga terasa geser
      block: "center",
      inline: "center"
    });
  }
}

// OPEN OPTION
function openOptions(path) {
  lastFocusPath = path;

  activePath = path;
  activeMode = null;

  render();
}

// MODE
function setMode(path, mode) {
  lastFocusPath = path;

  activePath = path;
  activeMode = mode;

  render();
}

// CANCEL
function cancelInline() {
  activePath = null;
  activeMode = null;
  lastFocusPath = null;

  render();
}

// SUBMIT
async function submitInline(path) {
  const val = document.getElementById("input-" + path.join("-")).value;
  if (!val) return;

  let action = "";

  if (activeMode === "add") action = "add";
  if (activeMode === "edit") action = "edit";
  if (activeMode === "parent") action = "addParent";
  if (activeMode === "order") action = "reorder";

  await fetch("https://jefz.vercel.app/api/update", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      action,
      path,
      name: val,
      position: parseInt(val)
    })
  });

  location.reload();
}

// DELETE
async function hapus(path) {
  if (!confirm("Hapus?")) return;

  await fetch("https://jefz.vercel.app/api/update", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      action: "delete",
      path
    })
  });

  location.reload();
}

// klik luar
document.addEventListener("click", (e) => {
  if (!e.target.closest(".node-box")) {
    activePath = null;
    activeMode = null;
    lastFocusPath = null;

    render();
  }
});

loadTree();
