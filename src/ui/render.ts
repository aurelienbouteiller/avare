/* ---------- rendu : chaque zone se redessine seule quand l'état qu'elle lit change ---------- */
import { watch } from '../reactive';
import { settings } from '../storage/settings';
import { renderDock } from './dock';
import { renderJour } from './jour';
import { renderLire } from './lire';
import { renderRepeter } from './repeter';
import { renderTop } from './top';

// Zone de texte de l'écran courant.
function renderScript() {
  if (settings.mode === 'jour') renderJour();
  else if (settings.mode === 'lire') renderLire();
  else renderRepeter();
}

/** Branche les trois zones de l'écran sur l'état (lit-html ne met à jour que ce qui a changé). */
export function mountViews() {
  watch(renderTop);
  watch(renderScript);
  watch(renderDock);
}
