#!/usr/bin/env python3
"""Local PostgreSQL + Spring Boot + Next.js supervisor, without Docker."""
import argparse
import contextlib
import fcntl
import json
import hashlib
import os
from pathlib import Path
import platform
import re
import shutil
import signal
import socket
import subprocess
import sys
import tarfile
import tempfile
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
LOCAL = ROOT / ".local"
CHILDREN = []
LOGS = []
PG_STARTED = False
PG_BIN = None
PG_DATA = LOCAL / "postgres"


def say(message):
    print(message, flush=True)


def run(command, **kwargs):
    kwargs.setdefault("cwd", ROOT)
    return subprocess.run([str(x) for x in command], check=True, **kwargs)


def java_home():
    candidates = [os.environ.get("JAVA_HOME"), str(LOCAL / "jdk-11")]
    if shutil.which("java"):
        candidates.append(str(Path(shutil.which("java")).resolve().parent.parent))
    candidates += [str(p) for p in Path("/usr/lib/jvm").glob("*")]
    for candidate in candidates:
        if candidate and (Path(candidate) / "bin/java").is_file():
            result = subprocess.run([str(Path(candidate) / "bin/java"), "-version"], capture_output=True, text=True)
            if re.search(r'version "11\.', result.stderr + result.stdout):
                return Path(candidate)
    return None


def install_java():
    system = {"Linux": "linux", "Darwin": "mac"}.get(platform.system())
    arch = {"x86_64": "x64", "aarch64": "aarch64", "arm64": "aarch64"}.get(platform.machine())
    if not system or not arch:
        raise RuntimeError("Installez un JDK 11 et définissez JAVA_HOME pour cette plateforme.")
    say("Java 11 absent : téléchargement de Temurin dans .local/jdk-11 (premier lancement).")
    url = f"https://api.adoptium.net/v3/binary/latest/11/ga/{system}/{arch}/jdk/hotspot/normal/eclipse"
    with tempfile.TemporaryDirectory(dir=LOCAL) as temp:
        archive = Path(temp) / "jdk.tar.gz"
        if shutil.which("curl"):
            run(["curl", "--fail", "--location", "--retry", "2", "--max-time", "300", "--output", archive, url])
        else:
            request = urllib.request.Request(url, headers={"User-Agent": "TennisStats-LocalDev/1.0"})
            with urllib.request.urlopen(request, timeout=180) as response, archive.open("wb") as output:
                shutil.copyfileobj(response, output)
        unpacked = Path(temp) / "unpacked"
        unpacked.mkdir()
        with tarfile.open(archive) as tar:
            # Never allow archive members or links to escape the temporary directory.
            for member in tar.getmembers():
                target = (unpacked / member.name).resolve()
                if not target.is_relative_to(unpacked.resolve()):
                    raise RuntimeError("Archive Java invalide.")
                if member.islnk() or member.issym():
                    link = ((target.parent if member.issym() else unpacked) / member.linkname).resolve()
                    if not link.is_relative_to(unpacked.resolve()):
                        raise RuntimeError("Lien Java invalide.")
                if member.isdev():
                    raise RuntimeError("Archive Java invalide.")
            tar.extractall(unpacked)
        homes = list(unpacked.glob("*/Contents/Home")) or list(unpacked.glob("*"))
        home = next((p for p in homes if (p / "bin/java").exists()), None)
        if home is None:
            raise RuntimeError("JDK téléchargé non reconnu.")
        shutil.move(str(home), str(LOCAL / "jdk-11"))
    return LOCAL / "jdk-11"


def postgres_bin():
    expected = (PG_DATA / "PG_VERSION").read_text().strip() if (PG_DATA / "PG_VERSION").exists() else None
    candidates = [os.environ.get("PG_BIN")]
    if shutil.which("pg_ctl"):
        candidates.append(str(Path(shutil.which("pg_ctl")).parent))
    # Debian/Ubuntu keep server programs outside PATH.
    candidates += [str(p) for p in sorted(Path("/usr/lib/postgresql").glob("*/bin"), reverse=True)]
    candidates += ["/opt/homebrew/opt/postgresql@16/bin", "/usr/local/opt/postgresql@16/bin"]
    for candidate in candidates:
        if candidate and (Path(candidate) / "pg_ctl").is_file():
            version = subprocess.check_output([str(Path(candidate) / "pg_ctl"), "--version"], text=True)
            if expected is None or re.search(rf"\b{re.escape(expected)}\.", version):
                return Path(candidate)
    return None


def free_port(port):
    with socket.socket() as sock:
        try:
            sock.bind(("127.0.0.1", port))
        except OSError:
            raise RuntimeError(f"Le port {port} est déjà utilisé. Changez le port dans l'environnement ou arrêtez son serveur.")


def sql(text, database="tcb"):
    env = os.environ.copy()
    env["PGPASSWORD"] = os.environ.get("DB_PASSWORD", "tcb")
    return run([PG_BIN / "psql", "-X", "-h", "127.0.0.1", "-p", str(DB_PORT), "-U", "tcb", "-d", database,
                "-v", "ON_ERROR_STOP=1", "-At", "-c", text], env=env, capture_output=True, text=True).stdout.strip()


