import { readFile } from "node:fs/promises";
import path from "node:path";
import { cached } from "@/lib/layers/cache";
import { loadSnapshot } from "@/lib/deep/snapshot";
import type { Snapshot } from "@/lib/deep/snapshot";
import { getProfiles } from "../machiavelli/profile";
import { TREND_METRICS, type Met } from "./catalog";
import { ageYears, divergence, instruments, lenses, median, pillars, positionMeasured, posture, summarise, tenureYears, type B, type Divergence, type InstrRow, type Inputs, type Lens, type Measured, type Pillar, type PostureResult, type Pt, type Spine } from "./core";

// Server loader for the Case File: reads the held datasets once, builds the Inputs for one country and runs the pure statecraft layer. No model call.
type Dict = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const rd = async <T,>(f: string): Promise<T | null> => { try { return JSON.parse(await readFile(path.join(process.cwd(), "public/data", f), "utf8")) as T; } catch { return null; } };
const files = () => cached("case:files", 600_000, async () => {
  const [outlook, fin, trade, invest, trends, countries, score, part, lev, rivals, temp, leaders, capture] = await Promise.all([rd<Dict>("outlook.json"), rd<Dict>("finconditions.json"), rd<Dict>("trade.json"), rd<Dict>("investment.json"), rd<Dict>("trends.json"), rd<Dict[]>("countries.json"), rd<Dict>("scorecard.json"), rd<Dict>("partnership.json"), rd<Dict>("leverage.json"), rd<Dict>("rivals.json"), rd<Dict>("temperature.json"), rd<Dict>("leaders.json"), rd<Dict>("vintages/capture.json")]);
  const set = await getProfiles();
  return { outlook, fin, trade, invest, trends, countries: countries ?? [], score, part, lev, rivals, temp, leaders, capture, set };
}).then((r) => r.value);

export type SpineRow = { met: Met; has: boolean; series: Pt[]; proj: Pt[] | null; spine: Spine; region: number | null; uae: number | null; extra?: string };
export type NeighbourRow = { iso: string; name: string; nameAr: string | null; part: number | null; rank: number | null; tier: string | null; lev: string | null; score: number | null };
export type CaseData = {
  asOf: string; iso3: string; name: string; nameAr: string | null; flag: string; region: string; subregion: string | null;
  lenses: Lens[]; divergence: Divergence; pillars: Pillar[]; posture: PostureResult; instruments: InstrRow[]; measured: Measured[];
  un: Inputs["un"]; unOthers: { iso: string; v: number | null }[]; power: { id: string; en: string; v: number; ev: string }[]; axes: { id: string; en: string; v: number; ev: string }[];
  leaders: { head?: { name: string; start?: string; tenure: number | null; age: number | null }; gov?: { name: string; start?: string; tenure: number | null } } | null;
  neighbours: { ring1: NeighbourRow[]; ring2: NeighbourRow[] }; rivals: { iso: string; share: number }[]; uaeRank: { rank: number; of: number; share: number } | null; leverage: { theirs: number | null; ours: number | null; quadrant: string | null } | null;
  scorecard: { overall: number; tier: string; dims: { id: string; group: string; score: number | null }[] } | null; partnership: { score: number; rank: number; n: number; c: Record<string, number>; raw: Record<string, number> } | null;
  tone: Inputs["tone"]; spine: SpineRow[]; capture: { months: string[]; series: Record<string, number[]> } | null;
  deep: { exposure: Snapshot["exposure"]; readings: Snapshot["readings"]; screen: NonNullable<Snapshot["trade"]>["partnerScreen"] | null; screenN: number; vintage: Snapshot["vintage"]; builds: Snapshot["builds"]; gaps: string[]; forecasts: Snapshot["forecasts"]["other"]; invest: Snapshot["invest"] } | null;
  coverage: { trendHeld: number; trendTotal: number; withData: number };
};
const THEATRE = ["SAU", "QAT", "JOR", "TUR", "IRN", "IRQ", "OMN", "KWT", "BHR", "ETH", "ERI", "DJI", "SDN", "SSD", "LBY", "EGY", "SYR", "LBN", "YEM", "SOM", "ISR", "PSE"];
const DIM_GROUP = (f: Dict, k: string) => f.score?.groups?.[k] ?? "";

