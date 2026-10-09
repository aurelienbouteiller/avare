/* ---------- écran Répéter : préparation de la séance, puis répliques au fil de la répétition ---------- */
import { html, render as litRender, nothing } from 'lit-html';
import { BLOCKS, blockLines, LINES, MASKS, NOTES } from '../data/scene';
import { canRecord, checkMode, SR } from '../device/platform';
import { excerpt, isHarpagon } from '../domain/lines';
import { mastery } from '../domain/stats';
import { state } from '../state';
import { recorded } from '../storage/recordings';
import { isMissed, settings, stats } from '../storage/settings';
import type { Line, Mask, Settings } from '../types';
import { $, prefersReducedMotion } from './dom';
import { IC } from './icons';
import {
  blockHead,
  exitNote,
  frosineText,
  masked,
  masteryBar,
  masterySummary,
  percent,
  plural,
  resultView,
  type View,
} from './parts';

/* ---------- préparation ---------- */
const MASK_HELP: Record<Mask, string> = {
  coins: 'Chaque mot est caché par une pièce : seule la longueur reste.',
  initiales: 'Seule la première lettre de chaque mot est visible.',
  moitie: 'Un mot sur deux est visible.',
  visible: 'Ta réplique est affichée en entier.',
};

type SessionOption = keyof Pick<Settings, 'mask' | 'order' | 'check'>;
const segButton = (k: SessionOption, v: string, label: string, disabled = false) =>
  html`<button class="seg" data-opt=${k} data-val=${v} aria-pressed=${settings[k] === v} ?disabled=${disabled}>${label}</button>`;

function checkHelp() {
  const noSr = SR ? '' : " La reconnaissance vocale n'est pas disponible sur ce navigateur.";
  if (settings.check === 'voix') {
    const help =
      navigator.onLine === false
        ? 'Hors ligne : la vérification à la voix a besoin du réseau, elle sera manuelle.'
        : 'Le téléphone écoute ta réplique et la compare au texte.';
    return help + noSr;
  }
  if (settings.check === 'rec')
    return `Ta voix est enregistrée sur chaque réplique, pour la réécouter et la comparer au modèle.${noSr}`;
  return `Tu révèles ta réplique et tu dis toi-même si tu l'avais.${noSr}`;
}

function sessionOptions() {
  return html`<div class="opt"><span class="lbl">Mes répliques</span><div class="segs">${MASKS.map(([id, label]) => segButton('mask', id, label))}</div><p class="muted">${MASK_HELP[settings.mask]}</p></div>
    <div class="opt"><span class="lbl">Ordre</span><div class="segs">${segButton('order', 'scene', "Dans l'ordre")}${segButton('order', 'hasard', 'Au hasard')}</div></div>
    <div class="opt"><span class="lbl">Vérification</span><div class="segs">${segButton('check', 'manual', 'Manuelle')}${segButton('check', 'voix', 'À la voix', !SR)}${segButton('check', 'rec', "M'enregistrer", !canRecord())}</div>
    <p class="muted">${checkHelp()}</p></div>`;
}

// Bascule « Seulement mes répliques à revoir », montrée s'il y en a (ou si elle est déjà active).
function onlyMissedToggle() {
  const mine = blockLines(settings.block).filter(isHarpagon),
    missed = mine.filter(isMissed).length;
  if (!missed && !settings.only) return nothing;
  const detail = settings.only
    ? 'Chacune avec la réplique de Frosine qui la précède.'
    : `Sinon, les ${mine.length} répliques du passage.`;
  return html`<button class="toggle" data-act=${settings.only ? 'only-off' : 'only-on'} aria-pressed=${settings.only}><span>Seulement mes ${plural(missed, 'réplique')} à revoir<br><span class="muted" style="font-weight:500">${detail}</span></span><span class="sw"></span></button>`;
}

function blockCard() {
  const b = settings.block,
    note = NOTES[b],
    m = mastery(b, stats);
  return html`<section class="card"><p class="kicker">${b ? `Bloc ${b} sur 6` : 'Toute la scène'}</p><h2>${BLOCKS[b].short}</h2>
        <p class="obj">Objectif : ${note.obj}</p><p class="muted">${note.jeu}</p>
        <div class="meter">${masteryBar(m)}<b>${percent(m.ok, m.n)} %</b></div>
        <p class="muted" style="margin-top:.3rem">${masterySummary(m)}.</p></section>`;
}

const nothingToReview = () =>
  html`<div class="stack"><div class="card"><h2>Rien à revoir ici</h2><p>Aucune réplique de ce passage n'est marquée « à revoir ». Bravo !</p><button class="btn-s" data-act="only-off">Reprendre tout le passage</button></div></div>`;

function setup() {
  if (state.phase === 'empty') return nothingToReview();
  return html`<div class="stack">${blockCard()}
      <section class="card"><h3>Ta séance</h3>${sessionOptions()}
        ${onlyMissedToggle()}
      </section></div>`;
}

/* ---------- répliques de la séance ---------- */
// Réplique d'Harpagon en cours : masquée, avec ce qui est entendu et la barre de temps des mains libres.
function awaitingBody(line: Line) {
  const voice = checkMode() === 'voix';
  const heard =
    state.listening || voice
      ? html`<span class="heard">${state.heard ? `J'entends : « ${state.heard} »` : ''}</span>`
      : nothing;
  const timer = settings.hands && !voice ? html`<div class="timer"><i></i></div>` : nothing;
  return html`${masked(line.t, state.curMask)}${heard}${timer}`;
}

