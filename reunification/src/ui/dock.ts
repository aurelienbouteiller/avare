/* ---------- dock d'actions : message d'état et boutons, selon l'écran et la phase ---------- */
import { html, nothing, type TemplateResult } from 'lit';
import { canVoice } from '../device/platform';
import { displayName } from '../domain/lines';
import { state } from '../state';
import { isMine, isMissed, lines, myLineIds, sceneLines } from '../storage/play';
import { recorded } from '../storage/recordings';
import { settings } from '../storage/settings';
import { Component } from './component';
import { IC } from './icons';
import { inRun, markLabel, plural, type View } from './parts';

const speakerName = (w: string) => displayName(w) || 'Le partenaire';

type Status = View | string;
type Dock = [status: Status, buttons: View];

const BTN = 'inline-flex min-h-14 items-center justify-center rounded-2xl';
const MAIN = `${BTN} flex-1 gap-2 px-4 text-base font-bold [&_.ic]:size-[1.2em]`;
const KIND = {
  main: `${MAIN} bg-accent text-on-accent`,
  ok: `${MAIN} bg-ok text-bg`,
  ko: `${MAIN} bg-ko text-bg`,
};

const side = (act: string, icon: TemplateResult, label: string) =>
  html`<button class="${BTN} min-w-18 flex-none flex-col gap-0.5 border border-line bg-surface-2 px-2.5 text-xs font-semibold [&_.ic]:size-5" data-act=${act}>${icon}<span>${label}</span></button>`;
const main = (act: string, body: unknown, kind: keyof typeof KIND = 'main') =>
  html`<button class=${KIND[kind]} data-act=${act}>${body}</button>`;
const live = (kind: 'live' | 'rec', label: string) =>
  html`<span class="inline-flex items-center rounded-full px-3 py-1 font-bold ${kind === 'rec' ? 'bg-ko-soft text-ko' : 'bg-other-soft text-other'}"><span class="mr-[0.4em] inline-block size-[0.6em] animate-blink rounded-full bg-current"></span>${label}</span>`;

const toRepeter = (hasMine: boolean) =>
  main('to-repeter', html`${hasMine ? 'Répéter' : 'Répéter ce passage'}${IC.arrow}`);

function lireDock(): Dock {
  const hasMine = myLineIds(settings.block).some((id) => recorded.value.has(id));
  if (state.passage) {
    return [live('live', 'Lecture du passage'), html`${side('stop-all', IC.stop, 'Arrêter')}${toRepeter(hasMine)}`];
  }
  const myVoice = hasMine ? side('play-mine', IC.mic, 'Ma voix') : nothing;
  return [
    "Touche une réplique pour l'entendre.",
    html`${side('play-all', IC.play, 'Écouter')}${myVoice}${toRepeter(hasMine)}`,
  ];
}

function idleDock(): Dock {
  if (!myLineIds(settings.block).length) return [nothing, main('to-roles', html`Choisir mes rôles${IC.arrow}`)];
  const modes = [settings.hands && 'Mains libres', settings.wild && 'Partenaire imprévisible'].filter(
    (x) => x !== false,
  );
  const pill = (x: string) =>
    html`<span class="inline-flex items-center rounded-full bg-me-soft px-2.5 py-0.5 text-xs font-bold text-me">${x}</span>`;
  return [html`${modes.map(pill)}`, main('start', html`${IC.play}Commencer`)];
}

function partnerDock(): Dock {
  const voice = canVoice(),
    name = lines()[state.seq[state.pos]]?.w ?? '';
  const who = speakerName(name);
  return [
    voice ? live('live', `${who} parle`) : `Lis la réplique de ${who}.`,
    html`${side('replay', IC.replay, 'Réécouter')}${main('skip', html`${voice ? 'Passer' : 'Suivant'}${IC.arrow}`)}`,
  ];
}

