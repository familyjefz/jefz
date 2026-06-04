// ══════════════════════════════════════════
// state.js — State Management + Undo/Redo
// ══════════════════════════════════════════

import {
  dbLoadAll, dbGetSessions, dbGetLocks,
  dbPushHistory, dbClearHistoryAfter, dbGetHistory,
  dbAddPerson, dbUpdatePerson, dbDeletePerson,
  dbAddRelationship, dbDeleteRelationship,
  dbAddFamily, dbUpdateFamily, dbDeleteFamily,
  dbAddPairNode, dbUpdatePairNode, dbDeletePairNode,
  dbUpsertSession, dbUpdateSessionLastSeen, dbDeleteSession,
  dbUnlockNode, dbUnlockAllBySession, dbLockNode,
  dbIncrementViews, dbSetSetting,
  generateId
} from './db.js';

// ══════════════════════════════════════════
// STATE UTAMA
// ══════════════════════════════════════════

export const state = {
  // Data
  persons:       {},  // { id: {...} }
  relationships: {},  // { id: {...} }
  families:      {},  // { id: {...} }
  pairNodes:     {},  // { id: {...} }

  // Auth
  isAdmin:    false,
  sessionId:  null,
  role:       'viewer', // 'admin' | 'viewer'

  // Settings
  settings:   {},

  // Undo/Redo
  history:     [],   // array of { id, action_type, target_id, before_data, after_data }
  currentStep: -1,   // index langkah saat ini

  // UI
  selectedNodeId: null,
  lang:           'id',
  invertMode:     false,

  // Stats & sessions
  totalViews:  0,
  sessions:    [],
  locks:       {},   // { node_id: session_id }

  // Viewport (canvas)
  viewport: { x: 0, y: 0, scale: 1 },

  // Callbacks (diset oleh canvas.js / app.js)
  onRender:       null,
  onStatsUpdate:  null,
};

// ══════════════════════════════════════════
// INIT — Load semua data dari Turso
// ══════════════════════════════════════════

export async function initState() {
  const data = await dbLoadAll();

  // Masukkan ke state sebagai map by id
  state.persons       = Object.fromEntries(data.persons.map(p => [p.id, p]));
  state.relationships = Object.fromEntries(data.relationships.map(r => [r.id, r]));
  state.families      = Object.fromEntries(data.families.map(f => [f.id, f]));
  state.pairNodes     = Object.fromEntries(data.pairNodes.map(n => [n.id, n]));
  state.settings      = data.settings;
  state.totalViews    = Number(data.totalViews);
  state.lang          = data.settings.lang || 'id';

  // Load history undo/redo
  const histRows  = await dbGetHistory();
  state.history   = histRows;
  state.currentStep = histRows.length > 0
    ? Math.max(...histRows.map(h => Number(h.step_index)))
    : -1;

  // Increment views
  await dbIncrementViews();
  state.totalViews++;
}

// ══════════════════════════════════════════
// SESSION
// ══════════════════════════════════════════

export async function startSession(role) {
  const id = generateId();
  state.sessionId = id;
  state.role      = role;
  state.isAdmin   = role === 'admin';
  await dbUpsertSession({ id, role, focus_node_id: state.settings.last_focus_id || null });
  return id;
}

export async function endSession() {
  if (!state.sessionId) return;
  await dbDeleteSession(state.sessionId);
  await dbUnlockAllBySession(state.sessionId);
  state.sessionId = null;
  state.role      = 'viewer';
  state.isAdmin   = false;
}

export async function pingSession() {
  if (!state.sessionId) return;
  await dbUpdateSessionLastSeen(state.sessionId, state.selectedNodeId);
}

// ══════════════════════════════════════════
// POLLING — update sessions, locks, multi-admin sync
// ══════════════════════════════════════════

export async function pollSessions() {
  const sessions    = await dbGetSessions();
  state.sessions    = sessions;
  const locks       = await dbGetLocks();
  state.locks       = Object.fromEntries(locks.map(l => [l.node_id, l.locked_by]));
  state.onStatsUpdate?.();
}

