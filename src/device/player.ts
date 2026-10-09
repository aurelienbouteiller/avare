/* ---------- lecteur audio unique (clips enregistrés, ma voix) ---------- */
import { control } from '../state';
import { settleOnce } from './timing';

// Marge après la durée annoncée du clip, et limite si la durée reste inconnue.
const MARGIN_MS = 2500;
const MAX_MS = 90_000;

// Préfixes encore utilisés par d'anciens Firefox et Safari.
const player: HTMLAudioElement & { mozPreservesPitch?: boolean; webkitPreservesPitch?: boolean } = new Audio();
player.preload = 'auto';

function keepPitch() {
  try {
    player.preservesPitch = true;
    player.mozPreservesPitch = true;
    player.webkitPreservesPitch = true;
  } catch {}
}

/** Joue `src` jusqu'au bout ; faux si la séquence `token` a été interrompue. */
export function playClip(src: string, rate: number, token: number) {
  if (token !== control.token) return Promise.resolve(false);
  // Une erreur de lecture ne bloque pas l'enchaînement : on passe à la suite comme si le clip était fini.
  const { promise, settle, extend } = settleOnce(MAX_MS, true);
  const onEnd = () => settle(true);
  player.onended = player.onerror = onEnd;
  player.onloadedmetadata = () => {
    if (Number.isFinite(player.duration)) extend((player.duration * 1000) / rate + MARGIN_MS);
  };
  player.src = src;
  keepPitch();
  player.playbackRate = rate;
  player.play().catch(() => settle(true));
  return promise.then((ok) => {
    // Seulement si un autre clip n'a pas pris la place entre-temps.
    if (player.onended === onEnd) player.onended = player.onerror = null;
    return ok && token === control.token;
  });
}

export function stopClip() {
  try {
    player.pause();
    player.onended = player.onerror = null;
  } catch {}
}
