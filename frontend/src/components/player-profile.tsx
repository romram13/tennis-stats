"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  api,
  date,
  number,
  type Player,
  type Match,
  type Page,
} from "@/lib/api";
const surfaces: Record<string, string> = {
  H: "Dur",
  C: "Terre battue",
  G: "Gazon",
  P: "Moquette",
};
export function PlayerProfile({ id }: { id: string }) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [seasons, setSeasons] = useState<number[]>([]);
  const [season, setSeason] = useState("");
  const [page, setPage] = useState(1);
  const [matches, setMatches] = useState<Page<Match> | null>(null);
  const [error, setError] = useState("");
  const [matchError, setMatchError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setPlayer(null);
    setError("");
    Promise.all([
      api<Player>(`players/${id}`, controller.signal),
      api<number[]>(`players/${id}/seasons`, controller.signal),
    ])
      .then(([person, years]) => {
        setPlayer(person);
        setSeasons([...years].sort((a, b) => b - a));
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      });
    return () => controller.abort();
  }, [id, reload]);
  useEffect(() => {
    const controller = new AbortController();
    setMatches(null);
    setMatchError("");
    api<Page<Match>>(
      `matchesTable?playerId=${id}&current=${page}&rowCount=20${season ? `&season=${season}` : ""}`,
      controller.signal,
    )
      .then(setMatches)
      .catch((reason) => {
        if (!controller.signal.aborted) setMatchError(reason.message);
      });
    return () => controller.abort();
  }, [id, season, page, reload]);
  return (
    <div className="container profile">
      <Link className="back" href="/">
        ← Retour aux classements
      </Link>
      {error ? (
        <div className="panel empty" role="alert">
          <h1>Profil indisponible</h1>
          <p>{error}</p>
          <button className="button" onClick={() => setReload((x) => x + 1)}>
            Réessayer
          </button>
        </div>
      ) : !player ? (
        <div className="loading" role="status">
          Chargement du profil…
        </div>
      ) : (
        <>
          <section className="profile-hero">
            <div>
              <p className="eyebrow">LE PARCOURS D’UN JOUEUR</p>
              <h1>{player.name}</h1>
              <Link href={`/joueurs/${id}/goat`}>Points GOAT et détail par saison →</Link>
              <p className="player-details">
                {player.country?.id || "Pays non renseigné"}
                {player.age ? ` · ${player.age} ans` : ""}
                {player.height ? ` · ${player.height} cm` : ""}
                {player.handName
                  ? ` · ${player.handName === "Right-handed" ? "Droitier" : player.handName === "Left-handed" ? "Gaucher" : player.handName}`
                  : ""}
              </p>
            </div>
            <span className="profile-monogram" aria-hidden="true">
              {player.name
                .split(" ")
                .map((x) => x[0])
                .slice(0, 2)
                .join("")}
            </span>
          </section>
          <div className="metrics">
            {[
              ["Classement ATP", number(player.currentRank)],
              ["Meilleur rang", number(player.bestRank)],
              ["Titres", number(player.titles, true)],
              ["Grands Chelems", number(player.grandSlams, true)],
            ].map(([label, value]) => (
              <div className="metric" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <section className="matches">
            <div className="section-heading">
              <div>
                <p className="eyebrow">SUR LE COURT</p>
                <h2>Les matchs</h2>
              </div>
              <label className="season-label">
                Saison
                <select
                  value={season}
                  onChange={(event) => {
                    setSeason(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Toutes les saisons</option>
                  {seasons.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="panel">
              {matchError ? (
                <div className="empty" role="alert">
                  <p>{matchError}</p>
                  <button
                    className="button"
                    onClick={() => setReload((x) => x + 1)}
                  >
                    Réessayer
                  </button>
                </div>
              ) : !matches ? (
                <div className="loading" role="status">
                  Chargement des matchs…
                </div>
              ) : !matches.rows.length ? (
                <div className="empty">
                  <h3>Aucun match à afficher.</h3>
                  <p>Essayez une autre saison.</p>
                </div>
              ) : (
                <>
                  <div className="match-list">
                    {matches.rows.map((match) => {
                      const won = match.winner.id === player.id;
                      const opponent = won ? match.loser : match.winner;
                      return (
                        <article className="match" key={match.id}>
                          <div>
                            <strong>{match.tournament}</strong>
                            <span className="match-sub">
                              {date(match.date)} ·{" "}
                              {surfaces[match.surface] || match.surface} ·{" "}
                              {match.round}
                            </span>
                          </div>
                          <div className="opponent">
                            <span className={`result ${won ? "win" : "loss"}`}>
                              {won ? "V" : "D"}
                            </span>
                            <Link href={`/joueurs/${opponent.id}`}>
                              {opponent.name}
                            </Link>
                          </div>
                          <strong className="score">
                            {match.score || "—"}
                          </strong>
                        </article>
                      );
                    })}
                  </div>
                  <div className="pagination">
                    <span>
                      {number(matches.total, true)} matchs · Page {page}
                    </span>
                    <div>
                      <button
                        disabled={page === 1}
                        onClick={() => setPage((p) => p - 1)}
                        aria-label="Matchs précédents"
                      >
                        ←
                      </button>
                      <button
                        disabled={page * 20 >= matches.total}
                        onClick={() => setPage((p) => p + 1)}
                        aria-label="Matchs suivants"
                      >
                        →
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            <p className="score-note">
              Scores présentés dans l’ordre vainqueur–perdant.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
