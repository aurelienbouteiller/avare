/* ---------- boîte de réglages : feuille qui monte du bas ---------- */
// Affichage seulement : les changements sont branchés dans app/settings-dialog (évènements délégués sur l'hôte).
import { html } from 'lit';
import { RECORDED_VOICES, TTS } from '../device/platform';
import { hasVoices, pickVoice, sortedVoices } from '../device/tts';
import { state } from '../state';
import { frosineBank, settings } from '../storage/settings';
import { Component } from './component';
import { IC } from './icons';
import { BTN_S, BTN_S_KO, ICON_BTN, SEG, SEGS, SWITCH_INPUT } from './styles';

const REPO = 'https://github.com/aurelienbouteiller/avare';

const FIELD = 'flex items-center justify-between gap-4 border-b border-line py-[0.8rem]';
const FIELD_COL = 'flex flex-col items-stretch gap-2 border-b border-line py-[0.8rem]';
const SELECT = 'max-w-48 rounded-[10px] border border-line bg-bg p-2 text-[0.92rem] text-ink';
const TIP = 'mt-[0.8rem] mb-0 text-[0.85rem] leading-normal text-muted';

const group = (title: string, content: unknown, extra = 'mt-[0.6rem]') =>
  html`<section class=${extra}><h3 class="mt-[0.8rem] mb-[0.2rem] text-[0.75rem] font-bold tracking-[0.1em] text-muted uppercase">${title}</h3>${content}</section>`;
const label = (title: string, help: unknown) =>
  html`<div>${title}<small class="mt-[0.1rem] block text-[0.8rem] leading-[1.35] text-muted">${help}</small></div>`;
// `.selected` sur chaque option : une valeur posée sur le <select> arriverait avant ses options.
const options = (list: [string, string][], value: string) =>
  list.map(([v, text]) => html`<option value=${v} .selected=${v === value}>${text}</option>`);
const toggle = (id: string, checked: boolean) =>
  html`<input type="checkbox" class=${SWITCH_INPUT} id=${id} .checked=${checked}>`;

function voiceSelect() {
  if (!TTS)
    return [
      html`<select id="optVoice" class=${SELECT} disabled><option>Indisponible</option></select>`,
      'Ce navigateur ne lit pas le texte à voix haute.',
    ];
  if (!hasVoices())
    return [
      html`<select id="optVoice" class=${SELECT}><option value="">Voix française par défaut</option></select>`,
      'Utilisée seulement en secours.',
    ];
  const chosen = pickVoice()?.voiceURI ?? '';
  const list = sortedVoices().map((v, k): [string, string] => [
    v.voiceURI,
    `${v.name}${k === 0 ? ' (recommandée)' : ''}`,
  ]);
  return [
    html`<select id="optVoice" class=${SELECT}>${options(list, chosen)}</select>`,
    'Utilisée seulement en secours, si une voix enregistrée manque.',
  ];
}

function frosineVoice() {
  const [select, info] = voiceSelect();
  return html`<div class=${FIELD} id="fieldSrc" ?hidden=${!RECORDED_VOICES}>
      ${label('Type de voix', 'Les voix enregistrées sont les plus naturelles. La voix du téléphone sert de secours.')}
      <select id="optSrc" class=${SELECT}>${options(
        [
          ['rec', 'Enregistrées'],
          ['tts', 'Du téléphone'],
        ],
        settings.src,
      )}</select>
    </div>
    <div class=${FIELD} id="fieldFv" ?hidden=${!RECORDED_VOICES || settings.src !== 'rec'}>
      ${label('Comédienne', 'En partenaire imprévisible, les quatre voix alternent au hasard.')}
      <select id="optFv" class=${SELECT}>${options(
        [
          ['F0', 'Denise'],
          ['F1', 'Vivienne'],
          ['F2', 'Charline'],
          ['F3', 'Ariane'],
        ],
        frosineBank(),
      )}</select>
    </div>
    <div class=${FIELD}>${label('Frosine parle', 'Frosine lit ses répliques à voix haute.')}${toggle('optTts', settings.tts)}</div>
    <div class=${FIELD_COL}>
      <div class="flex items-center justify-between gap-[0.6rem]">Vitesse<span class="font-bold text-harp">×${settings.rate.toFixed(2)}</span></div>
      <input type="range" id="optRate" class="m-[2px] w-full accent-accent" min="0.7" max="1.4" step="0.05" .value=${String(settings.rate)}>
    </div>
    <div class=${FIELD}>${label('Voix du téléphone', info)}${select}</div>
    <div class=${FIELD}>
      ${label('Tester la voix', 'La première réplique de Frosine.')}
      <button type="button" class=${BTN_S} id="btnTest">${IC.play}Écouter</button>
    </div>`;
}

