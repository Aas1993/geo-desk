"use client";
import { useEffect, useRef, useState } from "react";
import { Map as MLMap, Marker, setRTLTextPlugin, setWorkerUrl, type GeoJSONSource, type StyleSpecification } from "maplibre-gl";
import { loadCountries, type CountryData } from "@/lib/countries";
import { useStore } from "@/lib/store";
import { HOME_ISO3 } from "@/lib/types";
import { dataLayerIds, setMap } from "@/lib/map-bus";
import { graticule, nightPolygon } from "@/lib/terminator";

const PAL = {
  dark: { ocean: "#04070d", land: "#0b1424", landHover: "#14233e", landSel: "#0e3248", home: "#0d1a2e", border: "#24406a", text: "#86a0c8", textHalo: "#04070d", accent: "#3ddcff", grid: "rgba(90,140,220,0.10)", night: "rgba(2,5,12,0.52)" },
  light: { ocean: "#c9d9ec", land: "#eef3fa", landHover: "#dce8f6", landSel: "#bfe3f1", home: "#e4edf8", border: "#9db4d4", text: "#46608a", textHalo: "#eef3fa", accent: "#0a7ea4", grid: "rgba(40,80,140,0.12)", night: "rgba(20,30,60,0.28)" },
};
const SAT = { border: "rgba(190,215,255,0.55)", text: "#e3eeff", halo: "rgba(2,6,14,0.85)" };
const GLYPHS = "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf";
const FONT = ["Open Sans Regular", "Arial Unicode MS Regular"];
// Sentinel-2 cloudless mosaic by EOX (contains modified Copernicus Sentinel data 2023, CC BY-NC-SA 4.0 — non-commercial use with attribution).
const EOX = "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2023_3857/default/g/{z}/{y}/{x}.jpg";

let setup = false;
// Turbopack can't bundle MapLibre's worker, so serve the standalone worker from /public (copied by `npm run copy-worker`).
function setupOnce() {
  if (setup) return; setup = true;
  setWorkerUrl("/maplibre-gl-worker.mjs");
  setRTLTextPlugin("https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.3.0/dist/mapbox-gl-rtl-text.js", true).catch(() => {});
}
function readHash(): { z: number; lat: number; lng: number } | null {
  const m = /^#(-?[\d.]+)\/(-?[\d.]+)\/(-?[\d.]+)/.exec(location.hash);
  return m ? { z: +m[1], lat: +m[2], lng: +m[3] } : null;
}
const isMobile = () => window.matchMedia("(max-width: 639px)").matches;
function padding() {
  const rtl = document.documentElement.dir === "rtl";
  if (isMobile()) return { top: 90, bottom: window.innerHeight * 0.42, left: 30, right: 30 };
  return { top: 90, bottom: 80, left: rtl ? 110 : 480, right: rtl ? 480 : 110 };
}

