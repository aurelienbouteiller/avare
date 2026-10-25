/* ---------- écran Répéter : préparation de la séance, puis répliques au fil de la répétition ---------- */
import { html, nothing } from 'lit';
import { keyed } from 'lit/directives/keyed.js';
import { MASKS } from '../data/masks';
import { canRecord, checkMode, SR } from '../device/platform';
import { excerpt, isSpoken } from '../domain/lines';
import { mastery } from '../domain/stats';
import { state } from '../state';
import { isMine, isMissed, lines, myLineIds, play, sceneLabel, sceneLines } from '../storage/play';
import { recorded } from '../storage/recordings';
import { settings, stats } from '../storage/settings';
import type { Line, Mask, Settings } from '../types';
import { Component } from './component';
import { prefersReducedMotion } from './dom';
import { IC } from './icons';
import {
  heard,
  lineClass,
  lineText,
  markLabel,
  masked,
  masteryBar,
  masterySummary,
  miniButton,
  miniRow,
  myCharacters,
  percent,
  plural,
  resultView,
  sceneHead,
  speaker,
  stageDirection,
  type View,
  who,
} from './parts';
import {
  BTN_S,
  CARD,
  CARD_LABEL,
  CARD_TEXT,
  CARD_TITLE,
  KICKER,
  MUTED,
  SEG,
  SEGS,
  STACK,
  SWITCH_IN_BUTTON,
} from './styles';

/* ---------- préparation ---------- */
const MASK_HELP: Record<Mask, string> = {
  coins: 'Chaque mot est caché par une pastille : seule sa longueur reste.',
  initiales: 'Seule la première lettre de chaque mot est visible.',
  moitie: 'Un mot sur deux est visible.',
  visible: 'Ta réplique est affichée en entier.',
};

type SessionOption = keyof Pick<Settings, 'mask' | 'order' | 'check'>;
const segButton = (k: SessionOption, v: string, label: string, disabled = false) =>
  html`<button class=${SEG} data-opt=${k} data-val=${v} aria-pressed=${settings[k] === v} ?disabled=${disabled}>${label}</button>`;

function checkHelp() {
  const noSr = SR ? '' : " La reconnaissance vocale n'est pas disponible sur ce navigateur.";
  if (settings.check === 'voix') {
    const help = !state.online
      ? 'Hors ligne : la vérification à la voix a besoin du réseau, elle sera manuelle.'
      : 'Le téléphone écoute ta réplique et la compare au texte.';
    return help + noSr;
  }
  if (settings.check === 'rec')
    return `Ta voix est enregistrée sur chaque réplique, pour la réécouter et la comparer au modèle.${noSr}`;
  return `Tu révèles ta réplique et tu dis toi-même si tu l'avais.${noSr}`;
}

const option = (label: string, choices: unknown, help: unknown = nothing) =>
  html`<div class="mt-4 first-of-type:mt-1"><span class="mb-1.5 block text-xs font-semibold text-muted">${label}</span><div class=${SEGS}>${choices}</div>${help}</div>`;
const optionHelp = (text: string) => html`<p class="mt-1.5 mb-0 text-sm text-muted">${text}</p>`;

function sessionOptions() {
  return html`${option(
    'Mes répliques',
    MASKS.map(([id, label]) => segButton('mask', id, label)),
    optionHelp(MASK_HELP[settings.mask]),
  )}
    ${option('Ordre', html`${segButton('order', 'scene', "Dans l'ordre")}${segButton('order', 'hasard', 'Au hasard')}`)}
    ${option(
      'Vérification',
      html`${segButton('check', 'manual', 'Manuelle')}${segButton('check', 'voix', 'À la voix', !SR)}${segButton('check', 'rec', "M'enregistrer", !canRecord())}`,
      optionHelp(checkHelp()),
    )}`;
}

// Bascule « Seulement mes répliques à revoir », montrée s'il y en a (ou si elle est déjà active).
function onlyMissedToggle() {
  const mine = sceneLines(settings.block).filter(isMine),
    missed = mine.filter(isMissed).length;
  if (!missed && !settings.only) return nothing;
  const detail = settings.only
    ? 'Chacune avec la réplique qui la précède.'
    : `Sinon, les ${mine.length} répliques du passage.`;
  return html`<button class="group mt-4 flex w-full items-center justify-between gap-4 rounded-xl border border-line bg-bg px-3.5 py-3 text-left text-sm font-semibold" data-act=${settings.only ? 'only-off' : 'only-on'} aria-pressed=${settings.only}><span>Seulement mes ${plural(missed, 'réplique')} à revoir<br><span class="${MUTED} font-medium">${detail}</span></span><span class=${SWITCH_IN_BUTTON}></span></button>`;
}

