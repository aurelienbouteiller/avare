import CLIPS from './data/clips.json';
import { LINES } from './data/scene.js';
import { markSeg } from './render.js';
import { state } from './state.js';
import { S } from './store.js';

/* ---------- voix du téléphone ---------- */
export const TTS = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
let VOICES = [];
export function loadVoices(onChange) {
  if (!TTS) return;
  VOICES = speechSynthesis.getVoices().filter((v) => (v.lang || '').toLowerCase().replace('_', '-').startsWith('fr'));
  onChange();
}
export function hasVoices() {
  return VOICES.length > 0;
}
function voiceScore(v) {
  const n = (v.name || '').toLowerCase();
  let s = 0;
  if (/fr[-_]fr/i.test(v.lang)) s += 20;
  if (/natural|neural|online|wavenet|premium|enhanced|amélioré|haute qualité|network|réseau/.test(n)) s += 40;
  if (/google/.test(n)) s += 25;
  if (v.localService === false) s += 10;
  if (/compact|espeak|robot/.test(n)) s -= 40;
  return s;
}
export function sortedVoices() {
  return VOICES.slice().sort((a, b) => voiceScore(b) - voiceScore(a));
}
export function pickVoice() {
  if (!VOICES.length) return null;
  return VOICES.find((v) => v.voiceURI === S.voice) || sortedVoices()[0];
}
function chunk(t) {
  return t
    .split(/(?<=[.!?…;:])\s+/)
    .filter(Boolean)
    .map((p) => {
      const end = p.trim().slice(-1);
      let pause = end === '!' || end === '?' ? 380 : end === '.' || end === '…' ? 330 : 200;
      if (/\.\.\.$/.test(p)) pause = 150;
      return { t: p, pause };
    });
}
function sayOne(text, rate, pitch) {
  return new Promise((res) => {
    let done = false,
      tm = null;
    const fin = () => {
      if (done) return;
      done = true;
      clearTimeout(tm);
      res();
    };
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'fr-FR';
      const v = pickVoice();
      if (v) u.voice = v;
      u.rate = rate;
      u.pitch = pitch;
      u.onend = fin;
      u.onerror = fin;
      tm = setTimeout(fin, (text.length * 95) / rate + 2500);
      speechSynthesis.speak(u);
    } catch {
      fin();
    }
  });
}
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export async function say(text, rate, pitch, tok) {
  const cs = chunk(text);
  for (let k = 0; k < cs.length; k++) {
    if (tok !== state.RUN) return false;
    await sayOne(cs[k].t, rate, pitch);
    if (k < cs.length - 1) await wait(cs[k].pause / Math.max(rate, 0.6));
  }
  return tok === state.RUN;
}

/* ---------- voix enregistrées (public/audio/<voix>/L<ligne>_S<segment>.mp3) ---------- */
const HAS = Object.fromEntries(Object.entries(CLIPS).map(([b, ids]) => [b, new Set(ids)]));
export const REC = !!(HAS.F0 && HAS.F0.size > 0);
export const useRec = () => REC && S.src === 'rec';
export const canVoice = () => S.tts && (useRec() || TTS);
function hasClip(bank, id) {
  return !!HAS[bank]?.has(id);
}
// Chaque clip est chargé une fois en Blob : lecture immédiate, et pas de requêtes Range
// (mal gérées par Safari iOS quand la réponse vient du service worker).
const BLOBS = new Map();
function loadClip(bank, id) {
  if (!hasClip(bank, id)) return Promise.resolve(null);
  const key = `${bank}/${id}`;
  if (!BLOBS.has(key)) {
    const p = fetch(`${import.meta.env.BASE_URL}audio/${key}.mp3`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status);
        return r.blob();
      })
      .then((b) => URL.createObjectURL(b))
      .catch(() => {
        BLOBS.delete(key);
        return null;
      });
    BLOBS.set(key, p);
  }
  return BLOBS.get(key);
}
function frosineClip(bank, id) {
  return loadClip(hasClip(bank, id) ? bank : 'F0', id);
}
export function frosineTestClip() {
  return useRec() ? frosineClip(S.fv || 'F0', 'L1_S0') : Promise.resolve(null);
}
// Précharge les clips des prochaines répliques pendant que la réplique courante est jouée.
export function prefetch(idxs, bank) {
  if (!useRec()) return;
  idxs.forEach((i) => {
    const L = LINES[i];
    if (!L) return;
    if (L.w === 'H') loadClip('H0', `L${i}_S0`);
    else
      L.segs.forEach((s, k) => {
        if (!s.d) frosineClip(bank, `L${i}_S${k}`);
      });
  });
}

const PLAYER = new Audio();
PLAYER.preload = 'auto';
export function playClip(src, rate, tok) {
  return new Promise((res) => {
    if (tok !== state.RUN) {
      res(false);
      return;
    }
    let done = false,
      tm = null;
    const fin = (ok) => {
      if (done) return;
      done = true;
      clearTimeout(tm);
      PLAYER.onended = PLAYER.onerror = null;
      res(ok && tok === state.RUN);
    };
    PLAYER.onended = () => fin(true);
    PLAYER.onerror = () => fin(true);
    PLAYER.src = src;
    try {
      PLAYER.preservesPitch = true;
      PLAYER.mozPreservesPitch = true;
      PLAYER.webkitPreservesPitch = true;
    } catch {}
    PLAYER.playbackRate = rate;
    PLAYER.onloadedmetadata = () => {
      const d = PLAYER.duration;
      if (Number.isFinite(d)) {
        clearTimeout(tm);
        tm = setTimeout(() => fin(true), (d * 1000) / rate + 2500);
      }
    };
    tm = setTimeout(() => fin(true), 90000);
    const pr = PLAYER.play();
    if (pr?.catch) pr.catch(() => fin(true));
  });
}
export function stopClip() {
  try {
    PLAYER.pause();
    PLAYER.onended = PLAYER.onerror = null;
  } catch {}
}
export async function playModelH(i, tok) {
  const hs = useRec() ? await loadClip('H0', `L${i}_S0`) : null;
  if (hs) return playClip(hs, S.rate, tok);
  if (TTS) return say(LINES[i].t, 0.95 * S.rate, 0.9, tok);
  await wait(2000);
  return tok === state.RUN;
}
export async function playFrosineLine(L, i, tok, bank, rate, pitch) {
  for (let k = 0; k < L.segs.length; k++) {
    if (tok !== state.RUN) return false;
    markSeg(k);
    const s = L.segs[k];
    if (s.d) {
      await wait(1700 / Math.max(rate, 0.6));
      continue;
    }
    const src = useRec() ? await frosineClip(bank, `L${i}_S${k}`) : null;
    const ok = src
      ? await playClip(src, rate, tok)
      : TTS
        ? await say(s.t, rate, pitch, tok)
        : await wait(1500).then(() => tok === state.RUN);
    if (!ok) return false;
    if (src) await wait(120);
  }
  markSeg(-1);
  return tok === state.RUN;
}
