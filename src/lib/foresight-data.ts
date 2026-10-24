import { readFile } from "node:fs/promises";
import path from "node:path";
import { intelFor } from "./intel-data";
import { tradeSummary, usdM, type OutlookRec, type TradeData } from "./intel";
import { FS_FRONTS, frontLabel, type FsFront } from "./foresight";
import type { Fact } from "./brief/facts";

// The free half of the Foresight product: a baseline "what is already in motion" read straight from the datasets, with plain rules and no model call.
// It extends published numbers (IMF projections, trend of trade and deals, the election calendar); it is trend continuation, never a forecast of events.
const rd = async <T,>(f: string): Promise<T | null> => { try { return JSON.parse(await readFile(path.join(process.cwd(), "public/data", f), "utf8")) as T; } catch { return null; } };

export type Tone = "good" | "info" | "watch" | "risk";
export type Signal = { id: string; front: FsFront; label: string; value: string; arrow: "up" | "down" | "flat" | null; tone: Tone; note: string; src: string };
export type MacroPath = { firstEstimate: number; growth: [number, number][]; inflation: [number, number][]; debt: [number, number][]; ca: [number, number][]; gdp: [number, number][]; unemployment: [number, number][] };
export type CalItem = { label: string; date: string; daysAway: number; approx: boolean };
export type ForesightPayload = {
  iso3: string; name: string; asOf: string; region: string | null; subregion: string | null; population: { v: number; y: number } | null; areaKm2: number | null; neighbours: string[];
  macro: MacroPath | null; signals: Signal[]; calendar: CalItem[]; blind: FsFront[]; exposure: Exposure[];
};
/** One spoke of the UAE impact graph: how strongly this country touches a national interest, as a percentile among all countries with data (null when no dataset covers it). */
export type Exposure = { key: string; value: number | null; kind: "tie" | "safety"; basis: string };

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const pick = (s: Record<number, number> | undefined, a: number, b: number) => (s ? Array.from({ length: b - a + 1 }, (_, i) => s[a + i]).filter((v): v is number => typeof v === "number" && isFinite(v)) : []);
const series = (s: Record<number, number> | undefined, a: number, b: number): [number, number][] => (s ? Array.from({ length: b - a + 1 }, (_, i) => [a + i, s[a + i]] as [number, number]).filter(([, v]) => typeof v === "number" && isFinite(v)) : []);
const f1 = (v: number) => (Math.abs(v) < 0.05 ? 0 : v).toFixed(1);
const dir = (delta: number, step: number): Signal["arrow"] => (delta >= step ? "up" : delta <= -step ? "down" : "flat");
const band = (v: number): Tone => (v >= 60 ? "good" : v >= 40 ? "watch" : "risk");

