export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(200).json({ ok: true });
    }

    const token = process.env.GITHUB_TOKEN;

    const body = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;

    const { path = [], name } = body;

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

    // 🔥 cari node target
    let target = data;

    for (let i of path) {
      if (!target.children) target.children = [];
      target = target.children[i];
    }

    if (!target.children) target.children = [];

    target.children.push({
      name,
      children: []
    });

    const updated = Buffer.from(
      JSON.stringify(data, null, 2)
    ).toString("base64");

    await fetch(
      "https://api.github.com/repos/familyjefz/jefz/contents/data.json",
      {
        method: "PUT",
        headers: { Authorization: `token ${token}` },
        body: JSON.stringify({
          message: "Add member",
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
