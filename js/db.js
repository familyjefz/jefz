// ══════════════════════════════════════════
// db.js — Koneksi & Query ke Turso
// ══════════════════════════════════════════

const TURSO_URL   = 'https://familyjefz-familyjefz.aws-ap-northeast-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODA1MjcyNTgsImlkIjoiMDE5ZThmYWYtZjUwMS03NzZiLTgzM2EtZGM5MzdhZTA5OTY2IiwicmlkIjoiN2EyOTNiMjktNzczMy00ZmI5LWI0ZjgtNjExNWVjZjIyMDg5In0.6HXh7QpNruz6piuK8V-6kxTyRsxf8qaZHHNEIZKRAK8drOp5aojA46DikSRziMnAXsuhPZVqNxYj20LCLqCrDQ';

// ── Core: jalankan satu atau banyak SQL ──────────────────
async function dbRun(requests) {
  const res = await fetch(`${TURSO_URL}/v2/pipeline`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TURSO_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ requests })
  });
  if (!res.ok) throw new Error(`DB error: ${res.status}`);
  const data = await res.json();
  // Cek error per-request
  for (const r of data.results) {
    if (r.type === 'error') throw new Error(r.error?.message || 'Query error');
  }
  return data.results;
}

// ── Helper: buat request execute ────────────────────────
function exec(sql, args = []) {
  return {
    type: 'execute',
    stmt: {
      sql,
      args: args.map(v => {
        if (v === null || v === undefined) return { type: 'null' };
        if (typeof v === 'number')  return { type: 'integer', value: String(v) };
        return { type: 'text', value: String(v) };
      })
    }
  };
}

// ── Helper: parse rows dari hasil query ─────────────────
function parseRows(result) {
  if (!result?.response?.result?.rows) return [];
  const cols = result.response.result.cols.map(c => c.name);
  return result.response.result.rows.map(row =>
    Object.fromEntries(cols.map((c, i) => [c, row[i]?.value ?? null]))
  );
}

// ══════════════════════════════════════════
// SETTINGS
// ══════════════════════════════════════════

export async function dbGetSettings() {
  const [r] = await dbRun([exec('SELECT key, value FROM settings'), { type: 'finish' }]);
  const rows = parseRows(r);
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

export async function dbSetSetting(key, value) {
  await dbRun([
    exec('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime("now"))', [key, value]),
    { type: 'finish' }
  ]);
}

// ══════════════════════════════════════════
// PERSONS
// ══════════════════════════════════════════

export async function dbGetPersons() {
  const [r] = await dbRun([exec('SELECT * FROM persons'), { type: 'finish' }]);
  return parseRows(r);
}

export async function dbAddPerson({ id, name, gender, birth_place, notes, family_id }) {
  await dbRun([
    exec(
      'INSERT INTO persons (id, name, gender, birth_place, notes, family_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))',
      [id, name, gender ?? 'unknown', birth_place ?? null, notes ?? null, family_id ?? null]
    ),
    { type: 'finish' }
  ]);
}

export async function dbUpdatePerson(id, fields) {
  const allowed = ['name', 'gender', 'birth_place', 'notes', 'family_id'];
  const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));
  if (!updates.length) return;
  const setClauses = updates.map(([k]) => `${k} = ?`).join(', ');
  const values     = updates.map(([, v]) => v);
  await dbRun([
    exec(
      `UPDATE persons SET ${setClauses}, updated_at = datetime("now") WHERE id = ?`,
      [...values, id]
    ),
    { type: 'finish' }
  ]);
}

export async function dbDeletePerson(id) {
  await dbRun([
    exec('DELETE FROM node_locks    WHERE node_id   = ?', [id]),
    exec('DELETE FROM relationships WHERE person_id = ? OR related_id = ?', [id, id]),
    exec('DELETE FROM pair_nodes    WHERE husband_id = ? OR wife_id = ?', [id, id]),
    exec('DELETE FROM persons       WHERE id = ?', [id]),
    { type: 'finish' }
  ]);
}

// ══════════════════════════════════════════
// RELATIONSHIPS
// ══════════════════════════════════════════

export async function dbGetRelationships() {
  const [r] = await dbRun([exec('SELECT * FROM relationships'), { type: 'finish' }]);
  return parseRows(r);
}

