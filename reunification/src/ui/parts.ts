/* ---------- morceaux de rendu partagés entre les écrans ---------- */
import { html, nothing, type TemplateResult } from 'lit';
import { join } from 'lit/directives/join.js';
import { displayName } from '../domain/lines';
import type { Mastery } from '../domain/stats';
import { state } from '../state';
import { myScenes, play, plays, scene } from '../storage/play';
import { settings } from '../storage/settings';
import type { CompareResult, Line, Mask, Phase, Seg } from '../types';
import { IC } from './icons';
import { MBAR } from './styles';

export type View = TemplateResult | typeof nothing;

export const plural = (n: number, w: string) => `${n} ${w}${n > 1 ? 's' : ''}`;
export const capitalize = (s: string) => s.replace(/^./, (c) => c.toUpperCase());

const RUN_PHASES: Phase[] = ['partner', 'await', 'check', 'done'];
/** Une répétition est en cours (ou vient de finir) : l'écran lui est consacré, sans onglets ni puces. */
export const inRun = () => settings.mode === 'repeter' && RUN_PHASES.includes(state.phase);

/* ---------- répliques ---------- */
/** Aspect d'une réplique : à lire (Lire), lue en ce moment, passée, d'appel, ou à dire (Répéter). */
export type Look = 'read' | 'playing' | 'past' | 'cue' | 'cur';

// Bordure gauche : toujours colorée pour mes répliques ; pour les partenaires, seulement quand ils donnent la réplique.
function side(mine: boolean, look: Look) {
  if (mine) return `me ml-5 rounded-r-xl border-l-me ${look === 'cur' ? 'border-l-4' : 'border-l-3'}`;
  return `other rounded-xl border-l-3 ${look === 'cue' || look === 'cur' ? 'border-l-other' : 'border-l-transparent'}`;
}

function body(mine: boolean, look: Look) {
  switch (look) {
    case 'past':
      return 'past px-3.5 py-2 text-base leading-normal opacity-50';
    case 'cue':
      return 'cue bg-surface px-4 py-3 text-lg leading-relaxed';
    case 'cur':
      return mine
        ? 'cur fresh bg-surface-2 px-4.5 pt-4 pb-4.5 text-2xl leading-relaxed shadow-card animate-enter'
        : 'cur fresh bg-other-soft px-4 py-3 text-xl leading-relaxed animate-enter';
    case 'playing':
      return `playing ${mine ? 'bg-me-soft' : 'bg-other-soft'} px-4 py-3 text-lg leading-relaxed`;
    default:
      return 'px-4 py-3 text-lg leading-relaxed';
  }
}

/** Classes d'une réplique ; tap : la toucher fait quelque chose (l'écouter, reprendre là). */
export const lineClass = (mine: boolean, look: Look, tap: boolean) =>
  `ln relative font-serif ${side(mine, look)} ${body(mine, look)}${tap ? ' cursor-pointer active:bg-surface' : ''}`;

/** Ligne du nom au-dessus d'une réplique. */
export function who(mine: boolean, name: unknown, extra: unknown = nothing) {
  return html`<span class="mb-0.5 flex items-center justify-between gap-2 font-sans text-xs font-bold tracking-widest uppercase ${mine ? 'text-me' : 'text-other'}"><span class="inline-flex items-center gap-1.5">${name}</span>${extra}</span>`;
}

/** Nom du personnage qui dit la réplique. */
export const speaker = (line: Line) => displayName(line.w);

/** Juste ou à revoir, avec son icône. */
export const markLabel = (m: 'ok' | 'ko', label: unknown) =>
  html`<span class="mark inline-flex items-center gap-1 text-xs font-bold tracking-normal normal-case [&_.ic]:size-[1em] ${m === 'ok' ? 'text-ok' : 'text-ko'}">${label}</span>`;

