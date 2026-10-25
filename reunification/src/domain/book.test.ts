import { describe, expect, it } from 'vitest';
import { type BookLine, bookToScript, joinLines } from './book';
import { parsePlay } from './parse';

// Lignes inventées, mises en page comme une édition : noms en petites capitales (corps 11), texte en corps 12,
// didascalies en italique, numéros de page en corps 10.
const roman = (t: string, size = 12) => ({ t, italic: false, size });
const italic = (t: string) => ({ t, italic: true, size: 12 });
const name = (t: string) => roman(t, 11);

const BOOK: BookLine[] = [
  [roman('LA PIÈCE INVENTÉE')],
  [roman('PERSONNAGES')],
  [roman('Une femme, un homme')],
  [roman('— le quai —')],
  [italic('Un quai de gare. Une femme at-')],
  [italic('tend.')],
  [name('L’HOMME'), roman('. Tu pars ?')],
  [name('LA FEMME'), roman(' . Peut-'), roman('')],
  [roman('être. Le train est en re-')],
  [roman('tard.')],
  [roman('7', 10)],
  [name('L’HOMME'), roman(' '), italic('(à la femme)'), roman('. Tu aurais pu')],
  [roman('me le dire. '), italic('Il s’assoit.'), roman(' Voilà.')],
  [name('LA FEMME'), roman('. OK, je reste (elle montre '), italic('la voie')],
  [italic('du doigt'), roman(') pour ce soir.')],
  [italic('Il sort. Elle reste.')],
  [roman('Tu reviens ?')],
  [name('L’HOMME'), roman(' '), italic('(revenant, à voix')],
  [italic('basse)'), roman('. Oui.')],
  [],
  [italic('Noir.')],
  [roman('— l’après —')],
  [name('LA FEMME'), roman('. NON !')],
  [roman('DU MÊME AUTEUR')],
  [roman('Une autre pièce.')],
];

describe('bookToScript', () => {
  const script = bookToScript(BOOK);

  it('met le texte au format d’import, sans la page de titre, les numéros de page ni la fin du livre', () => {
    expect(script).toBe(
      [
        '# Le quai',
        '',
        '(Un quai de gare. Une femme attend.)',
        'L’HOMME. Tu pars ?',
        'LA FEMME. Peut-être. Le train est en retard.',
        'L’HOMME (à la femme). Tu aurais pu me le dire. (Il s’assoit.) Voilà.',
        'LA FEMME. OK, je reste (elle montre la voie du doigt) pour ce soir.',
        '(Il sort. Elle reste.)',
        'LA FEMME. Tu reviens ?',
        'L’HOMME (revenant, à voix basse). Oui.',
        '(Noir.)',
        '',
        '# L’après',
        '',
        'LA FEMME. NON !',
        '',
      ].join('\n'),
    );
  });

  it('donne un texte que l’appli lit correctement', () => {
    const { scenes, lines } = parsePlay(script);
    expect(scenes.map((s) => [s.title, s.chars])).toEqual([
      ['Le quai', ['L’HOMME', 'LA FEMME']],
      ['L’après', ['LA FEMME']],
    ]);
    expect(lines.filter((l) => !l.w).map((l) => l.segs)).toEqual([
      [{ d: 'Un quai de gare. Une femme attend.' }],
      [{ d: 'Il sort. Elle reste.' }],
      [{ d: 'Noir.' }],
    ]);
    expect(lines.find((l) => l.t.startsWith('Tu aurais pu'))?.t).toBe('Tu aurais pu me le dire. Voilà.');
  });

  it('sans petites capitales, reconnaît les noms à leur seule forme', () => {
    const plain = bookToScript([[roman('— un —')], [roman('ANNE. Oui.')], [roman('BRUNO. Non.')]]);
    expect(plain).toBe('# Un\n\nANNE. Oui.\nBRUNO. Non.\n');
  });
});

describe('joinLines', () => {
  it('recolle les mots coupés et garde le trait d’union des mots composés', () => {
    expect(joinLines('une interlocu-', 'trice')).toBe('une interlocutrice');
    expect(joinLines('c’est peut-', 'être')).toBe('c’est peut-être');
    expect(joinLines('dit-', 'il')).toBe('dit-il');
    expect(joinLines('la fin', 'de la phrase')).toBe('la fin de la phrase');
    expect(joinLines('un trait -', 'Seul')).toBe('un trait - Seul');
  });
});
