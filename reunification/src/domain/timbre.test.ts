import { describe, expect, it } from 'vitest';
import { timbreOf } from './timbre';

describe('timbreOf', () => {
  it('donne une voix plus aiguë aux personnages féminins, plus grave aux masculins', () => {
    expect(timbreOf('LA FEMME').pitch).toBeGreaterThan(1.05);
    expect(timbreOf("L'HOMME").pitch).toBeLessThan(0.95);
    expect(timbreOf('LA MÈRE DU GARÇON').pitch).toBeGreaterThan(1.05);
    expect(timbreOf('LE MARI DE LA FEMME').pitch).toBeLessThan(0.95);
  });

  it('reste le même pour un personnage, et varie d’un personnage à l’autre', () => {
    expect(timbreOf('PATRICK')).toEqual(timbreOf('PATRICK'));
    expect(timbreOf('LA GRANDE SŒUR').pitch).not.toBe(timbreOf('LA PETITE SŒUR').pitch);
  });
});
