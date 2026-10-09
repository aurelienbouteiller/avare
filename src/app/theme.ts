/* ---------- thème : sombre, clair ou celui du système ---------- */
import { watch } from '../reactive';
import { settings } from '../storage/settings';

const DARK_BG = '#140B0F';
const LIGHT_BG = '#F7F1E6';
const systemDark = matchMedia('(prefers-color-scheme: dark)');

function applyTheme() {
  const t = settings.theme || 'sombre',
    root = document.documentElement;
  if (t === 'auto') delete root.dataset.theme;
  else root.dataset.theme = t === 'clair' ? 'light' : 'dark';
  const dark = t === 'sombre' || (t === 'auto' && systemDark.matches);
  const meta = document.querySelector<HTMLMetaElement>('meta[name=theme-color]');
  if (meta) meta.content = dark ? DARK_BG : LIGHT_BG;
}

/** Applique le thème à chaque changement de réglage, et le suit quand le système change de mode. */
export function initTheme() {
  watch(applyTheme);
  systemDark.addEventListener?.('change', applyTheme);
}
