"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, number, type Page, type Country } from "@/lib/api";

export const surfaces = [
  ["", "Toutes les surfaces"],
  ["H", "Dur"],
  ["C", "Terre battue"],
  ["G", "Gazon"],
  ["P", "Moquette"],
];
const factors = [0, 1, 2, 3, 4, 5, 6, 8, 10];
const mainWeights = [
  ["tournamentFactor", "Tournois"],
  ["rankingFactor", "Classement"],
  ["achievementsFactor", "Accomplissements"],
];
const extraWeights = [
  ["yearEndRankFactor", "Classement de fin d’année"],
  ["bestRankFactor", "Meilleur classement"],
  ["weeksAtNo1Factor", "Semaines nº 1"],
  ["weeksAtEloTopNFactor", "Semaines au sommet Elo"],
  ["bestEloRatingFactor", "Meilleur Elo"],
  ["grandSlamFactor", "Exploits en Grand Chelem"],
  ["bigWinsFactor", "Grandes victoires"],
  ["h2hFactor", "Face-à-face"],
  ["recordsFactor", "Records"],
  ["bestSeasonFactor", "Meilleures saisons"],
  ["greatestRivalriesFactor", "Rivalités"],
  ["performanceFactor", "Performance"],
  ["statisticsFactor", "Statistiques"],
];
const details = [
  ["tGPoints", "Tournois : Grand Chelem"],
  ["tFLPoints", "Tournois : finales"],
  ["tMPoints", "Tournois : Masters"],
  ["tOPoints", "Tournois : JO"],
  ["tABPoints", "Tournois : ATP 500 / 250"],
  ["tDTPoints", "Tournois : équipes"],
  ["yearEndRankPoints", "Fin d’année"],
  ["bestRankPoints", "Meilleur classement"],
  ["weeksAtNo1Points", "Semaines nº 1"],
  ["weeksAtEloTopNPoints", "Semaines Elo"],
  ["bestEloRatingPoints", "Meilleur Elo"],
  ["grandSlamPoints", "Exploits en Grand Chelem"],
  ["bigWinsPoints", "Grandes victoires"],
  ["h2hPoints", "Face-à-face"],
  ["recordsPoints", "Records"],
  ["bestSeasonPoints", "Meilleures saisons"],
  ["greatestRivalriesPoints", "Rivalités"],
  ["performancePoints", "Performance"],
  ["statisticsPoints", "Statistiques"],
];
export type Totals = {
  totalPoints: number;
  tournamentPoints: number;
  rankingPoints: number;
  achievementsPoints: number;
};
type GoatRow = Totals & {
  rank: number;
  playerId: number;
  name: string;
  country: Country;
  active: boolean;
  grandSlams: number;
  tourFinals: number;
  masters: number;
  olympics: number;
  titles: number;
  weeksAtNo1: number;
  bestEloRating: number;
  [key: string]: unknown;
};

function cleanQuery(input: URLSearchParams) {
  const out = new URLSearchParams();
  for (const [key] of [...mainWeights, ...extraWeights]) {
    const value = input.get(key);
    if (
      value !== null &&
      factors.includes(Number(value)) &&
      Number(value) !== 1
    )
      out.set(key, String(Number(value)));
  }
  const surface = input.get("surface") || "";
  if (surfaces.some(([code]) => code === surface) && surface)
    out.set("surface", surface);
  if (["true", "false"].includes(input.get("active") || ""))
    out.set("active", input.get("active")!);
  if (input.get("oldLegends") === "false") out.set("oldLegends", "false");
  if (input.get("extrapolate") === "true") out.set("extrapolate", "true");
  if (input.get("searchPhrase"))
    out.set("searchPhrase", input.get("searchPhrase")!.slice(0, 100));
  const page = Number(input.get("current"));
  if (Number.isInteger(page) && page > 1 && page <= 10000)
    out.set("current", String(page));
  for (const key of [
    "totalPoints",
    "tournamentPoints",
    "rankingPoints",
    "achievementsPoints",
    "grandSlams",
    "titles",
    "weeksAtNo1",
    "bestEloRating",
  ]) {
    const value = input.get(`sort[${key}]`);
    if (value === "asc" || value === "desc") {
      out.set(`sort[${key}]`, value);
      break;
    }
  }
  return out;
}

