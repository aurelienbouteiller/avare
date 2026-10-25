/* ---------- écran Aujourd'hui : compte à rebours, séance proposée, maîtrise par scène, régularité ---------- */
import { html, nothing } from 'lit';
import { daysUntil, fmtDate, today } from '../domain/dates';
import { mastery } from '../domain/stats';
import type { SceneProgress } from '../domain/suggest';
import { state } from '../state';
import { isDemo, myLineIds, myScenes, progress, todaySuggestion } from '../storage/play';
import { settings, stats } from '../storage/settings';
import { Component } from './component';
import { IC } from './icons';
import { capitalize, masterySummary, percent, plural } from './parts';
import { BTN_L, BTN_S, CARD, CARD_FLUSH, CARD_LABEL, CARD_TEXT, CARD_TITLE, KICKER, MUTED, STACK } from './styles';

const STANDALONE = matchMedia('(display-mode: standalone)').matches;
const BTN_ROW = 'mt-2.5 flex flex-wrap gap-2';
// Jours montrés dans la frise de régularité.
const STREAK_DAYS = 14;

/* ---------- compte à rebours ---------- */
function countdown() {
  if (!settings.showDate) return nothing;
  const j = daysUntil(settings.showDate);
  if (j < 0) return nothing;
  const big = (t: string) => html`<span class="jj font-serif text-3xl leading-none font-semibold">${t}</span>`;
  const small = (t: unknown) => html`<span class="text-right text-sm leading-tight opacity-90">${t}</span>`;
  const body =
    j === 0
      ? html`${big('Jour J')}${small(html`C'est ce soir.<br>Bonne représentation !`)}`
      : html`${big(`J-${j}`)}${small(html`avant la représentation<br>${fmtDate(settings.showDate)}`)}`;
  return html`<div class="flex items-center justify-between gap-4 bg-curtain bg-[repeating-linear-gradient(90deg,rgba(0,0,0,0.12)_0_10px,rgba(255,255,255,0)_10px_26px)] px-4.5 py-3.5 text-on-curtain">${body}</div>`;
}

/* ---------- séance proposée ---------- */
function hero() {
  const s = todaySuggestion();
  const td = today();
  if (!s) return nothing;
  const [first, ...rest] = s.go;
  return html`<section class="${CARD_FLUSH} hero">${countdown()}
      <div class="px-4.5 pt-4 pb-4.5">
        <p class=${KICKER}>${capitalize(fmtDate(td))} · séance proposée</p>
        <h2 class=${CARD_TITLE}>${s.title}</h2><p class=${CARD_TEXT}>${s.text}</p>
        <button class="${BTN_L} mt-3.5" data-go="0">${IC.play}${first.l}</button>
        ${rest.length ? html`<div class=${BTN_ROW}>${rest.map((g, k) => html`<button class="${BTN_S} flex-auto" data-go=${k + 1}>${g.l}</button>`)}</div>` : nothing}
        <p class="mt-3.5 mb-0 border-t border-line pt-3 text-sm text-muted">${plural(settings.daily[td] || 0, 'réplique')} travaillée${(settings.daily[td] || 0) > 1 ? 's' : ''} aujourd'hui</p>
      </div></section>`;
}

/** Premiers pas : pas encore de rôle choisi. */
const welcome = () =>
  html`<section class="${CARD_FLUSH} hero">${countdown()}<div class="px-4.5 pt-4 pb-4.5">
      <p class=${KICKER}>Pour commencer</p>
      <h2 class=${CARD_TITLE}>Bienvenue dans la troupe</h2>
      <p class=${CARD_TEXT}>${isDemo.value ? html`Importe le texte de la pièce, puis choisis` : 'Choisis'} les personnages que tu joues, scène par scène : les partenaires te donneront la réplique.</p>
      <button class="${BTN_L} mt-3.5" data-act="to-roles">${IC.users}${isDemo.value ? 'Importer le texte' : 'Choisir mes rôles'}</button>
      ${isDemo.value ? html`<p class="mt-3 mb-0 ${MUTED}">Un texte d'exemple est chargé : tu peux essayer l'appli tout de suite en y choisissant un rôle.</p>` : nothing}
    </div></section>`;

