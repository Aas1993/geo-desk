import { readFile } from "node:fs/promises";
import path from "node:path";

// One country's "intelligence" indicators, read from the data files the builders write: leverage, bilateral temperature, governance, leadership clock, UAE humanitarian funding, UAE investment and deals.
const rd = async <T,>(f: string): Promise<T | null> => { try { return JSON.parse(await readFile(path.join(process.cwd(), "public/data", f), "utf8")) as T; } catch { return null; } };
type Person = { name: string; qid: string; start: string | null; birth: string | null };
export type Leader = Person & { role: "state" | "gov"; tenureYears: number | null; age: number | null };
export type Election = { label: string; date: string; approx: boolean; daysAway: number };
export type Deal = { u: string; d: string; t: string; c: string[]; by: string[]; sector: string | null };
export type IntelPayload = {
  iso3: string; name: string; asOf: string;
  leverage: { theirs: number | null; ours: number | null; quadrant: string; raw: Record<string, number | null>; threshold: number; year: number } | null;
  temperature: { n: number; g: number; coop: number; conflict: number; tone: number; weeks: { w: string; n: number; g: number }[]; trend: number | null; worldG: number | null; days: number; built: string } | null;
  governance: { year: number; dims: { key: string; score: number | null; rank: number | null; of: number | null; uae: number | null }[] } | null;
  leaders: { people: Leader[]; elections: Election[] } | null;
  aid: { years: number[]; byYear: Record<string, number>; latestFull: number | null; latestFullYear: number | null; uaeTotalLatestFull: number | null; shareOfUaeTotal: number | null; rankLatestFull: number | null; of: number | null; cumulative: number } | null;
  invest: { outwardUsd: number | null; outwardYear: number | null; outwardRank: number | null; inwardUsd: number | null; pctOfTheirGdp: number | null; shareOfUaeAbroad: number | null } | null;
  deals: { items: Deal[]; total: number; last90: number; last365: number; byInvestor: [string, number][]; bySector: [string, number][] };
  metrics: Record<string, number | string | null>;
  ids: { visits: string[]; deals: string[]; agreements: number };
  recentVisits: { u: string; d: string; t: string; k: string; l: number }[];
};
import { WGI_KEYS } from "./intel-labels";
const years = (from: string, to: Date) => { const f = Date.parse(from); return Number.isFinite(f) ? Math.round(((to.getTime() - f) / (365.25 * 86400e3)) * 10) / 10 : null; };

