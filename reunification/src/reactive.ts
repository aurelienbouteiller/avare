/* ---------- réactivité : état observable et vues qui se redessinent seules ---------- */
import { effect, signal } from '@preact/signals-core';

/**
 * Copie de `initial` dont chaque propriété est un signal : la lire depuis `watch` y abonne, l'écrire relance ce
 * qui l'a lue. Les propriétés restent de simples champs (`state.phase = 'await'`), et JSON.stringify les voit.
 * Un objet ou un tableau rangé dedans n'est pas observé en profondeur : le remplacer plutôt que le modifier.
 */
export function reactive<T extends object>(initial: T): T {
  const out = {} as T;
  for (const key of Object.keys(initial) as (keyof T)[]) {
    const s = signal(initial[key]);
    Object.defineProperty(out, key, {
      enumerable: true,
      get: () => s.value,
      set: (v: T[keyof T]) => {
        s.value = v;
      },
    });
  }
  return out;
}

/**
 * Lance `run` en suivant les signaux qu'il lit, puis appelle `onChange` au premier changement de l'un d'eux.
 * Une erreur dans `run` est signalée sans couper le suivi. Rend la fonction qui arrête le suivi.
 */
export function track(run: () => void, onChange: () => void) {
  let first = true;
  return effect(() => {
    if (!first) {
      onChange();
      return;
    }
    first = false;
    try {
      run();
    } catch (e) {
      console.error(e);
    }
  });
}

/**
 * Lance `run` tout de suite, puis à chaque changement des signaux qu'il a lus. Les changements sont regroupés
 * jusqu'à la fin de la tâche en cours : une action qui écrit plusieurs champs ne relance `run` qu'une fois,
 * sur un état cohérent. Une erreur dans `run` est signalée sans couper le suivi : il repart au changement suivant.
 */
export function watch(run: () => void) {
  let queued = false;
  let stop = () => {};
  const again = () => {
    queued = false;
    stop();
    stop = track(run, () => {
      if (queued) return;
      queued = true;
      queueMicrotask(again);
    });
  };
  again();
}
