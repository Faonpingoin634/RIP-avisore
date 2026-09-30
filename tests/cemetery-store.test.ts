import { describe, expect, it } from "vitest";

import { CemeteryStore } from "@/lib/map/cemetery-store";
import type { CemeteryMarker } from "@/lib/types";

function marker(osmId: number, overrides: Partial<CemeteryMarker> = {}): CemeteryMarker {
  return {
    osmType: "way",
    osmId,
    name: `Cimetière ${osmId}`,
    lat: 48.85,
    lon: 2.35,
    tags: {},
    reviewCount: 0,
    avgRating: null,
    avgHumidity: null,
    ...overrides,
  };
}

type Deferred = { url: string; resolve: (body: unknown, status?: number) => void };

/** Fetcher whose responses are released manually, to observe concurrency. */
function controllableFetcher() {
  const pending: Deferred[] = [];
  const calls: string[] = [];
  const fetcher = (url: string) =>
    new Promise<Response>((resolve) => {
      calls.push(url);
      pending.push({
        url,
        resolve: (body, status = 200) => resolve(new Response(JSON.stringify(body), { status })),
      });
    });
  return { fetcher, pending, calls };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("CemeteryStore", () => {
  it("never runs more than 2 cell requests at once", async () => {
    const { fetcher, pending, calls } = controllableFetcher();
    const store = new CemeteryStore(fetcher, 2);
    store.showCells(["1_1", "1_2", "1_3", "1_4"]);
    expect(calls).toHaveLength(2);
    expect(store.getSnapshot().loading).toBe(true);

    pending.shift()?.resolve({ cemeteries: [marker(1)], degraded: false });
    await flush();
    expect(calls).toHaveLength(3);

    while (pending.length > 0) {
      pending.shift()?.resolve({ cemeteries: [], degraded: false });
      await flush();
    }
    expect(calls).toHaveLength(4);
    expect(store.getSnapshot().loading).toBe(false);
  });

  it("deduplicates cemeteries spanning several cells and keeps the latest data", async () => {
    const { fetcher, pending } = controllableFetcher();
    const store = new CemeteryStore(fetcher, 2);
    store.showCells(["1_1", "1_2"]);
    pending.shift()?.resolve({ cemeteries: [marker(1), marker(2)], degraded: false });
    pending.shift()?.resolve({ cemeteries: [marker(1, { reviewCount: 3, avgRating: 4.5 })], degraded: false });
    await flush();
    const markers = store.getSnapshot().markers;
    expect(markers).toHaveLength(2);
    expect(markers.find((m) => m.osmId === 1)?.reviewCount).toBe(3);
  });

  it("does not reload a cell already loaded", async () => {
    const { fetcher, pending, calls } = controllableFetcher();
    const store = new CemeteryStore(fetcher, 2);
    store.showCells(["1_1"]);
    pending.shift()?.resolve({ cemeteries: [], degraded: false });
    await flush();
    store.showCells(["1_1", "1_2"]);
    expect(calls).toEqual(["/api/cemeteries?cell=1_1", "/api/cemeteries?cell=1_2"]);
  });

  it("flags degraded cells and retries them later", async () => {
    const { fetcher, pending, calls } = controllableFetcher();
    const store = new CemeteryStore(fetcher, 2);
    store.showCells(["1_1"]);
    pending.shift()?.resolve({ cemeteries: [], degraded: true });
    await flush();
    expect(store.getSnapshot().degraded).toBe(true);

    store.showCells(["1_1"]);
    expect(calls).toHaveLength(2);
    pending.shift()?.resolve({ cemeteries: [], degraded: false });
    await flush();
    expect(store.getSnapshot().degraded).toBe(false);
  });

  it("flags failures without throwing", async () => {
    const { fetcher, pending } = controllableFetcher();
    const store = new CemeteryStore(fetcher, 2);
    store.showCells(["1_1"]);
    pending.shift()?.resolve({ error: "Erreur serveur" }, 500);
    await flush();
    expect(store.getSnapshot().failed).toBe(true);
  });

  it("notifies subscribers and loads reviewed cemeteries once", async () => {
    const { fetcher, pending, calls } = controllableFetcher();
    const store = new CemeteryStore(fetcher, 2);
    let notifications = 0;
    const unsubscribe = store.subscribe(() => notifications++);
    void store.loadReviewed();
    void store.loadReviewed();
    expect(calls).toEqual(["/api/cemeteries/reviewed"]);
    pending.shift()?.resolve({ cemeteries: [marker(9, { reviewCount: 1, avgRating: 5 })], degraded: false });
    await flush();
    expect(store.getSnapshot().markers.map((m) => m.osmId)).toEqual([9]);
    expect(notifications).toBeGreaterThan(0);
    unsubscribe();
  });
});
