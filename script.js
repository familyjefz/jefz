const username = "familyjefz";
const repo = "jefz";
const basePath = "keluarga";

// Ambil folder
async function getFolders(path) {
  const url = `https://api.github.com/repos/${username}/${repo}/contents/${path}`;
  const res = await fetch(url);
  const data = await res.json();

  return data.filter(item => item.type === "dir");
}

// Build node (fix biar stabil)
async function buildNode(path, name) {
  const folders = await getFolders(path);

  let children = [];

  for (let folder of folders) {
    children.push(await buildNode(folder.path, folder.name));
  }

  return {
    text: { name: name },
    children: children.length ? children : undefined
  };
}

// Load tree (SETTING PENTING ADA DI SINI)
async function loadTree() {
  const root = await buildNode(basePath, "Kakek"); // root kamu

  new Treant({
    chart: {
      container: "#tree",
      rootOrientation: "NORTH",   // dari atas ke bawah
      levelSeparation: 60,        // jarak vertikal
      siblingSeparation: 40,      // jarak antar saudara
      subtreeSeparation: 80,      // jarak antar cabang
      connectors: {
        type: "step",
        style: {
          stroke: "#555",
          "stroke-width": 2
        }
      },
      nodeAlign: "CENTER"
    },
    nodeStructure: root
  });
}

loadTree();
