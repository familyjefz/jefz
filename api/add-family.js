export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.SUPABASE_URL;
    
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }
    
    // Ambil data saat ini
    const getRes = await fetch(`${supabaseUrl}/functions/v1/get-tree`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    let currentData = await getRes.json();
    
    // Jika masih object, konversi ke array
    if (!Array.isArray(currentData)) {
      currentData = [currentData];
    }
    
    // Tambahkan root baru
    currentData.push({
      name: name,
      children: []
    });
    
    // Update ke database
    const updateRes = await fetch(`${supabaseUrl}/functions/v1/update-tree`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ 
        action: "replace",
        data: currentData
      })
    });
    
    const result = await updateRes.json();
    
    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: err.message });
  }
}
