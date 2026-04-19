const SUPABASE_URL = "https://btyrorlzdyisuvnwmrqp.supabase.co";

async function loadTree() {
  console.log("loadTree mulai");
  
  // Data statis
  const data = {
    name: ">Sekghor |",
    children: [
      { name: ">Salama | Tohin", children: [] },
      { name: ">Ryfan |", children: [] },
      { name: ">Abd Hary |", children: [] }
    ]
  };
  
  console.log("Data:", data);
  
  const container = document.getElementById("tree");
  console.log("Container:", container);
  
  if (!container) {
    document.body.innerHTML = "<h1 style='color:red'>ERROR: Element #tree tidak ditemukan</h1>";
    return;
  }
  
  container.innerHTML = "";
  
  try {
    new Treant({
      chart: {
        container: "#tree",
        rootOrientation: "NORTH",
        connectors: { type: "step" },
        animateOnInit: false,
        levelSeparation: 30,
        siblingSeparation: 30
      },
      nodeStructure: {
        innerHTML: `<div class="node-box"><div class="node-name">${data.name}</div></div>`,
        children: data.children.map(child => ({
          innerHTML: `<div class="node-box"><div class="node-name">${child.name}</div></div>`,
          children: []
        }))
      }
    });
    console.log("Treant berhasil dibuat");
  } catch (err) {
    console.error("Error Treant:", err);
    alert("Error Treant: " + err.message);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM siap, panggil loadTree");
  loadTree();
});
