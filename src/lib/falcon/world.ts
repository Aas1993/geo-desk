import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { tradeSummary, type OutlookRec, type TradeData } from "../intel";
import { scale, type Components } from "./score";

// The world model behind Falcon Eye: one pass over the app's datasets gives every country its score components (opportunity, risk, UAE exposure), its triggered early-warning indicators and the freshness of each source.
// Everything here is read from files the builders wrote; nothing is invented, nothing is live unless the source health says so.
const rd = async <T,>(f: string): Promise<T | null> => { try { return JSON.parse(await readFile(path.join(process.cwd(), "public/data", f), "utf8")) as T; } catch { return null; } };

export type Warning = { id: string; label: string; value: string; threshold: string; baseline: string | null; sev: 1 | 2 | 3; src: string; builtAt: string | null; impact: string; freq: string };
export type WorldCountry = { iso3: string; name: string; nameAr: string | null; region: string; subregion: string | null; flag: string; pop: number | null; c: Components; warnings: Warning[]; gdpUsd: number | null };
export type SourceState = "current" | "due" | "stale" | "missing";
export type SourceHealth = { file: string; label: string; builtAt: string | null; ageDays: number | null; cadenceDays: number; state: SourceState; cadence: string; provider: string };
export type WorldModel = { asOf: string; countries: WorldCountry[]; sources: SourceHealth[]; note: string };

/** Refresh cadence each dataset is built on (the scheduled workflows), and what a reader may conclude from its age: current within 1.5 cadences, due within 3, stale beyond. */
const SOURCES: { file: string; label: string; provider: string; days: number; cadence: string }[] = [
  { file: "trade.json", label: "UAE goods trade", provider: "IMF IMTS", days: 1, cadence: "daily" }, { file: "outlook.json", label: "Economic outlook", provider: "IMF WEO", days: 1, cadence: "daily" }, { file: "partnership.json", label: "Partnership Index", provider: "Geo Desk composite", days: 1, cadence: "daily" },
  { file: "scorecard.json", label: "Country scorecard", provider: "Geo Desk composite", days: 1, cadence: "daily" }, { file: "deals.json", label: "UAE deal headlines", provider: "WAM", days: 1, cadence: "daily" }, { file: "visits.json", label: "Visits and meetings", provider: "WAM", days: 1, cadence: "daily" },
  { file: "agreements.json", label: "Agreements and CEPA", provider: "MOFA, MOFT", days: 1, cadence: "daily" }, { file: "missions.json", label: "Missions directory", provider: "MOFA", days: 1, cadence: "daily" }, { file: "flights.json", label: "Direct flights", provider: "UAE airports", days: 1, cadence: "daily" },
  { file: "investment.json", label: "UAE investment position", provider: "IMF CDIS", days: 1, cadence: "daily" }, { file: "leverage.json", label: "Leverage and exposure", provider: "Geo Desk composite", days: 1, cadence: "daily" }, { file: "rivals.json", label: "Rival powers' trade weight", provider: "IMF IMTS, World Bank", days: 1, cadence: "daily" },
  { file: "temperature.json", label: "Bilateral event tone", provider: "GDELT", days: 1, cadence: "daily" }, { file: "media-tone.json", label: "Media tone", provider: "GDELT", days: 1, cadence: "daily" }, { file: "sanctions.json", label: "Sanctions lists", provider: "OFAC, UN", days: 7, cadence: "weekly" },
  { file: "ransomware.json", label: "Ransomware postings", provider: "ransomware.live", days: 7, cadence: "weekly" }, { file: "governance.json", label: "Governance indicators", provider: "World Bank WGI", days: 30, cadence: "monthly" }, { file: "leaders.json", label: "Leaders and elections", provider: "Wikidata", days: 30, cadence: "monthly" },
  { file: "uae-aid.json", label: "UAE humanitarian funding", provider: "OCHA FTS", days: 30, cadence: "monthly" }, { file: "orgs.json", label: "Organisation memberships", provider: "Wikidata, organisations", days: 30, cadence: "monthly" },
];
export async function sourceHealth(now = new Date()): Promise<SourceHealth[]> {
  return Promise.all(SOURCES.map(async (s) => {
    const d = await rd<{ built?: string }>(s.file); let builtAt = d && typeof d === "object" && !Array.isArray(d) ? d.built ?? null : null;
    if (!builtAt) { try { builtAt = (await stat(path.join(process.cwd(), "public/data", s.file))).mtime.toISOString(); } catch { builtAt = null; } }
    const ageDays = builtAt ? Math.max(0, (now.getTime() - Date.parse(builtAt)) / 86400e3) : null;
    const state: SourceState = ageDays == null ? "missing" : ageDays <= s.days * 1.5 + 0.5 ? "current" : ageDays <= s.days * 3 + 1 ? "due" : "stale";
    return { file: s.file, label: s.label, builtAt, ageDays: ageDays == null ? null : Math.round(ageDays * 10) / 10, cadenceDays: s.days, state, cadence: s.cadence, provider: s.provider };
  }));
}

