let activePath = null;
let activeMode = null;

let scale = 1;
let posX = 0;
let posY = 0;

let isDragging = false;
let startX, startY;

async function loadTree() {
  const res = await fetch("data.json?v=" + Date.now());
  const data = await res.json();

  window.treeData = data;

  render();
}

function render() {
  const tree = document.getElementById("tree");
  tree.innerHTML = "";

  new Treant({
    chart: {
      container: "#tree",
      rootOrientation: "NORTH",
      connectors: { type: "step" }
    },
    nodeStructure: convert(window.treeData)
  });

  setTimeout(() => {
    applyTransform();
  }, 300);
}

function applyTransform() {
  const tree = document.querySelector("#tree > div");
  if (tree) {
    tree.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
    tree.style.transformOrigin = "0 0";
  }
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

        <input class="node-input" 
          id="input-${path.join("-")}" 
          value="${activeMode==='edit'?node.name:''}"
          placeholder="${activeMode==='order'?'Urutan...':''}"
        />

        <div class="node-actions">
          <button class="btn-save" onclick='submitInline(${JSON.stringify(path)})'>✔</button>
          <button class="btn-cancel" onclick='cancelInline()'>✖</button>
        </div>
      </div>
    `;
  }

  else if (isActive(path)) {
    content = `
      <div class="node-box active-node" data-path='${JSON.stringify(path)}'>
        <div class="node-name">${node.name}</div>

        <div class="node-menu">
          <button onclick='setMode(${JSON.stringify(path)}, "add")'>➕<br>Tambah</button>
          <button onclick='setMode(${JSON.stringify(path)}, "edit")'>✏️<br>Ubah</button>
          <button onclick='hapus(${JSON.stringify(path)})'>❌<br>Hapus</button>
          <button onclick='setMode(${JSON.stringify(path)}, "parent")'>⬆️<br>Atas</button>
          <button onclick='setMode(${JSON.stringify(path)}, "order")'>🔢<br>Urut</button>
        </div>
      </div>
    `;
  }

  else {
    content = `
      <div class="node-box" data-path='${JSON.stringify(path)}'>
        <div class="node-name">${node.name}</div>
        <button class="btn-option" onclick='openOptions(${JSON.stringify(path)})'>⚙️</button>
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

// OPTION + AUTO FOCUS
function openOptions(path) {
  activePath = path;
  activeMode = null;
  render();

  setTimeout(() => focusNode(path), 300);
}

function focusNode(path) {
  const el = document.querySelector(`[data-path='${JSON.stringify(path)}']`);
  if (el) {
    el.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center"
    });
  }
}

// MODE
function setMode(path, mode) {
  activePath = path;
  activeMode = mode;
  render();

  setTimeout(() => focusNode(path), 300);
}

function cancelInline() {
  activePath = null;
  activeMode = null;
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

// HAPUS
async function hapus(path) {
  if (!confirm("Yakin hapus?")) return;

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

// 🔥 CLICK LUAR
document.addEventListener("click", (e) => {
  if (!e.target.closest(".node-box")) {
    activePath = null;
    activeMode = null;
    render();
  }
});

// 🔥 DRAG (PAN)
document.addEventListener("mousedown", (e) => {
  if (e.target.closest(".node-box")) return;

  isDragging = true;
  startX = e.clientX - posX;
  startY = e.clientY - posY;
});

document.addEventListener("mousemove", (e) => {
  if (!isDragging) return;

  posX = e.clientX - startX;
  posY = e.clientY - startY;
  applyTransform();
});

document.addEventListener("mouseup", () => {
  isDragging = false;
});

// 🔥 TOUCH (HP)
document.addEventListener("touchstart", (e) => {
  if (e.touches.length === 1) {
    isDragging = true;
    startX = e.touches[0].clientX - posX;
    startY = e.touches[0].clientY - posY;
  }
});

document.addEventListener("touchmove", (e) => {
  if (!isDragging) return;

  posX = e.touches[0].clientX - startX;
  posY = e.touches[0].clientY - startY;
  applyTransform();
});

document.addEventListener("touchend", () => {
  isDragging = false;
});

// 🔥 ZOOM (scroll)
document.addEventListener("wheel", (e) => {
  e.preventDefault();

  const zoomSpeed = 0.1;
  scale += e.deltaY * -zoomSpeed * 0.01;

  if (scale < 0.5) scale = 0.5;
  if (scale > 2) scale = 2;

  applyTransform();
}, { passive: false });

loadTree();
