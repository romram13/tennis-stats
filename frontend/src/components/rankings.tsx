"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, date, number, type Page, type Ranking } from "@/lib/api";
export function Rankings() {
  const [type, setType] = useState("RANK");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [data, setData] = useState<Page<Ranking> | null>(null);
  const [asOf, setAsOf] = useState<string | undefined>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    Promise.all([
      api<Page<Ranking>>(
        `rankingsTableTable?rankType=${type}&current=${page}&rowCount=20`,
        controller.signal,
      ),
      api<string | null>(`rankingsDate?rankType=${type}`, controller.signal),
    ])
      .then(([rows, day]) => {
        setData(rows);
        setAsOf(day || undefined);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [type, page, reload]);
  return (
    <section className="rankings" aria-labelledby="ranking-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">LES FORCES EN PRÉSENCE</p>
          <h2 id="ranking-title">Le classement</h2>
        </div>
        <div className="segmented" aria-label="Type de classement">
          {[
            ["RANK", "ATP"],
            ["ELO_RANK", "Elo"],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={type === value}
              onClick={() => {
                setType(value);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="table-meta">
        <span>
          {type === "RANK"
            ? "Simple messieurs · Points ATP"
            : "Simple messieurs · Indice Elo"}
        </span>
        <span>{!loading && !error && asOf ? `Au ${date(asOf)}` : ""}</span>
      </div>
      {type === "ELO_RANK" && (
        <p className="explainer">
          L’indice Elo estime le niveau de jeu à partir des résultats et de la
          force des adversaires.
        </p>
      )}
      <div className="panel" aria-busy={loading}>
        {loading ? (
          <div className="loading" role="status">
            <span className="spinner" />
            Chargement du classement…
          </div>
        ) : error ? (
          <div className="empty" role="alert">
            <span className="empty-icon">↻</span>
            <h3>Le classement fait une pause.</h3>
            <p>{error}</p>
            <button className="button" onClick={() => setReload((x) => x + 1)}>
              Réessayer
            </button>
          </div>
        ) : !data?.rows.length ? (
          <div className="empty">
            <span className="empty-icon">◎</span>
            <h3>Le terrain est encore libre.</h3>
            <p>Aucun classement disponible pour le moment.</p>
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Rang</th>
                    <th scope="col">Joueur</th>
                    <th scope="col">Pays</th>
                    <th scope="col" className="numeric">
                      {type === "RANK" ? "Points" : "Elo"}
                    </th>
                    <th scope="col" className="numeric">
                      Meilleur rang
                    </th>
                    <th scope="col">
                      <span className="sr-only">Profil</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={row.playerId}>
                      <td>
                        <span
                          className={`rank ${row.rank <= 3 ? "top-rank" : ""}`}
                        >
                          {row.rank.toString().padStart(2, "0")}
                        </span>
                      </td>
                      <td>
                        <Link
                          className="player-name"
                          href={`/joueurs/${row.playerId}`}
                        >
                          {row.name}
                        </Link>
                      </td>
                      <td>
                        <span className="country" title={row.country?.name}>
                          {row.country?.id || "—"}
                        </span>
                      </td>
                      <td className="numeric points">{number(row.points)}</td>
                      <td className="numeric muted">{number(row.bestRank)}</td>
                      <td>
                        <Link
                          className="row-link"
                          aria-label={`Profil de ${row.name}`}
                          href={`/joueurs/${row.playerId}`}
                        >
                          ↗
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <span>
                {number(data.total, true)} joueurs · Page {page}
              </span>
              <div>
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  aria-label="Page précédente"
                >
                  ←
                </button>
                <button
                  disabled={page * 20 >= data.total}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label="Page suivante"
                >
                  →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
