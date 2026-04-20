// ========== STATE ZOOM & PAN ==========
let scale = 1;
let offsetX = 0;
let offsetY = 0;

let isDragging = false;
let startX = 0;
let startY = 0;
let startOffsetX = 0;
let startOffsetY = 0;

let isPinching = false;
let startDist = 0;
let startScale = 1;

// ========== ELEMENT REFERENCES ==========
const getContainer = () => document.getElementById("tree-zoom-container");
const getWrapper = () => document.getElementById("tree-wrapper");

// ========== APPLY TRANSFORM (SMOOTH) ==========
function applyTransform() {
  const el = getContainer();
  if (!el) return;
  el.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
  el.style.transformOrigin = "0 0";
}

// ========== ZOOM FUNCTION (SMOOTH) ==========
function setZoom(zoom, centerX = null, centerY = null) {
  zoom = Math.max(30, Math.min(300, zoom));
  
  const newScale = zoom / 100;
  const el = getContainer();
  if (!el) return;
  
  if (centerX === null || centerY === null) {
    centerX = window.innerWidth / 2;
    centerY = window.innerHeight / 2;
  }
  
  const rect = el.getBoundingClientRect();
  const dx = centerX - rect.left;
  const dy = centerY - rect.top;
  
  offsetX -= dx * (newScale / scale - 1);
  offsetY -= dy * (newScale / scale - 1);
  
  scale = newScale;
  applyTransform();
  
  updateZoomUI(zoom);
  currentZoom = newScale;
}

function updateZoomUI(zoom) {
  const zoomValue = document.getElementById("zoom-value");
  if (zoomValue) zoomValue.textContent = Math.round(zoom) + "%";
  
  const slider = document.getElementById("zoom-slider");
  if (slider && slider.value != zoom) slider.value = zoom;
}

function updateZoomFromSlider(e) {
  setZoom(parseInt(e.target.value));
}

function zoomReset() {
  scale = 1;
  offsetX = 0;
  offsetY = 0;
  currentZoom = 1;
  
  applyTransform();
  updateZoomUI(100);
  document.getElementById("zoom-slider").value = 100;
}

// ========== DRAG PAN (PERBAIKI TIDAK RESPON) ==========
function startDrag(e) {
  // Cek target dengan lebih longgar
  const target = e.target;
  
  // Jangan drag jika klik pada elemen interaktif
  if (target.closest("button") || 
      target.closest("textarea") || 
      target.closest("input") ||
      target.closest("select") ||
      target.closest(".node-box") ||
      target.closest(".modal") ||
      target.closest(".custom-popup") ||
      target.closest(".zoom-slider")) {
    return;
  }
  
  // Cek apakah klik di dalam tree-wrapper
  const wrapper = getWrapper();
  if (!wrapper || !wrapper.contains(target)) return;
  
  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;
  startOffsetX = offsetX;
  startOffsetY = offsetY;
  
  e.preventDefault();
  e.stopPropagation();
}

function moveDrag(e) {
  if (!isDragging) return;
  
  offsetX = startOffsetX + (e.clientX - startX);
  offsetY = startOffsetY + (e.clientY - startY);
  
  applyTransform();
  
  e.preventDefault();
}

function endDrag(e) {
  if (isDragging) {
    isDragging = false;
    e.preventDefault();
  }
}

// ========== PINCH ZOOM (SMOOTH) ==========
function getDist(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function touchStart(e) {
  if (e.touches.length === 2) {
    isPinching = true;
    startDist = getDist(e.touches);
    startScale = scale;
    e.preventDefault();
  } else if (e.touches.length === 1) {
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (target && (
      target.closest("button") || 
      target.closest("textarea") || 
      target.closest("input") ||
      target.closest(".node-box") ||
      target.closest(".zoom-slider")
    )) {
      return;
    }
    
    const wrapper = getWrapper();
    if (!wrapper || !wrapper.contains(target)) return;
    
    isDragging = true;
    startX = touch.clientX;
    startY = touch.clientY;
    startOffsetX = offsetX;
    startOffsetY = offsetY;
  }
}

function touchMove(e) {
  if (isPinching && e.touches.length === 2) {
    e.preventDefault();
    const dist = getDist(e.touches);
    const factor = dist / startDist;
    const zoom = (startScale * factor) * 100;
    const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    setZoom(zoom, centerX, centerY);
  } else if (isDragging && e.touches.length === 1) {
    e.preventDefault();
    offsetX = startOffsetX + (e.touches[0].clientX - startX);
    offsetY = startOffsetY + (e.touches[0].clientY - startY);
    applyTransform();
  }
}

function touchEnd(e) {
  if (e.touches.length < 2) isPinching = false;
  if (e.touches.length === 0) isDragging = false;
}

// ========== PASTIKAN DRAG BERHENTI SAAT MOUSE KELUAR ==========
document.addEventListener("mouseleave", () => {
  if (isDragging) isDragging = false;
});
/*Stable*/
