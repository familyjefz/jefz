// ========== DATA STATIS LANGSUNG (TEST) ==========
const STATIC_FAMILIES = [
  {
    name: ">Sekghor |",
    children: [
      { name: ">Salama | Tohin", children: [] },
      { name: ">Ryfan |", children: [] },
      { name: ">Abd Hary |", children: [] }
    ]
  },
  {
    name: ">Budi |",
    children: []
  }
];

async function loadAllFamilies() {
  console.log("loadAllFamilies: pakai data statis");
  return STATIC_FAMILIES;
}

async function loadSingleFamily(id) {
  console.log("loadSingleFamily: pakai data statis, id=", id);
  if (id == 1) return STATIC_FAMILIES[0];
  if (id == 2) return STATIC_FAMILIES[1];
  return null;
}

async function loadTree() {
  console.log("loadTree mulai, currentFamilyId =", currentFamilyId);
  
  try {
    let data;
    if (currentFamilyId === "all") {
      data = await loadAllFamilies();
    } else {
      data = await loadSingleFamily(parseInt(currentFamilyId));
    }
    
    currentTreeData = data;
    resetSiblingColors();
    
    if (Array.isArray(currentTreeData)) {
      currentTreeData.forEach(root => assignSiblingGroups(root));
    } else if (currentTreeData) {
      assignSiblingGroups(currentTreeData);
    }
    
    renderTree();
    updateFamilySelector(currentTreeData);
  } catch (err) {
    console.error("Gagal load tree:", err);
    alert("Gagal memuat data. Periksa koneksi.");
  }
}
