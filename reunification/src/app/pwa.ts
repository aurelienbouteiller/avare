/* ---------- service worker : hors ligne et mises à jour ---------- */
import { registerSW } from 'virtual:pwa-register';
import { state } from '../state';

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
}
