// ══════════════════════════════════════════
// app.js — Entry Point + Auth + i18n + Polling
// ══════════════════════════════════════════

import { state, initState, startSession, endSession, pingSession, pollSessions, pollDataSync, undo, redo, setLang } from './state.js';
import { initCanvas, render, focusNode, fitAll, zoomIn, zoomOut } from './canvas.js';
import { initActions, initSearch, openPanel, closePanel, renderFamilyPanel, toast } from './actions.js';

// ══════════════════════════════════════════
// i18n
// ══════════════════════════════════════════

const LANGS = {
  id: {
    'app.title':         'Silsilah Keluarga',
    'login.btn':         '🔑 Login',
    'login.title':       'Login Admin',
    'login.sub':         'Masukkan PIN Admin',
    'login.wrong':       'PIN salah, coba lagi.',
    'login.confirm':     'Masuk',
    'logout':            'Keluar',
    'role.admin':        'Admin',
    'loading':           'Memuat data silsilah...',
    'cancel':            'Batal',
    'save':              'Simpan',
    'back':              'Kembali',
    'search.placeholder':'Cari nama...',
    'tab.option':        'Option',
    'tab.info':          'Info',
    'opt.edit':          'Edit',
    'opt.add':           'Tambah',
    'opt.move':          'Pindah',
    'opt.delete':        'Hapus',
    'opt.merge':         'Gabung',
    'opt.pair':          'Set Nikah',
    'opt.editline':      'Edit Garis',
    'edit.name':         'Edit Nama',
    'edit.gender':       'Edit Gender',
    'edit.place':        'Edit Tempat Lahir',
    'edit.notes':        'Edit Catatan',
    'edit.family':       'Edit Keluarga',
    'edit.which':        'Pilih siapa yang diedit',
    'add.child':         'Tambah Anak',
    'add.parent':        'Tambah Parent',
    'add.spouse':        'Tambah Pasangan',
    'add.sibling':       'Tambah Saudara',
    'form.name':         'Nama',
    'form.gender':       'Gender',
    'form.place':        'Tempat Lahir',
    'form.family':       'Keluarga',
    'form.notes':        'Catatan',
    'form.color':        'Warna',
    'form.manual_name':  'Nama Manual (opsional)',
    'form.manual_hint':  'Kosongkan jika tidak tahu',
    'line.color':        'Warna Garis',
    'line.left_color':   'Warna Kiri (Suami)',
    'line.right_color':  'Warna Kanan (Istri)',
    'line.style':        'Style Garis',
    'warn.title':        'Perhatian',
    'warn.editing':      'Admin lain sedang mengedit node ini. Tetap lanjutkan?',
    'warn.delete':       'Hapus',
    'warn.continue':     'Lanjutkan',
    'panel.families':    'Cabang Keluarga',
    'family.add':        '+ Tambah Cabang',
    'info.name':         'Nama',
    'info.gender':       'Gender',
    'info.birthplace':   'Tempat Lahir',
    'info.family':       'Keluarga',
    'info.generation':   'Generasi',
    'info.gen_prefix':   'ke-',
    'info.siblings':     'Jumlah Saudara',
    'info.children':     'Jumlah Anak',
    'info.descendants':  'Total Keturunan',
    'info.spouses':      'Pasangan',
    'info.notes':        'Catatan',
    'toast.saved':       '✓ Tersimpan',
    'toast.added':       '✓ Berhasil ditambahkan',
    'toast.deleted':     '✓ Berhasil dihapus',
    'toast.paired':      '✓ Pasangan berhasil diset',
    'toast.moved':       '✓ Berhasil dipindahkan',
    'toast.merged':      '✓ Cabang berhasil digabung',
    'toast.error':       '✗ Terjadi kesalahan',
    'toast.needpair':    '✗ Node ini harus berupa pasangan',
    'toast.noparent':    '✗ Node ini belum punya parent',
    'toast.selecttarget':'Pilih node parent tujuan...',
    'toast.selectmerge': 'Pilih node yang ingin digabung...',
    'toast.selectspouse':'Pilih pasangan...',
    'toast.cancelled':   'Dibatalkan',
    'toast.samenode':    '✗ Tidak bisa memilih node yang sama',
    'toast.notperson':   '✗ Pilih node orang, bukan pasangan',
    'toast.already_pair':'✗ Node ini sudah berupa pasangan',
  },
  en: {
    'app.title':         'Family Tree',
    'login.btn':         '🔑 Login',
    'login.title':       'Admin Login',
    'login.sub':         'Enter Admin PIN',
    'login.wrong':       'Wrong PIN, try again.',
    'login.confirm':     'Login',
    'logout':            'Logout',
    'role.admin':        'Admin',
    'loading':           'Loading family tree...',
    'cancel':            'Cancel',
    'save':              'Save',
    'back':              'Back',
    'search.placeholder':'Search name...',
    'tab.option':        'Option',
    'tab.info':          'Info',
    'opt.edit':          'Edit',
    'opt.add':           'Add',
    'opt.move':          'Move',
    'opt.delete':        'Delete',
    'opt.merge':         'Merge',
    'opt.pair':          'Set Pair',
    'opt.editline':      'Edit Line',
    'edit.name':         'Edit Name',
    'edit.gender':       'Edit Gender',
    'edit.place':        'Edit Birthplace',
    'edit.notes':        'Edit Notes',
    'edit.family':       'Edit Family',
    'edit.which':        'Select who to edit',
    'add.child':         'Add Child',
    'add.parent':        'Add Parent',
    'add.spouse':        'Add Spouse',
    'add.sibling':       'Add Sibling',
    'form.name':         'Name',
    'form.gender':       'Gender',
    'form.place':        'Birthplace',
    'form.family':       'Family',
    'form.notes':        'Notes',
    'form.color':        'Color',
    'form.manual_name':  'Manual Name (optional)',
    'form.manual_hint':  'Leave empty if unknown',
    'line.color':        'Line Color',
    'line.left_color':   'Left Color (Husband)',
    'line.right_color':  'Right Color (Wife)',
    'line.style':        'Line Style',
    'warn.title':        'Warning',
    'warn.editing':      'Another admin is editing this node. Continue anyway?',
    'warn.delete':       'Delete',
    'warn.continue':     'Continue',
    'panel.families':    'Family Branches',
    'family.add':        '+ Add Branch',
    'info.name':         'Name',
    'info.gender':       'Gender',
    'info.birthplace':   'Birthplace',
    'info.family':       'Family',
    'info.generation':   'Generation',
    'info.gen_prefix':   '',
    'info.siblings':     'Siblings',
    'info.children':     'Children',
    'info.descendants':  'Total Descendants',
    'info.spouses':      'Spouse(s)',
    'info.notes':        'Notes',
    'toast.saved':       '✓ Saved',
    'toast.added':       '✓ Added successfully',
    'toast.deleted':     '✓ Deleted successfully',
    'toast.paired':      '✓ Pair set successfully',
    'toast.moved':       '✓ Moved successfully',
    'toast.merged':      '✓ Branches merged',
    'toast.error':       '✗ An error occurred',
    'toast.needpair':    '✗ This node must be a pair',
    'toast.noparent':    '✗ This node has no parent',
    'toast.selecttarget':'Select target parent node...',
    'toast.selectmerge': 'Select node to merge with...',
    'toast.selectspouse':'Select spouse...',
    'toast.cancelled':   'Cancelled',
    'toast.samenode':    '✗ Cannot select the same node',
    'toast.notperson':   '✗ Select a person node, not a pair',
    'toast.already_pair':'✗ This node is already a pair',
  }
};

