async function loadTree() {
  const res = await fetch("data.json");
  const data = await res.json();

  new Treant({
    chart: {
      container: "#tree",
      rootOrientation: "NORTH",
      connectors: {
        type: "step"
      }
    },
    nodeStructure: convert(data)
  });
}

function convert(node) {
  return {
    text: { name: node.name },
    children: node.children?.map(convert)
  };
}

async function addChild() {
  const nama = prompt("Nama anggota:");
  if (!nama) return;

  await fetch("https://jefz.vercel.app/api/add", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name: nama })
  });

  alert("Berhasil!");
  location.reload();
}

loadTree();
