/* ---------- service worker : hors ligne et mises à jour ---------- */
import { registerSW } from 'virtual:pwa-register';
import { state } from '../state';

// Caches de l'ancien service worker manuel (souffleur-v3 : ~8 Mo d'audio en base64, polices Google).
async function dropLegacyCaches() {
  if (!('caches' in window)) return;
  try {
    for (const k of await caches.keys()) if (k.startsWith('souffleur-')) caches.delete(k);
  } catch {}
}

export function initPwa() {
  registerSW({
    immediate: true,
    // Installée, l'appli est souvent reprise depuis l'arrière-plan sans être rechargée : le navigateur ne cherche
    // alors pas de nouvelle version. On le lui demande à chaque retour au premier plan.
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && navigator.onLine) reg.update().catch(() => {});
      });
    },
    onOfflineReady() {
      state.offlineReady = true;
    },
  });
  if (navigator.serviceWorker?.controller) state.offlineReady = true;
  dropLegacyCaches();
}
