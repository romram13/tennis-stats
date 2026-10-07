import { notFound } from "next/navigation";
import { PlayerProfile } from "@/components/player-profile";
export default async function PlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id)) notFound();
  const { tab } = await searchParams;
  return <PlayerProfile key={id} id={id} tab={tab === "records" ? "records" : "profile"} />;
}