export async function foresightFor(iso3: string): Promise<ForesightPayload | null> {
  const it = await intelFor(iso3); if (!it) return null;
  const [cs, ol, tr, rg] = await Promise.all([rd<{ iso3: string; name: string; population?: { v: number; y: number }; areaKm2?: number; borders?: string[] }[]>("countries.json"), rd<{ countries: Record<string, OutlookRec> }>("outlook.json"), rd<TradeData>("trade.json"), rd<{ countries: Record<string, { region: string; subregion: string | null }> }>("regions.json")]);
  const c = cs?.find((x) => x.iso3 === iso3); const o = ol?.countries[iso3]; const Y = new Date().getFullYear(); const now = new Date(); const out: Signal[] = []; const sig = (s: Omit<Signal, "id">) => out.push({ id: `${s.front}-${out.length + 1}`, ...s });
  const IMF = "IMF World Economic Outlook";

  // economy and finance: the IMF's own path, read for direction and for the thresholds economists use as rules of thumb
  const gBase = pick(o?.growth, Y - 5, Y - 1), gProj = pick(o?.growth, Y, Y + 2);
  if (gBase.length >= 3 && gProj.length >= 2) { const b = mean(gBase), p = mean(gProj); sig({ front: "economy", label: "Growth outlook", value: `${f1(b)}% → ${f1(p)}%`, arrow: dir(p - b, 0.7), tone: p >= 4 ? "good" : p >= 2 ? "info" : "watch", note: `Average real growth ${Y - 5}–${Y - 1} against the IMF projection for ${Y}–${Y + 2}.`, src: IMF }); }
  const dNow = o?.debt?.[Y - 1] ?? o?.debt?.[Y], dEnd = o?.debt?.[Y + 5];
  if (dNow != null && dEnd != null) { const d = dEnd - dNow; const lvl: Tone = dNow >= 90 ? "risk" : dNow >= 60 ? "watch" : "good"; sig({ front: "economy", label: "Public debt path", value: `${f1(dNow)}% → ${f1(dEnd)}% of GDP`, arrow: dir(d, 5), tone: d >= 5 && lvl === "good" ? "watch" : lvl, note: `Debt now against the IMF projection for ${Y + 5}. Rule of thumb: above 60% needs watching, above 90% is a stress level.`, src: IMF }); }
  const iNow = o?.inflation?.[Y - 1] ?? o?.inflation?.[Y], iNext = o?.inflation?.[Y + 1];
  if (iNow != null && iNext != null) sig({ front: "economy", label: "Inflation", value: `${f1(iNow)}% → ${f1(iNext)}%`, arrow: dir(iNext - iNow, 1.5), tone: iNow >= 10 ? "risk" : iNow >= 5 ? "watch" : "good", note: `Latest estimate against the IMF projection for ${Y + 1}. Above 10% is a stress level.`, src: IMF });
  const caP = pick(o?.ca, Y, Y + 2), caNow = o?.ca?.[Y - 1];
  if (caP.length >= 2) { const a = mean(caP); sig({ front: "finance", label: "External balance", value: `${f1(a)}% of GDP`, arrow: caNow != null ? dir(a - caNow, 1) : null, tone: a <= -5 ? "risk" : a <= -2.5 ? "watch" : a >= 0 ? "good" : "info", note: `Average current-account balance projected for ${Y}–${Y + 2}. A deficit beyond about 5% of GDP means dependence on outside financing.`, src: IMF }); }
  const gN = o?.gdp?.[Y - 1], gE = o?.gdp?.[Y + 5];
  if (gN && gE) sig({ front: "economy", label: "Size of the market", value: `×${(gE / gN).toFixed(2)} by ${Y + 5}`, arrow: gE >= gN ? "up" : "down", tone: "info", note: `Nominal GDP in current US dollars, IMF projection: a bigger or smaller market for UAE exports and capital if it holds. Not a forecast of exchange rates.`, src: IMF });
  const un = pick(o?.unemployment, Y - 1, Y);
  if (un.length) sig({ front: "society", label: "Unemployment", value: `${f1(un[un.length - 1])}%`, arrow: null, tone: un[un.length - 1] >= 15 ? "risk" : un[un.length - 1] >= 8 ? "watch" : "good", note: "Latest IMF estimate. Youth unemployment and informal work are usually higher and are not in this dataset.", src: IMF });
  if (c?.population) sig({ front: "society", label: "Population", value: `${(c.population.v / 1e6).toFixed(1)}m (${c.population.y})`, arrow: null, tone: "info", note: `${c.areaKm2 ? `${Math.round(c.population.v / c.areaKm2)} people per km². ` : ""}Age structure and growth are not in the datasets: the researched foresight covers them.`, src: "World Bank / UN population series" });

  // politics: tenure and the calendar, in public roles only
  const head = it.leaders?.people.find((p) => p.role === "state"), gov = it.leaders?.people.find((p) => p.role === "gov");
  if (head) sig({ front: "political", label: "Leadership clock", value: `${head.name}: ${head.start ? `since ${head.start.slice(0, 4)}` : "start not recorded"}${head.tenureYears != null ? ` (${Math.round(head.tenureYears)} yrs)` : ""}`, arrow: null, tone: (head.tenureYears ?? 0) >= 20 ? "watch" : "info", note: `Head of state${gov && gov.name !== head.name ? `; head of government ${gov.name}${gov.start ? ` since ${gov.start.slice(0, 4)}` : ""}` : ""}. Long incumbency is a reason to plan for a transition, not a prediction of one.`, src: "Wikidata" });
  const cal: CalItem[] = (it.leaders?.elections ?? []).filter((e) => e.daysAway >= 0 && e.daysAway <= 760).map((e) => ({ label: e.label, date: e.date.replace(/-00$/, ""), daysAway: e.daysAway, approx: e.approx })).sort((a, b) => a.daysAway - b.daysAway);
  const next = cal[0]; sig({ front: "political", label: "Next election", value: next ? `${next.label}, ${next.date}${next.approx ? " (approx.)" : ""}` : "none dated in the next 24 months", arrow: null, tone: next && next.daysAway <= 365 ? "watch" : "info", note: next ? `${next.daysAway} days away. A vote inside twelve months is the main scheduled political event of the first horizon.` : "The calendar covers about 35 countries: absence here is not proof that no vote is due.", src: "Wikidata / national election bodies" });
  const gv = (k: string) => it.governance?.dims.find((d) => d.key === k);
  const ge = gv("ge"), va = gv("va"), pv = gv("pv"), rl = gv("rl"), rq = gv("rq"), cc = gv("cc"); const WB = `World Bank WGI ${it.governance?.year ?? ""}`.trim();
  if (ge?.score != null && va?.score != null) sig({ front: "political", label: "State capacity and voice", value: `effectiveness ${ge.score.toFixed(0)} · voice ${va.score.toFixed(0)}`, arrow: null, tone: band(Math.min(ge.score, va.score + 15)), note: `0–100, higher is better; UAE ${ge.uae != null ? ge.uae.toFixed(0) : "n/a"} and ${va.uae != null ? va.uae.toFixed(0) : "n/a"}. A low voice score with a low effectiveness score is the classic mix behind protest-and-repression cycles.`, src: WB });

  // security: only what the datasets hold
  if (pv?.score != null) sig({ front: "security", label: "Political stability and absence of violence", value: `${pv.score.toFixed(0)}/100`, arrow: null, tone: band(pv.score), note: `Rank ${pv.rank ?? "n/a"} of ${pv.of ?? "n/a"}; UAE ${pv.uae != null ? pv.uae.toFixed(0) : "n/a"}. Perception-based and slow to move: a level, not a trend.`, src: WB });
  const sn = (it.metrics.ofac as number | null) ?? null, un_ = (it.metrics.un as number | null) ?? null;
  if (sn != null || un_ != null) sig({ front: "security", label: "Sanctions-list entries with an address there", value: `${(sn ?? 0) + (un_ ?? 0)}`, arrow: null, tone: (sn ?? 0) + (un_ ?? 0) >= 50 ? "risk" : (sn ?? 0) + (un_ ?? 0) >= 10 ? "watch" : "good", note: `OFAC ${sn ?? 0} and UN ${un_ ?? 0}. A rough gauge of illicit-finance and secondary-sanctions exposure for UAE firms dealing there.`, src: "OFAC SDN, UN consolidated list" });
  const rw = it.metrics.ransomware30 as number | null; if (rw != null) sig({ front: "tech", label: "Ransomware incidents, last 30 days", value: `${rw}`, arrow: null, tone: rw >= 20 ? "risk" : rw >= 5 ? "watch" : "good", note: "Publicly claimed victims on leak sites: a rough gauge of cyber exposure, not of state capability.", src: "ransomware.live" });

  // finance: investor protection and what the UAE has at stake
  if (rl?.score != null && rq?.score != null && cc?.score != null) { const m = Math.min(rl.score, rq.score, cc.score); sig({ front: "finance", label: "Investor protection", value: `law ${rl.score.toFixed(0)} · regulation ${rq.score.toFixed(0)} · corruption control ${cc.score.toFixed(0)}`, arrow: null, tone: band(m), note: `0–100, higher is better; the weakest of the three sets the tone. UAE ${rl.uae != null ? rl.uae.toFixed(0) : "n/a"} on the rule of law.`, src: WB }); }
  const iv = it.invest; if (iv?.outwardUsd != null) sig({ front: "finance", label: "UAE capital at stake", value: `$${(iv.outwardUsd / 1e9).toFixed(1)}bn${iv.pctOfTheirGdp != null ? ` · ${iv.pctOfTheirGdp.toFixed(1)}% of their GDP` : ""}`, arrow: null, tone: (iv.pctOfTheirGdp ?? 0) >= 5 ? "watch" : "info", note: `IMF direct-investment position (${iv.outwardYear}), mirror data with gaps.`, src: "IMF Direct Investment Positions" });

  // the relationship: momentum of the bilateral ties, which is the part of the future the UAE most controls
  const m = it.metrics, sc = it.scorecard;
  if (m.partnershipScore != null) sig({ front: "external", label: "Partnership with the UAE", value: `${m.partnershipScore}/100 · rank ${m.partnershipRank}${sc ? ` · scorecard ${sc.overall}` : ""}`, arrow: null, tone: (m.partnershipScore as number) >= 60 ? "good" : (m.partnershipScore as number) >= 40 ? "info" : "watch", note: "Composite of trade, engagement, agreements, connectivity, investment and alignment: a position today, not a direction.", src: "Geo Desk partnership index" });
  const tp = it.temperature; if (tp) sig({ front: "external", label: "Bilateral event tone", value: `${tp.g > 0 ? "+" : ""}${tp.g.toFixed(2)}${tp.trend != null ? ` (trend ${tp.trend > 0 ? "+" : ""}${tp.trend.toFixed(2)})` : ""}`, arrow: tp.trend != null ? dir(tp.trend, 0.3) : null, tone: tp.worldG != null && tp.g < tp.worldG - 0.5 ? "watch" : "info", note: `Goldstein tone of news events between the two countries over ${tp.days} days${tp.worldG != null ? `; all countries ${tp.worldG > 0 ? "+" : ""}${tp.worldG.toFixed(2)}` : ""}. Newest weeks against older ones.`, src: "GDELT" });
  const ts = tr ? tradeSummary(tr, iso3) : null; if (ts) sig({ front: "corridors", label: "Goods trade with the UAE", value: `${usdM(ts.total)} (${ts.year})${ts.yoy != null ? ` · ${ts.yoy >= 0 ? "+" : ""}${ts.yoy.toFixed(0)}% y/y` : ""}`, arrow: ts.yoy != null ? dir(ts.yoy, 5) : null, tone: ts.yoy != null && ts.yoy <= -10 ? "watch" : "info", note: `UAE's #${ts.rank} partner among ${ts.of}. UAE customs data via the IMF; exports include re-exports.`, src: "IMF IMTS" });
  const d = it.deals; if (d.total) { const pace = d.last90 * 4 / Math.max(1, d.last365); sig({ front: "external", label: "UAE deal pace", value: `${d.last90} in 90 days · ${d.last365} in 12 months`, arrow: d.last365 ? (pace >= 1.3 ? "up" : pace <= 0.7 ? "down" : "flat") : null, tone: pace <= 0.7 ? "watch" : "info", note: "Company and fund announcements in WAM headlines: the last quarter scaled to a year against the last twelve months. Announcements, not transactions.", src: "WAM headlines (rule-classified)" }); }
  const rv = it.rivals; if (rv) { const top = rv.list.find((x) => x.c !== "ARE"); sig({ front: "external", label: "UAE weight against rival powers", value: `${rv.uae.share}% of their trade · #${rv.uae.rank} of ${rv.of}`, arrow: null, tone: rv.uae.rank > 5 ? "watch" : "info", note: `${top ? `Largest among the compared powers: ${top.c} at ${top.share}%. ` : ""}Share of ${it.name}'s merchandise trade, ${rv.year}.`, src: "IMF IMTS mirror data, World Bank totals" }); }
  const ds = m.daysSinceSenior as number | null; if (ds != null) sig({ front: "external", label: "Last senior engagement", value: `${ds} days ago${m.lastSenior ? ` (${m.lastSenior})` : ""}`, arrow: null, tone: ds > 365 ? "watch" : "info", note: "Minister level or above, from WAM headlines. A relationship with no senior contact for a year is drifting.", src: "WAM headlines (rule-classified)" });

  // the impact graph: each spoke is a percentile from the scorecard, so it is comparable across countries; interests with no dataset stay empty and are drawn as such
  const sk = it.scorecard; const part = (k: string) => { for (const d of Object.values(sk?.dims ?? {})) { const x = d.parts.find((p) => p.k === k); if (x) return Math.round(x.s); } return null; }; const dim = (k: string) => { const v = sk?.dims[k]?.score; return v == null ? null : Math.round(v); };
  const exposure: Exposure[] = [
    { key: "trade", value: part("trade"), kind: "tie", basis: "Trade with the UAE, percentile" }, { key: "investment", value: part("invest"), kind: "tie", basis: "UAE investment stock, percentile" }, { key: "logistics", value: part("logi"), kind: "tie", basis: "UAE logistics deals, percentile" },
    { key: "finance", value: dim("financial"), kind: "safety", basis: "Debt, external balance, regulation, corruption control" }, { key: "diplomacy", value: dim("polfriends"), kind: "tie", basis: "Event tone, UN alignment, engagement, agreements" }, { key: "security", value: dim("security"), kind: "safety", basis: "Sanctions entries and ransomware per GDP (higher is safer)" },
    { key: "people", value: dim("social"), kind: "tie", basis: "Flights, embassy, humanitarian funding" }, { key: "energy", value: part("energy"), kind: "tie", basis: "OPEC or OPEC+ membership flag" }, { key: "technology", value: null, kind: "tie", basis: "No dataset" }, { key: "foodwater", value: null, kind: "tie", basis: "No dataset" },
  ];
  const covered = new Set(out.map((s) => s.front)); const blind = FS_FRONTS.map((f) => f.key).filter((k) => !covered.has(k) || k === "defence" || k === "resources" || k === "tech" || k === "corridors") as FsFront[];
  const rr = rg?.countries[iso3];
  return { iso3, name: it.name, asOf: now.toISOString().slice(0, 10), region: rr?.region ?? null, subregion: rr?.subregion ?? null, population: c?.population ?? null, areaKm2: c?.areaKm2 ?? null, neighbours: (c?.borders ?? []).map((b) => cs?.find((x) => x.iso3 === b)?.name ?? b),
    macro: o ? { firstEstimate: Y - 1, growth: series(o.growth, Y - 5, Y + 5), inflation: series(o.inflation, Y - 5, Y + 5), debt: series(o.debt, Y - 5, Y + 5), ca: series(o.ca, Y - 5, Y + 5), gdp: series(o.gdp, Y - 5, Y + 5), unemployment: series(o.unemployment, Y - 5, Y + 5) } : null, signals: out, calendar: cal, blind: [...new Set(blind)], exposure };
}