export function t(key) {
  return LANGS[state.lang]?.[key] ?? LANGS['id'][key] ?? key;
}

function applyLang() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset['i18nPlaceholder']);
  });
  document.documentElement.lang = state.lang;
}

// ══════════════════════════════════════════
// MAIN INIT
// ══════════════════════════════════════════

async function main() {
  // Tampilkan loading
  showLoading(true);

  try {
    // Init canvas dulu (biar ada container)
    initCanvas();

    // Load semua data dari Turso
    await initState();

    // Terapkan bahasa
    applyLang();

    // Start session sebagai viewer
    await startSession('viewer');

    // Init actions & search
    initActions();
    initSearch();

    // Bind semua tombol header
    bindHeader();

    // Render tree
    state.onRender      = render;
    state.onStatsUpdate = updateStats;

    render();

    // Auto-focus
    autoFocus();

    // Update stats di header
    updateStats();

    // Mulai polling
    startPolling();

  } catch (e) {
    console.error('Init error:', e);
    toast('Gagal memuat data. Periksa koneksi.', 'error');
  }

  showLoading(false);
}

// ══════════════════════════════════════════
// AUTO FOCUS
// ══════════════════════════════════════════

function autoFocus() {
  const lastFocus    = state.settings.last_focus_id;
  const defaultFocus = state.settings.default_focus_id;
  const targetId     = lastFocus || defaultFocus;

  if (targetId && (state.persons[targetId] || state.pairNodes[targetId])) {
    focusNode(targetId);
  } else {
    fitAll();
  }
}

