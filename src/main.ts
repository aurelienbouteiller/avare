/* ---------- démarrage ---------- */
import '@fontsource/spectral/latin-400.css';
import '@fontsource/spectral/latin-400-italic.css';
import '@fontsource/spectral/latin-600.css';
import '@fontsource/archivo/latin-500.css';
import '@fontsource/archivo/latin-600.css';
import '@fontsource/archivo/latin-700.css';
// Feuilles de style, dans l'ordre de la cascade : thème et bases, puis un fichier par composant (à côté de son .ts).
// Importées ici plutôt que par chaque composant, pour que l'ordre ne dépende pas du graphe d'imports.
import './styles/app.css';
import './styles/theme.css';
import './styles/base.css';
import './styles/cards.css';
import './styles/controls.css';
import './ui/top.css';
import './ui/parts.css';
import './ui/repeter.css';
import './ui/lire.css';
import './ui/jour.css';
import './ui/dock.css';
import './ui/tabs.css';
import './app/settings-dialog.css';
import { render as litRender } from 'lit';
import { bindEvents } from './app/events';
import { initPwa } from './app/pwa';
import { initSettingsDialog } from './app/settings-dialog';
import { initTheme } from './app/theme';
import { showVersion } from './app/version';
import { BLOCKS } from './data/scene';
import { loadRecorded } from './storage/recordings';
import { autoSave, settings } from './storage/settings';
import { IC } from './ui/icons';
import { mountViews } from './ui/render';

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
autoSave();
mountViews();
loadRecorded();
initPwa();
