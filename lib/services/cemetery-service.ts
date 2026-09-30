import type { Cell } from "@/lib/osm/cells";
import { OverpassUnavailableError, type OverpassClient } from "@/lib/osm/overpass";
import { CemeteryRepository, toMarker, type StoredCemetery } from "@/lib/repositories/cemetery-repository";
import type { CemeteriesResponse, CemeteryMarker } from "@/lib/types";

/** Overpass responses for a cell are kept 7 days in the Next.js data cache. */
export const CELL_REVALIDATE_SECONDS = 604_800;
export const REVIEWED_LIMIT = 500;

function storedToMarker(stored: StoredCemetery): CemeteryMarker {
  const { osmType, osmId, name, lat, lon, tags, reviewCount, avgRating, avgHumidity } = stored;
  return { osmType, osmId, name, lat, lon, tags, reviewCount, avgRating, avgHumidity };
}

/**
 * Facade over Overpass + database for the map. OpenStreetMap is the source of
 * truth; the database only adds ratings and serves as a fallback.
 */
export class CemeteryService {
  constructor(
    private readonly overpass: OverpassClient,
    private readonly repository: CemeteryRepository,
  ) {}

  async cemeteriesInCell(cell: Cell): Promise<CemeteriesResponse> {
    try {
      const fromOsm = await this.overpass.cemeteriesIn(cell.bbox, { revalidate: CELL_REVALIDATE_SECONDS });
      const stored = fromOsm.length > 0 ? await this.repository.findManyByOsm(fromOsm) : new Map();
      return {
        cemeteries: fromOsm.map((c) => toMarker(c, stored.get(`${c.osmType}/${c.osmId}`))),
        degraded: false,
      };
    } catch (error) {
      if (!(error instanceof OverpassUnavailableError)) throw error;
      console.warn(`[overpass] cellule ${cell.id} en mode dégradé — ${error.message}`);
      const stored = await this.repository.findInBbox(cell.bbox);
      return { cemeteries: stored.map(storedToMarker), degraded: true };
    }
  }

  async reviewedCemeteries(): Promise<CemeteryMarker[]> {
    const stored = await this.repository.findReviewed(REVIEWED_LIMIT);
    return stored.map(storedToMarker);
  }
}
