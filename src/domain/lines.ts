/* ---------- répliques de la scène : qui parle, enchaînements ---------- */
import { LINES } from '../data/scene';

export const isHarpagon = (i: number) => LINES[i].w === 'H';

/** Réplique de Frosine juste avant la réplique i (celle qui lui donne la réplique), ou -1. */
const cueOf = (i: number) => (i > 0 && LINES[i - 1].w === 'F' ? i - 1 : -1);

/** La réplique i précédée de sa réplique d'appel, s'il y en a une. */
export function withCue(i: number) {
  const c = cueOf(i);
  return c < 0 ? [i] : [c, i];
}

/** Début d'une réplique, coupé après quelques mots. */
export function excerpt(t: string, words = 8) {
  const w = t.split(/\s+/);
  return w.slice(0, words).join(' ') + (w.length > words ? '…' : '');
}
