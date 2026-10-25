import { describe, expect, it } from 'vitest';
import { DEMO_TEXT } from '../data/demo';
import { parsePlay, splitSegs } from './parse';

describe('parsePlay', () => {
  it('découpe le texte en scènes, personnages et répliques', () => {
    const { scenes, lines } = parsePlay(DEMO_TEXT);
    expect(scenes.map((s) => s.title)).toEqual(['Exemple 1 – Le quai', 'Exemple 2 – La lampe']);
    expect(scenes[0].chars).toEqual(["L'HOMME", 'LA FEMME']);
    expect(scenes[1].chars).toEqual(['LA GRANDE SŒUR', 'LA PETITE SŒUR']);
    expect(lines[0]).toMatchObject({ w: '', b: 1 });
    expect(lines[1]).toMatchObject({ w: "L'HOMME", t: 'Tu pars ?', b: 1 });
  });

  it('garde les retours à la ligne d’une réplique et y range les didascalies', () => {
    const { lines } = parsePlay(DEMO_TEXT);
    const letters = lines.find((l) => l.t.startsWith("J'en ai écrit"));
    expect(letters?.t).toBe(
      "J'en ai écrit douze.\nJe les ai tous jetés.\nIl n'y en avait pas un qui disait la vérité.",
    );
    const lastLine = lines.find((l) => l.t === 'Maintenant le train arrive.');
    expect(lastLine?.segs).toEqual([{ d: 'elle regarde la voie' }, { t: 'Maintenant le train arrive.' }]);
  });

  it('reconnaît le nom seul sur sa ligne, les deux-points et le tiret', () => {
    const { lines, scenes } = parsePlay('LE MARI\nBonjour.\nLA FEMME : Bonsoir.\nLE MARI – Déjà ?');
    expect(lines.map((l) => [l.w, l.t])).toEqual([
      ['LE MARI', 'Bonjour.'],
      ['LA FEMME', 'Bonsoir.'],
      ['LE MARI', 'Déjà ?'],
    ]);
    expect(scenes).toEqual([{ n: 1, title: 'Scène 1', chars: ['LE MARI', 'LA FEMME'] }]);
  });

  it('accepte « Scène 3 » comme début de scène et numérote les titres en double', () => {
    const { scenes } = parsePlay('# Amour\nANNE. Oui.\nScène 2\nANNE. Non.\n# Amour\nANNE. Peut-être.');
    expect(scenes.map((s) => s.title)).toEqual(['Amour', 'Scène 2', 'Amour (3)']);
  });

  it('ne prend pas une exclamation en capitales pour un nom', () => {
    const { lines } = parsePlay('LUI. Écoute.\nNON !\nLUI. Quoi ?');
    expect(lines.map((l) => l.w)).toEqual(['LUI', 'LUI']);
    expect(lines[0].t).toBe('Écoute.\nNON !');
  });

  it('donne des identifiants stables, distincts pour deux répliques identiques', () => {
    const a = parsePlay(DEMO_TEXT).lines,
      b = parsePlay(`# Avant\nXAVIER. Rien.\n${DEMO_TEXT}`).lines;
    expect(b.slice(1).map((l) => l.id)).toEqual(a.map((l) => l.id));
    const twice = parsePlay('ANNE. Oui.\nBOB. Non.\nANNE. Oui.').lines;
    expect(twice[0].id).not.toBe(twice[2].id);
  });

  it('retire les scènes vides et renumérote les autres', () => {
    const { scenes, lines } = parsePlay('# Vide\n# Pleine\nANNE. Oui.');
    expect(scenes).toEqual([{ n: 1, title: 'Pleine', chars: ['ANNE'] }]);
    expect(lines[0].b).toBe(1);
  });
});

describe('splitSegs', () => {
  it('sépare les didascalies entre parenthèses ou crochets', () => {
    expect(splitSegs('Oui. (Un temps.) Non. [Il sort.]')).toEqual([
      { t: 'Oui.' },
      { d: 'Un temps.' },
      { t: 'Non.' },
      { d: 'Il sort.' },
    ]);
  });
});
