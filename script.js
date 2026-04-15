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

  let html = "<ul>";

  for (let folder of folders) {
    html += `<li>${folder.name}`;
    html += await buildTree(folder.path);
    html += "</li>";
  }

  html += "</ul>";

  return html;
}

async function loadTree() {
  const tree = await buildTree(basePath);
  document.getElementById("tree").innerHTML = tree;
}

loadTree();
