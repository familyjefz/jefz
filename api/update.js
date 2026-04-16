export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(200).json({ message: "OK" });
    }

    const token = process.env.GITHUB_TOKEN;

    const body = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;

    const { action, path, name } = body;

    const response = await fetch("https://api.github.com/repos/familyjefz/jefz/contents/data.json", {
      headers: { Authorization: `token ${token}` }
    });

    const file = await response.json();
    const data = JSON.parse(Buffer.from(file.content, "base64").toString());

    let target = data;

    for (let i of path) {
      target = target.children[i];
    }

    // tambah anak
    if (action === "add") {
      if (!target.children) target.children = [];
      target.children.push({ name, children: [] });
    }

    // ubah nama
    if (action === "edit") {
      target.name = name;
    }

    // hapus
    if (action === "delete") {
      let parent = data;
      for (let i = 0; i < path.length - 1; i++) {
        parent = parent.children[path[i]];
      }
      parent.children.splice(path[path.length - 1], 1);
    }

    // tambah orang tua
    if (action === "addParent") {
      if (path.length === 0) {
        const newRoot = {
          name: name,
          children: [data]
        };
        Object.assign(data, newRoot);
      } else {
        let parent = data;
        for (let i = 0; i < path.length - 1; i++) {
          parent = parent.children[path[i]];
        }

        const index = path[path.length - 1];

        parent.children[index] = {
          name: name,
          children: [parent.children[index]]
        };
      }
    }

    const updated = Buffer.from(JSON.stringify(data, null, 2)).toString("base64");

    await fetch("https://api.github.com/repos/familyjefz/jefz/contents/data.json", {
      method: "PUT",
      headers: { Authorization: `token ${token}` },
      body: JSON.stringify({
        message: "Update tree",
        content: updated,
        sha: file.sha
      })
    });

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