export async function intelFor(iso3: string): Promise<IntelPayload | null> {
  const [cs, lev, tmp, gov, ldr, aid, inv, outlook, deals, visits, ag, tone, sanc, rw, pi] = await Promise.all([
    rd<{ iso3: string; name: string }[]>("countries.json"), rd<{ year: number; threshold: number; countries: Record<string, NonNullable<IntelPayload["leverage"]>> }>("leverage.json"),
    rd<{ built: string; days: number; world: { g: number | null }; countries: Record<string, Omit<NonNullable<IntelPayload["temperature"]>, "worldG" | "days" | "built">> }>("temperature.json"),
    rd<{ year: number; n: Record<string, number>; countries: Record<string, Record<string, number>> }>("governance.json"), rd<{ countries: Record<string, { state?: Person; gov?: Person; elections?: { label: string; date: string; approx: boolean }[] }> }>("leaders.json"),
    rd<{ years: number[]; totals: Record<string, number>; countries: Record<string, Record<string, number>> }>("uae-aid.json"), rd<{ world: { usd: number }; countries: Record<string, { outward?: { usd: number; year: number; rank?: number }; inward?: { usd: number } }> }>("investment.json"),
    rd<{ countries: Record<string, { gdp?: Record<number, number>; growth?: Record<number, number>; debt?: Record<number, number> }> }>("outlook.json"), rd<{ items: Deal[] }>("deals.json"), rd<{ items: { u: string; d: string; t: string; k: string; c: string[]; l: number }[] }>("visits.json"),
    rd<{ countries: Record<string, { mofa: unknown[]; moft: unknown[]; cepa: { status: string } | null }> }>("agreements.json"), rd<{ countries: Record<string, { avg: number | null; trend?: number }> }>("media-tone.json"),
    rd<{ countries: Record<string, { ofac: number; un: number }> }>("sanctions.json"), rd<{ countries: Record<string, { n7: number; n30: number }> }>("ransomware.json"), rd<{ countries: Record<string, { score: number; rank: number }> }>("partnership.json"),
  ]);
  const c = cs?.find((x) => x.iso3 === iso3); if (!c || iso3 === "ARE") return null; const now = new Date(); const today = now.toISOString().slice(0, 10);
  const leverage = lev?.countries[iso3] ? { ...lev.countries[iso3], threshold: lev.threshold, year: lev.year } : null;
  const t = tmp?.countries[iso3]; const temperature = t ? { ...t, worldG: tmp!.world.g, days: tmp!.days, built: tmp!.built } : null;
  const g = gov?.countries[iso3]; const uaeG = gov?.countries.ARE;
  const governance = g ? { year: g.y ?? gov!.year, dims: WGI_KEYS.map((k) => ({ key: k, score: g[k] ?? null, rank: g[`${k}Rank`] ?? null, of: gov!.n[k] ?? null, uae: uaeG?.[k] ?? null })) } : null;
  const L = ldr?.countries[iso3]; const people: Leader[] = []; for (const role of ["state", "gov"] as const) { const p = L?.[role]; if (p) people.push({ ...p, role, tenureYears: p.start ? years(p.start, now) : null, age: p.birth ? Math.floor(years(p.birth, now) ?? 0) : null }); }
  const elections: Election[] = (L?.elections ?? []).map((e) => ({ ...e, daysAway: Math.round((Date.parse(e.date.replace(/-00$/, "-15")) - now.getTime()) / 86400e3) })).filter((e) => e.daysAway >= -1);
  const a = aid?.countries[iso3]; let aidOut: IntelPayload["aid"] = null;
  if (a && aid) { const ys = aid.years; const full = ys.length >= 2 ? ys[ys.length - 2] : ys[0]; const all = Object.entries(aid.countries).map(([k, v]) => [k, v[full] ?? 0] as const).sort((x, y) => y[1] - x[1]); const rank = all.findIndex(([k]) => k === iso3); aidOut = { years: ys, byYear: Object.fromEntries(Object.entries(a)), latestFull: a[full] ?? null, latestFullYear: full, uaeTotalLatestFull: aid.totals[full] ?? null, shareOfUaeTotal: a[full] && aid.totals[full] ? (a[full] / aid.totals[full]) * 100 : null, rankLatestFull: a[full] ? rank + 1 : null, of: all.filter(([, v]) => v > 0).length, cumulative: Object.values(a).reduce((s, v) => s + v, 0) }; }
  const iv = inv?.countries[iso3]; const gdp = outlook?.countries[iso3]?.gdp; const gdpNow = gdp?.[new Date().getFullYear() - 1] ?? gdp?.[new Date().getFullYear() - 2] ?? null;
  const invest = iv ? { outwardUsd: iv.outward?.usd ?? null, outwardYear: iv.outward?.year ?? null, outwardRank: iv.outward?.rank ?? null, inwardUsd: iv.inward?.usd ?? null, pctOfTheirGdp: iv.outward?.usd && gdpNow ? (iv.outward.usd / (gdpNow * 1e6)) * 100 : null, shareOfUaeAbroad: iv.outward?.usd && inv?.world.usd ? (iv.outward.usd / inv.world.usd) * 100 : null } : null;
  const dl = (deals?.items ?? []).filter((x) => x.c.includes(iso3)); const cut = (d: number) => new Date(now.getTime() - d * 86400e3).toISOString().slice(0, 10); const tally = (xs: string[]) => Object.entries(xs.reduce<Record<string, number>>((m, k) => ((m[k] = (m[k] ?? 0) + 1), m), {})).sort((p, q) => q[1] - p[1]).slice(0, 6) as [string, number][];
  const vs = (visits?.items ?? []).filter((x) => x.c.includes(iso3)); const senior = vs.filter((x) => x.l >= 2); const lastSenior = senior[0]?.d ?? null; const a0 = ag?.countries[iso3];
  const ec = elections.find((e) => e.daysAway >= 0);
  const metrics: IntelPayload["metrics"] = {
    partnershipScore: pi?.countries[iso3]?.score ?? null, partnershipRank: pi?.countries[iso3]?.rank ?? null, mediaTone: tone?.countries[iso3]?.avg ?? null, temperature: temperature?.g ?? null, temperatureTrend: temperature?.trend ?? null,
    daysSinceSenior: lastSenior ? Math.round((now.getTime() - Date.parse(lastSenior)) / 86400e3) : null, lastSenior, senior180: senior.filter((x) => x.d >= cut(180)).length, deals90: dl.filter((x) => x.d >= cut(90)).length, dealsTotal: dl.length,
    agreements: a0 ? a0.mofa.length + a0.moft.length : null, cepa: a0?.cepa?.status ?? null, ofac: sanc?.countries[iso3]?.ofac ?? null, un: sanc?.countries[iso3]?.un ?? null, ransomware30: rw?.countries[iso3]?.n30 ?? null,
    politicalStability: g?.pv ?? null, growth: outlook?.countries[iso3]?.growth?.[new Date().getFullYear()] ?? null, debt: outlook?.countries[iso3]?.debt?.[new Date().getFullYear()] ?? null, aidLatest: aidOut?.latestFull ?? null, daysToElection: ec ? ec.daysAway : null,
  };
  return { iso3, name: c.name, asOf: today, leverage, temperature, governance, leaders: L ? { people, elections } : null, aid: aidOut, invest,
    deals: { items: dl.slice(0, 12), total: dl.length, last90: dl.filter((x) => x.d >= cut(90)).length, last365: dl.filter((x) => x.d >= cut(365)).length, byInvestor: tally(dl.flatMap((x) => x.by.map((b) => b.replace(/^Abu Dhabi Fund for Development$/i, "ADFD")))), bySector: tally(dl.map((x) => x.sector ?? "other")) },
    metrics, recentVisits: vs.slice(0, 12).map((x) => ({ u: x.u, d: x.d, t: x.t, k: x.k, l: x.l })), ids: { visits: vs.slice(0, 40).map((x) => x.u), deals: dl.map((x) => x.u), agreements: a0 ? a0.mofa.length + a0.moft.length : 0 } };
}
