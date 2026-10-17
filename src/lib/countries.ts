import type { Country } from "./types";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import type { Feature, FeatureCollection, Geometry, Position } from "geojson";

export type CountryData = {
  list: Country[]; byIso: Map<string, Country>; byNum: Map<string, Country>;
  geo: FeatureCollection<Geometry, { iso3: string; name: string; nameAr: string }>;
  bbox: Map<string, [number, number, number, number]>;
  labelPts: FeatureCollection; capitals: FeatureCollection;
};
let cache: Promise<CountryData> | null = null;

function ringBbox(ring: Position[]) { let a = 180, b = 90, c = -180, d = -90; for (const [x, y] of ring) { if (x < a) a = x; if (x > c) c = x; if (y < b) b = y; if (y > d) d = y; } return [a, b, c, d] as [number, number, number, number]; }

export function loadCountries(): Promise<CountryData> {
  return (cache ??= (async () => {
    const [list, topo] = await Promise.all([
      fetch("/data/countries.json").then((r) => r.json() as Promise<Country[]>),
      fetch("/data/countries-50m.json").then((r) => r.json() as Promise<Topology>),
    ]);
    const byNum = new Map(list.map((c) => [c.num, c])); const byIso = new Map(list.map((c) => [c.iso3, c]));
    const all = feature(topo, topo.objects.countries as never) as unknown as FeatureCollection<Geometry>;
    const bbox = new Map<string, [number, number, number, number]>();
    const labels: Feature[] = []; const feats: Feature<Geometry, { iso3: string; name: string; nameAr: string }>[] = [];
    for (const f of all.features) {
      const c = byNum.get(String(f.id).padStart(3, "0")); if (!c) continue;
      const polys: Position[][][] = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [];
      let best: [number, number, number, number] | null = null, bestArea = -1; let ext: [number, number, number, number] | null = null;
      for (const p of polys) {
        const b = ringBbox(p[0]); const ar = (b[2] - b[0]) * (b[3] - b[1]);
        if (ar > bestArea) { bestArea = ar; best = b; }
        // ignore antimeridian-spanning slivers (e.g. Russia, Fiji) when computing the fit box
        if (b[2] - b[0] > 300) continue;
        ext = ext ? [Math.min(ext[0], b[0]), Math.min(ext[1], b[1]), Math.max(ext[2], b[2]), Math.max(ext[3], b[3])] : b;
      }
      if (!best) continue;
      bbox.set(c.iso3, ext ?? best);
      feats.push({ type: "Feature", properties: { iso3: c.iso3, name: c.name, nameAr: c.nameAr ?? c.name }, geometry: f.geometry });
      labels.push({ type: "Feature", properties: { iso3: c.iso3, name: c.name, nameAr: c.nameAr ?? c.name, rank: bestArea }, geometry: { type: "Point", coordinates: [(best[0] + best[2]) / 2, (best[1] + best[3]) / 2] } });
    }
    const capitals: Feature[] = list.filter((c) => c.lat != null && c.lng != null && c.capital).map((c) => ({
      type: "Feature", properties: { iso3: c.iso3, name: c.capital!, nameAr: c.capital!, home: c.iso3 === "ARE" ? 1 : 0 }, geometry: { type: "Point", coordinates: [c.lng!, c.lat!] },
    }));
    return { list, byIso, byNum, geo: { type: "FeatureCollection", features: feats }, bbox, labelPts: { type: "FeatureCollection", features: labels }, capitals: { type: "FeatureCollection", features: capitals } };
  })());
}
export const displayName = (c: Country, lang: "en" | "ar") => (lang === "ar" && c.nameAr ? c.nameAr : c.name);
