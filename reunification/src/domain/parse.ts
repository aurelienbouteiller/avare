/* ---------- lecture du texte de la pièce collé ou importé ---------- */
import type { Line, Play, Scene, Seg } from '../types';

// Nouvelle scène : « # Titre », ou « Scène 3 », « Tableau IV – Titre ».
const SCENE_HASH = /^#+\s*(.*)$/;
const SCENE_WORD = /^(?:sc[eè]ne|tableau)\s+(?:\d+|[ivxlc]+)\b\s*[.:–—-]?\s*(.*)$/i;
// Didascalie sur une ligne entière : entre parenthèses ou crochets.
const DIDASCALIA = /^[([].*[)\]]$/s;
// Personnage : nom en capitales, didascalie éventuelle entre parenthèses, puis « . », « : », « – » ou fin de ligne.
const SPEAKER = /^([\p{Lu}\d][\p{Lu}\d '’.-]*?)\s*(\([^)]*\))?\s*(?:[.:]|\s[–—-]|$)\s*(.*)$/u;
// Didascalies au fil d'une réplique.
const INLINE_DIDASCALIA = /(\([^)]*\)|\[[^\]]*\])/;

const MAX_NAME = 40;

function speakerOf(line: string) {
  const m = line.match(SPEAKER);
  if (!m) return null;
  const name = m[1].replace(/\s+/g, ' ').replace(/\.$/, '').trim();
  // Au moins deux lettres, rien en minuscules : « OUI ! » n'est pas un nom, la ponctuation finale l'exclut.
  const letters = name.replace(/[^\p{L}]/gu, '');
  if (letters.length < 2 || name.length > MAX_NAME || name !== name.toUpperCase()) return null;
  return { name, before: m[2] ?? '', text: m[3] ?? '' };
}

/** Texte d'une réplique découpé en paroles et didascalies. */
export function splitSegs(text: string): Seg[] {
  return text
    .split(INLINE_DIDASCALIA)
    .map((s) => s.replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n'))
    .filter((s) => s.trim())
    .map((s) => (/^[([]/.test(s.trim()) ? { d: s.trim().slice(1, -1).trim() } : { t: s.trim() }));
}

/** Hachage FNV-1a, en base 36 : court et stable. */
function hash(s: string) {
  let h = 0x811c9dc5;
  for (let k = 0; k < s.length; k++) {
    h ^= s.charCodeAt(k);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

interface Draft {
  w: string;
  b: number;
  parts: string[];
}

/**
 * Pièce lue dans le texte brut. Une scène commence par « # Titre » (ou « Scène 3 »), une réplique par le nom du
 * personnage en capitales (« LA FEMME. Texte », « LE MARI : Texte », ou le nom seul sur sa ligne). Une ligne entre
 * parenthèses ou crochets est une didascalie. Les autres lignes continuent la réplique en cours.
 */
export function parsePlay(raw: string): Play {
  const scenes: Scene[] = [];
  const drafts: Draft[] = [];
  // Réplique en cours (modifiée aussi par les fonctions ci-dessous).
  let cur = null as Draft | null;

  const scene = () => {
    if (!scenes.length) scenes.push({ n: 1, title: 'Scène 1', chars: [] });
    return scenes[scenes.length - 1];
  };
  const startScene = (title: string) => {
    const n = scenes.length + 1;
    let t = title.trim() || `Scène ${n}`;
    // Deux scènes du même titre : la seconde est numérotée, pour que les rôles restent distincts.
    if (scenes.some((s) => s.title === t)) t = `${t} (${n})`;
    scenes.push({ n, title: t, chars: [] });
    cur = null;
  };
  const push = (w: string, text: string) => {
    const s = scene();
    cur = { w, b: s.n, parts: text ? [text] : [] };
    drafts.push(cur);
    if (w && !s.chars.includes(w)) s.chars.push(w);
  };

  for (const rawLine of raw.replace(/\r\n?/g, '\n').split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const sc = line.match(SCENE_HASH) ?? line.match(SCENE_WORD);
    if (sc) {
      startScene(line.startsWith('#') ? sc[1] : line);
      continue;
    }
    if (DIDASCALIA.test(line)) {
      // Dans une réplique, elle en fait partie ; sinon elle est seule.
      if (cur?.w) cur.parts.push(line);
      else push('', line);
      continue;
    }
    const sp = speakerOf(line);
    if (sp) {
      push(sp.name, [sp.before, sp.text].filter(Boolean).join(' '));
      continue;
    }
    if (cur) cur.parts.push(line);
    else push('', `(${line})`);
  }

  const seen = new Map<string, number>();
  const lines: Line[] = [];
  for (const d of drafts) {
    const segs = splitSegs(d.parts.join('\n'));
    if (!segs.length) continue;
    const t = segs
      .flatMap((s) => (s.t === undefined ? [] : [s.t]))
      .join(' ')
      .trim();
    // Une réplique sans parole (didascalie seule) devient une didascalie.
    const w = t ? d.w : '';
    const key = `${w}|${t || segs.map((s) => s.d).join(' ')}`;
    const rank = seen.get(key) ?? 0;
    seen.set(key, rank + 1);
    lines.push({ w, t, b: d.b, segs, id: `${hash(key)}-${rank}` });
  }
  // Scènes vides retirées, les autres renumérotées ; un personnage sans parole n'a pas de rôle dans la scène.
  const kept = scenes.filter((s) => lines.some((l) => l.b === s.n));
  const renumber = new Map(kept.map((s, k) => [s.n, k + 1]));
  for (const l of lines) l.b = renumber.get(l.b) ?? 0;
  for (const s of kept) {
    s.n = renumber.get(s.n) ?? 0;
    s.chars = s.chars.filter((c) => lines.some((l) => l.b === s.n && l.w === c));
  }
  return { scenes: kept, lines };
}
