import { blockLines, LINES, MASKS, TOL } from '../data/scene';
import { playClip, playFrosineLine, playModelH, prefetch, stopClip, wait } from '../device/audio';
import { listen } from '../device/listen';
import { canVoice, checkMode, TTS } from '../device/platform';
import { releaseMic, startRecorder, stopRecorder } from '../device/recorder';
import { compare } from '../domain/compare';
import { state } from '../state';
import { isMissed, recUrl, save, settings, stats, today } from '../storage/settings';
import { BANKS, type Line } from '../types';
import { render, renderDock, renderScript } from '../ui/render';

// Segment de la réplique de Frosine en cours de lecture, surligné à l'écran.
function markSeg(k: number) {
  state.seg = k;
  renderScript();
}

/* ---------- écran allumé ---------- */
let WL: WakeLockSentinel | null = null;
async function lockOn() {
  try {
    if ('wakeLock' in navigator && !WL) {
      WL = await navigator.wakeLock.request('screen');
      WL.addEventListener('release', () => {
        WL = null;
      });
    }
  } catch {
    WL = null;
  }
}
export function lockOff() {
  try {
    if (WL) WL.release();
  } catch {}
  WL = null;
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && (['frosine', 'await', 'check'].includes(state.phase) || state.passage))
    lockOn();
});

/* ---------- moteur de répétition ---------- */
function shuffle<T>(a: T[]) {
  for (let k = a.length - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1));
    [a[k], a[j]] = [a[j], a[k]];
  }
  return a;
}
function buildSeq() {
  const ids = blockLines(settings.block);
  let hs = ids.filter((i) => LINES[i].w === 'H');
  if (settings.only) hs = hs.filter(isMissed);
  if (settings.order === 'hasard')
    return shuffle(hs.slice()).flatMap((i) => (i > 0 && LINES[i - 1].w === 'F' ? [i - 1, i] : [i]));
  if (!settings.only) return ids;
  const keep = new Set<number>();
  for (const i of hs) {
    keep.add(i);
    if (i > 0 && LINES[i - 1].w === 'F') keep.add(i - 1);
  }
  return ids.filter((i) => keep.has(i));
}
export function stopSpeech() {
  state.token++;
  clearTimeout(state.timerId);
  state.playingIdx = -1;
  state.seg = -1;
  state.passage = false;
  stopClip();
  if (TTS) {
    try {
      speechSynthesis.cancel();
    } catch {}
  }
  if (state.listener) {
    state.listener.abort();
    state.listener = null;
  }
  state.listening = false;
  if (state.recording) stopRecorder(false);
}
function start() {
  stopSpeech();
  state.voiceOff = false;
  state.notice = '';
  state.seq = buildSeq();
  state.tally = { ok: 0, ko: 0 };
  state.marks = {};
  state.pos = -1;
  if (!state.seq.length) {
    state.phase = 'empty';
    render();
    return;
  }
  lockOn();
  next();
}
function next() {
  stopSpeech();
  state.pos++;
  state.result = null;
  state.heard = '';
  if (state.pos >= state.seq.length) {
    state.phase = 'done';
    lockOff();
    releaseMic();
    render();
    return;
  }
  if (!WL) lockOn();
  const i = state.seq[state.pos],
    L = LINES[i];
  prefetch(state.seq.slice(state.pos, state.pos + 3), settings.fv || 'F0');
  if (L.w === 'F') {
    state.phase = 'frosine';
    render();
    if (canVoice()) {
      const tok = state.token;
      let rate = settings.rate,
        pitch = 1,
        pre = 300,
        bank = settings.fv || 'F0';
      if (settings.wild) {
        rate = settings.rate * (0.82 + Math.random() * 0.4);
        pitch = 0.96 + Math.random() * 0.1;
        pre = Math.random() * 1400;
        bank = BANKS[Math.floor(Math.random() * BANKS.length)];
      }
      wait(pre)
        .then(() => (tok === state.token ? playFrosineLine(L, i, tok, bank, rate, pitch, markSeg) : false))
        .then((ok) => {
          if (ok && tok === state.token) next();
        });
    }
  } else beginH();
}
function beginH() {
  const i = state.seq[state.pos],
    L = LINES[i];
  state.phase = 'await';
  state.curMask = settings.mask;
  state.result = null;
  state.heard = '';
  render();
  const tok = state.token,
    c = checkMode();
  if (c === 'voix')
    listen(L.t, tok, {
      onStart: renderDock,
      onHeard(text) {
        state.heard = text;
        renderScript();
      },
      onDone: (said) => evaluate(i, said),
      onUnavailable(notice) {
        state.voiceOff = true;
        state.notice = notice;
        if (tok !== state.token) return;
        render();
        if (settings.hands) handsTimer(L);
      },
    });
  else {
    if (c === 'rec')
      startRecorder(i, tok).then((r) => {
        if (r === 'started') renderDock();
        else if (r === 'denied') {
          state.notice = "Micro refusé : l'enregistrement est désactivé.";
          settings.check = 'manual';
          save();
          render();
        }
      });
    if (settings.hands) handsTimer(L);
  }
}
function handsTimer(L: Line) {
  const words = L.t.split(/\s+/).length,
    ms = 1600 + (words * 450) / Math.max(settings.rate, 0.7);
  const bar = document.querySelector<HTMLElement>('.ln.cur .timer i');
  if (bar) {
    // La barre peut être réutilisée par le rendu (Réessayer) : repartir de zéro sans transition.
    bar.style.transitionDuration = '0ms';
    bar.style.width = '0';
    void bar.offsetWidth;
    bar.style.transitionDuration = `${ms}ms`;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        bar.style.width = '100%';
      }),
    );
  }
  const tok = state.token;
  state.timerId = setTimeout(() => {
    if (tok === state.token) reveal();
  }, ms);
}
function reveal() {
  clearTimeout(state.timerId);
  const c = checkMode();
  if (state.listener) {
    state.listener.abort();
    state.listener = null;
  }
  state.listening = false;
  const wasRec = state.recording;
  if (state.recording) stopRecorder(true);
  state.phase = 'check';
  render();
  if (settings.hands) {
    const i = state.seq[state.pos],
      tok = ++state.token;
    (async () => {
      if (c === 'rec' && wasRec) {
        await state.recSaved;
        const url = await recUrl(i);
        if (url && tok === state.token) {
          await playClip(url, 1, tok);
          await wait(300);
        }
      }
      if (tok !== state.token) return;
      if (settings.tts) await playModelH(i, tok);
      else await wait(2600);
      if (tok !== state.token) return;
      await wait(500);
      if (tok === state.token) next();
    })();
  }
}
function evaluate(i: number, said: string) {
  state.result = compare(LINES[i].t, said);
  const ok = state.result.score >= TOL[settings.tol || 'normale'];
  record(ok);
  state.phase = 'check';
  render();
  if (settings.hands) {
    const tok = ++state.token;
    (async () => {
      if (ok) await wait(1300);
      else {
        await wait(400);
        if (settings.tts) await playModelH(i, tok);
        else await wait(2600);
        await wait(500);
      }
      if (tok === state.token) next();
    })();
  }
}
function record(ok: boolean) {
  const i = state.seq[state.pos];
  const st = stats[i] || { ok: 0, ko: 0, last: '' };
  const prev = state.marks[state.pos],
    tally = state.tally;
  if (prev === 'ok') {
    st.ok = Math.max(0, st.ok - 1);
    tally.ok--;
  } else if (prev === 'ko') {
    st.ko = Math.max(0, st.ko - 1);
    tally.ko--;
  } else {
    const d = today();
    settings.daily[d] = (settings.daily[d] || 0) + 1;
  }
  if (ok) {
    st.ok++;
    tally.ok++;
  } else {
    st.ko++;
    tally.ko++;
  }
  st.last = ok ? 'ok' : 'ko';
  stats[i] = st;
  state.marks[state.pos] = st.last;
  save();
}
function judge(ok: boolean) {
  record(ok);
  next();
}
function flip() {
  record(state.marks[state.pos] !== 'ok');
  render();
}
function retry() {
  stopSpeech();
  beginH();
}
function hint() {
  const order = MASKS.map((m) => m[0]);
  const k = order.indexOf(state.curMask);
  state.curMask = order[Math.min(k + 1, order.length - 1)];
  renderScript();
}
function replay() {
  let j = state.pos;
  while (j >= 0 && LINES[state.seq[j]].w !== 'F') j--;
  if (j < 0) return;
  state.pos = j - 1;
  next();
}
function goTo(p: number) {
  if (p < 0 || p >= state.seq.length) return;
  state.pos = p - 1;
  next();
}
export function stop() {
  stopSpeech();
  state.phase = 'idle';
  lockOff();
  releaseMic();
  render();
}
export const engine = { start, stop, next, reveal, hint, replay, retry, flip, judge, goTo };

