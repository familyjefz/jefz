// ========== LOAD ALL FAMILIES ==========
async function loadAllFamilies() {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/get-all-families`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Gagal load semua keluarga:", err);
    return [];
  }
}

async function loadSingleFamily(id) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/get-tree?id=${id}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Gagal load keluarga:", err);
    return null;
  }
}

async function loadTree() {
  try {
    let data;
    if (CURRENT_FAMILY_ID === "all") {
      data = await loadAllFamilies();
      if (!data || data.length === 0) data = [];
    } else {
      data = await loadSingleFamily(CURRENT_FAMILY_ID);
    }
    
    currentTreeData = data;
    resetSiblingColors();
    
    if (Array.isArray(currentTreeData)) {
      currentTreeData.forEach(root => assignSiblingGroups(root));
    } else {
      assignSiblingGroups(currentTreeData);
    }
    
    renderTree();
    updateFamilySelector();
  } catch (err) {
    console.error("Gagal load tree:", err);
    alert("Gagal memuat data. Periksa koneksi.");
  }
}

function updateFamilySelector() {
  const selector = document.getElementById("family-selector");
  if (!selector) return;
  
  if (Array.isArray(currentTreeData) && currentTreeData.length > 0) {
    while (selector.options.length > 1) {
      selector.remove(1);
    }
    
    currentTreeData.forEach((family, idx) => {
      const option = document.createElement("option");
      option.value = idx + 1;
      let displayName = family.name;
      if (displayName && displayName.includes("|")) {
        displayName = displayName.split("|")[0].trim();
      }
      option.text = displayName || `Keluarga ${idx + 1}`;
      selector.appendChild(option);
    });
  }
  
  selector.value = CURRENT_FAMILY_ID;
}

function onFamilyChange() {
  const selector = document.getElementById("family-selector");
  CURRENT_FAMILY_ID = selector.value;
  loadTree();
}

function renderTree() {
  const container = document.getElementById("tree");
  if (!container) return;
  
  const wrapper = document.getElementById("tree-wrapper");
  const savedLeft = wrapper ? wrapper.scrollLeft : 800;
  const savedTop = wrapper ? wrapper.scrollTop : 400;
  
  container.innerHTML = "";
  
  if (Array.isArray(currentTreeData) && currentTreeData.length > 1) {
    const forestContainer = document.createElement("div");
    forestContainer.style.display = "flex";
    forestContainer.style.flexDirection = "row";
    forestContainer.style.justifyContent = "center";
    forestContainer.style.alignItems = "flex-start";
    forestContainer.style.gap = "50px";
    forestContainer.style.flexWrap = "wrap";
    forestContainer.style.padding = "20px";
    
    currentTreeData.forEach((root, idx) => {
      const treeContainer = document.createElement("div");
      treeContainer.style.display = "inline-block";
      treeContainer.style.verticalAlign = "top";
      treeContainer.style.border = "1px solid #ddd";
      treeContainer.style.borderRadius = "10px";
      treeContainer.style.padding = "10px";
      treeContainer.style.backgroundColor = "rgba(255,255,255,0.5)";
      
      const title = document.createElement("div");
      title.style.textAlign = "center";
      title.style.fontWeight = "bold";
      title.style.marginBottom = "10px";
      title.style.padding = "5px";
      title.style.backgroundColor = "#f0f0f0";
      title.style.borderRadius = "5px";
      let displayName = root.name;
      if (displayName && displayName.includes("|")) {
        displayName = displayName.split("|")[0].trim();
      }
      title.innerText = displayName;
      treeContainer.appendChild(title);
      
      const tempDiv = document.createElement("div");
      tempDiv.id = `temp-tree-${idx}`;
      treeContainer.appendChild(tempDiv);
      
      forestContainer.appendChild(treeContainer);
      
      new Treant({
        chart: {
          container: `#temp-tree-${idx}`,
          rootOrientation: "NORTH",
          connectors: { type: "step" },
          animateOnInit: false,
          levelSeparation: 12,
          siblingSeparation: 8,
          subTeeSeparation: 8
        },
        nodeStructure: convert(root, [idx], 1)
      });
    });
    
    container.appendChild(forestContainer);
  } else {
    const singleRoot = Array.isArray(currentTreeData) ? currentTreeData[0] : currentTreeData;
    if (singleRoot) {
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
        nodeStructure: convert(singleRoot, [], 1)
      });
    }
  }
  
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

// ========== TAMBAH KELUARGA BARU ==========
async function addNewFamily() {
  if (!isAdmin) {
    alert("Hanya admin yang dapat menambah keluarga baru!");
    return;
  }
  
  const familyName = document.getElementById("new-family-name").value.trim();
  if (!familyName) {
    document.getElementById("family-error").innerText = "Nama keluarga tidak boleh kosong!";
    return;
  }
  
  document.getElementById("family-error").innerText = "";
  closeAddFamilyModal();
  
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/add-family`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: familyName })
    });
    const result = await res.json();
    if (result.success) {
      alert("Keluarga baru berhasil ditambahkan!");
      CURRENT_FAMILY_ID = "all";
      await loadTree();
    } else {
      alert("Gagal: " + (result.error || "Error"));
    }
  } catch (err) {
    alert("Error: " + err.message);
  }
}

function showAddFamilyModal() {
  if (!isAdmin) return;
  document.getElementById("add-family-modal").style.display = "block";
  document.getElementById("new-family-name").value = "";
  document.getElementById("family-error").innerText = "";
  setTimeout(() => document.getElementById("new-family-name").focus(), 100);
}

function closeAddFamilyModal() {
  document.getElementById("add-family-modal").style.display = "none";
}
