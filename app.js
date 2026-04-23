/* ================================
   RUINS — Core Application Logic
   ================================ */

/* ---- State ---- */
let currentNote = null;
let currentBg = { type: 'none', value: null };
let pendingBg = null;
let mediaRecorder = null;
let recordChunks = [];
let recordInterval = null;
let recordSeconds = 0;
let isRecording = false;

/* ---- DOM refs ---- */
const $ = id => document.getElementById(id);

const themeToggle   = $('themeToggle');
const newNoteBtn    = $('newNoteBtn');
const newJournalBtn = $('newJournalBtn');
const ctaBtn        = $('ctaBtn');
const notesList     = $('notesList');
const journalList   = $('journalList');
const emptyState    = $('emptyState');
const editorWrapper = $('editorWrapper');
const noteBg        = $('noteBg');
const timestamp     = $('timestamp');
const noteTitle     = $('noteTitle');
const noteBody      = $('noteBody');
const spotifySlot   = $('spotifySlot');
const voiceNotesList= $('voiceNotesList');
const backBtn       = $('backBtn');
const bgBtn         = $('bgBtn');
const musicBtn      = $('musicBtn');
const voiceBtn      = $('voiceBtn');
const exportBtn     = $('exportBtn');
const saveBtn       = $('saveBtn');

/* Modals */
const bgModal       = $('bgModal');
const bgModalClose  = $('bgModalClose');
const bgApply       = $('bgApply');
const musicModal    = $('musicModal');
const musicModalClose = $('musicModalClose');
const musicApply    = $('musicApply');
const spotifyInput  = $('spotifyInput');
const voiceModal    = $('voiceModal');
const voiceModalClose = $('voiceModalClose');
const recordBtn     = $('recordBtn');
const recordStop    = $('recordStop');
const recordTimer   = $('recordTimer');
const recordVisualizer = $('recordVisualizer');
const voiceFileInput = $('voiceFileInput');
const bgImageInput  = $('bgImageInput');
const colorPicker   = $('colorPicker');

/* ---- Init ---- */
async function init() {
  await initDB();
  loadTheme();
  await renderNotesList();
  await renderJournalList();
  bindEvents();
}

/* ---- Theme ---- */
function loadTheme() {
  const saved = localStorage.getItem('ruins_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('ruins_theme', next);
}

/* ---- Timestamp ---- */
function formatDateTime(date) {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }) + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/* ---- Notes list ---- */
async function renderNotesList() {
  const notes = await getAllNotes();
  notesList.innerHTML = '';
  notes.forEach(n => {
    const el = document.createElement('div');
    el.className = 'note-item' + (currentNote && currentNote.id === n.id ? ' active' : '');
    el.dataset.id = n.id;
    el.innerHTML = `
      <div class="note-item-title">${n.title || 'Untitled ruin'}</div>
      <div class="note-item-meta">${formatDateTime(n.updatedAt)}</div>
    `;
    el.addEventListener('click', () => openNote(n.id));
    notesList.appendChild(el);
  });
}

async function renderJournalList() {
  const entries = await getAllJournals();
  journalList.innerHTML = '';
  entries.forEach(e => {
    const el = document.createElement('div');
    el.className = 'note-item' + (currentNote && currentNote.id === e.id ? ' active' : '');
    el.dataset.id = e.id;
    el.innerHTML = `
      <div class="note-item-title">${e.title || 'Unnamed recording'}</div>
      <div class="note-item-meta">${formatDateTime(e.updatedAt)}</div>
    `;
    el.addEventListener('click', () => openJournal(e.id));
    journalList.appendChild(el);
  });
}

/* ---- New note ---- */
async function createNewNote() {
  const now = Date.now();
  const note = {
    id: generateId(),
    title: '',
    body: '',
    spotify: null,
    voiceNotes: [],
    background: { type: 'none', value: null },
    createdAt: now,
    updatedAt: now,
    type: 'note'
  };
  await saveNote(note);
  await renderNotesList();
  openNote(note.id);
}

/* ---- Open note ---- */
async function openNote(id) {
  currentNote = await getNoteById(id);
  if (!currentNote) return;

  showEditor();
  renderEditor(currentNote);
  highlightActive(id);
}

function highlightActive(id) {
  document.querySelectorAll('.note-item').forEach(el => {
    el.classList.toggle('active', el.dataset.id === id);
  });
}

