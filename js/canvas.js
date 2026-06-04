// ══════════════════════════════════════════
// canvas.js — Render Engine + Layout
// ══════════════════════════════════════════

import { state, getGenerationColor, isPersonVisible } from './state.js';

// ── Constants ───────────────────────────
const NODE_W        = 160;  // lebar node
const NODE_H        = 44;   // tinggi node
const NODE_BORDER   = 3;    // tebal border
const NODE_RADIUS   = 10;   // radius sudut
const H_GAP         = 40;   // jarak horizontal antar node saudara
const V_GAP_SINGLE  = 60;   // jarak vertikal: pair ke level single anak
const V_GAP_PAIR    = 36;   // jarak vertikal: single ke pair-nya sendiri
const PAIR_OFFSET   = 30;   // jarak horizontal antar multi-pasangan

let canvas, ctx;
let dpr = 1;

// Layout result: { id -> { x, y, type: 'single'|'pair' } }
let layoutMap = {};

// ══════════════════════════════════════════
// INIT
// ══════════════════════════════════════════

export function initCanvas() {
  canvas = document.getElementById('tree-canvas');
  ctx    = canvas.getContext('2d');

  resizeCanvas();
  window.addEventListener('resize', () => { resizeCanvas(); render(); });

  // Pan & zoom
  setupInteraction();
}

function resizeCanvas() {
  dpr           = window.devicePixelRatio || 1;
  const w       = canvas.clientWidth;
  const h       = canvas.clientHeight;
  canvas.width  = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
}

// ══════════════════════════════════════════
// LAYOUT ENGINE
// ══════════════════════════════════════════

export function computeLayout() {
  layoutMap = {};

  // Cari semua "root": person yang tidak punya parent
  const allPersonIds = Object.keys(state.persons).filter(id => isPersonVisible(id));

  const hasParent = new Set();
  Object.values(state.relationships).forEach(r => {
    if (r.type === 'parent') hasParent.add(r.related_id);
  });

  const roots = allPersonIds.filter(id => !hasParent.has(id));

  // Layout per root, susun horizontal dengan offset
  let offsetX = 80;
  for (const rootId of roots) {
    const treeWidth = measureTreeWidth(rootId);
    layoutTree(rootId, offsetX + treeWidth / 2, 80);
    offsetX += treeWidth + H_GAP * 3;
  }
}

// Ukur lebar pohon untuk spacing
function measureTreeWidth(personId, visited = new Set()) {
  if (visited.has(personId)) return NODE_W;
  visited.add(personId);

  const pairs = Object.values(state.pairNodes).filter(
    p => (p.husband_id === personId || p.wife_id === personId)
  );

  // Kumpulkan semua anak dari semua pasangan
  let totalChildWidth = 0;
  for (const pair of pairs) {
    const children = getChildrenOfPair(pair.id);
    const visibleChildren = children.filter(c => isPersonVisible(c));
    if (!visibleChildren.length) continue;
    const childWidths = visibleChildren.map(c => measureTreeWidth(c, visited));
    totalChildWidth += childWidths.reduce((a, b) => a + b, 0) + H_GAP * (visibleChildren.length - 1);
  }

  // Saudara (siblings) dihitung di parent, bukan di sini
  const selfWidth = pairs.length > 1
    ? NODE_W + (pairs.length - 1) * (NODE_W + PAIR_OFFSET)
    : NODE_W;

  return Math.max(selfWidth, totalChildWidth || NODE_W);
}

