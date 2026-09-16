import { Rankings } from "@/components/rankings";
import { Search } from "@/components/search";
export default function Home() {
  return (
    <div className="container">
      <section className="hero">
        <div>
          <p className="eyebrow">
            <span /> LE JEU, EN CHIFFRES
          </p>
          <h1>
            Une autre lecture
            <br />
            du <em>tennis.</em>
          </h1>
          <p className="hero-description">
            Suivez la hiérarchie. Explorez les parcours. <br />
            Retrouvez les matchs qui racontent une carrière.
          </p>
          <Search />
        </div>
        <div className="court-art" aria-hidden="true">
          <div className="court">
            <i className="court-mid" />
            <i className="court-service" />
            <i className="court-center" />
          </div>
          <span className="court-ball" />
          <span className="court-label">POINT. JEU. PERSPECTIVE.</span>
          <span className="court-coordinate">40° / 15°</span>
        </div>
      </section>
      <Rankings />
    </div>
  );
}
