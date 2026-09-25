# Migration du backend

## État de ce premier lot

Le backend conserve Java 11, Spring Boot 2.4.2, PostgreSQL et les calculs existants.
Les contrôleurs de pages, templates Thymeleaf, assets statiques et dépendances WebJars
ont été supprimés. Les contrôleurs JSON existants sont disponibles sous `/api/v1`.
Le JAR Spring Boot exécutable est activé ; le démarrage ne sélectionne plus les
profils DigitalOcean, jobs et SSL de l'installation d'origine.

Cette étape ne constitue pas encore une modernisation des versions Java/Spring.
Le plugin de métadonnées Git, dont une dépendance est introuvable, et les références
à JCenter ont été retirés pour rétablir la construction.

## Construire et démarrer

Prérequis : JDK 11, accès aux dépôts Maven/Gradle, base PostgreSQL avec le schéma TCB.

```sh
./gradlew test :tennis-stats:bootJar :data-load:installDist
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/tcb \
SPRING_DATASOURCE_USERNAME=tcb \
SPRING_DATASOURCE_PASSWORD=tcb \
API_ALLOWED_ORIGINS=http://localhost:3000 \
java -jar tennis-stats/build/libs/tennis-stats-1.0-SNAPSHOT-api.jar
```

`API_ALLOWED_ORIGINS` est une liste d'origines séparées par des virgules. Vide par
défaut, elle n'autorise aucun accès navigateur depuis une autre origine.
Les identifiants ci-dessus sont les valeurs de développement historiques.

Le backend requiert une base initialisée. Pour une **nouvelle base vide** `tcb`,
les commandes existantes permettent d'installer les extensions et le schéma :

```sh
data-load/build/install/data-load/bin/data-load -ie -cd
```

Les extensions requièrent les droits PostgreSQL appropriés. Ne pas lancer cette
initialisation sur une base existante. Le Docker Compose historique utilise une
image de données ancienne ; il ne constitue pas une validation de la nouvelle source.

## Source et import

```sh
mkdir -p data
git clone https://github.com/elitemajik-ship-it/tennis_atp.git data/tennis_atp
git -C data/tennis_atp rev-parse HEAD
data-load/build/install/data-load/bin/data-load -bd "$PWD/data/tennis_atp" -f -lt
```

Conserver le SHA affiché avec les journaux d'import pour identifier la version des
données. Le chargeur lit ce dossier local ; il ne télécharge pas implicitement les
CSV et ne modifie pas le dépôt source. Le dossier `data/` est ignoré par Git.

Après mise à jour du checkout :

```sh
git -C data/tennis_atp pull --ff-only
data-load/build/install/data-load/bin/data-load -bd "$PWD/data/tennis_atp" -ln
```

- Joueurs : en-tête actuel `player_id,name_first,name_last,hand,dob,ioc,height,wikidata_id`.
  Les alias de colonnes sont normalisés. Les champs supplémentaires sont ignorés
  par les procédures actuelles ; taille et identifiant Wikidata ne sont pas importés.
  Les codes pays non reconnus par le référentiel historique sont signalés dans les
  logs et remplacés par `???` (notamment LEB et BIR dans le fichier vérifié).
  Le code historique `GDR` est reconnu et conservé comme Allemagne de l'Est ;
  le code ISO allemand actuel sert uniquement à l'affichage. Les valeurs `???`
  déjà enregistrées avant cette correction ne sont pas réparées automatiquement.
- Classements : en-tête `ranking_date,rank,player,points` ; les fichiers historiques
  sans en-tête restent acceptés sans perdre leur première ligne.
- Matchs : découverte des fichiers `atp_matches_YYYY.csv`, sans année finale codée en dur.
  Qualifications, Challengers, Futures et doubles ne sont pas chargés.
  Le niveau source `O` des Jeux olympiques est accepté, en plus de l'ancien
  classement `A` avec un nom contenant `Olympics`.
- Import complet : tous les fichiers de saisons disponibles et classements par décennie.
- Import delta : joueurs, classements courants et les deux dernières saisons disponibles.
  Pour répercuter des corrections plus anciennes, relancer un import complet.
- Les erreurs des lots SQL sont propagées à l'appelant. L'import n'est pas atomique :
  des lots précédents peuvent avoir été validés avant une erreur.

Après l'échec d'un import complet, corriger le problème puis relancer `-f -lt`,
sans supprimer la base. Les procédures fusionnent les matchs déjà présents.
`-ln` ne suffit pas à reprendre un historique incomplet : seules les deux dernières
saisons disponibles sont relues.

Si l'import échoue avec `invalid input value for enum tournament_entry: "ITF"`,
mettre à jour le type de la base existante avant de reprendre. La migration
conserve aussi les autres codes source récents (`UP`, `NG`, `W`, `L`) :

```sh
PGPASSWORD="${DB_PASSWORD:-tcb}" psql -X -h 127.0.0.1 -p "${DB_PORT:-55432}" \
  -U tcb -d tcb -v ON_ERROR_STOP=1 \
  -f crystal-ball/src/main/db/migration/V1.0.3__tournament_entry_source_codes.sql
```

