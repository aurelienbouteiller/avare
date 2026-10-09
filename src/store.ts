/* ---------- stockage ---------- */
import { BANKS, CHECKS, isOneOf, MASK_IDS, MODES, ORDERS, type Settings, SRCS, type Stat, THEMES, TOLS } from './types';

// La clé garde son nom d'origine : le script de thème de index.html la lit aussi (champ s.theme).
const KEY = 'souffleur-harpagon-v1';
// Version du format sauvegardé. Les données sans `v` viennent d'avant son ajout et ont la même forme que v1.
const VERSION = 1;
const DEF: Settings = {
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

type Obj = Record<string, unknown>;
const isObj = (o: unknown): o is Obj => typeof o === 'object' && o !== null && !Array.isArray(o);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const isDay = (k: string) => /^\d{4}-\d{2}-\d{2}$/.test(k);

/** Lit les données sauvegardées en ne gardant que les valeurs valides ; le reste prend sa valeur par défaut. */
export function parseSaved(raw: string | null): { s: Settings; st: Record<number, Stat> } {
  const s: Settings = { ...DEF, done: {}, daily: {} };
  const st: Record<number, Stat> = {};
  let o: unknown = null;
  try {
    o = raw ? JSON.parse(raw) : null;
  } catch {}
  if (!isObj(o)) return { s, st };
  // Point d'entrée des migrations futures : convertir ici `o` des versions antérieures vers VERSION.
  const v = isObj(o.s) ? o.s : {};

  if (isOneOf(MODES, v.mode)) s.mode = v.mode;
  if (isNum(v.block)) s.block = v.block;
  if (isOneOf(MASK_IDS, v.mask)) s.mask = v.mask;
  if (isOneOf(ORDERS, v.order)) s.order = v.order;
  if (isOneOf(CHECKS, v.check)) s.check = v.check;
  if (isOneOf(TOLS, v.tol)) s.tol = v.tol;
  if (isNum(v.rate) && v.rate > 0) s.rate = v.rate;
  if (isBool(v.wild)) s.wild = v.wild;
  if (isBool(v.hands)) s.hands = v.hands;
  if (typeof v.voice === 'string') s.voice = v.voice;
  if (isBool(v.tts)) s.tts = v.tts;
  if (isBool(v.only)) s.only = v.only;
  if (isOneOf(SRCS, v.src)) s.src = v.src;
  if (isOneOf(BANKS, v.fv)) s.fv = v.fv;
  if (isOneOf(THEMES, v.theme)) s.theme = v.theme;
  if (isObj(v.done)) for (const [d, x] of Object.entries(v.done)) if (isDay(d) && x === true) s.done[d] = true;
  if (isObj(v.daily)) for (const [d, n] of Object.entries(v.daily)) if (isDay(d) && isNum(n)) s.daily[d] = n;

  if (isObj(o.st))
    for (const [k, x] of Object.entries(o.st)) {
      const i = Number(k);
      if (!Number.isInteger(i) || i < 0 || !isObj(x)) continue;
      st[i] = {
        ok: isNum(x.ok) ? Math.max(0, x.ok) : 0,
        ko: isNum(x.ko) ? Math.max(0, x.ko) : 0,
        last: x.last === 'ok' || x.last === 'ko' ? x.last : '',
      };
    }
  return { s, st };
}

let saved: ReturnType<typeof parseSaved> = { s: { ...DEF, done: {}, daily: {} }, st: {} };
try {
  saved = parseSaved(localStorage.getItem(KEY));
} catch {}
export const S: Settings = saved.s,
  STATS: Record<number, Stat> = saved.st;
export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: VERSION, s: S, st: STATS }));
  } catch {}
}
export function clearStats() {
  for (const k of Object.keys(STATS)) delete STATS[+k];
}
export function isMissed(i: number) {
  return STATS[i]?.last === 'ko';
}
function pad(n: number) {
  return String(n).padStart(2, '0');
}
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function fmtDate(d: string, opt?: Intl.DateTimeFormatOptions) {
  return new Date(`${d}T12:00:00`).toLocaleDateString(
    'fr-FR',
    opt || { weekday: 'long', day: 'numeric', month: 'long' },
  );
}

/* ---------- enregistrements (IndexedDB) ---------- */
let DBP: Promise<IDBDatabase> | null = null;
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
export async function idbPut(k: number, v: Blob) {
  try {
    const d = await db();
    await new Promise<void>((res, rej) => {
      const t = d.transaction('rec', 'readwrite');
      t.objectStore('rec').put(v, k);
      t.oncomplete = () => res();
      t.onerror = () => rej(t.error);
    });
  } catch {}
}
async function idbGet(k: number): Promise<Blob | null> {
  try {
    const d = await db();
    return await new Promise<Blob | null>((res) => {
      const q = d.transaction('rec').objectStore('rec').get(k);
      q.onsuccess = () => res(q.result || null);
      q.onerror = () => res(null);
    });
  } catch {
    return null;
  }
}
export async function idbKeys(): Promise<IDBValidKey[]> {
  try {
    const d = await db();
    return await new Promise<IDBValidKey[]>((res) => {
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
    await new Promise<void>((res) => {
      const t = d.transaction('rec', 'readwrite');
      t.objectStore('rec').clear();
      t.oncomplete = () => res();
      t.onerror = () => res();
    });
  } catch {}
}
export const RECS = new Set<number>(),
  URLS: Record<number, string> = {};
export async function recUrl(i: number) {
  if (URLS[i]) return URLS[i];
  const b = await idbGet(i);
  if (!b) return null;
  URLS[i] = URL.createObjectURL(b);
  return URLS[i];
}
export function dropUrl(i: number) {
  if (URLS[i]) {
    URL.revokeObjectURL(URLS[i]);
    delete URLS[i];
  }
}
