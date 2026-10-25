/* ---------- enregistrements de ma voix (IndexedDB, une prise par réplique, rangée sous son identifiant) ---------- */
import { signal } from '@preact/signals-core';

const DB_NAME = 'reunification';
const STORE = 'rec';

/** Identifiants des répliques qui ont un enregistrement (observé : remplacé à chaque changement). */
export const recorded = signal<ReadonlySet<string>>(new Set());
// Adresses blob: déjà créées, révoquées quand la prise change ou est effacée.
const urls = new Map<string, string>();

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

function forgetUrl(id: string) {
  const url = urls.get(id);
  if (url) URL.revokeObjectURL(url);
  urls.delete(id);
}

/** Charge la liste des répliques enregistrées. */
export async function loadRecorded() {
  const keys = await request<IDBValidKey[]>('readonly', (s) => s.getAllKeys(), []);
  recorded.value = new Set([...recorded.value, ...keys.map(String)]);
}

/** Enregistre (ou remplace) la prise de la réplique `id`. */
export async function saveRecording(id: string, blob: Blob) {
  await request('readwrite', (s) => s.put(blob, id), undefined);
  recorded.value = new Set(recorded.value).add(id);
  forgetUrl(id);
}

/** Adresse lisible par un lecteur audio, ou null sans enregistrement. */
export async function recordingUrl(id: string) {
  const known = urls.get(id);
  if (known) return known;
  const blob = await request<Blob | null>('readonly', (s) => s.get(id), null);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urls.set(id, url);
  return url;
}

export async function clearRecordings() {
  await request('readwrite', (s) => s.clear(), undefined);
  recorded.value = new Set();
  for (const id of [...urls.keys()]) forgetUrl(id);
}
