"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { api, number, type Country, type Page } from "@/lib/api";
import { CountryFlag } from "@/components/country-flag";

type TennisRecord = {
  id: string;
  name: string;
  value: string;
  goatPoints?: string | null;
  recordHolders: { playerId: number; name: string; country?: Country; detail?: string }[];
};

export function Records() {
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [infamous, setInfamous] = useState(false);
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [data, setData] = useState<Page<TennisRecord> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const query = new URLSearchParams({
      searchPhrase: search, infamous: String(infamous), current: String(page), rowCount: "20",
    });
    api<Page<TennisRecord>>(`recordsTable?${query}`, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch((reason) => { if (!controller.signal.aborted) setError(reason.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [search, infamous, page, reload]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(draft.trim());
    setPage(1);
  }

  return (
    <section aria-label="Catalogue des records">
      <form className="goat-controls" onSubmit={submit}>
        <div className="records-filters">
          <label>Rechercher un record
            <input type="search" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ex. Grand Slam, titles…" />
          </label>
          <label>Type de records
            <select value={String(infamous)} onChange={(event) => { setInfamous(event.target.value === "true"); setPage(1); }}>
              <option value="false">Performances</option>
              <option value="true">Records négatifs</option>
            </select>
          </label>
          <button className="goat-primary" type="submit">Rechercher</button>
        </div>
        <p className="explainer">Les intitulés des records sont fournis en anglais. Recherchez avec les termes du catalogue.</p>
      </form>
      <div className="panel" aria-busy={loading}>
        {loading ? <div className="loading" role="status"><span className="spinner" />Chargement des records…</div>
          : error ? <div className="empty" role="alert"><h2>Records indisponibles</h2><p>{error}</p><button onClick={() => setReload((value) => value + 1)}>Réessayer</button></div>
          : !data?.rows.length ? <div className="empty"><h2>Aucun record trouvé</h2><p>Essayez une autre recherche ou un autre type de records.</p></div>
          : <>
            <div className="table-scroll">
              <table className="records-table">
                <caption className="sr-only">Records et détenteurs</caption>
                <thead><tr><th scope="col">Record</th><th scope="col" className="numeric">Valeur</th><th scope="col">Détenteurs</th><th scope="col" className="numeric">Points GOAT</th></tr></thead>
                <tbody>{data.rows.map((record) => <tr key={record.id}>
                  <th scope="row"><Link className="player-name" href={`/records/${encodeURIComponent(record.id)}`}>{record.name}</Link></th>
                  <td className="numeric points">{record.value || "—"}</td>
                  <td>{record.recordHolders.length ? <ul className="record-holders">{record.recordHolders.map((holder, index) => <li key={`${holder.playerId}-${index}`}>
                    <Link className="player-name" href={`/joueurs/${holder.playerId}`}>{holder.name}</Link>
                    {holder.country && <CountryFlag country={holder.country} />}
                    {holder.detail && <small>{holder.detail}</small>}
                  </li>)}</ul> : <span className="muted">Résultat non disponible</span>}</td>
                  <td className="numeric">{record.goatPoints || "—"}</td>
                </tr>)}</tbody>
              </table>
            </div>
            <div className="pagination">
              <span>{number(data.total, true)} records · Page {page}</span>
              <div>
                <button aria-label="Page précédente" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>←</button>
                <button aria-label="Page suivante" disabled={page * 20 >= data.total} onClick={() => setPage((value) => value + 1)}>→</button>
              </div>
            </div>
          </>}
      </div>
    </section>
  );
}
