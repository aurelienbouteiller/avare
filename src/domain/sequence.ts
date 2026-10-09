/* ---------- ordre des répliques d'une séance de répétition ---------- */
import { isHarpagon, withCue } from './lines';

export interface SequenceOptions {
  /** Seulement les répliques d'Harpagon marquées « à revoir ». */
  onlyMissed: boolean;
  /** Répliques d'Harpagon au hasard, chacune précédée de sa réplique d'appel. */
  shuffled: boolean;
  isMissed: (i: number) => boolean;
}

/** Mélange de Fisher-Yates, sur place. */
function shuffle<T>(a: T[], random = Math.random) {
  for (let k = a.length - 1; k > 0; k--) {
    const j = Math.floor(random() * (k + 1));
    [a[k], a[j]] = [a[j], a[k]];
  }
  return a;
}

/** Répliques à enchaîner, parmi `ids` (les répliques du passage, dans l'ordre de la scène). */
export function buildSequence(ids: number[], o: SequenceOptions, random = Math.random) {
  const mine = ids.filter((i) => isHarpagon(i) && (!o.onlyMissed || o.isMissed(i)));
  if (o.shuffled) return shuffle(mine, random).flatMap(withCue);
  if (!o.onlyMissed) return ids;
  const keep = new Set(mine.flatMap(withCue));
  return ids.filter((i) => keep.has(i));
}
