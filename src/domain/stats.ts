/* ---------- résultats : répliques justes et à revoir ---------- */
import { LINES } from '../data/scene';
import type { Mark, Stat } from '../types';
import { isHarpagon } from './lines';

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
  /** Nombre de répliques d'Harpagon. */
  n: number;
}

/** Maîtrise d'un bloc (0 : toute la scène), d'après le dernier jugement de chaque réplique d'Harpagon. */
export function mastery(block: number, stats: Record<number, Stat>): Mastery {
  const mine = LINES.map((_l, i) => i).filter((i) => isHarpagon(i) && (block === 0 || LINES[i].b === block));
  const last = (m: Mark) => mine.filter((i) => stats[i]?.last === m).length;
  return { n: mine.length, ok: last('ok'), ko: last('ko') };
}
