import { S, STATS, isMissed, today, fmtDate, RECS } from './store.js';
import { state } from './state.js';
import { LINES, BLOCKS, NOTES, PLAN, MASKS } from './data/scene.js';
import { SR } from './listen.js';
import { canVoice } from './audio.js';
import { blockLines, checkMode } from './engine.js';

/* ---------- rendu ---------- */
export function markSeg(k){ document.querySelectorAll('.ln.cur [data-seg], .ln.playing [data-seg]').forEach(el=>el.classList.toggle('now', +el.dataset.seg===k)); }
export const $=s=>document.querySelector(s);
export function esc(s){ return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function masked(t,mode){
  if(mode==='visible') return esc(t);
  return t.split(/\s+/).filter(Boolean).map((w,k)=>{
    const m=w.match(/^([«"(]*)([\p{L}\p{N}][\p{L}\p{N}'’-]*)(.*)$/u);
    if(!m) return esc(w);
    const pre=m[1], word=m[2], post=m[3], n=word.length;
    if(mode==='coins') return `<span class="coin" style="--n:${Math.min(n,12)}"></span>`;
    if(mode==='initiales') return esc(pre)+`<span class="ini">${esc(word[0])}${n>1?`<span class="blank" style="--n:${Math.min(n-1,10)}"></span>`:''}</span>`+esc(post);
    if(mode==='moitie') return k%2===0 ? esc(w) : esc(pre)+`<span class="blank" style="--n:${Math.min(n,12)}"></span>`+esc(post);
    return esc(w);
  }).join(' ');
}
function fText(L){ return L.segs.map((s,k)=> s.d ? `<span class="dida" data-seg="${k}">${esc(s.d)}</span>` : `<span class="seg-t" data-seg="${k}">${esc(s.t)}</span>`).join(' '); }
function exitNote(L){ return L.end ? `<div class="exit">Harpagon sort. Frosine reste seule.</div>` : ''; }
function blockHead(b,full){
  const n=NOTES[b], lab=BLOCKS[b].label;
  return `<div class="bhead"><b>${esc(lab)}</b><br><span class="obj">Objectif : ${esc(n.obj)}</span>${full?`<span class="jeu">${esc(n.jeu)}</span>`:''}</div>`;
}
function resultHtml(res){
  const words=res.disp.map((w,k)=> res.dispOk[k] ? esc(w) : `<span class="miss">${esc(w)}</span>`).join(' ');
  return words + `<span class="heard">${res.said ? 'Tu as dit : « '+esc(res.said)+' »' : 'Je n\'ai rien entendu.'}</span>`;
}

function renderTop(){
  document.querySelectorAll('.tabs button').forEach(b=>b.setAttribute('aria-selected', b.dataset.mode===S.mode ? 'true':'false'));
  const chips=$('#chips');
  if(S.mode==='jour'){ chips.hidden=true; chips.innerHTML=''; return; }
  chips.hidden=false;
  chips.innerHTML = BLOCKS.map(b=>{
    const miss=LINES.filter((l,i)=>l.w==='H' && (b.n===0||l.b===b.n) && isMissed(i)).length;
    return `<button class="chip" data-block="${b.n}" aria-pressed="${S.block===b.n}">${esc(b.label)}${miss?`<span class="badge" aria-label="${miss} à revoir">${miss}</span>`:''}</button>`;
  }).join('');
}

const STANDALONE = window.matchMedia && matchMedia('(display-mode: standalone)').matches;
function mastery(b){
  const hs=LINES.map((l,i)=>i).filter(i=>LINES[i].w==='H' && (b===0||LINES[i].b===b));
  const ok=hs.filter(i=>STATS[i]&&STATS[i].last==='ok').length, ko=hs.filter(i=>STATS[i]&&STATS[i].last==='ko').length;
  return {n:hs.length, ok, ko};
}
function renderJour(){
  const td=today(); let idx=PLAN.findIndex(p=>p.d===td);
  const before = td<PLAN[0].d, after = td>PLAN[PLAN.length-1].d;
  if(before) idx=0;
  let h='<div class="stack">';
  if(state.INSTALL && !STANDALONE) h+=`<div class="note"><p>Installe le souffleur comme une appli : il fonctionnera même sans réseau.</p><button class="linkbtn primary" data-act="install">Installer l'appli</button></div>`;
  if(after){
    h+=`<div class="note"><h2>La représentation est passée</h2><p>Tu peux toujours répéter librement depuis les onglets Lire et Répéter.</p></div>`;
  } else if(idx>=0){
    const day=PLAN[idx], done=!!S.done[day.d], cnt=S.daily[td]||0;
    h+=`<div class="note"><p class="kicker">${before?'Pour commencer':esc(fmtDate(td).replace(/^./,c=>c.toUpperCase()))}, jour ${idx+1} sur ${PLAN.length}</p>
      <h2>${esc(day.t)}</h2><p>${esc(day.x)}</p>
      <div class="btnrow">${day.go.map((g,k)=>`<button class="linkbtn primary" data-go="${idx}:${k}">${esc(g.l)}</button>`).join('')}</div>
      <p class="muted" style="margin-top:.8rem">${cnt} réplique${cnt>1?'s':''} travaillée${cnt>1?'s':''} aujourd'hui.</p>
      <button class="linkbtn" data-done="${day.d}">${done?'✓ Fait (annuler)':'Marquer comme fait'}</button></div>`;
  }
  const late=PLAN.filter(p=>p.d<td && !S.done[p.d]);
  if(late.length && !after){
    h+=`<div class="note"><h3 style="margin-top:0">À rattraper</h3>${late.map(p=>{ const k=PLAN.indexOf(p); return `<p><b>${esc(fmtDate(p.d,{weekday:'short',day:'numeric'}))}</b> : ${esc(p.t)}</p><div class="btnrow">${p.go.map((g,j)=>`<button class="linkbtn" data-go="${k}:${j}">${esc(g.l)}</button>`).join('')}<button class="linkbtn" data-done="${p.d}">Marquer comme fait</button></div>`; }).join('')}</div>`;
  }
  h+=`<div class="note"><h3 style="margin-top:0">Maîtrise par bloc</h3><p class="muted">D'après ta dernière tentative sur chaque réplique.</p><div class="bars">`;
  for(let b=1;b<=6;b++){
    const m=mastery(b), pct=Math.round(100*m.ok/m.n);
    h+=`<div class="barrow"><span>${esc(BLOCKS[b].label)}</span><span class="bar" role="img" aria-label="${m.ok} justes, ${m.ko} à revoir sur ${m.n}"><span class="g" style="width:${100*m.ok/m.n}%"></span><span class="r" style="width:${100*m.ko/m.n}%"></span></span><span class="pct">${pct} %</span></div>`;
  }
  const all=mastery(0);
  h+=`</div><p class="muted" style="margin-top:.6rem">Toute la scène : ${all.ok} sur ${all.n} répliques sues, ${all.ko} à revoir.</p></div>`;
  h+=`<div class="note"><h3 style="margin-top:0">Calendrier</h3><ul class="cal">${PLAN.map(p=>{
    const st = S.done[p.d] ? '<span class="st ok">✓</span>' : p.d<td ? '<span class="st late">à rattraper</span>' : p.d===td ? '<span class="st">aujourd\'hui</span>' : '';
    return `<li class="${p.d===td?'now':''}"><span class="dt">${esc(fmtDate(p.d,{weekday:'short',day:'numeric'}))}</span><span>${esc(p.t)}</span>${st}</li>`; }).join('')}</ul></div>`;
  h+='</div>';
  $('#script').innerHTML=h;
}

function optsHtml(){
  const sr=!!SR, mr=!!(navigator.mediaDevices && window.MediaRecorder), off=navigator.onLine===false;
  const seg=(k,v,l,dis)=>`<button class="seg" data-opt="${k}" data-val="${v}" aria-pressed="${S[k]===v}"${dis?' disabled':''}>${l}</button>`;
  return `<div class="opt"><span class="lbl">Mes répliques</span><div class="segs">${MASKS.map(m=>seg('mask',m[0],m[1])).join('')}</div></div>
    <div class="opt"><span class="lbl">Ordre</span><div class="segs">${seg('order','scene','Dans l\'ordre')}${seg('order','hasard','Au hasard')}</div></div>
    <div class="opt"><span class="lbl">Vérification</span><div class="segs">${seg('check','manual','Manuelle')}${seg('check','voix','À la voix',!sr)}${seg('check','rec','M\'enregistrer',!mr)}</div>
    <p class="muted" style="margin:.35rem 0 0">${S.check==='voix'?(off?'Hors ligne : la vérification à la voix a besoin du réseau, elle sera manuelle.':'Le téléphone écoute ta réplique et la compare au texte.'):S.check==='rec'?'Ta voix est enregistrée sur chaque réplique, pour la réécouter et la comparer au modèle.':'Tu révèles ta réplique et tu dis toi-même si tu l\'avais.'}${!sr?' La reconnaissance vocale n\'est pas disponible sur ce navigateur.':''}</p></div>`;
}
function renderRepeter(){
  const el=$('#script'); let h='';
  if(state.phase==='idle' || state.phase==='empty'){
    const ids=blockLines(S.block), nH=ids.filter(i=>LINES[i].w==='H').length, miss=ids.filter(i=>LINES[i].w==='H'&&isMissed(i)).length;
    const n=NOTES[S.block];
    if(state.phase==='empty') h=`<div class="note"><h2>Rien à revoir ici</h2><p>Aucune réplique de ce passage n'est marquée « à revoir ».</p><button class="linkbtn" data-act="only-off">Reprendre tout le passage</button></div>`;
    else h=`<div class="note"><h2>${esc(BLOCKS[S.block].label)}</h2>
      <p><b style="color:var(--harp)">Objectif : ${esc(n.obj)}</b><br><span class="muted">${esc(n.jeu)}</span></p>
      <p>${S.only?`${miss} réplique${miss>1?'s':''} à revoir, chacune avec la réplique de Frosine qui la précède.`:`${nH} répliques pour toi dans ce passage.`}</p>
      ${S.only?'<button class="linkbtn" data-act="only-off">Reprendre tout le passage</button>':(miss?`<button class="linkbtn" data-act="only-on">Seulement mes ${miss} réplique${miss>1?'s':''} à revoir</button>`:'')}
      ${optsHtml()}</div>`;
    el.innerHTML=h; return;
  }
  const upto = state.phase==='done' ? state.seq.length-1 : state.pos;
  for(let p=0;p<=upto;p++){
    const i=state.seq[p], L=LINES[i], prev=p>0?state.seq[p-1]:null;
    const cur = p===state.pos && state.phase!=='done';
    if(p>0 && prev!==i-1) h+=`<div class="exit">…</div>`;
    if(S.order!=='hasard' && (p===0 || LINES[prev].b!==L.b)) h+=blockHead(L.b,false);
    h+=exitNote(L);
    const cls=`ln ${L.w}${cur?' cur':' past'}`;
    if(L.w==='F'){ h+=`<div class="${cls}"><span class="who"><span>Frosine</span></span>${fText(L)}</div>`; continue; }
    const mark = state.runMarks[p] ? `<span class="mark ${state.runMarks[p]}">${state.runMarks[p]==='ok'?'✓ juste':'à revoir'}</span>` : '';
    let body;
    if(cur && state.phase==='await'){
      body = masked(L.t,state.curMask);
      if(state.LISTENING || checkMode()==='voix') body += `<span class="heard">${state.HEARD?'J\'entends : « '+esc(state.HEARD)+' »':''}</span>`;
      if(S.hands && checkMode()!=='voix') body += '<div class="timer"><i></i></div>';
    } else if(cur && state.phase==='check' && state.RESULT){
      body = resultHtml(state.RESULT);
    } else {
      body = esc(L.t);
      if(cur && state.phase==='check' && checkMode()==='rec' && !S.hands) body += `<div class="mini">${RECS.has(i)?`<button data-act="myrec" data-i="${i}">▶ Ma version</button>`:''}<button data-act="model" data-i="${i}">▶ Le modèle</button></div>`;
    }
    h+=`<div class="${cls}"><span class="who"><span>Harpagon</span>${mark}</span>${body}</div>`;
  }
  if(state.phase==='done'){
    const tot=state.runRes.ok+state.runRes.ko;
    h+=`<div class="note" style="margin-top:.6rem"><h2>Fin du passage</h2><p>${tot?`${state.runRes.ok} juste${state.runRes.ok>1?'s':''} sur ${tot}.`:'Passage terminé.'}${state.runRes.ko?` ${state.runRes.ko} à revoir.`:''}</p>${checkMode()==='rec'||S.check==='rec'?'<p class="muted">Réécoute tes enregistrements dans l\'onglet Lire, avec « Avec ma voix ».</p>':''}</div>`;
  }
  el.innerHTML=h;
  const key=state.pos+':'+state.phase;
  if(key!==state.LASTSCROLL){ state.LASTSCROLL=key; const c=el.querySelector('.ln.cur') || el.lastElementChild; if(c){ const smooth=!matchMedia('(prefers-reduced-motion: reduce)').matches; c.scrollIntoView({block:'center',behavior:smooth?'smooth':'auto'}); } }
}
function renderLire(scrollToPlaying){
  const ids=blockLines(S.block), hasMine=ids.some(i=>RECS.has(i));
  let h=`<div class="lire-bar">${state.PASSAGE?'<button class="linkbtn primary" data-act="stop-all">■ Arrêter la lecture</button>':`<button class="linkbtn primary" data-act="play-all">▶ Écouter le passage</button>${hasMine?'<button class="linkbtn" data-act="play-mine">▶ Avec ma voix</button>':''}`}</div>`;
  ids.forEach((i,k)=>{
    const L=LINES[i];
    if(k===0 || LINES[ids[k-1]].b!==L.b) h+=blockHead(L.b,true);
    h+=exitNote(L);
    const extra = L.w==='H' && RECS.has(i) ? `<div class="mini"><button data-act="myrec" data-i="${i}">▶ Ma version</button></div>` : '';
    h+=`<div class="ln ${L.w} tap${state.playingIdx===i?' playing':''}" data-i="${i}" role="button" tabindex="0">
      <span class="who"><span>${L.w==='H'?'Harpagon':'Frosine'}</span>${L.w==='H'&&isMissed(i)?'<span class="mark ko">à revoir</span>':''}</span>
      ${L.w==='F'?fText(L):esc(L.t)}${extra}</div>`;
  });
  $('#script').innerHTML=h;
  if(scrollToPlaying){ const c=document.querySelector('.ln.playing'); if(c) c.scrollIntoView({block:'center',behavior:'smooth'}); }
}
export function renderScript(scroll){ if(S.mode==='jour') renderJour(); else if(S.mode==='lire') renderLire(scroll); else renderRepeter(); }

export function renderDock(){
  const dock=$('#dock'), st=$('#status'), row=$('#row'); let s='', b='';
  document.body.classList.toggle('nodock', S.mode==='jour');
  dock.hidden = S.mode==='jour';
  if(S.mode==='jour') return;
  if(S.mode==='lire'){
    s = state.PASSAGE ? 'Lecture du passage en cours.' : 'Touche une réplique pour l\'entendre.';
    b=`<button class="btn main" data-act="to-repeter">Répéter ce passage</button>`;
  } else if(state.phase==='idle'){
    const bits=[]; if(S.wild) bits.push('partenaire imprévisible'); if(S.hands) bits.push('mains libres');
    s = bits.length ? 'Activé : '+bits.join(', ')+'.' : '';
    b=`<button class="btn main" data-act="start">Commencer</button>`;
  } else if(state.phase==='empty'){
    b=`<button class="btn main" data-act="only-off">Reprendre tout le passage</button>`;
  } else if(state.phase==='frosine'){
    s = canVoice() ? 'Frosine parle. Écoute ta réplique d\'entrée.' : 'Lis la réplique de Frosine.';
    b=`<button class="btn side" data-act="stop">Arrêter</button><button class="btn main" data-act="skip">${canVoice()?'Passer':'Suivant'}</button>`;
  } else if(state.phase==='await'){
    s = state.LISTENING ? '<span class="live"><span class="dot"></span>J\'écoute, dis ta réplique.</span>' : state.RECORDING ? '<span class="rec"><span class="dot"></span>Enregistrement, dis ta réplique.</span>' : 'À toi. Dis ta réplique à voix haute.';
    b=`<button class="btn side" data-act="replay">Réécouter</button><button class="btn side" data-act="hint">Indice</button><button class="btn gold" data-act="reveal">Révéler</button>`;
  } else if(state.phase==='check'){
    if(state.RESULT){
      const pct=Math.round(state.RESULT.score*100), ok=state.runMarks[state.pos]==='ok';
      s = ok ? `✓ Juste : ${pct} % des mots retrouvés.` : `À revoir : ${pct} % des mots retrouvés.`;
      b = S.hands ? `<button class="btn side" data-act="stop">Arrêter</button><button class="btn main" data-act="skip">Suivant</button>`
        : `<button class="btn side" data-act="retry">Réessayer</button><button class="btn side" data-act="flip">${ok?'Compter faux':'Compter juste'}</button><button class="btn main" data-act="skip">Suivant</button>`;
    } else if(S.hands){
      s='Vérifie à l\'oreille.';
      b=`<button class="btn side" data-act="stop">Arrêter</button><button class="btn main" data-act="skip">Suivant</button>`;
    } else {
      s='Tu l\'avais ?';
      b=`<button class="btn ko" data-act="ko">À revoir</button><button class="btn ok" data-act="ok">Je l'avais</button>`;
    }
  } else if(state.phase==='done'){
    const miss=blockLines(S.block).filter(i=>LINES[i].w==='H'&&isMissed(i)).length;
    s = miss ? `${miss} réplique${miss>1?'s':''} à revoir dans ce passage.` : 'Aucune réplique à revoir dans ce passage.';
    b = (miss && !S.only ? `<button class="btn side" data-act="only-start">Revoir les ratées</button>` : '')
      + `<button class="btn main" data-act="${S.only?'only-off-start':'start'}">${S.only?'Tout le passage':'Recommencer'}</button>`;
  }
  if(state.NOTICE) s = esc(state.NOTICE)+(s?' '+s:'');
  st.innerHTML=s; row.innerHTML=b;
}
export function render(){ renderTop(); renderScript(); renderDock(); }
