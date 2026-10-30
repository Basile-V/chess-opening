# Chess Opening

Explorateur d'ouvertures personnel, en français, utilisé hors partie. Il affiche le coup du répertoire selon la réponse adverse, puis un plan et les points forts et faibles de la position. Niveau visé : 1400-1900.

## Règles non négociables

- **Aucune requête réseau à l'exécution.** Pas d'API, pas de jeton, pas de CDN, pas de police distante, pas d'analytics. Tout est embarqué dans le build et précaché par le service worker.
- **Aucun lien avec chess.com** et aucun usage pendant une partie Live : le Fair Play de chess.com l'interdit. Ne pas ajouter d'import de parties ni de mode « en direct ».
- **Pas de moteur dans l'app.** Hors répertoire, l'app ne conseille aucun coup. Seule l'analyse structurelle reste active.
- `scripts/` est réservé au développement. Rien de ce dossier n'est importé par `src/`.

## Répertoire

- Blancs : 1.c4, puis `d4` dès que les Noirs jouent ou préparent `...d5`. Sinon Anglaise avec `g3` et `Fg2`.
- Noirs : 1...c5 contre tout, puis `...Cc6`, `...g6`, `...Fg7`. Benoni avec `...g6` contre 1.d4 2.d5, où `...Cc6` est impossible.
- Lignes de 8 à 12 coups, adaptées à 1400-1900 : préférer le coup au plan clair au coup le plus théorique.

## Données

- `src/data/repertoire.json` : `{ white: Line[], black: Line[] }`.
- Une ligne : `{ "moves": "c4 e6 Nc3 d5 d4", "sheet": "qgd", "notes": { "5": "..." } }`.
- `moves` est en SAN anglais depuis la position initiale. C'est la seule notation stockée.
- Les clés de `notes` sont des demi-coups, comptés à partir de 1. La note explique le coup joué à ce rang.
- L'ordre du fichier fait foi : le premier coup rencontré dans une position est le coup recommandé. Pour les réponses adverses, classer du plus courant au plus rare.
- Le répertoire est indexé par position (4 premiers champs du FEN), pas par arbre. Ne pas réécrire une ligne juste pour une transposition : l'index la reconnaît.
- `src/data/sheets.json` : une fiche par `sheet`. Tout `sheet` utilisé dans le répertoire doit exister.
- Une fiche peut porter `family`, l'identifiant d'une fiche plus générale. Quand plusieurs fiches restent possibles dans une position et partagent la même famille, c'est la fiche de famille qui s'affiche. Sinon la dernière fiche connue reste affichée.

## Contenu échiquéen

- Tout ajout passe par `npm test` puis `npm run check:evals`.
- Un coup signalé par `check:evals` est corrigé, ou justifié dans une note s'il est gardé pour une raison pratique.
- Ne jamais présenter un coup comme vérifié si sa position n'est pas couverte par le cache cloud : le script les liste à part.
- Une fiche décrit des plans, pas des variantes. Les faits doivent rester vrais pour toute position rattachée à cette fiche.

## Code

- React 19, TypeScript strict, Vite, `chess.js`, `react-chessboard`, CSS natif.
- Pas de routeur, de store, de framework CSS ni de lib UI. Une dépendance de plus doit se justifier par ce qu'elle évite d'écrire.
- La logique reste dans des fonctions pures hors des composants (`repertoire.ts`, `analysis.ts`) et testées avec `node:test`.
- Mobile d'abord. Toute action doit marcher au toucher, sans survol ni glisser-déposer.
- Accessibilité de base : vrais `<button>`, contraste lisible, libellés sur les boutons à icône.
- Interface en français. Afficher les coups en figurines via la fonction d'affichage existante, jamais en lettres.
- Un raccourci assumé avec une limite connue porte un commentaire `ponytail:` qui nomme la limite.
- TypeScript : `import type` pour les types, extension `.ts` dans les imports locaux (requis par `node --test`), pas d'`enum` (`erasableSyntaxOnly`), pas de `any`.

