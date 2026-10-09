/* ---------- moteur de répétition : Frosine donne la réplique, Harpagon répond ---------- */

import { blockLines, LINES, MASKS, TOL } from '../data/scene';
import { prefetch } from '../device/clips';
import { listen } from '../device/listen';
import { canVoice, checkMode } from '../device/platform';
import { playClip } from '../device/player';
import { releaseMic, startRecorder, stopRecorder } from '../device/recorder';
import { type FrosineVoice, playFrosineLine, playHarpagonModel } from '../device/speak';
import { wait } from '../device/timing';
import { isScreenLocked, keepScreenOn, releaseScreen } from '../device/wake-lock';
import { compare } from '../domain/compare';
import { today } from '../domain/dates';
import { isHarpagon } from '../domain/lines';
import { buildSequence } from '../domain/sequence';
import { emptyStat, recount } from '../domain/stats';
import { state } from '../state';
import { recordingUrl } from '../storage/recordings';
import { frosineBank, isMissed, save, settings, stats } from '../storage/settings';
import { BANKS, type Line, type Mark } from '../types';
import { renderDock } from '../ui/dock';
import { render, renderScript } from '../ui/render';
import { interrupt, markSegment, steadyVoice } from './sound';

// Pauses de l'enchaînement mains libres.
const AFTER_CORRECT_MS = 1300;
const BEFORE_MODEL_MS = 400;
const AFTER_MY_TAKE_MS = 300;
// Temps pour se redire la réplique quand le modèle n'est pas joué.
const SELF_CHECK_MS = 2600;
const BEFORE_NEXT_MS = 500;

const currentLine = () => state.seq[state.pos];

/* ---------- début et fin ---------- */
function start() {
  interrupt();
  state.voiceOff = false;
  state.notice = '';
  state.seq = buildSequence(blockLines(settings.block), {
    onlyMissed: settings.only,
    shuffled: settings.order === 'hasard',
    isMissed,
  });
  state.tally = { ok: 0, ko: 0 };
  state.marks = {};
  state.pos = -1;
  if (!state.seq.length) {
    state.phase = 'empty';
    render();
    return;
  }
  keepScreenOn();
  next();
}

function finish() {
  state.phase = 'done';
  releaseScreen();
  releaseMic();
  render();
}

export function stop() {
  interrupt();
  state.phase = 'idle';
  releaseScreen();
  releaseMic();
  render();
}

/* ---------- réplique suivante ---------- */
function next() {
  interrupt();
  state.pos++;
  state.result = null;
  state.heard = '';
  if (state.pos >= state.seq.length) {
    finish();
    return;
  }
  if (!isScreenLocked()) keepScreenOn();
  prefetch(state.seq.slice(state.pos, state.pos + 3), frosineBank());
  if (isHarpagon(currentLine())) beginHarpagon();
  else beginFrosine();
}

/** Partenaire imprévisible : voix, débit, ton et temps de réaction changent à chaque réplique. */
function unpredictableVoice(): FrosineVoice & { delay: number } {
  return {
    bank: BANKS[Math.floor(Math.random() * BANKS.length)],
    rate: settings.rate * (0.82 + Math.random() * 0.4),
    pitch: 0.96 + Math.random() * 0.1,
    delay: Math.random() * 1400,
  };
}

async function beginFrosine() {
  state.phase = 'frosine';
  render();
  if (!canVoice()) return; // Pas de voix : on lit la réplique et on passe soi-même.
  const i = currentLine(),
    token = state.token;
  const voice = settings.wild ? unpredictableVoice() : { ...steadyVoice(), delay: 300 };
  await wait(voice.delay);
  if (token !== state.token) return;
  const finished = await playFrosineLine(i, voice, token, markSegment);
  if (finished && token === state.token) next();
}

/* ---------- réplique d'Harpagon : écoute, enregistrement, minuteur ---------- */
function beginHarpagon() {
  const i = currentLine();
  state.phase = 'await';
  state.curMask = settings.mask;
  state.result = null;
  state.heard = '';
  render();
  const token = state.token,
    check = checkMode();
  if (check === 'voix') {
    startListening(i, token);
    return;
  }
  if (check === 'rec') startRecording(i, token);
  if (settings.hands) startHandsFreeTimer(LINES[i]);
}

function startListening(i: number, token: number) {
  listen(LINES[i].t, token, {
    onStart: renderDock,
    onHeard(text) {
      state.heard = text;
      renderScript();
    },
    onDone: (said) => evaluate(i, said),
    onUnavailable(notice) {
      state.voiceOff = true;
      state.notice = notice;
      if (token !== state.token) return;
      render();
      if (settings.hands) startHandsFreeTimer(LINES[i]);
    },
  });
}

async function startRecording(i: number, token: number) {
  const r = await startRecorder(i, token);
  if (r === 'started') renderDock();
  else if (r === 'denied') {
    state.notice = "Micro refusé : l'enregistrement est désactivé.";
    settings.check = 'manual';
    save();
    render();
  }
}

