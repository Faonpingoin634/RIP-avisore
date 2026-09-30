import { describe, expect, it } from "vitest";

import { Cell, cellsInBounds, MAX_VISIBLE_CELLS } from "@/lib/osm/cells";

describe("Cell.containing", () => {
  it("computes the Paris cell", () => {
    expect(Cell.containing(48.8566, 2.3522).id).toBe("488_23");
  });

  it("floors negative coordinates (Buenos Aires)", () => {
    expect(Cell.containing(-34.6037, -58.3816).id).toBe("-347_-584");
  });

  it("is not fooled by floating-point error on cell edges", () => {
    expect(Cell.containing(0.3, 0.7).id).toBe("3_7");
    expect(Cell.containing(48.8, 2.3).id).toBe("488_23");
  });

  it("clamps coordinates at the poles and the antimeridian", () => {
    expect(Cell.containing(90, 180).id).toBe("899_1799");
    expect(Cell.containing(-95, -200).id).toBe("-900_-1800");
  });
});

describe("Cell.fromId", () => {
  it.each(["488_23", "-347_-584", "0_0", "899_1799", "-900_-1800"])("accepts %s", (id) => {
    expect(Cell.fromId(id)?.id).toBe(id);
  });

  it.each(["", "488", "488_", "_23", "488-23", "900_0", "0_1800", "-901_0", "0_-1801", "-0_5", "007_5", "1.5_2", "488_23;drop", "12345_1"])(
    "rejects %s",
    (id) => {
      expect(Cell.fromId(id)).toBeNull();
    },
  );

  it("exposes the bounding box", () => {
    const bbox = Cell.fromId("488_23")?.bbox;
    expect(bbox?.south).toBeCloseTo(48.8);
    expect(bbox?.west).toBeCloseTo(2.3);
    expect(bbox?.north).toBeCloseTo(48.9);
    expect(bbox?.east).toBeCloseTo(2.4);
  });

  it("contains points of its own area only", () => {
    const cell = Cell.fromId("488_23");
    expect(cell?.contains(48.85, 2.35)).toBe(true);
    expect(cell?.contains(48.95, 2.35)).toBe(false);
  });
});

describe("cellsInBounds", () => {
  it("returns every cell covering the viewport", () => {
    const cells = cellsInBounds({ south: 48.81, west: 2.25, north: 48.91, east: 2.42 });
    expect(cells?.map((c) => c.id)).toEqual(["488_22", "488_23", "488_24", "489_22", "489_23", "489_24"]);
  });

  it("returns a single cell for a small viewport", () => {
    expect(cellsInBounds({ south: 48.85, west: 2.33, north: 48.86, east: 2.35 })?.map((c) => c.id)).toEqual(["488_23"]);
  });

  it("returns null when more than the maximum is needed", () => {
    expect(cellsInBounds({ south: 48, west: 2, north: 49, east: 3 })).toBeNull();
  });

  it("accepts exactly the maximum", () => {
    // 4 × 4 = 16 cells
    expect(cellsInBounds({ south: 0.05, west: 0.05, north: 0.35, east: 0.35 })).toHaveLength(MAX_VISIBLE_CELLS);
  });

  it("returns an empty list for inverted bounds", () => {
    expect(cellsInBounds({ south: 10, west: 10, north: 9, east: 9 })).toEqual([]);
  });
});