function showEditor() {
  emptyState.style.display = 'none';
  editorWrapper.style.display = 'block';
}

function showEmpty() {
  emptyState.style.display = 'flex';
  editorWrapper.style.display = 'none';
  currentNote = null;
  document.querySelectorAll('.note-item').forEach(el => el.classList.remove('active'));
}

function renderEditor(note) {
  timestamp.textContent = formatDateTime(note.updatedAt);
  noteTitle.textContent = note.title;
  noteBody.innerHTML = note.body;

  // Background
  applyBackground(note.background || { type: 'none', value: null });
  currentBg = note.background || { type: 'none', value: null };

  // Spotify
  if (note.spotify) {
    renderSpotify(note.spotify);
  } else {
    spotifySlot.style.display = 'none';
    spotifySlot.innerHTML = '';
  }

  // Voice notes
  renderVoiceNotes(note.voiceNotes || []);
}

/* ---- Save ---- */
async function saveCurrentNote() {
  if (!currentNote) return;

  currentNote.title = noteTitle.textContent.trim();
  currentNote.body  = noteBody.innerHTML;
  currentNote.background = currentBg;
  currentNote.updatedAt = Date.now();

  await saveNote(currentNote);
  await renderNotesList();
  highlightActive(currentNote.id);
  timestamp.textContent = formatDateTime(currentNote.updatedAt);

  // brief save flash
  saveBtn.style.color = 'var(--accent)';
  setTimeout(() => saveBtn.style.color = '', 600);
}

/* ---- Background ---- */
const PRESETS = {
  none:      { type: 'color', value: null },
  linen:     { type: 'gradient', value: 'linear-gradient(135deg,#1a1214 0%,#2c1a1e 100%)' },
  burgundy:  { type: 'gradient', value: 'linear-gradient(135deg,#4a0f1a 0%,#8b2635 50%,#1a0a0d 100%)' },
  concrete:  { type: 'gradient', value: 'linear-gradient(135deg,#1c1c1c 0%,#2d2d2d 50%,#1a1a1a 100%)' },
  parchment: { type: 'gradient', value: 'linear-gradient(135deg,#f7f0ec 0%,#ede0d8 100%)' },
  inkwash:   { type: 'gradient', value: 'linear-gradient(160deg,#0a0a12 0%,#1a1a2e 50%,#0d0d1a 100%)' },
  grain:     { type: 'grain', value: '#1a1214' },
  rust:      { type: 'gradient', value: 'linear-gradient(135deg,#1a0a00 0%,#3d1a00 50%,#1a0a00 100%)' },
};

function applyBackground(bg) {
  noteBg.className = 'note-bg';
  noteBg.style.background = '';
  noteBg.style.backgroundImage = '';

  if (!bg || bg.type === 'none' || !bg.value) {
    noteBg.style.background = 'var(--bg)';
    return;
  }
  if (bg.type === 'gradient') {
    noteBg.style.background = bg.value;
  } else if (bg.type === 'color') {
    noteBg.style.background = bg.value;
  } else if (bg.type === 'image') {
    noteBg.style.backgroundImage = `url(${bg.value})`;
    noteBg.style.backgroundSize = 'cover';
    noteBg.style.backgroundPosition = 'center';
    noteBg.classList.add('has-image');
  } else if (bg.type === 'grain') {
    noteBg.style.background = bg.value;
    noteBg.style.backgroundImage = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.12'/%3E%3C/svg%3E")`;
    noteBg.style.backgroundSize = '200px';
  }
}

/* Background modal */
let activeBgTab = 'presets';
let selectedPreset = null;

function openBgModal() {
  bgModal.style.display = 'flex';
  pendingBg = { ...currentBg };
  switchBgTab('presets');
}

function switchBgTab(tab) {
  activeBgTab = tab;
  document.querySelectorAll('.bg-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.bg-panel').forEach(p => p.style.display = 'none');
  $(`panel-${tab}`).style.display = 'block';
}

document.querySelectorAll('.bg-tab').forEach(btn => {
  btn.addEventListener('click', () => switchBgTab(btn.dataset.tab));
});

document.querySelectorAll('.preset').forEach(p => {
  p.addEventListener('click', () => {
    document.querySelectorAll('.preset').forEach(x => x.classList.remove('selected'));
    p.classList.add('selected');
    const key = p.dataset.preset;
    pendingBg = PRESETS[key] || { type: 'none', value: null };
  });
});