export function GoatRanking() {
  const params = useSearchParams();
  const router = useRouter();
  const query = cleanQuery(new URLSearchParams(params.toString())).toString();
  const [data, setData] = useState<Page<GoatRow>>();
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [expanded, setExpanded] = useState<number>();
  useEffect(() => {
    const controller = new AbortController();
    setData(undefined);
    setError("");
    setExpanded(undefined);
    api<Page<GoatRow>>(`goatListTable?rowCount=20&${query}`, controller.signal)
      .then(setData)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [query, retry]);
  function navigate(next: URLSearchParams) {
    router.push(`/goat${next.size ? `?${next}` : ""}`, { scroll: false });
  }
  function page(delta: number) {
    const next = new URLSearchParams(query);
    next.set("current", String(Number(next.get("current") || 1) + delta));
    navigate(next);
  }
  function sort(key: string) {
    const next = new URLSearchParams(query);
    const previous = next.get(`sort[${key}]`);
    [...next.keys()]
      .filter((k) => k.startsWith("sort["))
      .forEach((k) => next.delete(k));
    next.set(`sort[${key}]`, previous === "desc" ? "asc" : "desc");
    next.delete("current");
    navigate(next);
  }
  const applied = new URLSearchParams(query);
  const current = Number(applied.get("current") || 1);
  const weight = ([key, label]: string[]) => (
    <label key={key}>
      {label}
      <select name={key} defaultValue={applied.get(key) || "1"}>
        {factors.map((n) => (
          <option key={n} value={n}>
            × {n}
          </option>
        ))}
      </select>
    </label>
  );
  const sortHeader = (key: string, label: string, className = "") => (
    <th
      className={className}
      aria-sort={
        applied.get(`sort[${key}]`) === "asc"
          ? "ascending"
          : applied.get(`sort[${key}]`) === "desc" ||
              (key === "totalPoints" &&
                ![...applied.keys()].some((k) => k.startsWith("sort[")))
            ? "descending"
            : "none"
      }
    >
      <button onClick={() => sort(key)}>{label} ↕</button>
    </th>
  );
  return (
    <div className="container goat-page">
      <header className="goat-intro">
        <p className="eyebrow">GREATEST OF ALL TIME</p>
        <h1>
          La course au <em>GOAT.</em>
        </h1>
        <p>
          Une carrière, trois dimensions. Explorez le classement historique et
          donnez votre poids aux tournois, au classement et aux
          accomplissements.
        </p>
      </header>
      <form
        key={query}
        className="goat-controls"
        onSubmit={(event) => {
          event.preventDefault();
          const next = new URLSearchParams();
          new FormData(event.currentTarget).forEach((value, key) =>
            next.set(key, String(value)),
          );
          next.set("oldLegends", next.has("oldLegends") ? "true" : "false");
          navigate(cleanQuery(next));
        }}
      >
        <div className="goat-filter-grid">
          <label>
            Surface
            <select name="surface" defaultValue={applied.get("surface") || ""}>
              {surfaces.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Joueurs
            <select name="active" defaultValue={applied.get("active") || ""}>
              <option value="">Tous les joueurs</option>
              <option value="true">En activité</option>
              <option value="false">Retraités</option>
            </select>
          </label>
          <label>
            Rechercher un joueur
            <input
              name="searchPhrase"
              type="search"
              defaultValue={applied.get("searchPhrase") || ""}
              placeholder="Nom du joueur"
              maxLength={100}
            />
          </label>
        </div>
        <div className="goat-weights">{mainWeights.map(weight)}</div>
        <details className="goat-advanced">
          <summary>Pondérations avancées et options historiques</summary>
          <p>
            Chaque coefficient secondaire est multiplié par celui de sa famille.
            × 0 exclut la composante. Les composantes disponibles dépendent de
            la surface.
          </p>
          <div className="goat-filter-grid">{extraWeights.map(weight)}</div>
          <label className="goat-check">
            <input
              type="checkbox"
              name="oldLegends"
              value="true"
              defaultChecked={applied.get("oldLegends") !== "false"}
            />{" "}
            Inclure les anciennes légendes
          </label>
          <label className="goat-check">
            <input
              type="checkbox"
              name="extrapolate"
              value="true"
              defaultChecked={applied.get("extrapolate") === "true"}
            />{" "}
            Extrapoler les carrières
          </label>
          <p>
            L’extrapolation produit une estimation : le total peut alors
            dépasser la somme des trois familles.
          </p>
        </details>
        <div className="goat-actions">
          <button type="submit" className="goat-primary">
            Appliquer au classement
          </button>
          <button type="button" onClick={() => navigate(new URLSearchParams())}>
            Réinitialiser
          </button>
          <span>
            Les réglages appliqués sont conservés dans l’URL pour partager ce
            classement.
          </span>
        </div>
      </form>
      <section aria-label="Classement GOAT" aria-busy={!data && !error}>
        <div className="goat-section-heading">
          <h2>Classement GOAT</h2>
          <span>{data ? `${number(data.total, true)} joueurs` : ""}</span>
        </div>
        {error ? (
          <div role="alert" className="goat-message">
            <p>{error}</p>
            <button onClick={() => setRetry((n) => n + 1)}>Réessayer</button>
          </div>
        ) : !data ? (
          <p role="status" className="goat-message">
            Calcul du classement…
          </p>
        ) : !data.rows.length ? (
          <p className="goat-message">
            Aucun joueur pour ces critères. Vérifiez les filtres et la
            disponibilité des données importées.
          </p>
        ) : (
          <>
            <div
              className="goat-table-wrap"
              tabIndex={0}
              role="region"
              aria-label="Tableau GOAT, défilement horizontal"
            >
              <table className="goat-table">
                <thead>
                  <tr>
                    <th>Rang</th>
                    <th>Joueur</th>
                    {sortHeader("totalPoints", "Points GOAT")}
                    {sortHeader(
                      "tournamentPoints",
                      "Tournois",
                      "goat-tournament",
                    )}
                    {sortHeader("rankingPoints", "Classement", "goat-ranking")}
                    {sortHeader(
                      "achievementsPoints",
                      "Accomplissements",
                      "goat-achievement",
                    )}
                    {sortHeader("grandSlams", "Grand Chelem")}
                    <th>Masters Finals</th>
                    <th>Masters 1000</th>
                    <th>JO</th>
                    {sortHeader("titles", "Titres")}
                    {sortHeader("weeksAtNo1", "Sem. nº 1")}
                    {sortHeader("bestEloRating", "Elo max.")}
                    <th>Détail</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <GoatRows
                      key={row.playerId}
                      row={row}
                      expanded={expanded === row.playerId}
                      toggle={() =>
                        setExpanded(
                          expanded === row.playerId ? undefined : row.playerId,
                        )
                      }
                      surface={applied.get("surface") || ""}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="goat-pagination">
              <button disabled={current <= 1} onClick={() => page(-1)}>
                Précédent
              </button>
              <span>
                Page {current} / {Math.max(1, Math.ceil(data.total / 20))}
              </span>
              <button
                disabled={current * 20 >= data.total}
                onClick={() => page(1)}
              >
                Suivant
              </button>
            </div>
          </>
        )}
      </section>
      <GoatLegend />
    </div>
  );
}
function GoatRows({
  row,
  expanded,
  toggle,
  surface,
}: {
  row: GoatRow;
  expanded: boolean;
  toggle: () => void;
  surface: string;
}) {
  return (
    <>
      <tr>
        <td>{row.rank}</td>
        <th scope="row">
          <Link
            href={`/joueurs/${row.playerId}/goat${surface ? `?surface=${surface}` : ""}`}
          >
            {row.name}
          </Link>
          <small>
            {row.country?.id}
            {row.active ? " · En activité" : ""}
          </small>
        </th>
        <td className="goat-total">{number(row.totalPoints, true)}</td>
        <td className="goat-tournament">
          {number(row.tournamentPoints, true)}
        </td>
        <td className="goat-ranking">{number(row.rankingPoints, true)}</td>
        <td className="goat-achievement">
          {number(row.achievementsPoints, true)}
        </td>
        {[
          row.grandSlams,
          row.tourFinals,
          row.masters,
          row.olympics,
          row.titles,
          row.weeksAtNo1,
          row.bestEloRating,
        ].map((value, i) => (
          <td key={i}>{number(value)}</td>
        ))}
        <td>
          <button
            onClick={toggle}
            aria-expanded={expanded}
            aria-label={`Détail des points de ${row.name}`}
          >
            {expanded ? "Fermer" : "Détail +"}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={14}>
            <p>Ventilation avec les pondérations actuelles</p>
            <dl className="goat-breakdown">
              {details.map(([key, label]) => (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>{number(row[key] as number, true)}</dd>
                </div>
              ))}
            </dl>
            <Link
              href={`/joueurs/${row.playerId}/goat${surface ? `?surface=${surface}` : ""}`}
            >
              Carrière et saisons au barème standard →
            </Link>
          </td>
        </tr>
      )}
    </>
  );
}

