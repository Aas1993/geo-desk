// Pure functions and types behind the trade, outlook and partnership views. No React or browser APIs, so server routes can use them too.
export type TradeRec = { a: [number, number, number][]; ttm?: { x: number; m: number }; prev?: { x: number; m: number } };
export type TradeData = { built: string; source: { name: string; url: string; note: string }; lastYear: number; asOfQuarter: string | null; world: TradeRec; countries: Record<string, TradeRec> };
export type Ind = Record<number, number>;
export type OutlookRec = { growth?: Ind; inflation?: Ind; ca?: Ind; debt?: Ind; unemployment?: Ind; gdp?: Ind };
export type OutlookData = { built: string; vintage: string; source: { name: string; url: string; note: string }; countries: Record<string, OutlookRec> };
export type PartnerRec = { score: number; rank: number; c: Record<"trade" | "engagement" | "agreements" | "connectivity" | "investment" | "alignment", number>; raw: { trade: number; engagement: number; agreements: number; flights: number; embassy: number; investment: number; alignment: number | null } };
export type PartnershipData = { built: string; weights: Record<string, number>; n: number; alignmentRange: [number, number]; note: string; inputs: { tradeYear: number; engagementSince: string; flightsBuilt: string; visitsBuilt: string }; countries: Record<string, PartnerRec> };

/** Formats US$ millions as $12bn / $850m. */
export const usdM = (m: number) => { const a = Math.abs(m); const s = a >= 1000 ? `${(a / 1000).toFixed(a >= 10_000 ? 0 : 1)}bn` : `${Math.round(a)}m`; return `${m < 0 ? "−" : ""}$${s}`; };
export const pct = (v: number, d = 0) => `${v > 0 ? "+" : ""}${v.toFixed(d)}%`;
const tot = (r: TradeRec | undefined, y: number) => { const row = r?.a.find((x) => x[0] === y); return row ? row[1] + row[2] : null; };

export type TradeSummary = { year: number; x: number; m: number; total: number; balance: number; share: number; rank: number; of: number; yoy: number | null; ttm: { total: number; growth: number } | null; series: { y: number; x: number; m: number }[] };
export function tradeSummary(t: TradeData, iso3: string): TradeSummary | null {
  const r = t.countries[iso3]; const row = r?.a.at(-1); if (!r || !row) return null; const y = row[0]; const worldTotal = tot(t.world, y) ?? 0; const prev = tot(r, y - 1);
  const totals = Object.entries(t.countries).map(([k, v]) => [k, tot(v, y) ?? 0] as const).sort((a, b) => b[1] - a[1]); const rank = totals.findIndex(([k]) => k === iso3) + 1;
  const ttm = r.ttm && r.prev ? { total: r.ttm.x + r.ttm.m, growth: ((r.ttm.x + r.ttm.m) / (r.prev.x + r.prev.m) - 1) * 100 } : null;
  return { year: y, x: row[1], m: row[2], total: row[1] + row[2], balance: row[1] - row[2], share: worldTotal ? ((row[1] + row[2]) / worldTotal) * 100 : 0, rank, of: totals.filter(([, v]) => v > 0).length, yoy: prev ? ((row[1] + row[2]) / prev - 1) * 100 : null, ttm, series: r.a.map(([yy, x, m]) => ({ y: yy, x, m })) };
}
export type CepaEffect = { inForceYear: number; baseYears: number[]; base: number; latest: number; latestYear: number; partnerGrowth: number; worldGrowth: number; effect: number };
/** Trade with a CEPA partner: the last full year against the average of the (up to) two full years before the year the CEPA entered into force, set against the UAE's total trade over the same span. Correlation, not proof of cause. */
export function cepaEffect(t: TradeData, iso3: string, inForce: string | null): CepaEffect | null {
  if (!inForce) return null; const Y = +inForce.slice(0, 4); const r = t.countries[iso3]; if (!r || Y > t.lastYear - 1) return null;
  const years = [Y - 2, Y - 1].filter((y) => tot(r, y) != null && tot(t.world, y) != null); if (!years.length) return null; const avg = (rec: TradeRec) => years.reduce((s, y) => s + (tot(rec, y) ?? 0), 0) / years.length;
  const base = avg(r), wBase = avg(t.world), latest = tot(r, t.lastYear), wLatest = tot(t.world, t.lastYear); if (!base || !latest || !wBase || !wLatest) return null;
  const pg = (latest / base - 1) * 100, wg = (wLatest / wBase - 1) * 100; return { inForceYear: Y, baseYears: years, base, latest, latestYear: t.lastYear, partnerGrowth: pg, worldGrowth: wg, effect: pg - wg };
}
export const IND_LABEL: Record<string, { en: string; ar: string; unit: string; higherBetter?: boolean }> = {
  growth: { en: "Real GDP growth", ar: "نمو الناتج الحقيقي", unit: "%", higherBetter: true }, inflation: { en: "Inflation", ar: "التضخم", unit: "%", higherBetter: false }, ca: { en: "Current account", ar: "الحساب الجاري", unit: "% GDP", higherBetter: true },
  debt: { en: "Government debt", ar: "الدين الحكومي", unit: "% GDP", higherBetter: false }, unemployment: { en: "Unemployment", ar: "البطالة", unit: "%", higherBetter: false },
};
/** Rank of a country on one indicator in one year among all countries with data (1 = highest value). */
export function outlookRank(o: OutlookData, iso3: string, key: keyof OutlookRec, year: number) {
  const vals = Object.entries(o.countries).map(([k, v]) => [k, v[key]?.[year]] as const).filter((x): x is readonly [string, number] => typeof x[1] === "number").sort((a, b) => b[1] - a[1]); const i = vals.findIndex(([k]) => k === iso3); return i < 0 ? null : { rank: i + 1, of: vals.length };
}
/** The demand the UAE's export customers are expected to generate: partner GDP growth weighted by each partner's share of UAE goods exports. */
export function exportDemand(t: TradeData, o: OutlookData, years: number[]) {
  const rows = Object.entries(t.countries).map(([k, v]) => ({ iso3: k, x: v.a.at(-1)?.[1] ?? 0 })).filter((r) => r.x > 0); const out: Record<number, number | null> = {};
  for (const y of years) { let w = 0, s = 0; for (const r of rows) { const g = o.countries[r.iso3]?.growth?.[y]; if (typeof g === "number") { w += r.x; s += r.x * g; } } out[y] = w ? s / w : null; }
  const top = rows.sort((a, b) => b.x - a.x).slice(0, 10).map((r) => ({ ...r, g: Object.fromEntries(years.map((y) => [y, o.countries[r.iso3]?.growth?.[y] ?? null])) }));
  const total = rows.reduce((s, r) => s + r.x, 0); return { weighted: out, top, coverage: total ? rows.filter((r) => typeof o.countries[r.iso3]?.growth?.[years[0]] === "number").reduce((s, r) => s + r.x, 0) / total : 0 };
}
