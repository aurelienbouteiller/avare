/* ---------- séance proposée pour aujourd'hui, d'après la maîtrise de chaque scène ---------- */
import type { Mask, Preset } from '../types';
import type { Mastery } from './stats';

export interface SceneProgress {
  n: number;
  title: string;
  m: Mastery;
  /** Nombre de mes répliques déjà travaillées (jugées au moins une fois). */
  seen: number;
}
export interface Suggestion {
  title: string;
  text: string;
  go: { l: string; p: Preset }[];
}

// Une scène est sue quand 80 % de mes répliques le sont.
const KNOWN = 0.8;
const ratio = (s: SceneProgress) => (s.m.n ? s.m.ok / s.m.n : 1);
// Masque selon la maîtrise : plus la scène est sue, moins on voit le texte.
const maskFor = (r: number): Mask => (r < 0.4 ? 'moitie' : r < 0.7 ? 'initiales' : 'coins');
const plural = (n: number, w: string) => `${n} ${w}${n > 1 ? 's' : ''}`;

/**
 * Séance du jour : d'abord les répliques à revoir, puis la scène la moins sue parmi celles déjà commencées, puis une
 * scène nouvelle, enfin des filages. daysLeft : jours avant la représentation (null : pas de date).
 */
export function suggest(scenes: readonly SceneProgress[], daysLeft: number | null): Suggestion | null {
  const mine = scenes.filter((s) => s.m.n > 0);
  if (!mine.length) return null;
  const review = mine.filter((s) => s.m.ko > 0).sort((a, b) => b.m.ko - a.m.ko)[0];
  if (review)
    return {
      title: `Revoir : ${review.title}`,
      text: `${plural(review.m.ko, 'réplique')} à revoir. Reprends-les seules, chacune avec sa réplique d'appel, puis toute la scène.`,
      go: [
        { l: 'Les répliques à revoir', p: { block: review.n, mask: 'initiales', only: true } },
        { l: 'Toute la scène', p: { block: review.n, mask: maskFor(ratio(review)) } },
      ],
    };
  const weak = mine.filter((s) => s.seen > 0 && ratio(s) < KNOWN).sort((a, b) => ratio(a) - ratio(b))[0];
  if (weak)
    return {
      title: `Consolider : ${weak.title}`,
      text: `${weak.m.ok} sur ${plural(weak.m.n, 'réplique')} sues. Continue en cachant un peu plus le texte à chaque passage.`,
      go: [
        { l: 'Répéter la scène', p: { block: weak.n, mask: maskFor(ratio(weak)) } },
        { l: 'Relire', p: { mode: 'lire', block: weak.n } },
      ],
    };
  const fresh = mine.find((s) => s.seen === 0);
  if (fresh)
    return {
      title: `Découvrir : ${fresh.title}`,
      text: 'Lis la scène deux ou trois fois à voix haute, avec tous les rôles, puis commence à apprendre la tienne avec un mot sur deux.',
      go: [
        { l: 'Lire la scène', p: { mode: 'lire', block: fresh.n } },
        { l: 'Apprendre', p: { block: fresh.n, mask: 'moitie' } },
      ],
    };
  if (daysLeft !== null && daysLeft <= 3)
    return {
      title: 'Filage imprévisible',
      text: "Toutes tes scènes, dans le désordre, avec un partenaire imprévisible : tu dois pouvoir repartir de n'importe où.",
      go: [
        { l: 'Filage dans le désordre', p: { block: 0, mask: 'coins', order: 'hasard', wild: true } },
        { l: 'Relire', p: { mode: 'lire', block: 0 } },
      ],
    };
  return {
    title: 'Filage',
    text: 'Tu connais toutes tes scènes. Enchaîne-les sans regarder le texte, puis dans le désordre.',
    go: [
      { l: 'Toutes mes scènes', p: { block: 0, mask: 'coins' } },
      { l: 'Dans le désordre', p: { block: 0, mask: 'coins', order: 'hasard' } },
    ],
  };
}
