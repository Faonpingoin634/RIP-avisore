import "server-only";

/** Server-only secrets. Importing this file from a Client Component fails the build. */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${name}. Voir .env.example et le README.`);
  }
  return value;
}

export const serverEnv = {
  supabaseServiceRoleKey: (): string => required("SUPABASE_SERVICE_ROLE_KEY"),
  nominatimContactEmail: (): string => required("NOMINATIM_CONTACT_EMAIL"),
};
