/* ---------- état d'exécution partagé entre les modules ---------- */
import type { RuntimeState } from './types';

// Un objet plutôt que des `let` exportés : les liaisons ES importées ne sont pas réassignables.
export const state: RuntimeState = {
  RUN: 0,
  seq: [],
  pos: -1,
  phase: 'idle',
  curMask: 'coins',
  runRes: { ok: 0, ko: 0 },
  runMarks: {},
  timerId: undefined,
  playingIdx: -1,
  seg: -1,
  RESULT: null,
  NOTICE: '',
  PASSAGE: false,
  LASTSCROLL: '',
  LISTEN: null,
  LISTENING: false,
  HEARD: '',
  VOICE_OFF: false,
  RECORDING: false,
  REC_SAVED: Promise.resolve(),
  INSTALL: null,
  OFFLINE_READY: false,
};
