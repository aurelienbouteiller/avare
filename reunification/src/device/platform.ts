/* ---------- capacités de l'appareil ---------- */
import { state } from '../state';
import { settings } from '../storage/settings';
import type { Check } from '../types';

/** Synthèse vocale du téléphone. */
export const TTS = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
/** Reconnaissance vocale (absente de Firefox). */
export const SR: typeof SpeechRecognition | undefined = window.SpeechRecognition || window.webkitSpeechRecognition;
/** Enregistrement du micro. */
export const canRecord = () => !!(navigator.mediaDevices && window.MediaRecorder);

/** Les partenaires peuvent-ils parler : synthèse disponible et voix activée. */
export const canVoice = () => settings.tts && TTS;

/** Mode de vérification réellement utilisable, compte tenu de l'appareil et du réseau. */
export function checkMode(): Check {
  let c = settings.check;
  if (c === 'voix' && (!SR || state.voiceOff || !state.online)) c = 'manual';
  if (c === 'rec' && !canRecord()) c = 'manual';
  return c;
}
