"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, number, type Page, type Country } from "@/lib/api";

type PlayerRow = {
  playerId: number;
  name: string;
  country?: Country;
  totalPoints: number;
};

import { CountryFlag } from "@/components/country-flag";
type CountryRow = {
  countryId: string;
  country?: Country;
  playerCount: number;
  totalPoints: number;
  bestPlayer: PlayerRow;
};

function groupByCountry(rows: PlayerRow[]) {
  const grouped = new Map<string, CountryRow>();
  for (const player of rows) {
    const countryId = player.country?.id || "N/A";
    const current = grouped.get(countryId);
    if (current) {
      current.playerCount += 1;
      current.totalPoints += player.totalPoints;
      if (player.totalPoints > current.bestPlayer.totalPoints)
        current.bestPlayer = player;
    } else {
      grouped.set(countryId, {
        countryId,
        country: player.country,
        playerCount: 1,
        totalPoints: player.totalPoints,
        bestPlayer: player,
      });
    }
  }
  return [...grouped.values()].sort(
    (left, right) =>
      right.totalPoints - left.totalPoints ||
      right.playerCount - left.playerCount ||
      left.countryId.localeCompare(right.countryId),
  );
}

export function CountryGoatRanking() {
  const [rows, setRows] = useState<CountryRow[]>();
  const [playerCount, setPlayerCount] = useState(0);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setRows(undefined);
    setError("");
    api<Page<PlayerRow>>("goatListTable?rowCount=0", controller.signal)
      .then((data) => {
        setPlayerCount(data.total);
        setRows(groupByCountry(data.rows));
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [retry]);

  return (
    <div className="container goat-page">
      <header className="goat-intro">
        <p className="eyebrow">GREATEST OF ALL TIME</p>
        <h1>
          Le GOAT <em>par pays.</em>
        </h1>
        <p>
          Regroupez les points GOAT de chaque joueur selon sa nationalité pour
          comparer le poids historique des grandes nations du tennis.
        </p>
        <Link className="text-link" href="/goat">
          ← Retour au classement individuel
        </Link>
      </header>
      <section aria-label="Classement GOAT par pays" aria-busy={!rows && !error}>
        <div className="goat-section-heading">
          <h2>Classement par pays</h2>
          <span>
            {rows
              ? `${rows.length} pays · ${number(playerCount, true)} joueurs`
              : ""}
          </span>
        </div>
        {error ? (
          <div role="alert" className="goat-message">
            <p>{error}</p>
            <button onClick={() => setRetry((value) => value + 1)}>
              Réessayer
            </button>
          </div>
        ) : !rows ? (
          <p role="status" className="goat-message">
            Calcul du classement par pays…
          </p>
        ) : !rows.length ? (
          <p className="goat-message">Aucun pays disponible.</p>
        ) : (
          <div
            className="goat-table-wrap"
            tabIndex={0}
            role="region"
            aria-label="Tableau GOAT par pays, défilement horizontal"
          >
            <table className="goat-table country-goat-table">
              <thead>
                <tr>
                  <th>Rang</th>
                  <th>Pays</th>
                  <th>Joueurs</th>
                  <th>Points GOAT cumulés</th>
                  <th>Meilleur joueur</th>
                  <th>Points du meilleur joueur</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.countryId}>
                    <td>{index + 1}</td>
                    <th scope="row">
                      <CountryFlag country={row.country} fallback={row.countryId} />
                    </th>
                    <td>{number(row.playerCount)}</td>
                    <td className="goat-total">
                      {number(row.totalPoints, true)}
                    </td>
                    <td>
                      <Link href={`/joueurs/${row.bestPlayer.playerId}/goat`}>
                        {row.bestPlayer.name}
                      </Link>
                    </td>
                    <td>{number(row.bestPlayer.totalPoints, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
