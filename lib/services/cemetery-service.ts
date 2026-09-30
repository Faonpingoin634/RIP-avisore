import type { Cell } from "@/lib/osm/cells";
import { OverpassUnavailableError, type OverpassClient } from "@/lib/osm/overpass";
import { CemeteryRepository, toMarker, type StoredCemetery } from "@/lib/repositories/cemetery-repository";
import type { CemeteriesResponse, CemeteryMarker, OsmType } from "@/lib/types";

/** Overpass responses are kept 7 days in the Next.js data cache. */
export const CELL_REVALIDATE_SECONDS = 604_800;
export const REVIEWED_LIMIT = 500;

export type CemeteryLookup =
  | { status: "found"; cemetery: StoredCemetery }
  | { status: "not-found" }
  | { status: "unavailable" };

function storedToMarker(stored: StoredCemetery): CemeteryMarker {
  const { osmType, osmId, name, lat, lon, tags, reviewCount, avgRating, avgHumidity } = stored;
  return { osmType, osmId, name, lat, lon, tags, reviewCount, avgRating, avgHumidity };
}

/**
 * Facade over Overpass + database. OpenStreetMap is the source of truth; the
 * database only stores cemeteries that were opened, to attach reviews to them.
 */
export class CemeteryService {
  /**
   * @param reader repository bound to a non-privileged client (reads).
   * @param writer repository bound to the admin client, only needed by `findOrCreate`.
   */
  constructor(
    private readonly overpass: OverpassClient,
    private readonly reader: CemeteryRepository,
    private readonly writer: CemeteryRepository | null = null,
  ) {}

  async cemeteriesInCell(cell: Cell): Promise<CemeteriesResponse> {
    try {
      const fromOsm = await this.overpass.cemeteriesIn(cell.bbox, { revalidate: CELL_REVALIDATE_SECONDS });
      const stored = fromOsm.length > 0 ? await this.reader.findManyByOsm(fromOsm) : new Map();
      return {
        cemeteries: fromOsm.map((c) => toMarker(c, stored.get(`${c.osmType}/${c.osmId}`))),
        degraded: false,
      };
    } catch (error) {
      if (!(error instanceof OverpassUnavailableError)) throw error;
      console.warn(`[overpass] cellule ${cell.id} en mode dégradé — ${error.message}`);
      const stored = await this.reader.findInBbox(cell.bbox);
      return { cemeteries: stored.map(storedToMarker), degraded: true };
    }
  }

  async reviewedCemeteries(): Promise<CemeteryMarker[]> {
    const stored = await this.reader.findReviewed(REVIEWED_LIMIT);
    return stored.map(storedToMarker);
  }

  /**
   * The cemetery from the database, or — on first visit — fetched from
   * Overpass, checked to really be a cemetery, then stored with the admin client.
   */
  async findOrCreate(osmType: OsmType, osmId: number): Promise<CemeteryLookup> {
    const existing = await this.reader.findByOsm(osmType, osmId);
    if (existing) return { status: "found", cemetery: existing };

    let fromOsm;
    try {
      fromOsm = await this.overpass.cemetery(osmType, osmId, { revalidate: CELL_REVALIDATE_SECONDS });
    } catch (error) {
      if (error instanceof OverpassUnavailableError) {
        console.warn(`[overpass] fiche ${osmType}/${osmId} indisponible — ${error.message}`);
        return { status: "unavailable" };
      }
      throw error;
    }
    if (!fromOsm) return { status: "not-found" };

    if (!this.writer) throw new Error("CemeteryService.findOrCreate requiert un repository d'écriture");
    await this.writer.insertVerified(fromOsm);

    const created = await this.reader.findByOsm(osmType, osmId);
    return created ? { status: "found", cemetery: created } : { status: "unavailable" };
  }
}