function sceneCard() {
  const b = settings.block,
    m = mastery(myLineIds(b), stats.value);
  const title = b ? sceneLabel(b) : 'Toutes mes scènes';
  const kicker = b ? `Scène ${b} sur ${play.value.scenes.length}` : plural(myLineIds(0).length, 'réplique');
  const roles = b ? myCharacters(b) : [];
  const note = b ? settings.notes[sceneLabel(b)] : '';
  return html`<section class=${CARD}><p class=${KICKER}>${kicker}</p><h2 class=${CARD_TITLE}>${title}</h2>
        ${roles.length ? html`<p class="${CARD_TEXT} text-sm font-semibold text-me">Tu joues ${roles.join(' et ')}</p>` : nothing}
        ${note ? html`<p class="${CARD_TEXT} ${MUTED} whitespace-pre-line">${note}</p>` : nothing}
        <div class="mt-3 flex items-center gap-3">${masteryBar(m, 'h-2 flex-1')}<b class="text-base">${percent(m.ok, m.n)} %</b></div>
        <p class="mt-1 mb-1.5 ${MUTED}">${masterySummary(m)}.</p></section>`;
}

const notCast = () =>
  html`<div class=${STACK}><div class="${CARD} not-cast"><h2 class=${CARD_TITLE}>Tu ne joues pas ici</h2><p class=${CARD_TEXT}>${
    myLineIds(0).length
      ? "Tu n'as pas de rôle dans cette scène. Choisis une de tes scènes en haut, ou ajoute ce rôle à ta distribution."
      : 'Choisis d’abord les personnages que tu joues, scène par scène.'
  }</p><button class=${BTN_S} data-act="to-roles">Choisir mes rôles</button></div></div>`;

const nothingToReview = () =>
  html`<div class=${STACK}><div class=${CARD}><h2 class=${CARD_TITLE}>Rien à revoir ici</h2><p class=${CARD_TEXT}>Aucune réplique de ce passage n'est marquée « à revoir ». Bravo !</p><button class=${BTN_S} data-act="only-off">Reprendre tout le passage</button></div></div>`;

function setup() {
  if (state.phase === 'empty') return nothingToReview();
  if (!myLineIds(settings.block).length) return notCast();
  return html`<div class=${STACK}>${sceneCard()}
      <section class=${CARD}><h3 class=${CARD_LABEL}>Ta séance</h3>${sessionOptions()}
        ${onlyMissedToggle()}
      </section></div>`;
}

/* ---------- répliques de la séance ---------- */
// Ma réplique en cours : masquée, avec ce qui est entendu et la barre de temps des mains libres.
function awaitingBody(line: Line) {
  const voice = checkMode() === 'voix';
  const heardNow = state.listening || voice ? heard(state.heard ? `J'entends : « ${state.heard} »` : '') : nothing;
  // Un nœud neuf à chaque départ du minuteur, pour que l'animation reparte de zéro (Réessayer).
  const bar = state.timerAt
    ? keyed(
        state.timerAt,
        html`<i class="block h-full w-0 bg-me animate-fill motion-reduce:w-full" style="animation-duration:${state.timerMs}ms"></i>`,
      )
    : nothing;
  const timer =
    settings.hands && !voice
      ? html`<div class="timer mt-3 h-1 overflow-hidden rounded-sm bg-line">${bar}</div>`
      : nothing;
  return html`${masked(line, state.curMask)}${heardNow}${timer}`;
}

// Après « Révéler » avec enregistrement : réécouter ma prise ou le modèle.
const listenBack = (i: number) =>
  miniRow(
    html`${recorded.value.has(lines()[i].id) ? miniButton('myrec', i, 'Ma version') : nothing}${miniButton('model', i, 'Le modèle')}`,
  );

// Texte de ma réplique selon la phase : masqué, comparé à ce qui a été dit, ou en clair.
function myBody(i: number, cur: boolean) {
  const line = lines()[i];
  if (cur && state.phase === 'await') return awaitingBody(line);
  if (cur && state.phase === 'check' && state.result) return resultView(state.result);
  const showListenBack = cur && state.phase === 'check' && checkMode() === 'rec' && !settings.hands;
  return html`${lineText(line)}${showListenBack ? listenBack(i) : nothing}`;
}

function markBadge(p: number) {
  const m = state.marks[p];
  if (!m) return nothing;
  return markLabel(m, m === 'ok' ? html`${IC.check}juste` : html`${IC.cross}à revoir`);
}

