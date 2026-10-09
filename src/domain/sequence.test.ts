import { describe, expect, it } from 'vitest';
import { blockLines, LINES } from '../data/scene';
import { buildSequence } from './sequence';

const block1 = blockLines(1);
const harpagon = block1.filter((i) => LINES[i].w === 'H');
const none = () => false;

describe('buildSequence', () => {
  it('garde tout le passage dans l’ordre de la scène', () => {
    expect(buildSequence(block1, { onlyMissed: false, shuffled: false, isMissed: none })).toEqual(block1);
  });

  it('ne garde que les répliques à revoir, chacune précédée de la réplique de Frosine qui l’appelle', () => {
    const missed = harpagon[2];
    const seq = buildSequence(block1, { onlyMissed: true, shuffled: false, isMissed: (i) => i === missed });
    expect(seq).toEqual([missed - 1, missed]);
  });

  it('garde la première réplique seule quand Frosine ne la précède pas', () => {
    const first = harpagon[0];
    expect(buildSequence(block1, { onlyMissed: true, shuffled: false, isMissed: (i) => i === first })).toEqual([first]);
  });

  it('au hasard, mélange les répliques d’Harpagon sans les séparer de leur appel', () => {
    const seq = buildSequence(block1, { onlyMissed: false, shuffled: true, isMissed: none }, () => 0);
    expect(seq.filter((i) => LINES[i].w === 'H').sort((a, b) => a - b)).toEqual(harpagon);
    for (const [p, i] of seq.entries()) if (LINES[i].w === 'F') expect(seq[p + 1]).toBe(i + 1);
  });
});
