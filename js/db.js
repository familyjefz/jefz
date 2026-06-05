// ══════════════════════════════════════════
// db.js — Koneksi & Query ke Turso
// ══════════════════════════════════════════

import { createClient } from 'https://esm.sh/@libsql/client@0.14.0/web';

const _db = createClient({
  url:       'libsql://familyjefz-familyjefz.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODA1MjcyNTgsImlkIjoiMDE5ZThmYWYtZjUwMS03NzZiLTgzM2EtZGM5MzdhZTA5OTY2IiwicmlkIjoiN2EyOTNiMjktNzczMy00ZmI5LWI0ZjgtNjExNWVjZjIyMDg5In0.6HXh7QpNruz6piuK8V-6kxTyRsxf8qaZHHNEIZKRAK8drOp5aojA46DikSRziMnAXsuhPZVqNxYj20LCLqCrDQ',
});

// Semua string SQL pakai single-quote untuk nilai literal
// Semua nilai dinamis pakai parameter ?

async function dbRun(sql, args = []) {
  return await _db.execute({ sql, args });
}

async function dbBatch(stmts) {
  return await _db.batch(stmts);
}

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
  return Object.fromEntries(parseRows(r).map(x => [x.key, x.value]));
}

export async function dbSetSetting(key, value) {
  await dbRun(
    "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))",
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
    "INSERT INTO persons (id, name, gender, birth_place, notes, family_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
    [id, name, gender ?? 'unknown', birth_place ?? null, notes ?? null, family_id ?? null]
  );
}

export async function dbUpdatePerson(id, fields) {
  const allowed = ['name', 'gender', 'birth_place', 'notes', 'family_id'];
  const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));
  if (!updates.length) return;
  const set    = updates.map(([k]) => k + ' = ?').join(', ');
  const values = updates.map(([, v]) => v);
  await dbRun(
    `UPDATE persons SET ${set}, updated_at = datetime('now') WHERE id = ?`,
    [...values, id]
  );
}

export async function dbDeletePerson(id) {
  await dbBatch([
    { sql: 'DELETE FROM node_locks    WHERE node_id = ?',                   args: [id] },
    { sql: 'DELETE FROM relationships WHERE person_id = ? OR related_id = ?', args: [id, id] },
    { sql: 'DELETE FROM pair_nodes    WHERE husband_id = ? OR wife_id = ?', args: [id, id] },
    { sql: 'DELETE FROM persons       WHERE id = ?',                        args: [id] },
  ]);
}

// ══════════════════════════════════════════
// RELATIONSHIPS
// ══════════════════════════════════════════

export async function dbGetRelationships() {
  return parseRows(await dbRun('SELECT * FROM relationships'));
}

export async function dbAddRelationship({ id, person_id, related_id, type }) {
  await dbRun(
    "INSERT OR IGNORE INTO relationships (id, person_id, related_id, type, created_at) VALUES (?, ?, ?, ?, datetime('now'))",
    [id, person_id, related_id, type]
  );
}

export async function dbDeleteRelationship(id) {
  await dbRun('DELETE FROM relationships WHERE id = ?', [id]);
}

// ══════════════════════════════════════════
// FAMILIES
// ══════════════════════════════════════════

export async function dbGetFamilies() {
  return parseRows(await dbRun('SELECT * FROM families'));
}

export async function dbAddFamily({ id, name, color }) {
  await dbRun(
    "INSERT INTO families (id, name, color, is_visible, created_at) VALUES (?, ?, ?, 1, datetime('now'))",
    [id, name, color]
  );
}

export async function dbUpdateFamily(id, fields) {
  const allowed = ['name', 'color', 'is_visible'];
  const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));
  if (!updates.length) return;
  const set    = updates.map(([k]) => k + ' = ?').join(', ');
  const values = updates.map(([, v]) => v);
  await dbRun(`UPDATE families SET ${set} WHERE id = ?`, [...values, id]);
}

export async function dbDeleteFamily(id) {
  await dbBatch([
    { sql: 'UPDATE persons SET family_id = NULL WHERE family_id = ?', args: [id] },
    { sql: 'DELETE FROM families WHERE id = ?',                       args: [id] },
  ]);
}

// ══════════════════════════════════════════
// PAIR NODES
// ══════════════════════════════════════════

export async function dbGetPairNodes() {
  return parseRows(await dbRun('SELECT * FROM pair_nodes'));
}

export async function dbAddPairNode({ id, husband_id, wife_id, order_num, border_color_left, border_color_right, line_style }) {
  await dbRun(
    "INSERT INTO pair_nodes (id, husband_id, wife_id, order_num, border_color_left, border_color_right, line_style, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))",
    [id, husband_id ?? null, wife_id ?? null, order_num ?? 1, border_color_left ?? null, border_color_right ?? null, line_style ?? 'solid']
  );
}

