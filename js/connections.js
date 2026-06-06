// ========== CONNECT MODE (MANUAL LINK) ==========
// Klik tombol Connect → pilih node pertama → pilih node kedua →
// preview path options → klik path → simpan permanen → selesai
//
// Juga: klik garis existing → popup edit (warna, ketebalan, path, hapus)

let connectModeActive = false;
let connectFirstNode = null; // { key, el }

const CONNECT_COLORS = ["#8cabe5","#4caf50","#f44336","#ff9800","#9c27b0","#00bcd4","#ffd700","#ffffff"];
const CONNECT_WIDTHS = [1, 2, 3, 4];

// ========== BANNER ==========
function showConnectModeBanner(text) {
  const b = document.getElementById("connect-mode-banner");
  const t = document.getElementById("connect-mode-banner-text");
  if (b && t) {
    t.textContent = text;
    b.style.display = "flex";
  }
}

function hideConnectModeBanner() {
  const b = document.getElementById("connect-mode-banner");
  if (b) b.style.display = "none";
}

// ========== MODE ENTER/EXIT ==========
function enterConnectMode() {
  if (!isAdmin) return;
  connectModeActive = true;
  connectFirstNode = null;
  document.body.classList.add("connect-mode-active");
  showConnectModeBanner("🔗 Pilih node pertama...");
  const btn = document.getElementById("connect-mode-btn");
  if (btn) btn.classList.add("active");
}

function exitConnectMode() {
  connectModeActive = false;
  if (connectFirstNode && connectFirstNode.el) {
    connectFirstNode.el.classList.remove("connect-highlight");
  }
  connectFirstNode = null;
  document.body.classList.remove("connect-mode-active");
  hideConnectModeBanner();
  clearPathPreviews();
  closeLinkEditPopup();
  const btn = document.getElementById("connect-mode-btn");
  if (btn) btn.classList.remove("active");
}

// ========== PREVIEW PATH ==========
function clearPathPreviews() {
  const svg = document.getElementById("manual-links-svg");
  if (!svg) return;
  svg.querySelectorAll(".manual-link-preview").forEach(el => el.remove());
}

function generatePathOptions(fromPos, toPos) {
  const x1 = fromPos.x, y1 = fromPos.y;
  const x2 = toPos.x, y2 = toPos.y;
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  const paths = [];

  // Path A: Horizontal dulu → Vertical → Horizontal (via midY dulu)
  paths.push({
    id: "A",
    label: "Horizontal → Vertical",
    points: [
      { x: x1, y: y1 },
      { x: midX, y: y1 },
      { x: midX, y: y2 },
      { x: x2, y: y2 }
    ]
  });

  // Path B: Vertical dulu → Horizontal → Vertical (via midX dulu)
  paths.push({
    id: "B",
    label: "Vertical → Horizontal",
    points: [
      { x: x1, y: y1 },
      { x: x1, y: midY },
      { x: x2, y: midY },
      { x: x2, y: y2 }
    ]
  });

  // Path C: Horizontal dulu → Vertical (2 segment)
  paths.push({
    id: "C",
    label: "Horizontal dulu",
    points: [
      { x: x1, y: y1 },
      { x: x2, y: y1 },
      { x: x2, y: y2 }
    ]
  });

  // Path D: Vertical dulu → Horizontal (2 segment)
  paths.push({
    id: "D",
    label: "Vertical dulu",
    points: [
      { x: x1, y: y1 },
      { x: x1, y: y2 },
      { x: x2, y: y2 }
    ]
  });

  return paths;
}

function nodeKeyToCenterPos(key) {
  const el = document.querySelector(`.node-box[data-node-key="${cssEscapeMT(key)}"]`);
  if (!el) return null;

  const treeContainer = document.getElementById("tree");
  if (!treeContainer) return null;

  const containerRect = treeContainer.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();

  // Posisi center node relatif ke #tree container
  // Dibagi scale agar koordinat di ruang SVG (bukan viewport)
  const zc = document.getElementById("tree-zoom-container");
  const scaleVal = zc ? (parseFloat(zc.style.transform.match(/scale\(([^)]+)\)/)?.[1]) || 1) : 1;

  const x = (elRect.left - containerRect.left + elRect.width  / 2) / scaleVal;
  const y = (elRect.top  - containerRect.top  + elRect.height / 2) / scaleVal;

  return { x, y };
}

