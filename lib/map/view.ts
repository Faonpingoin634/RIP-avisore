import { z } from "zod";

export const MIN_CELL_ZOOM = 12;
export const SEARCH_RESULT_ZOOM = 14;
export const LOCATE_ZOOM = 14;

export type MapView = { lat: number; lon: number; zoom: number };

export const DEFAULT_VIEW: MapView = { lat: 48.8566, lon: 2.3522, zoom: 13 };

const viewSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  z: z.coerce.number().int().min(2).max(19).default(DEFAULT_VIEW.zoom),
});

type SearchParams = Record<string, string | string[] | undefined>;

/** Reads `?lat=…&lon=…&z=…` (used by the "Voir sur la carte" link). Falls back to Paris. */
export function viewFromSearchParams(params: SearchParams): MapView {
  const first = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const parsed = viewSchema.safeParse({ lat: first("lat"), lon: first("lon"), z: first("z") });
  if (!parsed.success) return DEFAULT_VIEW;
  return { lat: parsed.data.lat, lon: parsed.data.lon, zoom: parsed.data.z };
}

export function mapUrlFor(lat: number, lon: number, zoom = 16): string {
  return `/?lat=${lat.toFixed(6)}&lon=${lon.toFixed(6)}&z=${zoom}`;
}
