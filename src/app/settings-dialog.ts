/* ---------- boîte de réglages : ouverture et changements (le contenu est rendu par ui/settings) ---------- */
import { frosineClip } from '../device/clips';
import { TTS } from '../device/platform';
import { playClip } from '../device/player';
import { loadVoices, say } from '../device/tts';
import { stop } from '../engine/rehearsal';
import { interrupt } from '../engine/sound';
import { control } from '../state';
import { clearRecordings } from '../storage/recordings';
import { clearStats, frosineBank, settings } from '../storage/settings';
import { BANKS, isOneOf, SRCS, THEMES, TOLS } from '../types';
import { $, closest } from '../ui/dom';

const TEST_LINE = 'Ah, mon Dieu ! Que vous vous portez bien ! Et que vous avez là un vrai visage de santé !';
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

async function testVoice() {
  interrupt();
  const token = control.token;
  const clip = await frosineClip(frosineBank(), 1, 0);
  if (clip) playClip(clip, settings.rate, token);
  else if (TTS) say(TEST_LINE, settings.rate, 1, token);
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
    case 'optSrc':
      if (isOneOf(SRCS, v)) settings.src = v;
      break;
    case 'optFv':
      if (isOneOf(BANKS, v)) settings.fv = v;
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
