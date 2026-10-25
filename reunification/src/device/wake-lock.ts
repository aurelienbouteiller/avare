/* ---------- écran allumé pendant la répétition ---------- */
let sentinel: WakeLockSentinel | null = null;

export const isScreenLocked = () => sentinel !== null;

export async function keepScreenOn() {
  try {
    if ('wakeLock' in navigator && !sentinel) {
      sentinel = await navigator.wakeLock.request('screen');
      sentinel.addEventListener('release', () => {
        sentinel = null;
      });
    }
  } catch {
    sentinel = null;
  }
}

export function releaseScreen() {
  try {
    sentinel?.release();
  } catch {}
  sentinel = null;
}
