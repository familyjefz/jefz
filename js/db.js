cat > /mnt/user-data/outputs/js/db.js << 'ENDOFFILE'
// ══════════════════════════════════════════
// db.js — Koneksi & Query ke Turso
// Menggunakan @libsql/client (CORS-safe)
// ══════════════════════════════════════════

import { createClient } from 'https://esm.sh/@libsql/client@0.14.0/web';

const _db = createClient({
  url:       'libsql://familyjefz-familyjefz.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODA1MjcyNTgsImlkIjoiMDE5ZThmYWYtZjUwMS03NzZiLTgzM2EtZGM5MzdhZTA5OTY2IiwicmlkIjoiN2EyOTNiMjktNzczMy00ZmI5LWI0ZjgtNjExNWVjZjIyMDg5In0.6HXh7QpNruz6piuK8V-6kxTyRsxf8qaZHHNEIZKRAK8drOp5aojA46DikSRziMnAXsuhPZVqNxYj20LCLqCrDQ',
});

// ── Core: jalankan satu SQL ──────────────────────────────
async function dbRun(sql, args = []) {
  return await _db.execute({ sql, args });
}

// ── Core: jalankan banyak SQL sekaligus ─────────────────
async function dbBatch(stmts) {
  return await _db.batch(stmts);
}

// ── Helper: parse rows ───────────────────────────────────
function parseRows(result) {
  if (!result?.rows) return [];
  return result.rows.map(row => {
    const obj = {};
    result.columns.forEach((col, i) => { obj[col] = row[i] ?? null; });
    return obj;
  });
}

// ══════════════════════════════════════════
// SETTINGS
// ══════════════════════════════════════════

export async function dbGetSettings() {
  const r = await dbRun('SELECT key, value FROM settings');
  return Object.fromEntries(parseRows(r).map(r => [r.key, r.value]));
}

export async function dbSetSetting(key, value) {
  await dbRun(
    'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime("now"))',
    [key, value]
  );
}

// ══════════════════════════════════════════
// PERSONS
// ══════════════════════════════════════════

export async function dbGetPersons() {
  return parseRows(await dbRun('SELECT * FROM persons'));
}

export async function dbAddPerson({ id, name, gender, birth_place, notes, family_id }) {
  await dbRun(
    'INSERT INTO persons (id, name, gender, birth_place, notes, family_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))',
    [id, name, gender ?? 'unknown', birth_place ?? null, notes ?? null, family_id ?? null]
  );
}

export async function dbUpdatePerson(id, fields) {
  const allowed = ['name', 'gender', 'birth_place', 'notes', 'family_id'];
  const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));
  if (!updates.length) return;
  const set    = updates.map(([k]) => `${k} = ?`).join(', ');
  const values = [...updates.map(([, v]) => v), id];
  await dbRun(`UPDATE persons SET ${set}, updated_at = datetime("now") WHERE id = ?`, values);
}

export async function dbDeletePerson(id) {
  await dbBatch([
    { sql: 'DELETE FROM node_locks    WHERE node_id = ?',                     args: [id] },
    { sql: 'DELETE FROM relationships WHERE person_id = ? OR related_id = ?', args: [id, id] },
    { sql: 'DELETE FROM pair_nodes    WHERE husband_id = ? OR wife_id = ?',   args: [id, id] },
    { sql: 'DELETE FROM persons       WHERE id = ?',                          args: [id] },
  ]);
}
