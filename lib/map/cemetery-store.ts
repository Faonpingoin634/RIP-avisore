import { z } from "zod";

import { cemeteryKey, OSM_TYPES, type CemeteryMarker, type CemeteryTags } from "@/lib/types";

const markerSchema = z.object({
  osmType: z.enum(OSM_TYPES),
  osmId: z.number().int().positive(),
  name: z.string().nullable(),
  lat: z.number(),
  lon: z.number(),
  tags: z.object({
    religion: z.string().optional(),
    operator: z.string().optional(),
    wikipedia: z.string().optional(),
    website: z.string().optional(),
  }) satisfies z.ZodType<CemeteryTags>,
  reviewCount: z.number().int().nonnegative(),
  avgRating: z.number().nullable(),
  avgHumidity: z.number().nullable(),
});

const responseSchema = z.object({ cemeteries: z.array(markerSchema), degraded: z.boolean() });

export type StoreSnapshot = {
  /** Every known cemetery (deduplicated by osmType/osmId). */
  markers: readonly CemeteryMarker[];
  loading: boolean;
  /** At least one visible cell was served from the database only. */
  degraded: boolean;
  /** A request failed completely (network or server error). */
  failed: boolean;
};

type Listener = () => void;
type Fetcher = (input: string) => Promise<Response>;

/**
 * Client-side cache of map cemeteries (Observer pattern, consumed with
 * `useSyncExternalStore`). Cells are loaded at most once per map session,
 * with limited concurrency: public Overpass servers only accept a couple of
 * simultaneous queries per IP.
 *
 * Each cell is first read from the database, which answers at once, so known
 * cemeteries never wait for Overpass. When Overpass is down a cell takes about
 * 45 s to come back degraded: new Overpass requests are then paused for a while
 * instead of making every remaining cell wait as long.
 */
export class CemeteryStore {
  private readonly markers = new Map<string, CemeteryMarker>();
  private readonly loadedCells = new Set<string>();
  private readonly inFlight = new Set<string>();
  private readonly degradedCells = new Set<string>();
  private readonly failedCells = new Set<string>();
  private readonly storedCells = new Set<string>();
  private overpassPausedUntil = 0;
  private readonly listeners = new Set<Listener>();
  private queue: string[] = [];
  private visibleCells = new Set<string>();
  private reviewedRequest: Promise<void> | null = null;
  private reviewedLoading = false;
  private reviewedFailed = false;
  /** Set when `markers` changed since the last snapshot, so the array is only rebuilt when needed. */
  private markersDirty = false;
  private snapshot: StoreSnapshot = { markers: [], loading: false, degraded: false, failed: false };

