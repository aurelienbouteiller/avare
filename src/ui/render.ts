import { html, render as litRender, nothing, type TemplateResult } from 'lit-html';
import { join } from 'lit-html/directives/join.js';
import { BLOCKS, blockLines, LINES, MASKS, NOTES, PLAN } from '../data/scene';
import { canRecord, canVoice, checkMode, SR } from '../device/platform';
import { state } from '../state';
import { fmtDate, isMissed, RECS, S, STATS, today } from '../storage/settings';
import type { CompareResult, Line, Mask, Phase, Settings } from '../types';
import { EQ, IC } from './icons';

/* ---------- rendu (lit-html : les valeurs interpolées sont échappées, le DOM est mis à jour sur place) ---------- */
type View = TemplateResult | typeof nothing;
// Éléments fixes de index.html : toujours présents.
export const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector(s) as T;
const plural = (n: number, w: string) => `${n} ${w}${n > 1 ? 's' : ''}`;
const RUN_PHASES: Phase[] = ['frosine', 'await', 'check', 'done'];
const inRun = () => S.mode === 'repeter' && RUN_PHASES.includes(state.phase);
const words = (t: string) => t.split(/\s+/).filter(Boolean);

function masked(t: string, mode: Mask) {
  if (mode === 'visible') return t;
  const ws = words(t).map((w, k) => {
    const m = w.match(/^([«"(]*)([\p{L}\p{N}][\p{L}\p{N}'’-]*)(.*)$/u);
    if (!m) return w;
    const [, pre = '', word = '', post = ''] = m;
    const n = word.length;
    if (mode === 'coins') return html`<span class="coin" style="--n:${Math.min(n, 12)}"></span>`;
    if (mode === 'initiales')
      return html`${pre}<span class="ini">${word[0]}${n > 1 ? html`<span class="blank" style="--n:${Math.min(n - 1, 10)}"></span>` : nothing}</span>${post}`;
    if (mode === 'moitie')
      return k % 2 === 0 ? w : html`${pre}<span class="blank" style="--n:${Math.min(n, 12)}"></span>${post}`;
    return w;
  });
  return join(ws, ' ');
}
// active : réplique en cours de lecture, dont le segment state.seg est surligné.
function fText(L: Line, active: boolean) {
  const segs = (L.segs ?? []).map((s, k) => {
    const now = active && k === state.seg ? ' now' : '';
    return s.d !== undefined
      ? html`<span class="dida${now}" data-seg=${k}>${s.d}</span>`
      : html`<span class="seg-t${now}" data-seg=${k}>${s.t}</span>`;
  });
  return join(segs, ' ');
}
function exitNote(L: Line) {
  return L.end ? html`<div class="exit">Harpagon sort. Frosine reste seule.</div>` : nothing;
}
// Notes de jeu ouvertes dans Lire : gardées ouvertes quand le texte est redessiné.
const openNotes = new Set<string>();
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
  if (!full) return html`<div class="bhead slim"><b>${B.label}</b><span class="obj">${n.obj}</span></div>`;
  return html`<div class="bhead"><div class="bnum">Bloc ${b} sur 6</div><h2>${B.short}</h2><p class="obj">Objectif : ${n.obj}</p>
    <details data-note=${b} ?open=${openNotes.has(String(b))}><summary>Note de jeu</summary><p>${n.jeu}</p></details></div>`;
}
function resultView(res: CompareResult) {
  const ws = res.disp.map((w, k) => (res.dispOk[k] ? w : html`<span class="miss">${w}</span>`));
  return html`${join(ws, ' ')}<span class="heard">${res.said ? `Tu as dit : « ${res.said} »` : "Je n'ai rien entendu."}</span>`;
}
function mastery(b: number) {
  const hs = LINES.map((_l, i) => i).filter((i) => LINES[i].w === 'H' && (b === 0 || LINES[i].b === b));
  const ok = hs.filter((i) => STATS[i]?.last === 'ok').length,
    ko = hs.filter((i) => STATS[i]?.last === 'ko').length;
  return { n: hs.length, ok, ko };
}
function mbar(m: { n: number; ok: number; ko: number }) {
  return html`<span class="mbar"><span class="g" style="width:${(100 * m.ok) / m.n}%"></span><span class="r" style="width:${(100 * m.ko) / m.n}%"></span></span>`;
}
const cap = (s: string) => s.replace(/^./, (c) => c.toUpperCase());

/* ---------- en-tête : puces de bloc, ou barre de répétition ---------- */
function runbar() {
  const hs = state.seq.filter((i) => LINES[i].w === 'H'),
    done = state.phase === 'done';
  const upto = done ? state.seq.length : state.pos + 1;
  const n = state.seq.slice(0, upto).filter((i) => LINES[i].w === 'H').length;
  const pct = done ? 100 : Math.round((100 * (state.pos + 1)) / state.seq.length);
  const lab = BLOCKS[S.block].label + (S.only ? ' · à revoir' : '') + (S.order === 'hasard' ? ' · au hasard' : '');
  return html`<button class="iconbtn" data-act="run-stop" aria-label=${done ? 'Fermer' : 'Arrêter la répétition'}>${IC.close}</button>
      <div class="where"><div class="bname">${lab}</div><div class="count">${done ? 'Terminé' : `Réplique ${Math.max(n, 1)} sur ${hs.length}`}</div></div>
      <div class="tally" aria-label="${state.runRes.ok} justes, ${state.runRes.ko} à revoir"><span class="ok">${IC.check}${state.runRes.ok}</span><span class="ko">${IC.cross}${state.runRes.ko}</span></div>
      <div class="prog"><i style="width:${pct}%"></i></div>`;
}
function chips() {
  return BLOCKS.map((b) => {
    const m = mastery(b.n),
      miss = m.ko;
    return html`<button class="chip" data-block=${b.n} aria-pressed=${S.block === b.n}><span class="cl">${b.label}${miss ? html`<span class="badge" aria-label="${miss} à revoir">${miss}</span>` : nothing}</span>${mbar(m)}</button>`;
  });
}
function renderTop() {
  const run = inRun();
  document.body.classList.toggle('run', run);
  document.querySelectorAll<HTMLElement>('.tabs button').forEach((b) => {
    b.setAttribute('aria-selected', b.dataset.mode === S.mode ? 'true' : 'false');
  });
  const ch = $('#chips'),
    rb = $('#runbar');
  rb.hidden = !run;
  litRender(run ? runbar() : nothing, rb);
  ch.hidden = S.mode === 'jour' || run;
  litRender(ch.hidden ? nothing : chips(), ch);
}

/* ---------- Aujourd'hui ---------- */
const STANDALONE = matchMedia('(display-mode: standalone)').matches;
function daysTo(d: string) {
  return Math.round((Date.parse(`${d}T12:00:00`) - Date.parse(`${today()}T12:00:00`)) / 864e5);
}
function hero(idx: number, td: string, show: string, before: boolean) {
  const day = PLAN[idx],
    done = !!S.done[day.d],
    cnt = S.daily[td] || 0,
    j = daysTo(show);
  const [first, ...rest] = day.go;
  return html`<section class="card hero">
      <div class="band"><span class="jj">${j === 0 ? 'Jour J' : `J-${j}`}</span><span class="jjl">${j === 0 ? html`C'est ce soir.<br>Bonne représentation !` : html`avant la représentation<br>${fmtDate(show, { weekday: 'long', day: 'numeric', month: 'long' })}`}</span></div>
      <div class="body">
        <p class="kicker">${before ? 'Pour commencer' : cap(fmtDate(td))} · jour ${idx + 1} sur ${PLAN.length}</p>
        <h2>${day.t}</h2><p>${day.x}</p>
        <button class="btn-l" data-go="${idx}:0">${IC.play}${first.l}</button>
        ${rest.length ? html`<div class="btnrow">${rest.map((g, k) => html`<button class="btn-s" data-go="${idx}:${k + 1}">${g.l}</button>`)}</div>` : nothing}
        <button class="donebtn" data-done=${day.d} aria-pressed=${done}><span class="box">${done ? IC.check : nothing}</span>${done ? 'Séance faite' : 'Marquer la séance comme faite'}<span class="cnt">${plural(cnt, 'réplique')} aujourd'hui</span></button>
      </div></section>`;
}
function lateCard(td: string) {
  const late = PLAN.filter((p) => p.d < td && !S.done[p.d]);
  if (!late.length) return nothing;
  return html`<section class="card late"><h3>À rattraper</h3>${late.map((p) => {
    const k = PLAN.indexOf(p);
    return html`<div class="item"><p><b>${cap(fmtDate(p.d, { weekday: 'short', day: 'numeric' }))}</b> · ${p.t}</p><div class="btnrow">${p.go.map((g, j) => html`<button class="btn-s" data-go="${k}:${j}">${g.l}</button>`)}<button class="btn-s" data-done=${p.d}>${IC.check}Fait</button></div></div>`;
  })}</section>`;
}
function masteryCard() {
  const all = mastery(0);
  const tiles = [1, 2, 3, 4, 5, 6].map((b) => {
    const m = mastery(b),
      p = Math.round((100 * m.ok) / m.n),
      k = Math.round((100 * m.ko) / m.n);
    return html`<button class="tile" data-act="go-block" data-b=${b} aria-label="${BLOCKS[b].label} : ${m.ok} justes, ${m.ko} à revoir sur ${m.n}. Répéter ce bloc."><span class="ring" style="--p:${p};--k:${k}"><b>${p}%</b></span>${BLOCKS[b].label}</button>`;
  });
  return html`<section class="card"><h3>Maîtrise par bloc</h3><div class="tiles">${tiles}</div><p class="muted total">Toute la scène : ${all.ok} sur ${all.n} répliques sues${all.ko ? `, ${all.ko} à revoir` : ''}. Touche un bloc pour le répéter.</p></section>`;
}
function programCard(td: string, show: string) {
  const days = PLAN.map((p) => {
    const c = p.d === show ? 'show' : S.done[p.d] ? 'ok' : p.d === td ? 'now' : p.d < td ? 'late' : '';
    return html`<div class="day ${c}${p.d === td ? ' now' : ''}" title=${p.t}>${fmtDate(p.d, { weekday: 'short' }).slice(0, 3)}<b>${+p.d.slice(8)}</b></div>`;
  });
  const cal = PLAN.map((p) => {
    const st = S.done[p.d]
      ? html`<span class="st ok">✓</span>`
      : p.d < td
        ? html`<span class="st late">à rattraper</span>`
        : p.d === td
          ? html`<span class="st">aujourd'hui</span>`
          : nothing;
    return html`<li class=${p.d === td ? 'now' : ''}><span class="dt">${fmtDate(p.d, { weekday: 'short', day: 'numeric' })}</span><span>${p.t}</span>${st}</li>`;
  });
  return html`<section class="card"><h3>Programme</h3><div class="strip" id="strip">${days}</div>
    <div class="legend"><span style="--c:var(--ok)">fait</span><span style="--c:var(--harp)">aujourd'hui</span><span style="--c:var(--ko)">à rattraper</span><span style="--c:var(--curtain)">représentation</span></div>
    <details class="prog-list"><summary>Voir le programme détaillé</summary><ul class="cal">${cal}</ul></details></section>`;
}
function renderJour() {
  const td = today();
  let idx = PLAN.findIndex((p) => p.d === td);
  const show = PLAN[PLAN.length - 1].d,
    before = td < PLAN[0].d,
    after = td > show;
  if (before) idx = 0;
  litRender(
    html`<div class="stack">
      ${after ? html`<div class="card"><h2>La représentation est passée</h2><p>Bravo ! Tu peux toujours répéter librement depuis Lire et Répéter.</p></div>` : idx >= 0 ? hero(idx, td, show, before) : nothing}
      ${after ? nothing : lateCard(td)}${masteryCard()}${programCard(td, show)}
      ${state.INSTALL && !STANDALONE ? html`<div class="card install"><p>Installe le souffleur comme une appli : il marchera même sans réseau.</p><button class="btn-s" data-act="install">${IC.download}Installer</button></div>` : nothing}
    </div>`,
    $('#script'),
  );
  const strip = $('#strip'),
    now = strip.querySelector<HTMLElement>('.now');
  if (now) strip.scrollLeft = now.offsetLeft - strip.offsetLeft - strip.clientWidth / 2 + now.offsetWidth / 2;
}

