/* ---------- zone principale : l'écran choisi dans les onglets ---------- */
import { html } from 'lit';
import { settings } from '../storage/settings';
import { Component } from './component';
import './jour';
import './lire';
import './repeter';
import { inRun } from './parts';

// Marge du bas : de quoi laisser voir la fin du texte au-dessus du dock et des onglets.
function bottomSpace() {
  if (settings.mode === 'jour') return 'pb-[calc(var(--navh)+1.5rem)]';
  if (inRun()) return 'pb-[calc(12rem+env(safe-area-inset-bottom,0px))]';
  return 'pb-[calc(var(--navh)+10rem)]';
}

function screen() {
  if (settings.mode === 'jour') return html`<sf-jour></sf-jour>`;
  if (settings.mode === 'lire') return html`<sf-lire></sf-lire>`;
  return html`<sf-repeter></sf-repeter>`;
}

export class Script extends Component {
  protected override render() {
    return html`<main class="px-4 pt-4 ${bottomSpace()}"><div id="script" class="mx-auto flex max-w-[44rem] flex-col gap-[0.45rem]">${screen()}</div></main>`;
  }
}
customElements.define('sf-script', Script);

declare global {
  interface HTMLElementTagNameMap {
    'sf-script': Script;
  }
}
