/* ---------- écran Lire : la scène, bloc par bloc, réplique par réplique ---------- */
import { html, nothing } from 'lit';
import { blockLines, LINES } from '../data/scene';
import { isHarpagon } from '../domain/lines';
import { state } from '../state';
import { recorded } from '../storage/recordings';
import { isMissed, settings } from '../storage/settings';
import { Component } from './component';
import { EQ, IC } from './icons';
import { blockHead, exitNote, frosineText, lineClass, markLabel, miniButton, miniRow, who } from './parts';

function readLine(i: number) {
  const line = LINES[i],
    playing = state.playingIdx === i,
    name = isHarpagon(i) ? 'Harpagon' : 'Frosine';
  const missed = isHarpagon(i) && isMissed(i) ? markLabel('ko', '· à revoir') : nothing;
  const myTake = isHarpagon(i) && recorded.value.has(i) ? miniRow(miniButton('myrec', i, 'Ma version')) : nothing;
  const icon = html`<span class="inline-flex text-muted opacity-70 [&_.ic]:size-[0.95rem]">${playing ? EQ : IC.play}</span>`;
  return html`<div class=${lineClass(line, playing ? 'playing' : 'read', true)} data-i=${i} role="button" tabindex="0" aria-label="Écouter la réplique de ${name}">
      ${who(line, 'read', html`${name}${missed}`, icon)}
      ${isHarpagon(i) ? line.t : frosineText(line, playing)}${myTake}</div>`;
}

export class Lire extends Component {
  // Pendant la lecture du passage, chaque nouvelle réplique est centrée une fois.
  #centered = -1;

  protected override render() {
    const ids = blockLines(settings.block);
    return ids.map((i, k) => {
      const newBlock = k === 0 || LINES[ids[k - 1]].b !== LINES[i].b;
      return html`${newBlock ? blockHead(LINES[i].b, true) : nothing}${exitNote(LINES[i])}${readLine(i)}`;
    });
  }

  protected override updated() {
    if (!state.passage) {
      this.#centered = -1;
      return;
    }
    if (state.playingIdx === this.#centered) return;
    this.#centered = state.playingIdx;
    this.querySelector('.ln.playing')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}
customElements.define('sf-lire', Lire);

declare global {
  interface HTMLElementTagNameMap {
    'sf-lire': Lire;
  }
}
