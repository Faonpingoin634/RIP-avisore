import { createBrowserClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/** Browser Supabase client (anon key). Read-only usage: all mutations go through Server Actions. */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(publicEnv.supabaseUrl(), publicEnv.supabaseAnonKey());
}
