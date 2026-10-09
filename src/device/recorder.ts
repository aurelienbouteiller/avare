import { state } from '../state';
import { dropUrl, idbPut, RECS } from '../storage/settings';

/* ---------- enregistrement de ma voix ---------- */
let MIC: MediaStream | null = null,
  RECORDER: MediaRecorder | null = null;
// Décidé à l'arrêt de chaque enregistreur : garder la prise (réplique révélée) ou la jeter (séquence interrompue).
const KEEP = new WeakMap<MediaRecorder, boolean>();
// Enregistre la réplique i. Renvoie 'denied' si le micro est refusé, 'skipped' si la séquence a changé entre-temps.
export async function startRecorder(i: number, tok: number): Promise<'started' | 'denied' | 'skipped'> {
  try {
    if (!MIC)
      MIC = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  } catch {
    return 'denied';
  }
  if (tok !== state.token || state.phase !== 'await') return 'skipped';
  const chunks: Blob[] = [];
  const r = new MediaRecorder(MIC);
  RECORDER = r;
  KEEP.set(r, false);
  state.recSaved = new Promise((res) => {
    r.onstop = async () => {
      if (KEEP.get(r) && chunks.length) {
        const blob = new Blob(chunks, { type: r.mimeType || 'audio/webm' });
        await idbPut(i, blob);
        RECS.add(i);
        dropUrl(i);
      }
      res();
    };
  });
  r.ondataavailable = (e) => {
    if (e.data?.size) chunks.push(e.data);
  };
  r.start();
  state.recording = true;
  return 'started';
}
export function stopRecorder(keep: boolean) {
  if (RECORDER && RECORDER.state !== 'inactive') {
    KEEP.set(RECORDER, keep);
    RECORDER.stop();
  }
  RECORDER = null;
  state.recording = false;
}
export function releaseMic() {
  if (MIC) {
    for (const t of MIC.getTracks()) t.stop();
    MIC = null;
  }
}
