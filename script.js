let treeInstance = null;
let activePath = null;
let activeMode = null;

async function loadTree() {
  const res = await fetch("data.json?v=" + Date.now());
  const data = await res.json();

  window.treeData = data;

  treeInstance = new Treant({
    chart: {
      container: "#tree",
      rootOrientation: "NORTH",
      connectors: { type: "step" }
    },
    nodeStructure: convert(data)
  });

  setTimeout(bindNodes, 300);
}

function convert(node, path = []) {
  return {
    innerHTML: `
      <div class="node-box" data-path='${JSON.stringify(path)}'>
        <div class="node-name">${node.name}</div>
        <button class="btn-option">⚙️</button>
      </div>
    `,
    children: node.children?.map((c, i) =>
      convert(c, [...path, i])
    )
  };
}

// 🔥 bind semua node sekali saja
function bindNodes() {
  document.querySelectorAll(".node-box").forEach(node => {

    const path = JSON.parse(node.dataset.path);

    node.querySelector(".btn-option").onclick = (e) => {
      e.stopPropagation();
      openMenu(node, path);
    };
  });
}

// 🔥 buka menu TANPA render ulang
function openMenu(nodeEl, path) {

  closeAll();

  activePath = path;

  nodeEl.innerHTML = `
    <div class="node-name">${getNode(path).name}</div>

    <div class="node-menu">
      <button onclick='actionMode("${path}", "add")'>➕ Tambah</button>
      <button onclick='actionMode("${path}", "edit")'>✏️ Ubah</button>
      <button onclick='hapusNode("${path}")'>❌ Hapus</button>
      <button onclick='actionMode("${path}", "parent")'>⬆️ Parent</button>
      <button onclick='actionMode("${path}", "order")'>🔢 Urut</button>
    </div>
  `;
}

// 🔥 mode input
function actionMode(pathStr, mode) {
  const path = JSON.parse(pathStr);
  const node = getNode(path);

  const el = findNodeEl(path);

  el.innerHTML = `
    <div class="node-name">${node.name}</div>

    <input class="node-input" id="input-${path.join("-")}" 
      value="${mode==='edit'?node.name:''}"
    />

    <div class="node-actions">
      <button onclick='submit("${pathStr}", "${mode}")'>✔</button>
      <button onclick='resetNode("${pathStr}")'>✖</button>
    </div>
  `;
}

// 🔥 submit TANPA reload
async function submit(pathStr, mode) {
  const path = JSON.parse(pathStr);
  const val = document.getElementById("input-" + path.join("-")).value;
  if (!val) return;

  let action = "";

  if (mode === "add") action = "add";
  if (mode === "edit") action = "edit";
  if (mode === "parent") action = "addParent";
  if (mode === "order") action = "reorder";

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

  loadTree(); // 🔥 reload data saja (UI tetap smooth)
}

// 🔥 hapus
async function hapusNode(pathStr) {
  const path = JSON.parse(pathStr);

  if (!confirm("Hapus?")) return;

  await fetch("https://jefz.vercel.app/api/update", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      action: "delete",
      path
    })
  });

  loadTree();
}

// 🔥 ambil node data
function getNode(path) {
  let node = window.treeData;
  for (let i of path) node = node.children[i];
  return node;
}

// 🔥 cari element node
function findNodeEl(path) {
  return document.querySelector(`[data-path='${JSON.stringify(path)}']`);
}

// 🔥 reset node UI
function resetNode(pathStr) {
  loadTree();
}

// 🔥 tutup semua menu
function closeAll() {
  loadTree();
}

// klik luar
document.addEventListener("click", () => {
  closeAll();
});

loadTree();
