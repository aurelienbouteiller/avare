/* ---------- démarrage ---------- */
import '@fontsource/spectral/latin-400.css';
import '@fontsource/spectral/latin-400-italic.css';
import '@fontsource/spectral/latin-600.css';
import '@fontsource/archivo/latin-500.css';
import '@fontsource/archivo/latin-600.css';
import '@fontsource/archivo/latin-700.css';
import './styles/app.css';
import './styles/theme.css';
import { bindEvents } from './app/events';
import { initPwa } from './app/pwa';
import { initSettingsDialog } from './app/settings-dialog';
import { initTheme } from './app/theme';
import { BLOCKS } from './data/scene';
import { loadRecorded } from './storage/recordings';
import { autoSave, settings } from './storage/settings';
// Composants de la page (chacun s'enregistre comme élément <sf-…>).
import './ui/top';
import './ui/script';
import './ui/dock';
import './ui/tabs';
import './ui/settings';

initTheme();
bindEvents();
initSettingsDialog();
if (!BLOCKS.some((b) => b.n === settings.block)) settings.block = 1;
autoSave();
loadRecorded();
initPwa();
