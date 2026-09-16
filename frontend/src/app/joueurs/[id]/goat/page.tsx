import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PlayerGoat } from "@/components/player-goat";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id)) notFound();
  return (
    <Suspense fallback={<p>Chargement…</p>}>
      <PlayerGoat id={id} />
    </Suspense>
  );
}
