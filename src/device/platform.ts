/* ---------- capacités de l'appareil et voix disponibles ---------- */
import CLIPS from 'virtual:clips';
import { state } from '../state';
import { S } from '../storage/settings';
import type { Check } from '../types';

/** Synthèse vocale du téléphone. */
export const TTS = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
/** Reconnaissance vocale (absente de Firefox). */
export const SR: typeof SpeechRecognition | undefined = window.SpeechRecognition || window.webkitSpeechRecognition;
/** Enregistrement du micro. */
export const canRecord = () => !!(navigator.mediaDevices && window.MediaRecorder);

/* voix enregistrées (public/audio/<voix>/L<ligne>_S<segment>.mp3) */
const HAS: Record<string, Set<string>> = Object.fromEntries(Object.entries(CLIPS).map(([b, ids]) => [b, new Set(ids)]));
export const REC = (HAS.F0?.size ?? 0) > 0;
export function hasClip(bank: string, id: string) {
  return !!HAS[bank]?.has(id);
}
export const useRec = () => REC && S.src === 'rec';
/** Frosine peut-elle parler : voix enregistrées ou synthèse, si la voix est activée. */
export const canVoice = () => S.tts && (useRec() || TTS);

/** Mode de vérification réellement utilisable, compte tenu de l'appareil et du réseau. */
export function checkMode(): Check {
  let c = S.check;
  if (c === 'voix' && (!SR || state.VOICE_OFF || navigator.onLine === false)) c = 'manual';
  if (c === 'rec' && !canRecord()) c = 'manual';
  return c;
}
