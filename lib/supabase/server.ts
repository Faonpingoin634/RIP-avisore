import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";

export type ServerSupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * Supabase client bound to the current user's session (cookies + anon key).
 * RLS applies: every query runs with the user's own rights.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(publicEnv.supabaseUrl(), publicEnv.supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The session is refreshed by `proxy.ts`, so this can be ignored.
        }
      },
    },
  });
}