## React 19.3

Ces règles visent la version installée. Vérifier `package.json` avant de les appliquer à une autre version majeure.

### État

- La source de vérité tient dans `App` : `color`, `moves` (SAN joués) et la case sélectionnée. Rien d'autre n'est stocké.
- Tout le reste se calcule pendant le rendu : `explore(moves, color)`, `analyse(fen, color)`, coups légaux, flèche. Ne jamais copier une valeur dérivée dans un `useState`.
- Pas d'instance `Chess` dans l'état ni dans un `useRef` : elle est mutable. La recréer depuis `moves` ou le FEN quand il en faut une.
- État immuable : `[...moves, san]`, `moves.slice(0, n)`, jamais `push` ni `pop`.
- Un changement lié à une action se fait dans le gestionnaire d'événement, pas dans un effet. Exemple : changer de couleur remet `moves` à zéro dans le même gestionnaire.
- Remonter l'état au plus proche parent commun. Passer des props plutôt qu'un contexte : l'arbre est trop petit pour en justifier un.

### Effets

- `useEffect` sert uniquement à se synchroniser avec un système extérieur. L'app n'en a pas besoin aujourd'hui : un nouvel effet doit se justifier.
- Pas d'effet pour dériver des données, réagir à un état ou enchaîner des `setState`.
- Si un effet devient nécessaire : nettoyage obligatoire, et `useEffectEvent` pour lire une valeur récente sans l'ajouter aux dépendances.

### Rendu et performance

- Composants purs : aucun effet de bord pendant le rendu. `StrictMode` reste actif dans `main.tsx`.
- React Compiler n'est pas activé, et rejouer quelques dizaines de coups est négligeable. Pas de `useMemo`, `useCallback` ni `memo` sans lenteur mesurée.
- Clés stables : le SAN pour les réponses attendues, le numéro de demi-coup pour l'historique, qui ne s'allonge ou ne se tronque qu'à la fin.

### API de React 19

- `ref` est une prop ordinaire : pas de `forwardRef`.
- `<Context value={...}>` si un contexte devient nécessaire, pas `<Context.Provider>`.
- Pas de `use`, `Suspense`, `useActionState`, `useOptimistic`, `useFormStatus` ni Server Components : l'app n'a ni donnée asynchrone, ni formulaire, ni serveur.
- `Activity` et `ViewTransition` restent inutiles sauf besoin réel. Préférer une transition CSS.

### Composants

- Composants fonctions uniquement, props typées par un `type`, pas de `React.FC`.
- Extraire un composant quand un bloc a son propre rôle ou se répète, pas par réflexe. La logique reste dans `repertoire.ts` et `analysis.ts`.
- Rendu conditionnel explicite : `count > 0 && ...`, jamais un nombre seul à gauche de `&&`.
- Tous les boutons portent `type="button"`. Une bascule expose `aria-pressed`.

### react-chessboard 5

- Tout passe par la prop `options`. L'API diffère de la v4 : lire les types dans `node_modules/react-chessboard/dist` plutôt que se fier à un exemple ancien.
- `allowDrawingArrows: false` : seules les flèches du répertoire s'affichent.
- Le toucher passe par `onSquareClick`, le glisser par `onPieceDrop`. Les deux appellent la même fonction de coup.

## Commandes

```sh
npm run dev           # serveur de développement
npm test              # contrôles node:test
npm run check:evals   # coups du répertoire contre l'évaluation cloud Lichess (réseau, développement seulement)
npm run build         # vérification TypeScript et build
npm run deploy        # build puis déploiement Cloudflare Pages
```

## Git

- Conventional Commits : `feat`, `fix`, `docs`, `chore`, `test`, `refactor`. Le contenu du répertoire utilise `feat(repertoire)` ou `fix(repertoire)`.
- Avant tout commit : `npm test` et `npm run build`.