function buildStyle(d: CountryData, theme: "dark" | "light"): StyleSpecification {
  const p = PAL[theme];
  return {
    version: 8, glyphs: GLYPHS, projection: { type: "globe" },
    sky: { "sky-color": "#06182c", "horizon-color": "#1d6a96", "fog-color": "#050d1a", "sky-horizon-blend": 0.55, "horizon-fog-blend": 0.8, "fog-ground-blend": 0.9, "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 1, 7.5, 0] },
    sources: {
      countries: { type: "geojson", data: d.geo, promoteId: "iso3" },
      labels: { type: "geojson", data: d.labelPts },
      capitals: { type: "geojson", data: d.capitals },
      grid: { type: "geojson", data: graticule() },
      night: { type: "geojson", data: nightPolygon() },
      sat: { type: "raster", tiles: [EOX], tileSize: 256, maxzoom: 12, attribution: "Sentinel-2 cloudless © EOX (Copernicus Sentinel data 2023)" },
    },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": p.ocean } },
      { id: "sat", type: "raster", source: "sat", layout: { visibility: "none" }, paint: { "raster-opacity": 0.92, "raster-saturation": -0.1 } },
      { id: "grid", type: "line", source: "grid", paint: { "line-color": p.grid, "line-width": 0.6 } },
      { id: "fill", type: "fill", source: "countries", paint: {
        "fill-color": ["case", ["boolean", ["feature-state", "sel"], false], p.landSel, ["boolean", ["feature-state", "hover"], false], p.landHover, ["==", ["get", "iso3"], HOME_ISO3], p.home, p.land],
        "fill-opacity": 1,
      } },
      { id: "night-fill", type: "fill", source: "night", layout: { visibility: "none" }, paint: { "fill-color": p.night } },
      { id: "border", type: "line", source: "countries", paint: { "line-color": p.border, "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.5, 6, 1.2] } },
      { id: "outline", type: "line", source: "countries", filter: ["==", ["get", "iso3"], ""], paint: { "line-color": p.accent, "line-width": 2.2 } },
      { id: "country-labels", type: "symbol", source: "labels", layout: {
        "text-field": ["get", "name"], "text-font": FONT, "symbol-sort-key": ["-", 0, ["get", "rank"]],
        "text-size": ["interpolate", ["linear"], ["zoom"], 1, 9, 5, 13], "text-transform": "uppercase", "text-letter-spacing": 0.08, "text-max-width": 7,
      }, paint: { "text-color": p.text, "text-halo-color": p.textHalo, "text-halo-width": 1.2 } },
      { id: "capital-dots", type: "circle", source: "capitals", minzoom: 3.2, paint: {
        "circle-radius": ["case", ["==", ["get", "home"], 1], 5, 3], "circle-color": ["case", ["==", ["get", "home"], 1], p.accent, p.text],
        "circle-stroke-color": p.textHalo, "circle-stroke-width": 1.2,
      } },
      { id: "capital-labels", type: "symbol", source: "capitals", minzoom: 3.8, layout: {
        "text-field": ["get", "name"], "text-font": FONT, "text-size": 11, "text-offset": [0, 0.9], "text-anchor": "top", "text-optional": true,
      }, paint: { "text-color": p.text, "text-halo-color": p.textHalo, "text-halo-width": 1.2 } },
    ],
  };
}

export default function MapCanvas() {
  const [failed, setFailed] = useState(false);
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const dataRef = useRef<CountryData | null>(null);
  const prevSel = useRef<string | null>(null);
  const hover = useRef<string | null>(null);
  const meMarker = useRef<Marker | null>(null);
  const syncRef = useRef<(fly: boolean) => void>(() => {});
  const { sel, theme, lang, layers, flyNonce, homeNonce, zoomCmd, projection, basemap, terminator, locateNonce } = useStore();

  useEffect(() => {
    let dead = false; let created: MLMap | null = null;
    setupOnce();
    loadCountries().catch((e) => { if (!dead) setFailed(true); throw e; }).then((d) => {
      if (dead || !el.current) return; dataRef.current = d;
      const h = readHash(); const st = useStore.getState();
      const map = new MLMap({
        container: el.current, style: buildStyle(d, st.theme), center: h ? [h.lng, h.lat] : [52, 23], zoom: h?.z ?? (isMobile() ? 3.2 : 4.1),
        minZoom: 1, maxZoom: 12, attributionControl: { compact: true, customAttribution: "Natural Earth" }, dragRotate: false, pitchWithRotate: false, touchPitch: false,
      });
      mapRef.current = map; created = map; setMap(map);
      if (process.env.NODE_ENV !== "production") (window as unknown as { __gdmap?: MLMap }).__gdmap = map;
      map.on("error", (e) => console.warn("[map]", e.error?.message ?? e));
      map.touchZoomRotate.disableRotation();
      const onData = (e: { point: { x: number; y: number } }) => dataLayerIds.size > 0 && map.queryRenderedFeatures(e.point as never, { layers: [...dataLayerIds].filter((id) => map.getLayer(id)) }).length > 0;
      map.on("click", "fill", (e) => { if (onData(e)) return; const f = e.features?.[0]; useStore.getState().select(f ? (f.properties.iso3 as string) : null); });
      map.on("click", (e) => { if (onData(e)) return; if (!map.queryRenderedFeatures(e.point, { layers: ["fill"] }).length) useStore.getState().select(null); });
      map.on("mousemove", "fill", (e) => {
        const id = (e.features?.[0]?.properties.iso3 as string) ?? null; if (id === hover.current) return;
        if (hover.current) map.setFeatureState({ source: "countries", id: hover.current }, { hover: false });
        hover.current = id; if (id) map.setFeatureState({ source: "countries", id }, { hover: true }); if (!onData(e)) map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "fill", () => { if (hover.current) map.setFeatureState({ source: "countries", id: hover.current }, { hover: false }); hover.current = null; map.getCanvas().style.cursor = ""; });
      map.on("moveend", () => { const c = map.getCenter(); history.replaceState(null, "", `${location.pathname}${location.search}#${map.getZoom().toFixed(2)}/${c.lat.toFixed(3)}/${c.lng.toFixed(3)}`); });
      map.once("load", () => { applyAll(); syncRef.current(!h); document.documentElement.dataset.mapReady = "1"; });
    }).catch(() => { /* reported through the failed state */ });
    return () => { dead = true; created?.remove(); mapRef.current = null; setMap(null); };
  }, []);

  function applyAll() {
    const m = mapRef.current; if (!m) return; if (!m.isStyleLoaded()) { m.once("idle", applyAll); return; } // tiles are loading: try again when the map is idle instead of dropping the change
    const s = useStore.getState(); const p = PAL[s.theme]; const sat = s.basemap === "satellite";
    m.setPaintProperty("bg", "background-color", p.ocean);
    m.setLayoutProperty("sat", "visibility", sat ? "visible" : "none");
    m.setPaintProperty("grid", "line-color", p.grid);
    m.setPaintProperty("fill", "fill-color", ["case", ["boolean", ["feature-state", "sel"], false], p.landSel, ["boolean", ["feature-state", "hover"], false], p.landHover, ["==", ["get", "iso3"], HOME_ISO3], p.home, p.land]);
    // over imagery only the selected/hovered country is tinted; the land fill becomes transparent
    m.setPaintProperty("fill", "fill-opacity", sat ? ["case", ["boolean", ["feature-state", "sel"], false], 0.35, ["boolean", ["feature-state", "hover"], false], 0.22, 0] : 1);
    m.setPaintProperty("border", "line-color", sat ? SAT.border : p.border);
    m.setPaintProperty("outline", "line-color", p.accent);
    m.setPaintProperty("night-fill", "fill-color", p.night);
    m.setLayoutProperty("night-fill", "visibility", s.terminator ? "visible" : "none");
    for (const id of ["country-labels", "capital-labels"]) { m.setPaintProperty(id, "text-color", sat ? SAT.text : p.text); m.setPaintProperty(id, "text-halo-color", sat ? SAT.halo : p.textHalo); }
    m.setPaintProperty("capital-dots", "circle-color", ["case", ["==", ["get", "home"], 1], p.accent, sat ? SAT.text : p.text]);
    m.setPaintProperty("capital-dots", "circle-stroke-color", sat ? SAT.halo : p.textHalo);
    m.setLayoutProperty("country-labels", "text-field", ["get", s.lang === "ar" ? "nameAr" : "name"]);
    m.setLayoutProperty("country-labels", "text-transform", s.lang === "ar" ? "none" : "uppercase");
    m.setLayoutProperty("country-labels", "visibility", s.layers.labels ? "visible" : "none");
    m.setLayoutProperty("border", "visibility", s.layers.borders ? "visible" : "none");
    for (const id of ["capital-dots", "capital-labels"]) m.setLayoutProperty(id, "visibility", s.layers.capitals ? "visible" : "none");
    m.setProjection({ type: s.projection });
    m.setSky({ "atmosphere-blend": s.projection === "globe" ? ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 1, 7.5, 0] : 0 } as never);
  }
  useEffect(applyAll, [theme, lang, layers, projection, basemap, terminator]);

  // day/night terminator refreshes every minute while visible
  useEffect(() => {
    if (!terminator) return; const upd = () => { const src = mapRef.current?.getSource("night") as GeoJSONSource | undefined; src?.setData(nightPolygon()); };
    upd(); const i = setInterval(upd, 60_000); return () => clearInterval(i);
  }, [terminator]);

  // "my location": fly there and drop a pulsing marker (the browser asks for permission)
  useEffect(() => {
    if (!locateNonce || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const m = mapRef.current; if (!m) return; const ll: [number, number] = [pos.coords.longitude, pos.coords.latitude];
      if (!meMarker.current) { const e = document.createElement("div"); e.style.cssText = "width:14px;height:14px;border-radius:50%;background:#3ddcff;border:2px solid #fff;box-shadow:0 0 0 6px rgba(61,220,255,.25)"; meMarker.current = new Marker({ element: e }).setLngLat(ll).addTo(m); } else meMarker.current.setLngLat(ll);
      m.flyTo({ center: ll, zoom: Math.max(m.getZoom(), 6), duration: 1400 });
    }, () => {}, { enableHighAccuracy: false, timeout: 8000 });
  }, [locateNonce]);

  // selection highlight (+ optional fly-to). Also runs once the map has loaded so deep links (?sel=ARE) work.
  function syncSelection(fly: boolean) {
    const m = mapRef.current; const d = dataRef.current; if (!m || !d) return;
    if (!m.isStyleLoaded()) { m.once("idle", () => syncRef.current(fly)); return; }
    const cur = useStore.getState().sel;
    if (prevSel.current && prevSel.current !== cur) m.setFeatureState({ source: "countries", id: prevSel.current }, { sel: false });
    if (cur) m.setFeatureState({ source: "countries", id: cur }, { sel: true });
    m.setFilter("outline", ["==", ["get", "iso3"], cur ?? ""]); prevSel.current = cur;
    const b = cur ? d.bbox.get(cur) : null;
    if (fly && b) m.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: padding(), maxZoom: 6, duration: 1200 });
  }
  syncRef.current = syncSelection;
  useEffect(() => { syncSelection(true); }, [flyNonce]);
  useEffect(() => { // keep selection state in sync if sel changes without a fly (e.g. close)
    const m = mapRef.current; if (!m || !m.isStyleLoaded()) return;
    if (prevSel.current && prevSel.current !== sel) m.setFeatureState({ source: "countries", id: prevSel.current }, { sel: false });
    if (!sel) { m.setFilter("outline", ["==", ["get", "iso3"], ""]); prevSel.current = null; }
  }, [sel]);
  useEffect(() => { if (homeNonce) mapRef.current?.flyTo({ center: [54, 24], zoom: isMobile() ? 3.6 : 4.6, duration: 1200 }); }, [homeNonce]);
  useEffect(() => { if (!zoomCmd.n) return; if (zoomCmd.dir > 0) mapRef.current?.zoomIn(); else mapRef.current?.zoomOut(); }, [zoomCmd]);

  return <div className="absolute inset-0"><div ref={el} style={{ position: "absolute", inset: 0 }} aria-label={lang === "ar" ? "خريطة العالم" : "World map"} role="application" />{failed && <div role="alert" className="absolute inset-x-4 top-24 z-10 mx-auto max-w-sm rounded-[10px] border border-down/40 bg-bg1 p-3 text-[13px] text-t0">{lang === "ar" ? "تعذر تحميل بيانات الخريطة. تحقق من الاتصال و" : "The map data could not be loaded. Check the connection and "}<button onClick={() => location.reload()} className="underline">{lang === "ar" ? "أعد التحميل" : "reload"}</button>.</div>}</div>;
}
