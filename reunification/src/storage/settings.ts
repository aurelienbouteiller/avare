/* ---------- réglages et résultats sauvegardés (localStorage) ---------- */
import { signal } from '@preact/signals-core';
import { reactive, watch } from '../reactive';
import { CHECKS, isOneOf, MASK_IDS, MODES, ORDERS, type Settings, type Stat, THEMES, TOLS } from '../types';

// Le script de thème de index.html lit aussi cette clé (champ s.theme).
const KEY = 'reunification-v1';
// Version du format sauvegardé.
const VERSION = 1;
const DEFAULTS: Settings = {
  mode: 'jour',
  block: 0,
  mask: 'coins',
  order: 'scene',
  check: 'manual',
  tol: 'normale',
  rate: 1,
  wild: false,
  hands: false,
  voice: '',
  tts: true,
  mix: true,
  only: false,
  theme: 'sombre',
  roles: [],
  showDate: '',
  notes: {},
  daily: {},
};
const defaults = (): Settings => ({ ...DEFAULTS, roles: [], notes: {}, daily: {} });

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
  if (isBool(v.mix)) s.mix = v.mix;
  if (isBool(v.only)) s.only = v.only;
  if (isOneOf(THEMES, v.theme)) s.theme = v.theme;
  if (Array.isArray(v.roles)) s.roles = v.roles.filter((r) => typeof r === 'string');
  if (typeof v.showDate === 'string' && (v.showDate === '' || isDay(v.showDate))) s.showDate = v.showDate;
  if (isObj(v.notes)) for (const [k, n] of Object.entries(v.notes)) if (typeof n === 'string' && n) s.notes[k] = n;
  if (isObj(v.daily)) for (const [d, n] of Object.entries(v.daily)) if (isDay(d) && isNum(n)) s.daily[d] = n;
  return s;
}

function parseStats(o: Obj): Record<string, Stat> {
  const st: Record<string, Stat> = {};
  for (const [id, x] of Object.entries(o)) {
    if (!isObj(x)) continue;
    st[id] = {
      ok: isNum(x.ok) ? Math.max(0, x.ok) : 0,
      ko: isNum(x.ko) ? Math.max(0, x.ko) : 0,
      last: x.last === 'ok' || x.last === 'ko' ? x.last : '',
    };
  }
  return st;
}

/** Lit les données sauvegardées en ne gardant que les valeurs valides ; le reste prend sa valeur par défaut. */
export function parseSaved(raw: string | null): { s: Settings; st: Record<string, Stat> } {
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
/** Réglages : observés, comme l'état d'exécution. Tableaux et objets (`roles`, `daily`…) se remplacent. */
export const settings: Settings = reactive(saved.s);
/** Résultats par identifiant de réplique : remplacer l'objet pour signaler un changement. */
export const stats = signal<Record<string, Stat>>(saved.st);

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

export const isMissedId = (id: string) => stats.value[id]?.last === 'ko';
