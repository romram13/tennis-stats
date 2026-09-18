"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, date, number, type Country, type Page } from "@/lib/api";
import { CountryFlag } from "@/components/country-flag";

type Column = { name: string; caption: string; align?: string; formatter?: string | null };
type Definition = { id: string; name: string; category: string; notes?: string; columns: Column[] };
type Row = { rank: number; playerId: number; name: string; country?: Country; [key: string]: unknown };

function cell(value: unknown, column: Column) {
  if (value == null || value === "") return "—";
  if (typeof value === "object") {
    const item = value as { name?: string; playerId?: number };
    return item.playerId && item.name
      ? <Link className="player-name" href={`/joueurs/${item.playerId}`}>{item.name}</Link>
      : item.name || "—";
  }
  if (/^(date|startDate|endDate)$/.test(column.name) && typeof value === "string") return date(value);
  if (typeof value === "number") {
    if (/season/i.test(column.name)) return String(value);
    const precision = /^factor([23]?)$/.exec(column.formatter || "");
    return new Intl.NumberFormat("fr-FR", precision ? {
      minimumFractionDigits: Number(precision[1] || 1), maximumFractionDigits: Number(precision[1] || 1),
    } : { maximumFractionDigits: 3 }).format(value);
  }
  return String(value);
}

export function RecordRanking({ id }: { id: string }) {
  const [definition, setDefinition] = useState<Definition | null>(null);
  const [data, setData] = useState<Page<Row> | null>(null);
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const query = new URLSearchParams({ recordId: id, active: "false", current: String(page), rowCount: "20" });
    Promise.all([
      api<Definition>(`records/${encodeURIComponent(id)}`, controller.signal),
      api<Page<Row>>(`recordTable?${query}`, controller.signal),
    ]).then(([record, rows]) => {
      if (controller.signal.aborted) return;
      setDefinition(record);
      setData(rows);
      document.title = `${record.name} — Tennis Stats`;
    }).catch((reason) => {
      if (!controller.signal.aborted) setError(reason.message);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [id, page, reload]);

  return (
    <div className="container goat-page">
      <nav className="record-breadcrumb" aria-label="Fil d’Ariane">
        <Link href="/records">Records</Link>
        {definition && <><span aria-hidden="true">/</span><span>{definition.category}</span><span aria-hidden="true">/</span><span aria-current="page">{definition.name}</span></>}
      </nav>
      <header className="goat-intro">
        <h1>{definition?.name || "Classement du record"}</h1>
        {definition?.notes && <p className="explainer">{definition.notes}</p>}
      </header>
      <section className="panel" aria-label="Classement des joueurs" aria-busy={loading}>
        {loading ? <div className="loading" role="status"><span className="spinner" />Chargement du classement…</div>
          : error ? <div className="empty" role="alert"><h2>Classement indisponible</h2><p>{error}</p><button onClick={() => setReload((value) => value + 1)}>Réessayer</button></div>
          : !data?.rows.length ? <div className="empty"><h2>Aucun résultat disponible</h2><p>Ce record ne dispose pas encore de classement.</p></div>
          : <>
            <div className="table-scroll">
              <table className="record-ranking-table">
                <caption className="sr-only">{definition?.name} : classement des joueurs</caption>
                <thead><tr>
                  <th scope="col">Rang</th><th scope="col">Pays</th><th scope="col">Joueur</th>
                  {definition?.columns.map((column) => <th key={column.name} scope="col" className={column.align === "right" ? "numeric" : undefined}>{column.caption}</th>)}
                </tr></thead>
                <tbody>{data.rows.map((row, index) => <tr key={`${row.playerId}-${index}`}>
                  <td><span className={`rank ${row.rank <= 3 ? "top-rank" : ""}`}>{number(row.rank)}</span></td>
                  <td><CountryFlag country={row.country} /></td>
                  <th scope="row"><Link className="player-name" href={`/joueurs/${row.playerId}`}>{row.name}</Link></th>
                  {definition?.columns.map((column) => <td key={column.name} className={column.align === "right" ? "numeric" : undefined}>{cell(row[column.name], column)}</td>)}
                </tr>)}</tbody>
              </table>
            </div>
            <div className="pagination">
              <span>{number(data.total, true)} résultats · Page {page}</span>
              <div>
                <button aria-label="Page précédente" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>←</button>
                <button aria-label="Page suivante" disabled={page * 20 >= data.total} onClick={() => setPage((value) => value + 1)}>→</button>
              </div>
            </div>
          </>}
      </section>
    </div>
  );
}
