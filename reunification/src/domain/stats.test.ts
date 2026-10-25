import { describe, expect, it } from 'vitest';
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
  it('compte le dernier jugement de chacune de mes répliques', () => {
    const m = mastery(['a', 'b', 'c'], {
      a: { ok: 3, ko: 1, last: 'ok' },
      b: { ok: 1, ko: 2, last: 'ko' },
      z: { ok: 1, ko: 0, last: 'ok' },
    });
    expect(m).toEqual({ n: 3, ok: 1, ko: 1 });
  });
});
