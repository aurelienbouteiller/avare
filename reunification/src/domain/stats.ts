/* ---------- résultats : répliques justes et à revoir ---------- */
import type { Mark, Stat } from '../types';

export interface Counts {
  ok: number;
  ko: number;
}

/** Compte un jugement ; `previous` : jugement qu'il remplace sur la même réplique (bouton « Compter juste »). */
export function recount<C extends Counts>(c: C, mark: Mark, previous?: Mark): C {
  const next = { ...c };
  if (previous) next[previous] = Math.max(0, next[previous] - 1);
  next[mark]++;
  return next;
}

export const emptyStat = (): Stat => ({ ok: 0, ko: 0, last: '' });

export interface Mastery extends Counts {
  /** Nombre de mes répliques. */
  n: number;
}

/** Maîtrise de mes répliques `ids` (identifiants de réplique), d'après le dernier jugement de chacune. */
export function mastery(ids: readonly string[], stats: Record<string, Stat>): Mastery {
  const last = (m: Mark) => ids.filter((id) => stats[id]?.last === m).length;
  return { n: ids.length, ok: last('ok'), ko: last('ko') };
}