def start_postgres():
    global PG_STARTED
    socket_dir = LOCAL / "run"
    socket_dir.mkdir(mode=0o700, exist_ok=True)
    free_port(DB_PORT)
    if not (PG_DATA / "PG_VERSION").exists():
        say("Initialisation de PostgreSQL dans .local/postgres…")
        with tempfile.NamedTemporaryFile(mode="w", dir=LOCAL) as password:
            password.write(os.environ.get("DB_PASSWORD", "tcb") + "\n")
            password.flush()
            run([PG_BIN / "initdb", "-D", PG_DATA, "-U", "tcb", "--encoding=UTF8", "--locale=C",
                 "--auth-local=trust", "--auth-host=scram-sha-256", f"--pwfile={password.name}"])
    say(f"Démarrage de PostgreSQL sur 127.0.0.1:{DB_PORT}…")
    # pg_ctl's -o is parsed as shell text; reject unusual paths instead of interpolating them.
    if not re.fullmatch(r"[\w/ .-]+", str(socket_dir)):
        raise RuntimeError("Le chemin du projet contient des caractères non pris en charge par pg_ctl.")
    run([PG_BIN / "pg_ctl", "-D", PG_DATA, "-l", LOCAL / "logs/postgres.log",
         "-o", f"-h 127.0.0.1 -p {DB_PORT} -k '{socket_dir}'", "-w", "start"])
    PG_STARTED = True
    if sql("SELECT 1 FROM pg_database WHERE datname='tcb'", "postgres") != "1":
        sql("CREATE DATABASE tcb", "postgres")
    if sql("SELECT count(*) FROM information_schema.tables WHERE table_schema='public'") == "0":
        say("Création du schéma TCB dans la nouvelle base locale…")
        files = [ROOT / "crystal-ball/src/main/db" / name for name in [
            "create-extensions.sql", "create-types.sql", "create-tables.sql", "create-functions.sql",
            "create-views.sql", "initial-load.sql"]]
        files += [ROOT / "data-load/src/main/db/load-functions.sql"]
        # create-tables.sql already contains the historical migration columns.
        # One transaction: initialization either completes or leaves an empty schema.
        script = "\n".join(p.read_text() for p in files)
        env = os.environ.copy()
        env["PGPASSWORD"] = os.environ.get("DB_PASSWORD", "tcb")
        with (LOCAL / "logs/schema.log").open("w") as log:
            run([PG_BIN / "psql", "-X", "-h", "127.0.0.1", "-p", str(DB_PORT), "-U", "tcb", "-d", "tcb",
                 "-v", "ON_ERROR_STOP=1", "--single-transaction", "-f", "-"], input=script, text=True, env=env, stdout=log, stderr=log)
    if sql("SELECT to_regclass('public.player') IS NOT NULL") != "t":
        raise RuntimeError("La base locale contient un schéma inattendu ; elle n'a pas été modifiée.")
    say(f"Base locale prête : {sql('SELECT count(*) FROM player')} joueurs. Aucun import CSV automatique.")