/** Boutons d'écoute sous une réplique (ma version, le modèle). */
export const miniRow = (buttons: unknown) => html`<div class="mt-2.5 flex flex-wrap gap-2 font-sans">${buttons}</div>`;
export const miniButton = (act: string, i: number, label: string) =>
  html`<button class="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold [&_.ic]:size-[0.9em]" data-act=${act} data-i=${i}>${IC.play}${label}</button>`;

/** Ce qui a été entendu (vérification à la voix) ; masqué tant que c'est vide. */
export const heard = (text: string) =>
  html`<span class="heard mt-2 block font-sans text-sm leading-normal text-muted empty:hidden">${text}</span>`;

/* ---------- texte des répliques ---------- */
/** Texte avec ses retours à la ligne (le texte de la pièce est écrit en lignes courtes). */
const withBreaks = (t: string) => join(t.split('\n'), html`<br>`);

const didascalia = (d: string, now = false) =>
  html`<span class="did my-1.5 block border-l-2 border-dotted border-l-muted pl-2.5 text-[0.95em] text-muted italic ${now ? 'font-semibold' : ''}">${d}</span>`;

/**
 * Texte d'une réplique, segment par segment ; les didascalies sont en marge. spoken : rendu de chaque segment dit,
 * avec son indice ; active : indice du segment surligné (lecture en cours), -1 sinon.
 */
function segsView(segs: Seg[], spoken: (t: string, k: number) => unknown, active = -1) {
  return join(
    segs.map((s, k) => (s.d !== undefined ? didascalia(s.d, k === active) : spoken(s.t, k))),
    ' ',
  );
}

/** Texte complet d'une réplique ; active : réplique en cours de lecture, dont le segment state.seg est surligné. */
export function lineText(line: Line, active = false) {
  const now = active ? state.seg : -1;
  return segsView(
    line.segs,
    (t, k) =>
      html`<span class=${k === now ? 'underline decoration-other decoration-2 underline-offset-4' : ''} data-seg=${k}>${withBreaks(t)}</span>`,
    now,
  );
}

/** Didascalie seule, entre deux répliques. */
export const stageDirection = (line: Line) =>
  html`<div class="did px-4 py-1 font-serif text-base text-muted italic">${line.segs.map((s) => s.d ?? s.t).join(' ')}</div>`;

