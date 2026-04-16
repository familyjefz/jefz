export default async function handler(req, res) {
  const token = process.env.GITHUB_TOKEN;

  const response = await fetch("https://api.github.com/repos/familyjefz/jefz/contents/data.json", {
    headers: {
      Authorization: `token ${token}`
    }
  });

  const file = await response.json();
  const content = JSON.parse(atob(file.content));

  const body = JSON.parse(req.body);

  content.children.push({
    name: body.name
  });

  const updated = btoa(JSON.stringify(content, null, 2));

  await fetch("https://api.github.com/repos/familyjefz/jefz/contents/data.json", {
    method: "PUT",
    headers: {
      Authorization: `token ${token}`
    },
    body: JSON.stringify({
      message: "Tambah anggota",
      content: updated,
      sha: file.sha
    })
  });

  res.json({ success: true });
}
