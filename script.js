const username = "familyjefz";
const repo = "jefz";
const basePath = "keluarga";

// Ambil folder dari GitHub
async function getFolders(path) {
  const url = `https://api.github.com/repos/${username}/${repo}/contents/${path}`;
  const res = await fetch(url);
  const data = await res.json();

  return data.filter(item => item.type === "dir");
}

// Build node tree dari folder
async function buildNode(path, name) {
  const folders = await getFolders(path);

  let children = [];

  for (let folder of folders) {
    const child = await buildNode(folder.path, folder.name);
    children.push(child);
  }

  return {
    text: { name: name },
    children: children.length ? children : undefined
  };
}

// Load tree (FIX: tidak dobel)
async function loadTree() {
  try {
    const folders = await getFolders(basePath);

    if (folders.length === 0) {
      document.getElementById("tree").innerHTML = "Kosong!";
      return;
    }

    // Ambil folder pertama sebagai root
    const root = await buildNode(folders[0].path, folders[0].name);

    new Treant({
      chart: {
        container: "#tree",
        rootOrientation: "NORTH",
        levelSeparation: 70,
        siblingSeparation: 50,
        subtreeSeparation: 90,
        connectors: {
          type: "step",
          style: {
            stroke: "#000",
            "stroke-width": 2
          }
        },
        nodeAlign: "CENTER"
      },
      nodeStructure: root
    });

  } catch (e) {
    document.getElementById("tree").innerHTML = "Gagal load data!";
  }
}

// Jalankan
loadTree();
