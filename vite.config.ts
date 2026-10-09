import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { clips } from './plugins/clips';

export default defineConfig({
  base: './',
  plugins: [
    clips(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: {
        name: "Le souffleur d'Harpagon",
        short_name: 'Souffleur',
        description: "Répétition du rôle d'Harpagon, L'Avare, acte II, scène 5",
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#140B0F',
        theme_color: '#140B0F',
        lang: 'fr',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Tout est précaché (audio compris) : l'appli fonctionne hors ligne, et chaque fichier
        // porte sa propre révision, donc une mise à jour ne re-télécharge que ce qui a changé.
        globPatterns: ['**/*.{html,js,css,woff2,png,mp3}'],
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
      },
    }),
  ],
});
