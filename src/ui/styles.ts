/* ---------- classes Tailwind partagées par plusieurs composants ---------- */
// Écrites en entier : le scanner de Tailwind ne voit que les classes présentes telles quelles dans le code.
// Les noms sans utilitaire (`card`, `ln`…) sont des repères pour les tests e2e et le défilement.

/* cartes */
const CARD_BOX = 'card min-w-0 max-w-full rounded-2xl border border-line bg-surface font-sans leading-normal';
export const CARD = `${CARD_BOX} px-4.5 py-4.5`;
/** Carte sans marge intérieure (bandeau pleine largeur). */
export const CARD_FLUSH = `${CARD_BOX} overflow-hidden p-0`;
export const CARD_TITLE = 'mt-0 mb-1.5 font-serif text-2xl leading-tight font-semibold';
export const CARD_LABEL = 'mt-0 mb-2.5 text-xs font-bold tracking-widest text-muted uppercase';
export const CARD_TEXT = 'my-1.5';
export const MUTED = 'text-sm text-muted';
export const KICKER = 'my-1.5 text-xs font-bold tracking-widest text-muted uppercase';
/** Colonne de cartes. */
export const STACK = 'mx-auto flex min-w-0 max-w-full flex-col gap-3.5';

/* boutons */
const BTN_S_BOX =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-semibold [&_.ic]:size-[1em]';
export const BTN_S = `${BTN_S_BOX} border-line bg-surface-2`;
/** Bouton secondaire d'une action destructrice. */
export const BTN_S_KO = `${BTN_S_BOX} border-[color-mix(in_srgb,var(--ko)_40%,var(--line))] bg-transparent text-ko`;
export const BTN_L =
  'flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-base font-bold text-on-accent';
/** Bouton rond à icône (réglages, fermer, arrêter). */
export const ICON_BTN = 'grid size-11 flex-none place-items-center rounded-full border border-line bg-surface p-0';

/* choix segmentés (séance, thème) */
export const SEGS =
  'no-scrollbar flex min-w-0 max-w-full gap-1 overflow-x-auto rounded-xl border border-line bg-bg p-1';
export const SEG =
  'min-w-0 flex-1 rounded-lg bg-transparent px-1.5 py-2 text-sm leading-tight font-semibold text-muted disabled:opacity-35 aria-pressed:bg-surface-2 aria-pressed:text-ink aria-pressed:shadow-sm';

/* interrupteur : case à cocher (réglages) ou bouton aria-pressed qui l'entoure (séance) */
const KNOB =
  "after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-surface after:transition-transform after:duration-200 after:content-['']";
const SWITCH_BOX = `relative h-7 w-12 flex-none rounded-2xl bg-line transition-colors duration-200 ${KNOB}`;
export const SWITCH_INPUT = `${SWITCH_BOX} m-0 cursor-pointer appearance-none checked:bg-accent checked:after:translate-x-5`;
export const SWITCH_IN_BUTTON = `${SWITCH_BOX} group-aria-pressed:bg-accent group-aria-pressed:after:translate-x-5`;

/* barre de maîtrise */
export const MBAR = 'mbar flex overflow-hidden rounded-sm bg-line';
