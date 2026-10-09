/* ---------- classes Tailwind partagées par plusieurs composants ---------- */
// Écrites en entier : le scanner de Tailwind ne voit que les classes présentes telles quelles dans le code.
// Les noms sans utilitaire (`card`, `ln`…) sont des repères pour les tests e2e et le défilement.

/* cartes */
const CARD_BOX = 'card min-w-0 max-w-full rounded-[18px] border border-line bg-surface font-sans leading-normal';
export const CARD = `${CARD_BOX} px-[1.15rem] py-[1.1rem]`;
/** Carte sans marge intérieure (bandeau pleine largeur). */
export const CARD_FLUSH = `${CARD_BOX} overflow-hidden p-0`;
export const CARD_TITLE = 'mt-0 mb-[0.35rem] font-serif text-[1.45rem] leading-[1.2] font-semibold';
export const CARD_LABEL = 'mt-0 mb-[0.6rem] text-[0.78rem] font-bold tracking-[0.1em] text-muted uppercase';
export const CARD_TEXT = 'my-[0.35rem]';
export const MUTED = 'text-[0.9rem] text-muted';
export const KICKER = 'my-[0.35rem] text-[0.8rem] font-bold tracking-[0.1em] text-muted uppercase';
/** Colonne de cartes. */
export const STACK = 'mx-auto flex min-w-0 max-w-full flex-col gap-[0.9rem]';

/* boutons */
const BTN_S_BOX =
  'inline-flex min-h-11 items-center justify-center gap-[0.4rem] rounded-xl border px-[0.9rem] py-[0.45rem] text-[0.92rem] font-semibold [&_.ic]:size-[1em]';
export const BTN_S = `${BTN_S_BOX} border-line bg-surface-2`;
/** Bouton secondaire d'une action destructrice. */
export const BTN_S_KO = `${BTN_S_BOX} border-[color-mix(in_srgb,var(--ko)_40%,var(--line))] bg-transparent text-ko`;
export const BTN_L =
  'flex min-h-13 w-full items-center justify-center gap-2 rounded-[14px] bg-accent px-4 py-[0.6rem] text-[1.02rem] font-bold text-on-accent';
/** Bouton rond à icône (réglages, fermer, arrêter). */
export const ICON_BTN = 'grid size-11 flex-none place-items-center rounded-full border border-line bg-surface p-0';

/* choix segmentés (séance, thème) */
export const SEGS =
  'no-scrollbar flex min-w-0 max-w-full gap-[3px] overflow-x-auto rounded-xl border border-line bg-bg p-[3px]';
export const SEG =
  'min-w-0 flex-[1_1_0] rounded-[9px] bg-transparent px-[0.35rem] py-2 text-[0.84rem] leading-[1.2] font-semibold text-muted disabled:opacity-35 aria-pressed:bg-surface-2 aria-pressed:text-ink aria-pressed:shadow-[0_1px_3px_rgba(0,0,0,0.18)]';

/* interrupteur : case à cocher (réglages) ou bouton aria-pressed qui l'entoure (séance) */
const KNOB =
  "after:absolute after:top-[3px] after:left-[3px] after:size-[calc(1.7rem-6px)] after:rounded-full after:bg-surface after:transition-transform after:duration-200 after:content-['']";
const SWITCH_BOX = `relative h-[1.7rem] w-[2.9rem] flex-none rounded-2xl bg-line transition-[background] duration-200 ${KNOB}`;
export const SWITCH_INPUT = `${SWITCH_BOX} m-0 cursor-pointer appearance-none checked:bg-accent checked:after:translate-x-[1.2rem]`;
export const SWITCH_IN_BUTTON = `${SWITCH_BOX} group-aria-pressed:bg-accent group-aria-pressed:after:translate-x-[1.2rem]`;

/* barre de maîtrise */
export const MBAR = 'mbar flex overflow-hidden rounded-sm bg-line';
