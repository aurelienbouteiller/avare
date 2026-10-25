/* ---------- interactions de l'écran principal (évènements délégués) ---------- */
import { readPdf } from '../device/pdf';
import { bookToScript } from '../domain/book';
import { stop } from '../engine/rehearsal';
import { state } from '../state';
import { settings } from '../storage/settings';
import { type BeforeInstallPromptEvent, isOneOf, MODES } from '../types';
import { $, closest } from '../ui/dom';
import { applySuggestion, runAction, setSessionOption, showScreen, tapLine, tapRole } from './actions';

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

// Zone de texte : boutons d'action, séance proposée, rôles, options de séance, ou une réplique.
function onScriptClick(e: Event) {
  const action = closest(e, '[data-act]');
  if (action) {
    e.stopPropagation();
    runAction(action);
    return;
  }
  const go = closest(e, '[data-go]');
  if (go) {
    applySuggestion(Number(go.dataset.go));
    return;
  }
  const role = closest(e, '[data-role]');
  if (role) {
    tapRole(role);
    return;
  }
  const opt = closest(e, '[data-opt]');
  if (opt) {
    setSessionOption(opt.dataset.opt, opt.dataset.val);
    return;
  }
  tapLine(e);
}

// Champs de l'écran principal : texte collé, fichier ouvert, notes de jeu.
function onScriptInput(e: Event) {
  const el = e.target as HTMLElement;
  if (el.id === 'draft') state.draft = (el as HTMLTextAreaElement).value;
  const note = el.dataset.sceneNote;
  if (note !== undefined) {
    const { [note]: _old, ...others } = settings.notes;
    const v = (el as HTMLTextAreaElement).value;
    settings.notes = v.trim() ? { ...others, [note]: v } : others;
  }
}

// Un PDF (édition numérique) est lu et mis au format d'import ; un fichier texte est pris tel quel.
async function readFile(file: File) {
  if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) return file.text();
  state.importing = true;
  try {
    return bookToScript(await readPdf(file));
  } finally {
    state.importing = false;
  }
}

async function onScriptChange(e: Event) {
  const el = e.target as HTMLInputElement;
  if (el.id !== 'fileText') return;
  const file = el.files?.[0];
  el.value = '';
  if (!file) return;
  try {
    state.draft = await readFile(file);
  } catch (err) {
    console.warn(err);
    alert("Ce fichier n'a pas pu être lu.");
  }
}

// En-tête : puces de scène, ou bouton d'arrêt de la barre de répétition.
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
  script.addEventListener('input', onScriptInput);
  script.addEventListener('change', onScriptChange);
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
