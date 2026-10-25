/* ---------- répliques : qui parle, rôles, enchaînements ---------- */
import type { Line } from '../types';

/** Clé d'un rôle : un personnage dans une scène (le même nom peut être joué par d'autres ailleurs). */
export const roleKey = (sceneTitle: string, who: string) => `${sceneTitle}|${who}`;

/** « LA GRANDE SŒUR » → « La grande sœur ». */
export const displayName = (who: string) => who.toLocaleLowerCase('fr').replace(/^./, (c) => c.toLocaleUpperCase('fr'));

/** Réplique dite (pas une didascalie seule). */
export const isSpoken = (line: Line) => line.w !== '';

/**
 * Réplique d'un partenaire juste avant la réplique i (celle qui me donne la réplique), ou -1.
 * Les didascalies seules sont sautées ; on ne remonte pas avant le début de la scène.
 */
export function cueOf(lines: readonly Line[], i: number, isMine: (i: number) => boolean) {
  for (let k = i - 1; k >= 0 && lines[k].b === lines[i].b; k--) {
    if (!isSpoken(lines[k])) continue;
    return isMine(k) ? -1 : k;
  }
  return -1;
}

/** Début d'une réplique, coupé après quelques mots. */
export function excerpt(t: string, words = 8) {
  const w = t.split(/\s+/);
  return w.slice(0, words).join(' ') + (w.length > words ? '…' : '');
}
