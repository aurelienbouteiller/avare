/* ---------- comparaison de la réplique dite ---------- */
import type { CompareResult } from './types';

function numToFr(n: number): string {
  const u = [
    'zero',
    'un',
    'deux',
    'trois',
    'quatre',
    'cinq',
    'six',
    'sept',
    'huit',
    'neuf',
    'dix',
    'onze',
    'douze',
    'treize',
    'quatorze',
    'quinze',
    'seize',
  ];
  const t: Record<number, string> = { 2: 'vingt', 3: 'trente', 4: 'quarante', 5: 'cinquante', 6: 'soixante' };
  const lt100 = (n: number): string => {
    if (n < 17) return u[n];
    if (n < 20) return `dix ${u[n - 10]}`;
    const d = Math.floor(n / 10),
      r = n % 10;
    if (d < 7) return t[d] + (r === 0 ? '' : r === 1 ? ' et un' : ` ${u[r]}`);
    if (d === 7) return `soixante ${r === 1 ? 'et onze' : lt100(10 + r)}`;
    if (d === 8) return `quatre vingt${r === 0 ? 's' : ` ${u[r]}`}`;
    return `quatre vingt ${lt100(10 + r)}`;
  };
  const lt1000 = (n: number): string => {
    const c = Math.floor(n / 100),
      r = n % 100;
    let s = '';
    if (c) s = `${c > 1 ? `${u[c]} ` : ''}cent${c > 1 && r === 0 ? 's' : ''}`;
    if (r) s += (s ? ' ' : '') + lt100(r);
    return s || 'zero';
  };
  if (n < 1000) return lt1000(n);
  if (n < 1e6) {
    const m = Math.floor(n / 1000),
      r = n % 1000;
    return `${m > 1 ? `${lt1000(m)} ` : ''}mille${r ? ` ${lt1000(r)}` : ''}`;
  }
  return String(n);
}
function norm(input: string) {
  let s = input.toLowerCase().replace(/(\d)[\s\u00a0\u202f.](?=\d{3}\b)/g, '$1');
  s = s.replace(/\d+/g, (m) => ` ${numToFr(+m)} `);
  s = s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae');
  s = s.replace(/[^a-z0-9]+/g, ' ').trim();
  return s ? s.split(' ') : [];
}
const HOMO = [
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
const HMAP: Record<string, number[]> = {};
for (const [k, g] of HOMO.entries()) {
  for (const w of g) {
    HMAP[w] ??= [];
    HMAP[w].push(k);
  }
}
function lev(a: string, b: string) {
  const m = a.length,
    n = b.length;
  if (!m) return n;
  if (!n) return m;
  let p = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const c: number[] = [i];
    for (let j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    p = c;
  }
  return p[n];
}
function similar(a: string, b: string) {
  if (a === b) return true;
  const ga = HMAP[a],
    gb = HMAP[b];
  if (ga && gb && ga.some((x) => gb.includes(x))) return true;
  const L = Math.max(a.length, b.length);
  if (L >= 6) return lev(a, b) <= 2;
  if (L >= 4) return lev(a, b) <= 1;
  return false;
}
export function compare(expected: string, said: string): CompareResult {
  const disp = expected.split(/\s+/).filter(Boolean);
  const E: string[] = [],
    own: number[] = [];
  for (const [k, w] of disp.entries()) {
    for (const t of norm(w)) {
      E.push(t);
      own.push(k);
    }
  }
  const W = norm(said);
  const n = E.length,
    m = W.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = similar(E[i], W[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const hit = new Array(n).fill(false);
  let i = 0,
    j = 0;
  while (i < n && j < m) {
    if (similar(E[i], W[j]) && dp[i][j] === dp[i + 1][j + 1] + 1) {
      hit[i] = true;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  const dispOk = disp.map(() => true);
  E.forEach((_t, k) => {
    if (!hit[k]) dispOk[own[k]] = false;
  });
  const nh = hit.filter(Boolean).length;
  return { score: n ? nh / n : 1, disp, dispOk, said };
}
/* ---------- noms propres mal transcrits par la reconnaissance vocale ---------- */
// Variantes explicites : un rapprochement approximatif changerait aussi « mariage » en Mariane.
const NAMES: Record<string, RegExp> = {
  Frosine:
    /\b(?:f?rosine|frozine|prosine|crosine|frosinne|frosyne|f?rau?zine|froz?ines?|frosines)\b|\bfro(?:id|s)? (?:zine|sine)\b/gi,
  Mariane: /\bmarie[ -]?anne\b|\bmarianne\b/gi,
};
export function fixNames(said: string) {
  let s = said;
  for (const [n, re] of Object.entries(NAMES)) s = s.replace(re, n);
  return s;
}
