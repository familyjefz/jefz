let activePath = null;
let activeMode = null;
let currentTreeData = null;
let isFirstLoad = true;
let currentZoom = 1;
let isAdmin = false;

const ADMIN_PIN = "00";
const SUPABASE_URL = "https://btyrorlzdyisuvnwmrqp.supabase.co";

// ========== WARNA PER SAUDARA KANDUNG ==========
let siblingColorMap = new Map();
let nextSiblingGroupId = 1;

function resetSiblingColors() {
  siblingColorMap.clear();
  nextSiblingGroupId = 1;
}

function getOrCreateSiblingColor(siblingGroupId) {
  if (siblingColorMap.has(siblingGroupId)) {
    return siblingColorMap.get(siblingGroupId);
  }
  const hue = (siblingGroupId * 37) % 360;
  const color = `hsl(${hue}, 75%, 65%)`;
  siblingColorMap.set(siblingGroupId, color);
  return color;
}

function assignSiblingGroups(node) {
  if (!node) return;
  if (node.children && node.children.length > 0) {
    const childrenGroupId = nextSiblingGroupId++;
    node.children.forEach(child => {
      child._siblingGroupId = childrenGroupId;
      assignSiblingGroups(child);
    });
  }
}

function getNodeColor(node) {
  if (!node || node._siblingGroupId === undefined) {
    return `hsl(0, 75%, 65%)`;
  }
  return getOrCreateSiblingColor(node._siblingGroupId);
}

