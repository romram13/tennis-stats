# Tennis Stats — interface Next.js

Première interface en français, avec Next.js App Router, React et TypeScript :

- classements ATP et Elo, pagination et date de référence ;
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

Les six tests navigateur couvrent ordinateur et mobile. Ils vérifient le parcours
classement → recherche → profil → filtre des matchs, la pagination, les erreurs,
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