  constructor(
    // `no-cache`: the responses carry live ratings. Without it, the browser applies
    // `stale-while-revalidate` (meant for the CDN) and shows a just-posted review late.
    private readonly fetcher: Fetcher = (input) => fetch(input, { cache: "no-cache" }),
    private readonly concurrency = 2,
    private readonly overpassPauseMs = 60_000,
  ) {}

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): StoreSnapshot => this.snapshot;

  /**
   * Declares the cells currently on screen. Missing ones are queued; queued
   * cells that scrolled out of view are dropped.
   */
  showCells(cellIds: readonly string[]): void {
    this.visibleCells = new Set(cellIds);
    const missing = cellIds.filter((id) => !this.loadedCells.has(id));
    for (const id of missing) void this.loadStoredCell(id);
    this.queue = missing.filter((id) => !this.inFlight.has(id));
    if (Date.now() < this.overpassPausedUntil) this.skipQueuedCells();
    this.emit();
    this.pump();
  }

  /** Leaves cell mode (zoomed out): nothing is queued any more. */
  hideCells(): void {
    this.visibleCells = new Set();
    this.queue = [];
    this.emit();
  }

  /** Loads the cemeteries that have reviews (once per session). */
  loadReviewed(): Promise<void> {
    this.reviewedRequest ??= this.fetchReviewed();
    return this.reviewedRequest;
  }

  private async fetchReviewed(): Promise<void> {
    this.reviewedLoading = true;
    this.emit();
    try {
      const body = await this.request("/api/cemeteries/reviewed");
      this.merge(body.cemeteries);
      this.reviewedFailed = false;
    } catch {
      this.reviewedFailed = true;
      this.reviewedRequest = null; // allow a retry on the next zoom-out
    }
    this.reviewedLoading = false;
    this.emit();
  }

  /** Queued cells stay unloaded: they are retried the next time they become visible. */
  private skipQueuedCells(): void {
    this.queue.forEach((id) => this.degradedCells.add(id));
    this.queue = [];
  }

  private async loadStoredCell(cellId: string): Promise<void> {
    if (this.storedCells.has(cellId)) return;
    this.storedCells.add(cellId);
    try {
      const body = await this.request(`/api/cemeteries?cell=${encodeURIComponent(cellId)}&source=stored`);
      this.merge(body.cemeteries);
      this.emit();
    } catch {
      // No banner: the full request for this cell reports its own failure.
      this.storedCells.delete(cellId);
    }
  }

  private pump(): void {
    while (this.inFlight.size < this.concurrency && this.queue.length > 0) {
      const cellId = this.queue.shift();
      if (cellId) void this.loadCell(cellId);
    }
  }

  private async loadCell(cellId: string): Promise<void> {
    this.inFlight.add(cellId);
    this.emit();
    try {
      const body = await this.request(`/api/cemeteries?cell=${encodeURIComponent(cellId)}`);
      this.merge(body.cemeteries);
      this.failedCells.delete(cellId);
      if (body.degraded) {
        // Not marked as loaded: it will be retried the next time it becomes visible.
        this.degradedCells.add(cellId);
        this.overpassPausedUntil = Date.now() + this.overpassPauseMs;
        this.skipQueuedCells();
      } else {
        this.degradedCells.delete(cellId);
        this.loadedCells.add(cellId);
      }
    } catch {
      this.failedCells.add(cellId);
    } finally {
      this.inFlight.delete(cellId);
      this.emit();
      this.pump();
    }
  }

  private async request(url: string): Promise<z.infer<typeof responseSchema>> {
    const response = await this.fetcher(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return responseSchema.parse(await response.json());
  }

  private merge(cemeteries: readonly CemeteryMarker[]): void {
    for (const cemetery of cemeteries) {
      const key = cemeteryKey(cemetery);
      if (!sameMarker(this.markers.get(key), cemetery)) {
        this.markers.set(key, cemetery);
        this.markersDirty = true;
      }
    }
  }

  /**
   * Publishes a new snapshot only when something visible changed. The markers
   * array keeps its identity while no marker changed, so the (memoised) marker
   * layer is not re-rendered on every loading toggle.
   */
  private emit(): void {
    const previous = this.snapshot;
    const visible = [...this.visibleCells];
    const next: StoreSnapshot = {
      markers: this.markersDirty ? [...this.markers.values()] : previous.markers,
      loading: this.inFlight.size > 0 || this.queue.length > 0 || this.reviewedLoading,
      degraded: visible.some((id) => this.degradedCells.has(id)),
      failed: this.reviewedFailed || visible.some((id) => this.failedCells.has(id)),
    };
    this.markersDirty = false;
    if (
      next.markers === previous.markers &&
      next.loading === previous.loading &&
      next.degraded === previous.degraded &&
      next.failed === previous.failed
    ) {
      return;
    }
    this.snapshot = next;
    this.listeners.forEach((listener) => listener());
  }
}

/** Same position, name and ratings: re-rendering the marker would change nothing. */
function sameMarker(a: CemeteryMarker | undefined, b: CemeteryMarker): boolean {
  return (
    a !== undefined &&
    a.lat === b.lat &&
    a.lon === b.lon &&
    a.name === b.name &&
    a.reviewCount === b.reviewCount &&
    a.avgRating === b.avgRating &&
    a.avgHumidity === b.avgHumidity
  );
}