// Layout rekursif
function layoutTree(personId, cx, y, visited = new Set()) {
  if (visited.has(personId)) return;
  visited.add(personId);

  if (!isPersonVisible(personId)) return;

  // Posisi node single
  layoutMap[personId] = { x: cx, y, type: 'single', personId };

  // Pasangan-pasangan orang ini
  const pairs = Object.values(state.pairNodes).filter(
    p => (p.husband_id === personId || p.wife_id === personId)
  ).sort((a, b) => a.order_num - b.order_num);

  let pairX = cx;
  for (let i = 0; i < pairs.length; i++) {
    const pair    = pairs[i];
    const pairY   = y + NODE_H + V_GAP_PAIR;
    const pairCX  = cx + i * (NODE_W + PAIR_OFFSET);

    // Posisi node pasangan
    layoutMap[pair.id] = { x: pairCX, y: pairY, type: 'pair', pairId: pair.id };

    // Spouse (orang lain dalam pair)
    const spouseId = pair.husband_id === personId ? pair.wife_id : pair.husband_id;
    if (spouseId && isPersonVisible(spouseId) && !layoutMap[spouseId]) {
      layoutMap[spouseId] = { x: pairCX, y, type: 'single', personId: spouseId, isPairedSingle: true };
    }

    // Anak-anak dari pasangan ini
    const children        = getChildrenOfPair(pair.id).filter(c => isPersonVisible(c));
    if (!children.length) continue;

    const childWidths     = children.map(c => measureTreeWidth(c));
    const totalChildWidth = childWidths.reduce((a, b) => a + b, 0) + H_GAP * (children.length - 1);
    let childX            = pairCX - totalChildWidth / 2;

    const childY = pairY + NODE_H + V_GAP_SINGLE;

    for (let j = 0; j < children.length; j++) {
      const childCX = childX + childWidths[j] / 2;
      layoutTree(children[j], childCX, childY, visited);
      childX += childWidths[j] + H_GAP;
    }

    pairX = pairCX;
  }
}

function getChildrenOfPair(pairId) {
  return Object.values(state.relationships)
    .filter(r => r.person_id === pairId && r.type === 'parent')
    .map(r => r.related_id);
}

// ══════════════════════════════════════════
// RENDER
// ══════════════════════════════════════════

export function render() {
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  ctx.clearRect(0, 0, W, H);

  ctx.save();
  ctx.translate(state.viewport.x, state.viewport.y);
  ctx.scale(state.viewport.scale, state.viewport.scale);

  computeLayout();

  // 1. Gambar garis dulu (di bawah node)
  drawAllLines();

  // 2. Gambar node
  drawAllNodes();

  ctx.restore();
}

// ── Draw semua garis ─────────────────────
function drawAllLines() {
  // Garis parent → anak (dari pair node ke single anak)
  Object.values(state.relationships).forEach(rel => {
    if (rel.type !== 'parent') return;
    const from = layoutMap[rel.person_id];  // pair node
    const to   = layoutMap[rel.related_id]; // single anak
    if (!from || !to) return;
    drawBCurve(
      from.x, from.y + NODE_H,
      to.x,   to.y,
      '#c0b9ae', 'solid', 1.5
    );
  });

  // Garis antar multi-pasangan (sambung node pair yang sama orangnya)
  const personPairs = {};
  Object.values(state.pairNodes).forEach(pair => {
    [pair.husband_id, pair.wife_id].forEach(pid => {
      if (!pid) return;
      if (!personPairs[pid]) personPairs[pid] = [];
      personPairs[pid].push(pair);
    });
  });

  Object.entries(personPairs).forEach(([, pairs]) => {
    if (pairs.length < 2) return;
    const sorted = pairs.sort((a, b) => a.order_num - b.order_num);
    for (let i = 0; i < sorted.length - 1; i++) {
      const fromLayout = layoutMap[sorted[i].id];
      const toLayout   = layoutMap[sorted[i + 1].id];
      if (!fromLayout || !toLayout) continue;
      drawStraightLine(
        fromLayout.x + NODE_W / 2, fromLayout.y + NODE_H / 2,
        toLayout.x  - NODE_W / 2, toLayout.y  + NODE_H / 2,
        '#a09080', sorted[i].line_style || 'solid', 1.5
      );
    }
  });
}

// ── Draw semua node ──────────────────────
function drawAllNodes() {
  Object.entries(layoutMap).forEach(([id, pos]) => {
    if (pos.type === 'pair') {
      drawPairNode(id, pos.x, pos.y);
    } else {
      drawSingleNode(id, pos.x, pos.y);
    }
  });

  // Lock dots
  Object.keys(state.locks).forEach(nodeId => {
    const pos = layoutMap[nodeId];
    if (!pos) return;
    drawLockDot(pos.x + NODE_W / 2 - 8, pos.y + 6);
  });
}

