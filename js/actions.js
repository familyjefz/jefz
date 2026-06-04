// ══════════════════════════════════════════
// actions.js — UI Actions + Form Modal
// ══════════════════════════════════════════

import {
  state,
  actionAddPerson, actionUpdatePerson, actionDeletePerson,
  actionAddRelationship, actionDeleteRelationship,
  actionSetPair, actionUpdatePair, actionDeletePair,
  actionAddFamily, actionUpdateFamily, actionDeleteFamily,
  actionMovePerson, actionMerge,
  getNodeInfo, lockNode, unlockNode, isNodeLocked,
} from './state.js';
import { render, focusNode, searchNodes } from './canvas.js';
import { generateId } from './db.js';
import { t } from './app.js';

// ══════════════════════════════════════════
// STATE AKSI SEMENTARA
// ══════════════════════════════════════════

let pendingAction  = null; // { type: 'merge'|'move'|'pair', sourceId }
let pendingConfirm = null; // callback setelah warn modal confirm

// ══════════════════════════════════════════
// INIT SEMUA EVENT LISTENER AKSI
// ══════════════════════════════════════════

export function initActions() {
  // Tombol di node panel — Tab Option
  document.querySelectorAll('.opt-btn').forEach(btn => {
    btn.addEventListener('click', () => handleOptionClick(btn.dataset.action));
  });

  // Sub-menu Edit
  document.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => handleEditSub(btn.dataset.edit));
  });

  // Sub-menu Tambah
  document.querySelectorAll('[data-add]').forEach(btn => {
    btn.addEventListener('click', () => handleAddSub(btn.dataset.add));
  });

  // Sub-menu Edit Garis
  document.querySelectorAll('[data-line]').forEach(btn => {
    btn.addEventListener('click', () => handleEditLine(btn.dataset.line));
  });

  // Modal save/cancel
  document.getElementById('modal-save').addEventListener('click', handleModalSave);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);

  // Warn modal
  document.getElementById('warn-confirm').addEventListener('click', () => {
    closePanel('warn-modal');
    pendingConfirm?.();
    pendingConfirm = null;
  });
  document.getElementById('warn-cancel').addEventListener('click', () => {
    closePanel('warn-modal');
    pendingConfirm = null;
  });

  // Semua tombol close panel
  document.querySelectorAll('.panel-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const panelId = btn.dataset.panel;
      closePanel(panelId);
      if (panelId === 'node-panel') {
        unlockActiveNode();
        state.selectedNodeId = null;
      }
    });
  });

  // Semua tombol back panel
  document.querySelectorAll('.panel-back').forEach(btn => {
    btn.addEventListener('click', () => {
      const backTo = btn.dataset.back;
      closeAllSubPanels();
      openPanel(backTo);
    });
  });

  // Tab switcher
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Family panel
  document.getElementById('btn-add-family')?.addEventListener('click', showAddFamilyForm);

  // Canvas: nodeclick
  document.getElementById('tree-canvas').addEventListener('nodeclick', e => {
    handleNodeClick(e.detail);
  });
}

// ══════════════════════════════════════════
// NODE CLICK
// ══════════════════════════════════════════

export async function handleNodeClick(hit) {
  // Sedang dalam mode pilih target (merge/move/pair)
  if (pendingAction) {
    await handlePendingAction(hit);
    return;
  }

  if (!hit) {
    closePanel('node-panel');
    unlockActiveNode();
    state.selectedNodeId = null;
    render();
    return;
  }

  // Unlock node sebelumnya
  unlockActiveNode();
  state.selectedNodeId = hit.id;
  render();

  // Tampilkan panel
  showNodePanel(hit.id, hit.type);
}