def spawn(name, command, env, cwd=ROOT):
    log = (LOCAL / "logs" / f"{name}.log").open("w")
    LOGS.append(log)
    process = subprocess.Popen([str(x) for x in command], cwd=cwd, env=env,
                               stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
    CHILDREN.append((name, process))
    return process


def check_children():
    for name, process in CHILDREN:
        if process.poll() is not None:
            raise RuntimeError(f"Le serveur {name} s'est arrêté (code {process.returncode}). Voir .local/logs/{name}.log.")


def wait_http(url, timeout, healthy=False):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        check_children()
        try:
            with urllib.request.urlopen(url, timeout=3) as response:
                if response.status == 200 and (not healthy or json.load(response).get("status") == "UP"):
                    return
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
            pass
        time.sleep(1)
    raise RuntimeError(f"Délai de démarrage dépassé : {url}. Consultez .local/logs/.")


def cleanup():
    for _, process in reversed(CHILDREN):
        if process.poll() is None:
            with contextlib.suppress(ProcessLookupError):
                os.killpg(process.pid, signal.SIGTERM)
    for _, process in reversed(CHILDREN):
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            with contextlib.suppress(ProcessLookupError):
                os.killpg(process.pid, signal.SIGKILL)
            process.wait()
    if PG_STARTED:
        subprocess.run([str(PG_BIN / "pg_ctl"), "-D", str(PG_DATA), "-m", "fast", "-w", "stop"], stdout=subprocess.DEVNULL)
    for log in LOGS:
        log.close()


def main():
    global PG_BIN, DB_PORT
    parser = argparse.ArgumentParser(description="Démarrer Tennis Stats sans Docker (Linux/macOS).")
    parser.add_argument("--check", action="store_true", help="Vérifier les prérequis sans démarrer de serveur")
    parser.add_argument("--frontend-only", action="store_true", help="Démarrer Next.js seul ; API_BASE_URL configure une API existante")
    parser.add_argument("--skip-build", action="store_true", help="Réutiliser le JAR existant au lieu de reconstruire le backend")
    args = parser.parse_args()
    DB_PORT = int(os.environ.get("DB_PORT", "55432"))
    api_port = int(os.environ.get("API_PORT", "8080"))
    front_port = int(os.environ.get("FRONTEND_PORT", "3000"))
    if any(p < 1024 or p > 65535 for p in [DB_PORT, api_port, front_port]) or len({DB_PORT, api_port, front_port}) != 3:
        raise RuntimeError("DB_PORT, API_PORT et FRONTEND_PORT doivent être distincts et compris entre 1024 et 65535.")
    if not shutil.which("node") or not shutil.which("npm"):
        raise RuntimeError("Node.js 22+ et npm sont requis. Installez Node.js puis relancez ./dev.sh.")
    major = int(subprocess.check_output(["node", "--version"], text=True).strip().lstrip("v").split(".")[0])
    if major < 22:
        raise RuntimeError("Utilisez Node.js 22 ou plus récent.")
    PG_BIN = postgres_bin()
    java = java_home()
    if args.check:
        say(f"Node.js : {major}\nJava 11 : {java or 'sera téléchargé au premier lancement'}\nPostgreSQL : {PG_BIN or 'absent : installez PostgreSQL et/ou définissez PG_BIN'}")
        return 0 if args.frontend_only or PG_BIN else 1
    if not args.frontend_only and not PG_BIN:
        raise RuntimeError("PostgreSQL est requis. Ubuntu/Debian : sudo apt install postgresql postgresql-contrib. macOS : brew install postgresql@16. Ou définissez PG_BIN (dossier contenant initdb et pg_ctl).")
    LOCAL.mkdir(mode=0o700, exist_ok=True)
    (LOCAL / "logs").mkdir(exist_ok=True)
    # Lock held for the whole session; do not allow two launchers to manage the same cluster.
    with (LOCAL / "dev.lock").open("w") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise RuntimeError("Un lanceur Tennis Stats fonctionne déjà dans ce projet.")
        free_port(front_port)
        env = os.environ.copy()
        env["NEXT_TELEMETRY_DISABLED"] = "1"
        env["API_BASE_URL"] = os.environ.get("API_BASE_URL", f"http://127.0.0.1:{api_port}") if args.frontend_only else f"http://127.0.0.1:{api_port}"
        if not args.frontend_only:
            free_port(api_port)
            java = java or install_java()
            env["JAVA_HOME"] = str(java)
            env.setdefault("GRADLE_USER_HOME", str(LOCAL / "gradle"))
            if not args.skip_build:
                say("Construction de l’API et de l’importeur…")
                run([ROOT / "gradlew", ":tennis-stats:bootJar", ":data-load:installDist", "--no-daemon", "--max-workers=2"], env=env)
            jars = list((ROOT / "tennis-stats/build/libs").glob("*-api.jar"))
            if len(jars) != 1:
                raise RuntimeError("JAR API absent ou ambigu. Nettoyez les anciens JAR et relancez sans --skip-build.")
            start_postgres()
            env.update(SPRING_DATASOURCE_URL=f"jdbc:postgresql://127.0.0.1:{DB_PORT}/tcb",
                       SPRING_DATASOURCE_USERNAME="tcb", SPRING_DATASOURCE_PASSWORD=os.environ.get("DB_PASSWORD", "tcb"),
                       SERVER_ADDRESS="127.0.0.1", SERVER_PORT=str(api_port), SPRING_PROFILES_ACTIVE="local")
            say(f"Démarrage de l’API sur http://127.0.0.1:{api_port}…")
            spawn("api", [java / "bin/java", "-Xmx512m", "-jar", jars[0]], env)
            wait_http(f"http://127.0.0.1:{api_port}/actuator/health", 120, healthy=True)
        fingerprint = hashlib.sha256((ROOT / "frontend/package-lock.json").read_bytes()).hexdigest()
        marker = LOCAL / "frontend-dependencies.sha256"
        if not (ROOT / "frontend/node_modules/.package-lock.json").exists() or not marker.exists() or marker.read_text() != fingerprint:
            say("Installation des dépendances du front…")
            run(["npm", "ci", "--no-audit", "--no-fund", "--cache", str(LOCAL / "npm")], cwd=ROOT / "frontend", env=env)
            marker.write_text(fingerprint)
        say("Démarrage de Next.js…")
        spawn("frontend", ["node", ROOT / "frontend/node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", str(front_port)], env, ROOT / "frontend")
        wait_http(f"http://127.0.0.1:{front_port}", 120)
        say(f"\nPrêt : http://127.0.0.1:{front_port}\nJournaux : .local/logs/\nCtrl+C arrête les serveurs lancés ici. Les données PostgreSQL sont conservées.\n")
        while True:
            check_children()
            time.sleep(1)


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))
    try:
        sys.exit(main() or 0)
    except KeyboardInterrupt:
        say("\nArrêt des serveurs…")
    except (RuntimeError, subprocess.CalledProcessError, OSError, ValueError) as error:
        say(f"\nErreur : {error}")
        if isinstance(error, subprocess.CalledProcessError) and error.stderr:
            say(error.stderr)
        sys.exit(1)
    finally:
        cleanup()
