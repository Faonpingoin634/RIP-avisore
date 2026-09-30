"use client";

import type { Map as LeafletMap } from "leaflet";
import { useState } from "react";

import { LOCATE_ZOOM } from "@/lib/map/view";

const DEVICE_HINT =
  "Vérifiez que la localisation est activée sur votre appareil (sous Windows : Paramètres → Confidentialité et sécurité → Localisation), puis réessayez.";

const ERROR_MESSAGES: Record<number, string> = {
  1: "Vous avez refusé la géolocalisation. Autorisez-la dans les réglages de votre navigateur pour vous localiser.",
  2: `Votre position est indisponible. ${DEVICE_HINT}`,
  3: `La localisation a pris trop de temps. ${DEVICE_HINT}`,
};

const TIMEOUT = 3;

function getPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, options));
}

/** "Me localiser" button with explicit messages for refusal and unavailability. */
export default function LocateButton({ map }: { map: LeafletMap | null }) {
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function locate() {
    setMessage(null);
    if (!("geolocation" in navigator)) {
      setMessage("La géolocalisation n'est pas disponible sur ce navigateur.");
      return;
    }
    setLocating(true);
    try {
      let position: GeolocationPosition;
      try {
        position = await getPosition({ enableHighAccuracy: false, timeout: 20_000, maximumAge: 300_000 });
      } catch (error) {
        // Desktop network location is often slow: accept any position the browser already knows.
        if ((error as GeolocationPositionError).code !== TIMEOUT) throw error;
        position = await getPosition({ enableHighAccuracy: false, timeout: 10_000, maximumAge: Infinity });
      }
      map?.flyTo([position.coords.latitude, position.coords.longitude], LOCATE_ZOOM);
    } catch (error) {
      const code = (error as GeolocationPositionError).code;
      setMessage(ERROR_MESSAGES[code] ?? "Impossible de vous localiser.");
    } finally {
      setLocating(false);
    }
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
        onClick={() => void locate()}
        disabled={locating || !map}
        className="rounded-full border border-mist bg-tomb px-4 py-2 font-semibold text-bone shadow-xl hover:bg-vault disabled:cursor-wait disabled:opacity-60"
      >
        <span aria-hidden="true">📍 </span>
        {locating ? "Localisation…" : "Me localiser"}
      </button>
    </div>
  );
}
