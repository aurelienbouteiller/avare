import { LINES } from '../data/scene';
import { state } from '../state';
import { settings } from '../storage/settings';
import type { Line } from '../types';
import { hasClip, TTS, useRec } from './platform';

/* ---------- voix du téléphone ---------- */
let VOICES: SpeechSynthesisVoice[] = [];
export function loadVoices(onChange: () => void) {
  if (!TTS) return;
  VOICES = speechSynthesis.getVoices().filter((v) => (v.lang || '').toLowerCase().replace('_', '-').startsWith('fr'));
  onChange();
}
export function hasVoices() {
  return VOICES.length > 0;
}
function voiceScore(v: SpeechSynthesisVoice) {
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
  return VOICES.find((v) => v.voiceURI === settings.voice) || sortedVoices()[0];
}
function chunk(t: string) {
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
function sayOne(text: string, rate: number, pitch: number) {
  return new Promise<void>((res) => {
    let done = false,
      tm: ReturnType<typeof setTimeout> | undefined;
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
export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export async function say(text: string, rate: number, pitch: number, tok: number) {
  const cs = chunk(text);
  for (let k = 0; k < cs.length; k++) {
    if (tok !== state.token) return false;
    await sayOne(cs[k].t, rate, pitch);
    if (k < cs.length - 1) await wait(cs[k].pause / Math.max(rate, 0.6));
  }
  return tok === state.token;
}

/* ---------- voix enregistrées (public/audio/<voix>/L<ligne>_S<segment>.mp3) ---------- */
// Chaque clip est chargé une fois en Blob : lecture immédiate, et pas de requêtes Range
// (mal gérées par Safari iOS quand la réponse vient du service worker).
const BLOBS = new Map<string, Promise<string | null>>();
function loadClip(bank: string, id: string): Promise<string | null> {
  if (!hasClip(bank, id)) return Promise.resolve(null);
  const key = `${bank}/${id}`;
  if (!BLOBS.has(key)) {
    const p = fetch(`${import.meta.env.BASE_URL}audio/${key}.mp3`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.blob();
      })
      .then((b) => URL.createObjectURL(b))
      .catch(() => {
        BLOBS.delete(key);
        return null;
      });
    BLOBS.set(key, p);
  }
  return BLOBS.get(key) ?? Promise.resolve(null);
}
function frosineClip(bank: string, id: string) {
  return loadClip(hasClip(bank, id) ? bank : 'F0', id);
}
export function frosineTestClip() {
  return useRec() ? frosineClip(settings.fv || 'F0', 'L1_S0') : Promise.resolve(null);
}
// Précharge les clips des prochaines répliques pendant que la réplique courante est jouée.
export function prefetch(idxs: number[], bank: string) {
  if (!useRec()) return;
  for (const i of idxs) {
    const L = LINES[i];
    if (!L) continue;
    if (L.w === 'H') loadClip('H0', `L${i}_S0`);
    else
      for (const [k, s] of (L.segs ?? []).entries()) {
        if (s.d === undefined) frosineClip(bank, `L${i}_S${k}`);
      }
  }
}

// Préfixes encore utilisés par d'anciens Firefox et Safari.
const PLAYER: HTMLAudioElement & { mozPreservesPitch?: boolean; webkitPreservesPitch?: boolean } = new Audio();
PLAYER.preload = 'auto';
export function playClip(src: string, rate: number, tok: number) {
  return new Promise<boolean>((res) => {
    if (tok !== state.token) {
      res(false);
      return;
    }
    let done = false,
      tm: ReturnType<typeof setTimeout> | undefined;
    const fin = (ok: boolean) => {
      if (done) return;
      done = true;
      clearTimeout(tm);
      PLAYER.onended = PLAYER.onerror = null;
      res(ok && tok === state.token);
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
    PLAYER.play().catch(() => fin(true));
  });
}
export function stopClip() {
  try {
    PLAYER.pause();
    PLAYER.onended = PLAYER.onerror = null;
  } catch {}
}
export async function playModelH(i: number, tok: number) {
  const hs = useRec() ? await loadClip('H0', `L${i}_S0`) : null;
  if (hs) return playClip(hs, settings.rate, tok);
  if (TTS) return say(LINES[i].t, 0.95 * settings.rate, 0.9, tok);
  await wait(2000);
  return tok === state.token;
}
// onSeg : appelé avec l'indice du segment en cours, puis -1 à la fin de la réplique.
export async function playFrosineLine(
  L: Line,
  i: number,
  tok: number,
  bank: string,
  rate: number,
  pitch: number,
  onSeg: (k: number) => void,
) {
  const segs = L.segs ?? [];
  for (const [k, s] of segs.entries()) {
    if (tok !== state.token) return false;
    onSeg(k);
    if (s.d !== undefined) {
      await wait(1700 / Math.max(rate, 0.6));
      continue;
    }
    const src = useRec() ? await frosineClip(bank, `L${i}_S${k}`) : null;
    const ok = src
      ? await playClip(src, rate, tok)
      : TTS
        ? await say(s.t, rate, pitch, tok)
        : await wait(1500).then(() => tok === state.token);
    if (!ok) return false;
    if (src) await wait(120);
  }
  onSeg(-1);
  return tok === state.token;
}