type Ind = Record<number, number>; const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const pick = (s: Ind | undefined, a: number, b: number) => (s ? Array.from({ length: b - a + 1 }, (_, i) => s[a + i]).filter((v): v is number => typeof v === "number" && isFinite(v)) : []);

let memo: { at: number; v: WorldModel } | null = null;
export async function worldModel(): Promise<WorldModel> {
  if (memo && Date.now() - memo.at < 600_000) return memo.v;
  const now = new Date(); const Y = now.getFullYear(); const today = now.toISOString().slice(0, 10); const cut = (d: number) => new Date(now.getTime() - d * 86400e3).toISOString().slice(0, 10);
  const [cs, rg, sc, ol, tr, gv, sn, rw, tp, dl, vs, ld, pi] = await Promise.all([
    rd<{ iso3: string; name: string; nameAr: string | null; flag: string; population?: { v: number } }[]>("countries.json"), rd<{ countries: Record<string, { region: string; subregion: string | null }> }>("regions.json"),
    rd<{ countries: Record<string, { dims: Record<string, { score: number | null; parts: { k: string; s: number }[] }> }> }>("scorecard.json"), rd<{ countries: Record<string, OutlookRec> }>("outlook.json"), rd<TradeData>("trade.json"),
    rd<{ countries: Record<string, Record<string, number>> }>("governance.json"), rd<{ countries: Record<string, { ofac: number; un: number }> }>("sanctions.json"), rd<{ countries: Record<string, { n30: number }> }>("ransomware.json"),
    rd<{ countries: Record<string, { g: number; trend?: number }> }>("temperature.json"), rd<{ items: { c: string[]; d: string }[] }>("deals.json"), rd<{ items: { c: string[]; d: string; l: number }[] }>("visits.json"),
    rd<{ countries: Record<string, { elections?: { label: string; date: string }[] }> }>("leaders.json"), rd<{ countries: Record<string, { score: number }> }>("partnership.json"),
  ]);
  const sources = await sourceHealth(now); const built = (f: string) => sources.find((s) => s.file === f)?.builtAt ?? null;
  const gdpNow = (iso: string) => { const g = ol?.countries[iso]?.gdp; return g?.[Y - 1] ?? g?.[Y - 2] ?? null; };
  const gdps = (cs ?? []).map((c) => gdpNow(c.iso3)).filter((v): v is number => v != null).sort((a, b) => a - b); const gdpPct = (v: number) => (gdps.length ? (gdps.filter((x) => x <= v).length / gdps.length) * 100 : 0);
  const lastSenior: Record<string, string> = {}; for (const x of vs?.items ?? []) if (x.l >= 2) for (const c of x.c) if (!lastSenior[c] || x.d > lastSenior[c]) lastSenior[c] = x.d;
  const dealN: Record<string, [number, number]> = {}; for (const x of dl?.items ?? []) for (const c of x.c) { const e = (dealN[c] ??= [0, 0]); if (x.d >= cut(365)) e[1]++; if (x.d >= cut(90)) e[0]++; }
  const countries: WorldCountry[] = [];
  for (const c of cs ?? []) {
    const iso = c.iso3; if (iso === "ARE") continue; const dims = sc?.countries[iso]?.dims; const part = (k: string) => { for (const d of Object.values(dims ?? {})) { const x = d.parts.find((p) => p.k === k); if (x) return x.s; } return null; };
    const o = ol?.countries[iso]; const gdp = gdpNow(iso); const g = gv?.countries[iso]; const pv = g?.pv ?? null;
    // exposure: how much the UAE already has at stake there, the mean percentile of six parts (trade, investment, deals, logistics, share of trade, connectivity) with a missing part counted as zero
    const EXP = ["trade", "invest", "deals", "logi", "share", "connect"]; const ex = EXP.map(part).filter((v): v is number => v != null); const exposure = ex.length ? Math.round(ex.reduce((a, b) => a + b, 0) / EXP.length) : null; // a part with no record counts as no stake, so a country known only by flights does not look exposed
    const gProj = mean(pick(o?.growth, Y, Y + 2)); const gdpEnd = o?.gdp?.[Y + 5]; const ts = tr ? tradeSummary(tr, iso) : null; const dn = dealN[iso]; const pace = dn && dn[1] > 0 ? (dn[0] * 4) / dn[1] : null;
    const debt = o?.debt?.[Y - 1] ?? o?.debt?.[Y] ?? null; const infl = o?.inflation?.[Y - 1] ?? o?.inflation?.[Y] ?? null; const ca = mean(pick(o?.ca, Y, Y + 2));
    const fiscalParts = [debt != null ? scale(debt, 40, 120) : null, infl != null ? scale(infl, 3, 25) : null, ca != null ? scale(ca, 2, -10) : null].filter((v): v is number => v != null);
    const sec = dims?.security?.score ?? null; const el = (ld?.countries[iso]?.elections ?? []).map((e) => Math.round((Date.parse(e.date.replace(/-00$/, "-15")) - now.getTime()) / 86400e3)).filter((d) => d >= 0).sort((a, b) => a - b)[0];
    const tone = tp?.countries[iso]?.trend; const gapDays = lastSenior[iso] ? Math.round((now.getTime() - Date.parse(lastSenior[iso])) / 86400e3) : null;
    const driftParts = [tone != null ? scale(tone, 0.3, -0.7) : null, gapDays != null ? scale(gapDays, 90, 540) : null].filter((v): v is number => v != null);
    const momentumParts = [ts?.yoy != null ? scale(ts.yoy, -20, 30) : null, pace != null ? scale(pace, 0, 2) : null].filter((v): v is number => v != null);
    const comp: Components = {
      exposure,
      opp: { growth: gProj != null ? scale(gProj, 0, 8) : null, market: gdp && gdpEnd ? scale(gdpEnd / gdp, 1, 2) : null, ties: pi?.countries[iso]?.score ?? null, headroom: gdp ? Math.round((gdpPct(gdp) * (100 - (exposure ?? 0))) / 100) : null, momentum: momentumParts.length ? Math.round(mean(momentumParts)!) : null },
      risk: { governance: pv != null ? 100 - pv : null, fiscal: fiscalParts.length ? Math.round(mean(fiscalParts)!) : null, security: sec != null ? 100 - sec : null, calendar: el == null ? null : el <= 180 ? 100 : el <= 365 ? 60 : el <= 730 ? 25 : 0, drift: driftParts.length ? Math.round(mean(driftParts)!) : null },
    };
    // early-warning indicators: each has a written threshold, so a trigger can be checked by hand; severity rises with the size of the breach
    const w: Warning[] = []; const add = (x: Omit<Warning, "id" | "builtAt">, file: string) => w.push({ id: `${iso}-${x.label}`, builtAt: built(file), ...x });
    const dBase = mean(pick(o?.debt, Y - 6, Y - 2)); const iBase = mean(pick(o?.inflation, Y - 6, Y - 2));
    if (debt != null && debt >= 90) add({ label: "Public debt", value: `${debt.toFixed(0)}% of GDP`, threshold: "90% of GDP", baseline: dBase != null ? `${Y - 6} to ${Y - 2} average ${dBase.toFixed(0)}%` : null, sev: debt >= 110 ? 3 : 2, src: "IMF WEO", impact: "Sovereign stress can reach UAE deposits, loans and equity.", freq: "Weekly" }, "outlook.json");
    if (infl != null && infl >= 10) add({ label: "Inflation", value: `${infl.toFixed(1)}%`, threshold: "10%", baseline: iBase != null ? `${Y - 6} to ${Y - 2} average ${iBase.toFixed(1)}%` : null, sev: infl >= 20 ? 3 : 2, src: "IMF WEO", impact: "Currency and subsidy pressure; strain on UAE-owned assets priced in local currency.", freq: "Monthly" }, "outlook.json");
    if (ca != null && ca <= -5) add({ label: "Current-account deficit", value: `${ca.toFixed(1)}% of GDP`, threshold: "-5% of GDP", baseline: null, sev: ca <= -8 ? 3 : 2, src: "IMF WEO", impact: "Dependence on outside financing: a request for Gulf support is more likely.", freq: "Monthly" }, "outlook.json");
    if (pv != null && pv < 25) add({ label: "Political stability", value: `${pv.toFixed(0)}/100`, threshold: "below 25/100", baseline: null, sev: pv < 10 ? 3 : 2, src: `World Bank WGI ${g?.y ?? ""}`.trim(), impact: "Risk to UAE nationals, projects and access.", freq: "Quarterly" }, "governance.json");
    const sa = sn?.countries[iso]; const sNum = sa ? sa.ofac + sa.un : null; if (sNum != null && sNum >= 50) add({ label: "Sanctions-list entries", value: `${sNum} with an address there`, threshold: "50 entries", baseline: null, sev: sNum >= 200 ? 2 : 1, src: "OFAC, UN", impact: "Compliance and secondary-sanctions exposure for UAE firms.", freq: "Weekly" }, "sanctions.json");
    const rn = rw?.countries[iso]?.n30; if (rn != null && rn >= 20) add({ label: "Ransomware postings", value: `${rn} in 30 days`, threshold: "20 in 30 days", baseline: null, sev: 1, src: "ransomware.live", impact: "Cyber exposure of counterparties and shared infrastructure.", freq: "Weekly" }, "ransomware.json");
    if (el != null && el <= 180) add({ label: "Election window", value: `in ${el} days`, threshold: "within 180 days", baseline: null, sev: 1, src: "Wikidata", impact: "Policy toward the UAE can shift; deals may pause.", freq: "Weekly" }, "leaders.json");
    if (tone != null && tone <= -0.5) add({ label: "Bilateral tone falling", value: `trend ${tone.toFixed(2)}`, threshold: "trend -0.5 or worse", baseline: tp?.countries[iso]?.g != null ? `average tone ${tp.countries[iso].g.toFixed(2)}` : null, sev: 1, src: "GDELT", impact: "Early sign of a cooling relationship; machine-coded news, verify before acting.", freq: "Daily" }, "temperature.json");
    if (gapDays != null && gapDays >= 365 && (exposure ?? 0) >= 40) add({ label: "No senior contact", value: `${gapDays} days`, threshold: "365 days at 40+ exposure", baseline: null, sev: 1, src: "WAM headlines", impact: "A relationship with real UAE stakes is drifting without ministerial attention.", freq: "Monthly" }, "visits.json");
    if (dn && dn[1] >= 4 && dn[0] * 4 <= dn[1] * 0.3) add({ label: "Deal pace collapsed", value: `${dn[0]} in 90 days against ${dn[1]} in a year`, threshold: "quarter at 30% of the yearly rate or less", baseline: null, sev: 1, src: "WAM headlines", impact: "UAE commercial momentum has stalled; announcements, not transactions.", freq: "Monthly" }, "deals.json");
    const r = rg?.countries[iso];
    countries.push({ iso3: iso, name: c.name, nameAr: c.nameAr ?? null, region: r?.region ?? "Other", subregion: r?.subregion ?? null, flag: c.flag, pop: c.population?.v ?? null, c: comp, warnings: w, gdpUsd: gdp });
  }
  const v: WorldModel = { asOf: today, countries, sources, note: "Computed from the app's datasets on each build date: scheduled and event-triggered refreshes, not continuous monitoring. Scores place countries against each other; they are not predictions." };
  memo = { at: Date.now(), v }; return v;
}