export async function pollDataSync() {
  // Kalau multi-admin, sync data terbaru dari Turso
  if (!state.isAdmin) return;
  const data = await dbLoadAll();
  state.persons       = Object.fromEntries(data.persons.map(p => [p.id, p]));
  state.relationships = Object.fromEntries(data.relationships.map(r => [r.id, r]));
  state.families      = Object.fromEntries(data.families.map(f => [f.id, f]));
  state.pairNodes     = Object.fromEntries(data.pairNodes.map(n => [n.id, n]));
  state.onRender?.();
}

// ══════════════════════════════════════════
// NODE LOCK
// ══════════════════════════════════════════

export function isNodeLocked(nodeId) {
  const lockedBy = state.locks[nodeId];
  if (!lockedBy) return false;
  return lockedBy !== state.sessionId;
}

export async function lockNode(nodeId) {
  if (!state.sessionId) return;
  await dbLockNode(nodeId, state.sessionId);
  state.locks[nodeId] = state.sessionId;
}

export async function unlockNode(nodeId) {
  await dbUnlockNode(nodeId);
  delete state.locks[nodeId];
}

// ══════════════════════════════════════════
// UNDO / REDO
// ══════════════════════════════════════════

async function pushHistory(action_type, target_id, before_data, after_data) {
  const nextStep = state.currentStep + 1;
  const id       = generateId();
  await dbPushHistory({ id, action_type, target_id, before_data, after_data, step_index: nextStep });

  // Update state history
  state.history     = state.history.filter(h => Number(h.step_index) < nextStep);
  state.history.push({ id, action_type, target_id, before_data: JSON.stringify(before_data), after_data: JSON.stringify(after_data), step_index: nextStep });
  if (state.history.length > 50) state.history.shift();
  state.currentStep = nextStep;
}

export async function undo() {
  if (state.currentStep < 0) return;
  const entry = state.history.find(h => Number(h.step_index) === state.currentStep);
  if (!entry) return;

  const before = JSON.parse(entry.before_data);
  await applySnapshot(entry.action_type, entry.target_id, before, 'undo');
  state.currentStep--;
  state.onRender?.();
}

export async function redo() {
  const nextStep = state.currentStep + 1;
  const entry    = state.history.find(h => Number(h.step_index) === nextStep);
  if (!entry) return;

  const after = JSON.parse(entry.after_data);
  await applySnapshot(entry.action_type, entry.target_id, after, 'redo');
  state.currentStep = nextStep;
  state.onRender?.();
}

