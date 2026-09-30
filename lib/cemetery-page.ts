import "server-only";

import { cache } from "react";
import { z } from "zod";

import { createCemeteryPageService } from "@/lib/services/factory";
import type { CemeteryLookup } from "@/lib/services/cemetery-service";
import { OSM_TYPES, type OsmType } from "@/lib/types";

const paramsSchema = z.object({
  osmType: z.enum(OSM_TYPES as [OsmType, ...OsmType[]]),
  osmId: z
    .string()
    .regex(/^[1-9]\d{0,15}$/)
    .transform(Number)
    .refine(Number.isSafeInteger),
});

export type CemeteryParams = { osmType: string; osmId: string };

/** Validated route params, or null (→ notFound). */
export function parseCemeteryParams(params: CemeteryParams): { osmType: OsmType; osmId: number } | null {
  const parsed = paramsSchema.safeParse(params);
  return parsed.success ? parsed.data : null;
}

/** Memoised per request: shared by generateMetadata and the page. */
export const lookupCemetery = cache(
  (osmType: OsmType, osmId: number): Promise<CemeteryLookup> => createCemeteryPageService().findOrCreate(osmType, osmId),
);
