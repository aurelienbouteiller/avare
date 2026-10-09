import { describe, expect, it } from 'vitest';
import { reactive, watch } from './reactive';

const tick = () => new Promise<void>((r) => queueMicrotask(r));

describe('reactive et watch', () => {
  it('relance une fois par tâche, sur un état cohérent', async () => {
    const s = reactive({ a: 1, b: 1 });
    const seen: string[] = [];
    watch(() => seen.push(`${s.a}/${s.b}`));
    s.a = 2;
    s.b = 2;
    expect(seen).toEqual(['1/1']);
    await tick();
    expect(seen).toEqual(['1/1', '2/2']);
  });

  it('ne suit que les champs lus au dernier passage', async () => {
    const s = reactive({ show: false, detail: 0 });
    let runs = 0;
    watch(() => {
      runs++;
      if (s.show) void s.detail;
    });
    s.detail = 1;
    await tick();
    expect(runs).toBe(1);
    s.show = true;
    await tick();
    s.detail = 2;
    await tick();
    expect(runs).toBe(3);
  });

  it('reste sérialisable', () => {
    expect(JSON.stringify(reactive({ a: 1, b: 'x' }))).toBe('{"a":1,"b":"x"}');
  });
});
