export type Country = { id: string; name?: string };
export type Ranking = {
  rank: number;
  playerId: number;
  name: string;
  country: Country;
  points: number;
  bestRank: number;
};
export type Page<T> = {
  rows: T[];
  total: number;
  current: number;
  rowCount: number;
};
export type Option = { id: string; label: string; value: string };
export type Player = {
  id: number;
  name: string;
  country: Country;
  age?: number;
  height?: number;
  handName?: string;
  currentRank?: number;
  bestRank?: number;
  titles?: number;
  grandSlams?: number;
  currentEloRating?: number;
};
export type Match = {
  id: number;
  date: string;
  tournament: string;
  surface: string;
  round: string;
  score: string;
  winner: { id: number; name: string };
  loser: { id: number; name: string };
};

export async function api<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/tennis/${path}`, {
    signal,
    cache: "no-store",
  });
  if (!response.ok) {
    if (response.status === 404)
      throw new Error("Ces données sont introuvables.");
    throw new Error(
      "Les données sont momentanément indisponibles. Réessayez dans quelques instants.",
    );
  }
  return response.json();
}
export function number(value?: number, zero = false) {
  return value != null && (zero || value > 0)
    ? new Intl.NumberFormat("fr-FR").format(value)
    : "—";
}
export function date(value?: string) {
  if (!value) return "Date non disponible";
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? "Date non disponible"
    : new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(parsed);
}
