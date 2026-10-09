/* ---------- dock d'actions : message d'état et boutons, selon l'écran et la phase ---------- */
import { html, render as litRender, nothing, type TemplateResult } from 'lit-html';
import { blockLines } from '../data/scene';
import { canVoice } from '../device/platform';
import { isHarpagon } from '../domain/lines';
import { state } from '../state';
import { recorded } from '../storage/recordings';
import { isMissed, settings } from '../storage/settings';
import { $ } from './dom';
import { IC } from './icons';
import { plural, type View } from './parts';

type Status = View | string;
type Dock = [status: Status, buttons: View];

const side = (act: string, icon: TemplateResult, label: string) =>
  html`<button class="btn side" data-act=${act}>${icon}<span>${label}</span></button>`;
const main = (act: string, body: unknown, cls = 'main') =>
  html`<button class="btn ${cls}" data-act=${act}>${body}</button>`;
const live = (cls: string, label: string) => html`<span class=${cls}><span class="dot"></span>${label}</span>`;

function lireDock(): Dock {
  const hasMine = blockLines(settings.block).some((i) => recorded.has(i));
  if (state.passage) {
    return [live('live', 'Lecture du passage'), html`${side('stop-all', IC.stop, 'Arrêter')}${toRepeter(hasMine)}`];
  }
  const myVoice = hasMine ? side('play-mine', IC.mic, 'Ma voix') : nothing;
  return [
    "Touche une réplique pour l'entendre.",
    html`${side('play-all', IC.play, 'Écouter')}${myVoice}${toRepeter(hasMine)}`,
  ];
}
const toRepeter = (hasMine: boolean) =>
  main('to-repeter', html`${hasMine ? 'Répéter' : 'Répéter ce passage'}${IC.arrow}`);

function idleDock(): Dock {
  const modes = [settings.hands && 'Mains libres', settings.wild && 'Partenaire imprévisible'].filter(
    (x) => x !== false,
  );
  return [html`${modes.map((x) => html`<span class="pill">${x}</span>`)}`, main('start', html`${IC.play}Commencer`)];
}

function frosineDock(): Dock {
  const voice = canVoice();
  return [
    voice ? live('live', 'Frosine parle') : 'Lis la réplique de Frosine.',
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
    html`${side('replay', IC.replay, 'Réécouter')}${side('hint', IC.hint, 'Indice')}${main('reveal', html`${IC.eye}Révéler`, 'gold')}`,
  ];
}

function checkDock(): Dock {
  const next = main('skip', html`Suivant${IC.arrow}`);
  const stopAndNext = html`${side('stop', IC.stop, 'Arrêter')}${next}`;
  // Vérifiée à la voix : le verdict est déjà donné, on peut le corriger.
  if (state.result) {
    const ok = state.marks[state.pos] === 'ok';
    const verdict = ok
      ? html`<span class="mark ok">${IC.check}Juste</span>`
      : html`<span class="mark ko">${IC.cross}À revoir</span>`;
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
  const missed = blockLines(settings.block).filter((i) => isHarpagon(i) && isMissed(i)).length;
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
    case 'frosine':
      return frosineDock();
    case 'await':
      return awaitDock();
    case 'check':
      return checkDock();
    case 'done':
      return doneDock();
  }
}

export function renderDock() {
  const jour = settings.mode === 'jour';
  document.body.classList.toggle('nodock', jour);
  $('#dock').hidden = jour;
  if (jour) return;
  const [status, buttons] = dock();
  // Un avertissement (micro refusé, réseau…) précède le message d'état.
  const hasStatus = status !== nothing && status !== '';
  litRender(state.notice ? html`${state.notice}${hasStatus ? html` ${status}` : ''}` : status, $('#status'));
  litRender(buttons, $('#row'));
}
