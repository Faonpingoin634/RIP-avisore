import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import type { Database, OsmType, ReviewVibe } from "@/lib/supabase/database.types";
import type { CemeteryRef } from "@/lib/types";
import { RepositoryError } from "./errors";

export type Review = {
  id: string;
  cemeteryId: string;
  userId: string;
  username: string;
  rating: number;
  humidity: number;
  vibes: ReviewVibe[];
  comment: string;
  createdAt: string;
  updatedAt: string;
};

export type ReviewWithCemetery = Review & {
  cemetery: CemeteryRef & { name: string | null };
};

export type ReviewFields = Pick<Review, "rating" | "humidity" | "vibes" | "comment">;

/** Postgres error surfaced to the service layer, which turns it into a user message. */
export class ReviewWriteError extends Error {
  constructor(readonly code: string | undefined, message: string) {
    super(message);
    this.name = "ReviewWriteError";
  }
}

const REVIEW_COLUMNS = "id, cemetery_id, user_id, rating, humidity, vibes, comment, created_at, updated_at";
const WITH_AUTHOR = `${REVIEW_COLUMNS}, author:profiles!reviews_user_id_fkey(username)`;
const CEMETERY_JOIN = "cemetery:cemeteries!reviews_cemetery_id_fkey";
const WITH_CEMETERY = `${WITH_AUTHOR}, ${CEMETERY_JOIN}(osm_type, osm_id, name)`;
/** Returned by update/delete: where the affected review lives, to revalidate or redirect. */
const MUTATION_RETURNING = `${CEMETERY_JOIN}(osm_type, osm_id)`;

type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];
type AuthorJoin = { author: { username: string } | null };
type CemeteryJoin = { cemetery: { osm_type: OsmType; osm_id: number; name: string | null } | null };

function toReview(row: ReviewRow & AuthorJoin): Review {
  return {
    id: row.id,
    cemeteryId: row.cemetery_id,
    userId: row.user_id,
    username: row.author?.username ?? "fantôme",
    rating: row.rating,
    humidity: row.humidity,
    vibes: row.vibes,
    comment: row.comment,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toReviewWithCemetery(row: ReviewRow & AuthorJoin & CemeteryJoin): ReviewWithCemetery | null {
  if (!row.cemetery) return null;
  const { osm_type, osm_id, name } = row.cemetery;
  return { ...toReview(row), cemetery: { osmType: osm_type, osmId: osm_id, name } };
}

/** The cemetery of the single affected row, or null when nothing matched (not found / not the owner). */
function affectedCemetery(rows: ReadonlyArray<{ cemetery: { osm_type: OsmType; osm_id: number } | null }>): CemeteryRef | null {
  const cemetery = rows.length === 1 ? rows[0].cemetery : null;
  return cemetery ? { osmType: cemetery.osm_type, osmId: cemetery.osm_id } : null;
}

function writeError(error: PostgrestError): ReviewWriteError {
  return new ReviewWriteError(error.code, error.message);
}

/**
 * Data access for reviews (Repository pattern). It must receive the Supabase
 * client bound to the user's session so that RLS policies apply.
 */
export class ReviewRepository {
  constructor(private readonly db: SupabaseClient<Database>) {}

  /** Public reviews of a cemetery, newest first. */
  async listForCemetery(cemeteryId: string): Promise<Review[]> {
    const { data, error } = await this.db
      .from("reviews")
      .select(WITH_AUTHOR)
      .eq("cemetery_id", cemeteryId)
      .order("created_at", { ascending: false });
    if (error) throw new RepositoryError("Lecture des avis", error);
    return data.map(toReview);
  }

  async listByUser(userId: string): Promise<ReviewWithCemetery[]> {
    const { data, error } = await this.db
      .from("reviews")
      .select(WITH_CEMETERY)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (error) throw new RepositoryError("Lecture de vos avis", error);
    return data.flatMap((row) => toReviewWithCemetery(row) ?? []);
  }

  /** A review only if it belongs to `userId`. */
  async findOwned(reviewId: string, userId: string): Promise<ReviewWithCemetery | null> {
    const { data, error } = await this.db
      .from("reviews")
      .select(WITH_CEMETERY)
      .eq("id", reviewId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new RepositoryError("Lecture de l'avis", error);
    return data ? toReviewWithCemetery(data) : null;
  }

  async findByAuthor(cemeteryId: string, userId: string): Promise<Review | null> {
    const { data, error } = await this.db
      .from("reviews")
      .select(WITH_AUTHOR)
      .eq("cemetery_id", cemeteryId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new RepositoryError("Lecture de votre avis", error);
    return data ? toReview(data) : null;
  }

  async create(cemeteryId: string, userId: string, fields: ReviewFields): Promise<string> {
    const { data, error } = await this.db
      .from("reviews")
      .insert({ cemetery_id: cemeteryId, user_id: userId, ...fields })
      .select("id")
      .single();
    if (error) throw writeError(error);
    return data.id;
  }

  /** Updates only if `userId` owns the review. Returns its cemetery, or null if nothing matched. */
  async update(reviewId: string, userId: string, fields: ReviewFields): Promise<CemeteryRef | null> {
    const { data, error } = await this.db
      .from("reviews")
      .update(fields)
      .eq("id", reviewId)
      .eq("user_id", userId)
      .select(MUTATION_RETURNING);
    if (error) throw writeError(error);
    return affectedCemetery(data);
  }

  /** Deletes only if `userId` owns the review. Returns its cemetery, or null if nothing matched. */
  async delete(reviewId: string, userId: string): Promise<CemeteryRef | null> {
    const { data, error } = await this.db
      .from("reviews")
      .delete()
      .eq("id", reviewId)
      .eq("user_id", userId)
      .select(MUTATION_RETURNING);
    if (error) throw writeError(error);
    return affectedCemetery(data);
  }
}
