# Chess Opening

Mon explorateur d'ouvertures aux échecs. Je saisis les coups de l'adversaire et l'app affiche le coup à jouer dans mon répertoire, puis le plan après l'ouverture et les points forts et faibles de ma position.

L'app est faite pour la préparation, **hors partie**. Le [Fair Play de chess.com](https://www.chess.com/legal/fair-play) interdit toute aide extérieure en partie Live.

## Répertoire couvert

- **Blancs** : 1.d4 puis 2.c4, le Gambit Dame. Contre 1...♞f6 2.c4 e6, `♞f3` évite la Nimzo-Indienne. Les réponses indiennes, Grünfeld, Benoni, Budapest et Hollandaise sont couvertes.
- **Noirs** : 1...c5 contre tout, avec `...Cc6`, `...g6`, `...Fg7`. Dragon Accéléré contre 1.e4, Benoni contre 1.d4 2.d5, Symétrique contre 1.c4.

## Fonctionnement

- Le répertoire est embarqué dans l'app : il fonctionne sans compte, sans jeton et sans réseau.
- Marche sur ordinateur et téléphone, installable sur l'écran d'accueil.
- Hors ligne après la première visite.
- Hors répertoire, l'app interroge l'explorateur Lichess et classe les coups selon les résultats des joueurs de 1400 à 1999. Ce sont des statistiques, pas une analyse moteur. L'analyse de la structure reste toujours active.

## Jeton Lichess

L'explorateur Lichess demande un jeton personnel gratuit, à créer sur [lichess.org/account/oauth/token](https://lichess.org/account/oauth/token). Il est gardé dans un secret Cloudflare et lu par le Worker [worker/index.ts](worker/index.ts). Le navigateur ne le voit jamais.

Dans Workers & Pages > chess-opening > Settings > Variables & Secrets, ajoute `LICHESS_TOKEN` de type Secret. Une variable de la section Build ne suffit pas : elle n'existe que pendant le build. **Ne mets jamais le jeton dans le code ni dans un fichier suivi par Git : le site est public.**

En local, `npm run dev:worker` lit le jeton dans un fichier `.dev.vars`, ignoré par Git :

```sh
LICHESS_TOKEN=ton_jeton
```

L'adresse `/api/explorer` reste publique : un script pourrait consommer ton quota Lichess. Si cela arrive, protège le site avec Cloudflare Access.

## Lancer le projet

Node 24 ou plus récent.

```sh
npm install
npm run dev
```

## Vérifier

```sh
npm test              # lignes légales, fiches existantes, analyse
npm run check:evals   # compare les coups conseillés à l'évaluation cloud Lichess
npm run build
```

`check:evals` utilise le réseau, en développement seulement. L'app livrée n'appelle que sa route `/api/explorer`, et seulement hors répertoire.

## Modifier le répertoire

Tout se passe dans [src/data/repertoire.json](src/data/repertoire.json) et [src/data/sheets.json](src/data/sheets.json).

```json
{ "moves": "d4 d5 c4 e6 Nc3", "sheet": "qgd", "notes": { "3": "Le Gambit Dame." } }
```

- `moves` : la ligne en notation anglaise, depuis la position initiale.
- `sheet` : la fiche affichée pour cette ligne.
- `notes` : un commentaire par demi-coup, numéroté à partir de 1.

Le premier coup rencontré dans le fichier pour une position est le coup recommandé. Les transpositions sont reconnues automatiquement.

## Déployer

Le site est un Worker Cloudflare relié au dépôt GitHub : chaque push sur `main`, donc chaque merge, le construit et le déploie.

Réglages à garder dans Workers & Pages > chess-opening > Settings > Build :

- Build command : `npm test && npm run build`. Si les tests échouent, rien n'est publié.
- Deploy command : `npx wrangler deploy`.

Pour déployer à la main : `npx wrangler login` puis `npm run deploy`.

Le site est public à son URL. Le jeton Lichess reste côté serveur.