export async function dbAddRelationship({ id, person_id, related_id, type }) {
  await dbRun([
    exec(
      'INSERT OR IGNORE INTO relationships (id, person_id, related_id, type, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
      [id, person_id, related_id, type]
    ),
    { type: 'finish' }
  ]);
}

export async function dbDeleteRelationship(id) {
  await dbRun([
    exec('DELETE FROM relationships WHERE id = ?', [id]),
    { type: 'finish' }
  ]);
}

// ══════════════════════════════════════════
// FAMILIES
// ══════════════════════════════════════════

export async function dbGetFamilies() {
  const [r] = await dbRun([exec('SELECT * FROM families'), { type: 'finish' }]);
  return parseRows(r);
}

export async function dbAddFamily({ id, name, color }) {
  await dbRun([
    exec(
      'INSERT INTO families (id, name, color, is_visible, created_at) VALUES (?, ?, ?, 1, datetime("now"))',
      [id, name, color]
    ),
    { type: 'finish' }
  ]);
}

export async function dbUpdateFamily(id, fields) {
  const allowed = ['name', 'color', 'is_visible'];
  const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));
  if (!updates.length) return;
  const setClauses = updates.map(([k]) => `${k} = ?`).join(', ');
  const values     = updates.map(([, v]) => v);
  await dbRun([
    exec(`UPDATE families SET ${setClauses} WHERE id = ?`, [...values, id]),
    { type: 'finish' }
  ]);
}

export async function dbDeleteFamily(id) {
  await dbRun([
    exec('UPDATE persons SET family_id = NULL WHERE family_id = ?', [id]),
    exec('DELETE FROM families WHERE id = ?', [id]),
    { type: 'finish' }
  ]);
}

// ══════════════════════════════════════════
// PAIR NODES
// ══════════════════════════════════════════

export async function dbGetPairNodes() {
  const [r] = await dbRun([exec('SELECT * FROM pair_nodes'), { type: 'finish' }]);
  return parseRows(r);
}

export async function dbAddPairNode({ id, husband_id, wife_id, order_num, border_color_left, border_color_right, line_style }) {
  await dbRun([
    exec(
      'INSERT INTO pair_nodes (id, husband_id, wife_id, order_num, border_color_left, border_color_right, line_style, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"))',
      [id, husband_id ?? null, wife_id ?? null, order_num ?? 1, border_color_left ?? null, border_color_right ?? null, line_style ?? 'solid']
    ),
    { type: 'finish' }
  ]);
}

export async function dbUpdatePairNode(id, fields) {
  const allowed = ['husband_id', 'wife_id', 'order_num', 'border_color_left', 'border_color_right', 'line_style'];
  const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));
  if (!updates.length) return;
  const setClauses = updates.map(([k]) => `${k} = ?`).join(', ');
  const values     = updates.map(([, v]) => v);
  await dbRun([
    exec(`UPDATE pair_nodes SET ${setClauses} WHERE id = ?`, [...values, id]),
    { type: 'finish' }
  ]);
}

export async function dbDeletePairNode(id) {
  await dbRun([
    exec('DELETE FROM pair_nodes WHERE id = ?', [id]),
    { type: 'finish' }
  ]);
}

// ══════════════════════════════════════════
// HISTORY (Undo/Redo)
// ══════════════════════════════════════════

export async function dbGetHistory() {
  const [r] = await dbRun([
    exec('SELECT * FROM history ORDER BY step_index ASC'),
    { type: 'finish' }
  ]);
  return parseRows(r);
}

export async function dbPushHistory({ id, action_type, target_id, before_data, after_data, step_index }) {
  // Hapus semua history di atas step_index ini (kalau ada redo yang terbuang)
  // Lalu tambah entry baru, lalu trim ke max 50
  await dbRun([
    exec('DELETE FROM history WHERE step_index >= ?', [step_index]),
    exec(
      'INSERT INTO history (id, action_type, target_id, before_data, after_data, step_index, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))',
      [id, action_type, target_id, JSON.stringify(before_data), JSON.stringify(after_data), step_index]
    ),
    { type: 'finish' }
  ]);
  // Trim ke 50 entri terakhir
  await dbRun([
    exec('DELETE FROM history WHERE step_index NOT IN (SELECT step_index FROM history ORDER BY step_index DESC LIMIT 50)'),
    { type: 'finish' }
  ]);
}

