let treeInstance = null;

// load awal saja
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

  setTimeout(bindEvents, 300);
}

// buat node
function convert(node, path = []) {
  return {
    innerHTML: `
      <div class="node-box" data-path='${JSON.stringify(path)}'>
        <div class="node-name">${node.name}</div>
        <button class="btn-option">⚙️ Option</button>
      </div>
    `,
    children: node.children?.map((c, i) =>
      convert(c, [...path, i])
    )
  };
}

// 🔥 pasang event TANPA render ulang
function bindEvents() {
  document.querySelectorAll(".btn-option").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();

      const node = btn.closest(".node-box");
      const path = JSON.parse(node.dataset.path);

      openMenu(node, path);
    };
  });
}

// 🔥 MENU MUNCUL TANPA UBAH TREE
function openMenu(nodeEl, path) {

  closeMenu();

  const menu = document.createElement("div");
  menu.className = "floating-menu";

  menu.innerHTML = `
    <button onclick='action("${JSON.stringify(path)}","add")'>➕ Tambah</button>
    <button onclick='action("${JSON.stringify(path)}","edit")'>✏️ Ubah</button>
    <button onclick='hapus("${JSON.stringify(path)}")'>❌ Hapus</button>
    <button onclick='action("${JSON.stringify(path)}","parent")'>⬆️ Parent</button>
    <button onclick='action("${JSON.stringify(path)}","order")'>🔢 Urut</button>
  `;

  document.body.appendChild(menu);

  // posisi menu dekat node
  const rect = nodeEl.getBoundingClientRect();

  menu.style.top = rect.bottom + "px";
  menu.style.left = rect.left + "px";

  window.activeMenu = menu;
}

// 🔥 ACTION INPUT
function action(pathStr, mode) {
  const path = JSON.parse(pathStr);

  const name = prompt("Input:");

  if (!name) return;

  let action = "";

  if (mode === "add") action = "add";
  if (mode === "edit") action = "edit";
  if (mode === "parent") action = "addParent";
  if (mode === "order") action = "reorder";

  fetch("https://jefz.vercel.app/api/update", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      action,
      path,
      name,
      position: parseInt(name)
    })
  }).then(() => {
    loadTree(); // reload data setelah aksi
  });
}

// hapus
function hapus(pathStr) {
  const path = JSON.parse(pathStr);

  if (!confirm("Hapus?")) return;

  fetch("https://jefz.vercel.app/api/update", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      action: "delete",
      path
    })
  }).then(() => {
    loadTree();
  });
}

// 🔥 tutup menu
function closeMenu() {
  if (window.activeMenu) {
    window.activeMenu.remove();
    window.activeMenu = null;
  }
}


// klik luar
document.addEventListener("click", () => {
  closeMenu();
});

loadTree();
