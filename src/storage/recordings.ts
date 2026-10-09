/* ---------- enregistrements de ma voix (IndexedDB, une prise par réplique) ---------- */
import { signal } from '@preact/signals-core';

const DB_NAME = 'souffleur';
const STORE = 'rec';

/** Répliques qui ont un enregistrement (observé : remplacé à chaque changement). */
export const recorded = signal<ReadonlySet<number>>(new Set());
// Adresses blob: déjà créées, révoquées quand la prise change ou est effacée.
const urls = new Map<number, string>();

let dbPromise: Promise<IDBDatabase> | null = null;
function openDb() {
  dbPromise ??= new Promise((res, rej) => {
    const q = indexedDB.open(DB_NAME, 1);
    q.onupgradeneeded = () => q.result.createObjectStore(STORE);
    q.onsuccess = () => res(q.result);
    q.onerror = () => rej(q.error);
  });
  return dbPromise;
}

// Exécute une requête sur le magasin ; `fallback` en cas d'échec (base indisponible, navigation privée…).
async function request<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest, fallback: T): Promise<T> {
  try {
    const db = await openDb();
    return await new Promise<T>((res) => {
      const tx = db.transaction(STORE, mode);
      const q = run(tx.objectStore(STORE));
      tx.oncomplete = () => res((q.result as T) ?? fallback);
      tx.onerror = () => res(fallback);
    });
  } catch {
    return fallback;
  }
}

function forgetUrl(i: number) {
  const url = urls.get(i);
  if (url) URL.revokeObjectURL(url);
  urls.delete(i);
}

/** Charge la liste des répliques enregistrées. */
export async function loadRecorded() {
  const keys = await request<IDBValidKey[]>('readonly', (s) => s.getAllKeys(), []);
  recorded.value = new Set([...recorded.value, ...keys.map(Number)]);
}

/** Enregistre (ou remplace) la prise de la réplique i. */
export async function saveRecording(i: number, blob: Blob) {
  await request('readwrite', (s) => s.put(blob, i), undefined);
  recorded.value = new Set(recorded.value).add(i);
  forgetUrl(i);
}

/** Adresse lisible par un lecteur audio, ou null sans enregistrement. */
export async function recordingUrl(i: number) {
  const known = urls.get(i);
  if (known) return known;
  const blob = await request<Blob | null>('readonly', (s) => s.get(i), null);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urls.set(i, url);
  return url;
}

export async function clearRecordings() {
  await request('readwrite', (s) => s.clear(), undefined);
  recorded.value = new Set();
  for (const i of [...urls.keys()]) forgetUrl(i);
}
