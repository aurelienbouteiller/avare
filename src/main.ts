import '@fontsource/spectral/latin-400.css';
import '@fontsource/spectral/latin-400-italic.css';
import '@fontsource/spectral/latin-600.css';
import '@fontsource/archivo/latin-500.css';
import '@fontsource/archivo/latin-600.css';
import '@fontsource/archivo/latin-700.css';
import './styles.css';
import { registerSW } from 'virtual:pwa-register';
import { html, render as litRender } from 'lit-html';
import { BLOCKS, PLAN } from './data/scene';
import {
  frosineTestClip,
  hasVoices,
  loadVoices,
  pickVoice,
  playClip,
  playModelH,
  say,
  sortedVoices,
} from './device/audio';
import { REC, TTS } from './device/platform';
import { engine, lockOff, playLine, playMine, playPassage, stop, stopSpeech } from './engine/rehearsal';
import { state } from './state';
import { clearStats, dropUrl, idbClear, idbKeys, RECS, S, save, URLS } from './storage/settings';
import {
  BANKS,
  type BeforeInstallPromptEvent,
  CHECKS,
  isOneOf,
  MASK_IDS,
  MODES,
  ORDERS,
  type Preset,
  SRCS,
  THEMES,
  TOLS,
} from './types';
import { IC } from './ui/icons';
import { $, render } from './ui/render';

// Élément le plus proche de la cible d'un évènement délégué.
const closest = (e: Event, sel: string) => (e.target as Element).closest<HTMLElement>(sel);

/* ---------- thème ---------- */
function applyTheme() {
  const t = S.theme || 'sombre',
    root = document.documentElement;
  if (t === 'auto') delete root.dataset.theme;
  else root.dataset.theme = t === 'clair' ? 'light' : 'dark';
  const dark = t === 'sombre' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  const meta = document.querySelector<HTMLMetaElement>('meta[name=theme-color]');
  if (meta) meta.content = dark ? '#140B0F' : '#F7F1E6';
  document.querySelectorAll<HTMLElement>('#optTheme [data-val]').forEach((b) => {
    b.setAttribute('aria-pressed', b.dataset.val === t ? 'true' : 'false');
  });
}
applyTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
document.querySelectorAll<HTMLElement>('[data-ic]').forEach((el) => {
  const ic = IC[el.dataset.ic as keyof typeof IC];
  if (ic) litRender(ic, el);
});

