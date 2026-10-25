import { describe, expect, it } from 'vitest';
import { type SceneProgress, suggest } from './suggest';

const scene = (n: number, ok: number, ko: number, seen: number, total = 10): SceneProgress => ({
  n,
  title: `S${n}`,
  m: { n: total, ok, ko },
  seen,
});

describe('suggest', () => {
  it('ne propose rien sans rôle', () => {
    expect(suggest([scene(1, 0, 0, 0, 0)], null)).toBeNull();
  });

  it('propose d’abord la scène qui a le plus de répliques à revoir', () => {
    const s = suggest([scene(1, 5, 1, 6), scene(2, 2, 3, 5), scene(3, 0, 0, 0)], null);
    expect(s?.title).toBe('Revoir : S2');
    expect(s?.go[0].p).toMatchObject({ block: 2, only: true });
  });

  it('puis la scène commencée la moins sue, avec un masque adapté', () => {
    const s = suggest([scene(1, 9, 0, 10), scene(2, 5, 0, 5), scene(3, 0, 0, 0)], null);
    expect(s?.title).toBe('Consolider : S2');
    expect(s?.go[0].p).toEqual({ block: 2, mask: 'initiales' });
  });

  it('puis une scène pas encore travaillée', () => {
    const s = suggest([scene(1, 9, 0, 10), scene(2, 0, 0, 0)], null);
    expect(s?.title).toBe('Découvrir : S2');
    expect(s?.go[0].p).toEqual({ mode: 'lire', block: 2 });
  });

  it('enfin des filages, imprévisibles à l’approche de la représentation', () => {
    const known = [scene(1, 9, 0, 10), scene(2, 10, 0, 10)];
    expect(suggest(known, 10)?.title).toBe('Filage');
    expect(suggest(known, 2)?.go[0].p).toMatchObject({ order: 'hasard', wild: true });
  });
});
