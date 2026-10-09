/* ---------- écran Aujourd'hui : séance du jour, retard, maîtrise, programme ---------- */
import { html, render as litRender, nothing } from 'lit-html';
import { BLOCKS, PLAN } from '../data/scene';
import { daysUntil, fmtDate, today } from '../domain/dates';
import { mastery } from '../domain/stats';
import { state } from '../state';
import { settings, stats } from '../storage/settings';
import type { PlanDay } from '../types';
import { $ } from './dom';
import { IC } from './icons';
import { capitalize, masterySummary, percent, plural } from './parts';

const STANDALONE = matchMedia('(display-mode: standalone)').matches;
const SHOW_DAY = PLAN[PLAN.length - 1].d;

const isDone = (day: PlanDay) => !!settings.done[day.d];
const goButtons = (dayIdx: number, from = 0) =>
  PLAN[dayIdx].go
    .slice(from)
    .map((g, k) => html`<button class="btn-s" data-go="${dayIdx}:${k + from}">${g.l}</button>`);

/* ---------- séance du jour ---------- */
function countdown() {
  const j = daysUntil(SHOW_DAY);
  if (j === 0)
    return html`<span class="jj">Jour J</span><span class="jjl">C'est ce soir.<br>Bonne représentation !</span>`;
  return html`<span class="jj">J-${j}</span><span class="jjl">avant la représentation<br>${fmtDate(SHOW_DAY, { weekday: 'long', day: 'numeric', month: 'long' })}</span>`;
}

function doneButton(day: PlanDay, td: string) {
  const done = isDone(day);
  return html`<button class="donebtn" data-done=${day.d} aria-pressed=${done}><span class="box">${done ? IC.check : nothing}</span>${done ? 'Séance faite' : 'Marquer la séance comme faite'}<span class="cnt">${plural(settings.daily[td] || 0, 'réplique')} aujourd'hui</span></button>`;
}

/** Séance du jour idx ; before : le programme n'a pas encore commencé, on montre le premier jour. */
function hero(idx: number, td: string, before: boolean) {
  const day = PLAN[idx];
  const rest = goButtons(idx, 1);
  return html`<section class="card hero">
      <div class="band">${countdown()}</div>
      <div class="body">
        <p class="kicker">${before ? 'Pour commencer' : capitalize(fmtDate(td))} · jour ${idx + 1} sur ${PLAN.length}</p>
        <h2>${day.t}</h2><p>${day.x}</p>
        <button class="btn-l" data-go="${idx}:0">${IC.play}${day.go[0].l}</button>
        ${rest.length ? html`<div class="btnrow">${rest}</div>` : nothing}
        ${doneButton(day, td)}
      </div></section>`;
}

/* ---------- séances en retard ---------- */
function lateCard(td: string) {
  const late = PLAN.filter((p) => p.d < td && !isDone(p));
  if (!late.length) return nothing;
  const item = (p: PlanDay) =>
    html`<div class="item"><p><b>${capitalize(fmtDate(p.d, { weekday: 'short', day: 'numeric' }))}</b> · ${p.t}</p><div class="btnrow">${goButtons(PLAN.indexOf(p))}<button class="btn-s" data-done=${p.d}>${IC.check}Fait</button></div></div>`;
  return html`<section class="card late"><h3>À rattraper</h3>${late.map(item)}</section>`;
}

/* ---------- maîtrise par bloc ---------- */
function masteryTile(b: number) {
  const m = mastery(b, stats),
    label = BLOCKS[b].label;
  const ok = percent(m.ok, m.n);
  return html`<button class="tile" data-act="go-block" data-b=${b} aria-label="${label} : ${m.ok} justes, ${m.ko} à revoir sur ${m.n}. Répéter ce bloc."><span class="ring" style="--p:${ok};--k:${percent(m.ko, m.n)}"><b>${ok}%</b></span>${label}</button>`;
}

function masteryCard() {
  const tiles = [1, 2, 3, 4, 5, 6].map(masteryTile);
  return html`<section class="card"><h3>Maîtrise par bloc</h3><div class="tiles">${tiles}</div><p class="muted total">Toute la scène : ${masterySummary(mastery(0, stats))}. Touche un bloc pour le répéter.</p></section>`;
}

/* ---------- programme ---------- */
function stripClass(p: PlanDay, td: string) {
  if (p.d === SHOW_DAY) return 'show';
  if (isDone(p)) return 'ok';
  if (p.d === td) return 'now';
  return p.d < td ? 'late' : '';
}

function listStatus(p: PlanDay, td: string) {
  if (isDone(p)) return html`<span class="st ok">✓</span>`;
  if (p.d < td) return html`<span class="st late">à rattraper</span>`;
  if (p.d === td) return html`<span class="st">aujourd'hui</span>`;
  return nothing;
}

function programCard(td: string) {
  const days = PLAN.map(
    (p) =>
      html`<div class="day ${stripClass(p, td)}${p.d === td ? ' now' : ''}" title=${p.t}>${fmtDate(p.d, { weekday: 'short' }).slice(0, 3)}<b>${Number(p.d.slice(8))}</b></div>`,
  );
  const list = PLAN.map(
    (p) =>
      html`<li class=${p.d === td ? 'now' : ''}><span class="dt">${fmtDate(p.d, { weekday: 'short', day: 'numeric' })}</span><span>${p.t}</span>${listStatus(p, td)}</li>`,
  );
  return html`<section class="card"><h3>Programme</h3><div class="strip" id="strip">${days}</div>
    <div class="legend"><span style="--c:var(--ok)">fait</span><span style="--c:var(--harp)">aujourd'hui</span><span style="--c:var(--ko)">à rattraper</span><span style="--c:var(--curtain)">représentation</span></div>
    <details class="prog-list"><summary>Voir le programme détaillé</summary><ul class="cal">${list}</ul></details></section>`;
}

const installCard = () =>
  state.installPrompt && !STANDALONE
    ? html`<div class="card install"><p>Installe le souffleur comme une appli : il marchera même sans réseau.</p><button class="btn-s" data-act="install">${IC.download}Installer</button></div>`
    : nothing;

const afterShowCard = () =>
  html`<div class="card"><h2>La représentation est passée</h2><p>Bravo ! Tu peux toujours répéter librement depuis Lire et Répéter.</p></div>`;

// Fait défiler le calendrier pour centrer aujourd'hui.
function centerToday() {
  const strip = $('#strip'),
    now = strip.querySelector<HTMLElement>('.now');
  if (now) strip.scrollLeft = now.offsetLeft - strip.offsetLeft - strip.clientWidth / 2 + now.offsetWidth / 2;
}

export function renderJour() {
  const td = today();
  const before = td < PLAN[0].d,
    after = td > SHOW_DAY;
  const idx = before ? 0 : PLAN.findIndex((p) => p.d === td);
  const top = after ? afterShowCard() : idx >= 0 ? hero(idx, td, before) : nothing;
  litRender(
    html`<div class="stack">
      ${top}
      ${after ? nothing : lateCard(td)}${masteryCard()}${programCard(td)}
      ${installCard()}
    </div>`,
    $('#script'),
  );
  centerToday();
}
