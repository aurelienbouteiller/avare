/* ---------- lecture de passages et de répliques (onglet Lire) ---------- */

import { blockLines } from '../data/scene';
import { prefetch } from '../device/clips';
import { playClip } from '../device/player';
import { playFrosineLine, playHarpagonModel } from '../device/speak';
import { wait } from '../device/timing';
import { keepScreenOn, releaseScreen } from '../device/wake-lock';
import { isHarpagon } from '../domain/lines';
import { state } from '../state';
import { recordingUrl } from '../storage/recordings';
import { frosineBank, settings } from '../storage/settings';
import { render, renderScript } from '../ui/render';
import { interrupt, markSegment, steadyVoice } from './sound';

const BETWEEN_LINES_MS = 300;

// Passage lu avec mes enregistrements (« Ma voix ») plutôt qu'avec le modèle.
let withMyVoice = false;

/** Dit la réplique i ; mine : ma prise pour les répliques d'Harpagon, s'il y en a une. */
async function playLineOnce(i: number, token: number, mine: boolean) {
  if (!isHarpagon(i)) return playFrosineLine(i, steadyVoice(), token, markSegment);
  const take = mine ? await recordingUrl(i) : null;
  return take ? playClip(take, 1, token) : playHarpagonModel(i, token);
}

/** Lit le passage du bloc courant ; from : réplique où commencer (ou reprendre). */
export async function playPassage(mine: boolean, from?: number) {
  interrupt();
  state.passage = true;
  withMyVoice = mine;
  const token = state.token;
  keepScreenOn();
  render();
  const ids = blockLines(settings.block);
  for (let k = from === undefined ? 0 : Math.max(0, ids.indexOf(from)); k < ids.length; k++) {
    if (token !== state.token) return;
    state.playingIdx = ids[k];
    renderScript(true);
    prefetch(ids.slice(k + 1, k + 3), frosineBank());
    await playLineOnce(ids[k], token, mine);
    if (token !== state.token) return;
    await wait(BETWEEN_LINES_MS);
  }
  if (token !== state.token) return;
  state.passage = false;
  state.playingIdx = -1;
  releaseScreen();
  render();
}

/** Touche sur une réplique : pendant un passage, il reprend là ; sinon la réplique est dite (ou arrêtée). */
export async function playLine(i: number) {
  if (state.passage) {
    playPassage(withMyVoice, i);
    return;
  }
  const wasPlaying = state.playingIdx === i;
  interrupt();
  if (wasPlaying) {
    render();
    return;
  }
  state.playingIdx = i;
  render();
  const token = state.token;
  await playLineOnce(i, token, false);
  if (token !== state.token) return;
  state.playingIdx = -1;
  render();
}

/** Ma prise de la réplique i. */
export async function playMyTake(i: number) {
  interrupt();
  const url = await recordingUrl(i);
  if (!url) return;
  state.playingIdx = i;
  renderScript();
  const token = state.token;
  await playClip(url, 1, token);
  if (token !== state.token) return;
  state.playingIdx = -1;
  renderScript();
}

/** Arrête la lecture du passage. */
export function stopPassage() {
  interrupt();
  releaseScreen();
  render();
}

/** Le modèle dit la réplique i d'Harpagon. */
export function playModel(i: number) {
  interrupt();
  playHarpagonModel(i, state.token);
}