// how each catalogue metric is read from the held files
const IMF: Record<string, string> = { "Real GDP growth": "growth", "Inflation, consumer prices": "inflation", "Government gross debt, % of GDP": "debt", "Current account, % of GDP": "ca", "Nominal GDP, US$": "gdp", "Unemployment rate": "unemployment" };
const FIN: Record<string, string> = { "Private credit, % of GDP": "credit", "Non-performing loans": "npl", "Bank capital to assets": "capital", "Exchange rate per US$": "fx", "Reserves, months of imports": "resMonths", "Total reserves, US$": "res", "Broad money, % of GDP": "money" };
const TR: Record<string, string> = { "GDP per capita": "gdppc", "Population": "pop", "Trade openness, % of GDP": "open", "FDI net inflows, US$": "fdi", "Remittances received, US$": "remit", "Rule of law": "rl", "Regulatory quality": "rq", "Government effectiveness": "ge", "Control of corruption": "cc", "Political stability": "pv", "Voice and accountability": "va", "UN ideal-point distance to the UAE, by year": "unDist", "Military spending, % of GDP": "mil", "Urban population share": "urban", "Internet users, % of population": "net", "Health spending, % of GDP": "health", "Inequality (Gini)": "gini", "Oil and gas rents, % of GDP": "rent", "Water withdrawal, % of resources": "water", "Food imports, % of merchandise": "foodimp", "Food production index": "foodprod", "Renewable electricity share": "renew", "CO2 per capita": "co2" };

