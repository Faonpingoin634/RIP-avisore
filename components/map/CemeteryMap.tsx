"use client";

import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";

import type { Map as LeafletMap } from "leaflet";
import { useMemo, useState, useSyncExternalStore } from "react";
import { MapContainer, TileLayer, ZoomControl } from "react-leaflet";

import { CemeteryStore } from "@/lib/map/cemetery-store";
import type { MapView } from "@/lib/map/view";
import CemeteryMarkers from "./CemeteryMarkers";
import LocateButton from "./LocateButton";
import PlaceSearch from "./PlaceSearch";
import ViewportWatcher, { type ViewportMode } from "./ViewportWatcher";

const ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">contributeurs OpenStreetMap</a>';

function Banner({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "warning" }) {
  const color = tone === "warning" ? "border-blood/60 text-blood" : "border-mist text-bone";
  return (
    <p role="status" className={`pointer-events-auto rounded-md border bg-tomb/95 px-3 py-2 shadow-xl ${color}`}>
      {children}
    </p>
  );
}

export default function CemeteryMap({ initialView }: { initialView: MapView }) {
  const [store] = useState(() => new CemeteryStore());
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [map, setMap] = useState<LeafletMap | null>(null);
  const [mode, setMode] = useState<ViewportMode>("cells");

  const visible = useMemo(
    () => (mode === "cells" ? snapshot.markers : snapshot.markers.filter((m) => m.reviewCount > 0)),
    [mode, snapshot.markers],
  );

  return (
    <div className="absolute inset-0">
      <MapContainer
        ref={setMap}
        center={[initialView.lat, initialView.lon]}
        zoom={initialView.zoom}
        minZoom={2}
        worldCopyJump
        zoomControl={false}
        className="h-full w-full"
      >
        <TileLayer attribution={ATTRIBUTION} url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
        <ZoomControl position="bottomright" zoomInTitle="Zoomer" zoomOutTitle="Dézoomer" />
        <ViewportWatcher store={store} onModeChange={setMode} />
        <CemeteryMarkers cemeteries={visible} />
      </MapContainer>

      {/* Overlays: outside Leaflet's DOM so they do not capture map gestures. */}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-[1000] mx-auto flex max-w-xl flex-col gap-2">
        <PlaceSearch map={map} />
        {mode === "zoomed-out" && <Banner>🔍 Zoomez pour voir tous les cimetières.</Banner>}
        {snapshot.degraded && (
          <Banner tone="warning">Les données OpenStreetMap sont momentanément indisponibles.</Banner>
        )}
        {snapshot.failed && (
          <Banner tone="warning">Impossible de charger certains cimetières. Vérifiez votre connexion.</Banner>
        )}
      </div>

      <div className="pointer-events-none absolute bottom-8 left-3 z-[1000]">
        <LocateButton map={map} />
      </div>

      {snapshot.loading && (
        <div className="pointer-events-none absolute bottom-8 left-1/2 z-[1000] -translate-x-1/2">
          <p role="status" className="rounded-full border border-mist bg-tomb/95 px-3 py-1 text-ash shadow-xl">
            <span aria-hidden="true" className="mr-1 inline-block animate-spin">⏳</span>
            Chargement des cimetières…
          </p>
        </div>
      )}
    </div>
  );
}
