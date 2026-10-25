/* ---------- écran Lire : la pièce, scène par scène, réplique par réplique ---------- */
import { html, nothing } from 'lit';
import { isSpoken } from '../domain/lines';
import { state } from '../state';
import { isMine, isMissed, lines, sceneLines } from '../storage/play';
import { recorded } from '../storage/recordings';
import { settings } from '../storage/settings';
import { Component } from './component';
import { EQ, IC } from './icons';
import { lineClass, lineText, markLabel, miniButton, miniRow, sceneHead, speaker, stageDirection, who } from './parts';

function readLine(i: number) {
  const line = lines()[i];
  if (!isSpoken(line)) return stageDirection(line);
  const playing = state.playingIdx === i,
    mine = isMine(i),
    name = speaker(line);
  const missed = isMissed(i) ? markLabel('ko', '· à revoir') : nothing;
  const myTake = mine && recorded.value.has(line.id) ? miniRow(miniButton('myrec', i, 'Ma version')) : nothing;
  const icon = html`<span class="inline-flex text-muted opacity-70 [&_.ic]:size-4">${playing ? EQ : IC.play}</span>`;
  return html`<div class=${lineClass(mine, playing ? 'playing' : 'read', true)} data-i=${i} role="button" tabindex="0" aria-label="Écouter la réplique de ${name}">
      ${who(mine, html`${name}${mine ? ' · toi' : ''}${missed}`, icon)}
      ${lineText(line, playing)}${myTake}</div>`;
}

export class Lire extends Component {
  // Pendant la lecture du passage, chaque nouvelle réplique est centrée une fois.
  #centered = -1;

  protected override render() {
    const ids = sceneLines(settings.block),
      all = lines();
    return ids.map((i, k) => {
      const newScene = k === 0 || all[ids[k - 1]].b !== all[i].b;
      return html`${newScene ? sceneHead(all[i].b, true) : nothing}${readLine(i)}`;
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
