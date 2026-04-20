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

// ========== APPLY TRANSFORM ==========
function applyTransform() {
  const el = getContainer();
  if (!el) return;
  el.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${scale})`;
  el.style.transformOrigin = "0 0";
}

// ========== ZOOM FUNCTION ==========
function setZoom(zoom, centerX = null, centerY = null) {
  // Batasi zoom 30% - 300% (diperbesar)
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
  
  if (el) {
    el.style.display = 'none';
    el.offsetHeight;
    el.style.display = '';
  }
  
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

// ========== ZOOM RESET - CENTER TREE ==========
function zoomReset() {
  scale = 1;
  currentZoom = 1;
  
  const wrapper = getWrapper();
  const container = getContainer();
  
  if (wrapper && container) {
    // Dapatkan ukuran viewport
    const wrapperRect = wrapper.getBoundingClientRect();
    
    // Dapatkan ukuran konten tree
    const treeElement = document.getElementById("tree");
    const treeWidth = treeElement ? treeElement.offsetWidth : 2000;
    const treeHeight = treeElement ? treeElement.offsetHeight : 1500;
    
    // Hitung offset agar tree berada di tengah viewport
    // Posisi center tree = treeWidth/2, treeHeight/2
    // Posisi center viewport = wrapperRect.width/2, wrapperRect.height/2
    offsetX = (wrapperRect.width / 2) - (treeWidth / 2);
    offsetY = (wrapperRect.height / 2) - (treeHeight / 2);
    
    // Jika tree lebih kecil dari viewport, posisikan di tengah
    // Jika lebih besar, posisikan agar kiri-atas terlihat
    if (treeWidth < wrapperRect.width) {
      offsetX = (wrapperRect.width - treeWidth) / 2;
    } else {
      offsetX = 0;
    }
    
    if (treeHeight < wrapperRect.height) {
      offsetY = (wrapperRect.height - treeHeight) / 2;
    } else {
      offsetY = 0;
    }
  } else {
    offsetX = 0;
    offsetY = 0;
  }
  
  applyTransform();
  updateZoomUI(100);
  
  const slider = document.getElementById("zoom-slider");
  if (slider) slider.value = 100;
}

// ========== DRAG PAN ==========
function startDrag(e) {
  if (e.target.closest("button") || 
      e.target.closest("textarea") || 
      e.target.closest(".node-box") ||
      e.target.closest("input") ||
      e.target.closest(".zoom-slider")) {
    return;
  }
  
  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;
  startOffsetX = offsetX;
  startOffsetY = offsetY;
  e.preventDefault();
}

function moveDrag(e) {
  if (!isDragging) return;
  offsetX = startOffsetX + (e.clientX - startX);
  offsetY = startOffsetY + (e.clientY - startY);
  applyTransform();
}

function endDrag() {
  isDragging = false;
}

// ========== PINCH ZOOM ==========
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
      target.closest(".node-box") ||
      target.closest("input") ||
      target.closest(".zoom-slider")
    )) {
      return;
    }
    
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
/*Stable*/
