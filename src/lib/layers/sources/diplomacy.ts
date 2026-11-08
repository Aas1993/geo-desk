import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Feat } from "../registry";
import { fc } from "../cache";
type Mission = { id: string; type: string; approx?: boolean; name: string; city: string | null; head: { role: string; name: string } | null; phone: string | null; website: string | null; lat: number | null; lon: number | null };
type Visit = { u: string; d: string; t: string; c: string[]; k: string; l: number };
const rd = async <T,>(f: string) => JSON.parse(await readFile(path.join(process.cwd(), "public/data", f), "utf8")) as T;

/** UAE embassies, consulates and permanent missions as map points (MOFA directory). */
export async function missions(): Promise<GeoJSON.FeatureCollection> {
  const j = await rd<{ countries: Record<string, Mission[]> }>("missions.json"); const out: GeoJSON.Feature[] = [];
  for (const [iso3, list] of Object.entries(j.countries)) for (const m of list) {
    if (m.lat == null || m.lon == null || m.type === "visa-centre") continue;
    out.push({ type: "Feature", geometry: { type: "Point", coordinates: [m.lon, m.lat] }, properties: { id: `mission:${m.id}`, layer: "missions", type: m.type, title: m.name, sev: m.type === "embassy" ? 2 : 1, desc: [m.head ? `${m.head.role}: ${m.head.name}` : "", m.phone ? `Tel ${m.phone}` : "", m.approx ? "Location approximate (city centre)" : ""].filter(Boolean).join(" · "), url: m.website ?? undefined, src: "UAE Ministry of Foreign Affairs", iso3 } satisfies Feat });
  }
  return fc(out);
}

/** Countries with UAE engagements reported by WAM in the last 12 months, drawn at their capital and sized by how active the relationship is. */
export async function visits(): Promise<GeoJSON.FeatureCollection> {
  const [v, countries] = await Promise.all([rd<{ items: Visit[] }>("visits.json"), rd<{ iso3: string; name: string; lat: number | null; lng: number | null }[]>("countries.json")]);
  const cutoff = new Date(Date.now() - 365 * 86400e3).toISOString().slice(0, 10); const by = new Map<string, Visit[]>();
  for (const x of v.items) if (x.d >= cutoff) for (const c of x.c) (by.get(c) ?? by.set(c, []).get(c)!).push(x);
  const out: GeoJSON.Feature[] = [];
  for (const [iso3, list] of by) {
    const co = countries.find((c) => c.iso3 === iso3); if (!co || co.lat == null || co.lng == null) continue; list.sort((a, b) => b.d.localeCompare(a.d));
    const senior = list.filter((x) => x.l === 3).length; const n = list.length; const top = list.find((x) => x.l === 3) ?? list[0];
    out.push({ type: "Feature", geometry: { type: "Point", coordinates: [co.lng, co.lat] }, properties: { id: `visits:${iso3}`, layer: "visits", type: senior >= 3 ? "senior" : "regular", title: `${co.name}: ${n} engagement${n > 1 ? "s" : ""} in 12 months (${senior} senior)`, t: Date.parse(list[0].d + "T12:00:00Z"), sev: n >= 25 ? 3 : n >= 10 ? 2 : n >= 4 ? 1 : 0, desc: `Latest: ${top.d} · ${top.t}`, url: `https://www.wam.ae/en/article/${top.u}`, src: "WAM headlines, auto-classified", iso3 } satisfies Feat });
  }
  return fc(out);
}
