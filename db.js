/* ================================
   RUINS — Database Layer (IndexedDB)
   ================================ */

const DB_NAME = 'ruins_db';
const DB_VERSION = 1;
let db;

function initDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('notes')) {
        const store = db.createObjectStore('notes', { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('journals')) {
        const store = db.createObjectStore('journals', { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };

    req.onsuccess = (e) => { db = e.target.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/* ---- Notes ---- */

function saveNote(note) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('notes', 'readwrite');
    tx.objectStore('notes').put(note);
    tx.oncomplete = () => resolve(note);
    tx.onerror = () => reject(tx.error);
  });
}

function getAllNotes() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('notes', 'readonly');
    const req = tx.objectStore('notes').index('updatedAt').getAll();
    req.onsuccess = () => resolve(req.result.reverse());
    req.onerror = () => reject(req.error);
  });
}

function getNoteById(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('notes', 'readonly');
    const req = tx.objectStore('notes').get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function deleteNote(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('notes', 'readwrite');
    tx.objectStore('notes').delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ---- Audio Journals ---- */

function saveJournal(entry) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('journals', 'readwrite');
    tx.objectStore('journals').put(entry);
    tx.oncomplete = () => resolve(entry);
    tx.onerror = () => reject(tx.error);
  });
}

function getAllJournals() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('journals', 'readonly');
    const req = tx.objectStore('journals').index('updatedAt').getAll();
    req.onsuccess = () => resolve(req.result.reverse());
    req.onerror = () => reject(req.error);
  });
}

function deleteJournal(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('journals', 'readwrite');
    tx.objectStore('journals').delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