/** Réplique à la position p de la séquence. */
function sequenceLine(p: number) {
  const i = state.seq[p],
    line = lines()[i],
    mine = isMine(i);
  const cur = p === state.pos && state.phase !== 'done';
  // Réplique du partenaire qui vient d'appeler ma réplique en cours : mise en valeur.
  const curIsMine = state.phase !== 'done' && isMine(state.seq[state.pos]);
  const cue = curIsMine && p === state.pos - 1 && !mine && line.b === lines()[state.seq[state.pos]].b;
  // Animation d'entrée (classe `fresh`) : lit crée un nœud neuf quand la réplique courante change (template
  // différent ou réplique ajoutée) et garde le même nœud sinon. L'animation ne joue qu'une fois par réplique.
  const look = cur ? 'cur' : cue ? 'cue' : 'past';
  const content = mine
    ? html`${who(true, `${cur ? 'À toi · ' : ''}${speaker(line)}`, markBadge(p))}${myBody(i, cur)}`
    : html`${who(false, speaker(line))}${lineText(line, cur)}`;
  if (cur) return html`<div class=${lineClass(mine, look, false)}>${content}</div>`;
  // Réplique déjà passée : la toucher reprend la répétition à cet endroit.
  const label = `Reprendre à cette réplique de ${speaker(line)}`;
  return html`<div class=${lineClass(mine, look, true)} data-p=${p} role="button" tabindex="0" aria-label=${label}>${content}</div>`;
}

const aside = (text: string) => html`<div class="py-1.5 text-center font-sans text-sm text-muted italic">${text}</div>`;

// Séparateurs avant la réplique p : nouvelle scène, saut dans le texte, ou didascalies qui la précèdent.
function separatorsBefore(p: number): View[] {
  const all = lines(),
    i = state.seq[p],
    line = all[i],
    prev = p > 0 ? state.seq[p - 1] : -1;
  const out: View[] = [];
  const newScene = p === 0 || all[prev].b !== line.b;
  if (settings.order !== 'hasard' && newScene) out.push(sceneHead(line.b, false));
  const between = prev >= 0 && prev < i && !newScene ? all.slice(prev + 1, i) : [];
  if (between.some(isSpoken) || (p > 0 && prev > i)) out.push(aside('…'));
  else for (const l of between) out.push(stageDirection(l));
  return out;
}

function doneCard() {
  const { ok, ko } = state.tally,
    total = ok + ko;
  const missed = state.seq.filter((_i, p) => state.marks[p] === 'ko');
  const score = total
    ? html`<div class="score mt-1 mb-1.5 flex items-baseline gap-2"><b class="font-serif text-4xl leading-none text-me">${ok} / ${total}</b><span class=${MUTED}>${ok > 1 ? 'justes' : 'juste'}</span></div>`
    : html`<p class=${CARD_TEXT}>Passage terminé.</p>`;
  const review = missed.length
    ? html`<p class="${CARD_TEXT} ${MUTED}">À revoir :</p><ul class="mt-2.5 mb-0 list-none p-0">${missed.map((i) => html`<li class="mt-1.5 border-l-3 border-l-ko py-2 pr-0 pl-3 font-serif text-base text-ink">${excerpt(lines()[i].t)}</li>`)}</ul>`
    : total
      ? html`<p class=${CARD_TEXT}>Sans faute. Bravo !</p>`
      : nothing;
  const recHint =
    checkMode() === 'rec' || settings.check === 'rec'
      ? html`<p class="${CARD_TEXT} ${MUTED}">Réécoute tes enregistrements dans Lire, avec « Ma voix ».</p>`
      : nothing;
  return html`<section class="${CARD} mt-3"><h3 class=${CARD_LABEL}>Fin du passage</h3>${score}${review}${recHint}</section>`;
}

export class Repeter extends Component {
  #lastScroll = '';

  protected override render() {
    if (state.phase === 'idle' || state.phase === 'empty') return setup();
    const last = state.phase === 'done' ? state.seq.length - 1 : state.pos;
    const out: View[] = [];
    for (let p = 0; p <= last; p++) out.push(...separatorsBefore(p), sequenceLine(p));
    if (state.phase === 'done') out.push(doneCard());
    return out;
  }

  // Centre la réplique courante (ou la fin) une fois par réplique et par phase.
  protected override updated() {
    if (state.phase === 'idle' || state.phase === 'empty') return;
    const key = `${state.pos}:${state.phase}`;
    if (key === this.#lastScroll) return;
    this.#lastScroll = key;
    const target = this.querySelector('.ln.cur') || this.lastElementChild;
    target?.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }
}
customElements.define('sf-repeter', Repeter);

declare global {
  interface HTMLElementTagNameMap {
    'sf-repeter': Repeter;
  }
}