/* ---------- lecture de passages (onglet Lire) ---------- */
let passageMine = false;
// from : réplique où commencer (ou reprendre) la lecture du passage.
export async function playPassage(mine: boolean, from?: number) {
  stopSpeech();
  state.passage = true;
  passageMine = mine;
  const tok = state.token;
  lockOn();
  render();
  const ids = blockLines(settings.block);
  for (let k = from === undefined ? 0 : Math.max(0, ids.indexOf(from)); k < ids.length; k++) {
    const i = ids[k];
    if (tok !== state.token) break;
    state.playingIdx = i;
    renderScript(true);
    prefetch(ids.slice(k + 1, k + 3), settings.fv || 'F0');
    const L = LINES[i];
    if (L.w === 'F') await playFrosineLine(L, i, tok, settings.fv || 'F0', settings.rate, 1, markSeg);
    else {
      const src = mine ? await recUrl(i) : null;
      if (src) await playClip(src, 1, tok);
      else await playModelH(i, tok);
    }
    if (tok !== state.token) break;
    await wait(300);
  }
  if (tok === state.token) {
    state.passage = false;
    state.playingIdx = -1;
    lockOff();
    render();
  }
}
export async function playLine(i: number) {
  if (state.passage) {
    playPassage(passageMine, i);
    return;
  }
  const was = state.playingIdx;
  stopSpeech();
  if (was === i) {
    render();
    return;
  }
  state.playingIdx = i;
  render();
  const L = LINES[i],
    tok = state.token;
  if (L.w === 'F') await playFrosineLine(L, i, tok, settings.fv || 'F0', settings.rate, 1, markSeg);
  else await playModelH(i, tok);
  if (tok === state.token) {
    state.playingIdx = -1;
    render();
  }
}
export async function playMine(i: number) {
  stopSpeech();
  const url = await recUrl(i);
  if (!url) return;
  state.playingIdx = i;
  renderScript();
  const tok = state.token;
  await playClip(url, 1, tok);
  if (tok === state.token) {
    state.playingIdx = -1;
    renderScript();
  }
}
