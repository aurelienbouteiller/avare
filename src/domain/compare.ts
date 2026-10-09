/* ---------- comparaison de la réplique dite avec le texte ---------- */
import type { CompareResult } from '../types';
import { numberToWords } from './numbers';

/** Mots normalisés : minuscules, sans accents ni ponctuation, nombres écrits en lettres. */
function normalize(input: string) {
  const s = input
    .toLowerCase()
    .replace(/(\d)[\s  .](?=\d{3}\b)/g, '$1') // 12 000 → 12000
    .replace(/\d+/g, (m) => ` ${numberToWords(Number(m))} `)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return s ? s.split(' ') : [];
}

// Homophones que la reconnaissance vocale confond : un mot vaut n'importe quel mot de son groupe.
const HOMOPHONES = [
  ['et', 'est', 'es', 'ai', 'e', 'eh', 'hai'],
  ['on', 'ont'],
  ['ce', 'se'],
  ['ces', 'ses', 'c', 's'],
  ['sa', 'ca'],
  ['peu', 'peut', 'peux'],
  ['mais', 'mes', 'met', 'mai', 'mets'],
  ['cent', 'sans', 'sang', 'sens'],
  ['vingt', 'vin', 'vain', 'vint'],
  ['crois', 'croit'],
  ['dis', 'dit'],
  ['vois', 'voit', 'voix'],
  ['fait', 'fais'],
  ['la', 'las', 'l'],
  ['quel', 'quelle', 'qu', 'que'],
  ['tant', 'temps', 'tend', 'tends', 'taon'],
  ['moi', 'mois'],
  ['tu', 't'],
  ['ou', 'où'],
  ['hé', 'he', 'eh', 'et'],
  ['ma', 'm'],
  ['qui', 'ki'],
  ['point', 'poing'],
  ['dot', 'dote'],
  ['soupe', 'soupent'],
  ['tantot', 'tantôt', 'tant', 'tot', 'tôt'],
];
// Mot → indices des groupes qui le contiennent.
const GROUPS_OF: Record<string, number[]> = {};
for (const [k, g] of HOMOPHONES.entries())
  for (const w of g) {
    GROUPS_OF[w] ??= [];
    GROUPS_OF[w].push(k);
  }

/** Distance d'édition de Levenshtein. */
function levenshtein(a: string, b: string) {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur: number[] = [i];
    for (let j = 1; j <= b.length; j++)
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

/** Même mot, homophone, ou petite faute sur un mot long. */
function similar(a: string, b: string) {
  if (a === b) return true;
  const ga = GROUPS_OF[a],
    gb = GROUPS_OF[b];
  if (ga && gb && ga.some((x) => gb.includes(x))) return true;
  const len = Math.max(a.length, b.length);
  if (len >= 6) return levenshtein(a, b) <= 2;
  if (len >= 4) return levenshtein(a, b) <= 1;
  return false;
}

/** Mots attendus retrouvés dans ce qui a été dit, dans l'ordre (plus longue sous-suite commune). */
function matchedWords(expected: string[], said: string[]) {
  const n = expected.length,
    m = said.length;
  // lcs[i][j] : longueur de la plus longue sous-suite commune entre expected[i..] et said[j..].
  const lcs = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      lcs[i][j] = similar(expected[i], said[j]) ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const hit: boolean[] = new Array(n).fill(false);
  let i = 0,
    j = 0;
  while (i < n && j < m) {
    if (similar(expected[i], said[j]) && lcs[i][j] === lcs[i + 1][j + 1] + 1) {
      hit[i] = true;
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) i++;
    else j++;
  }
  return hit;
}

export function compare(expected: string, said: string): CompareResult {
  // Mots affichés, et pour chaque mot normalisé, le mot affiché dont il vient (« qu'est-ce » donne trois mots).
  const disp = expected.split(/\s+/).filter(Boolean);
  const words: string[] = [],
    owner: number[] = [];
  for (const [k, w] of disp.entries())
    for (const t of normalize(w)) {
      words.push(t);
      owner.push(k);
    }
  const hit = matchedWords(words, normalize(said));
  const dispOk = disp.map(() => true);
  for (const [k, ok] of hit.entries()) if (!ok) dispOk[owner[k]] = false;
  const found = hit.filter(Boolean).length;
  return { score: words.length ? found / words.length : 1, disp, dispOk, said };
}
