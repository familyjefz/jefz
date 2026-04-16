async function loadTree() {
  const res = await fetch("data.json?v=" + Date.now());
  const data = await res.json();

  window.treeData = data; // simpan global

  new Treant({
    chart: {
      container: "#tree",
      rootOrientation: "NORTH",
      connectors: { type: "step" }
    },
    nodeStructure: convert(data)
  });
}

// convert + path tracking
function convert(node, path = []) {
  return {
    innerHTML: `
      <div>
        ${node.name}<br>
        <button onclick='showOptions(${JSON.stringify(path)})'>⚙️</button>
      </div>
    `,
    children: node.children?.map((child, i) =>
      convert(child, [...path, i])
    )
  };
}

// tampilkan menu
function showOptions(path) {
  const aksi = prompt(
    "Pilih:\n1. Tambah\n2. Ubah\n3. Hapus"
  );

  if (aksi === "1") tambah(path);
  if (aksi === "2") ubah(path);
  if (aksi === "3") hapus(path);
}

// tambah anak
async function tambah(path) {
  const nama = prompt("Nama anak:");
  if (!nama) return;

  await fetch("https://jefz.vercel.app/api/update", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      action: "add",
      path,
      name: nama
    })
  });

  location.reload();
}

// ubah nama
async function ubah(path) {
  const nama = prompt("Nama baru:");
  if (!nama) return;

  await fetch("https://jefz.vercel.app/api/update", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      action: "edit",
      path,
      name: nama
    })
  });

  location.reload();
}

// hapus
async function hapus(path) {
  if (!confirm("Yakin hapus?")) return;

  await fetch("https://jefz.vercel.app/api/update", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      action: "delete",
      path
    })
  });

  location.reload();
}

loadTree();
