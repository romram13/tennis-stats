import { number, type Player } from "@/lib/api";

export function PlayerTitles({ player }: { player: Player }) {
  return (
    <section aria-labelledby="titres-remportes" className="profile-titles">
      <div className="section-heading">
        <div>
          <p className="eyebrow">LE PALMARÈS</p>
          <h2 id="titres-remportes">Titres remportés</h2>
          <p>Palmarès de carrière, toutes surfaces.</p>
        </div>
      </div>
      <dl className="title-metrics">
        {([
          ["Grand Chelem", "Grand Chelem", player.grandSlams],
          ["Masters Finals", "Masters Finals", player.tourFinals],
          ["Masters 1000", "Masters 1000", player.masters],
          ["Jeux olympiques", "Jeux olympiques", player.olympics],
          ["ATP 500", "ATP 500 / Championship Series", player.atp500],
          ["ATP 250", "ATP 250 / World Series", player.atp250],
        ] as const).map(([label, fullName, count]) => (
          <div className="title-metric" key={label}>
            <dt title={fullName}>{label}</dt>
            <dd>{number(count, true)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