function drawPreviews(fromKey, toKey) {
  clearPathPreviews();
  const svg = document.getElementById("manual-links-svg");
  if (!svg) return;
  const fromPos = nodeKeyToCenterPos(fromKey);
  const toPos   = nodeKeyToCenterPos(toKey);
  if (!fromPos || !toPos) return;

  const svgNS = "http://www.w3.org/2000/svg";

  // Hanya 1 preview: garis lurus langsung
  const line = document.createElementNS(svgNS, "line");
  line.setAttribute("x1", fromPos.x);
  line.setAttribute("y1", fromPos.y);
  line.setAttribute("x2", toPos.x);
  line.setAttribute("y2", toPos.y);
  line.setAttribute("stroke", "#8cabe5");
  line.setAttribute("stroke-width", "2");
  line.setAttribute("stroke-dasharray", "8,4");
  line.setAttribute("fill", "none");
  line.setAttribute("stroke-linecap", "round");
  line.classList.add("manual-link-preview");
  line.style.cursor = "pointer";

  line.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    finalizeConnectLink(fromKey, toKey, "#8cabe5", 2, null);
  });

  const title = document.createElementNS(svgNS, "title");
  title.textContent = "Klik untuk konfirmasi tautan";
  line.appendChild(title);
  svg.appendChild(line);
}

// ========== KLIK NODE SAAT MODE CONNECT ==========
function onConnectNodeClick(e) {
  if (!connectModeActive) return;
  const box = e.target.closest(".node-box");
  if (!box) return;
  const key = box.getAttribute("data-node-key");
  if (!key) return;

  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  if (!connectFirstNode) {
    // Pilih node pertama
    connectFirstNode = { key, el: box };
    box.classList.add("connect-highlight");
    showConnectModeBanner("🔗 Pilih node pasangan...");
  } else if (key === connectFirstNode.key) {
    // Klik node yang sama → batal pilih pertama
    connectFirstNode.el.classList.remove("connect-highlight");
    connectFirstNode = null;
    clearPathPreviews();
    showConnectModeBanner("🔗 Pilih node pertama...");
  } else {
    // Pilih node kedua → tampilkan preview
    showConnectModeBanner("🔗 Pilih path yang diinginkan...");
    drawPreviews(connectFirstNode.key, key);
  }
}

// ========== FINALIZE LINK ==========
async function finalizeConnectLink(fromKey, toKey, color, width, waypoints) {
  saveToUndo();
  const linkId = newIdMT("l");
  manualLinks.push({
    id: linkId,
    from: fromKey,
    to: toKey,
    color: color || "#8cabe5",
    width: width || 2,
    waypoints: waypoints || null
  });

  exitConnectMode();
  await persistMultiState();
  drawManualLinks();
  showCustomPopup("Tautan manual berhasil dibuat!", "Sukses");
}

// ========== EDIT GARIS (KLIK GARIS EXISTING) ==========
let editPopupLinkId = null;
let editPopupPos = { x: 0, y: 0 };