// Terapkan snapshot untuk undo/redo
async function applySnapshot(action_type, target_id, snapshot, direction) {
  if (action_type === 'add_person' || action_type === 'delete_person') {
    if (direction === 'undo') {
      // undo add = delete; undo delete = add kembali
      if (action_type === 'add_person') {
        await dbDeletePerson(target_id);
        delete state.persons[target_id];
      } else {
        await dbAddPerson(snapshot);
        state.persons[snapshot.id] = snapshot;
      }
    } else {
      // redo
      if (action_type === 'add_person') {
        await dbAddPerson(snapshot);
        state.persons[snapshot.id] = snapshot;
      } else {
        await dbDeletePerson(target_id);
        delete state.persons[target_id];
      }
    }
  }

  else if (action_type === 'update_person') {
    await dbUpdatePerson(target_id, snapshot);
    state.persons[target_id] = { ...state.persons[target_id], ...snapshot };
  }

  else if (action_type === 'add_relationship' || action_type === 'delete_relationship') {
    if (direction === 'undo') {
      if (action_type === 'add_relationship') {
        await dbDeleteRelationship(target_id);
        delete state.relationships[target_id];
      } else {
        await dbAddRelationship(snapshot);
        state.relationships[snapshot.id] = snapshot;
      }
    } else {
      if (action_type === 'add_relationship') {
        await dbAddRelationship(snapshot);
        state.relationships[snapshot.id] = snapshot;
      } else {
        await dbDeleteRelationship(target_id);
        delete state.relationships[target_id];
      }
    }
  }

  else if (action_type === 'add_pair' || action_type === 'delete_pair') {
    if (direction === 'undo') {
      if (action_type === 'add_pair') {
        await dbDeletePairNode(target_id);
        delete state.pairNodes[target_id];
      } else {
        await dbAddPairNode(snapshot);
        state.pairNodes[snapshot.id] = snapshot;
      }
    } else {
      if (action_type === 'add_pair') {
        await dbAddPairNode(snapshot);
        state.pairNodes[snapshot.id] = snapshot;
      } else {
        await dbDeletePairNode(target_id);
        delete state.pairNodes[target_id];
      }
    }
  }

  else if (action_type === 'update_pair') {
    await dbUpdatePairNode(target_id, snapshot);
    state.pairNodes[target_id] = { ...state.pairNodes[target_id], ...snapshot };
  }

  else if (action_type === 'add_family' || action_type === 'delete_family') {
    if (direction === 'undo') {
      if (action_type === 'add_family') {
        await dbDeleteFamily(target_id);
        delete state.families[target_id];
      } else {
        await dbAddFamily(snapshot);
        state.families[snapshot.id] = snapshot;
      }
    } else {
      if (action_type === 'add_family') {
        await dbAddFamily(snapshot);
        state.families[snapshot.id] = snapshot;
      } else {
        await dbDeleteFamily(target_id);
        delete state.families[target_id];
      }
    }
  }
}

// ══════════════════════════════════════════
// ACTIONS — Person
// ══════════════════════════════════════════

export async function actionAddPerson({ name, gender, birth_place, notes, family_id }) {
  const id     = generateId();
  const person = { id, name, gender: gender || 'unknown', birth_place: birth_place || null, notes: notes || null, family_id: family_id || null };
  await dbAddPerson(person);
  state.persons[id] = person;
  await pushHistory('add_person', id, null, person);
  state.onRender?.();
  return id;
}

export async function actionUpdatePerson(id, fields) {
  const before = { ...state.persons[id] };
  await dbUpdatePerson(id, fields);
  state.persons[id] = { ...state.persons[id], ...fields };
  await pushHistory('update_person', id, before, state.persons[id]);
  state.onRender?.();
}

export async function actionDeletePerson(id) {
  const before = { ...state.persons[id] };

  // Kumpulkan relasi & pair yang akan ikut terhapus
  const relsBefore  = Object.values(state.relationships).filter(r => r.person_id === id || r.related_id === id);
  const pairsBefore = Object.values(state.pairNodes).filter(p => p.husband_id === id || p.wife_id === id);

  await dbDeletePerson(id);
  delete state.persons[id];
  relsBefore.forEach(r  => delete state.relationships[r.id]);
  pairsBefore.forEach(p => delete state.pairNodes[p.id]);

  await pushHistory('delete_person', id, before, null);
  state.onRender?.();
}

// ══════════════════════════════════════════
// ACTIONS — Relationship
// ══════════════════════════════════════════

export async function actionAddRelationship({ person_id, related_id, type }) {
  const id  = generateId();
  const rel = { id, person_id, related_id, type };
  await dbAddRelationship(rel);
  state.relationships[id] = rel;
  await pushHistory('add_relationship', id, null, rel);
  state.onRender?.();
  return id;
}

export async function actionDeleteRelationship(id) {
  const before = { ...state.relationships[id] };
  await dbDeleteRelationship(id);
  delete state.relationships[id];
  await pushHistory('delete_relationship', id, before, null);
  state.onRender?.();
}

// ══════════════════════════════════════════
// ACTIONS — Pair Node (Set Nikah)
// ══════════════════════════════════════════

