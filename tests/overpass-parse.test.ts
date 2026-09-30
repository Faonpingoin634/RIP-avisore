import { describe, expect, it } from "vitest";

import {
  OverpassClient,
  OverpassQuery,
  OverpassResponseError,
  OverpassUnavailableError,
  parseOverpassResponse,
  type FetchLike,
} from "@/lib/osm/overpass";

const pereLachaise = {
  type: "way",
  id: 23370720,
  center: { lat: 48.8614, lon: 2.3933 },
  tags: {
    landuse: "cemetery",
    name: "Cimetière du Père-Lachaise",
    religion: "multifaith",
    operator: "Ville de Paris",
    wikipedia: "fr:Cimetière du Père-Lachaise",
    website: "https://www.paris.fr",
    opening_hours: "Mo-Su 08:00-18:00",
  },
};

describe("parseOverpassResponse", () => {
  it("parses ways/relations via their center and keeps only useful tags", () => {
    expect(parseOverpassResponse({ elements: [pereLachaise] })).toEqual([
      {
        osmType: "way",
        osmId: 23370720,
        name: "Cimetière du Père-Lachaise",
        lat: 48.8614,
        lon: 2.3933,
        tags: {
          religion: "multifaith",
          operator: "Ville de Paris",
          wikipedia: "fr:Cimetière du Père-Lachaise",
          website: "https://www.paris.fr",
        },
      },
    ]);
  });

  it("parses nodes via their own coordinates and gives null to unnamed cemeteries", () => {
    const [node] = parseOverpassResponse({
      elements: [{ type: "node", id: 42, lat: -34.58, lon: -58.39, tags: { amenity: "grave_yard", name: "  " } }],
    });
    expect(node).toEqual({ osmType: "node", osmId: 42, name: null, lat: -34.58, lon: -58.39, tags: {} });
  });

  it("skips malformed, coordinate-less and non-cemetery elements", () => {
    const result = parseOverpassResponse({
      elements: [
        { type: "way", id: 1, tags: { landuse: "cemetery" } }, // no center
        { type: "node", id: 2, lat: 1, lon: 1, tags: { amenity: "cafe" } }, // not a cemetery
        { type: "area", id: 3, lat: 1, lon: 1, tags: { landuse: "cemetery" } }, // unknown type
        { type: "node", id: -4, lat: 1, lon: 1, tags: { landuse: "cemetery" } }, // bad id
        { type: "node", id: 5, lat: 120, lon: 1, tags: { landuse: "cemetery" } }, // bad latitude
        "garbage",
        pereLachaise,
      ],
    });
    expect(result.map((c) => c.osmId)).toEqual([23370720]);
  });

  it("removes duplicates", () => {
    expect(parseOverpassResponse({ elements: [pereLachaise, pereLachaise] })).toHaveLength(1);
  });

  it("returns an empty list when there is nothing", () => {
    expect(parseOverpassResponse({ elements: [] })).toEqual([]);
  });

  it("throws on an unusable payload", () => {
    expect(() => parseOverpassResponse({ nope: true })).toThrow(OverpassResponseError);
    expect(() => parseOverpassResponse(null)).toThrow(OverpassResponseError);
  });

  it("throws on Overpass runtime errors reported as remarks", () => {
    expect(() =>
      parseOverpassResponse({ elements: [], remark: "runtime error: Query timed out in \"query\" at line 3" }),
    ).toThrow(OverpassResponseError);
  });
});

describe("OverpassQuery", () => {
  it("builds the bbox query in (south, west, north, east) order", () => {
    const query = OverpassQuery.cemeteriesIn({ south: 48.8, west: 2.3, north: 48.9, east: 2.4 });
    expect(query).toContain('nwr["landuse"="cemetery"](48.8,2.3,48.9,2.4);');
    expect(query).toContain('nwr["amenity"="grave_yard"](48.8,2.3,48.9,2.4);');
    expect(query).toContain("out center tags;");
  });

  it("builds a single-element query and refuses invalid ids", () => {
    expect(OverpassQuery.element("way", 123)).toContain("way(123);");
    expect(() => OverpassQuery.element("way", 0)).toThrow(RangeError);
  });
});

describe("OverpassClient", () => {
  const bbox = { south: 48.8, west: 2.3, north: 48.9, east: 2.4 };
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  function fakeFetch(responses: Array<Response | Error>): { fetchImpl: FetchLike; calls: string[] } {
    const calls: string[] = [];
    const fetchImpl: FetchLike = async (url) => {
      calls.push(url);
      const next = responses.shift();
      if (!next || next instanceof Error) throw next ?? new Error("no response");
      return next;
    };
    return { fetchImpl, calls };
  }

  const endpoints = ["https://a.example/api", "https://b.example/api", "https://c.example/api"];

  it("uses GET with the encoded query on the first endpoint", async () => {
    const { fetchImpl, calls } = fakeFetch([json({ elements: [pereLachaise] })]);
    const client = new OverpassClient({ endpoints, fetchImpl });
    await expect(client.cemeteriesIn(bbox)).resolves.toHaveLength(1);
    expect(calls).toHaveLength(1);
    expect(calls[0].startsWith("https://a.example/api?data=")).toBe(true);
    expect(decodeURIComponent(calls[0].split("?data=")[1])).toContain("[out:json]");
  });

  it("falls back to the next endpoint on 429, 5xx and timeouts", async () => {
    const timeout = new DOMException("timed out", "TimeoutError");
    const { fetchImpl, calls } = fakeFetch([json({}, 429), timeout, json({ elements: [pereLachaise] })]);
    const client = new OverpassClient({ endpoints, fetchImpl });
    await expect(client.cemeteriesIn(bbox)).resolves.toHaveLength(1);
    expect(calls.map((u) => new URL(u).host)).toEqual(["a.example", "b.example", "c.example"]);
  });

  it("throws OverpassUnavailableError when every endpoint fails", async () => {
    const { fetchImpl } = fakeFetch([json({}, 504), json({}, 502), new TypeError("fetch failed")]);
    const client = new OverpassClient({ endpoints, fetchImpl });
    await expect(client.cemeteriesIn(bbox)).rejects.toBeInstanceOf(OverpassUnavailableError);
  });

  it("returns null when the requested element is not a cemetery", async () => {
    const { fetchImpl } = fakeFetch([
      json({ elements: [{ type: "way", id: 7, center: { lat: 1, lon: 1 }, tags: { building: "yes" } }] }),
    ]);
    const client = new OverpassClient({ endpoints, fetchImpl });
    await expect(client.cemetery("way", 7)).resolves.toBeNull();
  });
});
