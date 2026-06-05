// ========== TURSO CONFIG ==========
// Ganti nilai berikut dengan credentials Turso kamu:
const TURSO_URL = "https://familyjefz-familyjefz.aws-ap-northeast-1.turso.io";
const TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODA2OTYyNTgsImlkIjoiMDE5ZTk5YzQtNTYwMS03MzI5LWJkMjItM2U5NmViNjQyYjI5IiwicmlkIjoiNDAxNzg5MjktMDFhNS00NTgyLWE2OGQtZmNkYWY0ODU3ZWIzIn0.4hQxgNejIPqzFyWnznqO3my4-9VNxG74U0fFL92-4Cn8PuE29qHbkR_2JiBoNgQ_hb4Saz5okjjEtiNFf4J1Dg";

// Helper: execute SQL di Turso via HTTP API
async function tursoFetch(sql, args = []) {
  const res = await fetch(`${TURSO_URL}/v2/pipeline`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${TURSO_TOKEN}`
    },
    body: JSON.stringify({
      requests: [
        { type: "execute", stmt: { sql, args } },
        { type: "close" }
      ]
    })
  });
  if (!res.ok) throw new Error(`Turso HTTP ${res.status}`);
  const data = await res.json();
  const result = data.results?.[0];
  if (result?.type === "error") throw new Error(result.error?.message || "Turso error");
  return result?.response?.result;
}

// ========== SETUP: Buat tabel jika belum ada ==========
// Panggil sekali saat pertama deploy, atau jalankan manual di Turso CLI:
// CREATE TABLE IF NOT EXISTS tree_data (id INTEGER PRIMARY KEY, data TEXT NOT NULL);
// INSERT OR IGNORE INTO tree_data (id, data) VALUES (1, '{}');
// INSERT OR IGNORE INTO tree_data (id, data) VALUES (2, '{}');