// ── Single Node ──────────────────────────
function drawSingleNode(personId, cx, y) {
  const person  = state.persons[personId];
  if (!person) return;

  const x       = cx - NODE_W / 2;
  const color   = getGenerationColor(personId);
  const isSelected = state.selectedNodeId === personId;

  // Shadow kalau selected
  if (isSelected) {
    ctx.shadowColor   = color;
    ctx.shadowBlur    = 12;
  }

  // Background
  roundRect(x, y, NODE_W, NODE_H, NODE_RADIUS);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Border
  ctx.strokeStyle = color;
  ctx.lineWidth   = isSelected ? NODE_BORDER + 1 : NODE_BORDER;
  ctx.stroke();

  ctx.shadowBlur = 0;

  // Nama
  ctx.fillStyle  = '#1a1714';
  ctx.font       = '500 13px "DM Sans", sans-serif';
  ctx.textAlign  = 'center';
  ctx.textBaseline = 'middle';
  const label    = truncate(person.name, 18);
  ctx.fillText(label, cx, y + NODE_H / 2);
}

// ── Pair Node ────────────────────────────
function drawPairNode(pairId, cx, y) {
  const pair    = state.pairNodes[pairId];
  if (!pair) return;

  const husband = state.persons[pair.husband_id];
  const wife    = state.persons[pair.wife_id];
  const x       = cx - NODE_W / 2;
  const isSelected = state.selectedNodeId === pairId;

  const leftColor  = pair.border_color_left  || '#888888';
  const rightColor = pair.border_color_right || '#888888';

  if (isSelected) {
    ctx.shadowColor = leftColor;
    ctx.shadowBlur  = 12;
  }

  // Background
  roundRect(x, y, NODE_W, NODE_H, NODE_RADIUS);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Border gradasi
  const grad = ctx.createLinearGradient(x, y, x + NODE_W, y);
  grad.addColorStop(0,    leftColor);
  grad.addColorStop(0.48, leftColor);
  grad.addColorStop(0.52, rightColor);
  grad.addColorStop(1,    rightColor);

  ctx.strokeStyle = grad;
  ctx.lineWidth   = isSelected ? NODE_BORDER + 1 : NODE_BORDER;
  roundRect(x, y, NODE_W, NODE_H, NODE_RADIUS);
  ctx.stroke();

  ctx.shadowBlur = 0;

  // Garis tengah pemisah
  ctx.beginPath();
  ctx.moveTo(cx, y + 8);
  ctx.lineTo(cx, y + NODE_H - 8);
  ctx.strokeStyle = '#e0d9ce';
  ctx.lineWidth   = 1;
  ctx.stroke();

  // Nama suami (kiri)
  ctx.fillStyle    = '#1a1714';
  ctx.font         = '500 11px "DM Sans", sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  const husbandLabel = truncate(husband?.name || '?', 10);
  ctx.fillText(husbandLabel, x + NODE_W * 0.27, y + NODE_H / 2);

  // Nama istri (kanan)
  const wifeLabel = truncate(wife?.name || '?', 10);
  ctx.fillText(wifeLabel, x + NODE_W * 0.73, y + NODE_H / 2);
}

// ── Lock dot ─────────────────────────────
function drawLockDot(x, y) {
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fillStyle   = '#e74c3c';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth   = 1.5;
  ctx.stroke();
}

// ── bCurve ───────────────────────────────
function drawBCurve(x1, y1, x2, y2, color, style, width) {
  const midY = (y1 + y2) / 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.bezierCurveTo(x1, midY, x2, midY, x2, y2);
  applyLineStyle(color, style, width);
  ctx.stroke();
}

function drawStraightLine(x1, y1, x2, y2, color, style, width) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  applyLineStyle(color, style, width);
  ctx.stroke();
}

