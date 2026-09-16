import type { Metadata } from "next";
import { Records } from "@/components/records";

export const metadata: Metadata = {
  title: "Records — Tennis Stats",
  description: "Explorez les records du tennis masculin et leurs détenteurs.",
};

export default function RecordsPage() {
  return (
    <div className="container goat-page records-page">
      <header className="goat-intro">
        <p className="eyebrow">LES MARQUES DE L’HISTOIRE</p>
        <h1>Les records</h1>
        <p>Explorez les performances du tennis masculin et les joueurs qui les ont signées.</p>
      </header>
      <Records />
    </div>
  );
}
