import { S, save, idbPut, RECS, dropUrl } from './store.js';
import { state } from './state.js';
import { render, renderDock } from './render.js';

/* ---------- enregistrement de ma voix ---------- */
let MIC=null, RECORDER=null;
export async function startRecorder(i,tok){
  try{ if(!MIC) MIC=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}}); }
  catch(e){ state.NOTICE="Micro refusé : l'enregistrement est désactivé."; S.check='manual'; save(); render(); return; }
  if(tok!==state.RUN || state.phase!=='await') return;
  const chunks=[]; const r=new MediaRecorder(MIC); RECORDER=r; r._keep=false;
  state.REC_SAVED=new Promise(res=>{ r.onstop=async()=>{ if(r._keep && chunks.length){ const blob=new Blob(chunks,{type:r.mimeType||'audio/webm'}); await idbPut(i,blob); RECS.add(i); dropUrl(i); } res(); }; });
  r.ondataavailable=e=>{ if(e.data && e.data.size) chunks.push(e.data); };
  r.start(); state.RECORDING=true; renderDock();
}
export function stopRecorder(keep){ if(RECORDER && RECORDER.state!=='inactive'){ RECORDER._keep=keep; RECORDER.stop(); } RECORDER=null; state.RECORDING=false; }
export function releaseMic(){ if(MIC){ MIC.getTracks().forEach(t=>t.stop()); MIC=null; } }
