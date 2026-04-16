let currentAction = null;
let currentPath = [];

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

function convert(node, path = []) {
  return {
    innerHTML: `
      <div>
        ${node.name}<br>
        <button onclick='openMenu(event, ${JSON.stringify(path)})'>⚙️</button>
      </div>
    `,
    children: node.children?.map((child, i) =>
      convert(child, [...path, i])
    )
  };
}

// MENU
function openMenu(e, path) {
  e.stopPropagation();

  currentPath = path;

  const menu = document.getElementById("menu");

  menu.innerHTML = `
    <button onclick="openModal('add')">➕ Tambah Anak</button>
    <button onclick="openModal('edit')">✏️ Ubah</button>
    <button onclick="hapus()">❌ Hapus</button>
    <button onclick="openModal('parent')">⬆️ Tambah Orang Tua</button>
  `;

  menu.style.display = "block";
  menu.style.left = e.pageX + "px";
  menu.style.top = e.pageY + "px";
}

// tutup menu
document.addEventListener("click", () => {
  document.getElementById("menu").style.display = "none";
});

// MODAL
function openModal(action) {
  currentAction = action;

  const modal = document.getElementById("modal");
  const input = document.getElementById("modalInput");

  modal.style.display = "block";

  let target = window.treeData;
  for (let i of currentPath) {
    target = target.children[i];
  }

  if (action === "edit") {
    document.getElementById("modalTitle").innerText = "Ubah Nama";
    input.value = target.name;
  }

  if (action === "add") {
    document.getElementById("modalTitle").innerText = "Tambah Anak";
    input.value = "";
  }

  if (action === "parent") {
    document.getElementById("modalTitle").innerText = "Tambah Orang Tua";
    input.value = "";
  }
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
}

// SUBMIT
async function submitAction() {
  const input = document.getElementById("modalInput").value;
  if (!input) return;

  let actionType = "";

  if (currentAction === "add") actionType = "add";
  if (currentAction === "edit") actionType = "edit";
  if (currentAction === "parent") actionType = "addParent";

  await fetch("https://jefz.vercel.app/api/update", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      action: actionType,
      path: currentPath,
      name: input
    })
  });

  location.reload();
}

// HAPUS
async function hapus() {
  if (!confirm("Yakin hapus?")) return;

  await fetch("https://jefz.vercel.app/api/update", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      action: "delete",
      path: currentPath
    })
  });

  location.reload();
}

loadTree();