async function loadTree() {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/get-tree`);
    const data = await res.json();
    currentTreeData = data;
    resetSiblingColors();
    assignSiblingGroups(currentTreeData);
    renderTree();
  } catch (err) {
    console.error("Gagal load tree:", err);
    alert("Gagal memuat data. Periksa koneksi.");
  }
}

function renderTree() {
  const container = document.getElementById("tree");
  if (!container) return;
  
  const wrapper = document.getElementById("tree-wrapper");
  const savedLeft = wrapper ? wrapper.scrollLeft : 800;
  const savedTop = wrapper ? wrapper.scrollTop : 400;
  
  container.innerHTML = "";
  
  new Treant({
    chart: {
      container: "#tree",
      rootOrientation: "NORTH",
      connectors: { type: "step" },
      animateOnInit: false,
      levelSeparation: 12,
      siblingSeparation: 8,
      subTeeSeparation: 8
    },
    nodeStructure: convert(currentTreeData, [], 1)
  });
  
  setTimeout(() => {
    if (wrapper) {
      if (isFirstLoad) {
        wrapper.scrollLeft = 800;
        wrapper.scrollTop = 400;
        isFirstLoad = false;
      } else {
        wrapper.scrollLeft = savedLeft;
        wrapper.scrollTop = savedTop;
      }
    }
  }, 100);
}

function convert(node, path = [], generation = 1) {
  const isActiveNode = isActive(path);
  const borderColor = getNodeColor(node);
  const inputId = `input-${path.join("-")}`;
  
  let innerHTML = "";
  
  if (isActiveNode && activeMode && isAdmin) {
    let inputValue = "";
    let placeholder = "";
    if (activeMode === "edit") { inputValue = node.name; placeholder = "Tulis nama (Enter untuk baris baru)"; }
    else if (activeMode === "add") placeholder = "Tulis nama anak (Enter untuk baris baru)";
    else if (activeMode === "parent") placeholder = "Tulis nama parent (Enter untuk baris baru)";
    else if (activeMode === "order") placeholder = "Masukkan nomor urutan (0=pertama)";
    
    innerHTML = `
      <div class="node-box active-node" style="border-left: 4px solid ${borderColor};">
        <div class="node-name">${escapeHtml(node.name)}</div>
        <textarea class="node-input" id="${inputId}" 
          placeholder="${placeholder}" rows="2">${escapeHtml(inputValue)}</textarea>
        <div class="node-actions">
          <button onclick='submitInline(${JSON.stringify(path)})'>✔ Simpan</button>
          <button onclick='cancelInline()'>✖ Batal</button>
        </div>
      </div>
    `;
  }
  else if (isActiveNode && isAdmin) {
    innerHTML = `
      <div class="node-box active-node" style="border-left: 4px solid ${borderColor};">
        <div class="node-name">${escapeHtml(node.name)}</div>
        <div class="node-menu">
          <button onclick='setMode(${JSON.stringify(path)}, "add")'>➕ Tambah Anak</button>
          <button onclick='setMode(${JSON.stringify(path)}, "edit")'>✏️ Ubah Nama</button>
          <button onclick='hapus(${JSON.stringify(path)})'>❌ Hapus</button>
          <button onclick='setMode(${JSON.stringify(path)}, "parent")'>⬆️ Tambah Parent</button>
          <button onclick='setMode(${JSON.stringify(path)}, "order")'>🔢 Ubah Urutan</button>
        </div>
      </div>
    `;
  }
  else {
    const displayName = escapeHtml(node.name).replace(/\n/g, '<br>');
    let buttons = `<button class="btn-info" onclick='showInfo(${JSON.stringify(path)})'>📄 Info</button>`;
    if (isAdmin) {
      buttons = `<button class="btn-option" onclick='openOptions(${JSON.stringify(path)})'>⚙️ Option</button>${buttons}`;
    }
    
    innerHTML = `
      <div class="node-box" style="border-left: 4px solid ${borderColor};">
        <div class="node-name">${displayName}</div>
        <div class="node-buttons">
          ${buttons}
        </div>
      </div>
    `;
  }
  
  return {
    innerHTML: innerHTML,
    children: node.children?.map((child, i) => convert(child, [...path, i], generation + 1))
  };
}

// ========== FUNGSI BANTU ==========
function getNodeByPath(node, path) {
  if (!path || path.length === 0) return node;
  let current = node;
  for (let i = 0; i < path.length; i++) {
    if (!current.children || !current.children[path[i]]) return null;
    current = current.children[path[i]];
  }
  return current;
}

function getPathOfNode(root, targetNode) {
  function search(node, path) {
    if (node === targetNode) return path;
    if (node.children) {
      for (let i = 0; i < node.children.length; i++) {
        const result = search(node.children[i], [...path, i]);
        if (result) return result;
      }
    }
    return null;
  }
  return search(root, []);
}

// ========== FITUR INFO (2 KOLOM) ==========
async function showInfo(path) {
  const node = getNodeByPath(currentTreeData, path);
  if (!node) return;
  
  const info = generateFamilyInfo(currentTreeData, path, node);
  
  const modal = document.getElementById("info-modal");
  const title = document.getElementById("info-title");
  const body = document.getElementById("info-body");
  
  title.innerHTML = `📋 Info: ${escapeHtml(node.name).replace(/\n/g, '<br>')}`;
  
  // Layout 2 kolom menggunakan CSS Grid
  body.innerHTML = `
    <div class="info-grid-2col">
      <div class="info-section">
        <div class="info-label">👤 Nama</div>
        <div class="info-value">${escapeHtml(node.name).replace(/\n/g, '<br>')}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">💑 Pasangan</div>
        <div class="info-value">${info.spouse || '<span class="empty-info">- Tidak ada</span>'}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">👶 Anak</div>
        <div class="info-value">${info.childrenList || '<span class="empty-info">- Tidak ada</span>'}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">👶 Cucu</div>
        <div class="info-value">${info.grandchildrenList || '<span class="empty-info">- Tidak ada</span>'}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">👨‍👩‍👧‍👦 Orang Tua</div>
        <div class="info-value">${info.parents || '<span class="empty-info">- Tidak ada</span>'}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">👴👵 Kakek/Nenek</div>
        <div class="info-value">${info.grandparents || '<span class="empty-info">- Tidak ada</span>'}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">👨‍👩‍👧‍👦 Saudara Kandung</div>
        <div class="info-value">${info.siblings || '<span class="empty-info">- Tidak ada</span>'}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">👶 Ponakan</div>
        <div class="info-value">${info.nephews || '<span class="empty-info">- Tidak ada</span>'}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">👨‍👩‍👧‍👦 Paman/Bibi</div>
        <div class="info-value">${info.auntsUncles || '<span class="empty-info">- Tidak ada</span>'}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">👨‍👩‍👧‍👦 Sepupu</div>
        <div class="info-value">${info.cousins || '<span class="empty-info">- Tidak ada</span>'}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">📜 7 Keturunan ke Atas</div>
        <div class="info-value">${info.ancestors7 || '<span class="empty-info">- Tidak ada</span>'}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">📜 7 Keturunan ke Bawah</div>
        <div class="info-value">${info.descendants7 || '<span class="empty-info">- Tidak ada</span>'}</div>
      </div>
    </div>
  `;
  
  modal.style.display = "block";
}

function generateFamilyInfo(treeData, path, node) {
  // Cari parent
  const parentPath = path.slice(0, -1);
  let parent = parentPath.length === 0 ? null : getNodeByPath(treeData, parentPath);
  
  // SAUDARA KANDUNG (anak dari parent yang sama)
  let siblings = [];
  if (parent && parent.children) {
    siblings = parent.children.filter((_, idx) => idx !== path[path.length - 1]);
  }
  
  // PONAKAN (anak dari saudara kandung)
  let nephews = [];
  siblings.forEach(sibling => {
    if (sibling.children && sibling.children.length > 0) {
      nephews = nephews.concat(sibling.children);
    }
  });
  
  // PAMAN/BIBI (saudara dari orang tua)
  let auntsUncles = [];
  if (parent) {
    const grandparentPath = parentPath.slice(0, -1);
    let grandparent = grandparentPath.length === 0 ? treeData : getNodeByPath(treeData, grandparentPath);
    if (grandparent && grandparent.children) {
      auntsUncles = grandparent.children.filter(p => p !== parent);
    }
  }
  
  // SEPUPU (anak dari paman/bibi)
  let cousins = [];
  auntsUncles.forEach(au => {
    if (au.children && au.children.length > 0) {
      cousins = cousins.concat(au.children);
    }
  });
  
  // Pasangan
  let spouse = null;
  if (node.name && node.name.includes("|")) {
    const parts = node.name.split("|");
    if (parts.length > 1 && parts[1].trim()) {
      spouse = parts[1].trim();
    }
  }
  
  // Anak-anak
  const children = node.children || [];
  const childrenList = children.length > 0 
    ? children.map((c, i) => `${i + 1}. ${c.name.replace(/\n/g, '<br>')}`).join('<br>')
    : null;
  
  // Cucu
  let grandchildren = [];
  children.forEach(child => {
    if (child.children && child.children.length > 0) {
      grandchildren = grandchildren.concat(child.children);
    }
  });
  const grandchildrenList = grandchildren.length > 0
    ? grandchildren.map((gc, i) => `${i + 1}. ${gc.name.replace(/\n/g, '<br>')}`).join('<br>')
    : null;
  
  // Orang Tua
  const parents = parent ? parent.name.replace(/\n/g, '<br>') : null;
  
  // Kakek/nenek
  let grandparent = null;
  if (parentPath.length > 0) {
    const grandparentPath = parentPath.slice(0, -1);
    const grandparentNode = grandparentPath.length === 0 ? treeData : getNodeByPath(treeData, grandparentPath);
    if (grandparentNode) {
      grandparent = grandparentNode.name.replace(/\n/g, '<br>');
    }
  }
  
  // 7 keturunan ke atas
  let ancestors = [];
  let currentParent = parent;
  let gen = 1;
  while (currentParent && gen <= 7) {
    ancestors.push(`Generasi ke-${gen}: ${currentParent.name.replace(/\n/g, '<br>')}`);
    const currentPath = getPathOfNode(treeData, currentParent);
    if (currentPath && currentPath.length > 0) {
      const newParentPath = currentPath.slice(0, -1);
      currentParent = newParentPath.length === 0 ? treeData : getNodeByPath(treeData, newParentPath);
      if (currentParent === treeData && newParentPath.length === 0) break;
    } else {
      currentParent = null;
    }
    gen++;
  }
  const ancestors7 = ancestors.length > 0 ? ancestors.join('<br>') : null;
  
  // 7 keturunan ke bawah
  let descendants = [];
  let queue = [{ node: node, level: 1 }];
  while (queue.length > 0) {
    const { node: n, level } = queue.shift();
    if (level > 1 && level <= 7) {
      descendants.push(`Generasi ke-${level - 1}: ${n.name.replace(/\n/g, '<br>')}`);
    }
    if (n.children && level < 7) {
      n.children.forEach(child => queue.push({ node: child, level: level + 1 }));
    }
  }
  const descendants7 = descendants.length > 0 ? descendants.join('<br>') : null;
  
  // Format daftar
  const siblingsList = siblings.length > 0 ? siblings.map((s, i) => `${i + 1}. ${s.name.replace(/\n/g, '<br>')}`).join('<br>') : null;
  const nephewsList = nephews.length > 0 ? nephews.map((n, i) => `${i + 1}. ${n.name.replace(/\n/g, '<br>')}`).join('<br>') : null;
  const auntsUnclesList = auntsUncles.length > 0 ? auntsUncles.map((au, i) => `${i + 1}. ${au.name.replace(/\n/g, '<br>')}`).join('<br>') : null;
  const cousinsList = cousins.length > 0 ? cousins.map((c, i) => `${i + 1}. ${c.name.replace(/\n/g, '<br>')}`).join('<br>') : null;
  
  return {
    spouse,
    childrenList,
    grandchildrenList,
    parents,
    grandparents: grandparent,
    ancestors7,
    siblings: siblingsList,
    nephews: nephewsList,
    auntsUncles: auntsUnclesList,
    cousins: cousinsList,
    descendants7
  };
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

function isActive(path) {
  if (!activePath) return false;
  return JSON.stringify(path) === JSON.stringify(activePath);
}

function getCurrentScroll() {
  const w = document.getElementById("tree-wrapper");
  return { left: w ? w.scrollLeft : 800, top: w ? w.scrollTop : 400 };
}

function restoreScroll(left, top) {
  const w = document.getElementById("tree-wrapper");
  if (w) {
    setTimeout(() => {
      w.scrollLeft = left;
      w.scrollTop = top;
    }, 50);
  }
}

function openOptions(path) {
  if (!isAdmin) return;
  const scroll = getCurrentScroll();
  activePath = path;
  activeMode = null;
  renderTree();
  restoreScroll(scroll.left, scroll.top);
}

function setMode(path, mode) {
  if (!isAdmin) return;
  const scroll = getCurrentScroll();
  activePath = path;
  activeMode = mode;
  renderTree();
  restoreScroll(scroll.left, scroll.top);
}

function cancelInline() {
  if (!isAdmin) return;
  const scroll = getCurrentScroll();
  activePath = null;
  activeMode = null;
  renderTree();
  restoreScroll(scroll.left, scroll.top);
}

async function submitInline(path) {
  if (!isAdmin) return;
  const input = document.getElementById(`input-${path.join("-")}`);
  if (!input) return;
  const val = input.value.trim();
  if (activeMode !== "order" && !val) { alert("Tidak boleh kosong!"); return; }
  
  let action, body = { path };
  if (activeMode === "add") { action = "add"; body.name = val; }
  else if (activeMode === "edit") { action = "edit"; body.name = val; }
  else if (activeMode === "parent") { action = "addParent"; body.name = val; }
  else if (activeMode === "order") { action = "reorder"; body.position = parseInt(val); if (isNaN(body.position)) { alert("Masukkan angka!"); return; } }
  else return;
  
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/update-tree`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body })
    });
    const result = await res.json();
    if (result.success) {
      activePath = null; activeMode = null;
      await loadTree();
    } else alert("Gagal: " + (result.error || "Error"));
  } catch (err) { alert("Error: " + err.message); }
}

