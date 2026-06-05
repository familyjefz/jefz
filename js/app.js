// ══════════════════════════════════════════
// app.js — Entry Point + Auth + i18n + Polling
// ══════════════════════════════════════════

import { state, initState, startSession, endSession, pingSession, pollSessions, pollDataSync, undo, redo, setLang } from './state.js';
import { initCanvas, render, focusNode, fitAll, zoomIn, zoomOut } from './canvas.js';
import { initActions, initSearch, openPanel, closePanel, renderFamilyPanel, toast, showAddPersonForm, updateEmptyHint } from './actions.js';
import { t, applyLang } from './i18n.js';

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

    // Update stats & empty hint
    updateStats();
    updateEmptyHint();

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
  // Tambah orang baru
  document.getElementById('btn-add-person')?.addEventListener('click', showAddPersonForm);
  document.getElementById('btn-add-first')?.addEventListener('click', showAddPersonForm);

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
    updateEmptyHint();
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
  updateEmptyHint();
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
