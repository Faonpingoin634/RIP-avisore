import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/server-env";
import type { Database } from "./database.types";

export type AdminSupabaseClient = SupabaseClient<Database>;

let instance: AdminSupabaseClient | null = null;

/**
 * Service-role client (bypasses RLS). Singleton, server only.
 * Its ONLY use is inserting cemeteries whose data was verified against Overpass.
 * Never use it for reviews.
 */
export function getSupabaseAdminClient(): AdminSupabaseClient {
  instance ??= createClient<Database>(publicEnv.supabaseUrl(), serverEnv.supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return instance;
}
