// Military spending read from every open source we could reach (public/data/military-sources.json, built by scripts/build-military-sources.mjs), set beside the World Bank series the Military tab already shows.
// Rules: US$ millions and % of GDP; a source with no figure is simply absent; the World Bank republishes SIPRI and the IMF takes EU members' figures from Eurostat, so those rows are listed but never counted twice in the middle figure.
import { reconcile, type Reading } from "./crosscheck";
export type MSrc = { id: string; name: string; publisher: string; basis: string; kind: "primary" | "republisher"; url: string; note?: string; status: "ok" | "failed"; rows: number; file?: string };
export type MItem = { s: string; y: number; usd?: number; gdp?: number; share?: number; f?: "e" | "u" };
export type MilSources = { built: string; year: number; sources: Record<string, MSrc>; unavailable: { name: string; url: string; reason: string }[]; gaps: Record<string, { sipri?: string; note?: string; last?: { y: number; usd: number; gdp?: number } }>; countries: Record<string, MItem[]> };
let cache: Promise<MilSources> | null = null;
export const loadMilSources = (): Promise<MilSources> => (cache ??= fetch("/data/military-sources.json").then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<MilSources>; }).catch((e) => { cache = null; throw e; }));

/** The World Bank's own series, which the Military tab already holds live; it republishes SIPRI (an earlier vintage), so it is shown but not counted as a second source. */
export const WB_SRC: MSrc = { id: "wb_mil", name: "World Bank WDI: military expenditure (MS.MIL.XPND)", publisher: "World Bank", basis: "SIPRI figures republished by the World Bank", kind: "republisher", url: "https://data.worldbank.org/indicator/MS.MIL.XPND.CD", status: "ok", rows: 0, note: "The World Bank takes this series from SIPRI and publishes it later, so it is the same data, not a second opinion." };
export const wbItems = (usdSeries?: { y: number; v: number }[], gdpSeries?: { y: number; v: number }[], from = 2020): MItem[] => {
  const by = new Map<number, MItem>(); for (const p of usdSeries ?? []) if (p.y >= from && Number.isFinite(p.v)) by.set(p.y, { s: WB_SRC.id, y: p.y, usd: Math.round(p.v / 1e5) / 10 });
  for (const p of gdpSeries ?? []) if (p.y >= from && Number.isFinite(p.v)) by.set(p.y, { ...(by.get(p.y) ?? { s: WB_SRC.id, y: p.y }), gdp: Math.round(p.v * 100) / 100 });
  return [...by.values()].sort((a, b) => a.y - b.y);
};

/** The IMF's government-finance data for EU members comes from Eurostat, so the two often carry the same figure; when they do for the same year the Eurostat row is the same data twice. */
export const sameChain = (a: MItem, b: MItem): boolean => a.y === b.y && ((a.s === "imf_gfs" && b.s === "eurostat_cofog") || (a.s === "eurostat_cofog" && b.s === "imf_gfs"))
  && (a.gdp == null || b.gdp == null || Math.abs(a.gdp - b.gdp) <= 0.06) && (a.usd == null || b.usd == null || Math.abs(a.usd / b.usd - 1) <= 0.002) && (a.gdp != null && b.gdp != null || a.usd != null && b.usd != null);

export type Why = "republisher" | "same" | "other-year";
export type MRow = { item: MItem; src: MSrc; counted: boolean; why?: Why };
export type MReading = { year: number | null; reading: Reading; rows: MRow[] };
/** Compare one measure. The year is the one in which the most independent publishers report; ties go to the latest. Each source appears once: its row for that year, or else its latest (marked as another year). */
export function compareMeasure(items: MItem[], sources: Record<string, MSrc>, measure: "usd" | "gdp"): MReading {
  const src = (s: string) => (s === WB_SRC.id ? WB_SRC : sources[s]); const have = items.filter((i) => src(i.s) && i[measure] != null);
  const dup = (i: MItem) => i.s === "eurostat_cofog" && have.some((o) => o.s === "imf_gfs" && sameChain(o, i));
  const independent = (i: MItem) => src(i.s).kind === "primary" && !dup(i);
  const count = new Map<number, number>(); for (const i of have) if (independent(i)) count.set(i.y, (count.get(i.y) ?? 0) + 1);
  let year: number | null = null; for (const [y, n] of count) if (year == null || n > count.get(year)! || (n === count.get(year) && y > year)) year = y;
  const one = new Map<string, MItem>(); for (const i of have) { const p = one.get(i.s); if (!p || (i.y === year && p.y !== year) || (p.y !== year && i.y > p.y)) one.set(i.s, i); }
  const rows: MRow[] = [...one.values()].map((item) => { const counted = item.y === year && independent(item); const why: Why | undefined = counted ? undefined : src(item.s).kind === "republisher" ? "republisher" : item.y !== year ? "other-year" : "same"; return { item, src: src(item.s), counted, why }; });
  rows.sort((a, b) => Number(b.counted) - Number(a.counted) || a.src.name.localeCompare(b.src.name));
  return { year, reading: reconcile(rows.filter((r) => r.counted).map((r) => ({ s: r.src.id, y: r.item.y, v: r.item[measure] }))), rows };
}
export const independentPublishers = (m: MilSources): string[] => [...new Set(Object.values(m.sources).filter((s) => s.status === "ok" && s.rows > 0 && s.kind === "primary").map((s) => s.publisher))];
