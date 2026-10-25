/* ---------- ordre des répliques d'une séance de répétition ---------- */
import type { Line } from '../types';
import { cueOf, isSpoken } from './lines';

export interface SequenceOptions {
  /** Seulement mes répliques marquées « à revoir ». */
  onlyMissed: boolean;
  /** Mes répliques au hasard, chacune précédée de sa réplique d'appel. */
  shuffled: boolean;
  isMine: (i: number) => boolean;
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

/** Répliques à enchaîner, parmi `ids` (les répliques du passage, dans l'ordre du texte). Pas de didascalies seules. */
export function buildSequence(lines: readonly Line[], ids: number[], o: SequenceOptions, random = Math.random) {
  const spoken = ids.filter((i) => isSpoken(lines[i]));
  const withCue = (i: number) => {
    const c = cueOf(lines, i, o.isMine);
    return c < 0 ? [i] : [c, i];
  };
  const mine = spoken.filter((i) => o.isMine(i) && (!o.onlyMissed || o.isMissed(i)));
  if (!mine.length) return [];
  if (o.shuffled) return shuffle(mine, random).flatMap(withCue);
  if (!o.onlyMissed) return spoken;
  const keep = new Set(mine.flatMap(withCue));
  return spoken.filter((i) => keep.has(i));
}
