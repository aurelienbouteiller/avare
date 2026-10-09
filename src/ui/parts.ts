/* ---------- morceaux de rendu partagés entre les écrans ---------- */
import { html, nothing, type TemplateResult } from 'lit';
import { join } from 'lit/directives/join.js';
import { BLOCKS, NOTES } from '../data/scene';
import type { Mastery } from '../domain/stats';
import { state } from '../state';
import { settings } from '../storage/settings';
import type { CompareResult, Line, Mask, Phase } from '../types';
import { IC } from './icons';
import { MBAR } from './styles';

export type View = TemplateResult | typeof nothing;

export const plural = (n: number, w: string) => `${n} ${w}${n > 1 ? 's' : ''}`;
export const capitalize = (s: string) => s.replace(/^./, (c) => c.toUpperCase());
const words = (t: string) => t.split(/\s+/).filter(Boolean);

const RUN_PHASES: Phase[] = ['frosine', 'await', 'check', 'done'];
/** Une répétition est en cours (ou vient de finir) : l'écran lui est consacré, sans onglets ni puces. */
export const inRun = () => settings.mode === 'repeter' && RUN_PHASES.includes(state.phase);

/* ---------- répliques ---------- */
/** Aspect d'une réplique : à lire (Lire), lue en ce moment, passée, d'appel, ou à dire (Répéter). */
export type Look = 'read' | 'playing' | 'past' | 'cue' | 'cur';

// Bordure gauche : toujours dorée pour Harpagon ; pour Frosine, visible seulement quand elle donne la réplique.
function side(line: Line, look: Look) {
  if (line.w === 'H') return `H ml-5 rounded-r-xl border-l-harp ${look === 'cur' ? 'border-l-4' : 'border-l-3'}`;
  return `F rounded-xl border-l-3 ${look === 'cue' || look === 'cur' ? 'border-l-fros' : 'border-l-transparent'}`;
}

function body(line: Line, look: Look) {
  switch (look) {
    case 'past':
      return 'past px-[0.85rem] py-[0.45rem] text-[1rem] leading-normal opacity-50';
    case 'cue':
      return 'cue bg-surface px-[0.95rem] py-3 text-[1.15rem] leading-[1.6]';
    case 'cur':
      return line.w === 'H'
        ? 'cur fresh bg-surface-2 px-[1.1rem] pt-4 pb-[1.1rem] text-[1.42rem] leading-[1.6] shadow-card animate-enter'
        : 'cur fresh bg-fros-soft px-[0.95rem] py-3 text-[1.25rem] leading-[1.6] animate-enter';
    case 'playing':
      return `playing ${line.w === 'H' ? 'bg-harp-soft' : 'bg-fros-soft'} px-[0.95rem] py-3 text-[1.15rem] leading-[1.6]`;
    default:
      return 'px-[0.95rem] py-3 text-[1.15rem] leading-[1.6]';
  }
}

/** Classes d'une réplique ; tap : la toucher fait quelque chose (l'écouter, reprendre là). */
export const lineClass = (line: Line, look: Look, tap: boolean) =>
  `ln relative font-serif ${side(line, look)} ${body(line, look)}${tap ? ' cursor-pointer active:bg-surface' : ''}`;

/** Ligne du nom au-dessus d'une réplique. */
export function who(line: Line, look: Look, name: unknown, extra: unknown = nothing) {
  const size =
    look === 'past' ? 'text-[0.68rem]' : look === 'cur' && line.w === 'H' ? 'text-[0.8rem]' : 'text-[0.74rem]';
  return html`<span class="mb-[0.15rem] flex items-center justify-between gap-2 font-sans ${size} font-bold tracking-[0.08em] uppercase ${line.w === 'H' ? 'text-harp' : 'text-fros'}"><span class="inline-flex items-center gap-[0.4rem]">${name}</span>${extra}</span>`;
}

/** Juste ou à revoir, avec son icône. */
export const markLabel = (m: 'ok' | 'ko', label: unknown) =>
  html`<span class="mark inline-flex items-center gap-[0.2rem] text-[0.8rem] font-bold tracking-normal normal-case [&_.ic]:size-[1em] ${m === 'ok' ? 'text-ok' : 'text-ko'}">${label}</span>`;

/** Boutons d'écoute sous une réplique (ma version, le modèle). */
export const miniRow = (buttons: unknown) =>
  html`<div class="mt-[0.6rem] flex flex-wrap gap-[0.45rem] font-sans">${buttons}</div>`;
export const miniButton = (act: string, i: number, label: string) =>
  html`<button class="inline-flex items-center gap-[0.35rem] rounded-full border border-line bg-surface px-[0.8rem] py-[0.4rem] text-[0.85rem] font-semibold [&_.ic]:size-[0.9em]" data-act=${act} data-i=${i}>${IC.play}${label}</button>`;

/** Ce qui a été entendu (vérification à la voix) ; masqué tant que c'est vide. */
export const heard = (text: string) =>
  html`<span class="heard mt-[0.55rem] block font-sans text-[0.86rem] leading-[1.45] text-muted empty:hidden">${text}</span>`;

