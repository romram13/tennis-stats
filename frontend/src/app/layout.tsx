import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tennis Stats — Le jeu, en chiffres",
  description:
    "Explorez le classement GOAT, le détail des points, les classements ATP et Elo.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        <a className="skip" href="#contenu">
          Aller au contenu
        </a>
        <header className="header">
          <div className="header-inner">
            <Link className="brand" href="/" aria-label="Tennis Stats, accueil">
              <span className="ball" aria-hidden="true">
                ↗
              </span>
              TENNIS<span className="brand-light">STATS</span>
            </Link>
            <nav aria-label="Navigation principale">
              <Link href="/goat">GOAT</Link>
              <Link href="/goat/pays">GOAT par pays</Link>
              <Link href="/classements">ATP / Elo</Link>
              <Link href="/records">Records</Link>
              <Link href="/classements#recherche">
                Joueurs <span aria-hidden="true">↗</span>
              </Link>
            </nav>
            <span className="edition">LE TENNIS EN PERSPECTIVE</span>
          </div>
        </header>
        <main id="contenu">{children}</main>
        <footer>
          <span className="footer-brand">TENNIS STATS</span>
          <p>Des chiffres pour mieux comprendre le jeu.</p>
          <a
            href="https://github.com/elitemajik-ship-it/tennis_atp"
            target="_blank"
            rel="noreferrer"
          >
            Données ATP · Jeff Sackmann / Tennis Abstract et contributeurs ↗
          </a>
          <span>CC BY-NC-SA 4.0</span>
        </footer>
      </body>
    </html>
  );
}