function applyLineStyle(color, style, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth   = width;
  if (style === 'dashed')  ctx.setLineDash([6, 4]);
  else if (style === 'dotted') ctx.setLineDash([2, 4]);
  else ctx.setLineDash([]);
}

// ── Helpers ──────────────────────────────
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h,     x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y,         x + r, y);
  ctx.closePath();
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

// ══════════════════════════════════════════
// HIT TEST — klik node mana?
// ══════════════════════════════════════════

export function hitTest(screenX, screenY) {
  // Konversi screen → world
  const wx = (screenX - state.viewport.x) / state.viewport.scale;
  const wy = (screenY - state.viewport.y) / state.viewport.scale;

  // Cek dari atas (z-order terbalik agar yang di atas terklik duluan)
  const entries = Object.entries(layoutMap);
  for (let i = entries.length - 1; i >= 0; i--) {
    const [id, pos] = entries[i];
    const x = pos.x - NODE_W / 2;
    const y = pos.y;
    if (wx >= x && wx <= x + NODE_W && wy >= y && wy <= y + NODE_H) {
      return { id, type: pos.type, pos };
    }
  }
  return null;
}

// ══════════════════════════════════════════
// FOCUS — pan ke node tertentu
// ══════════════════════════════════════════

export function focusNode(nodeId) {
  const pos = layoutMap[nodeId];
  if (!pos) return;
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  state.viewport.x = W / 2 - pos.x * state.viewport.scale;
  state.viewport.y = H / 2 - (pos.y + NODE_H / 2) * state.viewport.scale;
  render();
}

export function fitAll() {
  if (!Object.keys(layoutMap).length) return;
  const positions = Object.values(layoutMap);
  const minX = Math.min(...positions.map(p => p.x - NODE_W / 2));
  const maxX = Math.max(...positions.map(p => p.x + NODE_W / 2));
  const minY = Math.min(...positions.map(p => p.y));
  const maxY = Math.max(...positions.map(p => p.y + NODE_H));

  const W      = canvas.clientWidth;
  const H      = canvas.clientHeight;
  const scaleX = (W - 80) / (maxX - minX || 1);
  const scaleY = (H - 80) / (maxY - minY || 1);
  const scale  = Math.min(scaleX, scaleY, 1.5);

  state.viewport.scale = scale;
  state.viewport.x     = W / 2 - ((minX + maxX) / 2) * scale;
  state.viewport.y     = H / 2 - ((minY + maxY) / 2) * scale;
  render();
}

// ══════════════════════════════════════════
// INTERACTION — pan, zoom, klik
// ══════════════════════════════════════════

function setupInteraction() {
  let isPanning  = false;
  let lastX = 0, lastY = 0;
  let pinchDist  = null;

  // ── Mouse ──
  canvas.addEventListener('mousedown', e => {
    isPanning = true;
    lastX = e.clientX; lastY = e.clientY;
  });

  canvas.addEventListener('mousemove', e => {
    if (!isPanning) return;
    state.viewport.x += e.clientX - lastX;
    state.viewport.y += e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    render();
  });

  canvas.addEventListener('mouseup', e => {
    const dx = Math.abs(e.clientX - lastX);
    const dy = Math.abs(e.clientY - lastY);
    isPanning = false;
    if (dx < 4 && dy < 4) handleTap(e.clientX, e.clientY);
  });

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const delta  = e.deltaY > 0 ? 0.9 : 1.1;
    zoomAt(e.clientX, e.clientY, delta);
  }, { passive: false });

  // ── Touch ──
  canvas.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      isPanning = true;
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      isPanning = false;
      pinchDist = getPinchDist(e);
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', e => {
    if (e.touches.length === 1 && isPanning) {
      state.viewport.x += e.touches[0].clientX - lastX;
      state.viewport.y += e.touches[0].clientY - lastY;
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
      render();
    } else if (e.touches.length === 2 && pinchDist !== null) {
      const newDist = getPinchDist(e);
      const delta   = newDist / pinchDist;
      const midX    = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY    = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      zoomAt(midX, midY, delta);
      pinchDist = newDist;
    }
  }, { passive: true });

  canvas.addEventListener('touchend', e => {
    if (e.changedTouches.length === 1 && isPanning) {
      const dx = Math.abs(e.changedTouches[0].clientX - lastX);
      const dy = Math.abs(e.changedTouches[0].clientY - lastY);
      if (dx < 8 && dy < 8) handleTap(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    }
    isPanning = false;
    pinchDist = null;
  });
}