export const loadCase = (iso3: string) => cached<CaseData | null>(`case:${iso3}`, 300_000, () => buildCase(iso3, new Date())).then((r) => r.value);
export async function buildCase(iso3: string, now: Date): Promise<CaseData | null> {
  const f = await files(); const c = f.countries.find((x) => x.iso3 === iso3); if (!c) return null; const y0 = now.getUTCFullYear(); const nowMs = now.getTime();
  const prof = f.set?.profiles.find((p) => p.iso3 === iso3) ?? null; const sc = f.score?.countries?.[iso3] ?? null; const pt = f.part?.countries?.[iso3] ?? null; const lv = f.lev?.countries?.[iso3] ?? null; const rv = f.rivals?.countries?.[iso3] ?? null; const tp = f.temp?.countries?.[iso3] ?? null; const ld = f.leaders?.countries?.[iso3] ?? null;
  const un = await rd<Dict>(`un/agree/${iso3}.json`); const outlook = (f.outlook?.countries ?? {}) as Dict; const g = outlook[iso3]?.growth as Record<string, number> | undefined; const gv = [y0, y0 + 1, y0 + 2].map((y) => g?.[y]).filter((x): x is number => typeof x === "number");
  const deep = await loadSnapshot(iso3).catch(() => null); const ex = deep?.exposure?.priority ?? null; const ps = deep?.trade?.partnerScreen ?? null;
  const dist = { part: Object.values(f.part?.countries ?? {}).map((x: any) => x.score as number), score: Object.values(f.score?.countries ?? {}).map((x: any) => x.overall as number), composite: (f.set?.profiles ?? []).map((p) => p.composite) }; // eslint-disable-line @typescript-eslint/no-explicit-any
  const deals = (await rd<Dict>("deals.json"))?.items as { d: string; c?: string[] }[] | undefined; const cut = new Date(nowMs - 365 * 86_400_000).toISOString().slice(0, 10); const deals365 = (deals ?? []).filter((d) => d.d >= cut && (d.c ?? []).includes(iso3)).length;
  const inp: Inputs = { iso3, name: c.name, nameAr: c.nameAr ?? null, region: c.region, subregion: f.set?.profiles.find((p) => p.iso3 === iso3)?.subregion ?? null, score: sc ? { overall: sc.overall, tier: sc.tier, dims: sc.dims } : null,
    part: pt ? { score: pt.score, rank: pt.rank, n: f.part?.n ?? 0, c: pt.c, raw: pt.raw } : null, lev: lv ? { theirs: lv.theirs ?? null, ours: lv.ours ?? null, quadrant: lv.quadrant ?? null } : null, profile: prof,
    rivals: rv ? { uae: rv.uae ?? null, of: rv.of ?? 14, list: rv.list ?? [] } : null, tone: tp ? { n: tp.n, g: tp.g, coop: tp.coop, tone: tp.tone ?? null, trend: tp.trend ?? null } : null,
    un: { uae: un?.ARE ?? null, usa: un?.USA ?? null, chn: un?.CHN ?? null, rus: un?.RUS ?? null }, leaders: ld, dist,
    exposure: ex ? { score: ex.score, band: ex.band, confidence: ex.confidence, known: ex.known, unknown: ex.unknown } : null, screen: ps ? { rank: ps.rank, of: deep!.trade!.screenN, stable: ps.stable, ranks: ps.ranks } : null,
    growthOutlook: gv.length ? gv.reduce((a, b) => a + b, 0) / gv.length : null, deals365, aid5Usd: prof?.facts.aid5Usd ?? null, now: nowMs };
  const ls = lenses(inp); const pl = pillars(inp); const post = posture(inp, pl);
  // neighbours
  const row = (i: string): NeighbourRow => { const cc = f.countries.find((x) => x.iso3 === i); return { iso: i, name: cc?.name ?? i, nameAr: cc?.nameAr ?? null, part: f.part?.countries?.[i]?.score ?? null, rank: f.part?.countries?.[i]?.rank ?? null, tier: f.set?.profiles.find((p) => p.iso3 === i)?.tier ?? null, lev: f.lev?.countries?.[i]?.quadrant ?? null, score: f.score?.countries?.[i]?.overall ?? null }; };
  const ring1 = ((c.borders ?? []) as string[]).filter((i) => i !== "ARE").map(row); const taken = new Set([iso3, "ARE", ...ring1.map((r) => r.iso)]);
  const inTheatre = THEATRE.includes(iso3) || ring1.some((r) => THEATRE.includes(r.iso)); const ring2 = (inTheatre ? THEATRE.filter((i) => !taken.has(i)) : f.countries.filter((x) => x.region === c.region && !taken.has(x.iso3)).map((x) => x.iso3)).map(row).filter((r) => r.part != null).sort((a, b) => (b.part ?? 0) - (a.part ?? 0)).slice(0, 10);
  // trend spine
  const mates = f.countries.filter((x) => x.region === c.region).map((x) => x.iso3); const latestOf = (get: (i: string) => Pt[] | undefined, year: number) => { const v = mates.map((i) => summarise(get(i), year).latest?.v).filter((x): x is number => typeof x === "number"); return v.length >= 3 ? median(v) : null; };
  const impSeries = (i: string, k: string): { obs: Pt[]; proj: Pt[] } => { const s = outlook[i]?.[k] as Record<string, number> | undefined; const o: Pt[] = []; const p: Pt[] = []; for (const [y, v] of Object.entries(s ?? {})) { const yy = +y; (yy < y0 ? o : p).push([yy, v]); } const last = o[o.length - 1]; return { obs: o.sort((a, b) => a[0] - b[0]), proj: last ? [last, ...p.sort((a, b) => a[0] - b[0])] : p }; };
  const finS = (i: string, k: string) => (f.fin?.countries?.[i]?.[k]?.s as Pt[] | undefined); const trS = (i: string, k: string) => (f.trends?.countries?.[i]?.[k] as Pt[] | undefined);
  const tradeRow = f.trade?.countries?.[iso3] as { a: [number, number, number][] } | undefined; const world = f.trade?.world?.a as [number, number, number][] | undefined;
  const invS = (dir: "outward" | "inward") => (f.invest?.countries?.[iso3]?.[dir]?.series as Pt[] | undefined);
  const spineOf = (m: Met): SpineRow => {
    let obs: Pt[] = []; let proj: Pt[] | null = null; let reg: number | null = null; let uae: number | null = null; let extra: string | undefined;
    if (IMF[m.name]) { const k = IMF[m.name]; const s = impSeries(iso3, k); obs = s.obs; proj = s.proj.length > 1 ? s.proj : null; reg = latestOf((i) => impSeries(i, k).obs, y0); uae = summarise(impSeries("ARE", k).obs, y0).latest?.v ?? null; }
    else if (FIN[m.name]) { const k = FIN[m.name]; obs = finS(iso3, k) ?? []; reg = latestOf((i) => finS(i, k), y0); uae = summarise(finS("ARE", k), y0).latest?.v ?? null; }
    else if (TR[m.name]) { const k = TR[m.name]; obs = trS(iso3, k) ?? []; reg = latestOf((i) => trS(i, k), y0); uae = summarise(trS("ARE", k), y0).latest?.v ?? null; }
    else if (m.name === "UAE goods exports to the partner") obs = (tradeRow?.a ?? []).filter((r) => r[0] >= 2015).map((r) => [r[0], r[1]]);
    else if (m.name === "UAE goods imports from the partner") obs = (tradeRow?.a ?? []).filter((r) => r[0] >= 2015).map((r) => [r[0], r[2]]);
    else if (m.name === "Total and balance") { obs = (tradeRow?.a ?? []).filter((r) => r[0] >= 2015).map((r) => [r[0], r[1] + r[2]]); extra = "total; balance = exports minus imports"; }
    else if (m.name.startsWith("Partner share of UAE exports")) obs = (tradeRow?.a ?? []).filter((r) => r[0] >= 2015).map((r) => { const w = world?.find((x) => x[0] === r[0]); return [r[0], w && w[1] > 0 ? Math.round((r[1] / w[1]) * 10000) / 100 : 0] as Pt; }).filter((p) => p[1] > 0 || true);
    else if (m.name.startsWith("Partner's contribution")) obs = (tradeRow?.a ?? []).filter((r) => r[0] >= 2015).map((r) => { const w = world?.find((x) => x[0] === r[0]); const sh = w && w[1] > 0 ? (r[1] / w[1]) * 100 : 0; return [r[0], Math.round(sh * sh * 10) / 100] as Pt; });
    else if (m.name === "UAE outward position in the partner") obs = invS("outward") ?? [];
    else if (m.name === "Partner's inward position in the UAE") obs = invS("inward") ?? [];
    return { met: m, has: obs.length > 0, series: obs, proj, spine: summarise(obs, y0), region: reg, uae, extra };
  };
  const spine = TREND_METRICS.map(spineOf);
  const cm = (f.capture?.months ?? {}) as Record<string, Dict>; const mk = Object.keys(cm).sort(); const cap = mk.length ? { months: mk, series: Object.fromEntries(["ofac", "un", "dest", "deals12", "visits12", "ransom90"].map((k) => [k, mk.map((m) => cm[m]?.[iso3]?.[k] ?? 0)])) } : null;
  const unOthers = ["USA", "CHN", "RUS"].map((i) => ({ iso: i, v: (un?.[i] as number | undefined) ?? null }));
  return { asOf: now.toISOString(), iso3, name: c.name, nameAr: c.nameAr ?? null, flag: c.flag ?? "", region: c.region, subregion: inp.subregion, lenses: ls, divergence: divergence(ls), pillars: pl, posture: post, instruments: instruments(inp, post.posture), measured: positionMeasured(inp),
    un: inp.un, unOthers, power: prof ? (["hard", "soft", "econ", "dur", "region", "comp"] as const).map((k) => ({ id: k, en: { hard: "Hard-power channel", soft: "Soft-power channel", econ: "Economic depth", dur: "Durability", region: "Regional weight", comp: "Standing against rivals" }[k], v: prof.dims[k].s, ev: prof.dims[k].ev })) : [], axes: prof ? (["growth", "corridor", "durability", "competition", "capacity", "esg"] as const).map((k) => ({ id: k, en: { growth: "Trade and investment growth", corridor: "Corridor criticality", durability: "Institutional durability", competition: "Competitive field", capacity: "Absorptive capacity", esg: "ESG and sustainability" }[k], v: prof.axes[k].s, ev: prof.axes[k].ev })) : [],
    leaders: ld ? { head: ld.state ? { name: ld.state.name, start: ld.state.start, tenure: tenureYears(ld.state.start, nowMs), age: ageYears(ld.state.birth, nowMs) } : undefined, gov: ld.gov ? { name: ld.gov.name, start: ld.gov.start, tenure: tenureYears(ld.gov.start, nowMs) } : undefined } : null,
    neighbours: { ring1, ring2 }, rivals: (rv?.list ?? []).slice(0, 8).map((x: { c: string; share: number }) => ({ iso: x.c, share: x.share })), uaeRank: rv?.uae ? { rank: rv.uae.rank, of: rv.of ?? 14, share: rv.uae.share } : null, leverage: inp.lev,
    scorecard: sc ? { overall: sc.overall, tier: sc.tier, dims: Object.entries(sc.dims).map(([id, v]: [string, any]) => ({ id, group: DIM_GROUP(f, id), score: v.score ?? null })) } : null, partnership: inp.part, tone: inp.tone, spine, capture: cap, // eslint-disable-line @typescript-eslint/no-explicit-any
    deep: deep ? { exposure: deep.exposure, readings: deep.readings, screen: deep.trade?.partnerScreen ?? null, screenN: deep.trade?.screenN ?? 0, vintage: deep.vintage, builds: deep.builds, gaps: deep.gaps, forecasts: deep.forecasts.other, invest: deep.invest } : null,
    coverage: { trendHeld: TREND_METRICS.filter((m) => m.cls === "H").length, trendTotal: TREND_METRICS.length, withData: spine.filter((s) => s.has).length } };
}
export type { B };
