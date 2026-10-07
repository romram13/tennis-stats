import Link from "next/link";

export function PlayerTabs({ id, active }: { id: string; active: "profile" | "records" | "goat" }) {
  return (
    <nav className="player-tabs" aria-label="Rubriques du joueur">
      {([
        ["profile", "Profil et matchs", `/joueurs/${id}`],
        ["records", "Records", `/joueurs/${id}?tab=records`],
        ["goat", "Points GOAT", `/joueurs/${id}/goat`],
      ] as const).map(([key, label, href]) => (
        <Link key={key} href={href} aria-current={active === key ? "page" : undefined}>{label}</Link>
      ))}
    </nav>
  );
}
