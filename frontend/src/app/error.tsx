"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="container empty" role="alert">
      <h1>Une interruption de jeu.</h1>
      <p>La page n’a pas pu être chargée.</p>
      <button className="button" onClick={reset}>
        Réessayer
      </button>
    </div>
  );
}
