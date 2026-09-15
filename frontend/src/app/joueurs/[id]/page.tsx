import { notFound } from "next/navigation";
import { PlayerProfile } from "@/components/player-profile";
export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id)) notFound();
  return <PlayerProfile key={id} id={id} />;
}
