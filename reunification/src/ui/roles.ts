/* ---------- écran Rôles : texte de la pièce (import) et ma distribution, scène par scène ---------- */
import { html, nothing } from 'lit';
import { displayName } from '../domain/lines';
import { parsePlay } from '../domain/parse';
import { state } from '../state';
import { isDemo, myLineIds, myScenes, play, plays } from '../storage/play';
import { settings } from '../storage/settings';
import type { Play, Scene } from '../types';
import { Component } from './component';
import { IC } from './icons';
import { plural } from './parts';
import { BTN_L, BTN_S, BTN_S_KO, CARD, CARD_LABEL, CARD_TEXT, CARD_TITLE, MUTED, STACK } from './styles';

const BTN_ROW = 'mt-3 flex flex-wrap gap-2';

const FORMAT_EXAMPLE = `# Titre de la scène

(Didascalie, seule sur sa ligne.)

LA FEMME. Première réplique.
Elle peut tenir sur plusieurs lignes.
LE MARI (à voix basse). Réponse.
LA FEMME
Le nom peut aussi être seul sur sa ligne.`;

const countChars = (p: Play) => new Set(p.lines.map((l) => l.w).filter(Boolean)).size;
const summary = (p: Play) =>
  `${plural(p.scenes.length, 'scène')} · ${plural(p.lines.filter((l) => l.w).length, 'réplique')} · ${plural(countChars(p), 'personnage')}`;

/* ---------- le texte ---------- */
const formatHelp = () =>
  html`<details class="mt-3 text-sm"><summary class="cursor-pointer py-1 font-semibold">Format attendu</summary>
    <p class="${CARD_TEXT} ${MUTED}">Du texte brut, copié depuis ton édition numérique ou retapé. Chaque scène commence par <b>#</b> suivi de son titre (ou par « Scène 3 »). Chaque réplique commence par le nom du personnage <b>en capitales</b>, suivi d'un point, de deux-points ou d'un tiret, ou seul sur sa ligne. Une ligne entre parenthèses ou crochets est une didascalie.</p>
    <pre class="mt-2 overflow-x-auto rounded-xl border border-line bg-bg p-3 font-mono text-xs leading-normal whitespace-pre text-ink">${FORMAT_EXAMPLE}</pre>
    <p class="${CARD_TEXT} ${MUTED}">Vérifie l'aperçu avant de valider : chaque scène doit avoir les bons personnages.</p></details>`;

function preview(p: Play) {
  if (!p.lines.some((l) => l.w))
    return html`<p class="${CARD_TEXT} text-sm text-ko">Aucune réplique reconnue : vérifie que les noms des personnages sont en capitales.</p>`;
  const row = (s: Scene) =>
    html`<li class="border-b border-line py-1.5 last:border-b-0"><b>${s.n}. ${s.title}</b><br><span class="text-muted">${s.chars.map(displayName).join(', ')}</span></li>`;
  return html`<p class="${CARD_TEXT} text-sm font-semibold">${summary(p)}</p>
    <ul class="preview mt-1 mb-0 max-h-64 list-none overflow-y-auto rounded-xl border border-line bg-bg px-3 py-1 text-sm">${p.scenes.map(row)}</ul>`;
}

function importer(draft: string) {
  const p = parsePlay(draft);
  return html`<textarea id="draft" class="mt-3 block min-h-40 w-full rounded-xl border border-line bg-bg p-3 font-mono text-xs leading-normal text-ink" placeholder="Colle ici le texte de la pièce…" .value=${draft}></textarea>
    ${draft.trim() ? preview(p) : nothing}
    <div class=${BTN_ROW}><button class="${BTN_S} flex-auto" data-act="text-cancel">Annuler</button><button class="${BTN_S} flex-auto border-me text-me" data-act="text-use" ?disabled=${!p.lines.some((l) => l.w)}>${IC.check}Utiliser ce texte</button></div>
    ${formatHelp()}`;
}

function textCard() {
  const p = play.value;
  const status = isDemo.value
    ? html`<p class=${CARD_TEXT}>Un <b>texte d'exemple</b> est chargé pour essayer l'appli. Importe le texte de la pièce depuis ton édition : il reste sur ton téléphone et n'est envoyé nulle part.</p>`
    : html`<p class=${CARD_TEXT}>Texte importé : ${summary(p)}.</p>`;
  const buttons = html`<div class=${BTN_ROW}>
      <label class="${BTN_S} flex-auto cursor-pointer">${IC.file}Ouvrir un fichier<input id="fileText" type="file" accept=".txt,.md,text/plain" class="sr-only"></label>
      <button class="${BTN_S} flex-auto" data-act="text-paste">Coller le texte</button>
      ${isDemo.value ? nothing : html`<button class="${BTN_S_KO} flex-auto" data-act="text-reset">Revenir à l'exemple</button>`}</div>`;
  return html`<section class="${CARD} text-card"><h3 class=${CARD_LABEL}>Le texte</h3>${status}${state.draft === null ? html`${buttons}${formatHelp()}` : importer(state.draft)}</section>`;
}

/* ---------- ma distribution ---------- */
function roleChip(s: Scene, who: string) {
  const n = play.value.lines.filter((l) => l.b === s.n && l.w === who).length;
  const on = plays(s, who);
  return html`<button class="inline-flex items-center gap-1.5 rounded-full border border-line bg-bg px-3 py-1.5 text-sm font-semibold aria-pressed:border-me aria-pressed:bg-me-soft aria-pressed:text-me [&_.ic]:size-[0.9em]" data-role="${s.n}" data-who=${who} aria-pressed=${on}>${on ? IC.check : nothing}${displayName(who)}<span class="font-normal text-muted">${n}</span></button>`;
}

function sceneRow(s: Scene) {
  return html`<div class="scene-row border-t border-line py-3 first-of-type:border-t-0 first-of-type:pt-1"><p class="mt-0 mb-2 font-serif text-base font-semibold">${s.n}. ${s.title}</p><div class="flex flex-wrap gap-2">${s.chars.map((c) => roleChip(s, c))}</div></div>`;
}

function castCard() {
  const scenes = myScenes(),
    count = myLineIds(0).length;
  const status = scenes.length
    ? `Tu joues dans ${plural(scenes.length, 'scène')} : ${plural(count, 'réplique')} à apprendre.`
    : "Touche les personnages que tu joues, scène par scène. Un même nom peut être joué par d'autres ailleurs : choisis-le seulement là où c'est toi.";
  const clear = settings.roles.length
    ? html`<button class="${BTN_S_KO} mt-3 w-full" data-act="roles-clear">Effacer ma distribution</button>`
    : nothing;
  return html`<section class="${CARD} cast-card"><h3 class=${CARD_LABEL}>Ma distribution</h3><p class="${CARD_TEXT} ${MUTED}">${status}</p>${play.value.scenes.map(sceneRow)}${clear}</section>`;
}

const startCard = () =>
  myScenes().length
    ? html`<button class=${BTN_L} data-act="to-repeter">${IC.mask}Répéter mes scènes</button>`
    : nothing;

export class Roles extends Component {
  protected override render() {
    return html`<div class=${STACK}>
      <div class="px-1"><h2 class=${CARD_TITLE}>Rôles</h2><p class="m-0 ${MUTED}">Le texte de la pièce et les personnages que tu joues.</p></div>
      ${textCard()}${castCard()}${startCard()}</div>`;
  }
}
customElements.define('sf-roles', Roles);

declare global {
  interface HTMLElementTagNameMap {
    'sf-roles': Roles;
  }
}
