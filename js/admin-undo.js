// ========== UNDO/REDO (snapshot full state) ==========
let undoStack = [];
let redoStack = [];

function snapshotState() {
  return {
    main: currentTreeData ? JSON.parse(JSON.stringify(currentTreeData)) : null,
    extras: (typeof extraTrees !== "undefined") ? JSON.parse(JSON.stringify(extraTrees)) : [],
    links: (typeof manualLinks !== "undefined") ? JSON.parse(JSON.stringify(manualLinks)) : [],
    offsets: (typeof treeOffsets !== "undefined") ? JSON.parse(JSON.stringify(treeOffsets)) : {},
    visible: (typeof visibleTrees === "string")
        ? visibleTrees
        : (Array.isArray(visibleTrees) ? JSON.parse(JSON.stringify(visibleTrees)) : "all")
  };
}

function restoreState(snap) {
  if (!snap) return;
  currentTreeData = snap.main;
  if (typeof extraTrees !== "undefined") {
    extraTrees.length = 0;
    (snap.extras || []).forEach(t => extraTrees.push(t));
  }
  if (typeof manualLinks !== "undefined") {
    manualLinks.length = 0;
    (snap.links || []).forEach(l => manualLinks.push(l));
  }
  if (typeof treeOffsets !== "undefined") {
    Object.keys(treeOffsets).forEach(k => delete treeOffsets[k]);
    Object.assign(treeOffsets, snap.offsets || {});
  }
  visibleTrees = snap.visible || "all";
}

function saveToUndo() {
  if (!isAdmin) return;
  undoStack.push(snapshotState());
  redoStack = [];
  if (undoStack.length > 50) undoStack.shift();
}

async function undoAction() {
  if (!isAdmin) return;
  if (undoStack.length === 0) {
    showCustomPopup("Tidak ada aksi yang bisa di-undo", "Info");
    return;
  }
  const previous = undoStack.pop();
  redoStack.push(snapshotState());
  restoreState(previous);
  resetSiblingColors();
  if (currentTreeData) assignSiblingGroups(currentTreeData);
  renderTree();
  await saveToSupabase();
  if (typeof persistMultiState === "function") await persistMultiState();
  showCustomPopup("Undo berhasil!", "Sukses");
}

async function redoAction() {
  if (!isAdmin) return;
  if (redoStack.length === 0) {
    showCustomPopup("Tidak ada aksi yang bisa di-redo", "Info");
    return;
  }
  const next = redoStack.pop();
  undoStack.push(snapshotState());
  restoreState(next);
  resetSiblingColors();
  if (currentTreeData) assignSiblingGroups(currentTreeData);
  renderTree();
  await saveToSupabase();
  if (typeof persistMultiState === "function") await persistMultiState();
  showCustomPopup("Redo berhasil!", "Sukses");
}

// ========== POPUP HAPUS ==========
let pendingHapusPath = null;
let pendingHapusTreeId = "main";

function showHapusPopup(path, treeId = "main") {
  pendingHapusPath = path;
  pendingHapusTreeId = treeId;

  const popup = document.getElementById("custom-popup");
  const popupTitle = document.getElementById("popup-title");
  const popupMessage = document.getElementById("popup-message");
  const popupButtons = document.getElementById("popup-buttons");

  popupTitle.textContent = "Hapus Node";
  popupMessage.innerHTML = "Pilih opsi hapus:";
  popupButtons.innerHTML = "";

  const btnSaja = document.createElement("button");
  btnSaja.textContent = "Hapus ini saja";
  btnSaja.style.background = "#ff9800";
  btnSaja.style.color = "white";
  btnSaja.onclick = () => {
    popup.style.display = "none";
    hapusNodeOnly(pendingHapusPath, pendingHapusTreeId);
  };

  const btnKeturunan = document.createElement("button");
  btnKeturunan.textContent = "Hapus dengan keturunan";
  btnKeturunan.style.background = "#f44336";
  btnKeturunan.style.color = "white";
  btnKeturunan.onclick = () => {
    popup.style.display = "none";
    hapusWithChildren(pendingHapusPath, pendingHapusTreeId);
  };

  const btnBatal = document.createElement("button");
  btnBatal.textContent = "Batal";
  btnBatal.style.background = "#607d8b";
  btnBatal.style.color = "white";
  btnBatal.onclick = () => { popup.style.display = "none"; };

  popupButtons.appendChild(btnSaja);
  popupButtons.appendChild(btnKeturunan);
  popupButtons.appendChild(btnBatal);

  popup.style.display = "flex";
  popup.style.alignItems = "center";
  popup.style.justifyContent = "center";
}

