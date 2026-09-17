import { notFound } from "next/navigation";
import { RecordRanking } from "@/components/record-ranking";

export default async function RecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[A-Za-z0-9]+$/.test(id)) notFound();
  return <RecordRanking key={id} id={id} />;
}
