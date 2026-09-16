# Tennis Stats — interface Next.js

Première interface en français, avec Next.js App Router, React et TypeScript :

- accueil GOAT : classement triable, pagination, surface, statut et recherche ;
- trois coefficients principaux et treize coefficients secondaires, réglages partageables par URL ;
- détail pondéré par joueur, barème standard issu de la base et points par saison ;
- classements ATP et Elo sur `/classements`, pagination et date de référence ;
- recherche de joueurs et navigation vers leur fiche ;
- statistiques de carrière et matchs filtrés par saison ;
- présentation responsive, états de chargement, liste vide et erreurs avec nouvelle tentative.

Les données affichées viennent de l'API Java. Aucune donnée de démonstration n'est
incluse dans l'application. Les fixtures des tests sont isolées dans `tests/`.

## Démarrer le projet complet

Depuis la racine du dépôt :

```sh
./dev.sh
```

Voir [le guide sans Docker](../docs/local-development.md).

## Démarrer seulement le front

Prérequis : Node.js 22+ et npm.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Ouvrir http://127.0.0.1:3000. L'API est attendue à `http://127.0.0.1:8080`.
Modifier `API_BASE_URL` dans `.env.local` pour utiliser un autre serveur.

Le navigateur appelle `/api/tennis/*` sur le serveur Next.js. Celui-ci relaie
uniquement les routes autorisées vers `/api/v1/*` sur l'API Java. L'adresse de
l'API reste côté serveur ; cette configuration ne requiert pas de CORS navigateur.

## Vérifier

```sh
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

Les dix tests navigateur couvrent ordinateur et mobile. Ils vérifient le parcours
GOAT → pondérations → détail des saisons, ainsi que
classement ATP/Elo → recherche → profil → filtre des matchs, la pagination, les erreurs,
la nouvelle tentative, les listes vides et le refus des routes de proxy non autorisées.
Les réponses de données sont simulées dans ces tests ; le démarrage réel et les
réponses vides ont également été vérifiés contre l'API Java et PostgreSQL locaux.

Pour servir la version de production : `npm run build`, puis `npm start`.

## Organisation

- `src/app/` : pages, layout et route de relais API.
- `src/components/` : classements, recherche et fiche joueur.
- `src/lib/api.ts` : types du contrat actuel et client HTTP.
- `src/app/globals.css` : présentation et adaptations mobiles.

Le dossier est autonome et peut être extrait dans un dépôt séparé. Les contrats
actuels reprennent les endpoints existants ; comparaison H2H, graphiques de carrière
et pages tournois restent à développer.

## Calcul GOAT

Le front appelle le moteur historique `GOATListService` via `GET /api/v1/goatListTable`.
Il ne recalcule pas les points en JavaScript. Les coefficients principaux pondèrent
les trois familles ; les coefficients secondaires pondèrent leurs composantes.
`× 0` exclut une composante. Les options historiques et l’extrapolation utilisent
également le moteur existant. La disponibilité des composantes varie selon la surface.

- `/goat` : classement pondéré ; `/` redirige vers cette page.
- `/joueurs/{id}/goat` : barème standard, sans extrapolation, filtre de surface.
- `GET /api/v1/players/{id}/goat?surface=C` : totaux, bonus de carrière et saisons.
- `GET /api/v1/goat/legend` : principaux barèmes standard lus dans PostgreSQL.

Les fiches individuelles ne reprennent pas les pondérations du classement.
Les bonus de carrière sont distincts des points de saison et les composantes
peuvent présenter des écarts d’arrondi. Les points nécessitent un import terminé,
y compris Elo, vues matérialisées et records. Les tests vérifient le contrat API
et la transmission des coefficients ; ils ne constituent pas un audit mathématique
de l’ensemble des formules historiques ni une validation de l’import complet.

Après cette mise à jour, arrêter le lanceur avec Ctrl+C dans son terminal, puis
relancer `./dev.sh` (sans `--skip-build`) pour charger les nouveaux endpoints.
Pour les tests sur un autre port : `TEST_PORT=3100 npm run test:e2e` après le build.
