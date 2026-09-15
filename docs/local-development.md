# Lancer Tennis Stats sans Docker

## Une seule commande

À la racine du dépôt :

```sh
./dev.sh
```

Puis ouvrir **http://127.0.0.1:3000**.

Le script :

1. vérifie Node.js, PostgreSQL et les ports disponibles ;
2. utilise un JDK 11 existant ou télécharge Temurin 11 dans `.local/jdk-11` ;
3. construit le JAR de l'API et l'importeur avec Gradle ;
4. initialise, si nécessaire, un cluster PostgreSQL propre au projet dans `.local/postgres` ;
5. crée la base `tcb` et son schéma lorsqu'elle est vide, dans une transaction ;
6. démarre l'API et attend sa réponse de santé ;
7. installe les dépendances npm si nécessaire et démarre Next.js.

**Ctrl+C arrête les serveurs lancés par le script.** Les données restent sur disque.
Le script ne démarre ni ne modifie le service PostgreSQL système. Un port déjà
occupé provoque une erreur ; aucun processus existant n'est arrêté pour libérer un port.
Un verrou empêche deux lanceurs de gérer simultanément le même cluster.

Le premier lancement nécessite Internet et peut prendre quelques minutes pour
Java, Gradle et npm. Les lancements suivants réutilisent les fichiers téléchargés.

## Prérequis

- Linux ou macOS ; sous Windows, utiliser WSL.
- Python 3.10+, Node.js 22+ avec npm.
- PostgreSQL installé, avec `initdb`, `pg_ctl`, `psql` et l'extension `pg_trgm`.

Vérification seule, sans démarrer de serveur :

```sh
./dev.sh --check
```

Si PostgreSQL manque, l'installer une fois :

```sh
# Ubuntu / Debian
sudo apt install postgresql postgresql-contrib

# macOS avec Homebrew
brew install postgresql@16
```

Les binaires Debian/Ubuntu et Homebrew courants sont détectés automatiquement.
Pour une autre installation :

```sh
PG_BIN=/chemin/vers/postgresql/bin ./dev.sh
```

Le lanceur réutilise la version majeure qui a créé `.local/postgres` ; changer de
version PostgreSQL nécessite une vraie migration du cluster, pas un changement de binaire.

## Ports et fichiers

| Service | Adresse par défaut |
| --- | --- |
| Interface Next.js | `http://127.0.0.1:3000` |
| API Java | `http://127.0.0.1:8080/api/v1` |
| Santé de l'API | `http://127.0.0.1:8080/actuator/health` |
| PostgreSQL | `127.0.0.1:55432`, base `tcb`, utilisateur `tcb` |

Le mot de passe local par défaut est `tcb`. `DB_PASSWORD` permet d'en choisir un
au premier lancement ; réutiliser ensuite la même valeur. Modifier cette variable
ne change pas le mot de passe d'un cluster déjà créé.

Les services écoutent uniquement sur `127.0.0.1`. Cette configuration vise le
développement local, pas le déploiement public.

Les journaux sont dans `.local/logs/api.log`, `frontend.log`, `postgres.log` et
`schema.log`. Le dossier `.local/` est ignoré par Git. **Ne pas le supprimer pour
faire du nettoyage : il contient la base de données.**

Options utiles :

```sh
# Réutiliser le JAR existant si le backend n'a pas changé
./dev.sh --skip-build

# Changer les ports
FRONTEND_PORT=3001 API_PORT=8081 DB_PORT=55433 ./dev.sh

# Utiliser votre JDK 11
JAVA_HOME=/chemin/vers/jdk-11 ./dev.sh

# Front seul, branché sur une API déjà démarrée
API_BASE_URL=http://127.0.0.1:8080 ./dev.sh --frontend-only
```

Ces variables sont lues depuis l'environnement du terminal. Le lanceur ne charge
pas un fichier `.env` racine. Next.js peut lire `frontend/.env.local` lorsqu'il est
lancé séparément ; le lanceur complet configure lui-même l'adresse de l'API.

## Pourquoi les classements sont-ils vides au premier lancement ?

Le script crée le schéma, **sans importer automatiquement l'historique ATP**.
Les pages affichent alors un état vide, sans inventer de statistiques.

Pour charger la source, laisser `./dev.sh` en cours et ouvrir un second terminal
à la racine du projet :

```sh
mkdir -p data
git clone https://github.com/elitemajik-ship-it/tennis_atp.git data/tennis_atp

# Si vous avez déjà JAVA_HOME, conserver sa valeur.
# Sinon, le lanceur a installé Java ici :
export JAVA_HOME="$PWD/.local/jdk-11"

data-load/build/install/data-load/bin/data-load \
  -url jdbc:postgresql://127.0.0.1:55432/tcb \
  -bd "$PWD/data/tennis_atp" -f -lt
```

Adapter le port si `DB_PORT` a été modifié. Pour un mot de passe personnalisé,
l'importeur accepte `-p`. L'import complet inclut les calculs Elo et records et
peut être long. Ses limites et la différence entre import complet et delta sont
détaillées dans [le guide du backend](backend-migration.md).

Après import, redémarrer `./dev.sh` pour renouveler les caches de l'API.
L'intégralité de l'import historique n'a pas été validée dans ce lot front/lanceur.

## Vérifications réalisées

- compilation de production Next.js et vérification TypeScript ;
- six tests navigateur Chromium sur ordinateur et mobile ;
- démarrage réel PostgreSQL → API Java → Next.js ;
- réponse du classement vide à travers le relais Next.js ;
- initialisation atomique du schéma dans une base PostgreSQL neuve ;
- arrêt libérant les trois ports et conservation du cluster pour le redémarrage.
