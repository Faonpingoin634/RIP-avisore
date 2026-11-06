import "server-only";

import { required } from "@/lib/env";

/** Server-only secrets. Importing this file from a Client Component fails the build. */
export const serverEnv = {
  supabaseServiceRoleKey: (): string => required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),
  nominatimContactEmail: (): string => required("NOMINATIM_CONTACT_EMAIL", process.env.NOMINATIM_CONTACT_EMAIL),
  /** Optional: without it, only the free public Overpass instances are used. */
  overpassChApiKey: (): string | undefined => process.env.OVERPASS_CH_API_KEY?.trim() || undefined,
};
