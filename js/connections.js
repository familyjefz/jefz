// ========== MANUAL NODE CONNECTIONS ==========
// Long-press the LEFT BORDER of a node, then click the LEFT BORDER of another
// node to create a manual link. Works across roots. Stored in
// currentTreeData.links and persisted with the rest of the tree, so undo/redo
// works automatically (because admin-undo snapshots the full tree object).

const CONNECT_LONG_PRESS_MS = 400;
const CONNECT_MOVE_TOLERANCE = 8;

let connectingFromId = null;
let pressTimer = null;
let pressNodeId = null;
let pressStartX = 0;
let pressStartY = 0;

function newLinkId() {
  return "l_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);
}

function isInConnectMode() {
  return connectingFromId !== null;
}

function showConnectBanner() {
  const b = document.getElementById("connect-banner");
  if (b) b.style.display = "flex";
}

function hideConnectBanner() {
  const b = document.getElementById("connect-banner");
  if (b) b.style.display = "none";
}

function highlightSource(nodeId, on) {
  const el = document.querySelector(`.node-box[data-node-id="${cssEscape(nodeId)}"]`);
  if (!el) return;
  if (on) el.classList.add("connect-source");
  else el.classList.remove("connect-source");
}

function cssEscape(s) {
  if (window.CSS && CSS.escape) return CSS.escape(s);
  return String(s).replace(/[^a-zA-Z0-9_-]/g, (c) => "\\" + c);
}

function enterConnectMode(nodeId) {
  if (connectingFromId) exitConnectMode();
  connectingFromId = nodeId;
  document.body.classList.add("connect-mode");
  highlightSource(nodeId, true);
  showConnectBanner();
}

function exitConnectMode() {
  if (!connectingFromId) {
    hideConnectBanner();
    document.body.classList.remove("connect-mode");
    return;
  }
  highlightSource(connectingFromId, false);
  connectingFromId = null;
  document.body.classList.remove("connect-mode");
  hideConnectBanner();
}

// ----- Long-press detection on .node-edge-left -----
function onEdgePointerDown(e) {
  if (!isAdmin) return;
  const edge = e.target.closest(".node-edge-left");
  if (!edge) return;
  // If we're already in connect mode, the click handler will pick it up.
  if (connectingFromId) return;

  const nodeId = edge.getAttribute("data-edge-id");
  if (!nodeId) return;

  const point = e.touches ? e.touches[0] : e;
  pressNodeId = nodeId;
  pressStartX = point.clientX;
  pressStartY = point.clientY;

  clearTimeout(pressTimer);
  pressTimer = setTimeout(() => {
    pressTimer = null;
    enterConnectMode(pressNodeId);
    if (typeof cancelDrag === "function") cancelDrag();
  }, CONNECT_LONG_PRESS_MS);
}

function onPointerMove(e) {
  if (!pressTimer) return;
  const point = e.touches ? e.touches[0] : e;
  const dx = point.clientX - pressStartX;
  const dy = point.clientY - pressStartY;
  if (Math.hypot(dx, dy) > CONNECT_MOVE_TOLERANCE) {
    clearTimeout(pressTimer);
    pressTimer = null;
  }
}

function onPointerUp() {
  if (pressTimer) {
    clearTimeout(pressTimer);
    pressTimer = null;
  }
}

// ----- Click handling while in connect mode -----
function onDocumentClickCapture(e) {
  if (!connectingFromId) return;

  // Allow clicks inside modals/popups (so user can dismiss alerts, etc.)
  if (e.target.closest(".modal") || e.target.closest(".custom-popup")) return;

  // Allow the cancel button on the connect banner
  if (e.target.closest("#connect-banner")) return;

  const edge = e.target.closest(".node-edge-left");
  if (edge) {
    const targetId = edge.getAttribute("data-edge-id");
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (targetId && targetId !== connectingFromId) {
      finalizeConnection(connectingFromId, targetId);
    } else {
      exitConnectMode();
    }
    return;
  }

  // Click anywhere else cancels connect mode (and is consumed so we don't
  // accidentally trigger Option/Info menus on other nodes).
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  exitConnectMode();
}

// ----- Create / delete links -----
async function finalizeConnection(fromId, toId) {
  if (!currentTreeData) return;
  if (!currentTreeData.links) currentTreeData.links = [];

  const exists = currentTreeData.links.some((l) =>
    (l.fromId === fromId && l.toId === toId) ||
    (l.fromId === toId && l.toId === fromId)
  );
  if (exists) {
    showCustomPopup("Tautan sudah ada antara dua node ini.", "Info");
    exitConnectMode();
    return;
  }

  saveToUndo(currentTreeData);
  currentTreeData.links.push({ id: newLinkId(), fromId, toId });
  exitConnectMode();

  try {
    const r = await saveAll();
    if (r && r.success) {
      drawLinks();
      showCustomPopup("Tautan berhasil dibuat!", "Sukses");
    } else {
      showCustomPopup("Gagal menyimpan tautan: " + ((r && r.error) || ""), "Error");
    }
  } catch (err) {
    showCustomPopup("Error: " + err.message, "Error");
  }
}

async function deleteLink(linkId) {
  if (!isAdmin || !currentTreeData || !currentTreeData.links) return;
  const link = currentTreeData.links.find((l) => l.id === linkId);
  if (!link) return;

  showCustomPopup(
    "Hapus tautan manual ini?",
    "Konfirmasi",
    async () => {
      saveToUndo(currentTreeData);
      currentTreeData.links = currentTreeData.links.filter((l) => l.id !== linkId);
      try {
        const r = await saveAll();
        if (r && r.success) drawLinks();
      } catch (err) {
        showCustomPopup("Error: " + err.message, "Error");
      }
    },
    true
  );
}

function onLinkDeleteClick(e) {
  const dbtn = e.target.closest("[data-link-delete]");
  if (!dbtn) return;
  const linkId = dbtn.getAttribute("data-link-delete");
  if (linkId) {
    e.preventDefault();
    e.stopPropagation();
    deleteLink(linkId);
  }
}

// ----- Init -----
function initConnections() {
  document.addEventListener("mousedown", onEdgePointerDown);
  document.addEventListener("touchstart", onEdgePointerDown, { passive: true });
  document.addEventListener("mousemove", onPointerMove);
  document.addEventListener("touchmove", onPointerMove, { passive: true });
  document.addEventListener("mouseup", onPointerUp);
  document.addEventListener("touchend", onPointerUp);
  document.addEventListener("touchcancel", onPointerUp);

  // Capture-phase click to intercept before the global click handlers
  document.addEventListener("click", onDocumentClickCapture, true);

  // Bubble-phase click for the link delete buttons
  document.addEventListener("click", onLinkDeleteClick, false);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && connectingFromId) exitConnectMode();
  });

  const cancelBtn = document.getElementById("connect-cancel-btn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      exitConnectMode();
    });
  }
}
/*Stable*/
