"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Popup, type GeoJSONSource, type Map as MLMap } from "maplibre-gl";
import { onMap, dataLayerIds } from "@/lib/map-bus";
import { LAYERS, isData, type Feat, type LayerDef } from "@/lib/layers/registry";
import { useStore, WINDOW_MS } from "@/lib/store";
import { useLayerStats } from "@/lib/layers/stats";
import { positions, prepare, type SatPayload } from "@/lib/layers/satellite-client";
import { RasterLayers } from "./RasterLayers";
import { ChoroplethLayer, MembershipLayer } from "./ChoroplethLayers";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const ago = (t?: number) => { if (!t) return ""; const m = Math.max(0, Math.round((Date.now() - t) / 60000)); return m < 60 ? `${m} min ago` : m < 2880 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };
/** Keys that count as "on" for a layer: a sub-type (or sub-sub-type, as "type:sub") is on unless explicitly switched off. */
export function allowedKeys(def: LayerDef, f: Record<string, boolean> | undefined) {
  const keys: string[] = []; const off = (k: string) => f?.[k] === false;
  for (const s of def.sub ?? []) { if (off(s.key)) continue; if (s.children?.length) { for (const c of s.children) if (!off(`${s.key}:${c.key}`)) keys.push(`${s.key}:${c.key}`); keys.push(s.key); } else keys.push(s.key); }
  return keys;
}

