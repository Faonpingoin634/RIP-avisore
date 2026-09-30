import type { SupabaseClient } from "@supabase/supabase-js";

import { fail, ok, UNEXPECTED_ERROR, type ActionResult } from "@/lib/actions/result";
import type { Database } from "@/lib/supabase/database.types";
import type { SignInInput, SignUpInput } from "@/lib/validation/auth";

export const USERNAME_TAKEN = "Ce pseudo est déjà pris. Choisissez-en un autre.";

/** Maps Supabase Auth error codes to French, user-facing messages. */
export function authErrorMessage(error: { code?: string; message: string }): string {
  switch (error.code) {
    case "user_already_exists":
    case "email_exists":
      return "Un compte existe déjà avec cet email. Connectez-vous plutôt.";
    case "invalid_credentials":
      return "Email ou mot de passe incorrect.";
    case "email_not_confirmed":
      return "Votre adresse email n'est pas encore confirmée.";
    case "weak_password":
      return "Ce mot de passe est trop faible. Choisissez-en un plus long ou plus varié.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Trop de tentatives. Patientez quelques minutes avant de réessayer.";
    case "signup_disabled":
      return "Les inscriptions sont momentanément fermées.";
    default:
      // The profile trigger failing on the unique username (race with another sign-up).
      if (/database error saving new user/i.test(error.message)) return USERNAME_TAKEN;
      return UNEXPECTED_ERROR;
  }
}

/** Authentication use cases, on top of a Supabase client bound to the request cookies. */
export class AuthService {
  constructor(private readonly db: SupabaseClient<Database>) {}

  async isUsernameTaken(username: string): Promise<boolean> {
    const { data, error } = await this.db.from("profiles").select("id").eq("username", username).maybeSingle();
    if (error) throw new Error(`Vérification du pseudo : ${error.message}`);
    return data !== null;
  }

  async signUp(input: SignUpInput): Promise<ActionResult> {
    if (await this.isUsernameTaken(input.username)) {
      return fail(USERNAME_TAKEN, { username: [USERNAME_TAKEN] });
    }

    const { data, error } = await this.db.auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { username: input.username } },
    });
    if (error) return fail(authErrorMessage(error));

    // With "Confirm email" enabled, Supabase hides existing accounts behind a fake user without identities.
    if (data.user && data.user.identities?.length === 0) {
      return fail(authErrorMessage({ code: "user_already_exists", message: "" }));
    }
    if (!data.session) {
      return fail("Compte créé, mais la confirmation par email est activée sur le projet Supabase (voir le README).");
    }
    return ok();
  }

  async signIn(input: SignInInput): Promise<ActionResult> {
    const { error } = await this.db.auth.signInWithPassword({ email: input.email, password: input.password });
    return error ? fail(authErrorMessage(error)) : ok();
  }

  async signOut(): Promise<void> {
    await this.db.auth.signOut();
  }
}
