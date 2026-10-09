/* ---------- état d'exécution partagé entre les modules ---------- */
import { reactive } from './reactive';
import type { Control, RuntimeState } from './types';

// Des objets plutôt que des `let` exportés : les liaisons ES importées ne sont pas réassignables.
/** Ce que l'écran montre : les vues se redessinent seules quand un champ change. */
export const state: RuntimeState = reactive<RuntimeState>({
  seq: [],
  pos: -1,
  phase: 'idle',
  curMask: 'coins',
  tally: { ok: 0, ko: 0 },
  marks: {},
  playingIdx: -1,
  seg: -1,
  result: null,
  notice: '',
  passage: false,
  listening: false,
  heard: '',
  voiceOff: false,
  recording: false,
  timerAt: 0,
  timerMs: 0,
  online: navigator.onLine !== false,
  installPrompt: null,
  offlineReady: false,
});

/** Mécanique de l'exécution, sans effet sur l'affichage. */
export const control: Control = {
  token: 0,
  timerId: undefined,
  listener: null,
  recSaved: Promise.resolve(),
};
