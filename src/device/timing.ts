export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Promesse résolue une seule fois : par `settle`, ou au plus tard après `ms` (sécurité si un évènement de fin ne vient
 * jamais). `ms` peut être repoussé avec `extend`.
 */
export function settleOnce<T>(ms: number, onTimeout: T) {
  let done = false,
    tm: ReturnType<typeof setTimeout> | undefined,
    resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  const settle = (v: T) => {
    if (done) return;
    done = true;
    clearTimeout(tm);
    resolve(v);
  };
  const extend = (next: number) => {
    clearTimeout(tm);
    tm = setTimeout(() => settle(onTimeout), next);
  };
  extend(ms);
  return { promise, settle, extend };
}