export async function dbClearHistoryAfter(step_index) {
  await dbRun([
    exec('DELETE FROM history WHERE step_index > ?', [step_index]),
    { type: 'finish' }
  ]);
}

// ══════════════════════════════════════════
// ACTIVE SESSIONS
// ══════════════════════════════════════════

export async function dbGetSessions() {
  // Anggap session tidak aktif kalau last_seen > 60 detik lalu
  const [r] = await dbRun([
    exec(`SELECT * FROM active_sessions WHERE last_seen >= datetime('now', '-60 seconds')`),
    { type: 'finish' }
  ]);
  return parseRows(r);
}

export async function dbUpsertSession({ id, role, focus_node_id }) {
  await dbRun([
    exec(
      'INSERT OR REPLACE INTO active_sessions (id, role, last_seen, focus_node_id) VALUES (?, ?, datetime("now"), ?)',
      [id, role, focus_node_id ?? null]
    ),
    { type: 'finish' }
  ]);
}

export async function dbUpdateSessionLastSeen(id, focus_node_id) {
  await dbRun([
    exec(
      'UPDATE active_sessions SET last_seen = datetime("now"), focus_node_id = ? WHERE id = ?',
      [focus_node_id ?? null, id]
    ),
    { type: 'finish' }
  ]);
}

export async function dbDeleteSession(id) {
  await dbRun([
    exec('DELETE FROM node_locks    WHERE locked_by = ?', [id]),
    exec('DELETE FROM active_sessions WHERE id = ?', [id]),
    { type: 'finish' }
  ]);
}

// ══════════════════════════════════════════
// PAGE STATS
// ══════════════════════════════════════════

export async function dbGetStats() {
  const [r] = await dbRun([
    exec('SELECT total_views FROM page_stats WHERE id = "main"'),
    { type: 'finish' }
  ]);
  const rows = parseRows(r);
  return rows[0]?.total_views ?? 0;
}

export async function dbIncrementViews() {
  await dbRun([
    exec('UPDATE page_stats SET total_views = total_views + 1, updated_at = datetime("now") WHERE id = "main"'),
    { type: 'finish' }
  ]);
}

// ══════════════════════════════════════════
// NODE LOCKS
// ══════════════════════════════════════════

export async function dbGetLocks() {
  const [r] = await dbRun([exec('SELECT * FROM node_locks'), { type: 'finish' }]);
  return parseRows(r);
}

export async function dbLockNode(node_id, session_id) {
  await dbRun([
    exec(
      'INSERT OR REPLACE INTO node_locks (node_id, locked_by, locked_at) VALUES (?, ?, datetime("now"))',
      [node_id, session_id]
    ),
    { type: 'finish' }
  ]);
}

export async function dbUnlockNode(node_id) {
  await dbRun([
    exec('DELETE FROM node_locks WHERE node_id = ?', [node_id]),
    { type: 'finish' }
  ]);
}

export async function dbUnlockAllBySession(session_id) {
  await dbRun([
    exec('DELETE FROM node_locks WHERE locked_by = ?', [session_id]),
    { type: 'finish' }
  ]);
}

// ══════════════════════════════════════════
// LOAD ALL (initial load)
// ══════════════════════════════════════════

export async function dbLoadAll() {
  const results = await dbRun([
    exec('SELECT * FROM persons'),
    exec('SELECT * FROM relationships'),
    exec('SELECT * FROM families'),
    exec('SELECT * FROM pair_nodes'),
    exec('SELECT * FROM settings'),
    exec('SELECT total_views FROM page_stats WHERE id = "main"'),
    { type: 'finish' }
  ]);
  return {
    persons:       parseRows(results[0]),
    relationships: parseRows(results[1]),
    families:      parseRows(results[2]),
    pairNodes:     parseRows(results[3]),
    settings:      Object.fromEntries(parseRows(results[4]).map(r => [r.key, r.value])),
    totalViews:    parseRows(results[5])[0]?.total_views ?? 0,
  };
}

// ══════════════════════════════════════════
// UTILITY
// ══════════════════════════════════════════

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