function showNodePanel(id, type) {
  const panel = document.getElementById('node-panel');
  panel.classList.remove('hidden');

  // Judul panel
  let title = '';
  if (type === 'pair') {
    const pair    = state.pairNodes[id];
    const husband = state.persons[pair?.husband_id]?.name || '?';
    const wife    = state.persons[pair?.wife_id]?.name    || '?';
    title = `${husband} | ${wife}`;
  } else {
    title = state.persons[id]?.name || '?';
  }
  document.getElementById('node-panel-title').textContent = title;

  // Tab option: hanya admin
  const tabOption = document.getElementById('tab-option');
  if (state.isAdmin) {
    tabOption.classList.remove('hidden');
    // Default ke tab option kalau admin
    switchTab('tab-option');
  } else {
    tabOption.classList.add('hidden');
    switchTab('tab-info');
  }

  // Isi tab info
  renderNodeInfo(id, type);
}

function renderNodeInfo(id, type) {
  const container = document.getElementById('node-info-content');
  let personId    = id;

  if (type === 'pair') {
    const pair = state.pairNodes[id];
    personId   = pair?.husband_id || pair?.wife_id;
  }

  const info = getNodeInfo(personId);
  if (!info) { container.innerHTML = ''; return; }

  const genderMap = { M: '♂ Laki-laki', F: '♀ Perempuan', unknown: '—' };

  container.innerHTML = `
    ${row(t('info.name'),        info.name)}
    ${row(t('info.gender'),      genderMap[info.gender] || '—')}
    ${row(t('info.birthplace'),  info.birth_place || '—')}
    ${row(t('info.family'),      info.family)}
    ${row(t('info.generation'),  `${t('info.gen_prefix')} ${info.generation}`)}
    ${row(t('info.siblings'),    info.siblings)}
    ${row(t('info.children'),    info.children)}
    ${row(t('info.descendants'), info.descendants)}
    ${info.spouses.length ? row(t('info.spouses'), info.spouses.join(', ')) : ''}
    ${info.notes ? row(t('info.notes'), info.notes) : ''}
  `;
}

function row(label, value) {
  return `<div class="info-row">
    <span class="info-label">${label}</span>
    <span class="info-value">${value}</span>
  </div>`;
}

// ══════════════════════════════════════════
// OPTION CLICK
// ══════════════════════════════════════════

async function handleOptionClick(action) {
  const id = state.selectedNodeId;
  if (!id) return;

  // Cek lock
  if (isNodeLocked(id)) {
    showWarnModal(t('warn.editing'), async () => {
      await lockNode(id);
      proceedOption(action, id);
    });
    return;
  }

  await lockNode(id);
  proceedOption(action, id);
}

function proceedOption(action, id) {
  closePanel('node-panel');
  switch (action) {
    case 'edit':      openPanel('panel-edit');     break;
    case 'add':       openPanel('panel-add');      break;
    case 'edit-line': openPanel('panel-edit-line'); break;
    case 'delete':    confirmDelete(id);           break;
    case 'move':      startMoveMode(id);           break;
    case 'merge':     startMergeMode(id);          break;
    case 'pair':      startPairMode(id);           break;
  }
}

// ══════════════════════════════════════════
// EDIT SUB-MENU
// ══════════════════════════════════════════

