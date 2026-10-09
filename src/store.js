/* ---------- stockage ---------- */
const KEY = 'souffleur-harpagon-v1';
const DEF = {
  mode: 'jour',
  block: 1,
  mask: 'coins',
  order: 'scene',
  check: 'manual',
  tol: 'normale',
  rate: 1,
  wild: false,
  hands: false,
  voice: '',
  tts: true,
  only: false,
  src: 'rec',
  fv: 'F0',
  theme: 'sombre',
  done: {},
  daily: {},
};
export const S = Object.assign({}, DEF),
  STATS = {};
try {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    const o = JSON.parse(raw);
    Object.assign(S, o.s || {});
    Object.assign(STATS, o.st || {});
  }
} catch {}
S.done = S.done || {};
S.daily = S.daily || {};
export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ s: S, st: STATS }));
  } catch {}
}
export function clearStats() {
  for (const k of Object.keys(STATS)) delete STATS[k];
}
export function isMissed(i) {
  return !!(STATS[i] && STATS[i].last === 'ko');
}
function pad(n) {
  return String(n).padStart(2, '0');
}
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function fmtDate(d, opt) {
  return new Date(`${d}T12:00:00`).toLocaleDateString(
    'fr-FR',
    opt || { weekday: 'long', day: 'numeric', month: 'long' },
  );
}

/* ---------- enregistrements (IndexedDB) ---------- */
let DBP = null;
function db() {
  if (!DBP)
    DBP = new Promise((res, rej) => {
      const q = indexedDB.open('souffleur', 1);
      q.onupgradeneeded = () => q.result.createObjectStore('rec');
      q.onsuccess = () => res(q.result);
      q.onerror = () => rej(q.error);
    });
  return DBP;
}
export async function idbPut(k, v) {
  try {
    const d = await db();
    await new Promise((res, rej) => {
      const t = d.transaction('rec', 'readwrite');
      t.objectStore('rec').put(v, k);
      t.oncomplete = res;
      t.onerror = () => rej(t.error);
    });
  } catch {}
}
async function idbGet(k) {
  try {
    const d = await db();
    return await new Promise((res) => {
      const q = d.transaction('rec').objectStore('rec').get(k);
      q.onsuccess = () => res(q.result || null);
      q.onerror = () => res(null);
    });
  } catch {
    return null;
  }
}
export async function idbKeys() {
  try {
    const d = await db();
    return await new Promise((res) => {
      const q = d.transaction('rec').objectStore('rec').getAllKeys();
      q.onsuccess = () => res(q.result || []);
      q.onerror = () => res([]);
    });
  } catch {
    return [];
  }
}
export async function idbClear() {
  try {
    const d = await db();
    await new Promise((res) => {
      const t = d.transaction('rec', 'readwrite');
      t.objectStore('rec').clear();
      t.oncomplete = res;
      t.onerror = res;
    });
  } catch {}
}
export const RECS = new Set(),
  URLS = {};
export async function recUrl(i) {
  if (URLS[i]) return URLS[i];
  const b = await idbGet(i);
  if (!b) return null;
  URLS[i] = URL.createObjectURL(b);
  return URLS[i];
}
export function dropUrl(i) {
  if (URLS[i]) {
    URL.revokeObjectURL(URLS[i]);
    delete URLS[i];
  }
}
