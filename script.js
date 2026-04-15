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

// Build node tree
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

// Load tree
async function loadTree() {
  try {
    const root = await buildNode(basePath, "Keluarga");

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

loadTree();
