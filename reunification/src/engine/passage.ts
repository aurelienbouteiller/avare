/* ---------- lecture de passages et de répliques (onglet Lire) ---------- */

import { playClip } from '../device/player';
import { characterVoice, playPartnerLine, playModel as sayModel } from '../device/speak';
import { wait } from '../device/timing';
import { keepScreenOn, releaseScreen } from '../device/wake-lock';
import { isSpoken } from '../domain/lines';
import { control, state } from '../state';
import { isMine, lines, sceneLines } from '../storage/play';
import { recordingUrl } from '../storage/recordings';
import { settings } from '../storage/settings';
import { interrupt, markSegment } from './sound';

const BETWEEN_LINES_MS = 300;

// Passage lu avec mes enregistrements (« Ma voix ») plutôt qu'avec le modèle.
let withMyVoice = false;

/** Dit la réplique i, chaque personnage avec sa voix ; mine : ma prise pour mes répliques, s'il y en a une. */
async function playLineOnce(i: number, token: number, mine: boolean) {
  const line = lines()[i];
  const take = mine && isMine(i) ? await recordingUrl(line.id) : null;
  if (take) return playClip(take, 1, token);
  return playPartnerLine(i, characterVoice(line.w), token, markSegment);
}

/** Lit le passage de la scène courante ; from : réplique où commencer (ou reprendre). */
export async function playPassage(mine: boolean, from?: number) {
  interrupt();
  state.passage = true;
  withMyVoice = mine;
  const token = control.token;
  keepScreenOn();
  const ids = sceneLines(settings.block).filter((i) => isSpoken(lines()[i]));
  for (let k = from === undefined ? 0 : Math.max(0, ids.indexOf(from)); k < ids.length; k++) {
    if (token !== control.token) return;
    state.playingIdx = ids[k];
    await playLineOnce(ids[k], token, mine);
    if (token !== control.token) return;
    await wait(BETWEEN_LINES_MS);
  }
  if (token !== control.token) return;
  state.passage = false;
  state.playingIdx = -1;
  releaseScreen();
}

/** Touche sur une réplique : pendant un passage, il reprend là ; sinon la réplique est dite (ou arrêtée). */
export async function playLine(i: number) {
  if (!isSpoken(lines()[i])) return;
  if (state.passage) {
    playPassage(withMyVoice, i);
    return;
  }
  const wasPlaying = state.playingIdx === i;
  interrupt();
  if (wasPlaying) return;
  state.playingIdx = i;
  const token = control.token;
  await playLineOnce(i, token, false);
  if (token !== control.token) return;
  state.playingIdx = -1;
}

/** Ma prise de la réplique i. */
export async function playMyTake(i: number) {
  interrupt();
  const url = await recordingUrl(lines()[i].id);
  if (!url) return;
  state.playingIdx = i;
  const token = control.token;
  await playClip(url, 1, token);
  if (token !== control.token) return;
  state.playingIdx = -1;
}

/** Arrête la lecture du passage. */
export function stopPassage() {
  interrupt();
  releaseScreen();
}

/** Le modèle dit ma réplique i. */
export function playModel(i: number) {
  interrupt();
  sayModel(i, control.token);
}