/** Temps laissé pour dire la réplique en mains libres : un socle plus un temps par mot, selon le débit. */
const handsFreeMs = (line: Line) => 1600 + (line.t.split(/\s+/).length * 450) / Math.max(settings.rate, 0.7);

// Barre de temps sous la réplique courante, remplie en `ms`.
function animateTimerBar(ms: number) {
  const bar = document.querySelector<HTMLElement>('.ln.cur .timer i');
  if (!bar) return;
  // La barre peut être réutilisée par le rendu (Réessayer) : repartir de zéro sans transition.
  bar.style.transitionDuration = '0ms';
  bar.style.width = '0';
  void bar.offsetWidth;
  bar.style.transitionDuration = `${ms}ms`;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      bar.style.width = '100%';
    }),
  );
}

function startHandsFreeTimer(line: Line) {
  const ms = handsFreeMs(line),
    token = state.token;
  animateTimerBar(ms);
  state.timerId = setTimeout(() => {
    if (token === state.token) reveal();
  }, ms);
}

/* ---------- vérification ---------- */
function stopListening() {
  state.listener?.abort();
  state.listener = null;
  state.listening = false;
}

function reveal() {
  clearTimeout(state.timerId);
  const check = checkMode();
  stopListening();
  const wasRecording = state.recording;
  if (wasRecording) stopRecorder(true);
  state.phase = 'check';
  render();
  if (!settings.hands) return;
  // Nouveau jeton : rien de ce qui précède (minuteur, écoute) ne doit plus relancer l'enchaînement.
  const i = currentLine(),
    token = ++state.token;
  handsFreeAfterReveal(i, token, check === 'rec' && wasRecording);
}

// Mains libres, après « Révéler » : ma prise si je viens de m'enregistrer, puis le modèle, puis la suite.
async function handsFreeAfterReveal(i: number, token: number, playMyTake: boolean) {
  if (playMyTake) {
    await state.recSaved;
    const url = await recordingUrl(i);
    if (url && token === state.token) {
      await playClip(url, 1, token);
      await wait(AFTER_MY_TAKE_MS);
    }
  }
  if (token === state.token) await modelThenNext(i, token);
}

// Mains libres : le modèle (ou un temps pour se redire la réplique), puis la réplique suivante.
async function modelThenNext(i: number, token: number) {
  if (settings.tts) await playHarpagonModel(i, token);
  else await wait(SELF_CHECK_MS);
  if (token !== state.token) return;
  await wait(BEFORE_NEXT_MS);
  if (token === state.token) next();
}

function evaluate(i: number, said: string) {
  state.result = compare(LINES[i].t, said);
  const ok = state.result.score >= TOL[settings.tol || 'normale'];
  record(ok ? 'ok' : 'ko');
  state.phase = 'check';
  render();
  if (!settings.hands) return;
  const token = ++state.token;
  handsFreeAfterVoice(i, token, ok);
}

// Mains libres, après la vérification à la voix : juste, on enchaîne ; à revoir, on entend d'abord le modèle.
async function handsFreeAfterVoice(i: number, token: number, ok: boolean) {
  if (ok) {
    await wait(AFTER_CORRECT_MS);
    if (token === state.token) next();
    return;
  }
  await wait(BEFORE_MODEL_MS);
  await modelThenNext(i, token);
}

/** Compte la réplique courante juste ou à revoir (un nouveau jugement remplace le précédent). */
function record(mark: Mark) {
  const i = currentLine(),
    previous = state.marks[state.pos];
  stats[i] = { ...recount(stats[i] ?? emptyStat(), mark, previous), last: mark };
  state.tally = recount(state.tally, mark, previous);
  state.marks[state.pos] = mark;
  // Répliques travaillées aujourd'hui : un jugement corrigé ne compte pas deux fois.
  if (!previous) settings.daily[today()] = (settings.daily[today()] || 0) + 1;
  save();
}

function judge(ok: boolean) {
  record(ok ? 'ok' : 'ko');
  next();
}

/** Inverse le jugement de la réplique courante (« Compter juste » / « Compter faux »). */
function flip() {
  record(state.marks[state.pos] === 'ok' ? 'ko' : 'ok');
  render();
}

function retry() {
  interrupt();
  beginHarpagon();
}

/** Indice : passe au masque suivant, moins couvrant. */
function hint() {
  const order = MASKS.map(([id]) => id);
  const k = order.indexOf(state.curMask);
  state.curMask = order[Math.min(k + 1, order.length - 1)];
  renderScript();
}

/** Reprend à la dernière réplique de Frosine. */
function replay() {
  const p = state.seq.slice(0, state.pos + 1).findLastIndex((i) => !isHarpagon(i));
  if (p >= 0) goTo(p);
}

/** Reprend la répétition à la position p de la séquence. */
function goTo(p: number) {
  if (p < 0 || p >= state.seq.length) return;
  state.pos = p - 1;
  next();
}

export const engine = { start, stop, next, reveal, hint, replay, retry, flip, judge, goTo };
