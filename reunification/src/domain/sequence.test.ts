import { describe, expect, it } from 'vitest';
import { DEMO_TEXT } from '../data/demo';
import { parsePlay } from './parse';
import { buildSequence } from './sequence';

const { lines } = parsePlay(DEMO_TEXT);
const scene1 = lines.flatMap((l, i) => (l.b === 1 ? [i] : []));
const isMine = (i: number) => lines[i].w === 'LA FEMME';
const mine = scene1.filter(isMine);
const spoken = scene1.filter((i) => lines[i].w);
const none = () => false;

describe('buildSequence', () => {
  it('garde toutes les répliques dites du passage, dans l’ordre, sans les didascalies seules', () => {
    expect(buildSequence(lines, scene1, { onlyMissed: false, shuffled: false, isMine, isMissed: none })).toEqual(
      spoken,
    );
  });

  it('ne garde que mes répliques à revoir, chacune précédée de la réplique qui l’appelle', () => {
    const missed = mine[2];
    const seq = buildSequence(lines, scene1, {
      onlyMissed: true,
      shuffled: false,
      isMine,
      isMissed: (i) => i === missed,
    });
    expect(seq).toEqual([missed - 1, missed]);
  });

  it('saute la didascalie seule entre la réplique d’appel et la mienne', () => {
    // « Je sais. » (LA FEMME), puis « (Un temps.) », puis « Tu aurais pu me laisser un mot. » (L'HOMME).
    const missed = lines.findIndex((l) => l.t.startsWith('Tu aurais pu'));
    const seq = buildSequence(lines, scene1, {
      onlyMissed: true,
      shuffled: false,
      isMine: (i) => lines[i].w === "L'HOMME",
      isMissed: (i) => i === missed,
    });
    expect(seq.map((i) => lines[i].t)).toEqual(['Je sais.', 'Tu aurais pu me laisser un mot.']);
  });

  it('au hasard, mélange mes répliques sans les séparer de leur appel', () => {
    const seq = buildSequence(lines, scene1, { onlyMissed: false, shuffled: true, isMine, isMissed: none }, () => 0);
    expect(seq.filter(isMine).sort((a, b) => a - b)).toEqual(mine);
    for (const [p, i] of seq.entries()) if (!isMine(i)) expect(isMine(seq[p + 1])).toBe(true);
  });

  it('ne rend rien quand je ne joue pas dans le passage', () => {
    expect(buildSequence(lines, scene1, { onlyMissed: false, shuffled: false, isMine: none, isMissed: none })).toEqual(
      [],
    );
  });
});
