import type { SupabaseClient } from "@supabase/supabase-js";

import type { BoundingBox } from "@/lib/osm/cells";
import type { Database, Json } from "@/lib/supabase/database.types";
import {
  cemeteryKey,
  type CemeteryMarker,
  type CemeteryTags,
  type OsmCemetery,
  type OsmType,
  type RatingSummary,
} from "@/lib/types";

type CemeteryRow = Database["public"]["Tables"]["cemeteries"]["Row"];
type RatingRow = Database["public"]["Views"]["cemetery_ratings"]["Row"];

/** A cemetery stored in our database (it has been opened at least once). */
export type StoredCemetery = OsmCemetery & RatingSummary & { id: string };

export class RepositoryError extends Error {
  constructor(operation: string, cause: { message: string; code?: string }) {
    super(`${operation} : ${cause.message}`);
    this.name = "RepositoryError";
  }
}

// Keeps PostgREST URLs short for `in (...)` filters.
const IN_FILTER_CHUNK = 100;
const NO_RATING: RatingSummary = { reviewCount: 0, avgRating: null, avgHumidity: null };

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function toTags(json: Json): CemeteryTags {
  if (json === null || typeof json !== "object" || Array.isArray(json)) return {};
  const tags: CemeteryTags = {};
  for (const key of ["religion", "operator", "wikipedia", "website"] as const) {
    const value = json[key];
    if (typeof value === "string" && value) tags[key] = value;
  }
  return tags;
}

function toRating(row: RatingRow | undefined): RatingSummary {
  if (!row) return NO_RATING;
  return {
    reviewCount: row.review_count,
    avgRating: row.avg_rating === null ? null : Number(row.avg_rating),
    avgHumidity: row.avg_humidity === null ? null : Number(row.avg_humidity),
  };
}

function toStored(row: CemeteryRow, rating: RatingRow | undefined): StoredCemetery {
  return {
    id: row.id,
    osmType: row.osm_type,
    osmId: row.osm_id,
    name: row.name,
    lat: row.latitude,
    lon: row.longitude,
    tags: toTags(row.tags),
    ...toRating(rating),
  };
}

/**
 * Data access for cemeteries and their aggregated ratings (Repository pattern).
 * The Supabase client is injected: pass the public client for reads, the admin
 * client only for `insertVerified`.
 */
export class CemeteryRepository {
  constructor(private readonly db: SupabaseClient<Database>) {}

  async findByOsm(osmType: OsmType, osmId: number): Promise<StoredCemetery | null> {
    const { data, error } = await this.db
      .from("cemeteries")
      .select("*")
      .eq("osm_type", osmType)
      .eq("osm_id", osmId)
      .maybeSingle();
    if (error) throw new RepositoryError("Lecture du cimetière", error);
    if (!data) return null;
    const ratings = await this.ratingsFor([data.id]);
    return toStored(data, ratings.get(data.id));
  }

  /** Stored cemeteries among the given OSM elements, keyed by "type/id". */
  async findManyByOsm(elements: readonly OsmCemetery[]): Promise<Map<string, StoredCemetery>> {
    const wanted = new Set(elements.map(cemeteryKey));
    const ids = [...new Set(elements.map((e) => e.osmId))];
    const rows: CemeteryRow[] = [];

    for (const part of chunk(ids, IN_FILTER_CHUNK)) {
      const { data, error } = await this.db.from("cemeteries").select("*").in("osm_id", part);
      if (error) throw new RepositoryError("Lecture des cimetières", error);
      rows.push(...data);
    }

    const matching = rows.filter((row) => wanted.has(`${row.osm_type}/${row.osm_id}`));
    return this.withRatings(matching);
  }

  async findInBbox(bbox: BoundingBox): Promise<StoredCemetery[]> {
    const { data, error } = await this.db
      .from("cemeteries")
      .select("*")
      .gte("latitude", bbox.south)
      .lt("latitude", bbox.north)
      .gte("longitude", bbox.west)
      .lt("longitude", bbox.east)
      .limit(1000);
    if (error) throw new RepositoryError("Lecture des cimetières de la zone", error);
    return [...(await this.withRatings(data)).values()];
  }

  /** Cemeteries with at least one review, most reviewed first. */
  async findReviewed(limit: number): Promise<StoredCemetery[]> {
    const { data: ratings, error } = await this.db
      .from("cemetery_ratings")
      .select("*")
      .gt("review_count", 0)
      .order("review_count", { ascending: false })
      .limit(limit);
    if (error) throw new RepositoryError("Lecture des cimetières notés", error);

    const ratingById = new Map(ratings.map((r) => [r.cemetery_id, r]));
    const rows: CemeteryRow[] = [];
    for (const part of chunk([...ratingById.keys()], IN_FILTER_CHUNK)) {
      const { data, error: rowsError } = await this.db.from("cemeteries").select("*").in("id", part);
      if (rowsError) throw new RepositoryError("Lecture des cimetières notés", rowsError);
      rows.push(...data);
    }

    return rows
      .map((row) => toStored(row, ratingById.get(row.id)))
      .sort((a, b) => b.reviewCount - a.reviewCount);
  }

  /**
   * Inserts a cemetery whose data comes from Overpass (never from the browser).
   * Requires the admin client: there is no insert policy on `cemeteries`.
   * Idempotent: `on conflict (osm_type, osm_id) do nothing`.
   */
  async insertVerified(cemetery: OsmCemetery): Promise<void> {
    const { error } = await this.db.from("cemeteries").upsert(
      {
        osm_type: cemetery.osmType,
        osm_id: cemetery.osmId,
        name: cemetery.name,
        latitude: cemetery.lat,
        longitude: cemetery.lon,
        tags: cemetery.tags,
      },
      { onConflict: "osm_type,osm_id", ignoreDuplicates: true },
    );
    if (error) throw new RepositoryError("Enregistrement du cimetière", error);
  }

  private async ratingsFor(ids: readonly string[]): Promise<Map<string, RatingRow>> {
    const result = new Map<string, RatingRow>();
    for (const part of chunk(ids, IN_FILTER_CHUNK)) {
      const { data, error } = await this.db.from("cemetery_ratings").select("*").in("cemetery_id", part);
      if (error) throw new RepositoryError("Lecture des notes", error);
      data.forEach((row) => result.set(row.cemetery_id, row));
    }
    return result;
  }

  private async withRatings(rows: readonly CemeteryRow[]): Promise<Map<string, StoredCemetery>> {
    const ratings = await this.ratingsFor(rows.map((r) => r.id));
    return new Map(rows.map((row) => [`${row.osm_type}/${row.osm_id}`, toStored(row, ratings.get(row.id))]));
  }
}

export function toMarker(cemetery: OsmCemetery, stored: StoredCemetery | undefined): CemeteryMarker {
  if (!stored) return { ...cemetery, ...NO_RATING };
  return {
    ...cemetery,
    reviewCount: stored.reviewCount,
    avgRating: stored.avgRating,
    avgHumidity: stored.avgHumidity,
  };
}
