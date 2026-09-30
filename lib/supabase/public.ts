import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";

let instance: SupabaseClient<Database> | null = null;

/**
 * Session-less anon client for public reads in Route Handlers (map data).
 * RLS applies exactly as for an anonymous visitor.
 */
export function getSupabasePublicClient(): SupabaseClient<Database> {
  instance ??= createClient<Database>(publicEnv.supabaseUrl(), publicEnv.supabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return instance;
}