function handleEditSub(field) {
  const id   = state.selectedNodeId;
  const type = getNodeType(id);
  closeAllSubPanels();

  if (field === 'name') {
    const current = type === 'pair'
      ? '' : (state.persons[id]?.name || '');
    showFormModal(t('edit.name'), [
      { key: 'name', label: t('edit.name'), type: 'text', value: current }
    ], async data => {
      if (type === 'pair') {
        // Edit nama di pair → pilih suami atau istri
        const pair = state.pairNodes[id];
        showFormModal(t('edit.name'), [
          { key: 'target', label: t('edit.which'), type: 'select',
            options: [
              { value: pair.husband_id, label: state.persons[pair.husband_id]?.name || 'Suami' },
              { value: pair.wife_id,    label: state.persons[pair.wife_id]?.name    || 'Istri' },
            ]
          },
          { key: 'name', label: t('edit.name'), type: 'text', value: '' }
        ], async d => {
          await actionUpdatePerson(d.target, { name: d.name });
          toast(t('toast.saved'));
        });
      } else {
        await actionUpdatePerson(id, { name: data.name });
        showNodePanel(id, type);
        toast(t('toast.saved'));
      }
    });
  }

  else if (field === 'gender') {
    showFormModal(t('edit.gender'), [
      { key: 'gender', label: t('edit.gender'), type: 'select',
        options: [
          { value: 'M',       label: '♂ Laki-laki' },
          { value: 'F',       label: '♀ Perempuan' },
          { value: 'unknown', label: '—'            },
        ],
        value: state.persons[id]?.gender || 'unknown'
      }
    ], async data => {
      await actionUpdatePerson(id, { gender: data.gender });
      toast(t('toast.saved'));
    });
  }

  else if (field === 'place') {
    showFormModal(t('edit.place'), [
      { key: 'birth_place', label: t('edit.place'), type: 'text', value: state.persons[id]?.birth_place || '' }
    ], async data => {
      await actionUpdatePerson(id, { birth_place: data.birth_place });
      toast(t('toast.saved'));
    });
  }

  else if (field === 'notes') {
    showFormModal(t('edit.notes'), [
      { key: 'notes', label: t('edit.notes'), type: 'textarea', value: state.persons[id]?.notes || '' }
    ], async data => {
      await actionUpdatePerson(id, { notes: data.notes });
      toast(t('toast.saved'));
    });
  }

  else if (field === 'family') {
    const familyOptions = Object.values(state.families).map(f => ({ value: f.id, label: f.name }));
    familyOptions.unshift({ value: '', label: '— Tanpa Keluarga —' });
    showFormModal(t('edit.family'), [
      { key: 'family_id', label: t('edit.family'), type: 'select',
        options: familyOptions,
        value: state.persons[id]?.family_id || ''
      }
    ], async data => {
      await actionUpdatePerson(id, { family_id: data.family_id || null });
      toast(t('toast.saved'));
    });
  }
}

// ══════════════════════════════════════════
// TAMBAH SUB-MENU
// ══════════════════════════════════════════

function handleAddSub(addType) {
  const id = state.selectedNodeId;
  closeAllSubPanels();

  const familyOptions = Object.values(state.families).map(f => ({ value: f.id, label: f.name }));
  familyOptions.unshift({ value: '', label: '— Tanpa Keluarga —' });

  const baseFields = [
    { key: 'name',      label: t('form.name'),   type: 'text'   },
    { key: 'gender',    label: t('form.gender'),  type: 'select',
      options: [{ value:'M', label:'♂ Laki-laki' },{ value:'F', label:'♀ Perempuan' },{ value:'unknown', label:'—' }]
    },
    { key: 'birth_place', label: t('form.place'), type: 'text'  },
    { key: 'family_id', label: t('form.family'),  type: 'select', options: familyOptions },
    { key: 'notes',     label: t('form.notes'),   type: 'textarea' },
  ];

  if (addType === 'child') {
    // Cari pair dari node ini
    const type   = getNodeType(id);
    const pairId = type === 'pair' ? id : null;

    if (!pairId) {
      toast(t('toast.needpair'), 'error');
      openPanel('node-panel');
      return;
    }

    showFormModal(t('add.child'), baseFields, async data => {
      const childId = await actionAddPerson({ ...data, family_id: data.family_id || null });
      await actionAddRelationship({ person_id: pairId, related_id: childId, type: 'parent' });
      toast(t('toast.added'));
    });
  }

  else if (addType === 'parent') {
    showFormModal(t('add.parent'), baseFields, async data => {
      // Buat person baru sebagai parent
      const parentId = await actionAddPerson({ ...data, family_id: data.family_id || null });
      // Buat pair node untuk parent baru (single parent)
      const pairId   = generateId();
      await actionSetPair(parentId, null);
      // Sambungkan ke current person
      const newPairs = Object.values(state.pairNodes).filter(p => p.husband_id === parentId || p.wife_id === parentId);
      if (newPairs.length) {
        await actionAddRelationship({ person_id: newPairs[0].id, related_id: id, type: 'parent' });
      }
      toast(t('toast.added'));
    });
  }

  else if (addType === 'spouse') {
    showFormModal(t('add.spouse'), [
      ...baseFields,
      { key: 'manual_label', label: t('form.manual_name'), type: 'text',
        placeholder: t('form.manual_hint') }
    ], async data => {
      const spouseId = await actionAddPerson({ ...data, family_id: data.family_id || null });
      // Tentukan suami/istri berdasarkan gender
      const currentGender = state.persons[id]?.gender;
      const husbandId = currentGender === 'F' ? spouseId : id;
      const wifeId    = currentGender === 'F' ? id       : spouseId;
      await actionSetPair(husbandId, wifeId);
      toast(t('toast.paired'));
    });
  }

  else if (addType === 'sibling') {
    // Cari parent pair dari current node
    const parentRel = Object.values(state.relationships).find(r => r.related_id === id && r.type === 'parent');
    if (!parentRel) {
      toast(t('toast.noparent'), 'error');
      openPanel('node-panel');
      return;
    }
    showFormModal(t('add.sibling'), baseFields, async data => {
      const siblingId = await actionAddPerson({ ...data, family_id: data.family_id || null });
      await actionAddRelationship({ person_id: parentRel.person_id, related_id: siblingId, type: 'parent' });
      toast(t('toast.added'));
    });
  }
}