/* ---------- interactions ---------- */
$('.tabs').addEventListener('click', (e) => {
  const t = closest(e, '[data-mode]');
  if (!t || !isOneOf(MODES, t.dataset.mode)) return;
  stop();
  S.mode = t.dataset.mode;
  save();
  render();
  window.scrollTo(0, 0);
});
$('#chips').addEventListener('click', (e) => {
  const t = closest(e, '[data-block]');
  if (!t) return;
  stop();
  S.block = Number(t.dataset.block);
  S.only = false;
  save();
  render();
  t.scrollIntoView({ inline: 'nearest', block: 'nearest' });
});
function applyPreset(p: Preset) {
  stop();
  S.mode = p.mode || 'repeter';
  S.block = p.block || 0;
  if (S.mode === 'repeter') {
    S.mask = p.mask || 'coins';
    S.order = p.order || 'scene';
    S.only = !!p.only;
    S.wild = !!p.wild;
    if (p.check) S.check = p.check;
  }
  save();
  render();
  window.scrollTo(0, 0);
}
function act(a: string | undefined, el: HTMLElement) {
  if (a === 'start') engine.start();
  else if (a === 'stop') engine.stop();
  else if (a === 'skip') engine.next();
  else if (a === 'reveal') engine.reveal();
  else if (a === 'hint') engine.hint();
  else if (a === 'replay') engine.replay();
  else if (a === 'retry') engine.retry();
  else if (a === 'flip') engine.flip();
  else if (a === 'ok') engine.judge(true);
  else if (a === 'ko') engine.judge(false);
  else if (a === 'only-on') {
    S.only = true;
    save();
    state.phase = 'idle';
    render();
  } else if (a === 'only-off') {
    S.only = false;
    save();
    state.phase = 'idle';
    render();
  } else if (a === 'only-start') {
    S.only = true;
    save();
    engine.start();
  } else if (a === 'only-off-start') {
    S.only = false;
    save();
    engine.start();
  } else if (a === 'run-stop') engine.stop();
  else if (a === 'go-block') {
    stop();
    S.mode = 'repeter';
    S.block = Number(el.dataset.b);
    S.only = false;
    save();
    render();
    window.scrollTo(0, 0);
  } else if (a === 'to-repeter') {
    stop();
    S.mode = 'repeter';
    save();
    render();
    window.scrollTo(0, 0);
  } else if (a === 'play-all') playPassage(false);
  else if (a === 'play-mine') playPassage(true);
  else if (a === 'stop-all') {
    stopSpeech();
    lockOff();
    render();
  } else if (a === 'myrec') playMine(Number(el.dataset.i));
  else if (a === 'model') {
    stopSpeech();
    const tok = state.RUN;
    playModelH(Number(el.dataset.i), tok);
  } else if (a === 'install' && state.INSTALL) {
    state.INSTALL.prompt();
    state.INSTALL.userChoice.finally(() => {
      state.INSTALL = null;
      render();
    });
  }
}
$('#row').addEventListener('click', (e) => {
  const t = closest(e, '[data-act]');
  if (t) act(t.dataset.act, t);
});
$('#runbar').addEventListener('click', (e) => {
  const t = closest(e, '[data-act]');
  if (t) act(t.dataset.act, t);
});
$('#script').addEventListener('click', (e) => {
  const a = closest(e, '[data-act]');
  if (a) {
    e.stopPropagation();
    act(a.dataset.act, a);
    return;
  }
  const g = closest(e, '[data-go]');
  if (g) {
    const [d = 0, k = 0] = (g.dataset.go ?? '').split(':').map(Number);
    const p = PLAN[d]?.go[k]?.p;
    if (p) applyPreset(p);
    return;
  }
  const dn = closest(e, '[data-done]');
  if (dn?.dataset.done) {
    const d = dn.dataset.done;
    if (S.done[d]) delete S.done[d];
    else S.done[d] = true;
    save();
    render();
    return;
  }
  const o = closest(e, '[data-opt]');
  if (o) {
    setOpt(o.dataset.opt, o.dataset.val);
    save();
    render();
    return;
  }
  tapLine(e);
});
function setOpt(k?: string, v?: string) {
  if (k === 'mask' && isOneOf(MASK_IDS, v)) S.mask = v;
  else if (k === 'order' && isOneOf(ORDERS, v)) S.order = v;
  else if (k === 'check' && isOneOf(CHECKS, v)) S.check = v;
}
function tapLine(e: Event) {
  if (S.mode === 'lire') {
    const ln = closest(e, '.ln[data-i]');
    if (ln) {
      e.preventDefault();
      playLine(Number(ln.dataset.i));
    }
  } else if (S.mode === 'repeter') {
    const ln = closest(e, '.ln[data-p]');
    if (ln) {
      e.preventDefault();
      engine.goTo(Number(ln.dataset.p));
    }
  }
}
$('#script').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') tapLine(e);
});
window.addEventListener('online', () => render());
window.addEventListener('offline', () => render());
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  state.INSTALL = e as BeforeInstallPromptEvent;
  if (S.mode === 'jour') render();
});