/* ---------- masques de mes répliques ---------- */
// Ponctuation d'ouverture, mot, reste (ponctuation de fermeture).
const WORD = /^([«"(]*)([\p{L}\p{N}][\p{L}\p{N}'’-]*)(.*)$/u;
const blank = (n: number, max: number) =>
  html`<span class="ml-[0.04em] inline-block h-[1em] w-[calc(var(--n)*0.46em)] border-b-2 border-b-me align-baseline" style="--n:${Math.min(n, max)}"></span>`;

function maskWord(w: string, k: number, mask: Mask) {
  const m = w.match(WORD);
  if (!m) return w;
  const [, pre = '', word = '', post = ''] = m;
  const n = word.length;
  switch (mask) {
    case 'coins':
      return html`<span class="coin mx-[0.1em] inline-block h-[0.62em] w-[calc(var(--n)*0.42em+0.3em)] rounded-full bg-me align-middle opacity-80" style="--n:${Math.min(n, 12)}"></span>`;
    case 'initiales':
      return html`${pre}<span class="ini whitespace-nowrap">${word[0]}${n > 1 ? blank(n - 1, 10) : nothing}</span>${post}`;
    case 'moitie':
      return k % 2 === 0 ? w : html`${pre}${blank(n, 12)}${post}`;
    default:
      return w;
  }
}

/** Texte masqué, ligne par ligne ; le compte des mots continue d'une ligne à l'autre (un mot sur deux). */
function maskText(t: string, mask: Mask) {
  let k = 0;
  const rows = t.split('\n').map((row) =>
    join(
      row
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => maskWord(w, k++, mask)),
      ' ',
    ),
  );
  return join(rows, html`<br>`);
}

/** Ma réplique masquée ; les didascalies restent visibles. */
export function masked(line: Line, mask: Mask) {
  if (mask === 'visible') return lineText(line);
  return segsView(line.segs, (t) => maskText(t, mask));
}

/** Réplique comparée à ce qui a été dit : mots manquants marqués. */
export function resultView(res: CompareResult) {
  const ws = res.disp.map((w, k) =>
    res.dispOk[k]
      ? w
      : html`<span class="font-semibold text-ko underline decoration-ko decoration-wavy underline-offset-4">${w}</span>`,
  );
  return html`${join(ws, ' ')}${heard(res.said ? `Tu as dit : « ${res.said} »` : "Je n'ai rien entendu.")}`;
}

/* ---------- en-têtes de scène ---------- */
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

/** Mes personnages dans la scène b, par leur nom. */
export const myCharacters = (b: number) => {
  const s = scene(b);
  return s ? s.chars.filter((c) => plays(s, c)).map(displayName) : [];
};

/** Distribution de la scène : mes personnages en couleur. */
function cast(b: number) {
  const s = scene(b);
  if (!s) return nothing;
  const names = s.chars.map((c) =>
    plays(s, c) ? html`<b class="font-semibold text-me">${displayName(c)}</b>` : displayName(c),
  );
  return html`<p class="m-0 text-sm text-muted">Avec ${join(names, ', ')}</p>`;
}

/** En-tête de scène ; full : avec la distribution et mes notes de jeu (Lire), sinon une ligne (Répéter). */
export function sceneHead(b: number, full: boolean) {
  const s = scene(b);
  if (!s) return nothing;
  if (!full) {
    const mine = myCharacters(b);
    return html`<div class="shead mt-4 mb-0.5 flex flex-wrap items-baseline gap-2 px-1 font-sans first:mt-1"><b class="font-serif text-base">${s.title}</b>${mine.length ? html`<span class="m-0 text-sm font-semibold text-me">${mine.join(', ')}</span>` : nothing}</div>`;
  }
  const note = settings.notes[s.title] ?? '';
  const mine = myScenes().some((m) => m.n === b);
  const notes = mine
    ? html`<details class="mt-1 text-sm text-muted" data-note=${s.title} ?open=${openNotes.has(s.title)}><summary class="cursor-pointer py-1 text-sm font-semibold text-muted">Mes notes de jeu${note ? ' ·' : ''}${note ? html` <span class="font-normal">${note.split('\n')[0].slice(0, 40)}</span>` : nothing}</summary><textarea class="mt-1 block min-h-24 w-full rounded-xl border border-line bg-bg p-2.5 font-sans text-sm text-ink" data-scene-note=${s.title} placeholder="Objectifs, intentions, déplacements…" .value=${note}></textarea></details>`
    : nothing;
  return html`<div class="shead mt-5.5 mb-1 px-1 font-sans first:mt-1">
    <div class="text-xs font-bold tracking-widest text-muted uppercase">Scène ${b} sur ${play.value.scenes.length}</div>
    <h2 class="mt-px mb-1 font-serif text-xl font-semibold">${s.title}</h2>
    ${cast(b)}${notes}</div>`;
}

/* ---------- maîtrise ---------- */
export const percent = (part: number, whole: number) => (whole ? Math.round((100 * part) / whole) : 0);

/** Barre juste / à revoir ; size : hauteur et place (classes Tailwind). */
export function masteryBar(m: Mastery, size = 'h-1') {
  const w = (x: number) => (m.n ? (100 * x) / m.n : 0);
  return html`<span class="${MBAR} ${size}"><span class="bg-ok" style="width:${w(m.ok)}%"></span><span class="bg-ko" style="width:${w(m.ko)}%"></span></span>`;
}

/** « 12 sur 30 répliques sues, 3 à revoir » */
export const masterySummary = (m: Mastery) => `${m.ok} sur ${m.n} répliques sues${m.ko ? `, ${m.ko} à revoir` : ''}`;
