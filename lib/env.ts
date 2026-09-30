/**
 * Environment access. Values are read lazily (never at import time) so that
 * `next build` works on a fresh clone, and a missing variable produces an
 * explicit error at the point of use instead of an obscure crash.
 *
 * `NEXT_PUBLIC_*` variables must be referenced literally so Next.js can inline
 * them in the browser bundle.
 */

class MissingEnvError extends Error {
  constructor(name: string) {
    super(`Variable d'environnement manquante : ${name}. Voir .env.example et le README.`);
    this.name = "MissingEnvError";
  }
}

function required(name: string, value: string | undefined): string {
  if (!value) throw new MissingEnvError(name);
  return value;
}

export const publicEnv = {
  supabaseUrl: (): string =>
    required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: (): string =>
    required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
};