// Après « Révéler » avec enregistrement : réécouter ma prise ou le modèle.
const listenBack = (i: number) =>
  html`<div class="mini">${recorded.has(i) ? html`<button data-act="myrec" data-i=${i}>${IC.play}Ma version</button>` : nothing}<button data-act="model" data-i=${i}>${IC.play}Le modèle</button></div>`;

// Texte de la réplique d'Harpagon selon la phase : masqué, comparé à ce qui a été dit, ou en clair.
function harpagonBody(i: number, cur: boolean) {
  const line = LINES[i];
  if (cur && state.phase === 'await') return awaitingBody(line);
  if (cur && state.phase === 'check' && state.result) return resultView(state.result);
  const showListenBack = cur && state.phase === 'check' && checkMode() === 'rec' && !settings.hands;
  return html`${line.t}${showListenBack ? listenBack(i) : nothing}`;
}

function markBadge(p: number) {
  const m = state.marks[p];
  if (!m) return nothing;
  return html`<span class="mark ${m}">${m === 'ok' ? html`${IC.check}juste` : html`${IC.cross}à revoir`}</span>`;
}

/** Réplique à la position p de la séquence. */
function sequenceLine(p: number) {
  const i = state.seq[p],
    line = LINES[i];
  const cur = p === state.pos && state.phase !== 'done';
  // Réplique de Frosine qui vient d'appeler la réplique d'Harpagon en cours : mise en valeur.
  const curIsHarpagon = state.phase !== 'done' && isHarpagon(state.seq[state.pos]);
  const cue = curIsHarpagon && p === state.pos - 1 && !isHarpagon(i) && i === state.seq[state.pos] - 1;
  // « fresh » : animation d'entrée. lit crée un nœud neuf quand la réplique courante change (template différent
  // ou réplique ajoutée) et garde le même nœud sinon : l'animation ne joue qu'une fois par réplique.
  const cls = `ln ${line.w}${cur ? ' cur fresh' : `${cue ? ' cue' : ' past'} tap`}`;
  const body = isHarpagon(i)
    ? html`<span class="who"><span class="name">${cur ? 'À toi · ' : ''}Harpagon</span>${markBadge(p)}</span>${harpagonBody(i, cur)}`
    : html`<span class="who"><span class="name">Frosine</span></span>${frosineText(line, cur)}`;
  if (cur) return html`<div class=${cls}>${body}</div>`;
  // Réplique déjà passée : la toucher reprend la répétition à cet endroit.
  const label = `Reprendre à cette réplique de ${isHarpagon(i) ? 'Harpagon' : 'Frosine'}`;
  return html`<div class=${cls} data-p=${p} role="button" tabindex="0" aria-label=${label}>${body}</div>`;
}

// Séparateurs avant la réplique p : saut dans le texte, nouveau bloc, sortie d'Harpagon.
function separatorsBefore(p: number): View[] {
  const i = state.seq[p],
    line = LINES[i],
    prev = p > 0 ? state.seq[p - 1] : -1;
  const out: View[] = [];
  if (p > 0 && prev !== i - 1) out.push(html`<div class="exit">…</div>`);
  if (settings.order !== 'hasard' && (p === 0 || LINES[prev].b !== line.b)) out.push(blockHead(line.b, false));
  out.push(exitNote(line));
  return out;
}

function doneCard() {
  const { ok, ko } = state.tally,
    total = ok + ko;
  const missed = state.seq.filter((_i, p) => state.marks[p] === 'ko');
  const score = total
    ? html`<div class="score"><b>${ok} / ${total}</b><span class="muted">${ok > 1 ? 'justes' : 'juste'}</span></div>`
    : html`<p>Passage terminé.</p>`;
  const review = missed.length
    ? html`<p class="muted">À revoir :</p><ul class="missed">${missed.map((i) => html`<li>${excerpt(LINES[i].t)}</li>`)}</ul>`
    : total
      ? html`<p>Sans faute. Bravo !</p>`
      : nothing;
  const recHint =
    checkMode() === 'rec' || settings.check === 'rec'
      ? html`<p class="muted">Réécoute tes enregistrements dans Lire, avec « Ma voix ».</p>`
      : nothing;
  return html`<section class="card" style="margin-top:.8rem"><h3>Fin du passage</h3>${score}${review}${recHint}</section>`;
}

// Centre la réplique courante (ou la fin) une fois par réplique et par phase.
function scrollToCurrent(el: HTMLElement) {
  const key = `${state.pos}:${state.phase}`;
  if (key === state.lastScroll) return;
  state.lastScroll = key;
  const target = el.querySelector('.ln.cur') || el.lastElementChild;
  target?.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

export function renderRepeter() {
  const el = $('#script');
  if (state.phase === 'idle' || state.phase === 'empty') {
    litRender(setup(), el);
    return;
  }
  const last = state.phase === 'done' ? state.seq.length - 1 : state.pos;
  const out: View[] = [];
  for (let p = 0; p <= last; p++) out.push(...separatorsBefore(p), sequenceLine(p));
  if (state.phase === 'done') out.push(doneCard());
  litRender(out, el);
  scrollToCurrent(el);
}
