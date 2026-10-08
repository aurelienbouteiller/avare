import '@fontsource/spectral/latin-400.css';
import '@fontsource/spectral/latin-400-italic.css';
import '@fontsource/spectral/latin-600.css';
import '@fontsource/archivo/latin-500.css';
import '@fontsource/archivo/latin-600.css';
import '@fontsource/archivo/latin-700.css';
import './styles.css';
import { registerSW } from 'virtual:pwa-register';
import { S, save, clearStats, idbClear, idbKeys, RECS, URLS, dropUrl } from './store.js';
import { state } from './state.js';
import { BLOCKS, PLAN } from './data/scene.js';
import { TTS, REC, loadVoices, hasVoices, pickVoice, sortedVoices, frosineTestClip, playClip, playModelH, say } from './audio.js';
import { engine, stop, stopSpeech, lockOff, playPassage, playLine, playMine } from './engine.js';
import { $, esc, render } from './render.js';

/* ---------- interactions ---------- */
document.querySelector('.tabs').addEventListener('click',e=>{
  const t=e.target.closest('[data-mode]'); if(!t) return;
  stop(); S.mode=t.dataset.mode; save(); render(); window.scrollTo(0,0);
});
$('#chips').addEventListener('click',e=>{
  const t=e.target.closest('[data-block]'); if(!t) return;
  stop(); S.block=+t.dataset.block; S.only=false; save(); render();
  t.scrollIntoView({inline:'nearest',block:'nearest'});
});
function applyPreset(p){
  stop(); S.mode=p.mode||'repeter'; S.block=p.block||0;
  if(S.mode==='repeter'){ S.mask=p.mask||'coins'; S.order=p.order||'scene'; S.only=!!p.only; S.wild=!!p.wild; if(p.check) S.check=p.check; }
  save(); render(); window.scrollTo(0,0);
}
function act(a,el){
  if(a==='start') engine.start();
  else if(a==='stop') engine.stop();
  else if(a==='skip') engine.next();
  else if(a==='reveal') engine.reveal();
  else if(a==='hint') engine.hint();
  else if(a==='replay') engine.replay();
  else if(a==='retry') engine.retry();
  else if(a==='flip') engine.flip();
  else if(a==='ok') engine.judge(true);
  else if(a==='ko') engine.judge(false);
  else if(a==='only-on'){ S.only=true; save(); state.phase='idle'; render(); }
  else if(a==='only-off'){ S.only=false; save(); state.phase='idle'; render(); }
  else if(a==='only-start'){ S.only=true; save(); engine.start(); }
  else if(a==='only-off-start'){ S.only=false; save(); engine.start(); }
  else if(a==='to-repeter'){ stop(); S.mode='repeter'; save(); render(); window.scrollTo(0,0); }
  else if(a==='play-all') playPassage(false);
  else if(a==='play-mine') playPassage(true);
  else if(a==='stop-all'){ stopSpeech(); lockOff(); render(); }
  else if(a==='myrec') playMine(+el.dataset.i);
  else if(a==='model'){ stopSpeech(); const tok=state.RUN; playModelH(+el.dataset.i,tok); }
  else if(a==='install' && state.INSTALL){ state.INSTALL.prompt(); state.INSTALL.userChoice.finally(()=>{ state.INSTALL=null; render(); }); }
}
$('#row').addEventListener('click',e=>{ const t=e.target.closest('[data-act]'); if(t) act(t.dataset.act,t); });
$('#script').addEventListener('click',e=>{
  const a=e.target.closest('[data-act]'); if(a){ e.stopPropagation(); act(a.dataset.act,a); return; }
  const g=e.target.closest('[data-go]'); if(g){ const [d,k]=g.dataset.go.split(':').map(Number); applyPreset(PLAN[d].go[k].p); return; }
  const dn=e.target.closest('[data-done]'); if(dn){ const d=dn.dataset.done; if(S.done[d]) delete S.done[d]; else S.done[d]=true; save(); render(); return; }
  const o=e.target.closest('[data-opt]'); if(o){ S[o.dataset.opt]=o.dataset.val; save(); render(); return; }
  if(S.mode!=='lire') return;
  const ln=e.target.closest('.ln[data-i]'); if(ln) playLine(+ln.dataset.i);
});
$('#script').addEventListener('keydown',e=>{
  if(S.mode!=='lire' || (e.key!=='Enter' && e.key!==' ')) return;
  const ln=e.target.closest('.ln[data-i]'); if(ln){ e.preventDefault(); playLine(+ln.dataset.i); }
});
window.addEventListener('online',()=>render());
window.addEventListener('offline',()=>render());
window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); state.INSTALL=e; if(S.mode==='jour') render(); });

