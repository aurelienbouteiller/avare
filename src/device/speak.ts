/* ---------- répliques dites : voix enregistrées, sinon voix du téléphone, sinon un temps de lecture ---------- */
import { LINES } from '../data/scene';
import { state } from '../state';
import { settings } from '../storage/settings';
import { frosineClip, harpagonClip } from './clips';
import { TTS } from './platform';
import { playClip } from './player';
import { wait } from './timing';
import { say } from './tts';

// Temps laissé pour lire une didascalie, ou une réplique quand aucune voix n'est disponible.
const DIDASCALIA_MS = 1700;
const SILENT_FROSINE_MS = 1500;
const SILENT_HARPAGON_MS = 2000;
// Respiration entre deux segments enregistrés.
const SEGMENT_GAP_MS = 120;

/** Réplique d'Harpagon dite par le modèle. */
export async function playHarpagonModel(i: number, token: number) {
  const clip = await harpagonClip(i);
  if (clip) return playClip(clip, settings.rate, token);
  if (TTS) return say(LINES[i].t, 0.95 * settings.rate, 0.9, token);
  await wait(SILENT_HARPAGON_MS);
  return token === state.token;
}

export interface FrosineVoice {
  bank: string;
  rate: number;
  pitch: number;
}

/** Un segment de Frosine : clip enregistré, sinon synthèse, sinon silence. Faux si la séquence est interrompue. */
async function playSegment(i: number, k: number, text: string, v: FrosineVoice, token: number) {
  const clip = await frosineClip(v.bank, i, k);
  if (clip) {
    const ok = await playClip(clip, v.rate, token);
    if (ok) await wait(SEGMENT_GAP_MS);
    return ok;
  }
  if (TTS) return say(text, v.rate, v.pitch, token);
  await wait(SILENT_FROSINE_MS);
  return token === state.token;
}

/**
 * Réplique i de Frosine, segment par segment.
 * onSegment : appelé avec l'indice du segment en cours, puis -1 à la fin de la réplique.
 */
export async function playFrosineLine(i: number, v: FrosineVoice, token: number, onSegment: (k: number) => void) {
  for (const [k, s] of (LINES[i].segs ?? []).entries()) {
    if (token !== state.token) return false;
    onSegment(k);
    if (s.d !== undefined) await wait(DIDASCALIA_MS / Math.max(v.rate, 0.6));
    else if (!(await playSegment(i, k, s.t, v, token))) return false;
  }
  onSegment(-1);
  return token === state.token;
}
