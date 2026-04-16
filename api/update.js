export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(200).json({ ok: true });
    }

    const token = process.env.GITHUB_TOKEN;

    const body = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;

    const { action, path = [], name, position } = body;

    const fileRes = await fetch(
      "https://api.github.com/repos/familyjefz/jefz/contents/data.json",
      {
        headers: { Authorization: `token ${token}` }
      }
    );

    const file = await fileRes.json();

    let data = JSON.parse(
      Buffer.from(file.content, "base64").toString()
    );

    const backup = JSON.parse(JSON.stringify(data));

    // 🔥 GET NODE
    function getNode(p) {
      let node = data;
      for (let i of p) node = node.children[i];
      return node;
    }

    // 🔥 GET PARENT
    function getParent(p) {
      let node = data;
      for (let i = 0; i < p.length - 1; i++) {
        node = node.children[p[i]];
      }
      return node;
    }

    // ========== ACTIONS ==========

    // ✏️ EDIT
    if (action === "edit") {
      const node = getNode(path);
      node.name = name;
    }

    // ❌ DELETE
    if (action === "delete") {
      const parent = getParent(path);
      parent.children.splice(path[path.length - 1], 1);
    }

    // ⬆️ ADD PARENT
    if (action === "addParent") {
      if (path.length === 0) {
        data = {
          name,
          children: [data]
        };
      } else {
        const parent = getParent(path);
        const idx = path[path.length - 1];

        parent.children[idx] = {
          name,
          children: [parent.children[idx]]
        };
      }
    }

    // 🔢 REORDER
    if (action === "reorder") {
      const parent = getParent(path);
      const oldIndex = path[path.length - 1];

      let newIndex = position;

      if (newIndex < 0) newIndex = 0;
      if (newIndex >= parent.children.length)
        newIndex = parent.children.length - 1;

      const item = parent.children.splice(oldIndex, 1)[0];
      parent.children.splice(newIndex, 0, item);
    }

    // 🔥 SAVE BACKUP
    data._backup = backup;

    const updated = Buffer.from(
      JSON.stringify(data, null, 2)
    ).toString("base64");

    await fetch(
      "https://api.github.com/repos/familyjefz/jefz/contents/data.json",
      {
        method: "PUT",
        headers: { Authorization: `token ${token}` },
        body: JSON.stringify({
          message: "Update tree",
          content: updated,
          sha: file.sha
        })
      }
    );

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