// ══════════════════════════════════════════
// HEADER BINDINGS
// ══════════════════════════════════════════

function bindHeader() {
  // Login button
  document.getElementById('btn-login')?.addEventListener('click', () => {
    openPanel('login-modal');
    setTimeout(() => document.getElementById('pin-input')?.focus(), 100);
  });

  // Login modal confirm
  document.getElementById('modal-login-confirm')?.addEventListener('click', handleLogin);
  document.getElementById('modal-login-cancel')?.addEventListener('click', () => closePanel('login-modal'));

  // Enter key di PIN input
  document.getElementById('pin-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });

  // Panel close untuk login modal
  document.querySelector('[data-panel="login-modal"]')?.addEventListener('click', () => closePanel('login-modal'));

  // Logout
  document.getElementById('btn-logout')?.addEventListener('click', handleLogout);

  // Invert mode
  document.getElementById('btn-invert')?.addEventListener('click', toggleInvert);
  document.getElementById('mm-invert')?.addEventListener('click', () => {
    toggleInvert();
    closePanel('mobile-menu-dropdown');
  });

  // Lang switch
  document.getElementById('btn-lang')?.addEventListener('click', toggleLang);
  document.getElementById('mm-lang')?.addEventListener('click', () => {
    toggleLang();
    closePanel('mobile-menu-dropdown');
  });

  // Family filter
  document.getElementById('btn-families')?.addEventListener('click', () => {
    renderFamilyPanel();
    openPanel('family-panel');
  });
  document.getElementById('mm-families')?.addEventListener('click', () => {
    renderFamilyPanel();
    openPanel('family-panel');
    closePanel('mobile-menu-dropdown');
  });

  // Undo / Redo
  document.getElementById('btn-undo')?.addEventListener('click', async () => {
    await undo();
    toast('↩ Undo');
  });
  document.getElementById('btn-redo')?.addEventListener('click', async () => {
    await redo();
    toast('↪ Redo');
  });

  // Keyboard shortcut undo/redo
  document.addEventListener('keydown', async e => {
    if (!state.isAdmin) return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); await undo(); toast('↩ Undo'); }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); await redo(); toast('↪ Redo'); }
  });

  // Zoom buttons
  document.getElementById('btn-zoom-in')?.addEventListener('click',  zoomIn);
  document.getElementById('btn-zoom-out')?.addEventListener('click', zoomOut);
  document.getElementById('btn-zoom-fit')?.addEventListener('click', fitAll);

  // Mobile menu toggle
  document.getElementById('btn-mobile-menu')?.addEventListener('click', () => {
    const dd = document.getElementById('mobile-menu-dropdown');
    dd.classList.toggle('hidden');
  });

  // Mobile search toggle
  document.getElementById('btn-mobile-search')?.addEventListener('click', () => {
    const overlay = document.getElementById('mobile-search-overlay');
    overlay.classList.toggle('hidden');
    if (!overlay.classList.contains('hidden')) {
      document.getElementById('mobile-search-input')?.focus();
    }
  });

  // Tutup mobile menu kalau klik di luar
  document.addEventListener('click', e => {
    const dd   = document.getElementById('mobile-menu-dropdown');
    const btn  = document.getElementById('btn-mobile-menu');
    if (!dd.classList.contains('hidden') && !dd.contains(e.target) && e.target !== btn) {
      dd.classList.add('hidden');
    }
  });
}

