import "server-only";

import { OverpassClient } from "@/lib/osm/overpass";
import { CemeteryRepository } from "@/lib/repositories/cemetery-repository";
import { serverEnv } from "@/lib/server-env";
import { getSupabasePublicClient } from "@/lib/supabase/public";
import { CemeteryService } from "./cemetery-service";

/** Identifies the app to OpenStreetMap services, as their usage policies require. */
export function osmUserAgent(): string {
  return `RIP-Advisor/1.0 (${serverEnv.nominatimContactEmail()})`;
}

export function createOverpassClient(): OverpassClient {
  return new OverpassClient({ userAgent: osmUserAgent() });
}

/** Composition root for the map data service (public, session-less reads). */
export function createCemeteryService(): CemeteryService {
  return new CemeteryService(createOverpassClient(), new CemeteryRepository(getSupabasePublicClient()));
}