function showLinkEditPopup(linkId, clientX, clientY) {
  closeLinkEditPopup();

  const link = manualLinks.find(l => l.id === linkId);
  if (!link) return;

  editPopupLinkId = linkId;
  editPopupPos = { x: clientX, y: clientY };

  const popup = document.createElement("div");
  popup.id = "link-edit-popup";
  popup.className = "link-edit-popup";
  popup.style.left = clientX + "px";
  popup.style.top = clientY + "px";
  popup.style.display = "block";

  let html = '<div style="color:#fff;font-size:10px;margin-bottom:6px;">✏️ Edit Garis</div>';

  // Warna
  html += '<div style="color:#ccc;font-size:9px;">Warna:</div><div class="lep-color-row">';
  CONNECT_COLORS.forEach(c => {
    const active = (link.color === c) ? 'style="border:2px solid #fff;"' : '';
    html += `<span class="lep-color-dot" data-color="${c}" style="background:${c};" ${active}></span>`;
  });
  html += '</div>';

  // Ketebalan
  html += '<div style="color:#ccc;font-size:9px;margin-top:6px;">Ketebalan:</div><div class="lep-width-row">';
  CONNECT_WIDTHS.forEach(w => {
    const active = (link.width === w) ? 'style="background:#00a8f7;"' : '';
    html += `<span class="lep-width-btn" data-width="${w}" ${active}>${w}px</span>`;
  });
  html += '</div>';

  // Ganti Path
  html += `<button class="lep-change-path" data-link-id="${linkId}" style="background:#9c27b0;margin-top:6px;">🔄 Ganti Path</button>`;

  // Hapus
  html += `<button class="lep-delete" data-link-id="${linkId}" style="background:#f44336;margin-top:2px;">🗑 Hapus</button>`;

  popup.innerHTML = html;
  document.body.appendChild(popup);

  // Event listeners
  popup.querySelectorAll(".lep-color-dot").forEach(dot => {
    dot.addEventListener("click", async (e) => {
      e.stopPropagation();
      const newColor = dot.getAttribute("data-color");
      link.color = newColor;
      await persistMultiState();
      drawManualLinks();
      closeLinkEditPopup();
    });
  });

  popup.querySelectorAll(".lep-width-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const newWidth = parseInt(btn.getAttribute("data-width"));
      link.width = newWidth;
      await persistMultiState();
      drawManualLinks();
      closeLinkEditPopup();
    });
  });

  popup.querySelector(".lep-change-path")?.addEventListener("click", (e) => {
    e.stopPropagation();
    closeLinkEditPopup();
    changeLinkPath(link);
  });

  popup.querySelector(".lep-delete")?.addEventListener("click", async (e) => {
    e.stopPropagation();
    closeLinkEditPopup();
    await deleteManualLink(linkId);
  });

  // Tutup popup kalau klik di luar
  setTimeout(() => {
    document.addEventListener("click", closeLinkEditPopupOnOutside, true);
  }, 10);
}

function closeLinkEditPopup() {
  const popup = document.getElementById("link-edit-popup");
  if (popup) popup.remove();
  editPopupLinkId = null;
  document.removeEventListener("click", closeLinkEditPopupOnOutside, true);
}

function closeLinkEditPopupOnOutside(e) {
  const popup = document.getElementById("link-edit-popup");
  if (!popup) return;
  if (!popup.contains(e.target)) {
    closeLinkEditPopup();
  }
}

// ========== GANTI PATH LINK EXISTING ==========
function changeLinkPath(link) {
  // Garis selalu lurus (koordinat dihitung realtime dari posisi node)
  // Reset waypoints agar drawManualLinks pakai posisi terkini
  saveToUndo();
  link.waypoints = null;
  persistMultiState().then(() => {
    drawManualLinks();
    showCustomPopup("Tautan diperbarui ke posisi terkini!", "Sukses");
  });
}

// ========== KLIK GARIS EXISTING ==========
function onManualLinkClick(e) {
  if (!isAdmin) return;
  if (connectModeActive) return;

  const line = e.target.closest("[data-link-id]");
  if (!line) return;

  const linkId = line.getAttribute("data-link-id");
  if (!linkId) return;

  e.preventDefault();
  e.stopPropagation();

  showLinkEditPopup(linkId, e.clientX, e.clientY);
}

// ========== INIT ==========
function initConnections() {
  // Tombol Connect di header
  const connectBtn = document.getElementById("connect-mode-btn");
  if (connectBtn) {
    connectBtn.addEventListener("click", () => {
      if (!connectModeActive) enterConnectMode();
      else exitConnectMode();
    });
  }

  // Tombol batal di banner
  const cancelBtn = document.getElementById("connect-mode-cancel-btn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      exitConnectMode();
    });
  }

  // Klik node saat mode connect (capture phase)
  document.addEventListener("click", onConnectNodeClick, true);

  // Klik garis existing
  document.addEventListener("click", onManualLinkClick, false);

  // Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (editPopupLinkId) {
        closeLinkEditPopup();
        return;
      }
      if (connectModeActive) {
        exitConnectMode();
      }
    }
  });

  // Klik di luar popup edit
  document.addEventListener("click", (e) => {
    const popup = document.getElementById("link-edit-popup");
    if (popup && !popup.contains(e.target)) {
      closeLinkEditPopup();
    }
  });
}

// Ekspos ke global
window.enterConnectMode = enterConnectMode;
window.exitConnectMode = exitConnectMode;
window.initConnections = initConnections;