/** The baseline as model facts: one fact per front (so each is cited once), plus the macro path to the end of the IMF horizon, the geography and the calendar. */
export function foresightFacts(p: ForesightPayload, startId: number): { facts: Fact[]; gaps: string[] } {
  const facts: Fact[] = []; let n = startId; const add = (kind: string, text: string, src: string) => facts.push({ id: `F${++n}`, kind, text, src });
  add("geography", `${p.name}: ${p.region ?? "region n/a"}${p.subregion ? `, ${p.subregion}` : ""}; population ${p.population ? `${(p.population.v / 1e6).toFixed(1)} million (${p.population.y})` : "n/a"}; area ${p.areaKm2 ? `${p.areaKm2.toLocaleString("en")} km2` : "n/a"}; land neighbours: ${p.neighbours.length ? p.neighbours.join(", ") : "none (island or no recorded borders)"}.`, "countries dataset, UN M49");
  const m = p.macro; const ser = (label: string, s: [number, number][], u: string) => (s.length ? `${label}: ${s.map(([y, v]) => `${y}${m && y >= m.firstEstimate ? "E" : ""} ${v.toFixed(1)}${u}`).join(", ")}` : "");
  if (m) add("macro-path", `IMF World Economic Outlook path for ${p.name}, years marked E are IMF estimates or projections, the rest are outturns: ${[ser("real GDP growth", m.growth, "%"), ser("inflation", m.inflation, "%"), ser("government debt % GDP", m.debt, ""), ser("current account % GDP", m.ca, ""), ser("unemployment", m.unemployment, "%"), m.gdp.length ? `nominal GDP US$bn, ${m.gdp.map(([y, v]) => `${y}${y >= m.firstEstimate ? "E" : ""} ${(v / 1000).toFixed(0)}`).join(", ")}` : ""].filter(Boolean).join("; ")}. These are the IMF's projections and assume no policy shock.`, "IMF World Economic Outlook");
  for (const f of FS_FRONTS) { const ss = p.signals.filter((s) => s.front === f.key); if (ss.length) add("foresight-baseline", `Baseline for the front "${frontLabel(f.key)}" (trend continuation of published data, not a forecast): ${ss.map((s) => `${s.label}: ${s.value}${s.arrow ? ` [${s.arrow === "up" ? "rising" : s.arrow === "down" ? "falling" : "flat"}]` : ""} (${s.note.replace(/\s+/g, " ")})`).join("; ")}.`, [...new Set(ss.map((s) => s.src))].join("; ")); }
  if (p.calendar.length) add("calendar", `Dated political events in the next 24 months: ${p.calendar.map((e) => `${e.label} on ${e.date}${e.approx ? " (approximate)" : ""}, ${e.daysAway} days away`).join("; ")}. The calendar covers about 35 countries.`, "Wikidata / national election bodies");
  return { facts, gaps: [`The datasets hold little or no series for ${p.blind.map((k) => frontLabel(k)).join("; ")}: research those fronts from sources, and say plainly where the record is thin.`] };
}