/* ---------- maîtrise par scène ---------- */
function masteryTile(p: SceneProgress) {
  const ok = percent(p.m.ok, p.m.n),
    ko = percent(p.m.ko, p.m.n);
  // Anneau : juste puis à revoir, en part du cercle.
  const ring = `background:conic-gradient(var(--ok) ${ok}%, var(--ko) 0 ${ok + ko}%, var(--line) 0)`;
  return html`<button class="flex min-w-0 flex-col items-center gap-2 rounded-2xl border border-line bg-surface-2 px-1.5 pt-3 pb-2.5 text-center text-sm leading-tight font-semibold" data-act="go-block" data-b=${p.n} aria-label="${p.title} : ${p.m.ok} justes, ${p.m.ko} à revoir sur ${p.m.n}. Répéter cette scène.">
      <span class="relative grid size-13 place-items-center rounded-full before:absolute before:inset-1.5 before:rounded-full before:bg-surface-2 before:content-['']" style=${ring}><b class="relative text-sm">${ok}%</b></span><span class="line-clamp-2 max-w-full break-words">${p.title}</span></button>`;
}

function masteryCard() {
  const all = progress();
  if (!all.length) return nothing;
  const total = mastery(myLineIds(0), stats.value);
  return html`<section class=${CARD}><h3 class=${CARD_LABEL}>Maîtrise par scène</h3><div class="grid grid-cols-3 gap-2">${all.map(masteryTile)}</div><p class="${CARD_TEXT} ${MUTED}">Toutes mes scènes : ${masterySummary(total)}. Touche une scène pour la répéter.</p></section>`;
}

/* ---------- régularité ---------- */
function streakCard() {
  if (!myScenes().length) return nothing;
  const days = Array.from({ length: STREAK_DAYS }, (_, k) => {
    const d = new Date();
    d.setDate(d.getDate() - (STREAK_DAYS - 1 - k));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { key, n: settings.daily[key] || 0 };
  });
  const max = Math.max(1, ...days.map((d) => d.n));
  const worked = days.filter((d) => d.n).length;
  const bar = (d: { key: string; n: number }) =>
    html`<div class="flex flex-1 flex-col items-center gap-1" title="${fmtDate(d.key, { weekday: 'long', day: 'numeric' })} : ${plural(d.n, 'réplique')}"><span class="flex h-12 w-full items-end"><i class="block w-full rounded-sm ${d.n ? 'bg-me' : 'bg-line'}" style="height:${d.n ? Math.max(12, (100 * d.n) / max) : 8}%"></i></span><span class="text-xs text-muted">${fmtDate(d.key, { weekday: 'narrow' })}</span></div>`;
  return html`<section class="${CARD} streak"><h3 class=${CARD_LABEL}>Régularité</h3><div class="flex gap-1">${days.map(bar)}</div><p class="${CARD_TEXT} ${MUTED}">${worked ? `Tu as répété ${plural(worked, 'jour')} sur les ${STREAK_DAYS} derniers.` : 'Un peu chaque jour vaut mieux que beaucoup la veille.'}</p></section>`;
}

const installCard = () =>
  state.installPrompt && !STANDALONE
    ? html`<div class="${CARD} flex items-center gap-3"><p class="m-0 flex-1 text-sm">Installe le souffleur comme une appli : il marchera même sans réseau.</p><button class=${BTN_S} data-act="install">${IC.download}Installer</button></div>`
    : nothing;

export class Jour extends Component {
  protected override render() {
    return html`<div class=${STACK}>
      ${myScenes().length ? hero() : welcome()}
      ${masteryCard()}${streakCard()}
      ${installCard()}
    </div>`;
  }
}
customElements.define('sf-jour', Jour);

declare global {
  interface HTMLElementTagNameMap {
    'sf-jour': Jour;
  }
}
