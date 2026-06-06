// ========== VIEWS & ONLINE ==========
const STATS_TABLE_SETUP = `
  CREATE TABLE IF NOT EXISTS site_stats (key TEXT PRIMARY KEY, value INTEGER NOT NULL DEFAULT 0);
  INSERT OR IGNORE INTO site_stats (key, value) VALUES ('total_views', 0);
`;
const SESSION_ID = Math.random().toString(36).slice(2) + Date.now().toString(36);
let _onlineInterval = null;
let _onlineHeartbeatInterval = null;

async function initStats() {
  // Setup tabel jika belum ada (silent)
  try {
    await tursoFetch("CREATE TABLE IF NOT EXISTS site_stats (key TEXT PRIMARY KEY, value INTEGER NOT NULL DEFAULT 0)");
    await tursoFetch("INSERT OR IGNORE INTO site_stats (key, value) VALUES (?,?)", [{type:"text",value:"total_views"},{type:"integer",value:"0"}]);
    await tursoFetch("CREATE TABLE IF NOT EXISTS online_sessions (session_id TEXT PRIMARY KEY, last_seen INTEGER NOT NULL)");
  } catch(e) {}

  // Tambah view count
  try {
    await tursoFetch("UPDATE site_stats SET value = value + 1 WHERE key = ?", [{type:"text",value:"total_views"}]);
  } catch(e) {}

  // Register session online
  try {
    const now = Date.now();
    await tursoFetch(
      "INSERT INTO online_sessions (session_id, last_seen) VALUES (?,?) ON CONFLICT(session_id) DO UPDATE SET last_seen=excluded.last_seen",
      [{type:"text",value:SESSION_ID},{type:"integer",value:String(now)}]
    );
  } catch(e) {}

  // Update display
  updateStatsDisplay();

  // Heartbeat tiap 20 detik
  _onlineHeartbeatInterval = setInterval(async () => {
    try {
      await tursoFetch(
        "INSERT INTO online_sessions (session_id, last_seen) VALUES (?,?) ON CONFLICT(session_id) DO UPDATE SET last_seen=excluded.last_seen",
        [{type:"text",value:SESSION_ID},{type:"integer",value:String(Date.now())}]
      );
    } catch(e) {}
    updateStatsDisplay();
  }, 20000);

  // Cleanup saat keluar
  window.addEventListener("beforeunload", () => {
    clearInterval(_onlineHeartbeatInterval);
    navigator.sendBeacon && navigator.sendBeacon("", "");
    tursoFetch("DELETE FROM online_sessions WHERE session_id = ?", [{type:"text",value:SESSION_ID}]).catch(()=>{});
  });
}

async function updateStatsDisplay() {
  try {
    // Total views
    const r1 = await tursoFetch("SELECT value FROM site_stats WHERE key = ?", [{type:"text",value:"total_views"}]);
    const views = r1?.rows?.[0]?.[0]?.value ?? r1?.rows?.[0]?.[0] ?? 0;

    // Online: session yang last_seen dalam 40 detik terakhir
    const cutoff = Date.now() - 40000;
    // Bersihkan session lama
    await tursoFetch("DELETE FROM online_sessions WHERE last_seen < ?", [{type:"integer",value:String(cutoff)}]);
    const r2 = await tursoFetch("SELECT COUNT(*) FROM online_sessions WHERE last_seen >= ?", [{type:"integer",value:String(cutoff)}]);
    const online = r2?.rows?.[0]?.[0]?.value ?? r2?.rows?.[0]?.[0] ?? 1;

    const el = document.getElementById("stats-display");
    if (el) el.innerHTML = `👁 ${Number(views).toLocaleString()} &nbsp;|&nbsp; 🟢 ${online}`;
  } catch(e) {}
}