function awaitStatus(): Status {
  if (state.listening) return live('live', "J'écoute, dis ta réplique");
  if (state.recording) return live('rec', 'Enregistrement');
  return 'À toi. Dis ta réplique à voix haute.';
}

function awaitDock(): Dock {
  return [
    awaitStatus(),
    html`${side('replay', IC.replay, 'Réécouter')}${side('hint', IC.hint, 'Indice')}${main('reveal', html`${IC.eye}Révéler`)}`,
  ];
}

function checkDock(): Dock {
  const next = main('skip', html`Suivant${IC.arrow}`);
  const stopAndNext = html`${side('stop', IC.stop, 'Arrêter')}${next}`;
  // Vérifiée à la voix : le verdict est déjà donné, on peut le corriger.
  if (state.result) {
    const ok = state.marks[state.pos] === 'ok';
    const verdict = ok ? markLabel('ok', html`${IC.check}Juste`) : markLabel('ko', html`${IC.cross}À revoir`);
    const buttons = settings.hands
      ? stopAndNext
      : html`${side('retry', IC.replay, 'Réessayer')}${side('flip', ok ? IC.cross : IC.check, ok ? 'Compter faux' : 'Compter juste')}${next}`;
    return [html`${verdict} ${Math.round(state.result.score * 100)} % des mots retrouvés`, buttons];
  }
  if (settings.hands) return ["Vérifie à l'oreille.", stopAndNext];
  return [
    "Tu l'avais ?",
    html`${main('ko', html`${IC.cross}À revoir`, 'ko')}${main('ok', html`${IC.check}Je l'avais`, 'ok')}`,
  ];
}

function doneDock(): Dock {
  const missed = sceneLines(settings.block).filter((i) => isMine(i) && isMissed(i)).length;
  const status = missed
    ? `${plural(missed, 'réplique')} à revoir dans ce passage.`
    : 'Aucune réplique à revoir dans ce passage.';
  const onlyMissed = missed && !settings.only ? side('only-start', IC.cross, 'Les ratées') : nothing;
  const again = settings.only
    ? main('only-off-start', html`${IC.replay}Tout le passage`)
    : main('start', html`${IC.replay}Recommencer`);
  return [status, html`${onlyMissed}${again}`];
}

function dock(): Dock {
  if (settings.mode === 'lire') return lireDock();
  switch (state.phase) {
    case 'idle':
      return idleDock();
    case 'empty':
      return [nothing, main('only-off', 'Reprendre tout le passage')];
    case 'partner':
      return partnerDock();
    case 'await':
      return awaitDock();
    case 'check':
      return checkDock();
    case 'done':
      return doneDock();
  }
}

export class DockBar extends Component {
  protected override render() {
    if (settings.mode === 'jour' || settings.mode === 'roles') return html`<footer id="dock" hidden></footer>`;
    const [status, buttons] = dock();
    // Un avertissement (micro refusé, réseau…) précède le message d'état.
    const hasStatus = status !== nothing && status !== '';
    const shown = state.notice ? html`${state.notice}${hasStatus ? html` ${status}` : ''}` : status;
    // En répétition, plus d'onglets dessous : le dock descend en bas de l'écran.
    const place = inRun() ? 'bottom-0 pb-[calc(--spacing(3)+env(safe-area-inset-bottom,0px))]' : 'bottom-(--navh) pb-3';
    return html`<footer id="dock" class="fixed inset-x-0 z-6 border-t border-line bg-surface/94 px-4 pt-2.5 backdrop-blur-md ${place}">
      <div id="status" class="mx-auto mb-2 flex min-h-[1.3em] max-w-2xl flex-wrap items-center justify-center gap-1.5 text-center text-sm text-muted empty:hidden" aria-live="polite">${shown}</div>
      <div id="row" class="mx-auto flex max-w-2xl gap-2">${buttons}</div>
    </footer>`;
  }
}
customElements.define('sf-dock', DockBar);

declare global {
  interface HTMLElementTagNameMap {
    'sf-dock': DockBar;
  }
}
