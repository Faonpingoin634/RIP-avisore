import { NextResponse } from "next/server";

import { createCemeteryService } from "@/lib/services/factory";

// Always computed at request time: it reflects the latest reviews.
export const dynamic = "force-dynamic";

/** GET /api/cemeteries/reviewed → up to 500 cemeteries with at least one review. */
export async function GET() {
  try {
    const service = createCemeteryService();
    const cemeteries = await service.reviewedCemeteries();
    return NextResponse.json(
      { cemeteries, degraded: false },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } },
    );
  } catch (error) {
    console.error("[api/cemeteries/reviewed]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
