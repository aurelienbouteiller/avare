import { describe, expect, it } from 'vitest';
import { LINES } from '../data/scene';
import { mastery, recount } from './stats';

describe('recount', () => {
  it('compte un nouveau jugement', () => {
    expect(recount({ ok: 1, ko: 0 }, 'ko')).toEqual({ ok: 1, ko: 1 });
  });

  it('remplace un jugement précédent sans passer sous zéro', () => {
    expect(recount({ ok: 0, ko: 1 }, 'ok', 'ko')).toEqual({ ok: 1, ko: 0 });
    expect(recount({ ok: 0, ko: 0 }, 'ok', 'ko')).toEqual({ ok: 1, ko: 0 });
  });

  it('garde les autres champs', () => {
    expect(recount({ ok: 0, ko: 0, last: '' as const }, 'ok')).toEqual({ ok: 1, ko: 0, last: '' });
  });
});

describe('mastery', () => {
  const harpagon = LINES.flatMap((l, i) => (l.w === 'H' ? [i] : []));

  it('compte le dernier jugement de chaque réplique d’Harpagon', () => {
    const [a, b] = harpagon;
    const m = mastery(0, { [a]: { ok: 3, ko: 1, last: 'ok' }, [b]: { ok: 1, ko: 2, last: 'ko' } });
    expect(m).toEqual({ n: harpagon.length, ok: 1, ko: 1 });
  });

  it('se limite au bloc demandé', () => {
    expect(mastery(1, {}).n).toBe(harpagon.filter((i) => LINES[i].b === 1).length);
  });
});
