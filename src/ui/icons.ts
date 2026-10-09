/* ---------- icônes SVG intégrées (hors ligne, couleur héritée) ---------- */
import { html, type SVGTemplateResult, svg } from 'lit-html';

const icon = (d: SVGTemplateResult, fill?: boolean) =>
  html`<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill=${fill ? 'currentColor' : 'none'} stroke=${fill ? 'none' : 'currentColor'} stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

export const IC = {
  gear: icon(
    svg`<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>`,
  ),
  play: icon(svg`<path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/>`, true),
  stop: icon(svg`<rect x="5" y="5" width="14" height="14" rx="2.5"/>`, true),
  replay: icon(svg`<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>`),
  hint: icon(
    svg`<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>`,
  ),
  eye: icon(svg`<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>`),
  check: icon(svg`<path d="M4 12.5l5 5L20 6.5"/>`),
  cross: icon(svg`<path d="M6 6l12 12M18 6L6 18"/>`),
  close: icon(svg`<path d="M6 6l12 12M18 6L6 18"/>`),
  mic: icon(svg`<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v4"/>`),
  sun: icon(
    svg`<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>`,
  ),
  book: icon(
    svg`<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 21.5A2.5 2.5 0 0 1 6.5 19H20v3H6.5"/>`,
  ),
  mask: icon(
    svg`<path d="M3 5c3 1.3 6 1.3 9 0 3 1.3 6 1.3 9 0v6c0 5-4 9-9 9s-9-4-9-9z"/><path d="M8 10.5c.8-.6 1.7-.6 2.5 0M13.5 10.5c.8-.6 1.7-.6 2.5 0"/><path d="M9 15c1.8 1.5 4.2 1.5 6 0"/>`,
  ),
  arrow: icon(svg`<path d="M5 12h14M13 6l6 6-6 6"/>`),
  download: icon(svg`<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>`),
};
// Égaliseur animé, pour la réplique en cours de lecture.
export const EQ = html`<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>`;