async function hapusNodeOnly(path, treeId = "main") {
  if (!isAdmin) return;
  saveToUndo();

  if (treeId === "main") {
    try {
      if (!path || path.length === 0) {
        if (!currentTreeData.children || currentTreeData.children.length === 0) {
          showCustomPopup("Tidak ada anak yang bisa menjadi root baru!", "Peringatan");
          return;
        }
        const anakPertama = currentTreeData.children[0];
        const sisaAnak = currentTreeData.children.slice(1);
        currentTreeData = anakPertama;
        if (sisaAnak.length > 0) {
          if (!currentTreeData.children) currentTreeData.children = [];
          currentTreeData.children.push(...sisaAnak);
        }
        const res = await fetch(`${SUPABASE_URL}/functions/v1/update-tree`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "replace", data: currentTreeData })
        });
        const result = await res.json();
        if (result.success) {
          activePath = null; activeMode = null;
          await loadTree();
          showCustomPopup("Root berhasil dihapus.", "Sukses");
        }
        return;
      }

      const parentPath = path.slice(0, -1);
      const nodeIndex = path[path.length - 1];
      let parent = parentPath.length === 0 ? currentTreeData : getNodeByPath(currentTreeData, parentPath);
      if (!parent || !parent.children) return;

      const nodeToDelete = parent.children[nodeIndex];
      const grandchildren = nodeToDelete.children || [];
      parent.children.splice(nodeIndex, 1);
      if (grandchildren.length > 0) {
        for (let i = 0; i < grandchildren.length; i++) {
          parent.children.splice(nodeIndex + i, 0, grandchildren[i]);
        }
      }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/update-tree`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "replace", data: currentTreeData })
      });
      const result = await res.json();
      if (result.success) {
        activePath = null; activeMode = null;
        await loadTree();
        showCustomPopup("Node berhasil dihapus.", "Sukses");
      }
    } catch (err) {
      showCustomPopup("Error: " + err.message, "Error");
    }
  } else {
    const tree = getTreeDataById(treeId);
    if (!tree) return;
    if (!path || path.length === 0) {
      if (!tree.children || tree.children.length === 0) {
        const idx = extraTrees.findIndex(x => x.id === treeId);
        if (idx >= 0) extraTrees.splice(idx, 1);
      } else {
        const anakPertama = tree.children[0];
        const sisaAnak = tree.children.slice(1);
        const idx = extraTrees.findIndex(x => x.id === treeId);
        if (idx >= 0) {
          extraTrees[idx].data = anakPertama;
          if (!extraTrees[idx].data.children) extraTrees[idx].data.children = [];
          extraTrees[idx].data.children.push(...sisaAnak);
        }
      }
    } else {
      const parentPath = path.slice(0, -1);
      const nodeIndex = path[path.length - 1];
      const parent = parentPath.length === 0 ? tree : getNodeByPath(tree, parentPath);
      if (!parent || !parent.children) return;
      const nodeToDelete = parent.children[nodeIndex];
      const grandchildren = nodeToDelete.children || [];
      parent.children.splice(nodeIndex, 1);
      if (grandchildren.length > 0) {
        for (let i = 0; i < grandchildren.length; i++) {
          parent.children.splice(nodeIndex + i, 0, grandchildren[i]);
        }
      }
    }
    activePath = null; activeMode = null;
    await persistMultiState();
    renderTree();
    showCustomPopup("Node berhasil dihapus.", "Sukses");
  }
}

async function hapusWithChildren(path, treeId = "main") {
  if (!isAdmin) return;

  if (treeId === "main") {
    try {
      saveToUndo();
      if (!path || path.length === 0) {
        showCustomPopup("Yakin hapus seluruh silsilah?", "Konfirmasi", async () => {
          currentTreeData = { name: ">Root |", children: [] };
          await fetch(`${SUPABASE_URL}/functions/v1/update-tree`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "replace", data: currentTreeData })
          });
          activePath = null; activeMode = null;
          await loadTree();
          showCustomPopup("Seluruh silsilah berhasil dihapus.", "Sukses");
        }, true);
        return;
      }
      const res = await fetch(`${SUPABASE_URL}/functions/v1/update-tree`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", path })
      });
      const result = await res.json();
      if (result.success) {
        activePath = null; activeMode = null;
        await loadTree();
        showCustomPopup("Node dan keturunannya berhasil dihapus.", "Sukses");
      }
    } catch (err) {
      showCustomPopup("Error: " + err.message, "Error");
    }
  } else {
    saveToUndo();
    if (!path || path.length === 0) {
      showCustomPopup("Yakin hapus seluruh tree ini?", "Konfirmasi", async () => {
        const idx = extraTrees.findIndex(x => x.id === treeId);
        if (idx >= 0) extraTrees.splice(idx, 1);
        if (typeof manualLinks !== "undefined") {
          for (let i = manualLinks.length - 1; i >= 0; i--) {
            const l = manualLinks[i];
            if ((l.from && l.from.startsWith(treeId + "|")) ||
                (l.to && l.to.startsWith(treeId + "|"))) {
              manualLinks.splice(i, 1);
            }
          }
        }
        if (treeOffsets) delete treeOffsets[treeId];
        activePath = null; activeMode = null;
        await persistMultiState();
        renderTree();
        showCustomPopup("Tree berhasil dihapus.", "Sukses");
      }, true);
      return;
    }
    const tree = getTreeDataById(treeId);
    if (!tree) return;
    const parentPath = path.slice(0, -1);
    const nodeIndex = path[path.length - 1];
    const parent = parentPath.length === 0 ? tree : getNodeByPath(tree, parentPath);
    if (!parent || !parent.children) return;
    parent.children.splice(nodeIndex, 1);
    activePath = null; activeMode = null;
    await persistMultiState();
    renderTree();
    showCustomPopup("Node dan keturunannya berhasil dihapus.", "Sukses");
  }
}

async function saveToSupabase() {
  if (!currentTreeData) return;
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/update-tree`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "replace", data: currentTreeData })
    });
  } catch (err) {
    console.error("Gagal save:", err);
  }
}
/*Stable + multi-tree*/
