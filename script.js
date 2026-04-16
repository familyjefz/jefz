let scale = 1;
let posX = 0;
let posY = 0;

let dragging = false;
let startX, startY;

let activePath = null;
let activeMode = null;

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

  applyTransform();
}

function applyTransform() {
  const tree = document.getElementById("tree");

  tree.style.transform =
    `translate(${posX}px, ${posY}px) scale(${scale})`;
}

// ===== NODE =====

function convert(node, path = []) {

  return {
    innerHTML: `
      <div class="node-box">
        <div class="node-name">${node.name}</div>
        <button onclick='openMenu(${JSON.stringify(path)})'>⚙️</button>
      </div>
    `,
    children: node.children?.map((c, i) =>
      convert(c, [...path, i])
    )
  };
}

// ===== MENU =====

function openMenu(path) {
  activePath = path;
  alert("Menu aktif (lanjut upgrade UI kalau mau inline)");
}

// ===== ZOOM =====

// scroll zoom
document.addEventListener("wheel", (e) => {
  e.preventDefault();

  const zoomSpeed = 0.001;
  scale -= e.deltaY * zoomSpeed;

  if (scale < 0.5) scale = 0.5;
  if (scale > 2) scale = 2;

  applyTransform();
}, { passive: false });

// ===== PAN (drag kosong) =====

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

document.addEventListener("mouseup", () => {
  dragging = false;
});

// ===== TOUCH =====

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

document.addEventListener("touchend", () => {
  dragging = false;
});

loadTree();
