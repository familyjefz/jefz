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

// Convert folder → struktur Treant
async function buildNode(path, name) {
  const folders = await getFolders(path);

  let node = {
    text: { name: name },
    children: []
  };

  for (let folder of folders) {
    const child = await buildNode(folder.path, folder.name);
    node.children.push(child);
  }

  return node;
}

// Load tree
async function loadTree() {
  try {
    const root = await buildNode(basePath, "Keluarga");

    new Treant({
      chart: {
        container: "#tree",
        nodeAlign: "BOTTOM",
        connectors: {
          type: "step"
        }
      },
      nodeStructure: root
    });

  } catch (e) {
    document.getElementById("tree").innerHTML = "Gagal load data!";
  }
}

loadTree();
