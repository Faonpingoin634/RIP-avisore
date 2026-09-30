"use client";

import { useEffect, useRef } from "react";
import { useMap, useMapEvents } from "react-leaflet";

import { cellsInBounds } from "@/lib/osm/cells";
import type { CemeteryStore } from "@/lib/map/cemetery-store";
import { MIN_CELL_ZOOM } from "@/lib/map/view";

const DEBOUNCE_MS = 400;

export type ViewportMode = "cells" | "zoomed-out";

type Props = {
  store: CemeteryStore;
  onModeChange: (mode: ViewportMode) => void;
};

/**
 * Translates map movements (debounced) into store requests: visible cells at
 * zoom ≥ 12 (and at most 16 cells), otherwise only reviewed cemeteries.
 */
export default function ViewportWatcher({ store, onModeChange }: Props) {
  const map = useMap();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = () => {
    const bounds = map.getBounds();
    const cells =
      map.getZoom() >= MIN_CELL_ZOOM
        ? cellsInBounds({
            south: bounds.getSouth(),
            west: bounds.getWest(),
            north: bounds.getNorth(),
            east: bounds.getEast(),
          })
        : null;

    if (cells === null) {
      store.hideCells();
      void store.loadReviewed();
      onModeChange("zoomed-out");
    } else {
      store.showCells(cells.map((cell) => cell.id));
      onModeChange("cells");
    }
  };

  const schedule = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(refresh, DEBOUNCE_MS);
  };

  useMapEvents({ moveend: schedule });

  useEffect(() => {
    refresh();
    void store.loadReviewed();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // Runs once on mount; later updates come from `moveend`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
