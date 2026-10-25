import { execSync } from 'node:child_process';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

// Commit construit : fourni par Cloudflare (WORKERS_CI_COMMIT_SHA), sinon lu dans git.
function commit() {
  if (process.env.WORKERS_CI_COMMIT_SHA) return process.env.WORKERS_CI_COMMIT_SHA;
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

export default defineConfig({
  base: './',
  // Version affichée dans les réglages, pour vérifier qu'on a bien la dernière.
  define: {
    __APP_COMMIT__: JSON.stringify(commit()),
    __APP_BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: {
        name: 'Le souffleur des deux Corées',
        short_name: 'Deux Corées',
        description: 'Répétition de La Réunification des deux Corées, de Joël Pommerat',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0B1020',
        theme_color: '#0B1020',
        lang: 'fr',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Tout est précaché (lecteur de PDF compris) : l'appli fonctionne hors ligne. Le texte de la pièce reste sur
        // l'appareil.
        globPatterns: ['**/*.{html,js,mjs,css,woff2,png}'],
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
  },
});