// ══════════════════════════════════════════
// EDIT GARIS
// ══════════════════════════════════════════

function handleEditLine(lineType) {
  const id = state.selectedNodeId;
  closeAllSubPanels();

  if (lineType === 'color') {
    const type = getNodeType(id);
    if (type === 'pair') {
      showFormModal(t('line.color'), [
        { key: 'border_color_left',  label: t('line.left_color'),  type: 'color', value: state.pairNodes[id]?.border_color_left  || '#888888' },
        { key: 'border_color_right', label: t('line.right_color'), type: 'color', value: state.pairNodes[id]?.border_color_right || '#888888' },
      ], async data => {
        await actionUpdatePair(id, { border_color_left: data.border_color_left, border_color_right: data.border_color_right });
        toast(t('toast.saved'));
      });
    }
  }

  else if (lineType === 'style') {
    const type = getNodeType(id);
    if (type === 'pair') {
      showFormModal(t('line.style'), [
        { key: 'line_style', label: t('line.style'), type: 'select',
          options: [
            { value: 'solid',  label: '——— Solid'   },
            { value: 'dashed', label: '- - - Dashed' },
            { value: 'dotted', label: '··· Dotted'   },
          ],
          value: state.pairNodes[id]?.line_style || 'solid'
        }
      ], async data => {
        await actionUpdatePair(id, { line_style: data.line_style });
        toast(t('toast.saved'));
      });
    }
  }
}

// ══════════════════════════════════════════
// DELETE
// ══════════════════════════════════════════

function confirmDelete(id) {
  const type = getNodeType(id);
  const name = type === 'pair'
    ? `${state.persons[state.pairNodes[id]?.husband_id]?.name || '?'} | ${state.persons[state.pairNodes[id]?.wife_id]?.name || '?'}`
    : state.persons[id]?.name || '?';

  showWarnModal(`${t('warn.delete')} "${name}"?`, async () => {
    if (type === 'pair') await actionDeletePair(id);
    else                 await actionDeletePerson(id);
    closePanel('node-panel');
    state.selectedNodeId = null;
    toast(t('toast.deleted'));
  });
}

// ══════════════════════════════════════════
// MOVE MODE
// ══════════════════════════════════════════

function startMoveMode(id) {
  pendingAction = { type: 'move', sourceId: id };
  toast(t('toast.selecttarget'), 'info');
  closePanel('node-panel');
}

