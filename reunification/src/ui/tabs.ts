/* ---------- navigation du bas : les quatre écrans ---------- */
import { html } from 'lit';
import { settings } from '../storage/settings';
import type { Mode } from '../types';
import { Component } from './component';
import { IC } from './icons';
import { inRun } from './parts';

const TABS: [Mode, keyof typeof IC, string][] = [
  ['jour', 'sun', "Aujourd'hui"],
  ['lire', 'book', 'Lire'],
  ['repeter', 'mask', 'Répéter'],
  ['roles', 'users', 'Rôles'],
];

const tab = ([mode, icon, label]: (typeof TABS)[number]) =>
  html`<button type="button" role="tab" data-mode=${mode} aria-selected=${settings.mode === mode} class="group flex w-full max-w-40 flex-col items-center justify-center gap-1 justify-self-center bg-transparent text-xs font-semibold text-muted aria-selected:text-ink">
    <span class="grid h-7.5 w-14 place-items-center rounded-full transition-colors duration-200 group-aria-selected:bg-me-soft group-aria-selected:text-me [&_.ic]:size-5.5">${IC[icon]}</span><span>${label}</span></button>`;

export class Tabs extends Component {
  // Pendant une répétition, l'écran lui est consacré : pas d'onglets.
  protected override render() {
    return html`<div role="tablist" aria-label="Écrans" ?hidden=${inRun()} class="fixed inset-x-0 bottom-0 z-7 grid h-(--navh) grid-cols-4 border-t border-line bg-surface px-[max(--spacing(2),calc(50%-(--spacing(64))))] pb-[env(safe-area-inset-bottom,0px)]">${TABS.map(tab)}</div>`;
  }
}
customElements.define('sf-tabs', Tabs);

declare global {
  interface HTMLElementTagNameMap {
    'sf-tabs': Tabs;
  }
}
