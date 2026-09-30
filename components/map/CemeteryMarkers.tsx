"use client";

import L from "leaflet";
import Link from "next/link";
import { memo } from "react";
import { Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";

import { cemeteryKey, cemeteryPath, UNNAMED_CEMETERY, type CemeteryMarker } from "@/lib/types";

const iconCache = new Map<string, L.DivIcon>();

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Emoji marker (avoids Leaflet's default-icon bug); rated cemeteries get a badge. */
function iconFor(cemetery: CemeteryMarker): L.DivIcon {
  const rating = cemetery.reviewCount > 0 && cemetery.avgRating !== null ? cemetery.avgRating.toFixed(1) : null;
  const cacheKey = rating ?? "none";
  const cached = iconCache.get(cacheKey);
  if (cached) return cached;

  const badge = rating
    ? `<span class="absolute -right-3 -top-2 rounded-full border border-crypt bg-candle px-1.5 font-bold leading-5 text-crypt" style="font-size:0.8125rem">💀${escapeHtml(rating)}</span>`
    : "";
  const ring = rating ? "border-candle bg-vault" : "border-mist bg-tomb";
  const icon = L.divIcon({
    className: "cemetery-marker",
    html: `<span class="relative flex h-9 w-9 items-center justify-center rounded-full border-2 ${ring} text-xl shadow-lg" aria-hidden="true">🪦${badge}</span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
  iconCache.set(cacheKey, icon);
  return icon;
}

function MarkerPopup({ cemetery }: { cemetery: CemeteryMarker }) {
  return (
    <div className="min-w-48">
      <p className="m-0 font-display text-lg font-bold text-bone">{cemetery.name ?? UNNAMED_CEMETERY}</p>
      {cemetery.reviewCount > 0 && cemetery.avgRating !== null ? (
        <p className="my-1 text-ash">
          <span aria-hidden="true">💀 </span>
          {cemetery.avgRating.toFixed(1)}/5 · {cemetery.reviewCount} avis
        </p>
      ) : (
        <p className="my-1 text-ash">Aucun avis pour l&apos;instant.</p>
      )}
      <Link
        href={cemeteryPath(cemetery)}
        className="mt-2 inline-block rounded-md bg-candle px-3 py-1.5 font-semibold !text-crypt no-underline hover:bg-candle-dark"
      >
        Voir la fiche
      </Link>
    </div>
  );
}

function CemeteryMarkers({ cemeteries }: { cemeteries: readonly CemeteryMarker[] }) {
  return (
    <MarkerClusterGroup chunkedLoading showCoverageOnHover={false} maxClusterRadius={50}>
      {cemeteries.map((cemetery) => (
        <Marker
          key={cemeteryKey(cemetery)}
          position={[cemetery.lat, cemetery.lon]}
          icon={iconFor(cemetery)}
          title={cemetery.name ?? UNNAMED_CEMETERY}
          alt={cemetery.name ?? UNNAMED_CEMETERY}
          keyboard
        >
          <Popup>
            <MarkerPopup cemetery={cemetery} />
          </Popup>
        </Marker>
      ))}
    </MarkerClusterGroup>
  );
}

export default memo(CemeteryMarkers);