/* ---------- réglages ---------- */
const dlg = $<HTMLDialogElement>('#dlg');
function fillVoices() {
  const sel = $<HTMLSelectElement>('#optVoice');
  if (!sel) return;
  if (!TTS) {
    litRender(html`<option>Indisponible</option>`, sel);
    sel.disabled = true;
    $('#voiceInfo').textContent = 'Ce navigateur ne lit pas le texte à voix haute.';
    return;
  }
  if (!hasVoices()) {
    litRender(html`<option value="">Voix française par défaut</option>`, sel);
    $('#voiceInfo').textContent = 'Utilisée seulement en secours.';
    return;
  }
  const v = pickVoice(),
    best = sortedVoices()[0];
  litRender(
    sortedVoices().map(
      (x) =>
        html`<option value=${x.voiceURI} .selected=${x.voiceURI === v?.voiceURI}>${x.name}${x === best ? ' (recommandée)' : ''}</option>`,
    ),
    sel,
  );
  $('#voiceInfo').textContent = 'Utilisée seulement en secours, si une voix enregistrée manque.';
}
function syncDlg() {
  $<HTMLInputElement>('#optTts').checked = S.tts;
  $<HTMLInputElement>('#optRate').value = String(S.rate);
  $('#rateVal').textContent = `×${(+S.rate).toFixed(2)}`;
  $<HTMLInputElement>('#optWild').checked = S.wild;
  $<HTMLInputElement>('#optHands').checked = S.hands;
  $<HTMLSelectElement>('#optTol').value = S.tol || 'normale';
  fillVoices();
  $('#fieldSrc').hidden = !REC;
  $('#fieldFv').hidden = !REC || S.src !== 'rec';
  $<HTMLSelectElement>('#optSrc').value = S.src;
  $<HTMLSelectElement>('#optFv').value = S.fv || 'F0';
  $('#offlineInfo').textContent = state.OFFLINE_READY
    ? 'Disponible hors ligne : tout fonctionne sans réseau, sauf la vérification à la voix.'
    : 'Préparation du mode hors ligne au premier chargement.';
  applyTheme();
}
$('#btnSettings').addEventListener('click', () => {
  syncDlg();
  dlg.showModal();
});
$('#btnClose').addEventListener('click', () => {
  dlg.close();
});
dlg.addEventListener('close', () => render());
$<HTMLInputElement>('#optTts').addEventListener('change', (e) => {
  S.tts = (e.target as HTMLInputElement).checked;
  save();
});
$<HTMLInputElement>('#optRate').addEventListener('input', (e) => {
  S.rate = Number((e.target as HTMLInputElement).value);
  $('#rateVal').textContent = `×${S.rate.toFixed(2)}`;
  save();
});
$<HTMLInputElement>('#optWild').addEventListener('change', (e) => {
  S.wild = (e.target as HTMLInputElement).checked;
  save();
});
$<HTMLInputElement>('#optHands').addEventListener('change', (e) => {
  S.hands = (e.target as HTMLInputElement).checked;
  save();
});
$('#optTol').addEventListener('change', (e) => {
  const v = (e.target as HTMLSelectElement).value;
  if (isOneOf(TOLS, v)) S.tol = v;
  save();
});
$('#optVoice').addEventListener('change', (e) => {
  S.voice = (e.target as HTMLSelectElement).value;
  save();
});
$('#optSrc').addEventListener('change', (e) => {
  const v = (e.target as HTMLSelectElement).value;
  if (isOneOf(SRCS, v)) S.src = v;
  save();
  syncDlg();
});
$('#optFv').addEventListener('change', (e) => {
  const v = (e.target as HTMLSelectElement).value;
  if (isOneOf(BANKS, v)) S.fv = v;
  save();
});
$('#optTheme').addEventListener('click', (e) => {
  const t = closest(e, '[data-val]');
  if (!t || !isOneOf(THEMES, t.dataset.val)) return;
  S.theme = t.dataset.val;
  save();
  applyTheme();
});
$('#btnTest').addEventListener('click', async () => {
  stopSpeech();
  const tok = state.RUN;
  const src = await frosineTestClip();
  if (src) playClip(src, S.rate, tok);
  else if (TTS)
    say('Ah, mon Dieu ! Que vous vous portez bien ! Et que vous avez là un vrai visage de santé !', S.rate, 1, tok);
});
$('#btnReset').addEventListener('click', () => {
  if (confirm('Effacer tous tes résultats (répliques justes et à revoir) ?')) {
    clearStats();
    S.only = false;
    S.daily = {};
    save();
    stop();
  }
});
$('#btnResetRec').addEventListener('click', async () => {
  if (confirm('Effacer tous tes enregistrements ?')) {
    await idbClear();
    RECS.clear();
    for (const k of Object.keys(URLS)) dropUrl(Number(k));
    render();
  }
});

/* ---------- version (commit et date du build) ---------- */
const REPO = 'https://github.com/aurelienbouteiller/avare';
const built = new Date(__APP_BUILD_DATE__).toLocaleString('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
litRender(
  html`Version ${__APP_COMMIT__ ? html`<a href="${REPO}/commit/${__APP_COMMIT__}" target="_blank" rel="noopener">${__APP_COMMIT__.slice(0, 7)}</a>` : 'inconnue'}, construite le ${built}.`,
  $('#versionInfo'),
);

/* ---------- démarrage ---------- */
if (TTS) {
  const lv = () => loadVoices(fillVoices);
  lv();
  try {
    speechSynthesis.addEventListener('voiceschanged', lv);
  } catch {
    speechSynthesis.onvoiceschanged = lv;
  }
}
if (!BLOCKS.some((b) => b.n === S.block)) S.block = 1;
idbKeys().then((ks) => {
  for (const k of ks) RECS.add(+k);
  render();
});
registerSW({
  immediate: true,
  // Installée, l'appli est souvent reprise depuis l'arrière-plan sans être rechargée : le navigateur ne cherche
  // alors pas de nouvelle version. On le lui demande à chaque retour au premier plan.
  onRegisteredSW(_url, reg) {
    if (!reg) return;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && navigator.onLine) reg.update().catch(() => {});
    });
  },
  onOfflineReady() {
    state.OFFLINE_READY = true;
  },
});
if (navigator.serviceWorker?.controller) state.OFFLINE_READY = true;
// Caches de l'ancien service worker manuel (souffleur-v3 : ~8 Mo d'audio en base64, polices Google).
if ('caches' in window)
  caches
    .keys()
    .then((ks) => {
      for (const k of ks) if (k.startsWith('souffleur-')) caches.delete(k);
    })
    .catch(() => {});
render();
