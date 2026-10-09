/* ---------- actions des boutons (attribut data-act) et changements de séance ---------- */
import { PLAN } from '../data/scene';
import { playLine, playModel, playMyTake, playPassage, stopPassage } from '../engine/passage';
import { engine, stop } from '../engine/rehearsal';
import { state } from '../state';
import { settings } from '../storage/settings';
import { CHECKS, isOneOf, MASK_IDS, type Mode, ORDERS, type Preset } from '../types';
import { closest } from '../ui/dom';

/** Change d'écran (et de bloc) en arrêtant ce qui est en cours. */
export function showScreen(mode: Mode, block?: number) {
  stop();
  settings.mode = mode;
  if (block !== undefined) {
    settings.block = block;
    settings.only = false;
  }
  window.scrollTo(0, 0);
}

/** Séance proposée par le plan de répétition (jour d, bouton k). */
export function applyPlanPreset(d: number, k: number) {
  const p = PLAN[d]?.go[k]?.p;
  if (p) applyPreset(p);
}

function applyPreset(p: Preset) {
  stop();
  settings.mode = p.mode || 'repeter';
  settings.block = p.block || 0;
  if (settings.mode === 'repeter') {
    settings.mask = p.mask || 'coins';
    settings.order = p.order || 'scene';
    settings.only = !!p.only;
    settings.wild = !!p.wild;
    if (p.check) settings.check = p.check;
  }
  window.scrollTo(0, 0);
}

/** Option de séance de l'écran Répéter (masque, ordre, vérification). */
export function setSessionOption(k?: string, v?: string) {
  if (k === 'mask' && isOneOf(MASK_IDS, v)) settings.mask = v;
  else if (k === 'order' && isOneOf(ORDERS, v)) settings.order = v;
  else if (k === 'check' && isOneOf(CHECKS, v)) settings.check = v;
}

// « Seulement mes répliques à revoir » ; puis l'écran de préparation, ou directement la répétition.
function setOnlyMissed(only: boolean, thenStart: boolean) {
  settings.only = only;
  if (thenStart) engine.start();
  else {
    state.phase = 'idle';
  }
}

function install() {
  const prompt = state.installPrompt;
  if (!prompt) return;
  prompt.prompt();
  prompt.userChoice.finally(() => {
    state.installPrompt = null;
  });
}

// Réplique désignée par le bouton (data-i).
const lineOf = (el: HTMLElement) => Number(el.dataset.i);

const ACTIONS: Record<string, (el: HTMLElement) => void> = {
  // répétition
  start: engine.start,
  stop: engine.stop,
  'run-stop': engine.stop,
  skip: engine.next,
  reveal: engine.reveal,
  hint: engine.hint,
  replay: engine.replay,
  retry: engine.retry,
  flip: engine.flip,
  ok: () => engine.judge(true),
  ko: () => engine.judge(false),
  'only-on': () => setOnlyMissed(true, false),
  'only-off': () => setOnlyMissed(false, false),
  'only-start': () => setOnlyMissed(true, true),
  'only-off-start': () => setOnlyMissed(false, true),
  // navigation
  'go-block': (el) => showScreen('repeter', Number(el.dataset.b)),
  'to-repeter': () => showScreen('repeter'),
  // lecture
  'play-all': () => playPassage(false),
  'play-mine': () => playPassage(true),
  'stop-all': stopPassage,
  myrec: (el) => playMyTake(lineOf(el)),
  model: (el) => playModel(lineOf(el)),
  // appli
  install,
};

export function runAction(el: HTMLElement) {
  ACTIONS[el.dataset.act ?? '']?.(el);
}

/** Touche sur une réplique : l'écouter (Lire) ou reprendre la répétition là (Répéter). */
export function tapLine(e: Event) {
  if (settings.mode === 'jour') return;
  const lire = settings.mode === 'lire';
  const line = closest(e, lire ? '.ln[data-i]' : '.ln[data-p]');
  if (!line) return;
  e.preventDefault();
  if (lire) playLine(Number(line.dataset.i));
  else engine.goTo(Number(line.dataset.p));
}
