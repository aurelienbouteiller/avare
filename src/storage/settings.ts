/* ---------- réglages et résultats sauvegardés (localStorage) ---------- */
import { signal } from '@preact/signals-core';
import { reactive, watch } from '../reactive';
import {
  BANKS,
  CHECKS,
  isOneOf,
  MASK_IDS,
  MODES,
  ORDERS,
  type Settings,
  SRCS,
  type Stat,
  THEMES,
  TOLS,
} from '../types';

// La clé garde son nom d'origine : le script de thème de index.html la lit aussi (champ s.theme).
const KEY = 'souffleur-harpagon-v1';
// Version du format sauvegardé. Les données sans `v` viennent d'avant son ajout et ont la même forme que v1.
const VERSION = 1;
const DEFAULTS: Settings = {
  mode: 'jour',
  block: 1,
  mask: 'coins',
  order: 'scene',
  check: 'manual',
  tol: 'normale',
  rate: 1,
  wild: false,
  hands: false,
  voice: '',
  tts: true,
  only: false,
  src: 'rec',
  fv: 'F0',
  theme: 'sombre',
  done: {},
  daily: {},
};
const defaults = (): Settings => ({ ...DEFAULTS, done: {}, daily: {} });

type Obj = Record<string, unknown>;
const isObj = (o: unknown): o is Obj => typeof o === 'object' && o !== null && !Array.isArray(o);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const isDay = (k: string) => /^\d{4}-\d{2}-\d{2}$/.test(k);

function parseSettings(v: Obj): Settings {
  const s = defaults();
  if (isOneOf(MODES, v.mode)) s.mode = v.mode;
  if (isNum(v.block)) s.block = v.block;
  if (isOneOf(MASK_IDS, v.mask)) s.mask = v.mask;
  if (isOneOf(ORDERS, v.order)) s.order = v.order;
  if (isOneOf(CHECKS, v.check)) s.check = v.check;
  if (isOneOf(TOLS, v.tol)) s.tol = v.tol;
  if (isNum(v.rate) && v.rate > 0) s.rate = v.rate;
  if (isBool(v.wild)) s.wild = v.wild;
  if (isBool(v.hands)) s.hands = v.hands;
  if (typeof v.voice === 'string') s.voice = v.voice;
  if (isBool(v.tts)) s.tts = v.tts;
  if (isBool(v.only)) s.only = v.only;
  if (isOneOf(SRCS, v.src)) s.src = v.src;
  if (isOneOf(BANKS, v.fv)) s.fv = v.fv;
  if (isOneOf(THEMES, v.theme)) s.theme = v.theme;
  if (isObj(v.done)) for (const [d, x] of Object.entries(v.done)) if (isDay(d) && x === true) s.done[d] = true;
  if (isObj(v.daily)) for (const [d, n] of Object.entries(v.daily)) if (isDay(d) && isNum(n)) s.daily[d] = n;
  return s;
}

function parseStats(o: Obj): Record<number, Stat> {
  const st: Record<number, Stat> = {};
  for (const [k, x] of Object.entries(o)) {
    const i = Number(k);
    if (!Number.isInteger(i) || i < 0 || !isObj(x)) continue;
    st[i] = {
      ok: isNum(x.ok) ? Math.max(0, x.ok) : 0,
      ko: isNum(x.ko) ? Math.max(0, x.ko) : 0,
      last: x.last === 'ok' || x.last === 'ko' ? x.last : '',
    };
  }
  return st;
}

/** Lit les données sauvegardées en ne gardant que les valeurs valides ; le reste prend sa valeur par défaut. */
export function parseSaved(raw: string | null): { s: Settings; st: Record<number, Stat> } {
  let o: unknown = null;
  try {
    o = raw ? JSON.parse(raw) : null;
  } catch {}
  if (!isObj(o)) return { s: defaults(), st: {} };
  // Point d'entrée des migrations futures : convertir ici `o` des versions antérieures vers VERSION.
  return { s: parseSettings(isObj(o.s) ? o.s : {}), st: isObj(o.st) ? parseStats(o.st) : {} };
}

function load() {
  try {
    return parseSaved(localStorage.getItem(KEY));
  } catch {
    return parseSaved(null);
  }
}

const saved = load();
/** Réglages : observés, comme l'état d'exécution. `done` et `daily` se remplacent, ils ne se modifient pas. */
export const settings: Settings = reactive(saved.s);
/** Résultats par réplique : remplacer l'objet pour signaler un changement. */
export const stats = signal<Record<number, Stat>>(saved.st);

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: VERSION, s: settings, st: stats.value }));
  } catch {}
}

/** Sauvegarde réglages et résultats à chaque changement. */
export const autoSave = () => watch(save);

export function clearStats() {
  stats.value = {};
}

export const isMissed = (i: number) => stats.value[i]?.last === 'ko';

/** Voix enregistrée choisie pour Frosine. */
export const frosineBank = () => settings.fv || 'F0';