type Legend = {
  tournaments: {
    level: string;
    result: string;
    goatPoints: number;
    additive: boolean;
  }[];
  yearEndRank: { rank: number; goatPoints: number }[];
  bestRank: { rank: number; goatPoints: number }[];
  bestElo: { rank: number; goatPoints: number }[];
  weeksAtNo1: number;
  careerGrandSlam: number;
  seasonGrandSlam: number;
};
export const levels: Record<string, string> = {
  G: "Grand Chelem",
  F: "Masters Finals",
  L: "Finales alternatives",
  M: "Masters 1000",
  O: "Jeux olympiques",
  A: "ATP 500",
  B: "ATP 250",
  D: "Coupe Davis",
  T: "Équipes",
};
const results: Record<string, string> = {
  W: "Vainqueur",
  F: "Finale",
  SF: "Demi-finale",
  QF: "Quart de finale",
  R16: "Huitième",
  RR: "Poules",
  BR: "Bronze",
};
function GoatLegend() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Legend>();
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!open) return;
    const c = new AbortController();
    setError("");
    api<Legend>("goat/legend", c.signal)
      .then(setData)
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, [open, retry]);
  return (
    <details
      className="goat-legend"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>Comprendre le calcul et consulter le barème standard</summary>
      <p>
        Les points sont calculés par le moteur historique Tennis Crystal Ball à
        partir des résultats importés, des classements, de l’Elo et des records.
        Le classement utilise les coefficients choisis ci-dessus. Les fiches
        individuelles et le barème ci-dessous utilisent les coefficients
        standard (× 1), toutes surfaces pour ce barème.
      </p>
      <p>
        Les bonus de carrière sont distincts des points attribués à chaque
        saison. Les arrondis du moteur peuvent introduire des écarts entre les
        sommes affichées. Un import complet doit terminer le calcul Elo,
        l’actualisation des vues et des records.
      </p>
      {error ? (
        <div role="alert">
          {error}{" "}
          <button onClick={() => setRetry((n) => n + 1)}>Réessayer</button>
        </div>
      ) : !data ? (
        <p>Chargement du barème…</p>
      ) : (
        <div className="goat-legend-grid">
          <div>
            <h3>Résultats en tournoi</h3>
            <div className="goat-table-wrap">
              <table className="goat-table">
                <thead>
                  <tr>
                    <th>Niveau</th>
                    <th>Résultat</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tournaments.map((r, i) => (
                    <tr key={i}>
                      <td>{levels[r.level] || r.level}</td>
                      <td>
                        {results[r.result] || r.result}
                        {r.additive ? " (cumulatif)" : ""}
                      </td>
                      <td>{number(r.goatPoints, true)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3>Classement et accomplissements</h3>
            <p>{data.weeksAtNo1} semaines nº 1 = 1 point.</p>
            <p>
              Grand Chelem en carrière : {number(data.careerGrandSlam, true)}{" "}
              points. Sur une saison : {number(data.seasonGrandSlam, true)}{" "}
              points.
            </p>
            {(
              [
                ["Fin d’année", data.yearEndRank],
                ["Meilleur classement", data.bestRank],
                ["Meilleur Elo historique", data.bestElo],
              ] as const
            ).map(([label, rows]) => (
              <div key={label}>
                <h4>{label}</h4>
                <p>
                  {rows
                    .map(
                      (r) => `Nº ${r.rank} : ${number(r.goatPoints, true)} pts`,
                    )
                    .join(" · ")}
                </p>
              </div>
            ))}
            <p>
              Les autres accomplissements comprennent les grandes victoires, les
              face-à-face, les records, les saisons, les rivalités, les
              performances et les statistiques.
            </p>
          </div>
        </div>
      )}
    </details>
  );
}
