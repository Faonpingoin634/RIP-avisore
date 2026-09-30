import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16 renamed `middleware.ts` to `proxy.ts` (same role, same API).
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except static assets and the public OSM proxies (no session needed there).
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
