import { Suspense } from "react";
import { GoatRanking } from "@/components/goat";
export const metadata = { title: "Classement GOAT — Tennis Stats" };
export default function Page() {
  return (
    <Suspense fallback={<p>Chargement du classement…</p>}>
      <GoatRanking />
    </Suspense>
  );
}
