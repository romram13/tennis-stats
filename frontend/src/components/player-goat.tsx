"use client";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, number, type Player } from "@/lib/api";
import { levels, surfaces, type Totals } from "./goat";

type Result = {
  level: string;
  result: string;
  count: number;
  unit?: "points" | "results";
};
type Season = Totals & {
  season: number;
  yearEndRankPoints: number;
  weeksAtNo1Points: number;
  weeksAtEloTopNPoints: number;
  grandSlamPoints: number;
  bigWinsPoints: number;
  tournamentResults: Result[];
};
type Points = Totals & {
  careerRankingPoints: number;
  careerAchievementsPoints: number;
  tournamentResults: Result[];
  seasons: Season[];
};
export function PlayerGoat({ id }: { id: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const requested = params.get("surface") || "";
  const surface = surfaces.some(([key]) => key === requested) ? requested : "";
  const [data, setData] = useState<{ player: Player; points: Points }>();
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    setData(undefined);
    setError("");
    Promise.all([
      api<Player>(`players/${id}`, c.signal),
      api<Points>(`players/${id}/goat?surface=${surface}`, c.signal),
    ])
      .then(([player, points]) => setData({ player, points }))
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, [id, surface, retry]);
  return (
    <div className="container goat-page">
      <Link
        className="back"
        href={`/goat${surface ? `?surface=${surface}` : ""}`}
      >
        ← Classement GOAT
      </Link>
      <header className="goat-intro">
        <p className="eyebrow">UNE CARRIÈRE EN POINTS</p>
        <h1>{data?.player.name || "Points GOAT"}</h1>
        <p>Barème standard · Coefficients × 1 · Sans extrapolation</p>
        <Link href={`/joueurs/${id}`}>Profil et matchs →</Link>
      </header>
      <label className="goat-surface">
        Surface
        <select
          value={surface}
          onChange={(e) =>
            router.push(
              `/joueurs/${id}/goat${e.target.value ? `?surface=${e.target.value}` : ""}`,
              { scroll: false },
            )
          }
        >
          {surfaces.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {error ? (
        <div role="alert" className="goat-message">
          {error}{" "}
          <button onClick={() => setRetry((n) => n + 1)}>Réessayer</button>
        </div>
      ) : !data ? (
        <p role="status">Chargement des points…</p>
      ) : (
        <>
          <div className="goat-cards">
            {(
              [
                ["Points GOAT", "totalPoints"],
                ["Tournois", "tournamentPoints"],
                ["Classement", "rankingPoints"],
                ["Accomplissements", "achievementsPoints"],
              ] as const
            ).map(([label, key]) => (
              <div key={key}>
                <span>{label}</span>
                <strong>{number(data.points[key], true)}</strong>
              </div>
            ))}
          </div>
          {!data.points.totalPoints && (
            <p>Aucun point GOAT disponible pour ce joueur et cette surface.</p>
          )}
          <h2>Bonus de carrière</h2>
          <p>
            Classement :{" "}
            <strong>
              {number(data.points.careerRankingPoints, true)} points
            </strong>{" "}
            · Accomplissements :{" "}
            <strong>
              {number(data.points.careerAchievementsPoints, true)} points
            </strong>
            .
          </p>
          <p>
            Ces bonus s’ajoutent aux points des saisons. Les arrondis des
            composantes peuvent créer de petits écarts avec le total.
          </p>
          <h2>Points par saison</h2>
          <div
            className="goat-table-wrap"
            tabIndex={0}
            role="region"
            aria-label="Points par saison, défilement horizontal"
          >
            <table className="goat-table">
              <thead>
                <tr>
                  <th>Saison</th>
                  <th>Total</th>
                  <th className="goat-tournament">Tournois</th>
                  <th className="goat-ranking">Classement</th>
                  <th className="goat-achievement">Accomplissements</th>
                  <th>Détail de la saison</th>
                </tr>
              </thead>
              <tbody>
                {[...data.points.seasons]
                  .sort((a, b) => b.season - a.season)
                  .map((s) => (
                    <tr key={s.season}>
                      <th scope="row">{s.season}</th>
                      <td className="goat-total">
                        {number(s.totalPoints, true)}
                      </td>
                      <td className="goat-tournament">
                        {number(s.tournamentPoints, true)}
                      </td>
                      <td className="goat-ranking">
                        {number(s.rankingPoints, true)}
                      </td>
                      <td className="goat-achievement">
                        {number(s.achievementsPoints, true)}
                      </td>
                      <td>
                        <details>
                          <summary>Détails {s.season}</summary>
                          <dl className="goat-season-detail">
                            {(
                              [
                                ["Fin d’année", s.yearEndRankPoints],
                                ["Semaines nº 1", s.weeksAtNo1Points],
                                ["Semaines Elo", s.weeksAtEloTopNPoints],
                                ["Exploits en Grand Chelem", s.grandSlamPoints],
                                ["Grandes victoires", s.bigWinsPoints],
                              ] as const
                            ).map(([label, value]) => (
                              <div key={label}>
                                <dt>{label}</dt>
                                <dd>{number(value, true)}</dd>
                              </div>
                            ))}
                          </dl>
                          <TournamentResults rows={s.tournamentResults} />
                        </details>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {!data.points.seasons.length && <p>Aucune saison disponible.</p>}
          <details className="goat-legend">
            <summary>Résultats en tournoi sur la carrière</summary>
            <TournamentResults rows={data.points.tournamentResults} />
          </details>
        </>
      )}
    </div>
  );
}
function TournamentResults({ rows }: { rows: Result[] }) {
  const names: Record<string, string> = {
    W: "victoire",
    F: "finale",
    SF: "demi-finale",
    QF: "quart de finale",
    RR: "victoire en poules",
    BR: "bronze",
  };
  return (
    <ul className="goat-results">
      {rows.map((r, i) => (
        <li key={i}>
          {r.level === "F"
            ? "Finales (dont alternatives)"
            : levels[r.level] || r.level}{" "}
          · {r.unit === "points" ? "points" : names[r.result] || r.result} :{" "}
          {r.count}
        </li>
      ))}
    </ul>
  );
}
