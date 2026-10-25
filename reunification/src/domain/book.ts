/* ---------- texte d'une édition imprimée (lignes lues dans un PDF) mis au format d'import ---------- */

/** Morceau de ligne d'une même police : texte, italique ou non, corps en points. */
interface BookRun {
  t: string;
  italic: boolean;
  size: number;
}
export type BookLine = BookRun[];

// Titre de scène encadré de tirets : « — divorce — ».
const TITLE = /^[—–]\s*(.+?)\s*[—–]$/;
// Personnage en capitales, didascalie éventuelle entre parenthèses, puis un point (parfois précédé d'une espace).
const SPEAKER = /^([\p{Lu}][\p{Lu}’' -]*?\p{Lu})\s*(\([^)]*\))?\s*\.\s*(.*)$/u;
// Personnage dont la didascalie continue à la ligne suivante : « L’INSTITUTEUR (s’approchant de ».
const OPEN_SPEAKER = /^([\p{Lu}][\p{Lu}’' -]*?\p{Lu})\s*(\(.*)$/u;
const PAGE_NUMBER = /^\d{1,4}$/;
// Fin du texte de la pièce : pages de l'éditeur.
const BACK_MATTER = /^(du même auteur|achevé d'imprimer|table des matières)$|filigrane|watermark/i;
// Coupures où le trait d'union fait partie du mot (« peut-être », « dit-il ») : il est gardé.
const KEEP_HYPHEN_AFTER = new Set(
  'être ce ci là il ils elle elles on je tu nous vous moi toi lui leur leurs eux même t y en dire ça dessus dessous delà devant'.split(
    ' ',
  ),
);
const KEEP_HYPHEN_BEFORE = new Set(
  'peut après avant arc grand grande demi mi semi ex anti sous vis porte rendez'.split(' '),
);

const textOf = (line: BookLine) => line.map((r) => r.t).join('');
const isUpper = (s: string) => /\p{Lu}/u.test(s) && s === s.toUpperCase();

/** Corps du texte courant : le plus fréquent, pondéré par le nombre de caractères. */
function bodySize(lines: readonly BookLine[]) {
  const count = new Map<number, number>();
  for (const r of lines.flat()) {
    const k = Math.round(r.size * 2) / 2;
    count.set(k, (count.get(k) ?? 0) + r.t.trim().length);
  }
  return [...count].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
}

/** Joint deux lignes d'un paragraphe en recollant les mots coupés en fin de ligne. */
export function joinLines(a: string, b: string) {
  if (!a) return b;
  const cut = a.match(/(\p{L}+)-$/u),
    next = b.match(/^(\p{Ll}+)/u);
  if (cut && next) {
    const keep = KEEP_HYPHEN_AFTER.has(next[1]) || KEEP_HYPHEN_BEFORE.has(cut[1].toLowerCase());
    return keep ? a + b : a.slice(0, -1) + b;
  }
  return `${a} ${b}`;
}

/** Espaces en trop : doubles, avant la ponctuation fermante collée, après une apostrophe d'élision. */
const tidy = (s: string) =>
  s
    .replace(/\s+/g, ' ')
    .replace(/\b(\p{L}|qu|jusqu|lorsqu|puisqu)([’'])\s+(?=\p{L})/giu, '$1$2')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim();

/** Texte d'une ligne de réplique : l'italique hors parenthèses devient une didascalie entre parenthèses. */
function replyText(runs: BookRun[], open: number) {
  let out = '',
    depth = open,
    italic = '';
  const flush = () => {
    if (!italic.trim()) out += italic;
    else if (depth > 0 || /[()]/.test(italic)) out += italic;
    else out += italic.replace(/^(\s*)(.*?)(\s*)$/s, '$1($2)$3');
    italic = '';
  };
  for (const r of runs) {
    // Une espace seule n'interrompt pas un passage en italique.
    if (r.italic || (italic && !r.t.trim())) italic += r.t;
    else {
      flush();
      out += r.t;
    }
    for (const c of r.t) depth += c === '(' ? 1 : c === ')' ? -1 : 0;
  }
  flush();
  return out;
}

interface Paragraph {
  /** Personnage ; '' : didascalie. */
  w: string;
  /** Didascalie entre le nom et le point ; open : pas encore refermée (elle continue à la ligne suivante). */
  before: string;
  open?: boolean;
  text: string;
}

const capitalize = (s: string) => s.replace(/^./, (c) => c.toUpperCase());
const parenDepth = (s: string) => [...s].reduce((d, c) => d + (c === '(' ? 1 : c === ')' ? -1 : 0), 0);

/**
 * Texte au format d'import, à partir des lignes d'une édition imprimée : titres « — titre — », noms des personnages
 * en capitales (en petites capitales, plus petites que le texte, quand l'édition les distingue ainsi), didascalies en
 * italique. Ce qui précède le premier titre (page de titre, liste des personnages) et les pages de l'éditeur à la fin
 * sont laissés de côté, comme les numéros de page. Une ligne vide sépare deux paragraphes.
 */
export function bookToScript(lines: readonly BookLine[]): string {
  const body = bodySize(lines);
  const smaller = (r: BookRun | undefined) => !!r && r.size < body - 0.3;
  // L'édition met-elle les noms en petites capitales ? Alors un nom doit en être.
  const smallCapsNames = lines.filter((l) => smaller(l[0]) && isUpper(l[0].t.trim()) && !l[0].italic).length >= 3;

  const out: string[] = [];
  let cur: Paragraph | null = null,
    started = false,
    // Dernier personnage qui a parlé dans la scène : sa réplique reprend après une didascalie.
    last = '';
  const flush = () => {
    if (!cur) return;
    const text = tidy(cur.text);
    if (cur.w) out.push(`${cur.w}${cur.before ? ` ${tidy(cur.before)}` : ''}. ${text}`);
    else if (text) out.push(/^\(.*\)$/.test(text) ? text : `(${text})`);
    cur = null;
  };

  for (const line of lines) {
    const text = tidy(textOf(line));
    // Ligne vide : changement de paragraphe, qui termine une didascalie.
    if (!text) {
      if (cur && !cur.w) flush();
      continue;
    }
    if (BACK_MATTER.test(text)) {
      if (started) break;
      continue;
    }
    if (PAGE_NUMBER.test(text)) continue;
    const title = text.match(TITLE);
    if (title) {
      flush();
      out.push('', `# ${capitalize(title[1])}`, '');
      started = true;
      last = '';
      continue;
    }
    if (!started) continue;

    const runs = line.filter((r) => r.t);
    const isName = (n: string) => isUpper(n) && !runs[0].italic && (!smallCapsNames || smaller(runs[0]));
    if (cur?.open) {
      // Suite de la didascalie du personnage, jusqu'à la parenthèse fermante et au point.
      const all = joinLines(cur.before, text);
      if (parenDepth(all) > 0) cur.before = all;
      else {
        const end = all.lastIndexOf(')') + 1;
        Object.assign(cur, { before: all.slice(0, end), text: all.slice(end).replace(/^\s*\.\s*/, ''), open: false });
      }
      continue;
    }
    const sp = text.match(SPEAKER);
    if (sp && isName(sp[1])) {
      flush();
      // Le reste de la ligne après le nom et son point, avec ses passages en italique.
      const rest = replyText(runs, 0).replace(/^.*?\p{Lu}\s*(\([^)]*\))?\s*\.\s*/su, '');
      cur = { w: sp[1].replace(/\s+/g, ' '), before: sp[2] ?? '', text: rest };
      last = cur.w;
      continue;
    }
    const opening = text.match(OPEN_SPEAKER);
    if (opening && isName(opening[1]) && parenDepth(opening[2]) > 0) {
      flush();
      cur = { w: opening[1].replace(/\s+/g, ' '), before: opening[2], text: '', open: true };
      last = cur.w;
      continue;
    }
    const allItalic = runs.every((r) => r.italic || !r.t.trim());
    if (!allItalic && !cur?.w && last) {
      // Texte en romain après une didascalie : la réplique interrompue reprend.
      flush();
      cur = { w: last, before: '', text: replyText(runs, 0).trim() };
      continue;
    }
    if (cur?.w && (!allItalic || parenDepth(cur.text) > 0 || text.startsWith('('))) {
      cur.text = joinLines(cur.text.trimEnd(), replyText(runs, parenDepth(cur.text)).trim());
      continue;
    }
    if (cur?.w) flush();
    if (!cur) cur = { w: '', before: '', text: '' };
    cur.text = joinLines(cur.text.trimEnd(), text);
  }
  flush();
  return `${out.join('\n').trim()}\n`;
}
