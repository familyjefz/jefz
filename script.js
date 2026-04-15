const username = "familyjefz";
const repo = "jefz";
const basePath = "keluarga";

// Ambil semua file sekaligus (1 request saja)
async function getAllData() {
  const url = `https://api.github.com/repos/${username}/${repo}/git/trees/main?recursive=1`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Gagal ambil data: " + res.status);
  }

  const data = await res.json();
  return data.tree;
}

// Ubah flat list → tree
function buildTree(data, path) {
  const children = data
    .filter(item => item.path.startsWith(path + "/") && item.type === "tree")
    .map(item => {
      const name = item.path.replace(path + "/", "").split("/")[0];

      return name;
    });

  const unique = [...new Set(children)];

  return unique.map(name => {
    const fullPath = path + "/" + name;

    return {
      text: { name: name },
      children: buildTree(data, fullPath)
    };
  });
}

// Load tree
async function loadTree() {
  try {
    const data = await getAllData();

    const nodes = buildTree(data, basePath);

    if (nodes.length === 0) {
      document.getElementById("tree").innerHTML = "Kosong!";
      return;
    }

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
      nodeStructure: nodes[0] // root pertama
    });

  } catch (e) {
    console.error(e);
    document.getElementById("tree").innerHTML = "Error: " + e.message;
  }
}

loadTree();
