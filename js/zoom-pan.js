// ========== ZOOM & PAN ==========
let scale = 1.0;
let isDragging = false;
let startX = 0, startY = 0;
let scrollLeftStart = 0, scrollTopStart = 0;
let repositionMode = false;

const MIN_SCALE = 0.3;
const MAX_SCALE = 3.0;

function saveViewState() {
  try {
    const wrapper = document.getElementById("tree-wrapper");
    const container = document.getElementById("tree-zoom-container");
    if (wrapper && container) {
      const state = {
        scale: scale,
        scrollLeft: wrapper.scrollLeft,
        scrollTop: wrapper.scrollTop
      };
      localStorage.setItem("silsilah_view", JSON.stringify(state));
    }
  } catch (e) {}
}

function loadViewState() {
  try {
    const saved = localStorage.getItem("silsilah_view");
    if (saved) {
      const state = JSON.parse(saved);
      const wrapper = document.getElementById("tree-wrapper");
      const container = document.getElementById("tree-zoom-container");
      if (wrapper && container) {
        if (state.scale) {
          scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, state.scale));
          container.style.transform = `scale(${scale})`;
          const slider = document.getElementById("zoom-slider");
          const valSpan = document.getElementById("zoom-value");
          if (slider) slider.value = Math.round(scale * 100);
          if (valSpan) valSpan.textContent = Math.round(scale * 100) + "%";
          currentZoom = scale;
        }
        if (state.scrollLeft !== undefined) wrapper.scrollLeft = state.scrollLeft;
        if (state.scrollTop !== undefined) wrapper.scrollTop = state.scrollTop;
      }
    } else {
      // Tidak ada state tersimpan → center ke main tree
      if (typeof centerOnMainTree === "function") {
        setTimeout(() => centerOnMainTree(), 150);
      }
    }
  } catch (e) {
    // Fallback centering
    if (typeof centerOnMainTree === "function") {
      setTimeout(() => centerOnMainTree(), 150);
    }
  }
}

function updateZoomFromSlider() {
  const slider = document.getElementById("zoom-slider");
  const valSpan = document.getElementById("zoom-value");
  const container = document.getElementById("tree-zoom-container");
  if (!slider || !container) return;

  const percent = parseInt(slider.value);
  scale = percent / 100;
  scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
  currentZoom = scale;

  container.style.transform = `scale(${scale})`;
  if (valSpan) valSpan.textContent = percent + "%";

  saveViewState();

  setTimeout(() => {
    if (typeof drawManualLinks === "function") drawManualLinks();
  }, 20);
}

function zoomReset() {
  const slider = document.getElementById("zoom-slider");
  const valSpan = document.getElementById("zoom-value");
  const container = document.getElementById("tree-zoom-container");
  const wrapper = document.getElementById("tree-wrapper");

  if (!container) return;

  scale = 1.0;
  currentZoom = 1.0;
  container.style.transform = `scale(1)`;

  if (slider) slider.value = "100";
  if (valSpan) valSpan.textContent = "100%";

  if (wrapper && typeof centerOnMainTree === "function") {
    centerOnMainTree();
  }

  saveViewState();

  setTimeout(() => {
    if (typeof drawManualLinks === "function") drawManualLinks();
  }, 20);
}

function startDrag(e) {
  if (repositionMode) return;
  if (e.target.closest(".node-box")) return;
  if (e.target.closest("button")) return;
  if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;

  const wrapper = document.getElementById("tree-wrapper");
  if (!wrapper) return;

  isDragging = true;
  const point = e.touches ? e.touches[0] : e;
  startX = point.clientX;
  startY = point.clientY;
  scrollLeftStart = wrapper.scrollLeft;
  scrollTopStart = wrapper.scrollTop;

  wrapper.style.cursor = "grabbing";
  e.preventDefault();
}

function moveDrag(e) {
  if (!isDragging || repositionMode) return;
  const wrapper = document.getElementById("tree-wrapper");
  if (!wrapper) return;

  const point = e.touches ? e.touches[0] : e;
  const dx = point.clientX - startX;
  const dy = point.clientY - startY;

  wrapper.scrollLeft = scrollLeftStart - dx;
  wrapper.scrollTop = scrollTopStart - dy;

  if (typeof drawManualLinks === "function") drawManualLinks();
}

function endDrag() {
  if (!isDragging) return;
  isDragging = false;
  const wrapper = document.getElementById("tree-wrapper");
  if (wrapper) {
    wrapper.style.cursor = "grab";
    saveViewState();
  }
}

function touchStart(e) {
  if (repositionMode) return;
  if (e.target.closest(".node-box")) return;
  if (e.target.closest("button")) return;
  if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;

  const wrapper = document.getElementById("tree-wrapper");
  if (!wrapper) return;

  isDragging = true;
  const touch = e.touches[0];
  startX = touch.clientX;
  startY = touch.clientY;
  scrollLeftStart = wrapper.scrollLeft;
  scrollTopStart = wrapper.scrollTop;

  e.preventDefault();
}

function touchMove(e) {
  if (!isDragging || repositionMode) return;
  const wrapper = document.getElementById("tree-wrapper");
  if (!wrapper) return;

  const touch = e.touches[0];
  const dx = touch.clientX - startX;
  const dy = touch.clientY - startY;

  wrapper.scrollLeft = scrollLeftStart - dx;
  wrapper.scrollTop = scrollTopStart - dy;

  if (typeof drawManualLinks === "function") drawManualLinks();

  e.preventDefault();
}

function touchEnd(e) {
  if (!isDragging) return;
  isDragging = false;
  const wrapper = document.getElementById("tree-wrapper");
  if (wrapper) {
    saveViewState();
  }
}
