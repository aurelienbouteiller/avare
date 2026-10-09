/* ---------- morceaux de rendu partagés entre les écrans ---------- */
import { html, nothing, type TemplateResult } from 'lit';
import { join } from 'lit/directives/join.js';
import { BLOCKS, NOTES } from '../data/scene';
import type { Mastery } from '../domain/stats';
import { state } from '../state';
import type { CompareResult, Line, Mask } from '../types';

export type View = TemplateResult | typeof nothing;

export const plural = (n: number, w: string) => `${n} ${w}${n > 1 ? 's' : ''}`;
export const capitalize = (s: string) => s.replace(/^./, (c) => c.toUpperCase());
const words = (t: string) => t.split(/\s+/).filter(Boolean);

/* ---------- masques de la réplique d'Harpagon ---------- */
// Ponctuation d'ouverture, mot, reste (ponctuation de fermeture).
const WORD = /^([«"(]*)([\p{L}\p{N}][\p{L}\p{N}'’-]*)(.*)$/u;
const blank = (n: number, max: number) => html`<span class="blank" style="--n:${Math.min(n, max)}"></span>`;

function maskWord(w: string, k: number, mask: Mask) {
  const m = w.match(WORD);
  if (!m) return w;
  const [, pre = '', word = '', post = ''] = m;
  const n = word.length;
  switch (mask) {
    case 'coins':
      return html`<span class="coin" style="--n:${Math.min(n, 12)}"></span>`;
    case 'initiales':
      return html`${pre}<span class="ini">${word[0]}${n > 1 ? blank(n - 1, 10) : nothing}</span>${post}`;
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

/* ---------- répliques ---------- */
/** Texte de Frosine en segments ; active : réplique en cours de lecture, dont le segment state.seg est surligné. */
export function frosineText(line: Line, active: boolean) {
  const segs = (line.segs ?? []).map((s, k) => {
    const now = active && k === state.seg ? ' now' : '';
    return s.d !== undefined
      ? html`<span class="dida${now}" data-seg=${k}>${s.d}</span>`
      : html`<span class="seg-t${now}" data-seg=${k}>${s.t}</span>`;
  });
  return join(segs, ' ');
}

export const exitNote = (line: Line) =>
  line.end ? html`<div class="exit">Harpagon sort. Frosine reste seule.</div>` : nothing;

/** Réplique comparée à ce qui a été dit : mots manquants marqués. */
export function resultView(res: CompareResult) {
  const ws = res.disp.map((w, k) => (res.dispOk[k] ? w : html`<span class="miss">${w}</span>`));
  return html`${join(ws, ' ')}<span class="heard">${res.said ? `Tu as dit : « ${res.said} »` : "Je n'ai rien entendu."}</span>`;
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
  if (!full) return html`<div class="bhead slim"><b>${block.label}</b><span class="obj">${note.obj}</span></div>`;
  return html`<div class="bhead"><div class="bnum">Bloc ${b} sur 6</div><h2>${block.short}</h2><p class="obj">Objectif : ${note.obj}</p>
    <details data-note=${b} ?open=${openNotes.has(String(b))}><summary>Note de jeu</summary><p>${note.jeu}</p></details></div>`;
}

/* ---------- maîtrise ---------- */
export const percent = (part: number, whole: number) => Math.round((100 * part) / whole);

export function masteryBar(m: Mastery) {
  return html`<span class="mbar"><span class="g" style="width:${(100 * m.ok) / m.n}%"></span><span class="r" style="width:${(100 * m.ko) / m.n}%"></span></span>`;
}

/** « 12 sur 30 répliques sues, 3 à revoir » */
export const masterySummary = (m: Mastery) => `${m.ok} sur ${m.n} répliques sues${m.ko ? `, ${m.ko} à revoir` : ''}`;
