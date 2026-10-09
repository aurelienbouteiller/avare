# Le souffleur d'Harpagon

Appli web installable (PWA) pour apprendre le rôle d'Harpagon dans *L'Avare*, acte II, scène 5.

- **Aujourd'hui** : plan de répétition jour par jour, maîtrise par bloc, calendrier.
- **Lire** : la scène découpée en 6 blocs, avec notes de jeu ; touche une réplique pour l'entendre.
- **Répéter** : Frosine donne la réplique (voix enregistrées ou voix du téléphone), tu dis la tienne, masquée à divers degrés. Vérification manuelle, à la voix (reconnaissance vocale) ou en t'enregistrant.

Thème « velours et or » sombre par défaut, thème clair ou automatique dans les réglages.

Tout est stocké sur l'appareil (`localStorage` pour les résultats, IndexedDB pour les enregistrements). Une fois chargée, l'appli fonctionne hors ligne, sauf la vérification à la voix.

## Développement

Node 24 ou plus récent (voir `.nvmrc`). Le code est en TypeScript strict (TypeScript 7), rendu avec [lit-html](https://lit.dev/docs/libraries/standalone-templates/), lint et formatage par [Biome](https://biomejs.dev), code mort détecté par [knip](https://knip.dev), tests unitaires avec Vitest et tests e2e avec Playwright.

```sh
npm install        # installe aussi le hook pre-commit (Biome sur les fichiers indexés, puis typecheck)
npm run dev        # serveur de dev sur http://localhost:5173
npm run check      # Biome, typecheck, knip et tests unitaires
npm run format     # formate et applique les correctifs sûrs de Biome
npm test           # tests Vitest
npm run e2e        # tests Playwright sur le build de production (npx playwright install chromium la première fois)
npm run build      # typecheck, tests, puis build de production dans dist/
npm run preview    # sert dist/ sur http://localhost:4173 (service worker actif)
```

Un échec de typecheck ou de test fait échouer `npm run build`, donc le déploiement. GitHub Actions (`.github/workflows/ci.yml`) lance `npm run check` et les tests e2e sur chaque push et pull request ; le rapport Playwright est joint au run. Le commit de formatage initial est listé dans `.git-blame-ignore-revs` (`git config blame.ignoreRevsFile .git-blame-ignore-revs`).

## Organisation

Les imports circulaires sont interdits (règle Biome `noImportCycles`) : `listen`, `recorder` et `audio` signalent ce qui se passe par callbacks ou valeur de retour, et c'est `engine` qui met à jour l'affichage.

| Chemin | Rôle |
| --- | --- |
| `index.html` | Coquille HTML (en-tête, barre de répétition, zone de texte, dock d'actions, navigation du bas, réglages) |
| `src/main.ts` | Démarrage, interactions, réglages, enregistrement du service worker |
| `src/data/scene.ts` | Texte de la scène, blocs, notes de jeu, plan de répétition |
| `src/engine.ts` | Moteur de répétition et lecture des passages : seul module qui orchestre audio, écoute, enregistrement et rendu |
| `src/platform.ts` | Capacités de l'appareil (synthèse, reconnaissance vocale, micro) et voix enregistrées disponibles |
| `src/audio.ts` | Voix enregistrées (chargement, préchargement) et voix du téléphone |
| `src/compare.ts` | Comparaison de la réplique dite avec le texte |
| `src/listen.ts`, `src/recorder.ts` | Reconnaissance vocale, enregistrement de ta voix |
| `src/render.ts` | Rendu des écrans (templates lit-html), à partir des données et de l'état seulement |
| `src/icons.ts` | Icônes SVG intégrées (fonctionnent hors ligne) |
| `src/store.ts`, `src/state.ts` | Données sauvegardées (validées au chargement), état d'exécution partagé |
| `src/types.ts` | Types partagés et listes de valeurs autorisées |
| `plugins/clips.ts` | Plugin Vite : module `virtual:clips`, liste des MP3 présents dans `public/audio/` |
| `*.test.ts` | Tests Vitest |
| `e2e/` | Tests Playwright (profil Pixel 7, date figée) |
| `public/audio/<voix>/L<réplique>_S<segment>.mp3` | Voix enregistrées : `F0` Denise, `F1` Vivienne, `F2` Charline, `F3` Ariane, `H0` Harpagon modèle |

Pour ajouter ou remplacer un clip, dépose simplement le MP3 dans `public/audio/<voix>/` : la liste des clips est relue à chaque build (et à chaud en dev). Le service worker est régénéré à chaque build, et seuls les fichiers modifiés sont re-téléchargés par les utilisateurs.

## Déploiement

Le site est entièrement statique. HTTPS est obligatoire (micro, service worker), ce que fournissent les deux plateformes.

**Netlify** : importer le dépôt GitHub. `netlify.toml` fixe déjà la commande (`npm run build`), le dossier publié (`dist`) et la version de Node.

**Cloudflare Pages** : Workers & Pages → Create → Pages → connecter le dépôt, préréglage *Vite* (ou commande `npm run build`, dossier de sortie `dist`), variables d'environnement `NODE_VERSION=24` et `SKIP_INSTALL_SIMPLE_GIT_HOOKS=1`.

Dans les deux cas, `public/_headers` règle le cache : fichiers hashés de `assets/` en cache permanent, `index.html` et `sw.js` toujours revalidés pour que les mises à jour arrivent tout de suite.
