/* ---------- en-tête : titre et puces de bloc, ou barre de répétition ---------- */
import { html, nothing } from 'lit';
import { BLOCKS } from '../data/scene';
import { isHarpagon } from '../domain/lines';
import { mastery } from '../domain/stats';
import { state } from '../state';
import { settings, stats } from '../storage/settings';
import { Component } from './component';
import { IC } from './icons';
import { inRun, masteryBar } from './parts';
import { ICON_BTN } from './styles';

function runLabel() {
  return (
    BLOCKS[settings.block].label +
    (settings.only ? ' · à revoir' : '') +
    (settings.order === 'hasard' ? ' · au hasard' : '')
  );
}

// « Réplique 3 sur 12 » : rang de la réplique d'Harpagon en cours parmi celles de la séance.
function runCount() {
  if (state.phase === 'done') return 'Terminé';
  const total = state.seq.filter(isHarpagon).length;
  const reached = state.seq.slice(0, state.pos + 1).filter(isHarpagon).length;
  return `Réplique ${Math.max(reached, 1)} sur ${total}`;
}

function runbar() {
  const done = state.phase === 'done';
  const pct = done ? 100 : Math.round((100 * (state.pos + 1)) / state.seq.length);
  const { ok, ko } = state.tally;
  const pill = 'inline-flex items-center gap-[0.2rem] rounded-full px-2 py-1';
  return html`<div id="runbar" class="grid grid-cols-[auto_1fr_auto] items-center gap-3">
      <button class=${ICON_BTN} data-act="run-stop" aria-label=${done ? 'Fermer' : 'Arrêter la répétition'}>${IC.close}</button>
      <div class="min-w-0"><div class="truncate font-serif text-[1.05rem] font-semibold">${runLabel()}</div><div class="count text-[0.82rem] text-muted">${runCount()}</div></div>
      <div class="tally flex gap-[0.35rem] text-[0.9rem] font-bold [&_.ic]:size-[0.95em]" aria-label="${ok} justes, ${ko} à revoir"><span class="ok ${pill} bg-ok-soft text-ok">${IC.check}${ok}</span><span class="ko ${pill} bg-ko-soft text-ko">${IC.cross}${ko}</span></div>
      <div class="col-span-full h-1 overflow-hidden rounded-sm bg-line"><i class="block h-full rounded-sm bg-harp transition-[width] duration-300" style="width:${pct}%"></i></div></div>`;
}

const titlebar = () =>
  html`<div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="m-0 font-serif text-[1.4rem] leading-[1.1] font-semibold tracking-[-0.01em] text-harp">Le souffleur</h1>
        <p class="mt-[0.15rem] mb-0 text-[0.84rem] text-muted">Harpagon · <i>L'Avare</i>, acte II, scène 5</p>
      </div>
      <button type="button" class=${ICON_BTN} id="btnSettings" aria-label="Réglages">${IC.gear}</button>
    </div>`;

function chips() {
  const chip = (n: number) => {
    const m = mastery(n, stats.value);
    const badge = m.ko
      ? html`<span class="badge inline-grid h-[1.2rem] min-w-[1.2rem] place-items-center rounded-full bg-ko px-[0.3rem] text-[0.7rem] font-bold text-bg" aria-label="${m.ko} à revoir">${m.ko}</span>`
      : nothing;
    return html`<button class="relative inline-flex min-w-[5.5rem] flex-none flex-col items-stretch gap-[0.35rem] rounded-xl border border-line bg-surface px-[0.8rem] pt-[0.45rem] pb-[0.55rem] text-[0.9rem] font-semibold whitespace-nowrap aria-pressed:border-harp aria-pressed:bg-harp-soft aria-pressed:text-ink" data-block=${n} aria-pressed=${settings.block === n}><span class="flex items-center justify-between gap-[0.45rem]">${BLOCKS[n].label}${badge}</span>${masteryBar(m)}</button>`;
  };
  return html`<nav id="chips" class="no-scrollbar -mx-4 flex gap-[0.45rem] overflow-x-auto px-4 pt-[0.65rem] pb-[0.1rem]" aria-label="Blocs">${BLOCKS.map((b) => chip(b.n))}</nav>`;
}

export class Top extends Component {
  // En répétition, la barre de progression remplace le titre et les puces.
  protected override render() {
    const run = inRun();
    return html`<header class="sticky top-0 z-5 border-b border-line bg-bg px-4 pt-[calc(0.7rem+env(safe-area-inset-top,0px))] pb-[0.6rem]">
      <div class="mx-auto max-w-[44rem]">${run ? runbar() : html`${titlebar()}${settings.mode === 'jour' ? nothing : chips()}`}</div>
    </header>`;
  }
}
customElements.define('sf-top', Top);

declare global {
  interface HTMLElementTagNameMap {
    'sf-top': Top;
  }
}
