/* ---------- écran Aujourd'hui : séance du jour, retard, maîtrise, programme ---------- */
import { html, nothing } from 'lit';
import { BLOCKS, PLAN } from '../data/scene';
import { daysUntil, fmtDate, today } from '../domain/dates';
import { mastery } from '../domain/stats';
import { state } from '../state';
import { settings, stats } from '../storage/settings';
import type { PlanDay } from '../types';
import { Component } from './component';
import { IC } from './icons';
import { capitalize, masterySummary, percent, plural } from './parts';
import { BTN_L, BTN_S, CARD, CARD_FLUSH, CARD_LABEL, CARD_TEXT, CARD_TITLE, KICKER, MUTED, STACK } from './styles';

const STANDALONE = matchMedia('(display-mode: standalone)').matches;
const SHOW_DAY = PLAN[PLAN.length - 1].d;

const isDone = (day: PlanDay) => !!settings.done[day.d];
const BTN_ROW = 'mt-[0.6rem] flex flex-wrap gap-2';
const goButtons = (dayIdx: number, from = 0) =>
  PLAN[dayIdx].go
    .slice(from)
    .map((g, k) => html`<button class="${BTN_S} flex-auto" data-go="${dayIdx}:${k + from}">${g.l}</button>`);

/* ---------- séance du jour ---------- */
function countdown() {
  const j = daysUntil(SHOW_DAY);
  const big = (t: string) => html`<span class="jj font-serif text-[1.9rem] leading-none font-semibold">${t}</span>`;
  const small = (t: unknown) => html`<span class="text-right text-[0.82rem] leading-[1.3] opacity-90">${t}</span>`;
  if (j === 0) return html`${big('Jour J')}${small(html`C'est ce soir.<br>Bonne représentation !`)}`;
  return html`${big(`J-${j}`)}${small(html`avant la représentation<br>${fmtDate(SHOW_DAY, { weekday: 'long', day: 'numeric', month: 'long' })}`)}`;
}

function doneButton(day: PlanDay, td: string) {
  const done = isDone(day);
  return html`<button class="group mt-[0.9rem] flex w-full flex-wrap items-center gap-x-[0.6rem] gap-y-[0.2rem] border-t border-line bg-transparent px-[0.2rem] pt-[0.7rem] pb-0 text-left font-semibold" data-done=${day.d} aria-pressed=${done}>
      <span class="grid size-6 flex-none place-items-center rounded-[7px] border-2 border-line text-on-accent group-aria-pressed:border-ok group-aria-pressed:bg-ok group-aria-pressed:text-bg [&_.ic]:size-4">${done ? IC.check : nothing}</span>${done ? 'Séance faite' : 'Marquer la séance comme faite'}
      <span class="ml-auto text-[0.85rem] font-medium whitespace-nowrap text-muted">${plural(settings.daily[td] || 0, 'réplique')} aujourd'hui</span></button>`;
}

/** Séance du jour idx ; before : le programme n'a pas encore commencé, on montre le premier jour. */
function hero(idx: number, td: string, before: boolean) {
  const day = PLAN[idx];
  const rest = goButtons(idx, 1);
  return html`<section class="${CARD_FLUSH} hero">
      <div class="flex items-center justify-between gap-4 bg-curtain bg-[repeating-linear-gradient(90deg,rgba(0,0,0,0.12)_0_10px,rgba(255,255,255,0)_10px_26px)] px-[1.15rem] py-[0.9rem] text-on-curtain">${countdown()}</div>
      <div class="px-[1.15rem] pt-4 pb-[1.1rem]">
        <p class=${KICKER}>${before ? 'Pour commencer' : capitalize(fmtDate(td))} · jour ${idx + 1} sur ${PLAN.length}</p>
        <h2 class=${CARD_TITLE}>${day.t}</h2><p class=${CARD_TEXT}>${day.x}</p>
        <button class="${BTN_L} mt-[0.9rem]" data-go="${idx}:0">${IC.play}${day.go[0].l}</button>
        ${rest.length ? html`<div class=${BTN_ROW}>${rest}</div>` : nothing}
        ${doneButton(day, td)}
      </div></section>`;
}

/* ---------- séances en retard ---------- */
function lateCard(td: string) {
  const late = PLAN.filter((p) => p.d < td && !isDone(p));
  if (!late.length) return nothing;
  const item = (p: PlanDay) =>
    html`<div class="item border-t border-line py-[0.6rem] first-of-type:border-t-0 first-of-type:pt-0"><p class="my-[0.2rem]"><b>${capitalize(fmtDate(p.d, { weekday: 'short', day: 'numeric' }))}</b> · ${p.t}</p><div class=${BTN_ROW}>${goButtons(PLAN.indexOf(p))}<button class="${BTN_S} flex-auto" data-done=${p.d}>${IC.check}Fait</button></div></div>`;
  return html`<section class="${CARD} late"><h3 class=${CARD_LABEL}>À rattraper</h3>${late.map(item)}</section>`;
}

/* ---------- maîtrise par bloc ---------- */
function masteryTile(b: number) {
  const m = mastery(b, stats.value),
    label = BLOCKS[b].label;
  const ok = percent(m.ok, m.n),
    ko = percent(m.ko, m.n);
  // Anneau : juste puis à revoir, en part du cercle.
  const ring = `background:conic-gradient(var(--ok) ${ok}%, var(--ko) 0 ${ok + ko}%, var(--line) 0)`;
  return html`<button class="flex flex-col items-center gap-[0.45rem] rounded-[14px] border border-line bg-surface-2 px-[0.4rem] pt-3 pb-[0.65rem] text-center text-[0.82rem] leading-[1.2] font-semibold" data-act="go-block" data-b=${b} aria-label="${label} : ${m.ok} justes, ${m.ko} à revoir sur ${m.n}. Répéter ce bloc.">
      <span class="relative grid size-[3.2rem] place-items-center rounded-full before:absolute before:inset-[5px] before:rounded-full before:bg-surface-2 before:content-['']" style=${ring}><b class="relative text-[0.85rem]">${ok}%</b></span>${label}</button>`;
}

