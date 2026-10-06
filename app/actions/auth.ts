"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { fail, fieldErrorsFrom, INVALID_FORM, UNEXPECTED_ERROR, type FormState } from "@/lib/actions/result";
import { safeNextPath } from "@/lib/auth/safe-redirect";
import { AuthService } from "@/lib/services/auth-service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signInSchema, signUpSchema } from "@/lib/validation/auth";

async function authService(): Promise<AuthService> {
  return new AuthService(await createSupabaseServerClient());
}

/**
 * The header shows who is logged in: refresh the client router. Deliberately NOT
 * `revalidatePath("/", "layout")`, which would also purge the server data cache,
 * i.e. the 7-day Overpass cache of the whole map, on every sign-in.
 */
function refreshSession(): void {
  refresh();
}

function nextFrom(formData: FormData): string {
  const value = formData.get("next");
  return safeNextPath(typeof value === "string" ? value : null);
}

export async function signUpAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse({
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return fail(INVALID_FORM, fieldErrorsFrom(parsed.error));

  try {
    const result = await (await authService()).signUp(parsed.data);
    if (!result.ok) return result;
  } catch (error) {
    console.error("[signUp]", error);
    return fail(UNEXPECTED_ERROR);
  }

  refreshSession();
  redirect(nextFrom(formData));
}

export async function signInAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return fail(INVALID_FORM, fieldErrorsFrom(parsed.error));

  try {
    const result = await (await authService()).signIn(parsed.data);
    if (!result.ok) return result;
  } catch (error) {
    console.error("[signIn]", error);
    return fail(UNEXPECTED_ERROR);
  }

  refreshSession();
  redirect(nextFrom(formData));
}

export async function signOutAction(): Promise<void> {
  await (await authService()).signOut();
  refreshSession();
  redirect("/");
}
