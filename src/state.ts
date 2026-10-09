/* ---------- état d'exécution partagé entre les modules ---------- */
import type { RuntimeState } from './types';

// Un objet plutôt que des `let` exportés : les liaisons ES importées ne sont pas réassignables.
export const state: RuntimeState = {
  token: 0,
  seq: [],
  pos: -1,
  phase: 'idle',
  curMask: 'coins',
  tally: { ok: 0, ko: 0 },
  marks: {},
  timerId: undefined,
  playingIdx: -1,
  seg: -1,
  result: null,
  notice: '',
  passage: false,
  lastScroll: '',
  listener: null,
  listening: false,
  heard: '',
  voiceOff: false,
  recording: false,
  recSaved: Promise.resolve(),
  installPrompt: null,
  offlineReady: false,
};
