"use client";

import dynamic from "next/dynamic";

import type { MapView } from "@/lib/map/view";

// Leaflet touches `window` at import time: it can only be loaded in the browser.
const CemeteryMap = dynamic(() => import("./CemeteryMap"), {
  ssr: false,
  loading: () => (
    <div role="status" className="absolute inset-0 flex items-center justify-center bg-crypt text-ash">
      <span aria-hidden="true" className="mr-2 animate-pulse">🪦</span>
      Chargement de la carte…
    </div>
  ),
});

export default function MapLoader({ initialView }: { initialView: MapView }) {
  return <CemeteryMap initialView={initialView} />;
}