function masteryCard() {
  const tiles = [1, 2, 3, 4, 5, 6].map(masteryTile);
  return html`<section class=${CARD}><h3 class=${CARD_LABEL}>Maîtrise par bloc</h3><div class="grid grid-cols-3 gap-2">${tiles}</div><p class="${CARD_TEXT} ${MUTED}">Toute la scène : ${masterySummary(mastery(0, stats.value))}. Touche un bloc pour le répéter.</p></section>`;
}

/* ---------- programme ---------- */
// Pastille d'un jour : la représentation, puis aujourd'hui, puis fait, puis en retard.
function dayDot(p: PlanDay, td: string) {
  if (p.d === SHOW_DAY) return 'border-curtain bg-curtain text-on-curtain';
  if (p.d === td) return 'border-harp bg-harp-soft text-ink';
  if (isDone(p)) return 'border-ok bg-ok text-bg';
  if (p.d < td) return 'border-ko text-ko';
  return 'border-line text-ink';
}

function listStatus(p: PlanDay, td: string) {
  const st = 'ml-auto flex-none font-semibold';
  if (isDone(p)) return html`<span class="${st} text-ok">✓</span>`;
  if (p.d < td) return html`<span class="${st} text-ko">à rattraper</span>`;
  if (p.d === td) return html`<span class=${st}>aujourd'hui</span>`;
  return nothing;
}

const legend = (color: string, label: string) =>
  html`<span class="before:mr-[0.3rem] before:inline-block before:size-[0.6rem] before:rounded-full before:bg-(--c) before:align-middle before:content-['']" style="--c:var(${color})">${label}</span>`;

function programCard(td: string) {
  const days = PLAN.map(
    (p) =>
      html`<div class="flex w-[2.6rem] flex-none flex-col items-center gap-1 text-[0.7rem] font-semibold uppercase ${p.d === td ? 'now text-harp' : 'text-muted'}" title=${p.t}>${fmtDate(p.d, { weekday: 'short' }).slice(0, 3)}<b class="grid size-[2.3rem] place-items-center rounded-full border-2 text-[0.9rem] ${dayDot(p, td)}">${Number(p.d.slice(8))}</b></div>`,
  );
  const list = PLAN.map(
    (p) =>
      html`<li class="flex items-baseline gap-[0.7rem] border-b border-line py-[0.45rem] text-[0.9rem] last:border-b-0 ${p.d === td ? 'font-semibold' : ''}"><span class="w-[5.4rem] flex-none ${p.d === td ? 'text-harp' : 'text-muted'}">${fmtDate(p.d, { weekday: 'short', day: 'numeric' })}</span><span>${p.t}</span>${listStatus(p, td)}</li>`,
  );
  return html`<section class=${CARD}><h3 class=${CARD_LABEL}>Programme</h3>
    <div class="strip no-scrollbar flex min-w-0 max-w-full gap-[0.35rem] overflow-x-auto pt-[0.15rem] pb-[0.35rem]">${days}</div>
    <div class="mt-[0.35rem] flex flex-wrap gap-[0.9rem] text-[0.78rem] text-muted">${legend('--ok', 'fait')}${legend('--harp', "aujourd'hui")}${legend('--ko', 'à rattraper')}${legend('--curtain', 'représentation')}</div>
    <details class="mt-[0.6rem]"><summary class="cursor-pointer py-[0.3rem] text-[0.9rem] font-semibold">Voir le programme détaillé</summary><ul class="mt-[0.3rem] mb-0 list-none p-0">${list}</ul></details></section>`;
}

const installCard = () =>
  state.installPrompt && !STANDALONE
    ? html`<div class="${CARD} flex items-center gap-[0.8rem]"><p class="m-0 flex-1 text-[0.92rem]">Installe le souffleur comme une appli : il marchera même sans réseau.</p><button class=${BTN_S} data-act="install">${IC.download}Installer</button></div>`
    : nothing;

const afterShowCard = () =>
  html`<div class=${CARD}><h2 class=${CARD_TITLE}>La représentation est passée</h2><p class=${CARD_TEXT}>Bravo ! Tu peux toujours répéter librement depuis Lire et Répéter.</p></div>`;

export class Jour extends Component {
  protected override render() {
    const td = today();
    const before = td < PLAN[0].d,
      after = td > SHOW_DAY;
    const idx = before ? 0 : PLAN.findIndex((p) => p.d === td);
    const top = after ? afterShowCard() : idx >= 0 ? hero(idx, td, before) : nothing;
    return html`<div class=${STACK}>
      ${top}
      ${after ? nothing : lateCard(td)}${masteryCard()}${programCard(td)}
      ${installCard()}
    </div>`;
  }

  // Fait défiler le calendrier pour centrer aujourd'hui.
  protected override updated() {
    const strip = this.querySelector<HTMLElement>('.strip'),
      now = strip?.querySelector<HTMLElement>('.now');
    if (strip && now)
      strip.scrollLeft = now.offsetLeft - strip.offsetLeft - strip.clientWidth / 2 + now.offsetWidth / 2;
  }
}
customElements.define('sf-jour', Jour);

declare global {
  interface HTMLElementTagNameMap {
    'sf-jour': Jour;
  }
}
