"use client";
import { useEffect, useRef } from "react";
import { Map as MLMap, setRTLTextPlugin, setWorkerUrl, type StyleSpecification } from "maplibre-gl";
import { loadCountries, type CountryData } from "@/lib/countries";
import { useStore } from "@/lib/store";
import { HOME_ISO3 } from "@/lib/types";

const PAL = {
  dark: { ocean: "#0a0b0d", land: "#15171b", landHover: "#1e2127", landSel: "#2b2517", home: "#1a1c20", border: "#2b2f36", text: "#827f73", textHalo: "#0a0b0d", accent: "#d6a74f" },
  light: { ocean: "#e2ddd0", land: "#f5f2ea", landHover: "#e9e4d6", landSel: "#f1e3bf", home: "#eee8d9", border: "#c6bfae", text: "#6a665b", textHalo: "#f5f2ea", accent: "#9b6a0f" },
};
const GLYPHS = "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf";
const FONT = ["Open Sans Regular", "Arial Unicode MS Regular"];

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
  if (isMobile()) return { top: 30, bottom: window.innerHeight * 0.42, left: 30, right: 30 };
  return { top: 50, bottom: 50, left: rtl ? 90 : 470, right: rtl ? 470 : 90 };
}

function buildStyle(d: CountryData, theme: "dark" | "light"): StyleSpecification {
  const p = PAL[theme];
  return {
    version: 8, glyphs: GLYPHS, projection: { type: "globe" },
    sources: {
      countries: { type: "geojson", data: d.geo, promoteId: "iso3" },
      labels: { type: "geojson", data: d.labelPts },
      capitals: { type: "geojson", data: d.capitals },
    },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": p.ocean } },
      { id: "fill", type: "fill", source: "countries", paint: {
        "fill-color": ["case", ["boolean", ["feature-state", "sel"], false], p.landSel, ["boolean", ["feature-state", "hover"], false], p.landHover, ["==", ["get", "iso3"], HOME_ISO3], p.home, p.land],
      } },
      { id: "border", type: "line", source: "countries", paint: { "line-color": p.border, "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.4, 6, 1.1] } },
      { id: "outline", type: "line", source: "countries", filter: ["==", ["get", "iso3"], ""], paint: { "line-color": p.accent, "line-width": 2 } },
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
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const dataRef = useRef<CountryData | null>(null);
  const prevSel = useRef<string | null>(null);
  const hover = useRef<string | null>(null);
  const syncRef = useRef<(fly: boolean) => void>(() => {});
  const { sel, theme, lang, layers, flyNonce, homeNonce, zoomCmd } = useStore();

  useEffect(() => {
    let dead = false; let created: MLMap | null = null;
    setupOnce();
    loadCountries().then((d) => {
      if (dead || !el.current) return; dataRef.current = d;
      const h = readHash(); const st = useStore.getState();
      const map = new MLMap({
        container: el.current, style: buildStyle(d, st.theme), center: h ? [h.lng, h.lat] : [52, 23], zoom: h?.z ?? (isMobile() ? 3.2 : 4.1),
        minZoom: 1, maxZoom: 9, attributionControl: { compact: true, customAttribution: "Natural Earth" }, dragRotate: false, pitchWithRotate: false, touchPitch: false,
      });
      mapRef.current = map; created = map;
      if (process.env.NODE_ENV !== "production") (window as unknown as { __gdmap?: MLMap }).__gdmap = map;
      map.on("error", (e) => console.warn("[map]", e.error?.message ?? e));
      map.touchZoomRotate.disableRotation();
      map.on("click", "fill", (e) => { const f = e.features?.[0]; useStore.getState().select(f ? (f.properties.iso3 as string) : null); });
      map.on("click", (e) => { if (!map.queryRenderedFeatures(e.point, { layers: ["fill"] }).length) useStore.getState().select(null); });
      map.on("mousemove", "fill", (e) => {
        const id = (e.features?.[0]?.properties.iso3 as string) ?? null; if (id === hover.current) return;
        if (hover.current) map.setFeatureState({ source: "countries", id: hover.current }, { hover: false });
        hover.current = id; if (id) map.setFeatureState({ source: "countries", id }, { hover: true }); map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "fill", () => { if (hover.current) map.setFeatureState({ source: "countries", id: hover.current }, { hover: false }); hover.current = null; map.getCanvas().style.cursor = ""; });
      map.on("moveend", () => { const c = map.getCenter(); history.replaceState(null, "", `${location.pathname}${location.search}#${map.getZoom().toFixed(2)}/${c.lat.toFixed(3)}/${c.lng.toFixed(3)}`); });
      map.once("load", () => { applyAll(); syncRef.current(!h); document.documentElement.dataset.mapReady = "1"; });
    });
    return () => { dead = true; created?.remove(); mapRef.current = null; };
  }, []);

  function applyAll() {
    const m = mapRef.current; if (!m || !m.isStyleLoaded()) return;
    const s = useStore.getState();
    const p = PAL[s.theme];
    m.setPaintProperty("bg", "background-color", p.ocean);
    m.setPaintProperty("fill", "fill-color", ["case", ["boolean", ["feature-state", "sel"], false], p.landSel, ["boolean", ["feature-state", "hover"], false], p.landHover, ["==", ["get", "iso3"], HOME_ISO3], p.home, p.land]);
    m.setPaintProperty("border", "line-color", p.border);
    m.setPaintProperty("outline", "line-color", p.accent);
    for (const id of ["country-labels", "capital-labels"]) { m.setPaintProperty(id, "text-color", p.text); m.setPaintProperty(id, "text-halo-color", p.textHalo); }
    m.setPaintProperty("capital-dots", "circle-color", ["case", ["==", ["get", "home"], 1], p.accent, p.text]);
    m.setPaintProperty("capital-dots", "circle-stroke-color", p.textHalo);
    m.setLayoutProperty("country-labels", "text-field", ["get", s.lang === "ar" ? "nameAr" : "name"]);
    m.setLayoutProperty("country-labels", "text-transform", s.lang === "ar" ? "none" : "uppercase");
    m.setLayoutProperty("country-labels", "visibility", s.layers.labels ? "visible" : "none");
    m.setLayoutProperty("border", "visibility", s.layers.borders ? "visible" : "none");
    for (const id of ["capital-dots", "capital-labels"]) m.setLayoutProperty(id, "visibility", s.layers.capitals ? "visible" : "none");
  }
  useEffect(applyAll, [theme, lang, layers]);

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

  return (
    <div className={`absolute inset-x-0 top-14 bottom-14 sm:start-14 ${layers.ticker ? "sm:bottom-9" : "sm:bottom-0"}`}>
      <div ref={el} style={{ position: "absolute", inset: 0 }} aria-label="World map" role="application" />
    </div>
  );
}
