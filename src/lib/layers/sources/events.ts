import { unzipSync } from "fflate";
import type { Feat } from "../registry";
import { fc, UA } from "../cache";
// GDELT 2.0 event export: a 61-column TSV published every 15 minutes. Machine-coded from news, so noisy: always verify the linked article.
const COL = { actor1: 6, actor2: 16, root: 28, goldstein: 30, mentions: 31, tone: 34, place: 52, lat: 56, lon: 57, added: 59, url: 60 };
const KIND: Record<string, { type: string; label: string; min: number }> = { "14": { type: "protest", label: "Protest or unrest", min: 2 }, "18": { type: "conflict", label: "Assault or violence", min: 2 }, "19": { type: "conflict", label: "Armed clash", min: 2 }, "20": { type: "conflict", label: "Mass violence", min: 1 }, "15": { type: "coercion", label: "Show of force", min: 2 }, "16": { type: "coercion", label: "Reduced relations or sanctions", min: 3 }, "17": { type: "coercion", label: "Coercion or threats", min: 2 }, "04": { type: "diplomacy", label: "Consultations", min: 6 }, "05": { type: "diplomacy", label: "Diplomatic cooperation", min: 6 } };
const stamp = (ts: string) => Date.UTC(+ts.slice(0, 4), +ts.slice(4, 6) - 1, +ts.slice(6, 8), +ts.slice(8, 10), +ts.slice(10, 12), +ts.slice(12, 14));
const fmt = (ms: number) => new Date(ms).toISOString().replace(/[-:T]/g, "").slice(0, 14);

async function file(ts: string): Promise<string[]> {
  const r = await fetch(`http://data.gdeltproject.org/gdeltv2/${ts}.export.CSV.zip`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(25_000), cache: "no-store" });
  if (!r.ok) return [];
  const files = unzipSync(new Uint8Array(await r.arrayBuffer())); const first = Object.values(files)[0];
  return new TextDecoder().decode(first).split("\n");
}
/** Last ~90 minutes of coded events, clustered by place and kind so one big story is one marker. */
export async function events(): Promise<GeoJSON.FeatureCollection> {
  const head = await (await fetch("http://data.gdeltproject.org/gdeltv2/lastupdate.txt", { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15_000), cache: "no-store" })).text();
  const latest = head.split("\n")[0].split(" ")[2]?.match(/(\d{14})\.export/)?.[1]; if (!latest) throw new Error("GDELT index unavailable");
  const base = stamp(latest); const stamps = Array.from({ length: 6 }, (_, i) => fmt(base - i * 15 * 60_000));
  const lines = (await Promise.allSettled(stamps.map(file))).flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  if (!lines.length) throw new Error("GDELT files unavailable");
  const clusters = new Map<string, { f: Feat; coords: [number, number]; mentions: number; best: number; tone: number; n: number }>();
  for (const line of lines) {
    const c = line.split("\t"); if (c.length < 61) continue; const k = KIND[c[COL.root]]; if (!k) continue;
    const mentions = +c[COL.mentions]; const lat = +c[COL.lat], lon = +c[COL.lon]; if (!(mentions >= k.min) || !isFinite(lat) || !isFinite(lon) || (lat === 0 && lon === 0) || !c[COL.url]) continue;
    const key = `${lat.toFixed(1)},${lon.toFixed(1)},${k.type}`; const cur = clusters.get(key); const added = stamp(c[COL.added]);
    const place = c[COL.place] || "Unknown place"; const actors = [c[COL.actor1], c[COL.actor2]].filter(Boolean).join(" ↔ ").toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());
    if (!cur) clusters.set(key, { coords: [lon, lat], mentions, best: mentions, tone: +c[COL.tone], n: 1, f: { id: `gdelt:${key}`, layer: "events", type: k.type, title: `${k.label} · ${place}`, t: added, url: c[COL.url], desc: actors, src: "GDELT" } });
    else { cur.mentions += mentions; cur.n++; if (added > (cur.f.t ?? 0)) cur.f.t = added; if (mentions > cur.best) { cur.best = mentions; cur.f.url = c[COL.url]; if (actors) cur.f.desc = actors; } }
  }
  const top = [...clusters.values()].sort((a, b) => b.mentions - a.mentions).slice(0, 1500);
  return fc(top.map((x) => ({ type: "Feature", geometry: { type: "Point", coordinates: x.coords }, properties: { ...x.f, sev: x.mentions >= 40 ? 3 : x.mentions >= 15 ? 2 : x.mentions >= 6 ? 1 : 0, desc: `${x.f.desc ? x.f.desc + " · " : ""}${x.mentions} mentions in ${x.n} report${x.n > 1 ? "s" : ""} · machine-coded, verify the article` } satisfies Feat } as GeoJSON.Feature)));
}
