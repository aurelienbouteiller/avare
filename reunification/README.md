# Le souffleur des deux Corées

Appli web installable (PWA) pour répéter *La Réunification des deux Corées*, de Joël Pommerat. Elle reprend le
[souffleur d'Harpagon](../README.md) (même architecture, mêmes outils) et l'étend à une pièce chorale : une vingtaine
de scènes courtes, beaucoup de personnages, et chaque comédien qui joue plusieurs rôles d'une scène à l'autre.

- **Aujourd'hui** : compte à rebours jusqu'à la représentation, séance proposée selon ta maîtrise (revoir les
  répliques ratées, consolider la scène la moins sue, découvrir une scène nouvelle, puis filages), maîtrise par scène,
  régularité sur deux semaines.
- **Lire** : la pièce scène par scène, tes répliques en couleur, didascalies en marge, tes notes de jeu par scène ;
  touche une réplique pour l'entendre, ou écoute tout le passage.
- **Répéter** : les partenaires donnent la réplique (voix du téléphone, une voix et une hauteur par personnage), tu dis
  la tienne, masquée à divers degrés. Vérification manuelle, à la voix (reconnaissance vocale) ou en t'enregistrant.
  Mains libres et partenaire imprévisible comme dans le souffleur d'Harpagon.
- **Rôles** : import du texte et distribution (les personnages que tu joues, scène par scène).

## Le texte de la pièce

Le texte de Joël Pommerat est protégé par le droit d'auteur : **il n'est pas dans ce dépôt**. Chaque comédien importe
le texte de son édition dans l'écran Rôles (fichier `.txt` ou copier-coller) ; il reste sur son appareil
(`localStorage`) et n'est envoyé nulle part. En attendant, un court texte d'exemple, écrit pour l'appli
(`src/data/demo.ts`), permet de l'essayer.

Format attendu (voir aussi l'aide de l'écran Rôles) :

```text
# Titre de la scène

(Didascalie, seule sur sa ligne.)

LA FEMME. Première réplique.
Elle peut tenir sur plusieurs lignes.
LE MARI (à voix basse). Réponse.
LA FEMME
Le nom peut aussi être seul sur sa ligne.
```

Une scène commence par `#` suivi de son titre (ou par « Scène 3 »). Une réplique commence par le nom du personnage en
capitales, suivi d'un point, de deux-points ou d'un tiret, ou seul sur sa ligne. Une ligne entre parenthèses ou
crochets est une didascalie ; dans une réplique, une parenthèse est une didascalie qu'on ne dit pas. Les retours à la
ligne du texte sont gardés.

Un rôle est un personnage *dans une scène* (`titre de scène|PERSONNAGE`) : « La femme » d'une scène n'est pas jouée par
la même comédienne que « La femme » d'une autre. Résultats et enregistrements sont rangés sous un identifiant tiré du
personnage et du texte de la réplique : réimporter le texte (corrigé, complété) les conserve pour les répliques
inchangées.

## Développement

Même outillage que le souffleur d'Harpagon (Node 24, TypeScript strict, Lit, Tailwind, signals, Biome, knip, Vitest,
Playwright). La configuration Biome est celle de la racine du dépôt. Toutes les commandes se lancent dans ce dossier :

```sh
cd reunification
npm install
npm run dev        # http://localhost:5173
npm run check      # Biome, typecheck, knip et tests unitaires
npm run e2e        # tests Playwright sur le build de production
npm run build      # typecheck, tests, puis build de production dans dist/
```

GitHub Actions lance `npm run check` et les tests e2e de ce dossier sur chaque push et pull request.

## Organisation

Les couches sont celles du souffleur d'Harpagon. Ce qui change :

| Chemin | Rôle |
| --- | --- |
| `src/domain/parse.ts` | Lecture du texte importé : scènes, personnages, répliques, didascalies, identifiants stables |
| `src/domain/lines.ts` | Clé d'un rôle, nom affiché, réplique d'appel (en sautant les didascalies) |
| `src/domain/suggest.ts` | Séance proposée d'après la maîtrise de chaque scène et les jours restants |
| `src/domain/timbre.ts` | Hauteur de voix et voix du téléphone attribuées à chaque personnage |
| `src/storage/play.ts` | Texte gardé sur l'appareil, pièce lue (signal), mes rôles, mes scènes, séance du jour |
| `src/data/demo.ts` | Texte d'exemple, original |
| `src/data/masks.ts` | Masques de mes répliques et seuils de la vérification à la voix |
| `src/ui/roles.ts` | Écran Rôles : import avec aperçu, distribution |

Il n'y a pas de voix enregistrées (pas de `public/audio/`) : les partenaires parlent avec la synthèse vocale du
téléphone, ou se lisent si elle manque.

## Déploiement

Site statique, à publier comme le souffleur d'Harpagon sur Cloudflare Workers, avec un Worker distinct :
Workers & Pages → Create → Import a repository → `aurelienbouteiller/avare`, **dossier racine `reunification`**,
commande de build `npm run build`, commande de déploiement `npx wrangler deploy` (Worker `reunification`, voir
`wrangler.jsonc`), variable de build `NODE_VERSION=24`.
