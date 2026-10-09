import { S, STATS, save, isMissed, today, recUrl } from './store.js';
import { state } from './state.js';
import { LINES, MASKS, TOL } from './data/scene.js';
import { compare } from './compare.js';
import { TTS, canVoice, wait, stopClip, playClip, playModelH, playFrosineLine, prefetch } from './audio.js';
import { SR, listen } from './listen.js';
import { startRecorder, stopRecorder, releaseMic } from './recorder.js';
import { render, renderScript } from './render.js';

/* ---------- écran allumé ---------- */
let WL=null;
export async function lockOn(){ try{ if('wakeLock' in navigator && !WL){ WL=await navigator.wakeLock.request('screen'); WL.addEventListener('release',()=>{ WL=null; }); } }catch(e){ WL=null; } }
export function lockOff(){ try{ if(WL) WL.release(); }catch(e){} WL=null; }
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible' && (['frosine','await','check'].includes(state.phase) || state.PASSAGE)) lockOn(); });

/* ---------- moteur de répétition ---------- */
export function blockLines(b){ return LINES.map((l,i)=>i).filter(i=> b===0 || LINES[i].b===b); }
function shuffle(a){ for(let k=a.length-1;k>0;k--){ const j=Math.floor(Math.random()*(k+1)); [a[k],a[j]]=[a[j],a[k]]; } return a; }
function buildSeq(){
  const ids=blockLines(S.block);
  let hs=ids.filter(i=>LINES[i].w==='H'); if(S.only) hs=hs.filter(isMissed);
  if(S.order==='hasard') return shuffle(hs.slice()).flatMap(i=> (i>0 && LINES[i-1].w==='F') ? [i-1,i] : [i]);
  if(!S.only) return ids;
  const keep=new Set(); hs.forEach(i=>{ keep.add(i); if(i>0 && LINES[i-1].w==='F') keep.add(i-1); });
  return ids.filter(i=>keep.has(i));
}
export function checkMode(){
  let c=S.check;
  if(c==='voix' && (!SR || state.VOICE_OFF || navigator.onLine===false)) c='manual';
  if(c==='rec' && !(navigator.mediaDevices && window.MediaRecorder)) c='manual';
  return c;
}
export function stopSpeech(){
  state.RUN++; clearTimeout(state.timerId); state.playingIdx=-1; state.PASSAGE=false; stopClip();
  if(TTS){ try{ speechSynthesis.cancel(); }catch(e){} }
  if(state.LISTEN){ state.LISTEN.abort(); state.LISTEN=null; } state.LISTENING=false;
  if(state.RECORDING) stopRecorder(false);
}
export function start(){
  stopSpeech(); state.VOICE_OFF=false; state.NOTICE='';
  state.seq=buildSeq(); state.runRes={ok:0,ko:0}; state.runMarks={}; state.pos=-1;
  if(!state.seq.length){ state.phase='empty'; render(); return; }
  lockOn(); next();
}
export function next(){
  stopSpeech(); state.pos++; state.RESULT=null; state.HEARD='';
  if(state.pos>=state.seq.length){ state.phase='done'; lockOff(); releaseMic(); render(); return; }
  if(!WL) lockOn();
  const i=state.seq[state.pos], L=LINES[i];
  prefetch(state.seq.slice(state.pos,state.pos+3),S.fv||'F0');
  if(L.w==='F'){
    state.phase='frosine'; render();
    if(canVoice()){
      const tok=state.RUN; let rate=S.rate, pitch=1, pre=300, bank=S.fv||'F0';
      if(S.wild){ rate=S.rate*(0.82+Math.random()*0.4); pitch=0.96+Math.random()*0.1; pre=Math.random()*1400; bank=['F0','F1','F2','F3'][Math.floor(Math.random()*4)]; }
      wait(pre).then(()=> tok===state.RUN ? playFrosineLine(L,i,tok,bank,rate,pitch) : false).then(ok=>{ if(ok && tok===state.RUN) next(); });
    }
  } else beginH();
}
function beginH(){
  const i=state.seq[state.pos], L=LINES[i]; state.phase='await'; state.curMask=S.mask; state.RESULT=null; state.HEARD=''; render();
  const tok=state.RUN, c=checkMode();
  if(c==='voix') listen(i,tok);
  else { if(c==='rec') startRecorder(i,tok); if(S.hands) handsTimer(L); }
}
export function handsTimer(L){
  const words=L.t.split(/\s+/).length, ms=1600+words*450/Math.max(S.rate,.7);
  const bar=document.querySelector('.ln.cur .timer i');
  if(bar){ bar.style.transitionDuration=ms+'ms'; requestAnimationFrame(()=>requestAnimationFrame(()=>{ bar.style.width='100%'; })); }
  const tok=state.RUN; state.timerId=setTimeout(()=>{ if(tok===state.RUN) reveal(); },ms);
}
function reveal(){
  clearTimeout(state.timerId);
  const c=checkMode();
  if(state.LISTEN){ state.LISTEN.abort(); state.LISTEN=null; } state.LISTENING=false;
  const wasRec=state.RECORDING; if(state.RECORDING) stopRecorder(true);
  state.phase='check'; render();
  if(S.hands){
    const i=state.seq[state.pos], tok=++state.RUN;
    (async()=>{
      if(c==='rec' && wasRec){ await state.REC_SAVED; const url=await recUrl(i); if(url && tok===state.RUN){ await playClip(url,1,tok); await wait(300); } }
      if(tok!==state.RUN) return;
      if(S.tts) await playModelH(i,tok); else await wait(2600);
      if(tok!==state.RUN) return; await wait(500); if(tok===state.RUN) next();
    })();
  }
}
export function evaluate(i,said){
  state.RESULT=compare(LINES[i].t,said);
  const ok=state.RESULT.score>=TOL[S.tol||'normale'];
  record(ok); state.phase='check'; render();
  if(S.hands){
    const tok=++state.RUN;
    (async()=>{
      if(ok) await wait(1300);
      else { await wait(400); if(S.tts) await playModelH(i,tok); else await wait(2600); await wait(500); }
      if(tok===state.RUN) next();
    })();
  }
}
function record(ok){
  const i=state.seq[state.pos]; const st=STATS[i]||{ok:0,ko:0,last:''}; const prev=state.runMarks[state.pos], runRes=state.runRes;
  if(prev==='ok'){ st.ok=Math.max(0,st.ok-1); runRes.ok--; }
  else if(prev==='ko'){ st.ko=Math.max(0,st.ko-1); runRes.ko--; }
  else { const d=today(); S.daily[d]=(S.daily[d]||0)+1; }
  if(ok){ st.ok++; runRes.ok++; } else { st.ko++; runRes.ko++; }
  st.last=ok?'ok':'ko'; STATS[i]=st; state.runMarks[state.pos]=st.last; save();
}
function judge(ok){ record(ok); next(); }
function flip(){ record(state.runMarks[state.pos]!=='ok'); render(); }
function retry(){ stopSpeech(); beginH(); }
function hint(){ const order=MASKS.map(m=>m[0]); const k=order.indexOf(state.curMask); state.curMask=order[Math.min(k+1,order.length-1)]; renderScript(); }
function replay(){ let j=state.pos; while(j>=0 && LINES[state.seq[j]].w!=='F') j--; if(j<0) return; state.pos=j-1; next(); }
function goTo(p){ if(p<0 || p>=state.seq.length) return; state.pos=p-1; next(); }
export function stop(){ stopSpeech(); state.phase='idle'; lockOff(); releaseMic(); render(); }
export const engine = { start, stop, next, reveal, hint, replay, retry, flip, judge, goTo };