// ══════════════════════════════════════════
// MERGE MODE
// ══════════════════════════════════════════

function startMergeMode(id) {
  pendingAction = { type: 'merge', sourceId: id };
  toast(t('toast.selectmerge'), 'info');
  closePanel('node-panel');
}

// ══════════════════════════════════════════
// PAIR MODE (Set Nikah)
// ══════════════════════════════════════════

function startPairMode(id) {
  const type = getNodeType(id);
  if (type === 'pair') {
    toast(t('toast.already_pair'), 'error');
    return;
  }
  pendingAction = { type: 'pair', sourceId: id };
  toast(t('toast.selectspouse'), 'info');
  closePanel('node-panel');
}

// ── Handle klik saat pending action ──────
async function handlePendingAction(hit) {
  if (!hit || !pendingAction) {
    pendingAction = null;
    toast(t('toast.cancelled'), 'info');
    return;
  }

  const { type, sourceId } = pendingAction;
  pendingAction = null;

  if (hit.id === sourceId) {
    toast(t('toast.samenode'), 'error');
    return;
  }

  if (type === 'move') {
    const targetType = getNodeType(hit.id);
    if (targetType !== 'pair') {
      toast(t('toast.needpair'), 'error');
      return;
    }
    await actionMovePerson(sourceId, hit.id);
    toast(t('toast.moved'));
  }

  else if (type === 'merge') {
    await actionMerge(sourceId, hit.id);
    toast(t('toast.merged'));
  }

  else if (type === 'pair') {
    const targetType = getNodeType(hit.id);
    if (targetType === 'pair') {
      toast(t('toast.notperson'), 'error');
      return;
    }
    const currentGender = state.persons[sourceId]?.gender;
    const husbandId = currentGender === 'F' ? hit.id  : sourceId;
    const wifeId    = currentGender === 'F' ? sourceId : hit.id;
    await actionSetPair(husbandId, wifeId);
    toast(t('toast.paired'));
  }
}

// ══════════════════════════════════════════
// FAMILY PANEL
// ══════════════════════════════════════════

export function renderFamilyPanel() {
  const list = document.getElementById('family-list');
  list.innerHTML = '';

  Object.values(state.families).forEach(family => {
    const item = document.createElement('div');
    item.className = 'family-item';
    item.innerHTML = `
      <div class="family-color-dot" style="background:${family.color}"></div>
      <span class="family-name">${family.name}</span>
      <span class="family-check">${family.is_visible ? '✓' : ''}</span>
    `;
    item.addEventListener('click', async () => {
      const { toggleFamilyVisibility } = await import('./state.js');
      await toggleFamilyVisibility(family.id);
      renderFamilyPanel();
    });
    list.appendChild(item);
  });
}

function showAddFamilyForm() {
  showFormModal(t('family.add'), [
    { key: 'name',  label: t('form.name'),  type: 'text'  },
    { key: 'color', label: t('form.color'), type: 'color', value: '#4a90a4' },
  ], async data => {
    await actionAddFamily({ name: data.name, color: data.color });
    renderFamilyPanel();
    toast(t('toast.added'));
  });
}

// ══════════════════════════════════════════
// FORM MODAL
// ══════════════════════════════════════════

let _modalCallback = null;

export function showFormModal(title, fields, onSave) {
  _modalCallback = onSave;
  document.getElementById('modal-title').textContent = title;

  const body = document.getElementById('modal-body');
  body.innerHTML = fields.map(f => buildField(f)).join('');

  openPanel('form-modal');
}

