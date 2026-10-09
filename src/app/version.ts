/* ---------- version affichée dans les réglages (commit et date du build) ---------- */
import { html, render as litRender } from 'lit-html';
import { $ } from '../ui/dom';

const REPO = 'https://github.com/aurelienbouteiller/avare';

export function showVersion() {
  const built = new Date(__APP_BUILD_DATE__).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const commit = __APP_COMMIT__
    ? html`<a href="${REPO}/commit/${__APP_COMMIT__}" target="_blank" rel="noopener">${__APP_COMMIT__.slice(0, 7)}</a>`
    : 'inconnue';
  litRender(html`Version ${commit}, construite le ${built}.`, $('#versionInfo'));
}
