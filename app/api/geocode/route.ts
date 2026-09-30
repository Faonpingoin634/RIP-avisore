import { NextResponse, type NextRequest } from "next/server";

import { geocodeQuerySchema, NominatimClient } from "@/lib/osm/nominatim";
import { osmUserAgent } from "@/lib/services/factory";

/** GET /api/geocode?q=… → up to 5 places (proxy to Nominatim, cached 1 day). */
export async function GET(request: NextRequest) {
  const parsed = geocodeQuerySchema.safeParse(request.nextUrl.searchParams.get("q") ?? "");
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Requête invalide" }, { status: 400 });
  }

  try {
    const places = await new NominatimClient(osmUserAgent()).search(parsed.data);
    return NextResponse.json(
      { places },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400" } },
    );
  } catch (error) {
    console.error("[api/geocode]", error);
    return NextResponse.json(
      { error: "La recherche de lieu est momentanément indisponible." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
