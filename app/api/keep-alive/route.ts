import { NextResponse } from "next/server";

import { createCemeteryService } from "@/lib/services/factory";

// Must really reach the database on every call: never cached.
export const dynamic = "force-dynamic";

/** GET /api/keep-alive, called daily by the Vercel cron (vercel.json). Returns no data. */
export async function GET() {
  try {
    await createCemeteryService().keepDatabaseAwake();
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[api/keep-alive]", error);
    return NextResponse.json({ ok: false }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
