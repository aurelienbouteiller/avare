/* ---------- voix du téléphone (synthèse vocale) ---------- */
import { control } from '../state';
import { settings } from '../storage/settings';
import { TTS } from './platform';
import { settleOnce, wait } from './timing';

let voices: SpeechSynthesisVoice[] = [];

/** Relit les voix françaises disponibles (la liste arrive parfois après le chargement de la page). */
export function loadVoices(onChange: () => void) {
  if (!TTS) return;
  voices = speechSynthesis.getVoices().filter((v) => (v.lang || '').toLowerCase().replace('_', '-').startsWith('fr'));
  onChange();
}

export const hasVoices = () => voices.length > 0;

// Les voix « naturelles » ou en ligne sont nettement meilleures que les voix embarquées de base.
function voiceScore(v: SpeechSynthesisVoice) {
  const n = (v.name || '').toLowerCase();
  let s = 0;
  if (/fr[-_]fr/i.test(v.lang)) s += 20;
  if (/natural|neural|online|wavenet|premium|enhanced|amélioré|haute qualité|network|réseau/.test(n)) s += 40;
  if (/google/.test(n)) s += 25;
  if (v.localService === false) s += 10;
  if (/compact|espeak|robot/.test(n)) s -= 40;
  return s;
}

/** Voix françaises, la meilleure en premier. */
export const sortedVoices = () => voices.slice().sort((a, b) => voiceScore(b) - voiceScore(a));

/** Voix choisie dans les réglages, sinon la meilleure. */
export function pickVoice() {
  if (!voices.length) return null;
  return voices.find((v) => v.voiceURI === settings.voice) || sortedVoices()[0];
}

// Pause après une phrase, selon sa ponctuation finale.
function pauseAfter(sentence: string) {
  if (/\.\.\.$/.test(sentence)) return 150;
  const end = sentence.trim().slice(-1);
  if (end === '!' || end === '?') return 380;
  if (end === '.' || end === '…') return 330;
  return 200;
}

// Phrase par phrase : les longues répliques sont coupées net par certains moteurs.
const sentences = (t: string) => t.split(/(?<=[.!?…;:])\s+/).filter(Boolean);

function sayOne(text: string, rate: number, pitch: number) {
  const { promise, settle } = settleOnce((text.length * 95) / rate + 2500, undefined);
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    const v = pickVoice();
    if (v) u.voice = v;
    u.rate = rate;
    u.pitch = pitch;
    u.onend = () => settle(undefined);
    u.onerror = () => settle(undefined);
    speechSynthesis.speak(u);
  } catch {
    settle(undefined);
  }
  return promise;
}

/** Dit le texte ; faux si la séquence `token` a été interrompue. */
export async function say(text: string, rate: number, pitch: number, token: number) {
  const parts = sentences(text);
  for (const [k, p] of parts.entries()) {
    if (token !== control.token) return false;
    await sayOne(p, rate, pitch);
    if (k < parts.length - 1) await wait(pauseAfter(p) / Math.max(rate, 0.6));
  }
  return token === control.token;
}

export function stopTts() {
  if (!TTS) return;
  try {
    speechSynthesis.cancel();
  } catch {}
}
