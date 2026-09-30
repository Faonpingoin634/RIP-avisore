import { describe, expect, it } from "vitest";

import { geocodeQuerySchema, NominatimClient, parseNominatimResponse } from "@/lib/osm/nominatim";

describe("geocodeQuerySchema", () => {
  it("trims and accepts 2 to 100 characters", () => {
    expect(geocodeQuerySchema.parse("  Buenos Aires ")).toBe("Buenos Aires");
    expect(geocodeQuerySchema.safeParse("a").success).toBe(false);
    expect(geocodeQuerySchema.safeParse("   ").success).toBe(false);
    expect(geocodeQuerySchema.safeParse("x".repeat(101)).success).toBe(false);
  });
});

describe("parseNominatimResponse", () => {
  it("converts string coordinates and keeps at most 5 results", () => {
    const item = { display_name: "Buenos Aires, Argentine", lat: "-34.6", lon: "-58.38" };
    const places = parseNominatimResponse(Array.from({ length: 7 }, () => item));
    expect(places).toHaveLength(5);
    expect(places[0]).toEqual({ label: "Buenos Aires, Argentine", lat: -34.6, lon: -58.38 });
  });

  it("skips malformed results and rejects non-array payloads", () => {
    expect(parseNominatimResponse([{ display_name: "x", lat: "abc", lon: "1" }, {}])).toEqual([]);
    expect(() => parseNominatimResponse({ error: "x" })).toThrow();
  });
});

describe("NominatimClient", () => {
  it("sends the identifying User-Agent and the expected parameters", async () => {
    let captured: { url: string; headers: HeadersInit | undefined } | null = null;
    const client = new NominatimClient("RIP-Advisor/1.0 (test@example.com)", async (url, init) => {
      captured = { url, headers: init?.headers };
      return new Response("[]", { status: 200 });
    });
    await client.search("Paris");
    const { url, headers } = captured ?? { url: "", headers: undefined };
    const params = new URL(url).searchParams;
    expect(params.get("format")).toBe("jsonv2");
    expect(params.get("limit")).toBe("5");
    expect(params.get("q")).toBe("Paris");
    expect(new Headers(headers).get("User-Agent")).toBe("RIP-Advisor/1.0 (test@example.com)");
  });
});
