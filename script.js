let activePath = null;
let activeMode = null;

async function loadTree() {
  const res = await fetch("data.json?v=" + Date.now());
  const data = await res.json();

  window.treeData = data;

  new Treant({
    chart: {
      container: "#tree",
      rootOrientation: "NORTH",
      connectors: { type: "step" }
    },
    nodeStructure: convert(data)
  });
}

function isActive(path) {
  return JSON.stringify(path) === JSON.stringify(activePath);
}

function convert(node, path = []) {
  let content = "";

  // 🔥 MODE EDIT / ADD
  if (isActive(path) && activeMode) {
    content = `
      <div>
        <input id="input-${path.join("-")}" value="${node.name || ""}" />
        <br>
        <button onclick='submitInline(${JSON.stringify(path)})'>✔</button>
        <button onclick='cancelInline()'>❌</button>
      </div>
    `;
  }

  // 🔥 MODE MENU
  else if (isActive(path)) {
    content = `
      <div>
        ${node.name}<br>
        <button onclick='setMode(${JSON.stringify(path)}, "add")'>➕</button>
        <button onclick='setMode(${JSON.stringify(path)}, "edit")'>✏️</button>
        <button onclick='hapus(${JSON.stringify(path)})'>❌</button>
        <button onclick='setMode(${JSON.stringify(path)}, "parent")'>⬆️</button>
      </div>
    `;
  }

  // 🔥 NORMAL
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
  reload();
}

// set mode (add/edit/parent)
function setMode(path, mode) {
  activePath = path;
  activeMode = mode;
  reload();
}

// cancel
function cancelInline() {
  activePath = null;
  activeMode = null;
  reload();
}

// reload tanpa fetch ulang
function reload() {
  new Treant({
    chart: {
      container: "#tree",
      rootOrientation: "NORTH",
      connectors: { type: "step" }
    },
    nodeStructure: convert(window.treeData)
  });
}

// submit inline
async function submitInline(path) {
  const input = document.getElementById("input-" + path.join("-")).value;
  if (!input) return;

  let action = "";

  if (activeMode === "add") action = "add";
  if (activeMode === "edit") action = "edit";
  if (activeMode === "parent") action = "addParent";

  await fetch("https://jefz.vercel.app/api/update", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      action: action,
      path: path,
      name: input
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

loadTree();
