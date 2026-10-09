import { render, renderDock } from './render';
import { state } from './state';
import { dropUrl, idbPut, RECS, S, save } from './store';

/* ---------- enregistrement de ma voix ---------- */
let MIC: MediaStream | null = null,
  RECORDER: MediaRecorder | null = null,
  // Décidé à l'arrêt : garder l'enregistrement (réplique révélée) ou le jeter (séquence interrompue).
  keepRec = false;
export async function startRecorder(i: number, tok: number) {
  try {
    if (!MIC)
      MIC = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  } catch {
    state.NOTICE = "Micro refusé : l'enregistrement est désactivé.";
    S.check = 'manual';
    save();
    render();
    return;
  }
  if (tok !== state.RUN || state.phase !== 'await') return;
  const chunks: Blob[] = [];
  const r = new MediaRecorder(MIC);
  RECORDER = r;
  keepRec = false;
  state.REC_SAVED = new Promise((res) => {
    r.onstop = async () => {
      if (keepRec && chunks.length) {
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
  state.RECORDING = true;
  renderDock();
}
export function stopRecorder(keep: boolean) {
  if (RECORDER && RECORDER.state !== 'inactive') {
    keepRec = keep;
    RECORDER.stop();
  }
  RECORDER = null;
  state.RECORDING = false;
}
export function releaseMic() {
  if (MIC) {
    for (const t of MIC.getTracks()) t.stop();
    MIC = null;
  }
}
