import { describe, expect, it } from 'vitest';
import { parseSaved } from './store';

describe('parseSaved', () => {
  it('donne les valeurs par défaut sans données ou avec un JSON cassé', () => {
    for (const raw of [null, '', '{', '[]', '"texte"', 'null']) {
      const { s, st } = parseSaved(raw);
      expect(s).toMatchObject({ mode: 'jour', block: 1, mask: 'coins', theme: 'sombre', done: {}, daily: {} });
      expect(st).toEqual({});
    }
  });

  it('garde les données valides du format d’origine (sans numéro de version)', () => {
    const raw = JSON.stringify({
      s: {
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
        only: true,
        src: 'tts',
        fv: 'F1',
        theme: 'clair',
        done: { '2026-10-04': true },
        daily: { '2026-10-08': 4 },
      },
      st: { 0: { ok: 1, ko: 0, last: 'ok' }, 2: { ok: 0, ko: 1, last: 'ko' } },
    });
    const { s, st } = parseSaved(raw);
    expect(s).toEqual({
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
      only: true,
      src: 'tts',
      fv: 'F1',
      theme: 'clair',
      done: { '2026-10-04': true },
      daily: { '2026-10-08': 4 },
    });
    expect(st).toEqual({ 0: { ok: 1, ko: 0, last: 'ok' }, 2: { ok: 0, ko: 1, last: 'ko' } });
  });

  it('remplace par défaut les valeurs de mauvais type et ignore les clés inconnues', () => {
    const raw = JSON.stringify({
      v: 1,
      s: { mode: 'plage', rate: 'vite', tts: 'oui', fv: 'F9', inconnu: 1, done: { hier: true, '2026-10-05': 1 } },
      st: { abc: { ok: 1 }, 3: 'x', 4: { ok: -2, ko: 'n', last: 'peut-être' } },
    });
    const { s, st } = parseSaved(raw);
    expect(s).toMatchObject({ mode: 'jour', rate: 1, tts: true, fv: 'F0', done: {} });
    expect(s).not.toHaveProperty('inconnu');
    expect(st).toEqual({ 4: { ok: 0, ko: 0, last: '' } });
  });
});
