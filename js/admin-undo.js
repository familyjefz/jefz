// ========== UNDO/REDO ==========
let undoStack = [];
let redoStack = [];

function saveToUndo(data) {
  if (data && isAdmin) {
    undoStack.push(JSON.parse(JSON.stringify(data)));
    redoStack = [];
    if (undoStack.length > 50) undoStack.shift();
  }
}

function undo() {
  if (undoStack.length === 0) {
    showCustomPopup("Tidak ada aksi yang bisa di-undo", "Info");
    return false;
  }
  const previousData = undoStack.pop();
  redoStack.push(JSON.parse(JSON.stringify(currentTreeData)));
  return previousData;
}

function redo() {
  if (redoStack.length === 0) {
    showCustomPopup("Tidak ada aksi yang bisa di-redo", "Info");
    return false;
  }
  const nextData = redoStack.pop();
  undoStack.push(JSON.parse(JSON.stringify(currentTreeData)));
  return nextData;
}

async function undoAction() {
  if (!isAdmin) return;
  const previousData = undo();
  if (previousData) {
    currentTreeData = previousData;
    resetSiblingColors();
    assignSiblingGroups(currentTreeData);
    renderTree();
    await saveToSupabase();
    showCustomPopup("Undo berhasil!", "Sukses");
  }
}

async function redoAction() {
  if (!isAdmin) return;
  const nextData = redo();
  if (nextData) {
    currentTreeData = nextData;
    resetSiblingColors();
    assignSiblingGroups(currentTreeData);
    renderTree();
    await saveToSupabase();
    showCustomPopup("Redo berhasil!", "Sukses");
  }
}

// ========== POPUP HAPUS ==========
let pendingHapusPath = null;

function showHapusPopup(path) {
  pendingHapusPath = path;
  
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
    hapusNodeOnly(pendingHapusPath);
  };
  
  const btnKeturunan = document.createElement("button");
  btnKeturunan.textContent = "Hapus dengan keturunan";
  btnKeturunan.style.background = "#f44336";
  btnKeturunan.style.color = "white";
  btnKeturunan.onclick = () => {
    popup.style.display = "none";
    hapusWithChildren(pendingHapusPath);
  };
  
  const btnBatal = document.createElement("button");
  btnBatal.textContent = "Batal";
  btnBatal.style.background = "#607d8b";
  btnBatal.style.color = "white";
  btnBatal.onclick = () => {
    popup.style.display = "none";
  };
  
  popupButtons.appendChild(btnSaja);
  popupButtons.appendChild(btnKeturunan);
  popupButtons.appendChild(btnBatal);
  
  popup.style.display = "flex";
  popup.style.alignItems = "center";
  popup.style.justifyContent = "center";
}

async function hapusNodeOnly(path) {
  if (!isAdmin) return;
  
  try {
    saveToUndo(currentTreeData);
    
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
        activePath = null;
        activeMode = null;
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
      activePath = null;
      activeMode = null;
      await loadTree();
      showCustomPopup("Node berhasil dihapus.", "Sukses");
    }
  } catch (err) {
    showCustomPopup("Error: " + err.message, "Error");
  }
}

async function hapusWithChildren(path) {
  if (!isAdmin) return;
  
  try {
    saveToUndo(currentTreeData);
    
    if (!path || path.length === 0) {
      showCustomPopup("Yakin hapus seluruh silsilah?", "Konfirmasi", async () => {
        currentTreeData = { name: ">Root |", children: [] };
        
        await fetch(`${SUPABASE_URL}/functions/v1/update-tree`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "replace", data: currentTreeData })
        });
        
        activePath = null;
        activeMode = null;
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
      activePath = null;
      activeMode = null;
      await loadTree();
      showCustomPopup("Node dan keturunannya berhasil dihapus.", "Sukses");
    }
  } catch (err) {
    showCustomPopup("Error: " + err.message, "Error");
  }
}

// ========== SAVE TO SUPABASE ==========
async function saveToSupabase() {
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
/*Stable*/
