export default async function handler(req, res) {
  try {
    // ❗ Kalau dibuka dari browser (GET), jangan error
    if (req.method !== "POST") {
      return res.status(200).json({ message: "API aktif (gunakan POST)" });
    }

    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      return res.status(500).json({ error: "Token tidak ada di Vercel" });
    }

    // ambil body aman
    const body = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;

    if (!body.name) {
      return res.status(400).json({ error: "Nama kosong" });
    }

    // ambil file dari GitHub
    const response = await fetch(
      "https://api.github.com/repos/familyjefz/jefz/contents/data.json",
      {
        headers: {
          Authorization: `token ${token}`
        }
      }
    );

    const file = await response.json();

    if (!file.content) {
      return res.status(500).json({ error: "Gagal ambil data.json" });
    }

    // decode base64
    const content = JSON.parse(
      Buffer.from(file.content, "base64").toString()
    );

    if (!content.children) content.children = [];

    // tambah data
    content.children.push({
      name: body.name,
      children: []
    });

    // encode lagi
    const updated = Buffer.from(
      JSON.stringify(content, null, 2)
    ).toString("base64");

    // kirim update ke GitHub
    const update = await fetch(
      "https://api.github.com/repos/familyjefz/jefz/contents/data.json",
      {
        method: "PUT",
        headers: {
          Authorization: `token ${token}`
        },
        body: JSON.stringify({
          message: "Tambah anggota",
          content: updated,
          sha: file.sha
        })
      }
    );

    const result = await update.json();

    if (result.error) {
      return res.status(500).json(result);
    }

    res.status(200).json({ success: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