export async function actionSetPair(husband_id, wife_id) {
  const id   = generateId();
  // Hitung order (istri ke-berapa)
  const existing = Object.values(state.pairNodes).filter(p => p.husband_id === husband_id);
  const order    = existing.length + 1;

  // Warna border dari family masing-masing
  const husbandFamily = state.persons[husband_id]?.family_id;
  const wifeFamily    = state.persons[wife_id]?.family_id;
  const leftColor     = husbandFamily ? (state.families[husbandFamily]?.color || '#888') : '#888';
  const rightColor    = wifeFamily    ? (state.families[wifeFamily]?.color    || '#888') : '#888';

  const pair = { id, husband_id, wife_id, order_num: order, border_color_left: leftColor, border_color_right: rightColor, line_style: 'solid' };
  await dbAddPairNode(pair);
  state.pairNodes[id] = pair;
  await pushHistory('add_pair', id, null, pair);
  state.onRender?.();
  return id;
}

export async function actionUpdatePair(id, fields) {
  const before = { ...state.pairNodes[id] };
  await dbUpdatePairNode(id, fields);
  state.pairNodes[id] = { ...state.pairNodes[id], ...fields };
  await pushHistory('update_pair', id, before, state.pairNodes[id]);
  state.onRender?.();
}

export async function actionDeletePair(id) {
  const before = { ...state.pairNodes[id] };
  await dbDeletePairNode(id);
  delete state.pairNodes[id];
  await pushHistory('delete_pair', id, before, null);
  state.onRender?.();
}

// ══════════════════════════════════════════
// ACTIONS — Family
// ══════════════════════════════════════════

export async function actionAddFamily({ name, color }) {
  const id     = generateId();
  const family = { id, name, color: color || randomColor(), is_visible: 1 };
  await dbAddFamily(family);
  state.families[id] = family;
  await pushHistory('add_family', id, null, family);
  return id;
}

export async function actionUpdateFamily(id, fields) {
  await dbUpdateFamily(id, fields);
  state.families[id] = { ...state.families[id], ...fields };
}

export async function actionDeleteFamily(id) {
  const before = { ...state.families[id] };
  await dbDeleteFamily(id);
  delete state.families[id];
  // Update persons yg pakai family ini
  Object.values(state.persons).forEach(p => {
    if (p.family_id === id) p.family_id = null;
  });
  await pushHistory('delete_family', id, before, null);
  state.onRender?.();
}

// ══════════════════════════════════════════
// ACTIONS — Move Person (pindah parent)
// ══════════════════════════════════════════

export async function actionMovePerson(personId, newParentPairId) {
  // Hapus relasi parent lama
  const oldParentRels = Object.values(state.relationships).filter(
    r => r.related_id === personId && r.type === 'parent'
  );
  for (const rel of oldParentRels) {
    await actionDeleteRelationship(rel.id);
  }
  // Tambah relasi parent baru
  if (newParentPairId) {
    await actionAddRelationship({ person_id: newParentPairId, related_id: personId, type: 'parent' });
  }
  state.onRender?.();
}

// ══════════════════════════════════════════
// ACTIONS — Merge (gabung 2 cabang)
// Menghubungkan 2 person dari keluarga berbeda via pernikahan
// ══════════════════════════════════════════

export async function actionMerge(personAId, personBId) {
  // Cek apakah sudah ada pair
  const existing = Object.values(state.pairNodes).find(
    p => (p.husband_id === personAId && p.wife_id === personBId) ||
         (p.husband_id === personBId && p.wife_id === personAId)
  );
  if (existing) return existing.id;
  return await actionSetPair(personAId, personBId);
}

// ══════════════════════════════════════════
// HELPERS — Info per node
// ══════════════════════════════════════════