// ══════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════

async function handleLogin() {
  const input = document.getElementById('pin-input');
  const error = document.getElementById('pin-error');
  const pin   = input.value.trim();

  if (!pin) return;

  const correctPin = state.settings.pin;
  if (pin === correctPin) {
    // Login berhasil
    input.value = '';
    error.classList.remove('show');
    closePanel('login-modal');

    // Upgrade session ke admin
    await endSession();
    await startSession('admin');

    // Tampilkan elemen admin
    setAdminUI(true);
    toast('✓ ' + t('role.admin'));
  } else {
    error.classList.add('show');
    input.value = '';
    input.focus();
    setTimeout(() => error.classList.remove('show'), 2500);
  }
}

async function handleLogout() {
  await endSession();
  await startSession('viewer');
  setAdminUI(false);
  toast(t('logout'));
}

function setAdminUI(isAdmin) {
  // Tombol login / badge admin
  document.getElementById('btn-login')?.classList.toggle('hidden', isAdmin);
  document.getElementById('admin-badge')?.classList.toggle('hidden', !isAdmin);

  // Elemen khusus admin
  document.querySelectorAll('.admin-only').forEach(el => {
    el.classList.toggle('hidden', !isAdmin);
  });
}

// ══════════════════════════════════════════
// INVERT MODE
// ══════════════════════════════════════════

function toggleInvert() {
  state.invertMode = !state.invertMode;
  document.body.classList.toggle('invert-mode', state.invertMode);
}

// ══════════════════════════════════════════
// LANG SWITCH
// ══════════════════════════════════════════

async function toggleLang() {
  const next = state.lang === 'id' ? 'en' : 'id';
  await setLang(next);
  applyLang();
  toast(next === 'id' ? '🇮🇩 Bahasa Indonesia' : '🇬🇧 English');
}

// ══════════════════════════════════════════
// STATS UPDATE
// ══════════════════════════════════════════

function updateStats() {
  const viewers = state.sessions.filter(s => s.role === 'viewer').length;
  const admins  = state.sessions.filter(s => s.role === 'admin').length;
  const online  = viewers + admins;

  document.getElementById('stat-viewers').textContent = online;
  document.getElementById('stat-views').textContent   = state.totalViews;
  document.getElementById('mm-viewers').textContent   = online;
  document.getElementById('mm-views').textContent     = state.totalViews;
}

// ══════════════════════════════════════════
// LOADING OVERLAY
// ══════════════════════════════════════════

function showLoading(show) {
  const el = document.getElementById('loading-overlay');
  el.classList.toggle('active', show);
}

// ══════════════════════════════════════════
// POLLING
// ══════════════════════════════════════════

function startPolling() {
  // Ping session setiap 30 detik
  setInterval(pingSession, 30_000);

  // Update sessions & locks setiap 5 detik
  setInterval(pollSessions, 5_000);

  // Sync data (multi-admin) setiap 30 detik
  setInterval(pollDataSync, 30_000);

  // Simpan posisi viewport terakhir setiap 15 detik
  setInterval(saveLastPosition, 15_000);
}

async function saveLastPosition() {
  if (!state.selectedNodeId) return;
  const { dbSetSetting } = await import('./db.js');
  await dbSetSetting('last_focus_id', state.selectedNodeId);
}

// ══════════════════════════════════════════
// START
// ══════════════════════════════════════════

main();
