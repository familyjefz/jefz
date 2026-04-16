let activePath = null;

let scale = 1;
let posX = 0;
let posY = 0;

let isDragging = false;
let startX, startY;

async function loadTree() {
  const res = await fetch("data.json?v=" + Date.now());
  window.treeData = await res.json();

  render();
}

function render() {
  const tree = document.getElementById("tree");
  tree.innerHTML = "";

  new Treant({
    chart: {
      container: "#tree",
      rootOrientation: "NORTH",
      connectors: { type: "step" },
      node: {
        HTMLclass: "node-box"
      }
    },
    nodeStructure: convert(window.treeData)
  });

  setTimeout(applyTransform, 200);
}

/* 🔥 FIX: transform harus ke container, bukan child tunggal */
function applyTransform() {
  const tree = document.getElementById("tree");
  tree.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
  tree.style.transformOrigin = "0 0";
}

/* cek active */
function isActive(path) {
  return JSON.stringify(path) === JSON.stringify(activePath);
}

/* convert tree */
function convert(node, path = []) {
  return {
    innerHTML: `
      <div class="node-box ${isActive(path) ? "active-node" : ""}"
           data-path='${JSON.stringify(path)}'>
        <div class="node-name">${node.name}</div>

        <button onclick='openNode(${JSON.stringify(path)})'>
          ⚙️
        </button>
      </div>
    `,
    children: node.children?.map((c, i) =>
      convert(c, [...path, i])
    ) || []
  };
}

/* klik node */
function openNode(path) {
  activePath = path;
  render();
}

/* ================= PAN ================= */

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

/* ================= TOUCH ================= */

document.addEventListener("touchstart", (e) => {
  if (e.touches.length !== 1) return;

  isDragging = true;
  startX = e.touches[0].clientX - posX;
  startY = e.touches[0].clientY - posY;
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

/* ================= ZOOM ================= */

document.addEventListener("wheel", (e) => {
  e.preventDefault();

  scale += e.deltaY * -0.001;

  if (scale < 0.5) scale = 0.5;
  if (scale > 2) scale = 2;

  applyTransform();
}, { passive: false });

loadTree();
