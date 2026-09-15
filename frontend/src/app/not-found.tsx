import Link from "next/link";
export default function NotFound() {
  return (
    <div className="container empty">
      <p className="eyebrow">BALLE DEHORS</p>
      <h1>Page introuvable.</h1>
      <p>Ce lien ne mène à aucun joueur ou classement.</p>
      <Link className="button" href="/">
        Revenir aux classements
      </Link>
    </div>
  );
}
