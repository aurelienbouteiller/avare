/* ---------- écran Lire : la scène, bloc par bloc, réplique par réplique ---------- */
import { html, render as litRender, nothing } from 'lit-html';
import { blockLines, LINES } from '../data/scene';
import { isHarpagon } from '../domain/lines';
import { state } from '../state';
import { recorded } from '../storage/recordings';
import { isMissed, settings } from '../storage/settings';
import { $ } from './dom';
import { EQ, IC } from './icons';
import { blockHead, exitNote, frosineText } from './parts';

function readLine(i: number) {
  const line = LINES[i],
    playing = state.playingIdx === i,
    who = isHarpagon(i) ? 'Harpagon' : 'Frosine';
  const missed = isHarpagon(i) && isMissed(i) ? html`<span class="mark ko">· à revoir</span>` : nothing;
  const myTake =
    isHarpagon(i) && recorded.value.has(i)
      ? html`<div class="mini"><button data-act="myrec" data-i=${i}>${IC.play}Ma version</button></div>`
      : nothing;
  return html`<div class="ln ${line.w} tap${playing ? ' playing' : ''}" data-i=${i} role="button" tabindex="0" aria-label="Écouter la réplique de ${who}">
      <span class="who"><span class="name">${who}${missed}</span><span class="pl">${playing ? EQ : IC.play}</span></span>
      ${isHarpagon(i) ? line.t : frosineText(line, playing)}${myTake}</div>`;
}

// Pendant la lecture du passage, chaque nouvelle réplique est centrée une fois.
let lastCentered = -1;
function followPassage() {
  if (!state.passage || state.playingIdx === lastCentered) return;
  lastCentered = state.playingIdx;
  document.querySelector('.ln.playing')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

export function renderLire() {
  const ids = blockLines(settings.block);
  const out = ids.map((i, k) => {
    const newBlock = k === 0 || LINES[ids[k - 1]].b !== LINES[i].b;
    return html`${newBlock ? blockHead(LINES[i].b, true) : nothing}${exitNote(LINES[i])}${readLine(i)}`;
  });
  litRender(out, $('#script'));
  followPassage();
}
