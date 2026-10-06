import type { OsmType, ReviewVibe } from "@/lib/supabase/database.types";

export type { OsmType, ReviewVibe };

/** Non-empty tuple so it can feed `z.enum` directly. */
export const OSM_TYPES = ["node", "way", "relation"] as const satisfies readonly OsmType[];

/** OSM tags we keep, store and display (everything else is dropped). */
export const CEMETERY_TAG_KEYS = ["religion", "operator", "wikipedia", "website"] as const;

export type CemeteryTags = Partial<Record<(typeof CEMETERY_TAG_KEYS)[number], string>>;

/** Identifies a cemetery by its OpenStreetMap element. */
export type CemeteryRef = { osmType: OsmType; osmId: number };

/** A cemetery as read from OpenStreetMap (Overpass), before any database enrichment. */
export type OsmCemetery = CemeteryRef & {
  name: string | null;
  lat: number;
  lon: number;
  tags: CemeteryTags;
};

export type RatingSummary = {
  reviewCount: number;
  avgRating: number | null;
  avgHumidity: number | null;
};

export const NO_RATING: RatingSummary = { reviewCount: 0, avgRating: null, avgHumidity: null };

/** A map marker: OSM data + aggregated ratings (0 reviews when never rated). */
export type CemeteryMarker = OsmCemetery & RatingSummary;

export type CemeteriesResponse = {
  cemeteries: CemeteryMarker[];
  degraded: boolean;
};

export function cemeteryKey(c: CemeteryRef): string {
  return `${c.osmType}/${c.osmId}`;
}

export function cemeteryPath(c: CemeteryRef): string {
  return `/cimetieres/${c.osmType}/${c.osmId}`;
}

export function editReviewPath(reviewId: string): string {
  return `/avis/${reviewId}/modifier`;
}

export const UNNAMED_CEMETERY = "Cimetière sans nom";

/** Display name: OSM name, or « Cimetière sans nom ». */
export function cemeteryName(c: { name: string | null }): string {
  return c.name ?? UNNAMED_CEMETERY;
}

/** Keeps the known, non-empty string tags of an untrusted object (OSM tags or stored JSON). */
export function pickCemeteryTags(source: Record<string, unknown>): CemeteryTags {
  const tags: CemeteryTags = {};
  for (const key of CEMETERY_TAG_KEYS) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) tags[key] = value.trim();
  }
  return tags;
}
