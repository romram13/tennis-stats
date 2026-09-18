import type { Country } from "@/lib/api";

export function CountryFlag({
  country,
  fallback = "—",
}: {
  country?: Country;
  fallback?: string;
}) {
  const label = country?.name || country?.id || fallback;
  if (!country?.code) return <span className="country">{label}</span>;

  return (
    <span className="country" title={label}>
      <img
        className="country-flag"
        src={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png`}
        alt={label}
        width="40"
        height="30"
      />
    </span>
  );
}
