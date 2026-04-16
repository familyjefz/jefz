export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(200).json({ message: "OK" });
    }

    const token = process.env.GITHUB_TOKEN;

    const body = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;

    const { action, path = [], name, position } = body;

    const response = await fetch("https://api.github.com/repos/familyjefz/jefz/contents/data.json", {
      headers: { Authorization: `token ${token}` }
    });

    const file = await response.json();

    let data = JSON.parse(
      Buffer.from(file.content, "base64").toString()
    );

    // 🔥 backup sebelum perubahan
    const backup = JSON.parse(JSON.stringify(data));

    // ===== AKSI =====

    if (action === "add") {
      let target = data;
      for (let i of path) target = target.children[i];

      if (!target.children) target.children = [];
      target.children.push({ name, children: [] });
    }

    if (action === "edit") {
      let target = data;
      for (let i of path) target = target.children[i];

      target.name = name;
    }

    if (action === "delete") {
      let parent = data;
      for (let i = 0; i < path.length - 1; i++) {
        parent = parent.children[path[i]];
      }

      parent.children.splice(path[path.length - 1], 1);
    }

    if (action === "addParent") {
      if (path.length === 0) {
        data = {
          name: name,
          children: [data]
        };
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

    // 🔢 REORDER
    if (action === "reorder") {
      let parent = data;

      for (let i = 0; i < path.length - 1; i++) {
        parent = parent.children[path[i]];
      }

      const oldIndex = path[path.length - 1];
      let newIndex = position;

      if (newIndex < 0) newIndex = 0;
      if (newIndex >= parent.children.length)
        newIndex = parent.children.length - 1;

      const item = parent.children.splice(oldIndex, 1)[0];
      parent.children.splice(newIndex, 0, item);
    }

    // 🔥 UNDO
    if (action === "undo") {
      if (data._backup) {
        data = data._backup;
      }
    } else {
      data._backup = backup;
    }

    const updated = Buffer.from(
      JSON.stringify(data, null, 2)
    ).toString("base64");

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
