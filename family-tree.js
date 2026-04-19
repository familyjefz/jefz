async function loadAllFamilies() {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/get-all-families`);
    const data = await res.json();
    
    // Data dari Edge Function sudah berupa array
    if (Array.isArray(data)) {
      return data;
    } else if (data && Array.isArray(data.data)) {
      return data.data;
    } else {
      console.error("Format data tidak dikenal:", data);
      return [];
    }
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
      console.log("Data semua keluarga:", data); // Untuk debugging
    } else {
      data = await loadSingleFamily(CURRENT_FAMILY_ID);
    }
    
    currentTreeData = data;
    resetSiblingColors();
    
    if (Array.isArray(currentTreeData)) {
      currentTreeData.forEach(root => {
        if (root && typeof root === 'object') {
          assignSiblingGroups(root);
        }
      });
    } else if (currentTreeData && typeof currentTreeData === 'object') {
      assignSiblingGroups(currentTreeData);
    }
    
    renderTree();
    updateFamilySelector();
  } catch (err) {
    console.error("Gagal load tree:", err);
    alert("Gagal memuat data. Periksa koneksi.");
  }
}
