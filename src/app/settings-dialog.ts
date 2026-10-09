/* ---------- boîte de réglages ---------- */
import { html, render as litRender } from 'lit';
import { frosineClip } from '../device/clips';
import { RECORDED_VOICES, TTS } from '../device/platform';
import { playClip } from '../device/player';
import { hasVoices, loadVoices, pickVoice, say, sortedVoices } from '../device/tts';
import { stop } from '../engine/rehearsal';
import { interrupt } from '../engine/sound';
import { control, state } from '../state';
import { clearRecordings } from '../storage/recordings';
import { clearStats, frosineBank, settings } from '../storage/settings';
import { BANKS, isOneOf, SRCS, THEMES, TOLS } from '../types';
import { $, closest } from '../ui/dom';

const TEST_LINE = 'Ah, mon Dieu ! Que vous vous portez bien ! Et que vous avez là un vrai visage de santé !';
const input = (id: string) => $<HTMLInputElement>(id);
const select = (id: string) => $<HTMLSelectElement>(id);

/* ---------- voix du téléphone ---------- */
function fillVoices() {
  const voiceSelect = select('#optVoice'),
    info = $('#voiceInfo');
  if (!TTS) {
    litRender(html`<option>Indisponible</option>`, voiceSelect);
    voiceSelect.disabled = true;
    info.textContent = 'Ce navigateur ne lit pas le texte à voix haute.';
    return;
  }
  if (!hasVoices()) {
    litRender(html`<option value="">Voix française par défaut</option>`, voiceSelect);
    info.textContent = 'Utilisée seulement en secours.';
    return;
  }
  const chosen = pickVoice(),
    voices = sortedVoices();
  litRender(
    voices.map(
      (v, k) =>
        html`<option value=${v.voiceURI} .selected=${v.voiceURI === chosen?.voiceURI}>${v.name}${k === 0 ? ' (recommandée)' : ''}</option>`,
    ),
    voiceSelect,
  );
  info.textContent = 'Utilisée seulement en secours, si une voix enregistrée manque.';
}

// La liste des voix arrive souvent après le chargement (évènement voiceschanged).
function watchVoices() {
  if (!TTS) return;
  const reload = () => loadVoices(fillVoices);
  reload();
  try {
    speechSynthesis.addEventListener('voiceschanged', reload);
  } catch {
    speechSynthesis.onvoiceschanged = reload;
  }
}

/* ---------- valeurs affichées ---------- */
const showRate = () => {
  $('#rateVal').textContent = `×${settings.rate.toFixed(2)}`;
};

function syncDialog() {
  input('#optTts').checked = settings.tts;
  input('#optRate').value = String(settings.rate);
  showRate();
  input('#optWild').checked = settings.wild;
  input('#optHands').checked = settings.hands;
  select('#optTol').value = settings.tol || 'normale';
  fillVoices();
  $('#fieldSrc').hidden = !RECORDED_VOICES;
  $('#fieldFv').hidden = !RECORDED_VOICES || settings.src !== 'rec';
  select('#optSrc').value = settings.src;
  select('#optFv').value = frosineBank();
  $('#offlineInfo').textContent = state.offlineReady
    ? 'Disponible hors ligne : tout fonctionne sans réseau, sauf la vérification à la voix.'
    : 'Préparation du mode hors ligne au premier chargement.';
}

/* ---------- liaisons champ → réglage, sauvegardé à chaque changement ---------- */
function bindCheckbox(id: string, apply: (checked: boolean) => void) {
  input(id).addEventListener('change', (e) => {
    apply((e.target as HTMLInputElement).checked);
  });
}

function bindSelect(id: string, apply: (value: string) => void) {
  select(id).addEventListener('change', (e) => {
    apply((e.target as HTMLSelectElement).value);
  });
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

async function resetRecordings() {
  if (!confirm('Effacer tous tes enregistrements ?')) return;
  await clearRecordings();
}

export function initSettingsDialog() {
  const dialog = $<HTMLDialogElement>('#dlg');
  $('#btnSettings').addEventListener('click', () => {
    syncDialog();
    dialog.showModal();
  });
  $('#btnClose').addEventListener('click', () => dialog.close());

  bindCheckbox('#optTts', (v) => {
    settings.tts = v;
  });
  bindCheckbox('#optWild', (v) => {
    settings.wild = v;
  });
  bindCheckbox('#optHands', (v) => {
    settings.hands = v;
  });
  input('#optRate').addEventListener('input', (e) => {
    settings.rate = Number((e.target as HTMLInputElement).value);
    showRate();
  });
  bindSelect('#optTol', (v) => {
    if (isOneOf(TOLS, v)) settings.tol = v;
  });
  bindSelect('#optVoice', (v) => {
    settings.voice = v;
  });
  bindSelect('#optSrc', (v) => {
    if (isOneOf(SRCS, v)) settings.src = v;
    syncDialog(); // La comédienne n'est proposée qu'avec les voix enregistrées.
  });
  bindSelect('#optFv', (v) => {
    if (isOneOf(BANKS, v)) settings.fv = v;
  });
  $('#optTheme').addEventListener('click', (e) => {
    const t = closest(e, '[data-val]');
    if (!t || !isOneOf(THEMES, t.dataset.val)) return;
    settings.theme = t.dataset.val;
  });
  $('#btnTest').addEventListener('click', testVoice);
  $('#btnReset').addEventListener('click', resetStats);
  $('#btnResetRec').addEventListener('click', resetRecordings);
  watchVoices();
}
