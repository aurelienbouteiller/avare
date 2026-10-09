/* ---------- en-tête : onglets, puces de bloc, ou barre de répétition ---------- */
import { html, render as litRender, nothing } from 'lit-html';
import { BLOCKS } from '../data/scene';
import { isHarpagon } from '../domain/lines';
import { mastery } from '../domain/stats';
import { state } from '../state';
import { settings, stats } from '../storage/settings';
import type { Phase } from '../types';
import { $ } from './dom';
import { IC } from './icons';
import { masteryBar } from './parts';

const RUN_PHASES: Phase[] = ['frosine', 'await', 'check', 'done'];
/** Une répétition est en cours (ou vient de finir) : l'en-tête montre sa progression. */
const inRun = () => settings.mode === 'repeter' && RUN_PHASES.includes(state.phase);

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
  return html`<button class="iconbtn" data-act="run-stop" aria-label=${done ? 'Fermer' : 'Arrêter la répétition'}>${IC.close}</button>
      <div class="where"><div class="bname">${runLabel()}</div><div class="count">${runCount()}</div></div>
      <div class="tally" aria-label="${ok} justes, ${ko} à revoir"><span class="ok">${IC.check}${ok}</span><span class="ko">${IC.cross}${ko}</span></div>
      <div class="prog"><i style="width:${pct}%"></i></div>`;
}

function chips() {
  return BLOCKS.map((b) => {
    const m = mastery(b.n, stats);
    const badge = m.ko ? html`<span class="badge" aria-label="${m.ko} à revoir">${m.ko}</span>` : nothing;
    return html`<button class="chip" data-block=${b.n} aria-pressed=${settings.block === b.n}><span class="cl">${b.label}${badge}</span>${masteryBar(m)}</button>`;
  });
}

export function renderTop() {
  const run = inRun();
  document.body.classList.toggle('run', run);
  for (const b of document.querySelectorAll<HTMLElement>('.tabs button'))
    b.setAttribute('aria-selected', b.dataset.mode === settings.mode ? 'true' : 'false');
  const bar = $('#runbar'),
    chipsEl = $('#chips');
  bar.hidden = !run;
  litRender(run ? runbar() : nothing, bar);
  chipsEl.hidden = settings.mode === 'jour' || run;
  litRender(chipsEl.hidden ? nothing : chips(), chipsEl);
}
