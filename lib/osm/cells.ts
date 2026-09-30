/**
 * The world is split into 0.1° × 0.1° cells, identified by
 * "{floor(lat*10)}_{floor(lon*10)}" (e.g. "488_23" contains Paris).
 * Cells are the unit of loading and caching of map data.
 */

export const CELL_SIZE_DEG = 0.1;
export const MAX_VISIBLE_CELLS = 16;

const LAT_INDEX_MIN = -900;
const LAT_INDEX_MAX = 899;
const LON_INDEX_MIN = -1800;
const LON_INDEX_MAX = 1799;
const CELL_ID_PATTERN = /^(-?\d{1,4})_(-?\d{1,4})$/;

export type BoundingBox = { south: number; west: number; north: number; east: number };

/** floor(value * 10) without floating-point surprises such as 0.3 * 10 = 2.9999… */
function toIndex(value: number): number {
  return Math.floor(Math.round(value * 10 * 1e9) / 1e9);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Immutable value object for one grid cell. */
export class Cell {
  private constructor(
    readonly latIndex: number,
    readonly lonIndex: number,
  ) {}

  /** Parses and validates an id coming from the outside world. Returns null when invalid. */
  static fromId(id: string): Cell | null {
    const match = CELL_ID_PATTERN.exec(id);
    if (!match) return null;
    const latIndex = Number(match[1]);
    const lonIndex = Number(match[2]);
    if (latIndex < LAT_INDEX_MIN || latIndex > LAT_INDEX_MAX) return null;
    if (lonIndex < LON_INDEX_MIN || lonIndex > LON_INDEX_MAX) return null;
    // Reject non-canonical forms such as "-0_5" or "007_5".
    const cell = new Cell(latIndex, lonIndex);
    return cell.id === id ? cell : null;
  }

  /** Cell containing a coordinate (coordinates are clamped to the valid range). */
  static containing(lat: number, lon: number): Cell {
    return new Cell(
      clamp(toIndex(lat), LAT_INDEX_MIN, LAT_INDEX_MAX),
      clamp(toIndex(lon), LON_INDEX_MIN, LON_INDEX_MAX),
    );
  }

  get id(): string {
    return `${this.latIndex}_${this.lonIndex}`;
  }

  get bbox(): BoundingBox {
    return {
      south: this.latIndex / 10,
      west: this.lonIndex / 10,
      north: (this.latIndex + 1) / 10,
      east: (this.lonIndex + 1) / 10,
    };
  }

  contains(lat: number, lon: number): boolean {
    const { south, west, north, east } = this.bbox;
    return lat >= south && lat < north && lon >= west && lon < east;
  }
}

/**
 * Cells covering a viewport, or `null` when more than `max` cells would be
 * needed (the user is too zoomed out to load everything).
 * Longitudes outside [-180, 180) (Leaflet world copies) are clamped.
 */
export function cellsInBounds(bounds: BoundingBox, max: number = MAX_VISIBLE_CELLS): Cell[] | null {
  const southWest = Cell.containing(bounds.south, bounds.west);
  const northEast = Cell.containing(bounds.north, bounds.east);

  const rows = northEast.latIndex - southWest.latIndex + 1;
  const cols = northEast.lonIndex - southWest.lonIndex + 1;
  if (rows <= 0 || cols <= 0) return [];
  if (rows * cols > max) return null;

  const cells: Cell[] = [];
  for (let lat = southWest.latIndex; lat <= northEast.latIndex; lat++) {
    for (let lon = southWest.lonIndex; lon <= northEast.lonIndex; lon++) {
      const cell = Cell.fromId(`${lat}_${lon}`);
      if (cell) cells.push(cell);
    }
  }
  return cells;
}