/* ---------- réglages ---------- */
const dlg=$('#dlg');
function fillVoices(){
  const sel=$('#optVoice'); if(!sel) return;
  if(!TTS){ sel.innerHTML='<option>Indisponible</option>'; sel.disabled=true; $('#voiceInfo').textContent='Ce navigateur ne lit pas le texte à voix haute.'; return; }
  if(!hasVoices()){ sel.innerHTML='<option value="">Voix française par défaut</option>'; $('#voiceInfo').textContent='Utilisée seulement en secours.'; return; }
  const v=pickVoice(), best=sortedVoices()[0];
  sel.innerHTML=sortedVoices().map(x=>`<option value="${esc(x.voiceURI)}"${v&&x.voiceURI===v.voiceURI?' selected':''}>${esc(x.name)}${x===best?' (recommandée)':''}</option>`).join('');
  $('#voiceInfo').textContent='Utilisée seulement en secours, si une voix enregistrée manque.';
}
function syncDlg(){
  $('#optTts').checked=S.tts; $('#optRate').value=S.rate; $('#rateVal').textContent='×'+(+S.rate).toFixed(2);
  $('#optWild').checked=S.wild; $('#optHands').checked=S.hands; $('#optTol').value=S.tol||'normale'; fillVoices();
  $('#fieldSrc').hidden=!REC; $('#fieldFv').hidden=!REC||S.src!=='rec';
  $('#optSrc').value=S.src; $('#optFv').value=S.fv||'F0';
  $('#offlineInfo').textContent = state.OFFLINE_READY ? 'Disponible hors ligne : tout fonctionne sans réseau, sauf la vérification à la voix.' : 'Préparation du mode hors ligne au premier chargement.';
}
$('#btnSettings').addEventListener('click',()=>{ syncDlg(); if(dlg.showModal) dlg.showModal(); else dlg.setAttribute('open',''); });
$('#btnClose').addEventListener('click',()=>{ dlg.close ? dlg.close() : dlg.removeAttribute('open'); });
dlg.addEventListener('close',()=>render());
$('#optTts').addEventListener('change',e=>{ S.tts=e.target.checked; save(); });
$('#optRate').addEventListener('input',e=>{ S.rate=+e.target.value; $('#rateVal').textContent='×'+S.rate.toFixed(2); save(); });
$('#optWild').addEventListener('change',e=>{ S.wild=e.target.checked; save(); });
$('#optHands').addEventListener('change',e=>{ S.hands=e.target.checked; save(); });
$('#optTol').addEventListener('change',e=>{ S.tol=e.target.value; save(); });
$('#optVoice').addEventListener('change',e=>{ S.voice=e.target.value; save(); });
$('#optSrc').addEventListener('change',e=>{ S.src=e.target.value; save(); syncDlg(); });
$('#optFv').addEventListener('change',e=>{ S.fv=e.target.value; save(); });
$('#btnTest').addEventListener('click',async()=>{ stopSpeech(); const tok=state.RUN; const src=await frosineTestClip();
  if(src) playClip(src,S.rate,tok); else if(TTS) say("Ah, mon Dieu ! Que vous vous portez bien ! Et que vous avez là un vrai visage de santé !", S.rate, 1, tok); });
$('#btnReset').addEventListener('click',()=>{ if(confirm('Effacer tous tes résultats (répliques justes et à revoir) ?')){ clearStats(); S.only=false; S.daily={}; save(); stop(); } });
$('#btnResetRec').addEventListener('click',async()=>{ if(confirm('Effacer tous tes enregistrements ?')){ await idbClear(); RECS.clear(); Object.keys(URLS).forEach(k=>dropUrl(k)); render(); } });

/* ---------- démarrage ---------- */
if(TTS){ const lv=()=>loadVoices(fillVoices); lv(); try{ speechSynthesis.addEventListener('voiceschanged',lv); }catch(e){ speechSynthesis.onvoiceschanged=lv; } }
if(!BLOCKS.some(b=>b.n===S.block)) S.block=1;
if(!['jour','lire','repeter'].includes(S.mode)) S.mode='jour';
idbKeys().then(ks=>{ ks.forEach(k=>RECS.add(+k)); render(); });
registerSW({ immediate:true, onOfflineReady(){ state.OFFLINE_READY=true; } });
if(navigator.serviceWorker && navigator.serviceWorker.controller) state.OFFLINE_READY=true;
// Caches de l'ancien service worker manuel (souffleur-v3 : ~8 Mo d'audio en base64, polices Google).
if('caches' in window) caches.keys().then(ks=>ks.filter(k=>k.startsWith('souffleur-')).forEach(k=>caches.delete(k))).catch(()=>{});
render();
