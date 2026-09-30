import "server-only";

import { OverpassClient } from "@/lib/osm/overpass";
import { CemeteryRepository } from "@/lib/repositories/cemetery-repository";
import { ReviewRepository } from "@/lib/repositories/review-repository";
import { serverEnv } from "@/lib/server-env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabasePublicClient } from "@/lib/supabase/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CemeteryService } from "./cemetery-service";
import { ReviewService } from "./review-service";

/*
 * Composition root: the only place that decides which Supabase client each
 * component receives. The admin client is handed exclusively to the cemetery
 * writer; reviews always use the user's session so RLS applies.
 */

/** Identifies the app to OpenStreetMap services, as their usage policies require. */
export function osmUserAgent(): string {
  return `RIP-Advisor/1.0 (${serverEnv.nominatimContactEmail()})`;
}

export function createOverpassClient(): OverpassClient {
  return new OverpassClient({ userAgent: osmUserAgent() });
}

/** Map data: public, session-less reads. */
export function createCemeteryService(): CemeteryService {
  return new CemeteryService(createOverpassClient(), new CemeteryRepository(getSupabasePublicClient()));
}

/** Cemetery page: reads + lazy insertion of Overpass-verified cemeteries. */
export function createCemeteryPageService(): CemeteryService {
  return new CemeteryService(
    createOverpassClient(),
    new CemeteryRepository(getSupabasePublicClient()),
    new CemeteryRepository(getSupabaseAdminClient()),
  );
}

/** Reviews: bound to the current user's session (never the admin client). */
export async function createReviewService(): Promise<ReviewService> {
  return new ReviewService(new ReviewRepository(await createSupabaseServerClient()));
}
