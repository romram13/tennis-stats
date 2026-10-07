"use client";

import { useEffect, useState } from "react";
import { api, date } from "@/lib/api";

type DataDates = {
  matches: string | null;
  atp: string | null;
  elo: string | null;
};

const sources = [
  ["matches", "Matchs"],
  ["atp", "Classement ATP"],
  ["elo", "Classement Elo"],
] as const;

export function DataDates() {
  const [dates, setDates] = useState<DataDates | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    api<DataDates>("dataDates", controller.signal)
      .then(setDates)
      .catch(() => {
        if (!controller.signal.aborted) setUnavailable(true);
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="footer-data-dates" aria-live="polite">
      <span>Dernières données disponibles</span>
      {dates ? (
        <ul>
          {sources.map(([key, label]) => (
            <li key={key}>
              {label} : {dates[key] != null ? (
                <time dateTime={dates[key]}>{date(dates[key])}</time>
              ) : "Date non disponible"}
            </li>
          ))}
        </ul>
      ) : (
        <span>{unavailable ? "Dates momentanément indisponibles" : "Chargement des dates…"}</span>
      )}
    </div>
  );
}