/* ---------- lecture de passages (onglet Lire) ---------- */
let passageMine=false;
// from : réplique où commencer (ou reprendre) la lecture du passage.
export async function playPassage(mine,from){
  stopSpeech(); state.PASSAGE=true; passageMine=mine; const tok=state.RUN; lockOn(); render();
  const ids=blockLines(S.block);
  for(let k=Math.max(0,ids.indexOf(from));k<ids.length;k++){
    const i=ids[k];
    if(tok!==state.RUN) break;
    state.playingIdx=i; renderScript(true);
    prefetch(ids.slice(k+1,k+3),S.fv||'F0');
    const L=LINES[i];
    if(L.w==='F') await playFrosineLine(L,i,tok,S.fv||'F0',S.rate,1);
    else {
      let src = mine ? await recUrl(i) : null;
      if(src) await playClip(src,1,tok);
      else await playModelH(i,tok);
    }
    if(tok!==state.RUN) break;
    await wait(300);
  }
  if(tok===state.RUN){ state.PASSAGE=false; state.playingIdx=-1; lockOff(); render(); }
}
export async function playLine(i){
  if(state.PASSAGE){ playPassage(passageMine,i); return; }
  const was=state.playingIdx; stopSpeech();
  if(was===i){ render(); return; }
  state.playingIdx=i; render();
  const L=LINES[i], tok=state.RUN;
  if(L.w==='F') await playFrosineLine(L,i,tok,S.fv||'F0',S.rate,1);
  else await playModelH(i,tok);
  if(tok===state.RUN){ state.playingIdx=-1; render(); }
}
export async function playMine(i){ stopSpeech(); const url=await recUrl(i); if(!url) return; state.playingIdx=i; renderScript(); const tok=state.RUN; await playClip(url,1,tok); if(tok===state.RUN){ state.playingIdx=-1; renderScript(); } }
