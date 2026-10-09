/* ---------- enregistrement de ma voix ---------- */
import { control, state } from '../state';
import { saveRecording } from '../storage/recordings';

let mic: MediaStream | null = null,
  recorder: MediaRecorder | null = null;
// Décidé à l'arrêt de chaque enregistreur : garder la prise (réplique révélée) ou la jeter (séquence interrompue).
const keep = new WeakMap<MediaRecorder, boolean>();

async function openMic() {
  mic ??= await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  return mic;
}

// Prise sauvegardée à l'arrêt de l'enregistreur, si elle est gardée.
function savedOnStop(r: MediaRecorder, i: number, chunks: Blob[]) {
  return new Promise<void>((res) => {
    r.onstop = async () => {
      if (keep.get(r) && chunks.length) await saveRecording(i, new Blob(chunks, { type: r.mimeType || 'audio/webm' }));
      res();
    };
  });
}

/** Enregistre la réplique i. 'denied' si le micro est refusé, 'skipped' si la séquence a changé entre-temps. */
export async function startRecorder(i: number, token: number): Promise<'started' | 'denied' | 'skipped'> {
  let stream: MediaStream;
  try {
    stream = await openMic();
  } catch {
    return 'denied';
  }
  if (token !== control.token || state.phase !== 'await') return 'skipped';
  const chunks: Blob[] = [];
  const r = new MediaRecorder(stream);
  recorder = r;
  keep.set(r, false);
  control.recSaved = savedOnStop(r, i, chunks);
  r.ondataavailable = (e) => {
    if (e.data?.size) chunks.push(e.data);
  };
  r.start();
  state.recording = true;
  return 'started';
}

/** Arrête l'enregistrement ; keepTake : garder la prise. */
export function stopRecorder(keepTake: boolean) {
  if (recorder && recorder.state !== 'inactive') {
    keep.set(recorder, keepTake);
    recorder.stop();
  }
  recorder = null;
  state.recording = false;
}

export function releaseMic() {
  for (const t of mic?.getTracks() ?? []) t.stop();
  mic = null;
}
