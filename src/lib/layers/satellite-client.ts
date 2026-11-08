"use client";
type Omm = Record<string, string | number>;
export type SatPayload = { groups: Record<string, Omm[]> };
type Rec = { key: string; name: string; id: number; incl: number; rec: unknown };
let cache: { recs: Rec[]; sat: typeof import("satellite.js") } | null = null;

/** Builds SGP4 records once per payload (browser only). */
export async function prepare(p: SatPayload) {
  const sat = await import("satellite.js"); const recs: Rec[] = [];
  for (const [key, list] of Object.entries(p.groups)) for (const o of list) { try { recs.push({ key, name: String(o.OBJECT_NAME), id: Number(o.NORAD_CAT_ID), incl: Number(o.INCLINATION), rec: sat.json2satrec(o as never) }); } catch {} }
  cache = { recs, sat }; return recs.length;
}
/** Current sub-satellite points for every prepared object as GeoJSON. */
export function positions(date = new Date()): GeoJSON.FeatureCollection {
  if (!cache) return { type: "FeatureCollection", features: [] };
  const { recs, sat } = cache; const gmst = sat.gstime(date); const features: GeoJSON.Feature[] = [];
  for (const r of recs) {
    const pv = sat.propagate(r.rec as never, date); const pos = pv && (pv as { position?: unknown }).position; if (!pos || typeof pos === "boolean") continue;
    const g = sat.eciToGeodetic(pos as never, gmst); const lat = sat.degreesLat(g.latitude), lon = sat.degreesLong(g.longitude); if (!isFinite(lat) || !isFinite(lon)) continue;
    features.push({ type: "Feature", geometry: { type: "Point", coordinates: [lon, lat] }, properties: { id: `sat:${r.id}`, layer: "satellites", type: r.key, k: r.key, title: r.name, t: date.getTime(), sev: r.key === "stations" ? 3 : 0, desc: `Altitude ${Math.round(g.height).toLocaleString("en-US")} km · inclination ${r.incl.toFixed(1)}° · NORAD ${r.id}`, src: "CelesTrak · SGP4 in your browser" } });
  }
  return { type: "FeatureCollection", features };
}
