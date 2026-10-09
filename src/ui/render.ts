/* ---------- rendu (lit-html : les valeurs interpolées sont échappées, le DOM est mis à jour sur place) ---------- */
import { settings } from '../storage/settings';
import { renderDock } from './dock';
import { renderJour } from './jour';
import { renderLire } from './lire';
import { renderRepeter } from './repeter';
import { renderTop } from './top';

/** Zone de texte de l'écran courant ; scroll : dans Lire, centrer la réplique en cours de lecture. */
export function renderScript(scroll?: boolean) {
  if (settings.mode === 'jour') renderJour();
  else if (settings.mode === 'lire') renderLire(scroll);
  else renderRepeter();
}

export function render() {
  renderTop();
  renderScript();
  renderDock();
}