function zoomAt(screenX, screenY, delta) {
  const newScale = Math.min(Math.max(state.viewport.scale * delta, 0.1), 4);
  const ratio    = newScale / state.viewport.scale;
  state.viewport.x     = screenX - ratio * (screenX - state.viewport.x);
  state.viewport.y     = screenY - ratio * (screenY - state.viewport.y);
  state.viewport.scale = newScale;
  render();
}

function getPinchDist(e) {
  const dx = e.touches[0].clientX - e.touches[1].clientX;
  const dy = e.touches[0].clientY - e.touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function handleTap(screenX, screenY) {
  const rect = canvas.getBoundingClientRect();
  const hit  = hitTest(screenX - rect.left, screenY - rect.top);
  if (hit) {
    // Dispatch event ke app.js
    canvas.dispatchEvent(new CustomEvent('nodeclick', { detail: hit }));
  } else {
    canvas.dispatchEvent(new CustomEvent('nodeclick', { detail: null }));
  }
}

// ══════════════════════════════════════════
// ZOOM BUTTONS
// ══════════════════════════════════════════

export function zoomIn()  { zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, 1.2); }
export function zoomOut() { zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, 0.8); }

// ══════════════════════════════════════════
// SEARCH — cari semua node yang cocok
// ══════════════════════════════════════════

export function searchNodes(query) {
  if (!query) return [];
  const q = query.toLowerCase();
  return Object.values(state.persons)
    .filter(p => p.name?.toLowerCase().includes(q))
    .slice(0, 10)
    .map(p => ({ id: p.id, name: p.name }));
}

// ══════════════════════════════════════════
// DRAG & DROP — pindah node
// ══════════════════════════════════════════

let dragNodeId   = null;
let dragStartPos = null;
let isDragging   = false;

export function startDrag(nodeId, screenX, screenY) {
  dragNodeId   = nodeId;
  dragStartPos = { x: screenX, y: screenY };
  isDragging   = false;
}

export function updateDrag(screenX, screenY) {
  if (!dragNodeId) return;
  const dx = screenX - dragStartPos.x;
  const dy = screenY - dragStartPos.y;
  if (Math.sqrt(dx*dx + dy*dy) > 10) isDragging = true;
  if (!isDragging) return;

  // Update posisi node sementara di layoutMap
  const pos = layoutMap[dragNodeId];
  if (!pos) return;
  pos.x = (screenX - state.viewport.x) / state.viewport.scale;
  pos.y = (screenY - state.viewport.y) / state.viewport.scale;
  render();

  // Highlight node yang mungkin menjadi target drop
  highlightDropTarget(screenX, screenY);
}

export function endDrag(screenX, screenY) {
  if (!dragNodeId || !isDragging) { dragNodeId = null; return null; }
  const target = hitTest(screenX, screenY);
  dragNodeId   = null;
  isDragging   = false;
  render();
  return target; // dikembalikan ke app.js untuk proses gabung/pindah
}

function highlightDropTarget(screenX, screenY) {
  const rect   = canvas.getBoundingClientRect();
  const target = hitTest(screenX - rect.left, screenY - rect.top);
  if (!target || target.id === dragNodeId) return;

  const pos = layoutMap[target.id];
  if (!pos) return;

  ctx.save();
  ctx.translate(state.viewport.x, state.viewport.y);
  ctx.scale(state.viewport.scale, state.viewport.scale);
  roundRect(pos.x - NODE_W / 2, pos.y, NODE_W, NODE_H, NODE_RADIUS);
  ctx.strokeStyle = '#3d6b4f';
  ctx.lineWidth   = 3;
  ctx.setLineDash([4, 3]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}
