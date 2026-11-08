import { CORRIDORS, RADAR_AXES } from "./content";

// The module's deterministic evidence engine. Everything here is arithmetic on the app's own datasets, with an evidence string for every score: no model call, no cost, reproducible.
// Scores are 0 to 5. They place countries against each other on stated rules; they are not predictions, and no score combines hard power, soft power and durability into a single "control" number.
export type DimId = "hard" | "soft" | "econ" | "dur" | "region" | "comp" | "trade" | "capital" | "align" | "gov" | "market";
/** The pillars that are averaged into the final score. Economic depth is left out because it is the umbrella of the bilateral-trade and investment pillars, which are in. */
/** Pillar scores as callers hold them: the original six are always there, the newer ones may be missing (an older snapshot). */
export type DimNums = Record<"hard" | "soft" | "econ" | "dur" | "region" | "comp", number> & Partial<Record<DimId, number>>;
export const FINAL_PILLARS: DimId[] = ["hard", "soft", "trade", "capital", "dur", "region", "comp", "align", "gov", "market"];
export type AxisId = "growth" | "corridor" | "durability" | "competition" | "capacity" | "esg";
export type Scored = { s: number; ev: string };
export type Tier = "T1" | "T2" | "T3" | "T4" | "T5";
export type Raw = {
  iso3: string; name: string; nameAr?: string | null; region: string; subregion: string | null;
  trade: [number, number, number][] | null; // [year, UAE exports, UAE imports] in US$ millions
  invOut: number | null; invYear: number | null;
  pct: { trade: number; engagement: number; agreements: number; connectivity: number; investment: number; alignment?: number } | null;
  uaeTradeShare?: number | null; // the partner's share of all UAE goods trade, percent (IMF IMTS)
  polScore?: number | null; econScore?: number | null; // the country scorecard's political-friends and economic-condition scores, 0 to 100
  agr: { security: number; defence: boolean; soft: number; total: number; cepa: { status: string; inForce: string | null; signed: string | null } | null };
  bases: number; aid5: number;
  rivals: { rank: number | null; of: number; uaeShare: number | null; top: { c: string; share: number } | null } | null;
  gov: { ge: number; rq: number; pv: number; cc: number; rl: number; va?: number } | null; debt: number | null;
  sanc: number; globalScore: number | null; chokepoints: string[];
  deals365: number; tone: { temp: number | null; media: number | null } | null;
};
export type Profile = {
  iso3: string; name: string; nameAr?: string | null; region: string; subregion: string | null;
  dims: Record<DimId, Scored>; axes: Record<AxisId, Scored>; composite: number; final: number; tier: Tier | null; recs: string[];
  facts: { tradeUsdM: number | null; tradeYear: number | null; tradeCagr: number | null; tradeBalanceUsdM: number | null; partnerShareOfUae: number | null; uaeShareOfPartner: number | null; invOutUsd: number | null; aid5Usd: number; rank: number | null; debtPct: number | null; deals365: number; tone: { temp: number | null; media: number | null } | null; gov: Raw["gov"] };
};
export const r1 = (x: number) => Math.round(x * 10) / 10;
/** The final score: the plain mean of the pillars in FINAL_PILLARS, 0 to 5 with two decimals. */
export const finalScore = (d: Record<string, number>, ids: DimId[] = FINAL_PILLARS) => { const xs = ids.map((k) => d[k]).filter((v): v is number => typeof v === "number"); return xs.length ? Math.round((xs.reduce((a, v) => a + v, 0) / xs.length) * 100) / 100 : 0; };
export const clamp = (x: number, lo = 0, hi = 5) => Math.max(lo, Math.min(hi, x));
export const WEIGHTS: Record<AxisId, number> = Object.fromEntries(RADAR_AXES.map((a) => [a.id, a.weight])) as Record<AxisId, number>;
/** Weighted composite of the six radar axes with weights in percent (they need not sum to 100: they are re-normalised, so a slider can move without breaking the scale). */
export function composite(axes: Record<AxisId, number>, w: Record<AxisId, number> = WEIGHTS): number {
  const ids = Object.keys(w) as AxisId[]; const tot = ids.reduce((a, k) => a + Math.max(0, w[k]), 0) || 1;
  return Math.round((ids.reduce((a, k) => a + Math.max(0, w[k]) * (axes[k] ?? 0), 0) / tot) * 100) / 100;
}
const usd = (m: number) => (m >= 1000 ? `US$${(m / 1000).toFixed(1)}bn` : `US$${Math.round(m)}m`);
const money = (v: number) => (v >= 1e9 ? `US$${(v / 1e9).toFixed(1)}bn` : `US$${Math.round(v / 1e6)}m`);
const cagrScore = (c: number) => (c <= -0.05 ? 0 : c < 0 ? 1 : c < 0.05 ? 2 : c < 0.1 ? 3 : c < 0.18 ? 4 : 5);
const aidScore = (v: number) => (v <= 0 ? 0 : v < 5e6 ? 1 : v < 25e6 ? 2 : v < 100e6 ? 3 : v < 500e6 ? 4 : 5);
const softAgrScore = (n: number) => (n <= 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 9 ? 3 : n <= 15 ? 4 : 5);
const rankScore = (r: number | null) => (r == null ? 0 : r === 1 ? 5 : r === 2 ? 4 : r === 3 ? 3 : r <= 5 ? 2 : r <= 8 ? 1 : 0);
const shareUaeScore = (p: number) => (p >= 8 ? 5 : p >= 4 ? 4 : p >= 2 ? 3 : p >= 1 ? 2 : p >= 0.3 ? 1 : 0);
const uaeShareScore = (p: number) => (p >= 15 ? 5 : p >= 8 ? 4 : p >= 4 ? 3 : p >= 2 ? 2 : p >= 0.5 ? 1 : 0);
const surplusScore = (x: number) => (x >= 0.7 ? 5 : x >= 0.55 ? 4 : x >= 0.45 ? 3 : x >= 0.3 ? 2 : 1);
const posScore = (usd: number) => (usd >= 1e9 ? 5 : usd >= 2e8 ? 4 : usd >= 5e7 ? 3 : usd >= 1e7 ? 2 : usd > 0 ? 1 : 0);
const dealScore = (n: number) => (n <= 0 ? 0 : n <= 2 ? 2 : n <= 5 ? 3 : n <= 10 ? 4 : 5);
const avg5 = (xs: number[]) => (xs.length ? r1(xs.reduce((a, v) => a + v, 0) / xs.length) : 0);
/** Weighted mean over the criteria that exist (the weights of missing criteria drop out and the rest are re-normalised). */
const wavg = (xs: { s: number; w: number }[]) => { const t = xs.reduce((a, x) => a + x.w, 0); return t ? r1(xs.reduce((a, x) => a + x.s * x.w, 0) / t) : 0; };
const aheadScore = (ahead: number) => (ahead <= 0 ? 5 : ahead === 1 ? 4 : ahead === 2 ? 3 : ahead === 3 ? 2 : ahead <= 5 ? 1 : 0);

