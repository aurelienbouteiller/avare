import { describe, expect, it } from 'vitest';
import { groupLines } from './pdf';

// Morceau de texte comme pdf.js le donne : corps `size`, à la position (x, y).
const item = (str: string, x: number, y: number, size = 12, fontName = 'roman') => ({
  str,
  transform: [size, 0, 0, size, x, y],
  fontName,
});
const italic = (f: string) => f === 'italique';

describe('groupLines', () => {
  it('forme les lignes, garde les exposants dans leur ligne et marque les changements de paragraphe', () => {
    const lines = groupLines(
      [
        item('— valeur, 1', 100, 500),
        item('re', 170, 504, 7),
        item(' partie —', 178, 500),
        item('LA FEMME', 40, 480, 11),
        item('. Oui, et', 80, 480),
        item('toi ?', 40, 468),
        item('Elle sort.', 40, 448, 12, 'italique'),
        item('', 40, 440),
      ],
      italic,
    );
    expect(lines.map((l) => l.map((r) => r.t).join(''))).toEqual([
      '— valeur, 1re partie —',
      '',
      'LA FEMME. Oui, et',
      'toi ?',
      '',
      'Elle sort.',
    ]);
    expect(lines[5][0]).toMatchObject({ italic: true, size: 12 });
    expect(lines[2][0]).toMatchObject({ italic: false, size: 11 });
  });

  it('ajoute une espace entre deux morceaux séparés d’un blanc', () => {
    const [line] = groupLines([item('Bonjour', 40, 400), item('toi', 100, 400)], italic);
    expect(line.map((r) => r.t).join('')).toBe('Bonjour toi');
  });
});
