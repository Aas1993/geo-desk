import type { Feat } from "../registry";
import { fc, getJson, UA } from "../cache";
/** Active fire hotspots. With FIRMS_MAP_KEY: NASA FIRMS VIIRS (375 m) detections, last 24 h. Without: open NASA EONET wildfire events. */
export async function fires(): Promise<GeoJSON.FeatureCollection> {
  const key = process.env.FIRMS_MAP_KEY;
  if (key) {
    const r = await fetch(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/VIIRS_SNPP_NRT/world/1`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(60_000), cache: "no-store" });
    if (!r.ok) throw new Error(`FIRMS responded ${r.status}`);
    const lines = (await r.text()).trim().split("\n"); const h = lines[0].split(","); const ix = (n: string) => h.indexOf(n);
    const rows = lines.slice(1).map((l) => l.split(",")).filter((c) => (c[ix("confidence")] === "h" || c[ix("confidence")] === "n") && +c[ix("frp")] >= 3)
      .sort((a, b) => +b[ix("frp")] - +a[ix("frp")]).slice(0, 4000);
    return fc(rows.map((c, i) => { const hhmm = c[ix("acq_time")].padStart(4, "0"); const t = Date.parse(`${c[ix("acq_date")]}T${hhmm.slice(0, 2)}:${hhmm.slice(2)}:00Z`); const frp = +c[ix("frp")];
      return { type: "Feature", geometry: { type: "Point", coordinates: [+c[ix("longitude")], +c[ix("latitude")]] }, properties: { id: `firms:${i}`, layer: "fires", type: "fire", title: `Fire hotspot · FRP ${frp.toFixed(0)} MW`, t, sev: frp > 100 ? 3 : frp > 30 ? 2 : 1, src: "NASA FIRMS VIIRS", desc: `${c[ix("daynight")] === "D" ? "Daytime" : "Night-time"} detection` } satisfies Feat } as GeoJSON.Feature; }));
  }
  const j = await getJson<{ events: { id: string; title: string; link: string; categories: { id: string }[]; geometry: { date: string; coordinates: number[] }[] }[] }>("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&category=wildfires&limit=400");
  return fc(j.events.map((e) => { const g = e.geometry[e.geometry.length - 1]; return { type: "Feature", geometry: { type: "Point", coordinates: [g.coordinates[0], g.coordinates[1]] }, properties: { id: `eonet:${e.id}`, layer: "fires", type: "fire", title: e.title, t: Date.parse(g.date), sev: 1, url: e.link, src: "NASA EONET (set FIRMS_MAP_KEY for hotspot-level detail)" } satisfies Feat } as GeoJSON.Feature; }));
}