/** Trade growth over three years from the UAE-reported IMF series: the compound rate between the last year and three years earlier. */
export function tradeGrowth(series: [number, number, number][] | null): { value: number | null; year: number | null; cagr: number | null } {
  if (!series?.length) return { value: null, year: null, cagr: null };
  const last = series[series.length - 1]; const prev = series.find((r) => r[0] === last[0] - 3); const v = last[1] + last[2]; const pv = prev ? prev[1] + prev[2] : 0;
  return { value: v, year: last[0], cagr: pv > 0 && v > 0 ? Math.pow(v / pv, 1 / 3) - 1 : null };
}
export function corridorRole(iso3: string): { s: number; ev: string } | null {
  let best: { s: number; ev: string } | null = null;
  for (const c of CORRIDORS) { const m = c.members.find((x) => x.iso3 === iso3); if (!m) continue; const base = m.role === "core" ? 5 : m.role === "landing" ? 4 : 3; const live = !/stalled/i.test(c.status); const s = live ? base : Math.min(base, 4); if (!best || s > best.s) best = { s, ev: `${m.role} on ${c.name}${live ? "" : " (stalled, capped at 4)"}` }; }
  return best;
}
export function tierHint(p: { composite: number; axes: Record<AxisId, number>; dims: DimNums }): Tier | null {
  const a = p.axes, d = p.dims;
  if (p.composite >= 3.4 && d.econ >= 3.5 && d.dur >= 2.5) return "T1";
  if (a.corridor >= 4) return "T4";
  if (a.capacity >= 4.2 && a.esg >= 3.8) return "T5";
  if (a.growth >= 2.5 && d.econ <= 3.4 && d.region >= 2.5) return "T2";
  if (d.econ >= 1 || p.composite >= 1.8) return "T3";
  return null;
}
/** Up to three "what could be done better" lines from the weakest dimensions, each naming only legitimate instruments from sections 5, 25 and 27 of the specification. */
export function recommendations(d: DimNums, a: Record<AxisId, number>): string[] {
  const out: string[] = [];
  if (d.econ >= 3.5 && d.hard <= 1.5) out.push("Defence and security cooperation lags economic depth: explore consent-based co-production, training and interoperability under a published framework (sections 24 and 27.1).");
  if (a.corridor >= 4 && d.dur <= 3) out.push("The country sits on a priority corridor but the relationship is not yet institutional: coordinate governance and infrastructure financing before adding volume (section 29).");
  if (a.competition <= 2 && d.econ >= 2) out.push("The field is crowded: carve out complementary niches (financing, trade law, diaspora, standards) rather than competing head-on in the same sectors (sections 28 and 40).");
  if (d.dur <= 2 && d.econ >= 2.5) out.push("Economic ties outpace institutional ones: audit actual use of agreements, set up dispute mechanisms and put commitments on institutions rather than office-holders (sections 8 and 9).");
  if (d.soft <= 2 && d.econ >= 2.5) out.push("Soft-power channels are thin beside the economic ones: education and research partnerships, convening and needs-based development cooperation are low-exposure options (sections 25.3 and 27.2).");
  if (a.capacity <= 2) out.push("Low capacity to absorb investment: test feasibility, debt sustainability and transparent procurement first, and build exit clauses in before any commitment (sections 5 and 12, MI14 and MI22).");
  if (a.esg <= 2) out.push("High reputational or stability exposure: prefer reversible, disclosed, smaller-scale pilots with independent evaluation (sections 10 and 26).");
  if (d.econ <= 1.5 && d.region >= 3.5) out.push("An important country with a thin relationship: a small, transparent pilot and a monitoring trigger preserve the option at low cost (section 28.1, tier 3).");
  if (!out.length) out.push("No dimension stands out as weak on the data: keep the portfolio under quarterly review and test continuity under a leadership-change scenario (section 26).");
  return out.slice(0, 3);
}
export function scoreProfile(raw: Raw): Profile {
  const g = tradeGrowth(raw.trade); const pct = raw.pct; const hasTrade = (g.value ?? 0) > 0;
  const econ = hasTrade && pct ? r1(((pct.trade + pct.investment) / 2) / 20) : 0;
  const econEv = hasTrade ? `Trade ${usd(g.value!)} in ${g.year} (IMF IMTS, ${pct ? Math.round(pct.trade) : "?"}th percentile)${raw.invOut ? `; UAE outward investment position ${money(raw.invOut)}${raw.invYear ? ` in ${raw.invYear}` : ""} (${pct ? Math.round(pct.investment) : "?"}th percentile, mirror data)` : "; no investment position reported"}` : "No UAE-reported trade with this partner in the IMF series";
  const a = raw.agr; const sec = a.security; const def = a.defence;
  let hard = def ? (sec >= 3 ? 3 : 2) : sec >= 1 ? 1 : 0; if (def && raw.bases >= 1) hard = Math.min(4, hard + 1);
  const hardEv = `${sec} security agreement${sec === 1 ? "" : "s"}${def ? ", including a defence cooperation agreement" : ", no defence cooperation agreement listed"}; ${raw.bases} UAE-operated base${raw.bases === 1 ? "" : "s"} recorded abroad (MOFA list, Wikidata). A 5 needs analyst evidence of substance`;
  const aidS = aidScore(raw.aid5), agrS = softAgrScore(a.soft), connS = r1((pct?.connectivity ?? 0) / 20); const soft = r1((aidS + agrS + connS) / 3);
  const softEv = `Humanitarian funding ${raw.aid5 > 0 ? money(raw.aid5) : "none recorded"} over five years (OCHA FTS); ${a.soft} education, health, technology or environment agreement${a.soft === 1 ? "" : "s"}; connectivity ${Math.round(pct?.connectivity ?? 0)}th percentile (flights and missions)`;
  const agrP = (pct?.agreements ?? 0) / 20, engP = (pct?.engagement ?? 0) / 20; let bonus = 0; let cepaEv = "no CEPA";
  if (a.cepa) { if (a.cepa.status === "in-force" && a.cepa.inForce) { const yrs = (Date.parse("2026-10-25") - Date.parse(a.cepa.inForce)) / 3.156e10; bonus = yrs >= 3 ? 1 : yrs >= 1 ? 0.7 : 0.4; cepaEv = `CEPA in force since ${a.cepa.inForce} (${yrs.toFixed(1)} years)`; } else { bonus = 0.2; cepaEv = `CEPA ${a.cepa.status}${a.cepa.signed ? `, signed ${a.cepa.signed}` : ""}, not yet in force`; } }
  const dur = Math.min(4, r1(0.7 * ((agrP + engP) / 2) + bonus)); const durEv = `Agreements ${Math.round(pct?.agreements ?? 0)}th percentile (${a.total} listed), minister-level engagement ${Math.round(pct?.engagement ?? 0)}th percentile, ${cepaEv}. Capped at 4: surviving a leadership transition needs analyst evidence`;
  const region = raw.globalScore == null ? (raw.chokepoints.length ? 1 : 0) : r1(clamp(raw.globalScore / 20 + (raw.chokepoints.length ? 1 : 0)));
  const regionEv = `World-weight ${raw.globalScore == null ? "not scored" : `${Math.round(raw.globalScore)}/100 (GDP, population, trade, forums)`}${raw.chokepoints.length ? `; adjoins ${raw.chokepoints.slice(0, 2).join(" and ")} (inferred from the chokepoint's description)` : ""}`;
  const rv = raw.rivals; const rank = rv?.rank ?? null; const comp = rankScore(rank);
  const compEv = rv && rank ? `UAE ranks ${rank} of ${rv.of} powers in the partner's merchandise trade${rv.uaeShare != null ? ` (${rv.uaeShare}% share)` : ""}${rv.top ? `; largest is ${rv.top.c} at ${rv.top.share}%` : ""} (IMF mirror data)` : "No rivals comparison available";
  const growthS = g.cagr == null ? 0 : cagrScore(g.cagr); const growth = hasTrade ? r1((growthS + econ) / 2) : 0;
  const growthEv = hasTrade ? `${g.cagr == null ? "growth not computable" : `three-year trade growth ${(g.cagr * 100).toFixed(1)}% a year (scores ${growthS})`}; depth scores ${econ}. UAE-reported goods trade includes re-exports` : "No trade series";
  const cor = corridorRole(raw.iso3); const corridor = cor ? cor.s : raw.chokepoints.length ? 2 : 0; const corEv = cor ? cor.ev : raw.chokepoints.length ? `Adjoins ${raw.chokepoints[0]} (recorded chokepoint), not in the corridor registry` : "Not in the corridor registry and no recorded chokepoint";
  const ahead = rank ? rank - 1 : null; const competition = ahead == null ? 2 : aheadScore(ahead); const competitionEv = ahead == null ? "No rivals comparison: neutral 2" : `${ahead} of ${rv!.of - 1} rival powers have a larger share of the partner's trade than the UAE`;
  let capacity = 0; let capEv = "No governance data"; if (raw.gov) { capacity = (raw.gov.ge + raw.gov.rq) / 2 / 20; const d = raw.debt; const pen = d == null ? 0 : d >= 120 ? 1 : d >= 90 ? 0.5 : d >= 60 ? 0.2 : 0; capacity = r1(clamp(capacity - pen)); capEv = `Government effectiveness ${Math.round(raw.gov.ge)} and regulatory quality ${Math.round(raw.gov.rq)} of 100 (World Bank WGI)${d == null ? "" : `; public debt ${Math.round(d)}% of GDP (IMF WEO)${pen ? `, penalty ${pen}` : ""}`}`; }
  let esg = 0; let esgEv = "No governance data"; if (raw.gov) { esg = (raw.gov.pv + raw.gov.cc + raw.gov.rl) / 3 / 20; const pen = raw.sanc >= 50 ? 1.2 : raw.sanc >= 10 ? 0.7 : raw.sanc >= 1 ? 0.3 : 0; esg = r1(clamp(esg - pen)); esgEv = `Political stability ${Math.round(raw.gov.pv)}, corruption control ${Math.round(raw.gov.cc)}, rule of law ${Math.round(raw.gov.rl)} of 100 (World Bank WGI)${raw.sanc ? `; ${raw.sanc} sanctions-list entries (OFAC and UN), penalty ${pen}` : ""}`; }
  // bilateral trade: five criteria, each 0 to 5, averaged over those that can be computed
  const last = raw.trade?.length ? raw.trade[raw.trade.length - 1] : null; const exp = last?.[1] ?? 0; const imp = last?.[2] ?? 0; const tot = exp + imp; const balance = last ? exp - imp : null; const tcrit: { n: string; s: number; w: number }[] = [];
  if (hasTrade && pct) tcrit.push({ n: `volume ${Math.round(pct.trade)}th percentile`, s: r1(pct.trade / 20), w: 30 });
  if (g.cagr != null) tcrit.push({ n: `three-year growth ${(g.cagr * 100).toFixed(1)}% a year`, s: cagrScore(g.cagr), w: 15 });
  if (raw.uaeTradeShare != null && hasTrade) tcrit.push({ n: `${raw.uaeTradeShare.toFixed(2)}% of all UAE goods trade`, s: shareUaeScore(raw.uaeTradeShare), w: 20 });
  if (rv?.uaeShare != null) tcrit.push({ n: `the UAE is ${rv.uaeShare}% of the partner's trade`, s: uaeShareScore(rv.uaeShare), w: 20 });
  if (tot > 0) tcrit.push({ n: `UAE exports ${Math.round((exp / tot) * 100)}% of the two-way total`, s: surplusScore(exp / tot), w: 15 });
  const tradeS = hasTrade ? wavg(tcrit) : 0; const tradeEv = hasTrade ? `Bilateral goods trade ${usd(tot)} in ${g.year} (UAE exports ${usd(exp)}, imports ${usd(imp)}; balance ${balance! >= 0 ? "+" : "-"}${usd(Math.abs(balance!))}): ${tcrit.map((x) => `${x.n} (${x.s}, weight ${x.w})`).join("; ")}. Weighted mean; IMF IMTS and mirror data; includes re-exports` : "No UAE-reported goods trade with this partner in the IMF series";
  // investment and capital
  const ccrit: { n: string; s: number }[] = []; if (raw.invOut && raw.invOut > 0) { ccrit.push({ n: `position ${money(raw.invOut)}${raw.invYear ? ` (${raw.invYear})` : ""}`, s: posScore(raw.invOut) }); if (pct) ccrit.push({ n: `investment ${Math.round(pct.investment)}th percentile`, s: r1(pct.investment / 20) }); } ccrit.push({ n: `${raw.deals365} announced deal headline${raw.deals365 === 1 ? "" : "s"} in 12 months`, s: dealScore(raw.deals365) });
  const capitalS = avg5(ccrit.map((x) => x.s)); const capitalEv = `${ccrit.map((x) => `${x.n} (${x.s})`).join("; ")}${raw.invOut && raw.invOut > 0 ? "" : "; no UAE direct-investment position reported (unknown, not zero)"}. Announcements are not completed investment`;
  // political alignment
  const acrit: { n: string; s: number; w: number }[] = []; if (pct?.alignment != null) acrit.push({ n: `UN alignment ${Math.round(pct.alignment)}th percentile`, s: r1(pct.alignment / 20), w: 45 }); if (pct) acrit.push({ n: `engagement ${Math.round(pct.engagement)}th percentile`, s: r1(pct.engagement / 20), w: 30 }); if (raw.polScore != null) acrit.push({ n: `political-friends score ${Math.round(raw.polScore)}/100`, s: r1(raw.polScore / 20), w: 25 });
  const alignS = wavg(acrit); const alignEv = acrit.length ? `${acrit.map((x) => `${x.n} (${x.s}, weight ${x.w})`).join("; ")} (weighted mean; partnership index, UN votes, GDELT tone, shared clubs)` : "No alignment data";
  // governance and stability
  const gv = raw.gov; const govVals = gv ? [gv.pv, gv.ge, gv.rq, gv.rl, gv.cc, gv.va].filter((x): x is number => typeof x === "number") : []; const govS = govVals.length ? r1(govVals.reduce((a, v) => a + v, 0) / govVals.length / 20) : 0;
  const govEv = gv ? `World Bank WGI percentiles: stability ${Math.round(gv.pv)}, effectiveness ${Math.round(gv.ge)}, regulatory quality ${Math.round(gv.rq)}, rule of law ${Math.round(gv.rl)}, corruption control ${Math.round(gv.cc)}${gv.va != null ? `, voice ${Math.round(gv.va)}` : ""}` : "No governance data";
  // market size and growth
  const marketS = raw.econScore != null ? r1(raw.econScore / 20) : 0; const marketEv = raw.econScore != null ? `Economic-condition score ${Math.round(raw.econScore)}/100 (growth, inflation, GDP and GDP per head as percentiles among countries; IMF WEO and World Bank)` : "No economic-condition score";
  const dims: Record<DimId, Scored> = { hard: { s: hard, ev: hardEv }, soft: { s: soft, ev: softEv }, econ: { s: econ, ev: econEv }, dur: { s: dur, ev: durEv }, region: { s: region, ev: regionEv }, comp: { s: comp, ev: compEv }, trade: { s: tradeS, ev: tradeEv }, capital: { s: capitalS, ev: capitalEv }, align: { s: alignS, ev: alignEv }, gov: { s: govS, ev: govEv }, market: { s: marketS, ev: marketEv } };
  const axes: Record<AxisId, Scored> = { growth: { s: growth, ev: growthEv }, corridor: { s: corridor, ev: corEv }, durability: { s: dur, ev: durEv }, competition: { s: competition, ev: competitionEv }, capacity: { s: capacity, ev: capEv }, esg: { s: esg, ev: esgEv } };
  const ax = Object.fromEntries(Object.entries(axes).map(([k, v]) => [k, v.s])) as Record<AxisId, number>; const dm = Object.fromEntries(Object.entries(dims).map(([k, v]) => [k, v.s])) as DimNums;
  const comp2 = composite(ax); const fin = finalScore(dm);
  return { iso3: raw.iso3, name: raw.name, nameAr: raw.nameAr, region: raw.region, subregion: raw.subregion, dims, axes, composite: comp2, final: fin, tier: tierHint({ composite: comp2, axes: ax, dims: dm }), recs: recommendations(dm, ax), facts: { tradeUsdM: g.value, tradeYear: g.year, tradeCagr: g.cagr, tradeBalanceUsdM: balance, partnerShareOfUae: raw.uaeTradeShare ?? null, uaeShareOfPartner: rv?.uaeShare ?? null, invOutUsd: raw.invOut, aid5Usd: raw.aid5, rank, debtPct: raw.debt, deals365: raw.deals365, tone: raw.tone, gov: raw.gov } };
}
/** Herfindahl-Hirschman index (0 to 10,000) and top shares of a set of non-negative values: how concentrated the UAE's exposure is across partners (MI13). */
export function concentration(vals: { id: string; v: number }[]): { hhi: number; top1: number; top5: number; top: { id: string; share: number }[]; n: number } {
  const xs = vals.filter((x) => x.v > 0).sort((a, b) => b.v - a.v); const tot = xs.reduce((a, x) => a + x.v, 0); if (!tot) return { hhi: 0, top1: 0, top5: 0, top: [], n: 0 };
  const sh = xs.map((x) => ({ id: x.id, share: x.v / tot })); return { hhi: Math.round(sh.reduce((a, x) => a + x.share * x.share, 0) * 10000), top1: sh[0].share, top5: sh.slice(0, 5).reduce((a, x) => a + x.share, 0), top: sh.slice(0, 10), n: xs.length };
}

/** Cadence of the Country Brief by opportunity tier (section 43.2): anchor markets monthly, growth frontiers quarterly, the rest twice a year. */
export const BRIEF_CADENCE_DAYS: Record<Tier | "none", number> = { T1: 30, T2: 90, T3: 182, T4: 182, T5: 182, none: 182 };
export const briefDue = (tier: Tier | null, lastIso: string | null, now = Date.now()) => { const cad = BRIEF_CADENCE_DAYS[tier ?? "none"]; if (!lastIso) return { cadence: cad, days: null as number | null, due: true, overdue: false }; const days = Math.floor((now - Date.parse(lastIso)) / 86400e3); return { cadence: cad, days, due: days >= cad, overdue: days >= cad * 1.5 }; };
export type Snap = { at: string; dims: DimNums; axes: Record<AxisId, number>; composite: number; tier: Tier | null; built: Record<string, string | null> };
export const snapOf = (p: Profile, built: Record<string, string | null>, at = new Date().toISOString()): Snap => ({ at, dims: Object.fromEntries(Object.entries(p.dims).map(([k, v]) => [k, v.s])) as DimNums, axes: Object.fromEntries(Object.entries(p.axes).map(([k, v]) => [k, v.s])) as Record<AxisId, number>, composite: p.composite, tier: p.tier, built });
export type Change = { id: string; kind: "dimension" | "axis" | "composite" | "tier" | "dataset"; from: string; to: string; delta: number | null };
/** What moved between two profile snapshots, and whether that is enough to escalate (section 43.1): any dimension or radar axis moving by 0.5 or more, the composite by 0.3, a change of tier, or a dataset rebuilt since. Escalation is raised only for scorecard-moving or rank-changing developments, never on a routine refresh. */
export function changeCheck(prev: Snap, cur: Snap): { changes: Change[]; flagged: boolean; reason: string } {
  const changes: Change[] = []; const mv = (a: number, b: number) => Math.round((b - a) * 10) / 10;
  for (const k of Object.keys(cur.dims) as DimId[]) { const pv = prev.dims[k]; const cv = cur.dims[k]; if (pv == null || cv == null) continue; const d = mv(pv, cv); if (Math.abs(d) >= 0.5) changes.push({ id: k, kind: "dimension", from: String(pv), to: String(cv), delta: d }); }
  for (const k of Object.keys(cur.axes) as AxisId[]) { const d = mv(prev.axes[k] ?? 0, cur.axes[k]); if (Math.abs(d) >= 0.5 && k !== "durability") changes.push({ id: k, kind: "axis", from: String(prev.axes[k]), to: String(cur.axes[k]), delta: d }); }
  const dc = Math.round((cur.composite - prev.composite) * 100) / 100; if (Math.abs(dc) >= 0.3) changes.push({ id: "composite", kind: "composite", from: String(prev.composite), to: String(cur.composite), delta: dc });
  if (prev.tier !== cur.tier) changes.push({ id: "tier", kind: "tier", from: prev.tier ?? "none", to: cur.tier ?? "none", delta: null });
  const ds: Change[] = Object.keys(cur.built).filter((k) => cur.built[k] && prev.built[k] && cur.built[k] !== prev.built[k]).map((k) => ({ id: k, kind: "dataset" as const, from: String(prev.built[k]).slice(0, 10), to: String(cur.built[k]).slice(0, 10), delta: null }));
  const flagged = changes.length > 0; return { changes: [...changes, ...ds], flagged, reason: flagged ? `${changes.length} scorecard or radar movement${changes.length === 1 ? "" : "s"} since the previous brief` : "no scorecard or radar movement since the previous brief" };
}
