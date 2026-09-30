import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { loginUrlFor } from "@/lib/auth/safe-redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CurrentUser = { id: string; email: string | null; username: string };

/**
 * The authenticated user, verified against Supabase Auth with `getUser()`
 * (never `getSession()`, which trusts the cookie). Memoised per request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
  return { id: user.id, email: user.email ?? null, username: profile?.username ?? "fantôme" };
});

/** For protected pages: the user, or a redirect to /connexion?next=<returnPath>. */
export async function requireUser(returnPath: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(loginUrlFor(returnPath));
  return user;
}
