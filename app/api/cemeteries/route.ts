import { NextResponse, type NextRequest } from "next/server";

import { Cell } from "@/lib/osm/cells";
import { createCemeteryService } from "@/lib/services/factory";

export const maxDuration = 60;

// Overpass itself is cached 7 days server-side (fetch revalidate). The combined
// response also carries live ratings, so the CDN keeps it only briefly.
const CACHE_CONTROL = "public, s-maxage=60, stale-while-revalidate=300";

/** GET /api/cemeteries?cell=488_23 → cemeteries of one 0.1° cell. */
export async function GET(request: NextRequest) {
  const cellId = request.nextUrl.searchParams.get("cell") ?? "";
  const cell = Cell.fromId(cellId);
  if (!cell) {
    return NextResponse.json({ error: "Paramètre « cell » invalide" }, { status: 400 });
  }

  try {
    const service = createCemeteryService();
    const body = await service.cemeteriesInCell(cell);
    return NextResponse.json(body, {
      headers: { "Cache-Control": body.degraded ? "no-store" : CACHE_CONTROL },
    });
  } catch (error) {
    console.error(`[api/cemeteries] cellule ${cell.id}`, error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
