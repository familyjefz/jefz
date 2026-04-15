const username = "familyjefz";
const repo = "jefz";
const basePath = "keluarga";

async function getFolders(path) {
  const url = `https://api.github.com/repos/${username}/${repo}/contents/${path}`;
  const res = await fetch(url);
  const data = await res.json();

  return data.filter(item => item.type === "dir");
}

async function buildTree(path) {
  const folders = await getFolders(path);

  if (folders.length === 0) return "";

  let html = "<ul>";

  for (let folder of folders) {
    html += `<li><span>${folder.name}</span>`;
    html += await buildTree(folder.path);
    html += "</li>";
  }

  html += "</ul>";

  return html;
}

async function loadTree() {
  try {
    const treeHTML = await buildTree(basePath);
    document.getElementById("tree").innerHTML = treeHTML;
  } catch (e) {
    document.getElementById("tree").innerHTML = "Gagal load data!";
  }
}

loadTree();
