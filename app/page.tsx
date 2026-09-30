import type { Metadata } from "next";

import MapLoader from "@/components/map/MapLoader";
import { viewFromSearchParams } from "@/lib/map/view";

export const metadata: Metadata = {
  title: { absolute: "RIP-Advisor — La carte des cimetières du monde" },
  description:
    "Explorez les cimetières du monde entier sur une carte interactive et découvrez les avis sur leur ambiance, leur voisinage et leur humidité.",
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const view = viewFromSearchParams(await searchParams);

  return (
    <section aria-label="Carte des cimetières" className="relative min-h-[calc(100dvh-3.75rem)] flex-1">
      <h1 className="sr-only">Carte des cimetières</h1>
      {/* Remount when the requested view changes (e.g. "Voir sur la carte"). */}
      <MapLoader key={`${view.lat},${view.lon},${view.zoom}`} initialView={view} />
    </section>
  );
}
