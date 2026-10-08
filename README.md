# Le souffleur d'Harpagon

Appli web installable (PWA) pour apprendre le rôle d'Harpagon dans *L'Avare*, acte II, scène 5.

- **Aujourd'hui** : plan de répétition jour par jour, maîtrise par bloc, calendrier.
- **Lire** : la scène découpée en 6 blocs, avec notes de jeu ; touche une réplique pour l'entendre.
- **Répéter** : Frosine donne la réplique (voix enregistrées ou voix du téléphone), tu dis la tienne, masquée à divers degrés. Vérification manuelle, à la voix (reconnaissance vocale) ou en t'enregistrant.

Thème « velours et or » sombre par défaut, thème clair ou automatique dans les réglages.

Tout est stocké sur l'appareil (`localStorage` pour les résultats, IndexedDB pour les enregistrements). Une fois chargée, l'appli fonctionne hors ligne, sauf la vérification à la voix.

## Développement

Node 20 ou plus récent.

```sh
npm install
npm run dev        # serveur de dev sur http://localhost:5173
npm run build      # build de production dans dist/
npm run preview    # sert dist/ sur http://localhost:4173 (service worker actif)
```

## Organisation

| Chemin | Rôle |
| --- | --- |
| `index.html` | Coquille HTML (en-tête, barre de répétition, zone de texte, dock d'actions, navigation du bas, réglages) |
| `src/main.js` | Démarrage, interactions, réglages, enregistrement du service worker |
| `src/data/scene.js` | Texte de la scène, blocs, notes de jeu, plan de répétition |
| `src/engine.js` | Moteur de répétition et lecture des passages |
| `src/audio.js` | Voix enregistrées (chargement, préchargement) et voix du téléphone |
| `src/compare.js` | Comparaison de la réplique dite avec le texte |
| `src/listen.js`, `src/recorder.js` | Reconnaissance vocale, enregistrement de ta voix |
| `src/render.js` | Rendu des écrans |
| `src/icons.js` | Icônes SVG intégrées (fonctionnent hors ligne) |
| `src/store.js`, `src/state.js` | Données sauvegardées, état d'exécution partagé |
| `public/audio/<voix>/L<réplique>_S<segment>.mp3` | Voix enregistrées : `F0` Denise, `F1` Vivienne, `F2` Charline, `F3` Ariane, `H0` Harpagon modèle |

Pour ajouter ou remplacer un clip, dépose le MP3 dans `public/audio/<voix>/` et ajoute son identifiant dans `src/data/clips.json`. Le service worker est régénéré à chaque build, et seuls les fichiers modifiés sont re-téléchargés par les utilisateurs.

## Déploiement

Le site est entièrement statique. HTTPS est obligatoire (micro, service worker), ce que fournissent les deux plateformes.

**Netlify** : importer le dépôt GitHub. `netlify.toml` fixe déjà la commande (`npm run build`), le dossier publié (`dist`) et la version de Node.

**Cloudflare Pages** : Workers & Pages → Create → Pages → connecter le dépôt, préréglage *Vite* (ou commande `npm run build`, dossier de sortie `dist`), variable d'environnement `NODE_VERSION=20`.

Dans les deux cas, `public/_headers` règle le cache : fichiers hashés de `assets/` en cache permanent, `index.html` et `sw.js` toujours revalidés pour que les mises à jour arrivent tout de suite.
