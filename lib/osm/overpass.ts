import { z } from "zod";

import type { BoundingBox } from "@/lib/osm/cells";
import type { CemeteryTags, OsmCemetery, OsmType } from "@/lib/types";

export const OVERPASS_ENDPOINTS: readonly string[] = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const REQUEST_TIMEOUT_MS = 20_000;
const KEPT_TAGS = ["religion", "operator", "wikipedia", "website"] as const;

/* ------------------------------------------------------------------ */
/* Query builder                                                      */
/* ------------------------------------------------------------------ */

/** Builds the Overpass QL queries used by the app. */
export class OverpassQuery {
  private static readonly HEADER = "[out:json][timeout:25];";
  private static readonly OUTPUT = "out center tags;";

  /** Every cemetery (landuse=cemetery or amenity=grave_yard) inside a bbox. */
  static cemeteriesIn(bbox: BoundingBox): string {
    const area = [bbox.south, bbox.west, bbox.north, bbox.east].map((n) => n.toFixed(1)).join(",");
    return [
      OverpassQuery.HEADER,
      "(",
      `  nwr["landuse"="cemetery"](${area});`,
      `  nwr["amenity"="grave_yard"](${area});`,
      ");",
      OverpassQuery.OUTPUT,
    ].join("\n");
  }

  /** One OSM element, e.g. `way(123);`. */
  static element(osmType: OsmType, osmId: number): string {
    if (!Number.isSafeInteger(osmId) || osmId <= 0) throw new RangeError("osmId invalide");
    return `${OverpassQuery.HEADER}\n${osmType}(${osmId});\n${OverpassQuery.OUTPUT}`;
  }
}

/* ------------------------------------------------------------------ */
/* Response parsing                                                   */
/* ------------------------------------------------------------------ */

const coordinate = z.number().finite();

const elementSchema = z.object({
  type: z.enum(["node", "way", "relation"]),
  id: z.number().int().positive(),
  lat: coordinate.optional(),
  lon: coordinate.optional(),
  center: z.object({ lat: coordinate, lon: coordinate }).optional(),
  tags: z.record(z.string(), z.string()).optional(),
});

const responseSchema = z.object({
  elements: z.array(z.unknown()),
  remark: z.string().optional(),
});

type OverpassElement = z.infer<typeof elementSchema>;

export function isCemeteryTags(tags: Record<string, string> | undefined): boolean {
  return tags?.landuse === "cemetery" || tags?.amenity === "grave_yard";
}

function pickTags(tags: Record<string, string>): CemeteryTags {
  const picked: CemeteryTags = {};
  for (const key of KEPT_TAGS) {
    const value = tags[key]?.trim();
    if (value) picked[key] = value;
  }
  return picked;
}

function toCemetery(element: OverpassElement): OsmCemetery | null {
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  if (lat === undefined || lon === undefined) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;

  const tags = element.tags ?? {};
  if (!isCemeteryTags(tags)) return null;

  return {
    osmType: element.type,
    osmId: element.id,
    name: tags.name?.trim() || null,
    lat,
    lon,
    tags: pickTags(tags),
  };
}

/**
 * Turns a raw Overpass JSON payload into cemeteries. Malformed elements,
 * elements without coordinates and non-cemetery elements are skipped;
 * duplicates (same type/id) are removed.
 * Throws `OverpassResponseError` when the payload itself is unusable.
 */
export function parseOverpassResponse(payload: unknown): OsmCemetery[] {
  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success) throw new OverpassResponseError("Réponse Overpass illisible");
  // Overpass reports server-side timeouts/out-of-memory as a 200 with a "remark".
  if (parsed.data.remark && /runtime error|timed out|out of memory/i.test(parsed.data.remark)) {
    throw new OverpassResponseError(`Overpass : ${parsed.data.remark}`);
  }

  const byKey = new Map<string, OsmCemetery>();
  for (const raw of parsed.data.elements) {
    const element = elementSchema.safeParse(raw);
    if (!element.success) continue;
    const cemetery = toCemetery(element.data);
    if (cemetery) byKey.set(`${cemetery.osmType}/${cemetery.osmId}`, cemetery);
  }
  return [...byKey.values()];
}

/* ------------------------------------------------------------------ */
/* HTTP client with fallback endpoints                                */
/* ------------------------------------------------------------------ */

export class OverpassResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OverpassResponseError";
  }
}

/** Every endpoint failed: callers switch to degraded mode. */
export class OverpassUnavailableError extends Error {
  constructor(readonly causes: readonly string[]) {
    super(`Tous les serveurs Overpass ont échoué : ${causes.join(" | ")}`);
    this.name = "OverpassUnavailableError";
  }
}

export type FetchLike = (input: string, init?: RequestInit & { next?: { revalidate?: number } }) => Promise<Response>;

export type OverpassClientOptions = {
  endpoints?: readonly string[];
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  /** overpass-api.de answers 406 to anonymous clients: identify the app. */
  userAgent?: string;
};

export type OverpassRequestOptions = {
  /** Seconds the response may be kept in the Next.js data cache. */
  revalidate?: number;
};

/**
 * Calls Overpass over GET, trying each endpoint in order. An endpoint is
 * skipped on 429, 5xx, timeout, network error or unusable payload.
 */
export class OverpassClient {
  private readonly endpoints: readonly string[];
  private readonly fetchImpl: FetchLike;
  private readonly timeoutMs: number;
  private readonly headers: Record<string, string>;

  constructor(options: OverpassClientOptions = {}) {
    this.endpoints = options.endpoints ?? OVERPASS_ENDPOINTS;
    this.fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
    this.timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
    this.headers = { Accept: "application/json", "User-Agent": options.userAgent ?? "RIP-Advisor/1.0" };
  }

  async cemeteriesIn(bbox: BoundingBox, options: OverpassRequestOptions = {}): Promise<OsmCemetery[]> {
    return this.run(OverpassQuery.cemeteriesIn(bbox), options);
  }

  /** The element if it exists AND is a cemetery, otherwise null. */
  async cemetery(osmType: OsmType, osmId: number, options: OverpassRequestOptions = {}): Promise<OsmCemetery | null> {
    const results = await this.run(OverpassQuery.element(osmType, osmId), options);
    return results.find((c) => c.osmType === osmType && c.osmId === osmId) ?? null;
  }

  private async run(query: string, { revalidate }: OverpassRequestOptions): Promise<OsmCemetery[]> {
    const causes: string[] = [];

    for (const endpoint of this.endpoints) {
      const url = `${endpoint}?data=${encodeURIComponent(query)}`;
      try {
        const response = await this.fetchImpl(url, {
          method: "GET",
          headers: this.headers,
          signal: AbortSignal.timeout(this.timeoutMs),
          ...(revalidate !== undefined ? { next: { revalidate } } : { cache: "no-store" }),
        });
        if (!response.ok) {
          causes.push(`${new URL(endpoint).host}: HTTP ${response.status}`);
          continue;
        }
        return parseOverpassResponse(await response.json());
      } catch (error) {
        causes.push(`${new URL(endpoint).host}: ${error instanceof Error ? error.name : "erreur"}`);
      }
    }

    throw new OverpassUnavailableError(causes);
  }
}
