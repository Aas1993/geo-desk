"use client";
import { useEffect, useState } from "react";
import type { Map as MLMap, RasterTileSource } from "maplibre-gl";
import { useStore } from "@/lib/store";

const GIBS = (d: string) => `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${d}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;
/** Latest available VIIRS day (published the following day). Computed after mount: Next forbids reading the clock while prerendering. */
export const yesterdayNow = () => new Date(Date.now() - 86400e3).toISOString().slice(0, 10);
export function useYesterday() { const [d, setD] = useState<string | null>(null); useEffect(() => { const t = setTimeout(() => setD(yesterdayNow()), 0); return () => clearTimeout(t); }, []); return d; }

function useRaster(map: MLMap, id: string, on: boolean, tiles: string | null, opts: { opacity: number; maxzoom: number; before?: string; attribution: string }) {
  useEffect(() => {
    if (!on || !tiles) { try { if (map.getLayer(id)) map.removeLayer(id); if (map.getSource(id)) map.removeSource(id); } catch { /* style not ready */ } return; } // switched off: take the overlay off the map
    const add = () => {
      const src = map.getSource(id) as RasterTileSource | undefined;
      if (src) { src.setTiles([tiles]); return; }
      map.addSource(id, { type: "raster", tiles: [tiles], tileSize: 256, maxzoom: opts.maxzoom, attribution: opts.attribution });
      map.addLayer({ id, type: "raster", source: id, paint: { "raster-opacity": opts.opacity, "raster-fade-duration": 300 } }, map.getLayer(opts.before ?? "") ? opts.before : undefined);
    };
    if (map.isStyleLoaded()) add(); else map.once("idle", add);
  }, [map, id, on, tiles, opts.opacity, opts.maxzoom, opts.before, opts.attribution]);
  useEffect(() => () => { try { if (map.getLayer(id)) map.removeLayer(id); if (map.getSource(id)) map.removeSource(id); } catch {} }, [map, id]);
}

/** Raster overlays: NASA GIBS daily imagery and RainViewer precipitation radar. Both sit under country borders. */
export function RasterLayers({ map }: { map: MLMap }) {
  const layers = useStore((s) => s.layers); const filters = useStore((s) => s.filters.weather); const date = useStore((s) => s.imageryDate);
  const imagery = !!layers.imagery; const radarOn = !!layers.weather && filters?.radar !== false;
  const latest = useYesterday(); const day = date ?? latest;
  useRaster(map, "ras-imagery", imagery && !!day, day ? GIBS(day) : null, { opacity: 0.9, maxzoom: 9, before: "night-fill", attribution: "NASA GIBS · VIIRS SNPP" });
  const radarUrl = useRadar(radarOn);
  useRaster(map, "ras-radar", radarOn, radarUrl, { opacity: 0.75, maxzoom: 7, before: "border", attribution: "RainViewer" });
  return null;
}
function useRadar(on: boolean) {
  const [u, setU] = useState<string | null>(null);
  useEffect(() => {
    if (!on) return; let dead = false;
    const load = () => fetch("/api/layers/radar").then((r) => r.json()).then((j) => { if (!dead && j.host) setU(`${j.host}${j.path}/256/{z}/{x}/{y}/2/1_1.png`); }).catch(() => {});
    load(); const i = setInterval(load, 300_000); return () => { dead = true; clearInterval(i); };
  }, [on]);
  return on ? u : null;
}