/* ---------- Répéter ---------- */
const MASK_HELP: Record<Mask, string> = {
  coins: 'Chaque mot est caché par une pièce : seule la longueur reste.',
  initiales: 'Seule la première lettre de chaque mot est visible.',
  moitie: 'Un mot sur deux est visible.',
  visible: 'Ta réplique est affichée en entier.',
};
function opts() {
  const sr = !!SR,
    mr = canRecord(),
    off = navigator.onLine === false;
  const seg = (k: keyof Pick<Settings, 'mask' | 'order' | 'check'>, v: string, l: string, dis?: boolean) =>
    html`<button class="seg" data-opt=${k} data-val=${v} aria-pressed=${S[k] === v} ?disabled=${!!dis}>${l}</button>`;
  const checkHelp =
    S.check === 'voix'
      ? off
        ? 'Hors ligne : la vérification à la voix a besoin du réseau, elle sera manuelle.'
        : 'Le téléphone écoute ta réplique et la compare au texte.'
      : S.check === 'rec'
        ? 'Ta voix est enregistrée sur chaque réplique, pour la réécouter et la comparer au modèle.'
        : "Tu révèles ta réplique et tu dis toi-même si tu l'avais.";
  return html`<div class="opt"><span class="lbl">Mes répliques</span><div class="segs">${MASKS.map((m) => seg('mask', m[0], m[1]))}</div><p class="muted">${MASK_HELP[S.mask]}</p></div>
    <div class="opt"><span class="lbl">Ordre</span><div class="segs">${seg('order', 'scene', "Dans l'ordre")}${seg('order', 'hasard', 'Au hasard')}</div></div>
    <div class="opt"><span class="lbl">Vérification</span><div class="segs">${seg('check', 'manual', 'Manuelle')}${seg('check', 'voix', 'À la voix', !sr)}${seg('check', 'rec', "M'enregistrer", !mr)}</div>
    <p class="muted">${checkHelp}${!sr ? " La reconnaissance vocale n'est pas disponible sur ce navigateur." : ''}</p></div>`;
}
function setup() {
  const ids = blockLines(S.block),
    nH = ids.filter((i) => LINES[i].w === 'H').length,
    miss = ids.filter((i) => LINES[i].w === 'H' && isMissed(i)).length;
  const n = NOTES[S.block],
    B = BLOCKS[S.block],
    m = mastery(S.block);
  if (state.phase === 'empty')
    return html`<div class="stack"><div class="card"><h2>Rien à revoir ici</h2><p>Aucune réplique de ce passage n'est marquée « à revoir ». Bravo !</p><button class="btn-s" data-act="only-off">Reprendre tout le passage</button></div></div>`;
  return html`<div class="stack"><section class="card"><p class="kicker">${S.block ? `Bloc ${S.block} sur 6` : 'Toute la scène'}</p><h2>${B.short}</h2>
        <p class="obj">Objectif : ${n.obj}</p><p class="muted">${n.jeu}</p>
        <div class="meter">${mbar(m)}<b>${Math.round((100 * m.ok) / m.n)} %</b></div>
        <p class="muted" style="margin-top:.3rem">${m.ok} sur ${m.n} répliques sues${m.ko ? `, ${m.ko} à revoir` : ''}.</p></section>
      <section class="card"><h3>Ta séance</h3>${opts()}
        ${miss || S.only ? html`<button class="toggle" data-act=${S.only ? 'only-off' : 'only-on'} aria-pressed=${S.only}><span>Seulement mes ${plural(miss, 'réplique')} à revoir<br><span class="muted" style="font-weight:500">${S.only ? 'Chacune avec la réplique de Frosine qui la précède.' : `Sinon, les ${nH} répliques du passage.`}</span></span><span class="sw"></span></button>` : nothing}
      </section></div>`;
}
// Texte de la réplique d'Harpagon selon la phase : masqué, comparé à ce qui a été dit, ou en clair.
function hBody(i: number, L: Line, cur: boolean) {
  if (cur && state.phase === 'await') {
    const voice = checkMode() === 'voix';
    return html`${masked(L.t, state.curMask)}${state.LISTENING || voice ? html`<span class="heard">${state.HEARD ? `J'entends : « ${state.HEARD} »` : ''}</span>` : nothing}${S.hands && !voice ? html`<div class="timer"><i></i></div>` : nothing}`;
  }
  if (cur && state.phase === 'check' && state.RESULT) return resultView(state.RESULT);
  const mine =
    cur && state.phase === 'check' && checkMode() === 'rec' && !S.hands
      ? html`<div class="mini">${RECS.has(i) ? html`<button data-act="myrec" data-i=${i}>${IC.play}Ma version</button>` : nothing}<button data-act="model" data-i=${i}>${IC.play}Le modèle</button></div>`
      : nothing;
  return html`${L.t}${mine}`;
}
function doneCard() {
  const tot = state.runRes.ok + state.runRes.ko;
  const ko = state.seq.filter((_i, p) => state.runMarks[p] === 'ko');
  const start = (t: string) => {
    const w = t.split(/\s+/);
    return w.slice(0, 8).join(' ') + (w.length > 8 ? '…' : '');
  };
  return html`<section class="card" style="margin-top:.8rem"><h3>Fin du passage</h3>
      ${tot ? html`<div class="score"><b>${state.runRes.ok} / ${tot}</b><span class="muted">${state.runRes.ok > 1 ? 'justes' : 'juste'}</span></div>` : html`<p>Passage terminé.</p>`}
      ${ko.length ? html`<p class="muted">À revoir :</p><ul class="missed">${ko.map((i) => html`<li>${start(LINES[i].t)}</li>`)}</ul>` : tot ? html`<p>Sans faute. Bravo !</p>` : nothing}
      ${checkMode() === 'rec' || S.check === 'rec' ? html`<p class="muted">Réécoute tes enregistrements dans Lire, avec « Ma voix ».</p>` : nothing}</section>`;
}
function renderRepeter() {
  const el = $('#script');
  if (state.phase === 'idle' || state.phase === 'empty') {
    litRender(setup(), el);
    return;
  }
  const upto = state.phase === 'done' ? state.seq.length - 1 : state.pos;
  const curH = state.phase !== 'done' && LINES[state.seq[state.pos]].w === 'H';
  const out: View[] = [];
  for (let p = 0; p <= upto; p++) {
    const i = state.seq[p],
      L = LINES[i],
      prev = p > 0 ? state.seq[p - 1] : -1;
    const cur = p === state.pos && state.phase !== 'done';
    const cue = curH && p === state.pos - 1 && L.w === 'F' && i === state.seq[state.pos] - 1;
    if (p > 0 && prev !== i - 1) out.push(html`<div class="exit">…</div>`);
    if (S.order !== 'hasard' && (p === 0 || LINES[prev].b !== L.b)) out.push(blockHead(L.b, false));
    out.push(exitNote(L));
    // « fresh » : animation d'entrée. lit crée un nœud neuf quand la réplique courante change (template différent
    // ou réplique ajoutée) et garde le même nœud sinon : l'animation ne joue qu'une fois par réplique.
    const cls = `ln ${L.w}${cur ? ' cur fresh' : `${cue ? ' cue' : ' past'} tap`}`;
    // Réplique déjà passée : la toucher reprend la répétition à cet endroit.
    const back = cur ? undefined : `Reprendre à cette réplique de ${L.w === 'H' ? 'Harpagon' : 'Frosine'}`;
    const attrs = (body: unknown) =>
      back
        ? html`<div class=${cls} data-p=${p} role="button" tabindex="0" aria-label=${back}>${body}</div>`
        : html`<div class=${cls}>${body}</div>`;
    if (L.w === 'F') {
      out.push(attrs(html`<span class="who"><span class="name">Frosine</span></span>${fText(L, cur)}`));
      continue;
    }
    const rm = state.runMarks[p];
    const mark = rm
      ? html`<span class="mark ${rm}">${rm === 'ok' ? html`${IC.check}juste` : html`${IC.cross}à revoir`}</span>`
      : nothing;
    out.push(
      attrs(
        html`<span class="who"><span class="name">${cur ? 'À toi · ' : ''}Harpagon</span>${mark}</span>${hBody(i, L, cur)}`,
      ),
    );
  }
  if (state.phase === 'done') out.push(doneCard());
  litRender(out, el);
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
  const out = ids.map((i, k) => {
    const L = LINES[i],
      playing = state.playingIdx === i,
      who = L.w === 'H' ? 'Harpagon' : 'Frosine';
    const extra =
      L.w === 'H' && RECS.has(i)
        ? html`<div class="mini"><button data-act="myrec" data-i=${i}>${IC.play}Ma version</button></div>`
        : nothing;
    return html`${k === 0 || LINES[ids[k - 1]].b !== L.b ? blockHead(L.b, true) : nothing}${exitNote(L)}<div class="ln ${L.w} tap${playing ? ' playing' : ''}" data-i=${i} role="button" tabindex="0" aria-label="Écouter la réplique de ${who}">
      <span class="who"><span class="name">${who}${L.w === 'H' && isMissed(i) ? html`<span class="mark ko">· à revoir</span>` : nothing}</span><span class="pl">${playing ? EQ : IC.play}</span></span>
      ${L.w === 'F' ? fText(L, playing) : L.t}${extra}</div>`;
  });
  litRender(out, $('#script'));
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
const side = (act: string, ic: TemplateResult, l: string) =>
  html`<button class="btn side" data-act=${act}>${ic}<span>${l}</span></button>`;
const main = (act: string, body: unknown, cls = 'main') =>
  html`<button class="btn ${cls}" data-act=${act}>${body}</button>`;
const live = (cls: string, l: string) => html`<span class=${cls}><span class="dot"></span>${l}</span>`;
function dock(): [View | string, View] {
  if (S.mode === 'lire') {
    const hasMine = blockLines(S.block).some((i) => RECS.has(i));
    return [
      state.PASSAGE ? live('live', 'Lecture du passage') : "Touche une réplique pour l'entendre.",
      html`${state.PASSAGE ? side('stop-all', IC.stop, 'Arrêter') : html`${side('play-all', IC.play, 'Écouter')}${hasMine ? side('play-mine', IC.mic, 'Ma voix') : nothing}`}${main('to-repeter', html`${hasMine ? 'Répéter' : 'Répéter ce passage'}${IC.arrow}`)}`,
    ];
  }
  switch (state.phase) {
    case 'idle': {
      const bits = [S.hands && 'Mains libres', S.wild && 'Partenaire imprévisible'].filter((x) => x !== false);
      return [html`${bits.map((x) => html`<span class="pill">${x}</span>`)}`, main('start', html`${IC.play}Commencer`)];
    }
    case 'empty':
      return [nothing, main('only-off', 'Reprendre tout le passage')];
    case 'frosine':
      return [
        canVoice() ? live('live', 'Frosine parle') : 'Lis la réplique de Frosine.',
        html`${side('replay', IC.replay, 'Réécouter')}${main('skip', html`${canVoice() ? 'Passer' : 'Suivant'}${IC.arrow}`)}`,
      ];
    case 'await':
      return [
        state.LISTENING
          ? live('live', "J'écoute, dis ta réplique")
          : state.RECORDING
            ? live('rec', 'Enregistrement')
            : 'À toi. Dis ta réplique à voix haute.',
        html`${side('replay', IC.replay, 'Réécouter')}${side('hint', IC.hint, 'Indice')}${main('reveal', html`${IC.eye}Révéler`, 'gold')}`,
      ];
    case 'check': {
      const next = main('skip', html`Suivant${IC.arrow}`);
      if (state.RESULT) {
        const pct = Math.round(state.RESULT.score * 100),
          ok = state.runMarks[state.pos] === 'ok';
        return [
          html`${ok ? html`<span class="mark ok">${IC.check}Juste</span>` : html`<span class="mark ko">${IC.cross}À revoir</span>`} ${pct} % des mots retrouvés`,
          S.hands
            ? html`${side('stop', IC.stop, 'Arrêter')}${next}`
            : html`${side('retry', IC.replay, 'Réessayer')}${side('flip', ok ? IC.cross : IC.check, ok ? 'Compter faux' : 'Compter juste')}${next}`,
        ];
      }
      if (S.hands) return ["Vérifie à l'oreille.", html`${side('stop', IC.stop, 'Arrêter')}${next}`];
      return [
        "Tu l'avais ?",
        html`${main('ko', html`${IC.cross}À revoir`, 'ko')}${main('ok', html`${IC.check}Je l'avais`, 'ok')}`,
      ];
    }
    case 'done': {
      const miss = blockLines(S.block).filter((i) => LINES[i].w === 'H' && isMissed(i)).length;
      return [
        miss ? `${plural(miss, 'réplique')} à revoir dans ce passage.` : 'Aucune réplique à revoir dans ce passage.',
        html`${miss && !S.only ? side('only-start', IC.cross, 'Les ratées') : nothing}${main(S.only ? 'only-off-start' : 'start', html`${IC.replay}${S.only ? 'Tout le passage' : 'Recommencer'}`)}`,
      ];
    }
  }
}
export function renderDock() {
  const jour = S.mode === 'jour';
  document.body.classList.toggle('nodock', jour);
  $('#dock').hidden = jour;
  if (jour) return;
  const [s, b] = dock();
  const status = state.NOTICE ? html`${state.NOTICE}${s === nothing || s === '' ? '' : html` ${s}`}` : s;
  litRender(status, $('#status'));
  litRender(b, $('#row'));
}
export function render() {
  renderTop();
  renderScript();
  renderDock();
}
