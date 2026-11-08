import type { Feat } from "../registry";
import { fc, getJson, km } from "../cache";

type Pt = [number, number];
const feature = (p: Feat, c: Pt): GeoJSON.Feature => ({ type: "Feature", geometry: { type: "Point", coordinates: c }, properties: p });
const firstPoint = (g: { type: string; coordinates: unknown }): Pt | null => {
  const walk = (x: unknown): Pt | null => (Array.isArray(x) ? (typeof x[0] === "number" ? ([x[0], x[1]] as Pt) : walk(x[0])) : null); return walk(g.coordinates);
};

async function usgs(): Promise<GeoJSON.Feature[]> {
  // Magnitude 4.5+ over the last 7 days (the 2.5+ feed is ~1,000 points and unreadable on a globe).
  const j = await getJson<{ features: { id: string; properties: { mag: number; place: string; time: number; url: string; tsunami: number }; geometry: { coordinates: number[] } }[] }>("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson");
  return j.features.map((f) => { const m = f.properties.mag; return feature({ id: `usgs:${f.id}`, layer: "hazards", type: "quake", title: `M${m.toFixed(1)} — ${f.properties.place}`, t: f.properties.time, sev: m >= 7 ? 3 : m >= 6 ? 2 : m >= 5 ? 1 : 0, url: f.properties.url, src: "USGS", extra: { mag: m, tsunami: f.properties.tsunami } }, [f.geometry.coordinates[0], f.geometry.coordinates[1]]); });
}

const GDACS_TYPE: Record<string, string> = { TC: "cyclone", FL: "flood", VO: "volcano", DR: "drought" };
const ALERT: Record<string, number> = { Green: 0, Orange: 2, Red: 3 };
async function gdacs(): Promise<GeoJSON.Feature[]> {
  const j = await getJson<{ features: { geometry: { type: string; coordinates: unknown }; properties: { eventtype: string; eventid: number; name: string; alertlevel: string; fromdate: string; country: string; iscurrent: string | boolean; url?: { report?: string; details?: string }; severitydata?: { severitytext?: string } } }[] }>("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=TC,FL,VO,DR&alertlevel=Green;Orange;Red");
  const out: GeoJSON.Feature[] = [];
  for (const f of j.features) {
    const p = f.properties; const type = GDACS_TYPE[p.eventtype]; const c = firstPoint(f.geometry); if (!type || !c) continue;
    if (String(p.iscurrent) === "false") continue;
    const t = Date.parse(p.fromdate + (p.fromdate.endsWith("Z") ? "" : "Z"));
    out.push(feature({ id: `gdacs:${p.eventtype}${p.eventid}`, layer: "hazards", type, title: p.name || `${type} (${p.country})`, t: isFinite(t) ? t : undefined, sev: ALERT[p.alertlevel] ?? 1, url: p.url?.report ?? p.url?.details, desc: [p.country, p.severitydata?.severitytext].filter(Boolean).join(" · "), src: `GDACS · ${p.alertlevel} alert` }, c));
  }
  return out;
}

const EONET_TYPE: Record<string, string> = { wildfires: "wildfire", volcanoes: "volcano", floods: "flood", drought: "drought", severeStorms: "cyclone" };
async function eonet(): Promise<GeoJSON.Feature[]> {
  const j = await getJson<{ events: { id: string; title: string; link: string; categories: { id: string }[]; geometry: { date: string; type: string; coordinates: unknown }[] }[] }>("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=300");
  const out: GeoJSON.Feature[] = [];
  for (const e of j.events) {
    const type = EONET_TYPE[e.categories[0]?.id]; if (!type) continue; const g = e.geometry[e.geometry.length - 1]; const c = g && firstPoint(g); if (!c) continue;
    if (type === "cyclone" && !/cyclone|typhoon|hurricane|tropical/i.test(e.title)) continue; // "severe storms" also holds ordinary storms
    out.push(feature({ id: `eonet:${e.id}`, layer: "hazards", type, title: e.title, t: Date.parse(g.date), sev: 1, url: e.link, src: "NASA EONET" }, c));
  }
  return out;
}

/** Merge three feeds; drop an EONET/GDACS item when a same-type event from the preferred source is within ~250 km. */
export async function hazards(): Promise<GeoJSON.FeatureCollection> {
  const [a, g, e] = await Promise.allSettled([usgs(), gdacs(), eonet()]);
  const quakes = a.status === "fulfilled" ? a.value : []; const gd = g.status === "fulfilled" ? g.value : []; const eo = e.status === "fulfilled" ? e.value : [];
  if (a.status === "rejected" && g.status === "rejected" && e.status === "rejected") throw new Error("all hazard feeds failed");
  const near = (f: GeoJSON.Feature, pool: GeoJSON.Feature[]) => pool.some((o) => (o.properties as Feat).type === (f.properties as Feat).type && km((o.geometry as GeoJSON.Point).coordinates as Pt, (f.geometry as GeoJSON.Point).coordinates as Pt) < 250);
  const eoKept = eo.filter((f) => !near(f, gd));
  return fc([...quakes, ...gd, ...eoKept]);
}
