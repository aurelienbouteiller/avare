import { describe, expect, it } from 'vitest';
import { MASK_IDS, MODES } from '../types';
import { BLOCKS, LINES, NOTES, PLAN } from './scene';

describe('scène', () => {
  it('alterne Harpagon et Frosine, en commençant par Harpagon', () => {
    expect(LINES[0].w).toBe('H');
    for (let i = 1; i < LINES.length; i++) expect(LINES[i].w).not.toBe(LINES[i - 1].w);
  });

  it('parcourt les blocs 1 à 6 dans l’ordre', () => {
    const bs = LINES.map((l) => l.b);
    expect(bs[0]).toBe(1);
    expect(bs.at(-1)).toBe(6);
    for (let i = 1; i < bs.length; i++) expect(bs[i] - bs[i - 1]).toBeGreaterThanOrEqual(0);
  });

  it('marque seulement la dernière réplique comme sortie', () => {
    expect(LINES.filter((l) => l.end)).toEqual([LINES.at(-1)]);
  });

  it('découpe en segments les seules répliques de Frosine', () => {
    for (const l of LINES) {
      if (l.w === 'H') expect(l.segs).toBeNull();
      else {
        expect(l.segs?.length).toBeGreaterThan(0);
        // Les didascalies {…} sont isolées : aucune accolade ne reste dans le texte dit.
        for (const s of l.segs ?? []) expect(s.t ?? s.d).not.toMatch(/[{}]/);
      }
    }
  });

  it('a un en-tête et une note de jeu pour chaque bloc', () => {
    expect(BLOCKS.map((b) => b.n)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    for (const b of BLOCKS) expect(NOTES[b.n]).toBeDefined();
  });
});

describe('plan de répétition', () => {
  it('suit des jours consécutifs', () => {
    for (let k = 1; k < PLAN.length; k++) expect(Date.parse(PLAN[k].d) - Date.parse(PLAN[k - 1].d)).toBe(864e5);
  });

  it('ne propose que des séances valides', () => {
    for (const day of PLAN)
      for (const { p } of day.go) {
        if (p.mode) expect(MODES).toContain(p.mode);
        if (p.mask) expect(MASK_IDS).toContain(p.mask);
        if (p.block !== undefined) expect(BLOCKS.map((b) => b.n)).toContain(p.block);
      }
  });
});