async function hapus(path) {
  if (!isAdmin) return;
  if (!confirm("Hapus node ini?")) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/update-tree`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", path })
    });
    const result = await res.json();
    if (result.success) {
      activePath = null; activeMode = null;
      await loadTree();
    } else alert("Gagal hapus");
  } catch (err) { alert("Error: " + err.message); }
}

function setZoom(zoom) {
  currentZoom = zoom;
  const zoomContainer = document.getElementById("tree-zoom-container");
  if (zoomContainer) {
    zoomContainer.style.transform = `scale(${currentZoom})`;
  }
}

function zoomIn() { setZoom(currentZoom + 0.1); }
function zoomOut() { setZoom(currentZoom - 0.1); }
function zoomReset() { setZoom(1); }

// LOGIN MODAL FUNCTIONS
function showLoginModal() {
  document.getElementById("login-modal").style.display = "block";
  document.getElementById("pin-input").value = "";
  document.getElementById("pin-error").innerText = "";
  setTimeout(() => document.getElementById("pin-input").focus(), 100);
}

function closeLoginModal() {
  document.getElementById("login-modal").style.display = "none";
}

function closeInfoModal() {
  document.getElementById("info-modal").style.display = "none";
}

function checkPin() {
  const pin = document.getElementById("pin-input").value;
  if (pin === ADMIN_PIN) {
    isAdmin = true;
    closeLoginModal();
    alert("Login sebagai Admin berhasil! Anda sekarang bisa mengedit silsilah.");
    renderTree();
  } else {
    document.getElementById("pin-error").innerText = "PIN salah! Coba lagi.";
  }
}

// Event listeners
document.addEventListener("click", (e) => {
  if (!e.target.closest(".node-box") && !e.target.closest("button") && e.target.tagName !== "TEXTAREA") {
    const scroll = getCurrentScroll();
    activePath = null;
    activeMode = null;
    renderTree();
    restoreScroll(scroll.left, scroll.top);
  }
});

document.getElementById("zoom-in")?.addEventListener("click", zoomIn);
document.getElementById("zoom-out")?.addEventListener("click", zoomOut);
document.getElementById("zoom-reset")?.addEventListener("click", zoomReset);
document.getElementById("login-btn")?.addEventListener("click", showLoginModal);
document.querySelector(".close")?.addEventListener("click", closeLoginModal);
document.querySelector(".close-info")?.addEventListener("click", closeInfoModal);
document.getElementById("submit-pin")?.addEventListener("click", checkPin);
document.getElementById("pin-input")?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") checkPin();
});

window.addEventListener("click", (e) => {
  if (e.target === document.getElementById("login-modal")) {
    closeLoginModal();
  }
  if (e.target === document.getElementById("info-modal")) {
    closeInfoModal();
  }
});

loadTree();
