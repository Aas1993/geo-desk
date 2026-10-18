import { cached, km } from "@/lib/layers/cache";
import { hazards } from "@/lib/layers/sources/hazards";
import { epidemics } from "@/lib/layers/sources/epidemics";
import { events } from "@/lib/layers/sources/events";
import { FEEDS, parseRss } from "@/lib/rss";
import type { Feat } from "@/lib/layers/registry";
import { readFile } from "node:fs/promises";
import path from "node:path";

export type AlertCat = "unrest" | "security" | "disasters" | "health" | "diplomacy" | "cyber" | "news";
export type Alert = { id: string; cat: AlertCat; kind: "hazard" | "health" | "event" | "news" | "diplomacy" | "cyber"; t: number; title: string; sev: 0 | 1 | 2 | 3; src: string; url?: string; coords?: [number, number]; uae: boolean; security: boolean };
export type AlertsPayload = { items: Alert[]; fetchedAt: number; sources: Record<string, boolean> };

const ABU_DHABI: [number, number] = [54.37, 24.45];
const UAE_RE = /\b(uae|emirates|emirati|dubai|abu dhabi|sharjah|fujairah|ras al[- ]khaimah|hormuz|gulf of oman|persian gulf|arabian gulf|houthi|red sea|bab el[- ]mandeb|gcc)\b/i;
const SECURITY_RE = /\b(strike|airstrike|missile|drone|attack|killed|troops|ceasefire|sanction|war|military|explosion|hostage|coup|shelling|invasion|navy|warship|nuclear|terror|militant|clashes?)\b/i;
const SEVERE_RE = /\b(killed|dead|deaths|massacre|invasion|missile|airstrike|nuclear|coup|hostages?|explosion|war)\b/i;
const UAE_RADIUS_KM = 1500;

const f = (x: GeoJSON.Feature) => ({ p: x.properties as Feat, c: (x.geometry as GeoJSON.Point).coordinates as [number, number] });

/** One merged, de-duplicated feed built from the same cached sources the map layers use. A failing source never blanks the rest. */
export async function buildAlerts(): Promise<AlertsPayload> {
  const sources: Record<string, boolean> = {};
  const settle = async <T,>(name: string, p: Promise<T>): Promise<T | null> => { try { const v = await p; sources[name] = true; return v; } catch { sources[name] = false; return null; } };
  const [hz, who, ev, heads] = await Promise.all([
    settle("hazards", cached("layer:hazards:", 600_000, () => hazards()).then((r) => r.value)),
    settle("health", cached("layer:epidemics:", 3_600_000, () => epidemics()).then((r) => r.value)),
    settle("events", cached("layer:events:", 600_000, () => events()).then((r) => r.value)),
    settle("news", cached("alerts:news", 300_000, async () => {
      const r = await Promise.all(FEEDS.map(async ([name, url]) => { try { const x = await fetch(url, { headers: { "User-Agent": "geo-desk/0.1" }, signal: AbortSignal.timeout(12_000), cache: "no-store" }); return x.ok ? parseRss(await x.text(), name, 12) : []; } catch { return []; } }));
      const flat = r.flat(); if (!flat.length) throw new Error("no news feed answered"); // every feed failed: report the source as down instead of an empty all-clear
      return flat;
    }).then((r) => r.value)),
  ]);
  const items: Alert[] = [];
  for (const x of hz?.features ?? []) { const { p, c } = f(x); const near = km(c, ABU_DHABI) <= UAE_RADIUS_KM; if ((p.sev ?? 0) < 2 && !near) continue; items.push({ id: p.id, cat: "disasters", kind: "hazard", t: p.t ?? 0, title: p.title, sev: Math.min(3, p.sev ?? 1) as Alert["sev"], src: p.src ?? "Hazards", url: p.url, coords: c, uae: near, security: false }); }
  for (const x of who?.features ?? []) { const { p, c } = f(x); items.push({ id: p.id, cat: "health", kind: "health", t: p.t ?? 0, title: `${p.title} · ${(p.desc ?? "").split(" · ")[0]}`, sev: Math.min(3, p.sev ?? 1) as Alert["sev"], src: "WHO", url: p.url, coords: c, uae: false, security: false }); }
  for (const x of ev?.features ?? []) { const { p, c } = f(x); const near = km(c, ABU_DHABI) <= UAE_RADIUS_KM;
    // GDELT is machine-coded and noisy: only widely reported clusters raise an alert, with a lower bar near the UAE
    if ((p.type !== "conflict" && p.type !== "coercion" && p.type !== "protest") || (p.sev ?? 0) < (near ? 2 : 3)) continue;
    items.push({ id: p.id, cat: p.type === "protest" ? "unrest" : "security", kind: "event", t: p.t ?? 0, title: p.title, sev: Math.min(3, p.sev ?? 1) as Alert["sev"], src: "GDELT", url: p.url, coords: c, uae: near, security: p.type !== "protest" }); }
  for (const h of heads ?? []) {
    const uae = UAE_RE.test(h.title), security = SECURITY_RE.test(h.title); if (!uae && !security) continue;
    items.push({ id: `news:${h.link}`, cat: security ? "security" : "news", kind: "news", t: h.ts, title: h.title, sev: Math.min(3, (SEVERE_RE.test(h.title) ? 2 : 1) + (uae ? 1 : 0)) as Alert["sev"], src: h.outlet, url: h.link, uae, security });
  }
  // official engagements reported by WAM in the last 3 days, and an aggregate ransomware signal for the UAE (counts only: victim names are never shown)
  const rd = async <T,>(f: string): Promise<T | null> => { try { return JSON.parse(await readFile(path.join(process.cwd(), "public/data", f), "utf8")) as T; } catch { return null; } };
  const [vs, rw] = await Promise.all([rd<{ items: { u: string; d: string; t: string; l: number }[] }>("visits.json"), rd<{ built: string; countries: Record<string, { n7: number; n30: number; last: string }> }>("ransomware.json")]);
  const since = new Date(Date.now() - 3 * 86400e3).toISOString().slice(0, 10); sources.diplomacy = !!vs; sources.cyber = !!rw;
  for (const x of (vs?.items ?? []).filter((v) => v.d >= since && v.l >= 2).slice(0, 15)) items.push({ id: `wam:${x.u}`, cat: "diplomacy", kind: "diplomacy", t: Date.parse(x.d + "T12:00:00Z"), title: x.t, sev: x.l === 3 ? 2 : 1, src: "WAM", url: `https://www.wam.ae/en/article/${x.u}`, uae: true, security: false });
  const u = rw?.countries.ARE; if (u && u.n7 > 0) items.push({ id: `cyber:ARE:${rw!.built.slice(0, 10)}`, cat: "cyber", kind: "cyber", t: Date.parse((u.last || rw!.built.slice(0, 10)) + "T12:00:00Z"), title: `${u.n7} ransomware leak-site posting${u.n7 > 1 ? "s" : ""} naming UAE organisations in the last 7 days (${u.n30} in 30 days)`, sev: u.n7 >= 5 ? 2 : 1, src: "ransomware.live", url: "https://www.ransomware.live/map/ae", uae: true, security: true });
  const seen = new Set<string>();
  const out = items.filter((a) => a.t > 0 && !seen.has(a.id) && seen.add(a.id)).map((a) => (a.url && !/^https?:\/\//i.test(a.url) ? { ...a, url: undefined } : a)).sort((a, b) => b.t - a.t).slice(0, 200);
  return { items: out, fetchedAt: Date.now(), sources };
}
