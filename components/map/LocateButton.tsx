"use client";

import type { Map as LeafletMap } from "leaflet";
import { useState } from "react";

import { LOCATE_ZOOM } from "@/lib/map/view";

const ERROR_MESSAGES: Record<number, string> = {
  1: "Vous avez refusé la géolocalisation. Autorisez-la dans les réglages de votre navigateur pour vous localiser.",
  2: "Votre position est indisponible pour le moment.",
  3: "La localisation a pris trop de temps. Réessayez.",
};

/** "Me localiser" button with explicit messages for refusal and unavailability. */
export default function LocateButton({ map }: { map: LeafletMap | null }) {
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function locate() {
    setMessage(null);
    if (!("geolocation" in navigator)) {
      setMessage("La géolocalisation n'est pas disponible sur ce navigateur.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        map?.flyTo([position.coords.latitude, position.coords.longitude], LOCATE_ZOOM);
      },
      (error) => {
        setLocating(false);
        setMessage(ERROR_MESSAGES[error.code] ?? "Impossible de vous localiser.");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  return (
    <div className="pointer-events-auto flex max-w-sm flex-col items-start gap-2">
      <div aria-live="polite">
        {message && (
          <p className="rounded-md border border-mist bg-tomb/95 px-3 py-2 text-blood shadow-xl">
            {message}{" "}
            <button type="button" onClick={() => setMessage(null)} className="ml-1 text-ash underline">
              Fermer
            </button>
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={locate}
        disabled={locating || !map}
        className="rounded-full border border-mist bg-tomb px-4 py-2 font-semibold text-bone shadow-xl hover:bg-vault disabled:cursor-wait disabled:opacity-60"
      >
        <span aria-hidden="true">📍 </span>
        {locating ? "Localisation…" : "Me localiser"}
      </button>
    </div>
  );
}