/* ---------- masques de la réplique d'Harpagon ---------- */
// Ponctuation d'ouverture, mot, reste (ponctuation de fermeture).
const WORD = /^([«"(]*)([\p{L}\p{N}][\p{L}\p{N}'’-]*)(.*)$/u;
const blank = (n: number, max: number) =>
  html`<span class="ml-[0.04em] inline-block h-[1em] w-[calc(var(--n)*0.46em)] border-b-2 border-b-harp align-baseline" style="--n:${Math.min(n, max)}"></span>`;

function maskWord(w: string, k: number, mask: Mask) {
  const m = w.match(WORD);
  if (!m) return w;
  const [, pre = '', word = '', post = ''] = m;
  const n = word.length;
  switch (mask) {
    case 'coins':
      return html`<span class="coin mx-[0.1em] inline-block h-[0.62em] w-[calc(var(--n)*0.42em+0.3em)] rounded-[1em] bg-harp align-middle opacity-80" style="--n:${Math.min(n, 12)}"></span>`;
    case 'initiales':
      return html`${pre}<span class="ini whitespace-nowrap">${word[0]}${n > 1 ? blank(n - 1, 10) : nothing}</span>${post}`;
    case 'moitie':
      return k % 2 === 0 ? w : html`${pre}${blank(n, 12)}${post}`;
    default:
      return w;
  }
}

export function masked(t: string, mask: Mask) {
  if (mask === 'visible') return t;
  return join(
    words(t).map((w, k) => maskWord(w, k, mask)),
    ' ',
  );
}

/** Texte de Frosine en segments ; active : réplique en cours de lecture, dont le segment state.seg est surligné. */
export function frosineText(line: Line, active: boolean) {
  const segs = (line.segs ?? []).map((s, k) => {
    const now = active && k === state.seg;
    return s.d !== undefined
      ? html`<span class="my-[0.35rem] block border-l-2 border-dotted border-l-harp pl-[0.6rem] text-[0.95em] text-harp italic ${now ? 'font-semibold' : ''}" data-seg=${k}>${s.d}</span>`
      : html`<span class=${now ? 'underline decoration-fros decoration-2 underline-offset-[0.22em]' : ''} data-seg=${k}>${s.t}</span>`;
  });
  return join(segs, ' ');
}

/** Note entre deux répliques (sortie d'Harpagon, saut dans le texte). */
export const aside = (text: string) =>
  html`<div class="py-[0.4rem] text-center font-sans text-[0.84rem] text-muted italic">${text}</div>`;

export const exitNote = (line: Line) => (line.end ? aside('Harpagon sort. Frosine reste seule.') : nothing);

/** Réplique comparée à ce qui a été dit : mots manquants marqués. */
export function resultView(res: CompareResult) {
  const ws = res.disp.map((w, k) =>
    res.dispOk[k]
      ? w
      : html`<span class="font-semibold text-ko underline decoration-ko decoration-wavy underline-offset-[0.22em]">${w}</span>`,
  );
  return html`${join(ws, ' ')}${heard(res.said ? `Tu as dit : « ${res.said} »` : "Je n'ai rien entendu.")}`;
}

/* ---------- en-têtes de bloc ---------- */
// Notes de jeu ouvertes dans Lire : gardées ouvertes quand le texte est redessiné.
const openNotes = new Set<string>();
document.addEventListener(
  'toggle',
  (e) => {
    const d = e.target;
    if (d instanceof HTMLDetailsElement && d.dataset.note)
      d.open ? openNotes.add(d.dataset.note) : openNotes.delete(d.dataset.note);
  },
  true,
);

/** En-tête de bloc ; full : avec le titre et la note de jeu (Lire), sinon une ligne (Répéter). */
export function blockHead(b: number, full: boolean) {
  const note = NOTES[b],
    block = BLOCKS[b];
  if (!full)
    return html`<div class="bhead mt-4 mb-[0.1rem] flex flex-wrap items-baseline gap-2 px-[0.2rem] font-sans first:mt-[0.2rem]"><b class="font-serif text-[1.02rem]">${block.label}</b><span class="m-0 text-[0.82rem] font-semibold text-harp">${note.obj}</span></div>`;
  return html`<div class="bhead mt-[1.4rem] mb-[0.3rem] px-[0.2rem] font-sans first:mt-[0.2rem]">
    <div class="text-[0.72rem] font-bold tracking-[0.12em] text-muted uppercase">Bloc ${b} sur 6</div>
    <h2 class="mt-[0.05rem] mb-[0.2rem] font-serif text-[1.35rem] font-semibold">${block.short}</h2>
    <p class="m-0 text-[0.92rem] font-semibold text-harp">Objectif : ${note.obj}</p>
    <details class="mt-[0.3rem] text-[0.9rem] text-muted" data-note=${b} ?open=${openNotes.has(String(b))}><summary class="cursor-pointer py-[0.2rem] text-[0.85rem] font-semibold text-muted">Note de jeu</summary><p class="mt-[0.25rem] mb-0 leading-normal">${note.jeu}</p></details></div>`;
}

/* ---------- maîtrise ---------- */
export const percent = (part: number, whole: number) => Math.round((100 * part) / whole);

/** Barre juste / à revoir ; size : hauteur et place (classes Tailwind). */
export function masteryBar(m: Mastery, size = 'h-1') {
  return html`<span class="${MBAR} ${size}"><span class="bg-ok" style="width:${(100 * m.ok) / m.n}%"></span><span class="bg-ko" style="width:${(100 * m.ko) / m.n}%"></span></span>`;
}

/** « 12 sur 30 répliques sues, 3 à revoir » */
export const masterySummary = (m: Mastery) => `${m.ok} sur ${m.n} répliques sues${m.ko ? `, ${m.ko} à revoir` : ''}`;
