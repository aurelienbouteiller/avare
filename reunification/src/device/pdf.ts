/* ---------- lecture d'un PDF dans le navigateur (pdf.js, chargé seulement au premier import) ---------- */
import type { BookLine } from '../domain/book';

/** Morceau de texte tel que pdf.js le donne. */
interface Item {
  str: string;
  transform: number[];
  fontName: string;
  hasEOL?: boolean;
}

/**
 * Lignes d'une page : les morceaux de même hauteur forment une ligne (un exposant, plus petit et un peu plus haut,
 * reste dans sa ligne). Une ligne vide marque un blanc plus grand que l'interligne : un changement de paragraphe.
 * italicFont : la police est-elle italique ? Une espace est ajoutée entre deux morceaux séparés d'un blanc visible.
 */
export function groupLines(items: readonly Item[], italicFont: (fontName: string) => boolean): BookLine[] {
  const lines: BookLine[] = [];
  let cur: { y: number; x: number; size: number; runs: BookLine } | null = null;
  for (const it of items) {
    if (!it.str) continue;
    const [a, b, , , x, y] = it.transform;
    const size = Math.hypot(a, b);
    if (!cur || Math.abs(y - cur.y) > Math.max(size, cur.size) * 0.6) {
      if (cur && cur.y - y > cur.size * 1.35) lines.push([]);
      cur = { y, x, size, runs: [] };
      lines.push(cur.runs);
    } else {
      const raised = size < cur.size * 0.8;
      const last = cur.runs.at(-1)?.t ?? ' ';
      if (!raised && x - cur.x > size * 0.15 && !/\s$/.test(last) && !/^\s/.test(it.str))
        cur.runs.push({ t: ' ', italic: false, size });
      if (!raised) {
        cur.y = y;
        cur.size = Math.max(cur.size, size);
      }
    }
    cur.runs.push({ t: it.str, italic: italicFont(it.fontName), size });
    // Fin approximative du morceau, pour repérer le blanc avant le suivant.
    cur.x = x + it.str.length * size * 0.45;
  }
  return lines;
}

/** Lignes de texte de tout le document, page après page. */
export async function readPdf(file: Blob): Promise<BookLine[]> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  // fontExtraProperties : le nom des polices (« …-Italic ») dit où sont les didascalies.
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), fontExtraProperties: true });
  const doc = await task.promise;
  const out: BookLine[] = [];
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      // Charge les polices de la page, pour lire leur nom.
      await page.getOperatorList();
      const content = await page.getTextContent();
      const italic = (f: string) => {
        const font = page.commonObjs.has(f) ? (page.commonObjs.get(f) as { name?: string }) : null;
        return /italic|oblique/i.test(font?.name ?? '');
      };
      out.push(...groupLines(content.items as Item[], italic));
      page.cleanup();
    }
  } finally {
    await task.destroy();
  }
  return out;
}
