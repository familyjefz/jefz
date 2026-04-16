let activePath = null;
let activeMode = null;

async function loadTree() {
  const res = await fetch("data.json?v=" + Date.now());
  const data = await res.json();

  window.treeData = data;

  render();
}

function render() {
  new Treant({
    chart: {
      container: "#tree",
      rootOrientation: "NORTH",
      connectors: { type: "step" }
    },
    nodeStructure: convert(window.treeData)
  });
}

function isActive(path) {
  return JSON.stringify(path) === JSON.stringify(activePath);
}

function convert(node, path = []) {

  let content = "";

  // MODE INPUT
  if (isActive(path) && activeMode) {
    content = `
      <div>
        <input id="input-${path.join("-")}" 
          value="${activeMode==='edit'?node.name:''}" 
          placeholder="${activeMode==='order'?'Masukkan urutan (0,1,2...)':''}"
        />
        <br>
        <button onclick='submitInline(${JSON.stringify(path)})'>✔</button>
        <button onclick='cancelInline()'>❌</button>
      </div>
    `;
  }

  // MODE MENU
  else if (isActive(path)) {
    content = `
      <div>
        ${node.name}<br>
        <button onclick='setMode(${JSON.stringify(path)}, "add")'>➕</button>
        <button onclick='setMode(${JSON.stringify(path)}, "edit")'>✏️</button>
        <button onclick='hapus(${JSON.stringify(path)})'>❌</button>
        <button onclick='setMode(${JSON.stringify(path)}, "parent")'>⬆️</button>
        <button onclick='setMode(${JSON.stringify(path)}, "order")'>🔢</button>
      </div>
    `;
  }

  // NORMAL
  else {
    content = `
      <div>
        ${node.name}<br>
        <button onclick='openOptions(${JSON.stringify(path)})'>⚙️</button>
      </div>
    `;
  }

  return {
    innerHTML: content,
    children: node.children?.map((child, i) =>
      convert(child, [...path, i])
    )
  };
}

// buka menu
function openOptions(path) {
  activePath = path;
  activeMode = null;
  render();
}

// set mode
function setMode(path, mode) {
  activePath = path;
  activeMode = mode;
  render();
}

// cancel
function cancelInline() {
  activePath = null;
  activeMode = null;
  render();
}

// submit
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
      action: action,
      path: path,
      name: val,
      position: parseInt(val)
    })
  });

  location.reload();
}

// hapus
async function hapus(path) {
  if (!confirm("Yakin hapus?")) return;

  await fetch("https://jefz.vercel.app/api/update", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      action: "delete",
      path: path
    })
  });

  location.reload();
}

// 🔥 UNDO
async function undo() {
  await fetch("https://jefz.vercel.app/api/update", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      action: "undo"
    })
  });

  location.reload();
}

loadTree();
