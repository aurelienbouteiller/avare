/* ---------- répliques dites par la voix du téléphone, sinon un temps de lecture ---------- */
import { timbreOf } from '../domain/timbre';
import { control } from '../state';
import { lines } from '../storage/play';
import { settings } from '../storage/settings';
import { TTS } from './platform';
import { wait } from './timing';
import { pickVoice, say, sortedVoices } from './tts';

// Temps laissé pour lire une didascalie, ou une réplique quand aucune voix n'est disponible.
const DIDASCALIA_MS = 1700;
const SILENT_PARTNER_MS = 1500;
const SILENT_MODEL_MS = 2000;
// Nombre de voix du téléphone (les meilleures) réparties entre les personnages.
const MIXED_VOICES = 4;

export interface PartnerVoice {
  rate: number;
  pitch: number;
  voice: SpeechSynthesisVoice | null;
}

/** Voix d'un personnage : la sienne si les voix sont variées, sinon celle des réglages. */
export function characterVoice(who: string, rate = settings.rate): PartnerVoice {
  const t = timbreOf(who);
  if (!settings.mix) return { rate, pitch: 1, voice: null };
  const best = sortedVoices().slice(0, MIXED_VOICES);
  return { rate, pitch: t.pitch, voice: best.length > 1 ? best[t.slot % best.length] : null };
}

/** Ma réplique i dite comme modèle, avec la voix des réglages. */
export async function playModel(i: number, token: number) {
  if (TTS) return say(lines()[i].t, 0.95 * settings.rate, 1, token, pickVoice());
  await wait(SILENT_MODEL_MS);
  return token === control.token;
}

/**
 * Réplique i d'un partenaire, segment par segment (les didascalies sont lues en silence).
 * onSegment : appelé avec l'indice du segment en cours, puis -1 à la fin de la réplique.
 */
export async function playPartnerLine(i: number, v: PartnerVoice, token: number, onSegment: (k: number) => void) {
  for (const [k, s] of lines()[i].segs.entries()) {
    if (token !== control.token) return false;
    onSegment(k);
    if (s.d !== undefined) await wait(DIDASCALIA_MS / Math.max(v.rate, 0.6));
    else if (TTS) {
      if (!(await say(s.t, v.rate, v.pitch, token, v.voice))) return false;
    } else await wait(SILENT_PARTNER_MS);
  }
  onSegment(-1);
  return token === control.token;
}
