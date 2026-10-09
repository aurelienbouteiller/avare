/* ---------- démarrage ---------- */
import '@fontsource/spectral/latin-400.css';
import '@fontsource/spectral/latin-400-italic.css';
import '@fontsource/spectral/latin-600.css';
import '@fontsource/archivo/latin-500.css';
import '@fontsource/archivo/latin-600.css';
import '@fontsource/archivo/latin-700.css';
import './styles.css';
import { render as litRender } from 'lit-html';
import { bindEvents } from './app/events';
import { initPwa } from './app/pwa';
import { initSettingsDialog } from './app/settings-dialog';
import { initTheme } from './app/theme';
import { showVersion } from './app/version';
import { BLOCKS } from './data/scene';
import { loadRecorded } from './storage/recordings';
import { settings } from './storage/settings';
import { IC } from './ui/icons';
import { render } from './ui/render';

// Icônes statiques de index.html (<span data-ic="…">).
function fillStaticIcons() {
  for (const el of document.querySelectorAll<HTMLElement>('[data-ic]')) {
    const ic = IC[el.dataset.ic as keyof typeof IC];
    if (ic) litRender(ic, el);
  }
}

initTheme();
fillStaticIcons();
bindEvents();
initSettingsDialog();
showVersion();
if (!BLOCKS.some((b) => b.n === settings.block)) settings.block = 1;
loadRecorded().then(render);
initPwa();
render();
