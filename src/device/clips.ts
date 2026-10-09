/* ---------- voix enregistrées (public/audio/<voix>/L<réplique>_S<segment>.mp3) ---------- */
import { LINES } from '../data/scene';
import { hasClip, useRec } from './platform';

const clipId = (i: number, segment = 0) => `L${i}_S${segment}`;

// Chaque clip est chargé une fois en Blob : lecture immédiate, et pas de requêtes Range
// (mal gérées par Safari iOS quand la réponse vient du service worker).
const blobs = new Map<string, Promise<string | null>>();

async function fetchBlobUrl(path: string) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(String(r.status));
  return URL.createObjectURL(await r.blob());
}

function loadClip(bank: string, id: string): Promise<string | null> {
  if (!hasClip(bank, id)) return Promise.resolve(null);
  const key = `${bank}/${id}`;
  let p = blobs.get(key);
  if (!p) {
    p = fetchBlobUrl(`${import.meta.env.BASE_URL}audio/${key}.mp3`).catch(() => {
      blobs.delete(key);
      return null;
    });
    blobs.set(key, p);
  }
  return p;
}

/** Clip d'un segment de Frosine, dans la voix demandée ou à défaut celle de Denise (F0). */
export function frosineClip(bank: string, i: number, segment: number) {
  const id = clipId(i, segment);
  return useRec() ? loadClip(hasClip(bank, id) ? bank : 'F0', id) : Promise.resolve(null);
}

/** Réplique d'Harpagon dite par le modèle (H0). */
export function harpagonClip(i: number) {
  return useRec() ? loadClip('H0', clipId(i)) : Promise.resolve(null);
}

/** Précharge les clips des prochaines répliques pendant que la réplique courante est jouée. */
export function prefetch(ids: number[], bank: string) {
  if (!useRec()) return;
  for (const i of ids) {
    const line = LINES[i];
    if (!line) continue;
    if (line.w === 'H') harpagonClip(i);
    else for (const [k, s] of (line.segs ?? []).entries()) if (s.d === undefined) frosineClip(bank, i, k);
  }
}
