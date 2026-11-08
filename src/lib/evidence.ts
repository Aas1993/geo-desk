// The governance and society cross-checks: independent sources set beside the World Bank figures the Governance and Society views started from
// (public/data/governance-sources.json and society-sources.json, built by scripts/build-governance-sources.mjs and build-society-sources.mjs).
// Rules: a source with no figure for a country is simply absent (a gap stays a gap); governance sources use different scales, so they are compared as positions among the countries each one ranks (0 = last, 100 = first); society sources share units and are compared in them.
import type { Verdict } from "./crosscheck";

export type Item = { s: string; v: number; y: number; r?: number | null; n?: number };
export type EvSrc = { id: string; name: string; publisher: string; url: string; file?: string; year: number; kind: "primary" | "republisher"; family?: string; licence: string; basis: string; note?: string; upstream?: string; unit?: string; dim?: string; scale?: number; metrics?: string; rows: number };
export type EvGone = { name: string; url: string; reason: string; dim?: string; metrics?: string };
export type GovDim = "cc" | "va" | "rl";
export type GovData = { built: string; dims: Record<GovDim, { label: string }>; sources: Record<string, EvSrc>; unavailable: EvGone[]; countries: Record<string, Partial<Record<GovDim, Item[]>>> };
export type SocMetric = "le" | "lit" | "net" | "eys" | "hdi";
export type SocData = { built: string; metrics: Record<SocMetric, { label: string; unit: string }>; sources: Record<string, EvSrc>; unavailable: EvGone[]; countries: Record<string, Partial<Record<SocMetric, Item[]>>> };

const once = <T,>(url: string) => { let c: Promise<T> | null = null; return (): Promise<T> => (c ??= fetch(url).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<T>; }).catch((e) => { c = null; throw e; })); };
export const loadGovSources = once<GovData>("/data/governance-sources.json");
export const loadSocSources = once<SocData>("/data/society-sources.json");

/** Where an item stands among the countries its source ranks: 100 = first, 0 = last. The WGI score already is a percentile rank. */
export const position = (i: Item): number | null => (i.s === "wgi" ? i.v : i.r && i.n && i.n > 1 ? (100 * (i.n - i.r)) / (i.n - 1) : null);

export type Reading = { used: { s: string; y: number; v: number }[]; older: string[]; min: number | null; max: number | null; spread: number | null; verdict: Verdict };
/** Spread of the readings against two tolerances: within `agree` is "agree", within `close` is "close", beyond is "differ". One reading cannot be cross-checked. */
export function spreadVerdict(vals: { s: string; y: number; v: number }[], agree: number, close: number): Pick<Reading, "min" | "max" | "spread" | "verdict"> {
  if (!vals.length) return { min: null, max: null, spread: null, verdict: "none" };
  const v = vals.map((x) => x.v), min = Math.min(...v), max = Math.max(...v), spread = max - min;
  return { min, max, spread, verdict: vals.length < 2 ? "single" : spread <= agree ? "agree" : spread <= close ? "close" : "differ" };
}
/** Governance: compare positions (0-100) across sources. Within 15 points is agreement, within 30 close. */
export function govReading(items: Item[] | undefined): Reading {
  const used = (items ?? []).map((i) => ({ s: i.s, y: i.y, v: position(i) })).filter((x): x is { s: string; y: number; v: number } => x.v != null);
  return { used, older: [], ...spreadVerdict(used, 15, 30) };
}
/** Society: compare in the metric's own unit, using only readings within `window` years of the newest one (older ones are shown, not compared). */
export const SOC_TOL: Record<SocMetric, { agree: number; close: number; window: number }> = { le: { agree: 1, close: 3, window: 3 }, lit: { agree: 2, close: 6, window: 5 }, net: { agree: 5, close: 15, window: 3 }, eys: { agree: 0.7, close: 2, window: 3 }, hdi: { agree: 0.02, close: 0.06, window: 3 } };
export function socReading(metric: SocMetric, items: Item[] | undefined): Reading {
  const all = latestPer(items ?? []); if (!all.length) return { used: [], older: [], ...spreadVerdict([], 0, 0) };
  const top = Math.max(...all.map((i) => i.y)), t = SOC_TOL[metric]; const fresh = all.filter((i) => top - i.y <= t.window);
  return { used: fresh.map((i) => ({ s: i.s, y: i.y, v: i.v })), older: all.filter((i) => top - i.y > t.window).map((i) => i.s), ...spreadVerdict(fresh, t.agree, t.close) };
}
/** One reading per source: the latest. */
export const latestPer = (items: Item[]): Item[] => { const m = new Map<string, Item>(); for (const i of items) { const p = m.get(i.s); if (!p || i.y > p.y) m.set(i.s, i); } return [...m.values()]; };
/** The number of distinct publishers behind a set of sources (V-Dem's four indices count once). */
export const publishers = (ids: string[], src: Record<string, EvSrc>) => new Set(ids.map((id) => src[id]?.family ?? id)).size;
/** Dimensions where only the WGI is held, with the reason a reader should treat them as single-source. */
export const WGI_ONLY = ["pv", "ge", "rq"] as const;
