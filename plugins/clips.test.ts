import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, expect, it } from 'vitest';
import { listClips } from './clips';

const dir = mkdtempSync(join(tmpdir(), 'clips-'));
afterAll(() => rmSync(dir, { recursive: true }));

it('liste les MP3 de chaque voix, triés par numéro de réplique', () => {
  mkdirSync(join(dir, 'F0'));
  mkdirSync(join(dir, 'H0'));
  for (const f of ['L11_S0.mp3', 'L1_S0.mp3', 'L3_S0.mp3', 'notes.txt']) writeFileSync(join(dir, 'F0', f), '');
  writeFileSync(join(dir, 'H0', 'L0_S0.mp3'), '');
  writeFileSync(join(dir, 'lisezmoi.md'), '');
  expect(listClips(dir)).toEqual({ F0: ['L1_S0', 'L3_S0', 'L11_S0'], H0: ['L0_S0'] });
});
