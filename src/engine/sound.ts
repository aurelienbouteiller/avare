/* ---------- commun à la répétition et à la lecture : tout arrêter, segment surligné, écran allumé ---------- */

import { stopClip } from '../device/player';
import { stopRecorder } from '../device/recorder';
import type { FrosineVoice } from '../device/speak';
import { stopTts } from '../device/tts';
import { keepScreenOn } from '../device/wake-lock';
import { control, state } from '../state';
import { frosineBank, settings } from '../storage/settings';

/** Arrête tout ce qui parle, écoute ou enregistre, et invalide les enchaînements en attente (nouveau jeton). */
export function interrupt() {
  control.token++;
  clearTimeout(control.timerId);
  state.timerAt = 0;
  state.playingIdx = -1;
  state.seg = -1;
  state.passage = false;
  stopClip();
  stopTts();
  control.listener?.abort();
  control.listener = null;
  state.listening = false;
  if (state.recording) stopRecorder(false);
}

/** Segment de la réplique de Frosine en cours de lecture, surligné à l'écran (-1 : aucun). */
export function markSegment(k: number) {
  state.seg = k;
}

/** Voix de Frosine des réglages, sans variation. */
export const steadyVoice = (): FrosineVoice => ({ bank: frosineBank(), rate: settings.rate, pitch: 1 });

const ACTIVE_PHASES = ['frosine', 'await', 'check'];
// Le verrou d'écran est perdu quand l'appli passe en arrière-plan : le reprendre au retour si on répète ou lit encore.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && (ACTIVE_PHASES.includes(state.phase) || state.passage)) keepScreenOn();
});
