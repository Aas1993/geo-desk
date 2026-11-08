// The cross-check of the UAE's goods trade and direct-investment position against every independent public source we could read (public/data/crosscheck.json, built by scripts/build-crosscheck.mjs).
// Rules: values are US$ millions; a source with no figure for a country is simply absent; a zero from a source that normally reports is kept visible but is not allowed to drag the middle figure down.
export type Src = { id: string; name: string; publisher: string; basis: string; kind: "primary" | "republisher"; url: string; note?: string; status: "ok" | "failed"; rows: number; measure: "trade" | "invest" };
export type TItem = { s: string; y: number; x?: number; m?: number };
export type IItem = { s: string; y: number; out?: number; in?: number; kind?: "stock" | "flow" };
export type Crosscheck = {
  built: string; year: number; sources: Record<string, Src>; unavailable: { name: string; url: string; measure: string; reason: string }[];
  trade: { world: TItem[]; countries: Record<string, TItem[]>; bloc?: { eu27?: TItem & { eur?: { x: number; m: number }; rate?: number } } };
  invest: { world: IItem[]; countries: Record<string, IItem[]>; bloc?: Record<string, IItem> };
};
let cache: Promise<Crosscheck> | null = null;
export const loadCrosscheck = (): Promise<Crosscheck> => (cache ??= fetch("/data/crosscheck.json").then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<Crosscheck>; }).catch((e) => { cache = null; throw e; }));

export type Verdict = "none" | "single" | "agree" | "close" | "differ";
export type Reading = { used: { s: string; y: number; v: number }[]; zero: { s: string; y: number }[]; median: number | null; min: number | null; max: number | null; ratio: number | null; verdict: Verdict };
/** Agreement across sources. "agree": the highest is within 15% of the lowest; "close": within 60%; "differ": further apart. One source cannot be cross-checked. */
export function reconcile(values: { s: string; y: number; v: number | null | undefined }[]): Reading {
  const have = values.filter((a): a is { s: string; y: number; v: number } => a.v != null && Number.isFinite(a.v) && a.v >= 0);
  const used = have.filter((a) => a.v > 0), zero = have.filter((a) => a.v === 0 && used.length > 0).map(({ s, y }) => ({ s, y }));
  if (!used.length) return { used: [], zero: [], median: null, min: null, max: null, ratio: null, verdict: have.length ? "single" : "none" };
  const v = used.map((a) => a.v).sort((a, b) => a - b), mid = Math.floor(v.length / 2), median = v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
  const ratio = v[v.length - 1] / v[0];
  return { used, zero, median, min: v[0], max: v[v.length - 1], ratio, verdict: used.length < 2 ? "single" : ratio <= 1.15 ? "agree" : ratio <= 1.6 ? "close" : "differ" };
}
/** The items for one country, latest year per source only, so a source never counts twice. */
export const latestPer = <T extends { s: string; y: number }>(items: T[] | undefined): T[] => { const by = new Map<string, T>(); for (const i of items ?? []) { const p = by.get(i.s); if (!p || i.y > p.y) by.set(i.s, i); } return [...by.values()]; };
/** Readings no more than two years older than the year being compared; an older one is still listed but does not enter the middle figure. */
export const fresh = <T extends { y: number }>(items: T[], year: number): T[] => items.filter((i) => i.y >= year - 2);
export const distinctPublishers = (c: Crosscheck): string[] => [...new Set(Object.values(c.sources).filter((s) => s.status === "ok" && s.rows > 0).map((s) => s.publisher))];