colorPicker.addEventListener('input', () => {
  pendingBg = { type: 'color', value: colorPicker.value };
});

bgImageInput.addEventListener('change', () => {
  const file = bgImageInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    pendingBg = { type: 'image', value: e.target.result };
  };
  reader.readAsDataURL(file);
});

bgApply.addEventListener('click', () => {
  if (pendingBg) {
    currentBg = pendingBg;
    applyBackground(currentBg);
  }
  bgModal.style.display = 'none';
});

bgModalClose.addEventListener('click', () => { bgModal.style.display = 'none'; });
bgModal.addEventListener('click', e => { if (e.target === bgModal) bgModal.style.display = 'none'; });

/* ---- Spotify ---- */
function parseSpotifyEmbed(url) {
  // Convert share link to embed link
  // https://open.spotify.com/track/xxx → https://open.spotify.com/embed/track/xxx
  return url.replace('open.spotify.com/', 'open.spotify.com/embed/');
}

function renderSpotify(url) {
  const embedUrl = parseSpotifyEmbed(url);
  spotifySlot.style.display = 'block';
  spotifySlot.innerHTML = `
    <iframe
      src="${embedUrl}"
      width="100%"
      height="152"
      frameborder="0"
      allowtransparency="true"
      allow="encrypted-media"
      loading="lazy"
    ></iframe>
  `;
}

musicApply.addEventListener('click', () => {
  const url = spotifyInput.value.trim();
  if (!url || !url.includes('spotify')) return;
  if (!currentNote) return;
  currentNote.spotify = url;
  renderSpotify(url);
  musicModal.style.display = 'none';
  spotifyInput.value = '';
});

musicModalClose.addEventListener('click', () => { musicModal.style.display = 'none'; });
musicModal.addEventListener('click', e => { if (e.target === musicModal) musicModal.style.display = 'none'; });

/* ---- Voice Notes ---- */
function renderVoiceNotes(voiceNotes) {
  voiceNotesList.innerHTML = '';
  voiceNotes.forEach((vn, i) => {
    const el = document.createElement('div');
    el.className = 'voice-note-item';
    el.innerHTML = `
      <span class="voice-note-label">${vn.label || `Voice ${i + 1}`}</span>
      <audio controls src="${vn.url}"></audio>
      <button class="voice-delete" data-index="${i}" title="Remove">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;
    el.querySelector('.voice-delete').addEventListener('click', () => {
      if (!currentNote) return;
      currentNote.voiceNotes.splice(i, 1);
      renderVoiceNotes(currentNote.voiceNotes);
    });
    voiceNotesList.appendChild(el);
  });
}

function addVoiceNote(url, label) {
  if (!currentNote) return;
  if (!currentNote.voiceNotes) currentNote.voiceNotes = [];
  currentNote.voiceNotes.push({ url, label });
  renderVoiceNotes(currentNote.voiceNotes);
}

/* Recording */
function startRecording() {
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    mediaRecorder = new MediaRecorder(stream);
    recordChunks = [];
    mediaRecorder.ondataavailable = e => recordChunks.push(e.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordChunks, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      const label = `Voice · ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
      addVoiceNote(url, label);
      stream.getTracks().forEach(t => t.stop());
      voiceModal.style.display = 'none';
      resetRecordUI();
    };
    mediaRecorder.start();
    isRecording = true;
    recordSeconds = 0;
    recordVisualizer.classList.add('recording');
    recordBtn.style.display = 'none';
    recordStop.style.display = 'flex';
    recordInterval = setInterval(() => {
      recordSeconds++;
      const m = Math.floor(recordSeconds / 60);
      const s = recordSeconds % 60;
      recordTimer.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    }, 1000);
  }).catch(() => {
    alert('Microphone access denied. Please allow microphone permissions.');
  });
}

function stopRecording() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    isRecording = false;
    clearInterval(recordInterval);
  }
}

function resetRecordUI() {
  recordVisualizer.classList.remove('recording');
  recordBtn.style.display = 'flex';
  recordStop.style.display = 'none';
  recordTimer.textContent = '0:00';
  recordSeconds = 0;
}

recordBtn.addEventListener('click', startRecording);
recordStop.addEventListener('click', stopRecording);

