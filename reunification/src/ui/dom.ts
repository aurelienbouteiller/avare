/* ---------- accès au DOM de index.html ---------- */

/** Élément fixe de index.html : toujours présent. */
export const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector(s) as T;

/** Élément le plus proche de la cible d'un évènement délégué. */
export const closest = (e: Event, sel: string) => (e.target as Element).closest<HTMLElement>(sel);

export const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
