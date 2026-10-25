/* ---------- texte de la pièce (importé et gardé sur l'appareil) et ma distribution ---------- */
import { computed, signal } from '@preact/signals-core';
import { DEMO_TEXT } from '../data/demo';
import { daysUntil } from '../domain/dates';
import { isSpoken, roleKey } from '../domain/lines';
import { parsePlay } from '../domain/parse';
import { mastery } from '../domain/stats';
import { type SceneProgress, suggest } from '../domain/suggest';
import type { Line, Scene } from '../types';
import { isMissedId, settings, stats } from './settings';

const KEY = 'reunification-texte';

function loadText() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

const saved = loadText();
/** Texte d'exemple chargé tant que la pièce n'a pas été importée. */
export const isDemo = signal(!saved);
/** La pièce : scènes et répliques (remplacée à chaque import). */
export const play = signal(parsePlay(saved ?? DEMO_TEXT));

/** Adopte un nouveau texte (null : revient à l'exemple). Faux si le texte n'a pas pu être gardé. */
export function setText(raw: string | null) {
  let kept = true;
  try {
    if (raw === null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, raw);
  } catch {
    kept = false;
  }
  isDemo.value = raw === null;
  play.value = parsePlay(raw ?? DEMO_TEXT);
  return kept;
}

export const lines = (): readonly Line[] => play.value.lines;
export const scene = (n: number): Scene | undefined => play.value.scenes[n - 1];

/** Je joue la réplique i. */
export function isMine(i: number) {
  const l = lines()[i],
    s = l && scene(l.b);
  return !!s && isSpoken(l) && settings.roles.includes(roleKey(s.title, l.w));
}

export const isMissed = (i: number) => isMine(i) && isMissedId(lines()[i].id);

/** Je joue ce personnage dans cette scène. */
export const plays = (s: Scene, who: string) => settings.roles.includes(roleKey(s.title, who));

/** Scènes où j'ai au moins un rôle. */
const myScenesSignal = computed(() => play.value.scenes.filter((s) => s.chars.some((c) => plays(s, c))));
export const myScenes = () => myScenesSignal.value;
const hasRoles = () => myScenes().length > 0;

/** Répliques d'une scène ; 0 : toutes mes scènes (toute la pièce si je n'ai pas encore de rôle). */
export function sceneLines(b: number) {
  const mine = new Set(myScenes().map((s) => s.n));
  return lines().flatMap((l, i) => {
    const keep = b ? l.b === b : !mine.size || mine.has(l.b);
    return keep ? [i] : [];
  });
}

/** Identifiants de mes répliques dans une scène (0 : toutes mes scènes). */
export const myLineIds = (b: number) =>
  sceneLines(b)
    .filter(isMine)
    .map((i) => lines()[i].id);

/** Nom de la scène pour l'en-tête et les puces. */
export const sceneLabel = (b: number) => (b ? (scene(b)?.title ?? '') : hasRoles() ? 'Mes scènes' : 'Toute la pièce');

/** Ajoute ou retire un rôle. */
export function toggleRole(s: Scene, who: string) {
  const k = roleKey(s.title, who);
  settings.roles = settings.roles.includes(k) ? settings.roles.filter((r) => r !== k) : [...settings.roles, k];
}

/** Avancement de chacune de mes scènes. */
export const progress = (): SceneProgress[] =>
  myScenes().map((s) => {
    const ids = myLineIds(s.n);
    return { n: s.n, title: s.title, m: mastery(ids, stats.value), seen: ids.filter((id) => stats.value[id]).length };
  });

/** Jours avant la représentation, ou null si elle n'est pas fixée ou déjà passée. */
function daysLeft() {
  const d = settings.showDate ? daysUntil(settings.showDate) : -1;
  return d >= 0 ? d : null;
}

/** Séance proposée aujourd'hui. */
export const todaySuggestion = () => suggest(progress(), daysLeft());
