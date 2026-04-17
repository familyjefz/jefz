export default async function handler(req, res) {
  // Tambahkan CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      console.error('GITHUB_TOKEN tidak diset');
      return res.status(500).json({ error: 'Server configuration error: GITHUB_TOKEN missing' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { action, path = [], name, position } = body;

    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    // Ambil file data.json dari GitHub
    const fileRes = await fetch(
      'https://api.github.com/repos/familyjefz/jefz/contents/data.json',
      {
        headers: { Authorization: `token ${token}` }
      }
    );

    if (!fileRes.ok) {
      console.error('GitHub API error:', fileRes.status, fileRes.statusText);
      return res.status(fileRes.status).json({ error: `GitHub API error: ${fileRes.statusText}` });
    }

    const file = await fileRes.json();
    let data = JSON.parse(Buffer.from(file.content, 'base64').toString());
    const backup = JSON.parse(JSON.stringify(data));

    // Helper functions
    function getNode(p) {
      let node = data;
      for (let i = 0; i < p.length; i++) {
        if (!node.children || !node.children[p[i]]) {
          throw new Error('Node not found at path: ' + p.join('->'));
        }
        node = node.children[p[i]];
      }
      return node;
    }

    function getParent(p) {
      if (p.length === 0) return null;
      let node = data;
      for (let i = 0; i < p.length - 1; i++) {
        node = node.children[p[i]];
      }
      return node;
    }

    // ========== ACTIONS ==========
    if (action === 'add') {
      const target = getNode(path);
      if (!target.children) target.children = [];
      target.children.push({ name: name, children: [] });
    }
    else if (action === 'edit') {
      const node = getNode(path);
      node.name = name;
    }
    else if (action === 'delete') {
      const parent = getParent(path);
      if (parent && parent.children) {
        parent.children.splice(path[path.length - 1], 1);
      } else if (path.length === 0) {
        return res.status(400).json({ error: 'Cannot delete root' });
      }
    }
    else if (action === 'addParent') {
      if (path.length === 0) {
        data = { name: name, children: [data] };
      } else {
        const parent = getParent(path);
        const idx = path[path.length - 1];
        const currentNode = parent.children[idx];
        parent.children[idx] = { name: name, children: [currentNode] };
      }
    }
    else if (action === 'reorder') {
      const parent = getParent(path);
      if (!parent || !parent.children) {
        return res.status(400).json({ error: 'Cannot reorder root' });
      }
      const oldIndex = path[path.length - 1];
      let newIndex = position;
      if (newIndex < 0) newIndex = 0;
      if (newIndex >= parent.children.length) newIndex = parent.children.length - 1;
      if (oldIndex === newIndex) {
        return res.json({ success: true });
      }
      const item = parent.children.splice(oldIndex, 1)[0];
      parent.children.splice(newIndex, 0, item);
    }
    else {
      return res.status(400).json({ error: 'Unknown action: ' + action });
    }

    // Simpan backup
    data._backup = backup;

    // Upload ke GitHub
    const updated = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');

    const updateRes = await fetch(
      'https://api.github.com/repos/familyjefz/jefz/contents/data.json',
      {
        method: 'PUT',
        headers: {
          Authorization: `token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Update tree - ' + action,
          content: updated,
          sha: file.sha
        })
      }
    );

    if (!updateRes.ok) {
      const errorData = await updateRes.json();
      console.error('GitHub update error:', errorData);
      return res.status(updateRes.status).json({ error: errorData.message });
    }

    res.json({ success: true });

  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ error: err.message });
  }
}
