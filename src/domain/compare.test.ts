import { describe, expect, it } from 'vitest';
import { compare } from './compare';
import { fixNames } from './names';

describe('compare', () => {
  it('compte juste une réplique dite mot pour mot, sans ponctuation ni majuscules', () => {
    const r = compare(
      "Tout va comme il faut. Hé bien, qu'est-ce, Frosine ?",
      "tout va comme il faut hé bien qu'est-ce frosine",
    );
    expect(r.score).toBe(1);
    expect(r.dispOk.every(Boolean)).toBe(true);
  });

  it('accepte les homophones et les accents manquants', () => {
    expect(compare('Il est vrai', 'il et vrai').score).toBe(1);
    expect(compare('cent écus', 'sans ecus').score).toBe(1);
  });

  it('lit les nombres en chiffres, avec ou sans séparateur de milliers', () => {
    expect(compare('douze mille livres de rente', '12 000 livres de rente').score).toBe(1);
    expect(compare('soixante ans', '60 ans').score).toBe(1);
    expect(compare('quatre-vingt-dix', '90').score).toBe(1);
  });

  it('tolère une petite faute sur un mot long', () => {
    expect(compare('si frais et si gaillard', 'si frais et si gaillards').score).toBe(1);
  });

  it('signale les mots manquants dans le texte affiché', () => {
    const r = compare('Jamais je ne vous vis un teint si frais', 'jamais je ne vous vis');
    expect(r.score).toBeCloseTo(5 / 9);
    expect(r.disp).toHaveLength(9);
    expect(r.dispOk).toEqual([true, true, true, true, true, false, false, false, false]);
  });

  it('donne 0 quand rien n’a été entendu', () => {
    expect(compare('Qui moi ?', '')).toMatchObject({ score: 0, said: '' });
  });
});

describe('fixNames', () => {
  it('corrige les transcriptions courantes des noms propres', () => {
    expect(fixNames('rosine vous voilà')).toBe('Frosine vous voilà');
    expect(fixNames('et marianne')).toBe('et Mariane');
  });

  it('ne touche pas aux mots proches', () => {
    expect(fixNames('le mariage')).toBe('le mariage');
  });
});
