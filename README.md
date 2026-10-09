# Le souffleur d'Harpagon

Appli web installable (PWA) pour apprendre le rôle d'Harpagon dans *L'Avare*, acte II, scène 5.

- **Aujourd'hui** : plan de répétition jour par jour, maîtrise par bloc, calendrier.
- **Lire** : la scène découpée en 6 blocs, avec notes de jeu ; touche une réplique pour l'entendre.
- **Répéter** : Frosine donne la réplique (voix enregistrées ou voix du téléphone), tu dis la tienne, masquée à divers degrés. Vérification manuelle, à la voix (reconnaissance vocale) ou en t'enregistrant.

Thème « velours et or » sombre par défaut, thème clair ou automatique dans les réglages.

Tout est stocké sur l'appareil (`localStorage` pour les résultats, IndexedDB pour les enregistrements). Une fois chargée, l'appli fonctionne hors ligne, sauf la vérification à la voix.

## Développement

Node 24 ou plus récent (voir `.nvmrc`). Le code est en TypeScript strict (TypeScript 7), rendu avec [lit-html](https://lit.dev/docs/libraries/standalone-templates/) et rendu réactif par [signals](https://github.com/preactjs/signals/tree/main/packages/core), lint et formatage par [Biome](https://biomejs.dev), code mort détecté par [knip](https://knip.dev), tests unitaires avec Vitest et tests e2e avec Playwright.

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

Le code est rangé par couche. Chaque couche n'importe que les couches au-dessus d'elle dans le tableau, et les imports circulaires sont interdits (règle Biome `noImportCycles`). Les modules de `device/` signalent ce qui se passe par callbacks ou par valeur de retour, `engine/` modifie l'état, et l'affichage se redessine seul : chaque zone de l'écran lit l'état dans un `watch`, qui la relance quand un champ lu change (une fois par tâche, même si plusieurs champs changent). Aucun module n'appelle le rendu, et les réglages se sauvegardent seuls.

| Chemin | Rôle |
| --- | --- |
| `src/types.ts`, `src/reactive.ts`, `src/state.ts` | Types partagés et listes de valeurs autorisées ; `reactive` (objet dont chaque champ est un signal) et `watch` (relance une fonction quand ce qu'elle a lu change) ; état affiché (`state` : phase, réplique en cours…) et mécanique sans affichage (`control` : jeton de séquence, minuteur…) |
| `src/data/scene.ts` | Texte de la scène, blocs, notes de jeu, plan de répétition |
| `src/domain/` | Logique pure, sans DOM et testée : comparaison de la réplique dite (`compare`, `numbers`, `names`), ordre des répliques d'une séance (`sequence`), comptage et maîtrise (`stats`), répliques (`lines`), dates (`dates`) |
| `src/storage/` | Données sur l'appareil, observées comme l'état : réglages et résultats validés au chargement et sauvegardés à chaque changement (`settings`, localStorage), enregistrements de ta voix (`recordings`, IndexedDB) |
| `src/device/` | Capacités de l'appareil (`platform`), voix du téléphone (`tts`), voix enregistrées (`clips`), lecteur audio (`player`), réplique dite par la meilleure voix disponible (`speak`), reconnaissance vocale (`listen`), micro (`recorder`), écran allumé (`wake-lock`) |
| `src/engine/` | Orchestration : moteur de répétition (`rehearsal`), lecture des passages (`passage`), arrêt commun de tout son (`sound`) |
| `src/ui/` | Rendu des écrans en templates lit-html, à partir des données et de l'état seulement, branché sur l'état par `render` : un fichier par zone (`top`, `jour`, `lire`, `repeter`, `dock`), morceaux partagés (`parts`), icônes SVG intégrées (`icons`). Chaque composant a sa feuille de style à côté de lui (`jour.css`…) |
| `src/app/` | Branchement de l'interface : actions des boutons (`actions`), évènements (`events`), réglages (`settings-dialog`), thème, service worker (`pwa`), version |
| `src/main.ts` | Démarrage, et import des feuilles de style dans l'ordre de la cascade |
| `src/styles/` | Styles communs : thème clair et sombre (`theme`), bases et mise en page (`base`), cartes et boutons (`cards`), choix segmentés (`controls`) |
| `index.html` | Coquille HTML (en-tête, barre de répétition, zone de texte, dock d'actions, navigation du bas, réglages) |
| `plugins/clips.ts` | Plugin Vite : module `virtual:clips`, liste des MP3 présents dans `public/audio/` |
| `*.test.ts` | Tests Vitest, à côté du module testé |
| `e2e/` | Tests Playwright (profil Pixel 7, date figée) |
| `public/audio/<voix>/L<réplique>_S<segment>.mp3` | Voix enregistrées : `F0` Denise, `F1` Vivienne, `F2` Charline, `F3` Ariane, `H0` Harpagon modèle |

Pour ajouter ou remplacer un clip, dépose simplement le MP3 dans `public/audio/<voix>/` : la liste des clips est relue à chaque build (et à chaud en dev). Le service worker est régénéré à chaque build, et seuls les fichiers modifiés sont re-téléchargés par les utilisateurs.

## Déploiement

Le site est entièrement statique. HTTPS est obligatoire (micro, service worker), ce que fournit Cloudflare.

**Cloudflare Workers** : Worker `souffleur`, servi sur https://souffleur.harpagon.workers.dev et relié au dépôt GitHub (Workers Builds) : chaque push sur `main` redéploie. `wrangler.jsonc` publie simplement `dist/` comme fichiers statiques. Pour le recréer : Workers & Pages → Create → Import a repository → `aurelienbouteiller/avare`, commande de build `npm run build`, commande de déploiement `npx wrangler deploy`, variables de build `NODE_VERSION=24` et `SKIP_INSTALL_SIMPLE_GIT_HOOKS=1`. Le commit affiché dans les réglages vient de `WORKERS_CI_COMMIT_SHA`.

`public/_headers` règle le cache : fichiers hashés de `assets/` en cache permanent, `index.html` et `sw.js` toujours revalidés pour que les mises à jour arrivent tout de suite.
