"use client";
import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { api, type Option } from "@/lib/api";
export function Search() {
  const id = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Option[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api<Option[]>(
        `autocompletePlayer?term=${encodeURIComponent(query.trim())}`,
        controller.signal,
      )
        .then((rows) => {
          setResults(rows);
          setState("ready");
        })
        .catch(() => {
          if (!controller.signal.aborted) setState("error");
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  return (
    <div className="search" id="recherche">
      <label className="sr-only" htmlFor={id}>
        Rechercher un joueur
      </label>
      <div className="search-field">
        <span aria-hidden="true">⌕</span>
        <input
          id={id}
          autoComplete="off"
          placeholder="Rechercher un joueur…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setResults([]);
            setState(
              event.target.value.trim().length >= 2 ? "loading" : "idle",
            );
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setQuery("");
              setResults([]);
              setState("idle");
            }
          }}
        />
        <span className="search-hint">ATP</span>
      </div>
      {state !== "idle" && (
        <div className="search-results" aria-live="polite">
          {state === "loading" ? (
            <p>Recherche en cours…</p>
          ) : state === "error" ? (
            <p>La recherche est indisponible pour le moment.</p>
          ) : results.length ? (
            <ul>
              {results.map((row) => (
                <li key={row.id}>
                  <Link href={`/joueurs/${encodeURIComponent(row.id)}`}>
                    {row.value || row.label}
                    <span aria-hidden="true">↗</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>Aucun joueur trouvé.</p>
          )}
        </div>
      )}
    </div>
  );
}
