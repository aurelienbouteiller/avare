/* ---------- interactions de l'écran principal (évènements délégués) ---------- */
import { stop } from '../engine/rehearsal';
import { state } from '../state';
import { save, settings } from '../storage/settings';
import { type BeforeInstallPromptEvent, isOneOf, MODES } from '../types';
import { $, closest } from '../ui/dom';
import { render } from '../ui/render';
import { applyPlanPreset, runAction, setSessionOption, showScreen, tapLine } from './actions';

function onTabClick(e: Event) {
  const t = closest(e, '[data-mode]');
  if (t && isOneOf(MODES, t.dataset.mode)) showScreen(t.dataset.mode);
}

function onChipClick(e: Event) {
  const chip = closest(e, '[data-block]');
  if (!chip) return;
  stop();
  settings.block = Number(chip.dataset.block);
  settings.only = false;
  save();
  render();
  chip.scrollIntoView({ inline: 'nearest', block: 'nearest' });
}

function onActionClick(e: Event) {
  const el = closest(e, '[data-act]');
  if (el) runAction(el);
}

function toggleDayDone(d: string) {
  if (settings.done[d]) delete settings.done[d];
  else settings.done[d] = true;
  save();
  render();
}

// Zone de texte : boutons d'action, séances du plan, séance faite, options de séance, ou une réplique.
function onScriptClick(e: Event) {
  const action = closest(e, '[data-act]');
  if (action) {
    e.stopPropagation();
    runAction(action);
    return;
  }
  const go = closest(e, '[data-go]');
  if (go) {
    const [d = 0, k = 0] = (go.dataset.go ?? '').split(':').map(Number);
    applyPlanPreset(d, k);
    return;
  }
  const done = closest(e, '[data-done]')?.dataset.done;
  if (done) {
    toggleDayDone(done);
    return;
  }
  const opt = closest(e, '[data-opt]');
  if (opt) {
    setSessionOption(opt.dataset.opt, opt.dataset.val);
    return;
  }
  tapLine(e);
}

export function bindEvents() {
  $('.tabs').addEventListener('click', onTabClick);
  $('#chips').addEventListener('click', onChipClick);
  $('#row').addEventListener('click', onActionClick);
  $('#runbar').addEventListener('click', onActionClick);
  $('#script').addEventListener('click', onScriptClick);
  $('#script').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') tapLine(e);
  });
  // L'aide de la vérification à la voix dépend du réseau.
  window.addEventListener('online', () => render());
  window.addEventListener('offline', () => render());
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    state.installPrompt = e as BeforeInstallPromptEvent;
    if (settings.mode === 'jour') render();
  });
}
