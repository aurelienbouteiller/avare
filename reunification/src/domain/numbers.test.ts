import { describe, expect, it } from 'vitest';
import { numberToWords } from './numbers';

describe('numberToWords', () => {
  it.each([
    [0, 'zero'],
    [17, 'dix sept'],
    [21, 'vingt et un'],
    [60, 'soixante'],
    [71, 'soixante et onze'],
    [80, 'quatre vingts'],
    [99, 'quatre vingt dix neuf'],
    [200, 'deux cents'],
    [1000, 'mille'],
    [12000, 'douze mille'],
  ])('%i → %s', (n, words) => {
    expect(numberToWords(n)).toBe(words);
  });
});
