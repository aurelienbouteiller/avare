/* ---------- thème : sombre, clair ou celui du système ---------- */
import { settings } from '../storage/settings';

const DARK_BG = '#140B0F';
const LIGHT_BG = '#F7F1E6';
const systemDark = matchMedia('(prefers-color-scheme: dark)');

export function applyTheme() {
  const t = settings.theme || 'sombre',
    root = document.documentElement;
  if (t === 'auto') delete root.dataset.theme;
  else root.dataset.theme = t === 'clair' ? 'light' : 'dark';
  const dark = t === 'sombre' || (t === 'auto' && systemDark.matches);
  const meta = document.querySelector<HTMLMetaElement>('meta[name=theme-color]');
  if (meta) meta.content = dark ? DARK_BG : LIGHT_BG;
  for (const b of document.querySelectorAll<HTMLElement>('#optTheme [data-val]'))
    b.setAttribute('aria-pressed', b.dataset.val === t ? 'true' : 'false');
}

/** Applique le thème et le suit quand le système change de mode. */
export function initTheme() {
  applyTheme();
  systemDark.addEventListener?.('change', applyTheme);
}
