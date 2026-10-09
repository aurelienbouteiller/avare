import { canVoice } from './audio';
import { BLOCKS, LINES, MASKS, NOTES, PLAN } from './data/scene';
import { blockLines, checkMode } from './engine';
import { EQ, IC } from './icons';
import { SR } from './listen';
import { state } from './state';
import { fmtDate, isMissed, RECS, S, STATS, today } from './store';
import type { CompareResult, Line, Mask, Phase, Settings } from './types';

/* ---------- rendu ---------- */
export function markSeg(k: number) {
  document.querySelectorAll<HTMLElement>('.ln.cur [data-seg], .ln.playing [data-seg]').forEach((el) => {
    el.classList.toggle('now', Number(el.dataset.seg) === k);
  });
}
// Éléments fixes de index.html : toujours présents.
export const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector(s) as T;
const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export function esc(s: string | number) {
  return String(s).replace(/[&<>"]/g, (c) => ESC[c] ?? c);
}
const plural = (n: number, w: string) => `${n} ${w}${n > 1 ? 's' : ''}`;
const RUN_PHASES: Phase[] = ['frosine', 'await', 'check', 'done'];
const inRun = () => S.mode === 'repeter' && RUN_PHASES.includes(state.phase);

function masked(t: string, mode: Mask) {
  if (mode === 'visible') return esc(t);
  return t
    .split(/\s+/)
    .filter(Boolean)
    .map((w, k) => {
      const m = w.match(/^([«"(]*)([\p{L}\p{N}][\p{L}\p{N}'’-]*)(.*)$/u);
      if (!m) return esc(w);
      const [, pre = '', word = '', post = ''] = m;
      const n = word.length;
      if (mode === 'coins') return `<span class="coin" style="--n:${Math.min(n, 12)}"></span>`;
      if (mode === 'initiales')
        return (
          esc(pre) +
          `<span class="ini">${esc(word[0])}${n > 1 ? `<span class="blank" style="--n:${Math.min(n - 1, 10)}"></span>` : ''}</span>` +
          esc(post)
        );
      if (mode === 'moitie')
        return k % 2 === 0
          ? esc(w)
          : `${esc(pre)}<span class="blank" style="--n:${Math.min(n, 12)}"></span>${esc(post)}`;
      return esc(w);
    })
    .join(' ');
}
function fText(L: Line) {
  return (L.segs ?? [])
    .map((s, k) =>
      s.d !== undefined
        ? `<span class="dida" data-seg="${k}">${esc(s.d)}</span>`
        : `<span class="seg-t" data-seg="${k}">${esc(s.t)}</span>`,
    )
    .join(' ');
}
function exitNote(L: Line) {
  return L.end ? `<div class="exit">Harpagon sort. Frosine reste seule.</div>` : '';
}
// Notes de jeu ouvertes dans Lire : gardées ouvertes quand le texte est redessiné.
const openNotes = new Set();
document.addEventListener(
  'toggle',
  (e) => {
    const d = e.target;
    if (d instanceof HTMLDetailsElement && d.dataset.note)
      d.open ? openNotes.add(d.dataset.note) : openNotes.delete(d.dataset.note);
  },
  true,
);
function blockHead(b: number, full: boolean) {
  const n = NOTES[b],
    B = BLOCKS[b];
  if (!full) return `<div class="bhead slim"><b>${esc(B.label)}</b><span class="obj">${esc(n.obj)}</span></div>`;
  return `<div class="bhead"><div class="bnum">Bloc ${b} sur 6</div><h2>${esc(B.short)}</h2><p class="obj">Objectif : ${esc(n.obj)}</p>
    <details data-note="${b}"${openNotes.has(String(b)) ? ' open' : ''}><summary>Note de jeu</summary><p>${esc(n.jeu)}</p></details></div>`;
}
function resultHtml(res: CompareResult) {
  const words = res.disp.map((w, k) => (res.dispOk[k] ? esc(w) : `<span class="miss">${esc(w)}</span>`)).join(' ');
  return `${words}<span class="heard">${res.said ? `Tu as dit : « ${esc(res.said)} »` : "Je n'ai rien entendu."}</span>`;
}
function mastery(b: number) {
  const hs = LINES.map((_l, i) => i).filter((i) => LINES[i].w === 'H' && (b === 0 || LINES[i].b === b));
  const ok = hs.filter((i) => STATS[i]?.last === 'ok').length,
    ko = hs.filter((i) => STATS[i]?.last === 'ko').length;
  return { n: hs.length, ok, ko };
}
function mbar(m: { n: number; ok: number; ko: number }) {
  return `<span class="mbar"><span class="g" style="width:${(100 * m.ok) / m.n}%"></span><span class="r" style="width:${(100 * m.ko) / m.n}%"></span></span>`;
}
const cap = (s: string) => s.replace(/^./, (c) => c.toUpperCase());

/* ---------- en-tête : puces de bloc, ou barre de répétition ---------- */
function renderTop() {
  const run = inRun();
  document.body.classList.toggle('run', run);
  document.querySelectorAll<HTMLElement>('.tabs button').forEach((b) => {
    b.setAttribute('aria-selected', b.dataset.mode === S.mode ? 'true' : 'false');
  });
  const chips = $('#chips'),
    rb = $('#runbar');
  rb.hidden = !run;
  if (run) {
    const hs = state.seq.filter((i) => LINES[i].w === 'H'),
      done = state.phase === 'done';
    const upto = done ? state.seq.length : state.pos + 1;
    const n = state.seq.slice(0, upto).filter((i) => LINES[i].w === 'H').length;
    const pct = done ? 100 : Math.round((100 * (state.pos + 1)) / state.seq.length);
    const lab = BLOCKS[S.block].label + (S.only ? ' · à revoir' : '') + (S.order === 'hasard' ? ' · au hasard' : '');
    rb.innerHTML = `<button class="iconbtn" data-act="run-stop" aria-label="${done ? 'Fermer' : 'Arrêter la répétition'}">${IC.close}</button>
      <div class="where"><div class="bname">${esc(lab)}</div><div class="count">${done ? 'Terminé' : `Réplique ${Math.max(n, 1)} sur ${hs.length}`}</div></div>
      <div class="tally" aria-label="${state.runRes.ok} justes, ${state.runRes.ko} à revoir"><span class="ok">${IC.check}${state.runRes.ok}</span><span class="ko">${IC.cross}${state.runRes.ko}</span></div>
      <div class="prog"><i style="width:${pct}%"></i></div>`;
  } else rb.innerHTML = '';
  if (S.mode === 'jour' || run) {
    chips.hidden = true;
    chips.innerHTML = '';
    return;
  }
  chips.hidden = false;
  chips.innerHTML = BLOCKS.map((b) => {
    const m = mastery(b.n),
      miss = m.ko;
    return `<button class="chip" data-block="${b.n}" aria-pressed="${S.block === b.n}"><span class="cl">${esc(b.label)}${miss ? `<span class="badge" aria-label="${miss} à revoir">${miss}</span>` : ''}</span>${mbar(m)}</button>`;
  }).join('');
}

/* ---------- Aujourd'hui ---------- */
const STANDALONE = matchMedia('(display-mode: standalone)').matches;
function daysTo(d: string) {
  return Math.round((Date.parse(`${d}T12:00:00`) - Date.parse(`${today()}T12:00:00`)) / 864e5);
}
function renderJour() {
  const td = today();
  let idx = PLAN.findIndex((p) => p.d === td);
  const show = PLAN[PLAN.length - 1].d,
    before = td < PLAN[0].d,
    after = td > show;
  if (before) idx = 0;
  let h = '<div class="stack">';
  if (after) {
    h += `<div class="card"><h2>La représentation est passée</h2><p>Bravo ! Tu peux toujours répéter librement depuis Lire et Répéter.</p></div>`;
  } else if (idx >= 0) {
    const day = PLAN[idx],
      done = !!S.done[day.d],
      cnt = S.daily[td] || 0,
      j = daysTo(show);
    const [first, ...rest] = day.go;
    h += `<section class="card hero">
      <div class="band"><span class="jj">${j === 0 ? 'Jour J' : `J-${j}`}</span><span class="jjl">${j === 0 ? "C'est ce soir.<br>Bonne représentation !" : `avant la représentation<br>${esc(fmtDate(show, { weekday: 'long', day: 'numeric', month: 'long' }))}`}</span></div>
      <div class="body">
        <p class="kicker">${before ? 'Pour commencer' : esc(cap(fmtDate(td)))} · jour ${idx + 1} sur ${PLAN.length}</p>
        <h2>${esc(day.t)}</h2><p>${esc(day.x)}</p>
        <button class="btn-l" data-go="${idx}:0">${IC.play}${esc(first.l)}</button>
        ${rest.length ? `<div class="btnrow">${rest.map((g, k) => `<button class="btn-s" data-go="${idx}:${k + 1}">${esc(g.l)}</button>`).join('')}</div>` : ''}
        <button class="donebtn" data-done="${day.d}" aria-pressed="${done}"><span class="box">${done ? IC.check : ''}</span>${done ? 'Séance faite' : 'Marquer la séance comme faite'}<span class="cnt">${plural(cnt, 'réplique')} aujourd'hui</span></button>
      </div></section>`;
  }
  const late = PLAN.filter((p) => p.d < td && !S.done[p.d]);
  if (late.length && !after) {
    h += `<section class="card late"><h3>À rattraper</h3>${late
      .map((p) => {
        const k = PLAN.indexOf(p);
        return `<div class="item"><p><b>${esc(cap(fmtDate(p.d, { weekday: 'short', day: 'numeric' })))}</b> · ${esc(p.t)}</p><div class="btnrow">${p.go.map((g, j) => `<button class="btn-s" data-go="${k}:${j}">${esc(g.l)}</button>`).join('')}<button class="btn-s" data-done="${p.d}">${IC.check}Fait</button></div></div>`;
      })
      .join('')}</section>`;
  }
  const all = mastery(0);
  h += `<section class="card"><h3>Maîtrise par bloc</h3><div class="tiles">`;
  for (let b = 1; b <= 6; b++) {
    const m = mastery(b),
      p = Math.round((100 * m.ok) / m.n),
      k = Math.round((100 * m.ko) / m.n);
    h += `<button class="tile" data-act="go-block" data-b="${b}" aria-label="${esc(BLOCKS[b].label)} : ${m.ok} justes, ${m.ko} à revoir sur ${m.n}. Répéter ce bloc."><span class="ring" style="--p:${p};--k:${k}"><b>${p}%</b></span>${esc(BLOCKS[b].label)}</button>`;
  }
  h += `</div><p class="muted total">Toute la scène : ${all.ok} sur ${all.n} répliques sues${all.ko ? `, ${all.ko} à revoir` : ''}. Touche un bloc pour le répéter.</p></section>`;
  h += `<section class="card"><h3>Programme</h3><div class="strip" id="strip">${PLAN.map((p) => {
    const c = p.d === show ? 'show' : S.done[p.d] ? 'ok' : p.d === td ? 'now' : p.d < td ? 'late' : '';
    return `<div class="day ${c}${p.d === td ? ' now' : ''}" title="${esc(p.t)}">${esc(fmtDate(p.d, { weekday: 'short' }).slice(0, 3))}<b>${+p.d.slice(8)}</b></div>`;
  }).join('')}</div>
    <div class="legend"><span style="--c:var(--ok)">fait</span><span style="--c:var(--harp)">aujourd'hui</span><span style="--c:var(--ko)">à rattraper</span><span style="--c:var(--curtain)">représentation</span></div>
    <details class="prog-list"><summary>Voir le programme détaillé</summary><ul class="cal">${PLAN.map((p) => {
      const st = S.done[p.d]
        ? '<span class="st ok">✓</span>'
        : p.d < td
          ? '<span class="st late">à rattraper</span>'
          : p.d === td
            ? '<span class="st">aujourd\'hui</span>'
            : '';
      return `<li class="${p.d === td ? 'now' : ''}"><span class="dt">${esc(fmtDate(p.d, { weekday: 'short', day: 'numeric' }))}</span><span>${esc(p.t)}</span>${st}</li>`;
    }).join('')}</ul></details></section>`;
  if (state.INSTALL && !STANDALONE)
    h += `<div class="card install"><p>Installe le souffleur comme une appli : il marchera même sans réseau.</p><button class="btn-s" data-act="install">${IC.download}Installer</button></div>`;
  h += '</div>';
  $('#script').innerHTML = h;
  const strip = $('#strip'),
    now = strip.querySelector<HTMLElement>('.now');
  if (now) strip.scrollLeft = now.offsetLeft - strip.offsetLeft - strip.clientWidth / 2 + now.offsetWidth / 2;
}

/* ---------- Répéter ---------- */
function optsHtml() {
  const sr = !!SR,
    mr = !!(navigator.mediaDevices && window.MediaRecorder),
    off = navigator.onLine === false;
  const seg = (k: keyof Pick<Settings, 'mask' | 'order' | 'check'>, v: string, l: string, dis?: boolean) =>
    `<button class="seg" data-opt="${k}" data-val="${v}" aria-pressed="${S[k] === v}"${dis ? ' disabled' : ''}>${l}</button>`;
  const maskHelp =
    {
      coins: 'Chaque mot est caché par une pièce : seule la longueur reste.',
      initiales: 'Seule la première lettre de chaque mot est visible.',
      moitie: 'Un mot sur deux est visible.',
      visible: 'Ta réplique est affichée en entier.',
    }[S.mask] || '';
  const checkHelp =
    S.check === 'voix'
      ? off
        ? 'Hors ligne : la vérification à la voix a besoin du réseau, elle sera manuelle.'
        : 'Le téléphone écoute ta réplique et la compare au texte.'
      : S.check === 'rec'
        ? 'Ta voix est enregistrée sur chaque réplique, pour la réécouter et la comparer au modèle.'
        : "Tu révèles ta réplique et tu dis toi-même si tu l'avais.";
  return `<div class="opt"><span class="lbl">Mes répliques</span><div class="segs">${MASKS.map((m) => seg('mask', m[0], m[1])).join('')}</div><p class="muted">${maskHelp}</p></div>
    <div class="opt"><span class="lbl">Ordre</span><div class="segs">${seg('order', 'scene', "Dans l'ordre")}${seg('order', 'hasard', 'Au hasard')}</div></div>
    <div class="opt"><span class="lbl">Vérification</span><div class="segs">${seg('check', 'manual', 'Manuelle')}${seg('check', 'voix', 'À la voix', !sr)}${seg('check', 'rec', "M'enregistrer", !mr)}</div>
    <p class="muted">${checkHelp}${!sr ? " La reconnaissance vocale n'est pas disponible sur ce navigateur." : ''}</p></div>`;
}
let animPos = -1; // l'animation d'entrée ne joue qu'à l'arrivée d'une nouvelle réplique
function renderRepeter() {
  const el = $('#script');
  let h = '';
  if (state.phase === 'idle' || state.phase === 'empty') {
    animPos = -1;
    const ids = blockLines(S.block),
      nH = ids.filter((i) => LINES[i].w === 'H').length,
      miss = ids.filter((i) => LINES[i].w === 'H' && isMissed(i)).length;
    const n = NOTES[S.block],
      B = BLOCKS[S.block],
      m = mastery(S.block);
    h = '<div class="stack">';
    if (state.phase === 'empty')
      h += `<div class="card"><h2>Rien à revoir ici</h2><p>Aucune réplique de ce passage n'est marquée « à revoir ». Bravo !</p><button class="btn-s" data-act="only-off">Reprendre tout le passage</button></div>`;
    else {
      h += `<section class="card"><p class="kicker">${S.block ? `Bloc ${S.block} sur 6` : 'Toute la scène'}</p><h2>${esc(B.short)}</h2>
        <p class="obj">Objectif : ${esc(n.obj)}</p><p class="muted">${esc(n.jeu)}</p>
        <div class="meter">${mbar(m)}<b>${Math.round((100 * m.ok) / m.n)} %</b></div>
        <p class="muted" style="margin-top:.3rem">${m.ok} sur ${m.n} répliques sues${m.ko ? `, ${m.ko} à revoir` : ''}.</p></section>`;
      h += `<section class="card"><h3>Ta séance</h3>${optsHtml()}
        ${miss || S.only ? `<button class="toggle" data-act="${S.only ? 'only-off' : 'only-on'}" aria-pressed="${S.only}"><span>Seulement mes ${plural(miss, 'réplique')} à revoir<br><span class="muted" style="font-weight:500">${S.only ? `Chacune avec la réplique de Frosine qui la précède.` : `Sinon, les ${nH} répliques du passage.`}</span></span><span class="sw"></span></button>` : ''}
      </section>`;
    }
    el.innerHTML = `${h}</div>`;
    return;
  }
  const upto = state.phase === 'done' ? state.seq.length - 1 : state.pos;
  const curH = state.phase !== 'done' && LINES[state.seq[state.pos]].w === 'H';
  const fresh = state.pos !== animPos;
  animPos = state.pos;
  for (let p = 0; p <= upto; p++) {
    const i = state.seq[p],
      L = LINES[i],
      prev = p > 0 ? state.seq[p - 1] : -1;
    const cur = p === state.pos && state.phase !== 'done';
    const cue = curH && p === state.pos - 1 && L.w === 'F' && i === state.seq[state.pos] - 1;
    if (p > 0 && prev !== i - 1) h += `<div class="exit">…</div>`;
    if (S.order !== 'hasard' && (p === 0 || LINES[prev].b !== L.b)) h += blockHead(L.b, false);
    h += exitNote(L);
    const cls = `ln ${L.w}${cur ? ` cur${fresh ? ' fresh' : ''}` : `${cue ? ' cue' : ' past'} tap`}`;
    // Réplique déjà passée : la toucher reprend la répétition à cet endroit.
    const back = cur
      ? ''
      : ` data-p="${p}" role="button" tabindex="0" aria-label="Reprendre à cette réplique de ${L.w === 'H' ? 'Harpagon' : 'Frosine'}"`;
    if (L.w === 'F') {
      h += `<div class="${cls}"${back}><span class="who"><span class="name">Frosine</span></span>${fText(L)}</div>`;
      continue;
    }
    const rm = state.runMarks[p];
    const mark = rm
      ? `<span class="mark ${rm}">${rm === 'ok' ? `${IC.check}juste` : `${IC.cross}à revoir`}</span>`
      : '';
    let body: string;
    if (cur && state.phase === 'await') {
      body = masked(L.t, state.curMask);
      if (state.LISTENING || checkMode() === 'voix')
        body += `<span class="heard">${state.HEARD ? `J'entends : « ${esc(state.HEARD)} »` : ''}</span>`;
      if (S.hands && checkMode() !== 'voix') body += '<div class="timer"><i></i></div>';
    } else if (cur && state.phase === 'check' && state.RESULT) {
      body = resultHtml(state.RESULT);
    } else {
      body = esc(L.t);
      if (cur && state.phase === 'check' && checkMode() === 'rec' && !S.hands)
        body += `<div class="mini">${RECS.has(i) ? `<button data-act="myrec" data-i="${i}">${IC.play}Ma version</button>` : ''}<button data-act="model" data-i="${i}">${IC.play}Le modèle</button></div>`;
    }
    h += `<div class="${cls}"${back}><span class="who"><span class="name">${cur ? 'À toi · ' : ''}Harpagon</span>${mark}</span>${body}</div>`;
  }
  if (state.phase === 'done') {
    const tot = state.runRes.ok + state.runRes.ko;
    const ko = state.seq.filter((_i, p) => state.runMarks[p] === 'ko');
    const start = (t: string) => {
      const w = t.split(/\s+/);
      return w.slice(0, 8).join(' ') + (w.length > 8 ? '…' : '');
    };
    h += `<section class="card" style="margin-top:.8rem"><h3>Fin du passage</h3>
      ${tot ? `<div class="score"><b>${state.runRes.ok} / ${tot}</b><span class="muted">${state.runRes.ok > 1 ? 'justes' : 'juste'}</span></div>` : '<p>Passage terminé.</p>'}
      ${ko.length ? `<p class="muted">À revoir :</p><ul class="missed">${ko.map((i) => `<li>${esc(start(LINES[i].t))}</li>`).join('')}</ul>` : tot ? '<p>Sans faute. Bravo !</p>' : ''}
      ${checkMode() === 'rec' || S.check === 'rec' ? '<p class="muted">Réécoute tes enregistrements dans Lire, avec « Ma voix ».</p>' : ''}</section>`;
  }
  el.innerHTML = h;
  const key = `${state.pos}:${state.phase}`;
  if (key !== state.LASTSCROLL) {
    state.LASTSCROLL = key;
    const c = el.querySelector('.ln.cur') || el.lastElementChild;
    if (c) {
      const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
      c.scrollIntoView({ block: 'center', behavior: smooth ? 'smooth' : 'auto' });
    }
  }
}

/* ---------- Lire ---------- */
function renderLire(scrollToPlaying?: boolean) {
  const ids = blockLines(S.block);
  let h = '';
  ids.forEach((i, k) => {
    const L = LINES[i],
      playing = state.playingIdx === i;
    if (k === 0 || LINES[ids[k - 1]].b !== L.b) h += blockHead(L.b, true);
    h += exitNote(L);
    const extra =
      L.w === 'H' && RECS.has(i)
        ? `<div class="mini"><button data-act="myrec" data-i="${i}">${IC.play}Ma version</button></div>`
        : '';
    h += `<div class="ln ${L.w} tap${playing ? ' playing' : ''}" data-i="${i}" role="button" tabindex="0" aria-label="Écouter la réplique de ${L.w === 'H' ? 'Harpagon' : 'Frosine'}">
      <span class="who"><span class="name">${L.w === 'H' ? 'Harpagon' : 'Frosine'}${L.w === 'H' && isMissed(i) ? '<span class="mark ko">· à revoir</span>' : ''}</span><span class="pl">${playing ? EQ : IC.play}</span></span>
      ${L.w === 'F' ? fText(L) : esc(L.t)}${extra}</div>`;
  });
  $('#script').innerHTML = h;
  if (scrollToPlaying) {
    const c = document.querySelector('.ln.playing');
    if (c) c.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}
export function renderScript(scroll?: boolean) {
  if (S.mode === 'jour') renderJour();
  else if (S.mode === 'lire') renderLire(scroll);
  else renderRepeter();
}

/* ---------- dock d'actions ---------- */
const side = (act: string, ic: string, l: string) =>
  `<button class="btn side" data-act="${act}">${ic}<span>${l}</span></button>`;
export function renderDock() {
  const dock = $('#dock'),
    st = $('#status'),
    row = $('#row');
  let s = '',
    b = '';
  document.body.classList.toggle('nodock', S.mode === 'jour');
  dock.hidden = S.mode === 'jour';
  if (S.mode === 'jour') return;
  if (S.mode === 'lire') {
    const hasMine = blockLines(S.block).some((i) => RECS.has(i));
    s = state.PASSAGE
      ? `<span class="live"><span class="dot"></span>Lecture du passage</span>`
      : "Touche une réplique pour l'entendre.";
    b =
      (state.PASSAGE
        ? side('stop-all', IC.stop, 'Arrêter')
        : side('play-all', IC.play, 'Écouter') + (hasMine ? side('play-mine', IC.mic, 'Ma voix') : '')) +
      `<button class="btn main" data-act="to-repeter">${hasMine ? 'Répéter' : 'Répéter ce passage'}${IC.arrow}</button>`;
  } else if (state.phase === 'idle') {
    const bits = [];
    if (S.hands) bits.push('Mains libres');
    if (S.wild) bits.push('Partenaire imprévisible');
    s = bits.map((x) => `<span class="pill">${x}</span>`).join('');
    b = `<button class="btn main" data-act="start">${IC.play}Commencer</button>`;
  } else if (state.phase === 'empty') {
    b = `<button class="btn main" data-act="only-off">Reprendre tout le passage</button>`;
  } else if (state.phase === 'frosine') {
    s = canVoice() ? `<span class="live"><span class="dot"></span>Frosine parle</span>` : 'Lis la réplique de Frosine.';
    b =
      side('replay', IC.replay, 'Réécouter') +
      `<button class="btn main" data-act="skip">${canVoice() ? 'Passer' : 'Suivant'}${IC.arrow}</button>`;
  } else if (state.phase === 'await') {
    s = state.LISTENING
      ? '<span class="live"><span class="dot"></span>J\'écoute, dis ta réplique</span>'
      : state.RECORDING
        ? '<span class="rec"><span class="dot"></span>Enregistrement</span>'
        : 'À toi. Dis ta réplique à voix haute.';
    b =
      side('replay', IC.replay, 'Réécouter') +
      side('hint', IC.hint, 'Indice') +
      `<button class="btn gold" data-act="reveal">${IC.eye}Révéler</button>`;
  } else if (state.phase === 'check') {
    if (state.RESULT) {
      const pct = Math.round(state.RESULT.score * 100),
        ok = state.runMarks[state.pos] === 'ok';
      s = ok
        ? `<span class="mark ok">${IC.check}Juste</span> ${pct} % des mots retrouvés`
        : `<span class="mark ko">${IC.cross}À revoir</span> ${pct} % des mots retrouvés`;
      b = S.hands
        ? `${side('stop', IC.stop, 'Arrêter')}<button class="btn main" data-act="skip">Suivant${IC.arrow}</button>`
        : side('retry', IC.replay, 'Réessayer') +
          side('flip', ok ? IC.cross : IC.check, ok ? 'Compter faux' : 'Compter juste') +
          `<button class="btn main" data-act="skip">Suivant${IC.arrow}</button>`;
    } else if (S.hands) {
      s = "Vérifie à l'oreille.";
      b = `${side('stop', IC.stop, 'Arrêter')}<button class="btn main" data-act="skip">Suivant${IC.arrow}</button>`;
    } else {
      s = "Tu l'avais ?";
      b = `<button class="btn ko" data-act="ko">${IC.cross}À revoir</button><button class="btn ok" data-act="ok">${IC.check}Je l'avais</button>`;
    }
  } else if (state.phase === 'done') {
    const miss = blockLines(S.block).filter((i) => LINES[i].w === 'H' && isMissed(i)).length;
    s = miss ? `${plural(miss, 'réplique')} à revoir dans ce passage.` : 'Aucune réplique à revoir dans ce passage.';
    b =
      (miss && !S.only ? side('only-start', IC.cross, 'Les ratées') : '') +
      `<button class="btn main" data-act="${S.only ? 'only-off-start' : 'start'}">${IC.replay}${S.only ? 'Tout le passage' : 'Recommencer'}</button>`;
  }
  if (state.NOTICE) s = esc(state.NOTICE) + (s ? ` ${s}` : '');
  st.innerHTML = s;
  row.innerHTML = b;
}
export function render() {
  renderTop();
  renderScript();
  renderDock();
}
