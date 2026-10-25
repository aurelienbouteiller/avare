/* ---------- boîte de réglages : ouverture et changements (le contenu est rendu par ui/settings) ---------- */

import { TTS } from '../device/platform';
import { characterVoice, playPartnerLine } from '../device/speak';
import { loadVoices } from '../device/tts';
import { stop } from '../engine/rehearsal';
import { interrupt } from '../engine/sound';
import { control } from '../state';
import { isMine, lines } from '../storage/play';
import { clearRecordings } from '../storage/recordings';
import { clearStats, settings } from '../storage/settings';
import { isOneOf, THEMES, TOLS } from '../types';
import { $, closest } from '../ui/dom';

const dialog = () => $<HTMLDialogElement>('#dlg');

// La liste des voix arrive souvent après le chargement (évènement voiceschanged).
function watchVoices() {
  if (!TTS) return;
  loadVoices();
  try {
    speechSynthesis.addEventListener('voiceschanged', loadVoices);
  } catch {
    speechSynthesis.onvoiceschanged = loadVoices;
  }
}

// Première réplique d'un partenaire (sinon la première réplique), dite avec la voix de son personnage.
function testVoice() {
  interrupt();
  const all = lines();
  const i = Math.max(
    0,
    all.findIndex((l, k) => l.w && !isMine(k)),
  );
  if (all[i]) playPartnerLine(i, characterVoice(all[i].w), control.token, () => {});
}

function resetStats() {
  if (!confirm('Effacer tous tes résultats (répliques justes et à revoir) ?')) return;
  clearStats();
  settings.only = false;
  settings.daily = {};
  stop();
}

function resetRecordings() {
  if (!confirm('Effacer tous tes enregistrements ?')) return;
  clearRecordings();
}

const CLICKS: Record<string, () => void> = {
  btnClose: () => dialog().close(),
  btnTest: testVoice,
  btnReset: resetStats,
  btnResetRec: resetRecordings,
};

function onClick(e: Event) {
  const theme = closest(e, '#optTheme [data-val]')?.dataset.val;
  if (isOneOf(THEMES, theme)) settings.theme = theme;
  const button = closest(e, 'button[id]');
  if (button) CLICKS[button.id]?.();
}

// Champ → réglage : sauvegardé et réaffiché tout seul.
function onChange(e: Event) {
  const el = e.target as HTMLInputElement | HTMLSelectElement;
  const v = el.value,
    checked = el instanceof HTMLInputElement && el.checked;
  switch (el.id) {
    case 'optTts':
      settings.tts = checked;
      break;
    case 'optMix':
      settings.mix = checked;
      break;
    case 'optShow':
      settings.showDate = /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '';
      break;
    case 'optWild':
      settings.wild = checked;
      break;
    case 'optHands':
      settings.hands = checked;
      break;
    case 'optRate':
      settings.rate = Number(v);
      break;
    case 'optTol':
      if (isOneOf(TOLS, v)) settings.tol = v;
      break;
    case 'optVoice':
      settings.voice = v;
      break;
  }
}

export function initSettingsDialog() {
  $('sf-top').addEventListener('click', (e) => {
    if (closest(e, '#btnSettings')) dialog().showModal();
  });
  const host = $('sf-settings');
  host.addEventListener('click', onClick);
  host.addEventListener('change', onChange);
  host.addEventListener('input', onChange);
  watchVoices();
}