export function getNodeInfo(personId) {
  const person = state.persons[personId];
  if (!person) return null;

  // Cari siblings (saudara kandung)
  const parentRels  = Object.values(state.relationships).filter(r => r.related_id === personId && r.type === 'parent');
  const parentPairs = parentRels.map(r => r.person_id);

  const siblings = new Set();
  for (const pairId of parentPairs) {
    Object.values(state.relationships)
      .filter(r => r.person_id === pairId && r.type === 'parent' && r.related_id !== personId)
      .forEach(r => siblings.add(r.related_id));
  }

  // Cari children
  const pairs    = Object.values(state.pairNodes).filter(p => p.husband_id === personId || p.wife_id === personId);
  const children = new Set();
  for (const pair of pairs) {
    Object.values(state.relationships)
      .filter(r => r.person_id === pair.id && r.type === 'parent')
      .forEach(r => children.add(r.related_id));
  }

  // Hitung generasi dari kepala keluarga (BFS ke atas)
  const generation = getGeneration(personId);

  // Hitung total keturunan ke bawah
  const descendants = countDescendants(personId);

  // Cari pasangan
  const spouses = pairs.map(p => {
    const spouseId = p.husband_id === personId ? p.wife_id : p.husband_id;
    return state.persons[spouseId]?.name || '—';
  });

  return {
    name:        person.name,
    gender:      person.gender,
    birth_place: person.birth_place,
    notes:       person.notes,
    family:      state.families[person.family_id]?.name || '—',
    siblings:    siblings.size,
    children:    children.size,
    generation,
    descendants,
    spouses,
  };
}

function getGeneration(personId, visited = new Set()) {
  if (visited.has(personId)) return 0;
  visited.add(personId);

  const parentRels = Object.values(state.relationships).filter(r => r.related_id === personId && r.type === 'parent');
  if (parentRels.length === 0) return 1; // kepala keluarga

  let maxGen = 0;
  for (const rel of parentRels) {
    const pair = state.pairNodes[rel.person_id];
    if (!pair) continue;
    const parentId = pair.husband_id || pair.wife_id;
    const g        = getGeneration(parentId, visited);
    if (g > maxGen) maxGen = g;
  }
  return maxGen + 1;
}

function countDescendants(personId, visited = new Set()) {
  if (visited.has(personId)) return 0;
  visited.add(personId);

  const pairs = Object.values(state.pairNodes).filter(p => p.husband_id === personId || p.wife_id === personId);
  let count   = 0;
  for (const pair of pairs) {
    const childRels = Object.values(state.relationships).filter(r => r.person_id === pair.id && r.type === 'parent');
    for (const rel of childRels) {
      count++;
      count += countDescendants(rel.related_id, visited);
    }
  }
  return count;
}

// ══════════════════════════════════════════
// HELPERS — Warna otomatis per generasi
// ══════════════════════════════════════════

const COLOR_PALETTE = [
  '#4a90a4', '#7b68ee', '#5daa6f', '#e07b54',
  '#c0a24a', '#a05c8a', '#4a7fc1', '#7aab5a',
  '#d4896a', '#5a9a8e', '#9b6faa', '#6aaa7a',
  '#e0984a', '#5a7aaa', '#aa6a6a', '#7aaa9a',
];

// Cache warna per generasi
const _genColorCache = {};

export function getGenerationColor(personId) {
  const gen = getGeneration(personId);
  if (!_genColorCache[gen]) {
    _genColorCache[gen] = COLOR_PALETTE[(gen - 1) % COLOR_PALETTE.length];
  }
  return _genColorCache[gen];
}

function randomColor() {
  return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
}

// ══════════════════════════════════════════
// LANG
// ══════════════════════════════════════════

export async function setLang(lang) {
  state.lang = lang;
  await dbSetSetting('lang', lang);
}

// ══════════════════════════════════════════
// FAMILY VISIBILITY
// ══════════════════════════════════════════

export async function toggleFamilyVisibility(familyId) {
  const current = state.families[familyId]?.is_visible;
  const next    = current ? 0 : 1;
  await actionUpdateFamily(familyId, { is_visible: next });
  state.onRender?.();
}

export function isPersonVisible(personId) {
  const person   = state.persons[personId];
  if (!person)   return false;
  if (!person.family_id) return true; // tanpa family = selalu tampil
  return state.families[person.family_id]?.is_visible !== '0'
      && state.families[person.family_id]?.is_visible !== 0;
}
