"use client";

import type { Map as LeafletMap } from "leaflet";
import { useId, useState, type FormEvent } from "react";
import { z } from "zod";

import { SEARCH_RESULT_ZOOM } from "@/lib/map/view";
import { geocodeQuerySchema, type Place } from "@/lib/osm/nominatim";

const responseSchema = z.object({
  places: z.array(z.object({ label: z.string(), lat: z.number(), lon: z.number() })),
});

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; places: Place[] }
  | { status: "error"; message: string };

/** Place search, submitted explicitly (Nominatim forbids autocomplete). */
export default function PlaceSearch({ map }: { map: LeafletMap | null }) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>({ status: "idle" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = geocodeQuerySchema.safeParse(query);
    if (!parsed.success) {
      setState({ status: "error", message: parsed.error.issues[0]?.message ?? "Recherche invalide." });
      return;
    }

    setState({ status: "loading" });
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(parsed.data)}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const { places } = responseSchema.parse(await response.json());
      setState({ status: "done", places });
    } catch {
      setState({ status: "error", message: "La recherche de lieu est momentanément indisponible. Réessayez." });
    }
  }

  function goTo(place: Place) {
    map?.flyTo([place.lat, place.lon], SEARCH_RESULT_ZOOM);
    setState({ status: "idle" });
  }

  const loading = state.status === "loading";

  return (
    <div className="pointer-events-auto w-full rounded-lg border border-mist bg-tomb/95 p-2 shadow-xl backdrop-blur">
      <form role="search" onSubmit={handleSubmit} className="flex gap-2">
        <label htmlFor={inputId} className="sr-only">
          Rechercher un lieu
        </label>
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une ville, une adresse…"
          maxLength={100}
          className="min-w-0 flex-1 rounded-md border border-mist bg-vault px-3 py-2 text-bone placeholder:text-ash"
        />
        <button
          type="submit"
          disabled={loading || !map}
          className="rounded-md bg-candle px-4 py-2 font-semibold text-crypt hover:bg-candle-dark disabled:cursor-wait disabled:opacity-60"
        >
          {loading ? "Recherche…" : "Rechercher"}
        </button>
      </form>

      <div aria-live="polite">
        {state.status === "error" && <p className="mt-2 px-1 text-blood">{state.message}</p>}
        {state.status === "done" && state.places.length === 0 && (
          <p className="mt-2 px-1 text-ash">Aucun lieu trouvé.</p>
        )}
        {state.status === "done" && state.places.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1" aria-label="Résultats de la recherche">
            {state.places.map((place) => (
              <li key={`${place.lat},${place.lon},${place.label}`}>
                <button
                  type="button"
                  onClick={() => goTo(place)}
                  className="w-full rounded-md px-3 py-2 text-left text-bone hover:bg-vault"
                >
                  {place.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