voiceFileInput.addEventListener('change', () => {
  const file = voiceFileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const label = `Audio · ${file.name.slice(0, 24)}`;
    addVoiceNote(e.target.result, label);
    voiceModal.style.display = 'none';
  };
  reader.readAsDataURL(file);
});

voiceModalClose.addEventListener('click', () => {
  if (isRecording) stopRecording();
  resetRecordUI();
  voiceModal.style.display = 'none';
});

voiceModal.addEventListener('click', e => {
  if (e.target === voiceModal) {
    if (isRecording) stopRecording();
    resetRecordUI();
    voiceModal.style.display = 'none';
  }
});

/* ---- Audio Journal ---- */
async function createNewJournal() {
  const now = Date.now();
  const entry = {
    id: generateId(),
    title: '',
    voiceNotes: [],
    createdAt: now,
    updatedAt: now,
    type: 'journal'
  };
  await saveJournal(entry);
  await renderJournalList();
  openJournalEditor(entry);
}

async function openJournal(id) {
  // For now journals open in the same editor in a simplified voice-first mode
  // Could be extended later
  const entries = await getAllJournals();
  const entry = entries.find(e => e.id === id);
  if (!entry) return;
  currentNote = entry;
  showEditor();
  // Patch into editor with no text body
  timestamp.textContent = formatDateTime(entry.updatedAt);
  noteTitle.textContent = entry.title || 'Audio Journal';
  noteBody.innerHTML = '';
  noteBg.style.background = 'var(--bg)';
  spotifySlot.style.display = 'none';
  renderVoiceNotes(entry.voiceNotes || []);
  highlightActive(id);
}

function openJournalEditor(entry) {
  currentNote = entry;
  showEditor();
  timestamp.textContent = formatDateTime(entry.updatedAt);
  noteTitle.textContent = '';
  noteBody.innerHTML = '';
  spotifySlot.style.display = 'none';
  renderVoiceNotes([]);
  highlightActive(entry.id);
}

/* ---- Export (PDF placeholder) ---- */
async function exportNote() {
  if (!currentNote) return;
  // Open print dialog — browser renders to PDF
  const title = currentNote.title || 'Untitled ruin';
  const body = currentNote.body || '';
  const dt = formatDateTime(currentNote.updatedAt);

  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title} — Ruins</title>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Lato:wght@300;400&display=swap" rel="stylesheet"/>
      <style>
        body { font-family: 'Lato', sans-serif; font-weight: 300; max-width: 680px; margin: 60px auto; color: #1A0A0D; background: #F7F0EC; padding: 0 2rem; }
        .ruins-header { font-family: 'Cormorant Garamond', serif; font-size: 2rem; font-weight: 300; font-style: italic; color: #8B2635; margin-bottom: 0.5rem; letter-spacing: 0.06em; }
        .meta { font-size: 0.75rem; color: #6B4E52; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 2.5rem; }
        h1 { font-family: 'Cormorant Garamond', serif; font-size: 2.4rem; font-weight: 400; color: #1A0A0D; margin-bottom: 1.5rem; line-height: 1.2; }
        .body { font-size: 1rem; line-height: 1.9; color: #1A0A0D; }
        @media print { body { background: white; } }
      </style>
    </head>
    <body>
      <div class="ruins-header">Ruins</div>
      <div class="meta">${dt}</div>
      <h1>${title}</h1>
      <div class="body">${body}</div>
    </body>
    </html>
  `);
  win.document.close();
  setTimeout(() => win.print(), 400);
}

/* ---- Events ---- */
function bindEvents() {
  themeToggle.addEventListener('click', toggleTheme);
  newNoteBtn.addEventListener('click', createNewNote);
  ctaBtn.addEventListener('click', createNewNote);
  newJournalBtn.addEventListener('click', createNewJournal);
  backBtn.addEventListener('click', showEmpty);
  saveBtn.addEventListener('click', saveCurrentNote);
  bgBtn.addEventListener('click', openBgModal);
  musicBtn.addEventListener('click', () => { if (currentNote) musicModal.style.display = 'flex'; });
  voiceBtn.addEventListener('click', () => { if (currentNote) voiceModal.style.display = 'flex'; });
  exportBtn.addEventListener('click', exportNote);

  // Auto-save on title/body change with debounce
  let autoSaveTimer;
  [noteTitle, noteBody].forEach(el => {
    el.addEventListener('input', () => {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(saveCurrentNote, 1800);
    });
  });
}

/* ---- Start ---- */
init();
