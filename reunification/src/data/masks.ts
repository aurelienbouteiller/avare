/* ---------- masques de mes répliques et seuils de la vérification à la voix ---------- */
import type { Mask, Tol } from '../types';

export const MASKS: readonly (readonly [Mask, string])[] = [
  ['coins', 'Pastilles'],
  ['initiales', 'Initiales'],
  ['moitie', 'Un mot sur deux'],
  ['visible', 'Visible'],
];
export const TOL: Record<Tol, number> = { stricte: 0.95, normale: 0.85, souple: 0.7 };
