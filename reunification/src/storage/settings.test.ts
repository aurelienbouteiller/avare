import { describe, expect, it } from 'vitest';
import { parseSaved } from './settings';

describe('parseSaved', () => {
  it('donne les valeurs par défaut sans données ou avec un JSON cassé', () => {
    for (const raw of [null, '', '{', '[]', '"texte"', 'null']) {
      const { s, st } = parseSaved(raw);
      expect(s).toMatchObject({ mode: 'jour', block: 0, mask: 'coins', theme: 'sombre', roles: [], daily: {} });
      expect(st).toEqual({});
    }
  });

  it('garde les données valides', () => {
    const saved = {
      mode: 'lire',
      block: 3,
      mask: 'initiales',
      order: 'hasard',
      check: 'voix',
      tol: 'souple',
      rate: 1.2,
      wild: true,
      hands: true,
      voice: 'Thomas',
      tts: false,
      mix: false,
      only: true,
      theme: 'clair',
      roles: ['Divorce|LA FEMME'],
      showDate: '2027-01-15',
      notes: { Divorce: 'Calme, puis la colère monte.' },
      daily: { '2026-10-08': 4 },
    };
    const st = { 'a1-0': { ok: 1, ko: 0, last: 'ok' }, 'b2-1': { ok: 0, ko: 1, last: 'ko' } };
    const parsed = parseSaved(JSON.stringify({ v: 1, s: saved, st }));
    expect(parsed.s).toEqual(saved);
    expect(parsed.st).toEqual(st);
  });

  it('remplace par défaut les valeurs de mauvais type et ignore les clés inconnues', () => {
    const raw = JSON.stringify({
      v: 1,
      s: {
        mode: 'plage',
        rate: 'vite',
        tts: 'oui',
        roles: ['A|B', 3],
        showDate: 'demain',
        notes: { A: 2 },
        inconnu: 1,
        daily: { hier: 2, '2026-10-05': 1 },
      },
      st: { abc: { ok: 1 }, 3: 'x', 4: { ok: -2, ko: 'n', last: 'peut-être' } },
    });
    const { s, st } = parseSaved(raw);
    expect(s).toMatchObject({ mode: 'jour', rate: 1, tts: true, roles: ['A|B'], showDate: '', notes: {} });
    expect(s.daily).toEqual({ '2026-10-05': 1 });
    expect(s).not.toHaveProperty('inconnu');
    expect(st).toEqual({ abc: { ok: 1, ko: 0, last: '' }, 4: { ok: 0, ko: 0, last: '' } });
  });
});
