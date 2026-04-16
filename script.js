let activePath = null;
let activeMode = null;

let scale = 1;
let posX = 0;
let posY = 0;

let dragging = false;
let startX, startY;

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

  setTimeout(applyTransform, 300);
}

function applyTransform() {
  const el = document.querySelector("#tree > div");
  if (el) {
    el.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
    el.style.transformOrigin = "0 0";
  }
}

function isActive(path) {
  return JSON.stringify(path) === JSON.stringify(activePath);
}

function convert(node, path = []) {

  let content = "";

  if (isActive(path) && activeMode) {
    content = `
      <div class="node-box active-node">
        <div class="node-name">${node.name}</div>

        <input class="node-input" id="input-${path.join("-")}" />

        <div class="node-actions">
          <button class="btn-save" onclick='submit(path=${JSON.stringify(path)})'>✔</button>
          <button class="btn-cancel" onclick='cancel()'>✖</button>
        </div>
      </div>
    `;
  }

  else if (isActive(path)) {
    content = `
      <div class="node-box active-node">
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
      <div class="node-box">
        <div class="node-name">${node.name}</div>
        <button class="btn-option" onclick='open(${JSON.stringify(path)})'>⚙️ Option</button>
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

/* ========== OPTION ========== */

function open(path) {
  activePath = path;
  activeMode = null;
  render();
  setTimeout(() => focus(path), 300);
}

function setMode(path, mode) {
  activePath = path;
  activeMode = mode;
  render();
  setTimeout(() => focus(path), 300);
}

function cancel() {
  activePath = null;
  activeMode = null;
  render();
}

/* ========== SUBMIT ========== */

async function submit(path) {
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

/* ========== DELETE ========== */

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

/* ========== ZOOM + PAN ========== */

document.addEventListener("mousedown", (e) => {
  if (e.target.closest(".node-box")) return;

  dragging = true;
  startX = e.clientX - posX;
  startY = e.clientY - posY;
});

document.addEventListener("mousemove", (e) => {
  if (!dragging) return;

  posX = e.clientX - startX;
  posY = e.clientY - startY;
  applyTransform();
});

document.addEventListener("mouseup", () => dragging = false);

/* touch */
document.addEventListener("touchstart", (e) => {
  if (e.touches.length !== 1) return;

  dragging = true;
  startX = e.touches[0].clientX - posX;
  startY = e.touches[0].clientY - posY;
});

document.addEventListener("touchmove", (e) => {
  if (!dragging) return;

  posX = e.touches[0].clientX - startX;
  posY = e.touches[0].clientY - startY;
  applyTransform();
});

document.addEventListener("touchend", () => dragging = false);

/* zoom */
document.addEventListener("wheel", (e) => {
  e.preventDefault();

  scale += e.deltaY * -0.001;

  if (scale < 0.5) scale = 0.5;
  if (scale > 2) scale = 2;

  applyTransform();
}, { passive: false });

/* klik luar */
document.addEventListener("click", (e) => {
  if (!e.target.closest(".node-box")) {
    activePath = null;
    activeMode = null;
    render();
  }
});

loadTree();
