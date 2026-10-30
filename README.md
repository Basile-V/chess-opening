# Chess Opening

Mon explorateur d'ouvertures aux échecs. Je saisis les coups de l'adversaire et l'app affiche le coup à jouer dans mon répertoire, puis le plan après l'ouverture et les points forts et faibles de ma position.

L'app est faite pour la préparation, **hors partie**. Le [Fair Play de chess.com](https://www.chess.com/legal/fair-play) interdit toute aide extérieure en partie Live.

## Répertoire couvert

- **Blancs** : 1.c4, avec passage au Gambit Dame ou à la Slave si les Noirs jouent `...d5`, sinon Anglaise avec `g3` et `Fg2`.
- **Noirs** : 1...c5 contre tout, avec `...Cc6`, `...g6`, `...Fg7`. Dragon Accéléré contre 1.e4, Benoni contre 1.d4 2.d5, Symétrique contre 1.c4.

## Fonctionnement

- Aucun compte, aucun jeton, aucune requête API : le répertoire est embarqué dans l'app.
- Marche sur ordinateur et téléphone, installable sur l'écran d'accueil.
- Hors ligne après la première visite.
- Hors répertoire, l'app ne conseille pas de coup, mais continue d'analyser la structure de la position.

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

`check:evals` utilise le réseau, en développement seulement. L'app livrée ne fait aucun appel.

## Modifier le répertoire

Tout se passe dans [src/data/repertoire.json](src/data/repertoire.json) et [src/data/sheets.json](src/data/sheets.json).

```json
{ "moves": "c4 e6 Nc3 d5 d4", "sheet": "qgd", "notes": { "5": "On rejoint le Gambit Dame." } }
```

- `moves` : la ligne en notation anglaise, depuis la position initiale.
- `sheet` : la fiche affichée pour cette ligne.
- `notes` : un commentaire par demi-coup, numéroté à partir de 1.

Le premier coup rencontré dans le fichier pour une position est le coup recommandé. Les transpositions sont reconnues automatiquement.

## Déployer

Déploiement sur Cloudflare Pages. Une seule connexion est nécessaire :

```sh
npx wrangler login
npm run deploy
```

Le site déployé est public à son URL. Il ne contient aucun secret.
