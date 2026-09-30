import { z } from "zod";

import type { FetchLike } from "@/lib/osm/overpass";

export const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
export const GEOCODE_QUERY_MIN = 2;
export const GEOCODE_QUERY_MAX = 100;
const MAX_RESULTS = 5;

export type Place = { label: string; lat: number; lon: number };

/** Search query sent by the client: trimmed, 2 to 100 characters. */
export const geocodeQuerySchema = z
  .string()
  .trim()
  .min(GEOCODE_QUERY_MIN, `Saisissez au moins ${GEOCODE_QUERY_MIN} caractères.`)
  .max(GEOCODE_QUERY_MAX, `${GEOCODE_QUERY_MAX} caractères maximum.`);

const resultSchema = z.object({
  display_name: z.string(),
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

/** Keeps well-formed results only (Nominatim returns lat/lon as strings). */
export function parseNominatimResponse(payload: unknown): Place[] {
  if (!Array.isArray(payload)) throw new Error("Réponse Nominatim illisible");
  const places: Place[] = [];
  for (const raw of payload) {
    const result = resultSchema.safeParse(raw);
    if (result.success) places.push({ label: result.data.display_name, lat: result.data.lat, lon: result.data.lon });
  }
  return places.slice(0, MAX_RESULTS);
}

/** Server-side Nominatim client (no autocomplete: called on form submit only). */
export class NominatimClient {
  constructor(
    private readonly userAgent: string,
    private readonly fetchImpl: FetchLike = (input, init) => fetch(input, init),
  ) {}

  async search(query: string): Promise<Place[]> {
    const url = new URL(NOMINATIM_SEARCH_URL);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", String(MAX_RESULTS));
    url.searchParams.set("q", query);

    const response = await this.fetchImpl(url.toString(), {
      headers: { "User-Agent": this.userAgent, "Accept-Language": "fr", Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
      next: { revalidate: 86_400 },
    });
    if (!response.ok) throw new Error(`Nominatim : HTTP ${response.status}`);
    return parseNominatimResponse(await response.json());
  }
}