function DataLayer({ def, map }: { def: LayerDef; map: MLMap }) {
  const filters = useStore((s) => s.filters[def.id]); const win = useStore((s) => s.timeWindow);
  const [data, setData] = useState<GeoJSON.FeatureCollection | null>(null); const setStat = useLayerStats((s) => s.set);
  const src = `dl-${def.id}`; const halo = `${src}-halo`; const dot = `${src}-dot`;

  // fetch + poll (viewport layers refetch when the map stops moving)
  useEffect(() => {
    let dead = false; let timer: ReturnType<typeof setTimeout> | undefined; let ctl: AbortController | null = null;
    const url = () => {
      if (def.kind !== "viewport") return `/api/layers/${def.api}`;
      const c = map.getCenter(); const z = map.getZoom(); const dist = Math.round(Math.min(250, Math.max(40, 6400 / Math.pow(2, z - 1)))); return `/api/layers/${def.api}?lat=${c.lat.toFixed(2)}&lon=${c.lng.toFixed(2)}&dist=${z >= 3.6 ? dist : 0}`;
    };
    let tick: ReturnType<typeof setInterval> | undefined;
    const load = async () => {
      ctl?.abort(); ctl = new AbortController(); setStat(def.id, { state: "loading" });
      try {
        const r = await fetch(url(), { signal: ctl.signal }); const j = await r.json();
        if (!r.ok) throw new Error(j.message ?? j.error ?? `HTTP ${r.status}`);
        if (dead) return;
        if (def.kind === "client") { // orbital elements → positions, recomputed every 3 s in the browser
          const n = await prepare(j as SatPayload); if (dead) return;
          const refresh = () => { const fc = positions(); setData(fc); setStat(def.id, { state: "ok", total: fc.features.length, updated: Date.now() }); };
          clearInterval(tick); refresh(); tick = setInterval(refresh, 3000); void n; return;
        }
        for (const f of j.features) { const p = f.properties as Feat & { k?: string }; p.k = p.sub ? `${p.type}:${p.sub}` : p.type; p.layer = def.id; }
        setData(j); setStat(def.id, { state: "ok", total: j.features.length, updated: Date.now(), error: undefined });
      } catch (e) { if (!dead && (e as Error).name !== "AbortError") setStat(def.id, { state: "error", error: (e as Error).message }); }
    };
    const loop = async () => { await load(); if (!dead && def.refreshSec) timer = setTimeout(loop, def.refreshSec * 1000); };
    loop();
    let mv: ReturnType<typeof setTimeout> | undefined; const onMove = () => { clearTimeout(mv); mv = setTimeout(load, 900); };
    if (def.kind === "viewport") map.on("moveend", onMove);
    return () => { dead = true; clearTimeout(timer); clearTimeout(mv); clearInterval(tick); ctl?.abort(); if (def.kind === "viewport") map.off("moveend", onMove); };
  }, [def, map, setStat]);

  // source + layers
  useEffect(() => {
    if (!data) return;
    const add = () => {
      const s = map.getSource(src) as GeoJSONSource | undefined;
      if (s) { s.setData(data); return; }
      map.addSource(src, { type: "geojson", data });
      const colors = (def.sub ?? []).flatMap((x) => [x.key, x.color]);
      const byType = colors.length ? ["match", ["get", "type"], ...colors, def.color] : def.color;
      const color = def.colorProp ? ["coalesce", ["get", def.colorProp], byType] : byType;
      const r = ["interpolate", ["linear"], ["coalesce", ["get", "sev"], 0], 0, 3.5, 1, 5.5, 2, 8, 3, 11];
      if (def.kind === "polygons") { // areas: translucent fill (halo id) + outline (dot id)
        map.addLayer({ id: halo, type: "fill", source: src, paint: { "fill-color": color as never, "fill-opacity": 0.32 } }, "border");
        map.addLayer({ id: dot, type: "line", source: src, paint: { "line-color": color as never, "line-width": 0.8, "line-opacity": 0.7 } }, "border");
        dataLayerIds.add(halo);
        map.on("click", halo, (e) => {
          const f = e.features?.[0]; if (!f) return; const p = f.properties as Feat & Record<string, unknown>; const sub = def.sub?.find((x) => x.key === p.type);
          new Popup({ closeButton: true, maxWidth: "320px", className: "gd-popup" }).setLngLat(e.lngLat)
            .setHTML(`<div class="gd-pop"><div class="gd-pop-k" style="color:${esc(sub?.color ?? def.color)}">${esc(sub?.en ?? def.en)}</div><div class="gd-pop-t">${esc(p.title)}</div>${p.desc ? `<div class="gd-pop-d">${esc(p.desc)}</div>` : ""}<div class="gd-pop-m">${p.src ? esc(p.src) : ""}</div></div>`).addTo(map);
        });
        return;
      }
      map.addLayer({ id: halo, type: "circle", source: src, paint: { "circle-radius": ["*", r, 2.4] as never, "circle-color": color as never, "circle-opacity": 0.16, "circle-blur": 0.6 } });
      map.addLayer({ id: dot, type: "circle", source: src, paint: { "circle-radius": r as never, "circle-color": color as never, "circle-opacity": 0.95, "circle-stroke-color": "#04070d", "circle-stroke-width": 1 } });
      if (def.label) map.addLayer({ id: `${src}-label`, type: "symbol", source: src, layout: { "text-field": ["get", def.label], "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"], "text-size": 11, "text-offset": [0, -1.1], "text-allow-overlap": false }, paint: { "text-color": color as never, "text-halo-color": "#04070d", "text-halo-width": 1.4 } });
      dataLayerIds.add(dot);
      map.on("click", dot, (e) => {
        const f = e.features?.[0]; if (!f) return; const p = f.properties as Feat & Record<string, unknown>;
        const sub = def.sub?.find((x) => x.key === p.type);
        new Popup({ closeButton: true, maxWidth: "320px", className: "gd-popup" }).setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number])
          .setHTML(`<div class="gd-pop"><div class="gd-pop-k" style="color:${esc(sub?.color ?? def.color)}">${esc(sub?.en ?? def.en)}</div><div class="gd-pop-t">${esc(p.title)}</div>${p.desc ? `<div class="gd-pop-d">${esc(p.desc)}</div>` : ""}<div class="gd-pop-m">${esc(ago(p.t as number))}${p.src ? ` · ${esc(p.src)}` : ""}</div>${typeof p.url === "string" && /^https?:/.test(p.url) ? `<a class="gd-pop-a" href="${esc(p.url)}" target="_blank" rel="noreferrer noopener">Open source ↗</a>` : ""}</div>`).addTo(map);
      });
      map.on("mouseenter", dot, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", dot, () => { map.getCanvas().style.cursor = ""; });
    };
    if (map.isStyleLoaded()) add(); else map.once("idle", add);
  }, [data, map, def, src, halo, dot]);

  // filters: sub-types + time window (re-evaluated every minute so "last hour" stays honest)
  const keys = useMemo(() => allowedKeys(def, filters), [def, filters]);
  useEffect(() => {
    const apply = () => {
      if (!map.getLayer(dot)) return;
      const cutoff = Date.now() - WINDOW_MS[win]; const base: unknown[] = ["in", ["get", "k"], ["literal", keys]];
      const f = def.timeFilter && win !== "all" ? ["all", base, ["any", ["!", ["has", "t"]], [">=", ["get", "t"], cutoff]]] : base;
      map.setFilter(halo, f as never); map.setFilter(dot, f as never); if (map.getLayer(`${src}-label`)) map.setFilter(`${src}-label`, f as never);
      if (data) { const byKey: Record<string, number> = {}; let shown = 0; for (const x of data.features) { const p = x.properties as Feat & { k: string }; if (!keys.includes(p.k)) continue; if (def.timeFilter && win !== "all" && p.t && p.t < cutoff) continue; shown++; byKey[p.k] = (byKey[p.k] ?? 0) + 1; byKey[p.type] = (byKey[p.type] ?? 0) + (p.sub ? 0 : 0); } setStat(def.id, { shown, byKey }); }
    };
    apply(); const i = setInterval(apply, 60_000); const onIdle = () => { if (map.getLayer(dot)) { apply(); map.off("idle", onIdle); } }; map.on("idle", onIdle);
    return () => { clearInterval(i); map.off("idle", onIdle); };
  }, [map, def, keys, win, data, dot, halo, src, setStat]);

  // cleanup on unmount (layer toggled off)
  useEffect(() => () => {
    try { for (const id of [`${src}-label`, dot, halo]) if (map.getLayer(id)) map.removeLayer(id); if (map.getSource(src)) map.removeSource(src); } catch {}
    dataLayerIds.delete(dot); dataLayerIds.delete(halo); useLayerStats.getState().set(def.id, { state: "idle", total: 0, shown: 0, byKey: {} });
  }, [map, def.id, src, halo, dot]);
  return null;
}

/** Mounts one renderer per switched-on data layer. */
export function DataLayers() {
  const on = useStore((s) => s.layers); const [map, setM] = useState<MLMap | null>(null); const alive = useRef(true);
  useEffect(() => { alive.current = true; const off = onMap((m) => alive.current && setM(m)); return () => { alive.current = false; off(); }; }, []);
  if (!map) return null;
  return <><RasterLayers map={map} />{LAYERS.filter((l) => isData(l) && on[l.id] && (l.kind === "points" || l.kind === "viewport" || l.kind === "moving" || l.kind === "client" || l.kind === "polygons" || l.id === "weather")).map((l) => <DataLayer key={l.id} def={l} map={map} />)}{LAYERS.filter((l) => isData(l) && on[l.id] && l.kind === "choropleth").map((l) => <ChoroplethLayer key={l.id} def={l} map={map} />)}{LAYERS.filter((l) => isData(l) && on[l.id] && l.kind === "members").map((l) => <MembershipLayer key={l.id} def={l} map={map} />)}</>;
}
