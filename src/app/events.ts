/* ---------- interactions de l'écran principal (évènements délégués) ---------- */
import { stop } from '../engine/rehearsal';
import { state } from '../state';
import { settings } from '../storage/settings';
import { type BeforeInstallPromptEvent, isOneOf, MODES } from '../types';
import { $, closest } from '../ui/dom';
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
  chip.scrollIntoView({ inline: 'nearest', block: 'nearest' });
}

function onActionClick(e: Event) {
  const el = closest(e, '[data-act]');
  if (el) runAction(el);
}

function toggleDayDone(d: string) {
  const { [d]: wasDone, ...others } = settings.done;
  settings.done = wasDone ? others : { ...others, [d]: true };
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

// En-tête : puces de bloc, ou bouton d'arrêt de la barre de répétition.
function onTopClick(e: Event) {
  onChipClick(e);
  onActionClick(e);
}

// Les composants se dessinent après le démarrage : les écouteurs sont posés sur leurs éléments hôtes.
export function bindEvents() {
  $('sf-tabs').addEventListener('click', onTabClick);
  $('sf-top').addEventListener('click', onTopClick);
  $('sf-dock').addEventListener('click', onActionClick);
  const script = $('sf-script');
  script.addEventListener('click', onScriptClick);
  script.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') tapLine(e);
  });
  // La vérification à la voix dépend du réseau.
  window.addEventListener('online', () => {
    state.online = true;
  });
  window.addEventListener('offline', () => {
    state.online = false;
  });
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    state.installPrompt = e as BeforeInstallPromptEvent;
  });
}
