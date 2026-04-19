async function loadTree() {
  try {
    // Data statis sementara untuk test
    currentTreeData = {
      "name": ">Sekghor |",
      "children": [
        {
          "name": ">Salama | Tohin",
          "children": [
            {
              "name": ">Nahrowi | Suki'ah",
              "children": []
            }
          ]
        },
        {
          "name": ">Ryfan |",
          "children": []
        },
        {
          "name": ">Abd Hary |",
          "children": []
        }
      ]
    };
    resetSiblingColors();
    assignSiblingGroups(currentTreeData);
    renderTree();
  } catch (err) {
    console.error("Gagal load tree:", err);
    alert("Gagal memuat data. Periksa koneksi.");
  }
}