export async function dbUpdatePairNode(id, fields) {
  const allowed = ['husband_id', 'wife_id', 'order_num', 'border_color_left', 'border_color_right', 'line_style'];
  const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));
  if (!updates.length) return;
  const set    = updates.map(([k]) => k + ' = ?').join(', ');
  const values = updates.map(([, v]) => v);
  await dbRun(`UPDATE pair_nodes SET ${set} WHERE id = ?`, [...values, id]);
}

export async function dbDeletePairNode(id) {
  await dbRun('DELETE FROM pair_nodes WHERE id = ?', [id]);
}

// ══════════════════════════════════════════
// HISTORY
// ══════════════════════════════════════════

export async function dbGetHistory() {
  return parseRows(await dbRun('SELECT * FROM history ORDER BY step_index ASC'));
}

export async function dbPushHistory({ id, action_type, target_id, before_data, after_data, step_index }) {
  await dbBatch([
    { sql: 'DELETE FROM history WHERE step_index >= ?', args: [step_index] },
    {
      sql: "INSERT INTO history (id, action_type, target_id, before_data, after_data, step_index, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))",
      args: [id, action_type, target_id, JSON.stringify(before_data), JSON.stringify(after_data), step_index]
    },
  ]);
  await dbRun(
    'DELETE FROM history WHERE step_index NOT IN (SELECT step_index FROM history ORDER BY step_index DESC LIMIT 50)'
  );
}

export async function dbClearHistoryAfter(step_index) {
  await dbRun('DELETE FROM history WHERE step_index > ?', [step_index]);
}

// ══════════════════════════════════════════
// ACTIVE SESSIONS
// ══════════════════════════════════════════

export async function dbGetSessions() {
  return parseRows(await dbRun(
    "SELECT * FROM active_sessions WHERE last_seen >= datetime('now', '-60 seconds')"
  ));
}

export async function dbUpsertSession({ id, role, focus_node_id }) {
  await dbRun(
    "INSERT OR REPLACE INTO active_sessions (id, role, last_seen, focus_node_id) VALUES (?, ?, datetime('now'), ?)",
    [id, role, focus_node_id ?? null]
  );
}

export async function dbUpdateSessionLastSeen(id, focus_node_id) {
  await dbRun(
    "UPDATE active_sessions SET last_seen = datetime('now'), focus_node_id = ? WHERE id = ?",
    [focus_node_id ?? null, id]
  );
}

export async function dbDeleteSession(id) {
  await dbBatch([
    { sql: 'DELETE FROM node_locks      WHERE locked_by = ?', args: [id] },
    { sql: 'DELETE FROM active_sessions WHERE id = ?',        args: [id] },
  ]);
}

// ══════════════════════════════════════════
// PAGE STATS
// ══════════════════════════════════════════

export async function dbGetStats() {
  const r = parseRows(await dbRun('SELECT total_views FROM page_stats WHERE id = ?', ['main']));
  return r[0]?.total_views ?? 0;
}

export async function dbIncrementViews() {
  await dbRun(
    "UPDATE page_stats SET total_views = total_views + 1, updated_at = datetime('now') WHERE id = ?",
    ['main']
  );
}

// ══════════════════════════════════════════
// NODE LOCKS
// ══════════════════════════════════════════

export async function dbGetLocks() {
  return parseRows(await dbRun('SELECT * FROM node_locks'));
}

export async function dbLockNode(node_id, session_id) {
  await dbRun(
    "INSERT OR REPLACE INTO node_locks (node_id, locked_by, locked_at) VALUES (?, ?, datetime('now'))",
    [node_id, session_id]
  );
}

export async function dbUnlockNode(node_id) {
  await dbRun('DELETE FROM node_locks WHERE node_id = ?', [node_id]);
}

export async function dbUnlockAllBySession(session_id) {
  await dbRun('DELETE FROM node_locks WHERE locked_by = ?', [session_id]);
}

// ══════════════════════════════════════════
// LOAD ALL
// ══════════════════════════════════════════

export async function dbLoadAll() {
  const [persons, relationships, families, pairNodes, settings, stats] = await Promise.all([
    dbRun('SELECT * FROM persons'),
    dbRun('SELECT * FROM relationships'),
    dbRun('SELECT * FROM families'),
    dbRun('SELECT * FROM pair_nodes'),
    dbRun('SELECT key, value FROM settings'),
    dbRun('SELECT total_views FROM page_stats WHERE id = ?', ['main']),
  ]);
  return {
    persons:       parseRows(persons),
    relationships: parseRows(relationships),
    families:      parseRows(families),
    pairNodes:     parseRows(pairNodes),
    settings:      Object.fromEntries(parseRows(settings).map(x => [x.key, x.value])),
    totalViews:    parseRows(stats)[0]?.total_views ?? 0,
  };
}

// ══════════════════════════════════════════
// UTILITY
// ══════════════════════════════════════════

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
