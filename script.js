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

  requestAnimationFrame(applyTransform);
}

/* 🔥 FIX SMOOTH TRANSFORM */
function applyTransform() {
  const wrapper = document.getElementById("tree-wrapper");

  wrapper.style.transform = `translate3d(${posX}px, ${posY}px, 0) scale(${scale})`;
  wrapper.style.transition = isDragging ? "none" : "transform 0.2s ease-out";
}

/* ACTIVE CHECK */
function isActive(path) {
  return JSON.stringify(path) === JSON.stringify(activePath);
}

/* NODE BUILD */
function convert(node, path = []) {
  return {
    innerHTML: `
      <div class="node-box ${isActive(path) ? "active-node" : ""}">
        <div class="node-name">${node.name}</div>
        <button onclick="openOptions('${JSON.stringify(path)}')">⚙️ Option</button>
      </div>
    `,
    children: node.children?.map((c, i) =>
      convert(c, [...path, i])
    ) || []
  };
}

/* 🔥 FIX OPTION BUTTON */
window.openOptions = function(pathStr) {
  const path = JSON.parse(pathStr);

  activePath = path;

  render();
}

/* ================= PAN ================= */

document.addEventListener("mousedown", (e) => {
  if (e.target.closest("button")) return;

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
  applyTransform();
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

  const zoomIntensity = 0.001;

  scale += e.deltaY * -zoomIntensity;

  if (scale < 0.5) scale = 0.5;
  if (scale > 2) scale = 2;

  applyTransform();
}, { passive: false });

loadTree();