function buildField(f) {
  const id  = `field-${f.key}`;
  let input = '';

  if (f.type === 'text') {
    input = `<input id="${id}" class="form-input" type="text" value="${f.value || ''}" placeholder="${f.placeholder || ''}" />`;
  } else if (f.type === 'textarea') {
    input = `<textarea id="${id}" class="form-textarea">${f.value || ''}</textarea>`;
  } else if (f.type === 'color') {
    input = `<input id="${id}" class="form-input" type="color" value="${f.value || '#4a90a4'}" style="height:44px;padding:4px;" />`;
  } else if (f.type === 'select') {
    const opts = (f.options || []).map(o =>
      `<option value="${o.value}" ${o.value === f.value ? 'selected' : ''}>${o.label}</option>`
    ).join('');
    input = `<select id="${id}" class="form-select">${opts}</select>`;
  }

  return `<div class="form-group">
    <label class="form-label" for="${id}">${f.label}</label>
    ${input}
  </div>`;
}

async function handleModalSave() {
  if (!_modalCallback) return;

  const body   = document.getElementById('modal-body');
  const inputs = body.querySelectorAll('[id^="field-"]');
  const data   = {};

  inputs.forEach(el => {
    const key  = el.id.replace('field-', '');
    data[key]  = el.value;
  });

  closeModal();

  try {
    await _modalCallback(data);
    render();
  } catch (e) {
    toast(e.message || t('toast.error'), 'error');
  }

  _modalCallback = null;
}

function closeModal() {
  closePanel('form-modal');
  _modalCallback = null;
}

// ══════════════════════════════════════════
// WARN MODAL
// ══════════════════════════════════════════

export function showWarnModal(message, onConfirm) {
  document.getElementById('warn-message').textContent = message;
  pendingConfirm = onConfirm;
  openPanel('warn-modal');
}

// ══════════════════════════════════════════
// SEARCH
// ══════════════════════════════════════════

export function initSearch() {
  // Desktop search
  const input    = document.getElementById('search-input');
  const dropdown = document.getElementById('search-results');

  input.addEventListener('input', () => {
    const results = searchNodes(input.value);
    renderSearchResults(dropdown, results, input);
  });

  input.addEventListener('blur', () => {
    setTimeout(() => dropdown.classList.add('hidden'), 150);
  });

  // Mobile search
  const mInput    = document.getElementById('mobile-search-input');
  const mDropdown = document.getElementById('mobile-search-results');
  if (mInput) {
    mInput.addEventListener('input', () => {
      const results = searchNodes(mInput.value);
      renderSearchResults(mDropdown, results, mInput);
    });
  }
}

function renderSearchResults(dropdown, results, input) {
  if (!results.length) { dropdown.classList.add('hidden'); return; }
  dropdown.classList.remove('hidden');
  dropdown.innerHTML = results.map(r =>
    `<div class="search-item" data-id="${r.id}">${r.name}</div>`
  ).join('');
  dropdown.querySelectorAll('.search-item').forEach(item => {
    item.addEventListener('click', () => {
      focusNode(item.dataset.id);
      dropdown.classList.add('hidden');
      input.value = '';
    });
  });
}

// ══════════════════════════════════════════
// PANEL HELPERS
// ══════════════════════════════════════════

export function openPanel(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('hidden');
  if (el.classList.contains('side-panel')) el.classList.add('open');
}

export function closePanel(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('hidden');
  if (el.classList.contains('side-panel')) el.classList.remove('open');
}

function closeAllSubPanels() {
  ['panel-edit', 'panel-add', 'panel-edit-line'].forEach(closePanel);
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === tabId));
}

// ══════════════════════════════════════════
// LOCK HELPER
// ══════════════════════════════════════════

async function unlockActiveNode() {
  if (state.selectedNodeId && state.isAdmin) {
    await unlockNode(state.selectedNodeId);
  }
}

// ══════════════════════════════════════════
// NODE TYPE HELPER
// ══════════════════════════════════════════

function getNodeType(id) {
  if (state.pairNodes[id])  return 'pair';
  if (state.persons[id])    return 'single';
  return null;
}

// ══════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════

export function toast(msg, type = 'default') {
  const container = document.getElementById('toast-container');
  const el        = document.createElement('div');
  el.className    = `toast ${type}`;
  el.textContent  = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