Puis relancer l'import complet `-f -lt` avec les mêmes paramètres de connexion
et de répertoire CSV. Ne pas supprimer la base ; les lots déjà validés sont
fusionnés lors de la reprise. Le schéma des nouvelles bases inclut ces codes.

Les commandes `-lt` et `-ln` n'exécutent plus les scrapers ATP/Wikipédia ni les scripts
de corrections destinés à l'ancien snapshot. Les commandes historiques explicites
(`-nr`, `-nt`, `-lp`, etc.) et les jobs du profil `jobs` restent du code legacy :
ne pas activer ce profil pour synchroniser les CSV. Les calculs Elo, vues matérialisées
et records sont conservés après import. `-rc` actualise également les vues sans
réappliquer les corrections historiques.

Les imports excluent `player-aliases-missing-players.sql`, `player-data.xml`,
`fix-rank-points.sql`, `rankings-pre-atp.sql`, les tournois XML/ATP complémentaires,
`correct-data-full.sql`, `correct-data-delta.sql`, `tournament-event-surfaces.sql`
et `tournament-map-properties.sql`. Les normalisations du lecteur CSV restent
actives. Le référentiel local `team-tournament-winners.sql` reste utilisé par les
calculs de titres par équipe : il ne recherche aucun joueur ni événement absent
et ne déclenche aucun téléchargement. Les CSV de simples ne suffisent pas à
reconstituer les vainqueurs des compétitions par équipe, qui incluent des doubles.

La couverture historique et les points GOAT peuvent donc différer de l'ancien
site, notamment pour les classements pré-ATP et les événements absents des CSV.
Une base existante conserve les anciens enrichissements déjà importés ; relancer
l'import ne les supprime pas et ne garantit pas un résultat identique à une base
neuve alimentée uniquement par le nouveau pipeline.

Après mise à jour du code, reconstruire impérativement l'importeur avant de
reprendre un import échoué (sans supprimer la base) :

```sh
./gradlew :data-load:installDist
```

Puis relancer `-bd "$PWD/data/tennis_atp" -f -lt` avec les paramètres de connexion
habituels. La reprise recalcule les Elo, vues et records après lecture des CSV.

Les procédures SQL historiques restent en place : elles ne garantissent pas la
propagation de toutes les corrections (certains champs joueurs ne sont complétés
que s'ils sont absents) ni la suppression de matchs retirés de la source.

## Consommer l'API

Exemples avec un identifiant **interne TCB**, distinct de l'identifiant du CSV :

```sh
curl 'http://localhost:8080/api/v1/autocompletePlayer?term=Alcaraz'
curl 'http://localhost:8080/api/v1/players/1'
curl 'http://localhost:8080/api/v1/players/1/seasons'
curl 'http://localhost:8080/api/v1/matchesTable?playerId=1&current=1&rowCount=20'
curl 'http://localhost:8080/actuator/health'
```

Les anciens endpoints JSON conservent leurs noms et paramètres sous le nouveau
préfixe. Les formats Bootgrid (`current`, `rowCount`, `rows`, `total`) et tableaux
de graphiques restent provisoirement présents. Les anciennes routes de pages
(`/`, `/playerProfile`, etc.) n'existent plus ; leurs fonctionnalités doivent être
exposées progressivement par des contrats JSON dédiés à partir des services conservés.

La maintenance répond en JSON avec HTTP 503 et `Retry-After`, sans redirection HTML.
Les erreurs traitées par `/error` sont également JSON. Les endpoints Actuator exposés
par défaut sont `health`, `info` et `prometheus`.

## Validation et suite

Les tests ajoutés couvrent les en-têtes CSV réels, les fichiers sans en-tête, la
sélection des saisons, le préfixe API, les joueurs absents et les origines CORS.
Validation locale : 119 tests réussis, 1 ignoré et distributions générées. La lecture et la
conversion des CSV réels ont également été vérifiées : 66 820 joueurs, 29 681
classements courants et 1 169 lignes de matchs 2026, sans écriture en base.

Les tests utilisent des fixtures et des services simulés : une importation PostgreSQL
complète reste nécessaire pour vérifier les identifiants, les nouveaux événements,
les mises à jour répétées et les résultats des calculs sur cette source.

Prochains lots :

1. Valider l'import complet et delta dans une base isolée, tracer SHA et volumes.
2. Migrer Java/Spring/Gradle, remplacer les déploiements et jobs hérités.
3. Définir OpenAPI et des DTO indépendants de Bootgrid/Google Charts, compléter la
   couverture fonctionnelle des anciennes pages (H2H, profils détaillés, prévisions).
4. Compléter le [front Next.js existant](../frontend/README.md), puis générer son client
   depuis OpenAPI ; son dossier autonome pourra être extrait dans un dépôt séparé.

Le README de la [source de données](https://github.com/elitemajik-ship-it/tennis_atp#license)
indique CC BY-NC-SA 4.0. Le [projet d'origine](https://github.com/mcekovic/tennis-crystal-ball#license)
distingue la licence Apache 2.0 du code et CC BY-NC-SA de certains algorithmes.
Ces mentions sont à prendre en compte si la viabilité visée inclut un usage commercial.