const rehearsal = () =>
  html`<div class=${FIELD}>${label('Partenaire imprévisible', 'Débit, voix et temps de réaction changent à chaque réplique.')}${toggle('optWild', settings.wild)}</div>
    <div class=${FIELD}>${label('Mains libres', "Tout s'enchaîne sans toucher l'écran. Avec la vérification à la voix, ta réplique est jugée automatiquement.")}${toggle('optHands', settings.hands)}</div>
    <div class=${FIELD}>
      ${label('Tolérance à la voix', 'La reconnaissance vocale peut se tromper sur les mots anciens.')}
      <select id="optTol" class=${SELECT}>${options(
        [
          ['stricte', 'Stricte (95 %)'],
          ['normale', 'Normale (85 %)'],
          ['souple', 'Souple (70 %)'],
        ],
        settings.tol || 'normale',
      )}</select>
    </div>`;

function version() {
  const built = new Date(__APP_BUILD_DATE__).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const commit = __APP_COMMIT__
    ? html`<a class="text-inherit tabular-nums underline-offset-2" href="${REPO}/commit/${__APP_COMMIT__}" target="_blank" rel="noopener">${__APP_COMMIT__.slice(0, 7)}</a>`
    : 'inconnue';
  return html`Version ${commit}, construite le ${built}.`;
}

function display() {
  const theme = (v: string, text: string) =>
    html`<button type="button" class=${SEG} data-val=${v} aria-pressed=${settings.theme === v}>${text}</button>`;
  return html`<div class=${FIELD_COL}>
      <div>Thème</div>
      <div class="${SEGS} w-full" id="optTheme" role="group" aria-label="Thème">${theme('sombre', 'Sombre')}${theme('clair', 'Clair')}${theme('auto', 'Auto')}</div>
    </div>
    <p class=${TIP} id="offlineInfo">${
      state.offlineReady
        ? 'Disponible hors ligne : tout fonctionne sans réseau, sauf la vérification à la voix.'
        : 'Préparation du mode hors ligne au premier chargement.'
    }</p>
    <p class=${TIP} id="versionInfo">${version()}</p>`;
}

export class SettingsSheet extends Component {
  protected override render() {
    return html`<dialog id="dlg" aria-labelledby="dlgTitle" class="m-[auto_auto_0] max-h-[88vh] w-full max-w-[34rem] overflow-auto rounded-t-[22px] bg-surface px-[1.15rem] pt-0 pb-[calc(1.2rem+env(safe-area-inset-bottom,0px))] text-ink shadow-card backdrop:bg-[rgba(10,4,8,0.6)] open:animate-sheet min-[46rem]:m-auto min-[46rem]:rounded-[22px]">
      <div class="sticky top-0 z-1 flex items-center justify-between bg-surface pt-4 pb-[0.6rem]">
        <h2 id="dlgTitle" class="m-0 font-serif text-[1.45rem] font-semibold">Réglages</h2>
        <button type="button" class=${ICON_BTN} id="btnClose" aria-label="Fermer">${IC.close}</button>
      </div>
      ${group('Voix de Frosine', frosineVoice())}
      ${group('Répétition', rehearsal())}
      ${group('Affichage', display())}
      ${group(
        'Zone sensible',
        html`<div class="flex flex-wrap gap-2">
          <button type="button" class="${BTN_S_KO} flex-[1_1_12rem]" id="btnReset">Effacer mes résultats</button>
          <button type="button" class="${BTN_S_KO} flex-[1_1_12rem]" id="btnResetRec">Effacer mes enregistrements</button>
        </div>`,
        'mt-[1.4rem]',
      )}
    </dialog>`;
  }
}
customElements.define('sf-settings', SettingsSheet);

declare global {
  interface HTMLElementTagNameMap {
    'sf-settings': SettingsSheet;
  }
}
