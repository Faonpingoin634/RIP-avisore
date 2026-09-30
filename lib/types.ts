import type { OsmType, ReviewVibe } from "@/lib/supabase/database.types";

export type { OsmType, ReviewVibe };

export const OSM_TYPES: readonly OsmType[] = ["node", "way", "relation"];

/** Subset of OSM tags we keep and display. */
export type CemeteryTags = {
  religion?: string;
  operator?: string;
  wikipedia?: string;
  website?: string;
};

/** A cemetery as read from OpenStreetMap (Overpass), before any database enrichment. */
export type OsmCemetery = {
  osmType: OsmType;
  osmId: number;
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

/** A map marker: OSM data + aggregated ratings (0 reviews when never rated). */
export type CemeteryMarker = OsmCemetery & RatingSummary;

export type CemeteriesResponse = {
  cemeteries: CemeteryMarker[];
  degraded: boolean;
};

export function cemeteryKey(c: { osmType: OsmType; osmId: number }): string {
  return `${c.osmType}/${c.osmId}`;
}

export function cemeteryPath(c: { osmType: OsmType; osmId: number }): string {
  return `/cimetieres/${c.osmType}/${c.osmId}`;
}

export const UNNAMED_CEMETERY = "Cimetière sans nom";
