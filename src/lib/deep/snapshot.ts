import { sectorLabel } from "../regions";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cached } from "@/lib/layers/cache";
import { PEER_SETS, PEERS_DECLARED } from "./peers";
import { toAr } from "./reading-ar";
import { clamp01, prioritise, type ExpRow, type Priority } from "./exposure-core";
import { at, backtest, hhiBand, hhiSeries, interval, kindOf, METHODS, opportunityScreen, partnerHhi, pct, qualify, years, zOf, type Backtest, type Kind, type Method, type Screen, type Series, type SeriesKey, type TradeBook, type TradeRow } from "./econ-core";

// One server-side computation of everything the Deep Intelligence tabs read: macro series with baselines and backtests, financial conditions, trade concentration and the opportunity screen, investment positions, the UAE exposure register,
// predeclared peer benchmarks, indicator readings and the IMF vintage store. Ingest once, reuse across tabs: the tabs and the analyst council all read this one object, so a figure is calculated once and means the same everywhere.
type Dict = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const rd = async <T,>(f: string): Promise<T | null> => { try { return JSON.parse(await readFile(path.join(process.cwd(), "public/data", f), "utf8")) as T; } catch { return null; } };
export type State = "ok" | "watch" | "alert" | "na";
export type Reading = { id: string; display: string; displayAr: string; value: number | null; asOf: string | null; state: State; note: string };
export type FcRow = { year: number; kind: Kind; imf: number | null; point: number | null; lo: number | null; hi: number | null; n: number };
export type FcBlock = { key: SeriesKey; method: Method | null; bt: Pick<Backtest, "n" | "mae" | "mase" | "best" | "from" | "to">; rows: FcRow[]; status: ReturnType<typeof qualify>; level: number };
export type BenchRow = { key: string; en: string; ar: string; unit: string; uae: { v: number | null; y: number | null; d3: number | null }; peers: { iso: string; name: string; v: number | null; y: number | null; d3: number | null }[]; median: number | null; gap: number | null; ref: { v: number; en: string; ar: string } | null; higherIsBetter: boolean | null };
export type Snapshot = {
  asOf: string; y0: number; iso3: string | null; name: string | null;
  builds: { file: string; built: string | null; note?: string }[];
  macro: { ARE: Partial<Record<SeriesKey, Series>>; other: Partial<Record<SeriesKey, Series>> | null };
  forecasts: { ARE: FcBlock[]; other: FcBlock[] | null };
  fin: { ARE: Dict | null; other: Dict | null; names: Record<string, string>; coverage: Record<string, number>; rank: Record<string, { rank: number; n: number; pct: number | null }> };
  trade: { lastYear: number; asOfQuarter: string | null; world: TradeRow; xHhi: { year: number; hhi: number | null; partners: number; coverage: number | null }[]; mHhi: { year: number; hhi: number | null; partners: number; coverage: number | null }[]; topX: { iso: string; share: number }[]; topM: { iso: string; share: number }[]; partner: (TradeRow & { shareX: number | null; shareM: number | null; growthX: number | null; growthM: number | null }) | null; screen: Screen[]; screenN: number; partnerScreen: Screen | null } | null;
  invest: { worldUsd: number | null; year: number | null; partner: Dict | null; deals: { total: number; bySector: Record<string, number> } } | null;
  exposure: { rows: ExpRow[]; priority: Priority } | null;
  counterpart: { gov: Dict | null; partnership: { score: number; rank: number; n: number } | null; quadrant: string | null; region: string | null } | null;
  bench: { declared: string; sets: { id: string; rows: BenchRow[] }[] };
  readings: Reading[];
  vintage: { n: number; taken: string[]; revisions: { key: string; year: number; from: number; to: number; d: number; between: [string, string] }[] };
  names: Record<string, string>; gaps: string[];
};

const MACRO_KEYS: SeriesKey[] = ["growth", "inflation", "ca", "debt", "gdp", "unemployment"];
const pick = (o: Dict | undefined, keys: SeriesKey[]) => { const out: Partial<Record<SeriesKey, Series>> = {}; for (const k of keys) if (o?.[k] && Object.keys(o[k]).length) out[k] = o[k]; return out; };
const f1 = (v: number | null, d = 1) => (v == null ? "n/a" : v.toFixed(d));
const state = (x: boolean | null, w: boolean | null = false): State => (x == null ? "na" : x ? "alert" : w ? "watch" : "ok");

/** Baseline forecasts for the current year and the next two, issued from the latest year on file (the IMF estimate for y0-1). The method is the one with the lowest one-year-ahead backtest error; each horizon's interval comes from that method's own errors at that horizon, so the interval widens with the horizon when the sample allows. */
function forecastBlocks(m: Partial<Record<SeriesKey, Series>>, y0: number): FcBlock[] {
  const out: FcBlock[] = [];
  for (const key of ["growth", "inflation", "ca", "debt"] as SeriesKey[]) {
    const s = m[key]; if (!s) continue; const bt = backtest(s, y0 - 1, 1); const method = bt.best; const hist = years(s).filter((y) => y <= y0 - 1).map((y) => s[y]);
    const rows: FcRow[] = [y0, y0 + 1, y0 + 2].map((year) => { const p = method ? METHODS[method].f(hist) : null; const h = backtest(s, y0 - 1, year - (y0 - 1)); const iv = p != null && method ? interval(p, h.errors[method]) : null; return { year, kind: kindOf(year, y0), imf: at(s, year), point: p, lo: iv?.lo ?? null, hi: iv?.hi ?? null, n: iv?.n ?? (method ? h.errors[method].length : 0) }; });
    out.push({ key, method, bt: { n: bt.n, mae: bt.mae, mase: bt.mase, best: bt.best, from: bt.from, to: bt.to }, rows, level: 0.8, status: qualify(null, method ? bt.mae[method] : null, bt.n) });
  }
  return out;
}
const lastOf = (s: Series | undefined, upTo: number) => { const ys = years(s).filter((y) => y <= upTo); const y = ys[ys.length - 1]; return y == null ? null : { v: s![y], y }; };
const finLast = (f: Dict | undefined, k: string) => (f?.[k] ? { v: f[k].v as number, y: f[k].y as number, s: f[k].s as [number, number][] } : null);

export const loadSnapshot = (iso3: string | null) => cached<Snapshot>(`deep:snapshot:${iso3 ?? "-"}`, 600_000, () => buildSnapshot(iso3, new Date())).then((r) => r.value);
export async function buildSnapshot(iso3: string | null, now: Date): Promise<Snapshot> {
  const y0 = now.getUTCFullYear(); const gaps: string[] = [];
  const [outlook, fin, trade, gov, inv, vint, countries, lev, part, flights, agree, sanc, ransom, deals, mis] = await Promise.all([rd<Dict>("outlook.json"), rd<Dict>("finconditions.json"), rd<TradeBook & { built: string }>("trade.json"), rd<Dict>("governance.json"), rd<Dict>("investment.json"), rd<Dict>("vintages/weo.json"),
    rd<{ iso3: string; name: string; nameAr?: string | null }[]>("countries.json"), rd<Dict>("leverage.json"), rd<Dict>("partnership.json"), rd<Dict>("flights.json"), rd<Dict>("agreements.json"), rd<Dict>("sanctions.json"), rd<Dict>("ransomware.json"), rd<Dict>("deals.json"), rd<Dict>("missions.json")]);
  const names: Record<string, string> = Object.fromEntries((countries ?? []).map((c) => [c.iso3, c.name])); const name = iso3 ? names[iso3] ?? null : null;
  if (!outlook) gaps.push("The IMF outlook file is missing."); if (!fin) gaps.push("The financial-conditions file is missing (run scripts/build-finconditions.mjs)."); if (!trade) gaps.push("The trade file is missing."); if (!gov) gaps.push("The governance file is missing.");
  const O = (outlook?.countries ?? {}) as Dict; const F = (fin?.countries ?? {}) as Dict; const G = (gov?.countries ?? {}) as Dict;
  const macroA = pick(O.ARE, MACRO_KEYS); const macroB = iso3 ? pick(O[iso3], MACRO_KEYS) : null; if (iso3 && macroB && !Object.keys(macroB).length) gaps.push(`No IMF outlook for ${name ?? iso3}.`);
  const fcA = forecastBlocks(macroA, y0); const fcB = macroB ? forecastBlocks(macroB, y0) : null;

  // trade: concentration by year, top partners, the chosen partner, and the opportunity screen
  let tradeOut: Snapshot["trade"] = null;
  if (trade) {
    const screenFull = opportunityScreen(trade, O, G, trade.lastYear); const ly = trade.lastYear; const wX = hhiSeries(trade, "x").map((r) => ({ ...r, top: undefined })); const wM = hhiSeries(trade, "m").map((r) => ({ ...r, top: undefined }));
    const tp = (flow: "x" | "m") => partnerHhi(trade, ly, flow).top; const row = iso3 ? trade.countries[iso3] : null; const wt = trade.world.ttm;
    const gr = (c: { x: number; m: number } | undefined, p: { x: number; m: number } | undefined, k: "x" | "m") => (c && p && p[k] > 0 ? (c[k] / p[k] - 1) * 100 : null);
    const partner = row ? { ...row, shareX: wt && row.ttm ? (row.ttm.x / wt.x) * 100 : null, shareM: wt && row.ttm ? (row.ttm.m / wt.m) * 100 : null, growthX: gr(row.ttm, row.prev, "x"), growthM: gr(row.ttm, row.prev, "m") } : null;
    tradeOut = { lastYear: ly, asOfQuarter: trade.asOfQuarter ?? null, world: trade.world, xHhi: wX, mHhi: wM, topX: tp("x"), topM: tp("m"), partner, screen: screenFull.slice(0, 25), screenN: screenFull.length, partnerScreen: iso3 ? screenFull.find((r) => r.iso === iso3) ?? null : null };
  }
  // investment positions and announced deals (kept apart: a position is a stock held, a deal is an announcement)
  const bySector: Record<string, number> = {}; let dealTotal = 0;
  if (iso3 && deals) for (const d of deals.items ?? []) if ((d.c ?? []).includes(iso3)) { dealTotal++; bySector[d.sector ?? "other"] = (bySector[d.sector ?? "other"] ?? 0) + 1; }
  const investOut: Snapshot["invest"] = inv ? { worldUsd: inv.world?.usd ?? null, year: inv.world?.year ?? null, partner: iso3 ? inv.countries?.[iso3] ?? null : null, deals: { total: dealTotal, bySector } } : null;

  // exposure register for the chosen country
  let exposure: Snapshot["exposure"] = null;
  if (iso3) {
    const rows: ExpRow[] = []; const L = lev?.countries?.[iso3]; const P = part?.countries?.[iso3]; const Fl = flights?.countries?.[iso3]; const Ag = agree?.countries?.[iso3]; const Mi = mis?.countries?.[iso3]; const nm = name ?? iso3; const nmAr = (countries ?? []).find((c) => c.iso3 === iso3)?.nameAr ?? nm;
    const T = (en: string, ar: string) => ({ en, ar });
    const add = (r: ExpRow) => rows.push(r);
    const tradeUsd = L?.raw?.bilateral; const shareUaeTrade = L?.raw?.shareUaeTrade;
    add({ id: "trade", dim: T("Goods trade with the UAE", "التجارة السلعية مع الإمارات"), kind: "dependency", value: tradeUsd != null ? T(`US$${(tradeUsd).toLocaleString("en-US")}m, ${f1(shareUaeTrade, 2)}% of all UAE goods trade (includes re-exports)`, `${tradeUsd.toLocaleString("en-US")} مليون دولار، ${f1(shareUaeTrade, 2)}% من تجارة الإمارات السلعية (تشمل إعادة التصدير)`) : null, magnitude: shareUaeTrade != null ? clamp01(shareUaeTrade / 10) : null, scale: T("share of UAE goods trade; 10% or more counts as 1", "حصة من تجارة الإمارات السلعية؛ 10% فأكثر تساوي 1"), conf: shareUaeTrade != null ? "medium" : "unknown", src: "IMF IMTS, UAE as reporter", asOf: String(trade?.lastYear ?? ""), note: T("Customs data includes re-exports, so it overstates domestic production exposure.", "بيانات الجمارك تشمل إعادة التصدير فتبالغ في انكشاف الإنتاج المحلي.") });
    add({ id: "uaeshare", dim: T(`The UAE's weight in ${nm}'s trade`, `وزن الإمارات في تجارة ${nmAr}`), kind: "opportunity", value: L?.raw?.uaeSharePartnerTrade != null ? T(`${f1(L.raw.uaeSharePartnerTrade, 1)}% of ${nm}'s merchandise trade`, `${f1(L.raw.uaeSharePartnerTrade, 1)}% من تجارة ${nmAr} السلعية`) : null, magnitude: L?.raw?.uaeSharePartnerTrade != null ? clamp01(L.raw.uaeSharePartnerTrade / 15) : null, scale: T("share of the partner's trade; 15% or more counts as 1", "حصة من تجارة الشريك؛ 15% فأكثر تساوي 1"), conf: L?.raw?.uaeSharePartnerTrade != null ? "medium" : "unknown", src: "Leverage dataset (customs data)", asOf: lev?.year ? String(lev.year) : null, note: L?.quadrant ? T(`Leverage reading: ${String(L.quadrant).replace("-", " ")}.`, `قراءة النفوذ: ${String(L.quadrant)}.`) : undefined });
    const outw = inv?.countries?.[iso3]?.outward; const rankO = outw?.rank;
    add({ id: "invest", dim: T("UAE direct-investment position there", "مركز استثمار الإمارات المباشر هناك"), kind: "dependency", value: outw ? T(`US$${(outw.usd / 1e9).toFixed(1)}bn net outward position (${outw.year})${rankO ? `, #${rankO} destination` : ""}`, `${(outw.usd / 1e9).toFixed(1)} مليار دولار مركز صافٍ خارجي (${outw.year})${rankO ? `، الوجهة رقم ${rankO}` : ""}`) : null, magnitude: outw && inv?.world?.usd ? clamp01(outw.usd / (inv.world.usd * 0.1)) : null, scale: T("share of the UAE's world position; 10% or more counts as 1", "حصة من مركز الإمارات العالمي؛ 10% فأكثر تساوي 1"), conf: outw ? "medium" : "unknown", src: "IMF Direct Investment Positions", asOf: outw ? String(outw.year) : null, note: T("A stock held, not a flow; derived from counterparty reports and net of liabilities.", "رصيد محتفظ به لا تدفق؛ مشتق من تقارير الأطراف المقابلة وصافٍ من الالتزامات.") });
    const nd = dealTotal; add({ id: "deals", dim: T("Announced UAE company deals", "صفقات الشركات الإماراتية المعلنة"), kind: "opportunity", value: T(`${nd} announced deal headline(s) in the WAM-based feed${nd ? `: ${Object.entries(bySector).map(([k, v]) => `${k} ${v}`).join(", ")}` : ""}`, `${nd} عنوان صفقة معلنة في التغذية المستندة إلى وام${nd ? `: ${Object.entries(bySector).map(([k, v]) => `${sectorLabel(k, "ar")} ${v}`).join("، ")}` : ""}`), magnitude: clamp01(nd / 20), scale: T("announcements; 20 or more counts as 1", "إعلانات؛ 20 فأكثر تساوي 1"), conf: "low", src: "WAM headlines, classified by rules", asOf: deals?.built?.slice(0, 10) ?? null, note: T("Announcements are not completed investment and are weighted low.", "الإعلانات ليست استثمارًا منجزًا ووزنها منخفض.") });
    const nDest = Fl ? (Fl.destinations ?? []).filter((d: Dict) => d.status === "active" || d.status === "seasonal").length : null;
    add({ id: "air", dim: T("Direct air links from UAE airports", "الروابط الجوية المباشرة من مطارات الإمارات"), kind: "presence", value: nDest != null ? T(`${nDest} destination(s) active or seasonal`, `${nDest} وجهة نشطة أو موسمية`) : null, magnitude: nDest != null ? clamp01(nDest / 8) : null, scale: T("active destinations; 8 or more counts as 1", "وجهات نشطة؛ 8 فأكثر تساوي 1"), conf: nDest != null ? "high" : "unknown", src: "Flights dataset", asOf: flights?.built?.slice(0, 10) ?? null });
    const nAg = Ag ? [...(Ag.mofa ?? []), ...(Ag.moft ?? [])].length : null;
    add({ id: "agree", dim: T("UAE agreements on record", "اتفاقيات الإمارات المسجلة"), kind: "presence", value: nAg != null ? T(`${nAg} instrument(s) in MOFA and MOFT lists${Ag?.cepa ? `; CEPA ${Ag.cepa.status}${Ag.cepa.inForce ? ` (in force ${Ag.cepa.inForce})` : ""}` : ""}`, `${nAg} صك في قوائم الخارجية والتجارة الخارجية${Ag?.cepa ? `؛ اتفاقية الشراكة: ${Ag.cepa.status}` : ""}`) : null, magnitude: nAg != null ? clamp01(nAg / 30) : null, scale: T("instruments; 30 or more counts as 1", "صكوك؛ 30 فأكثر تساوي 1"), conf: nAg != null ? "high" : "unknown", src: "MOFA and MOFT directories", asOf: agree?.built?.slice(0, 10) ?? null });
    add({ id: "missions", dim: T("UAE diplomatic presence", "الحضور الدبلوماسي الإماراتي"), kind: "presence", value: Mi ? T(`${Mi.length} mission(s)`, `${Mi.length} بعثة`) : T("none on record", "لا بعثات مسجلة"), magnitude: Mi ? clamp01(Mi.length / 2) : 0, scale: T("missions; 2 or more counts as 1", "بعثات؛ 2 فأكثر تساوي 1"), conf: "medium", src: "MOFA directory", asOf: mis?.built?.slice(0, 10) ?? null });
    const sUN = sanc?.countries?.[iso3]; const rw = ransom?.countries?.[iso3];
    add({ id: "sanctions", dim: T("Sanctions-list entries naming the country", "مدخلات قوائم العقوبات التي تسمي الدولة"), kind: "risk", value: sUN ? T(`OFAC ${sUN.ofac ?? 0}, UN ${sUN.un ?? 0}`, `أوفاك ${sUN.ofac ?? 0}، الأمم المتحدة ${sUN.un ?? 0}`) : T("none counted", "لا مدخلات محتسبة"), magnitude: sUN ? clamp01(((sUN.ofac ?? 0) + (sUN.un ?? 0)) / 100) : 0, scale: T("entries; 100 or more counts as 1", "مدخلات؛ 100 فأكثر تساوي 1"), conf: "medium", src: "OFAC and UN consolidated lists", asOf: sanc?.built?.slice(0, 10) ?? null, note: T("A count of entries is a screening flag, not a legal finding.", "عدد المدخلات علامة فرز لا حكم قانوني.") });
    add({ id: "cyber", dim: T("Ransomware leak-site postings naming organisations there", "منشورات ابتزاز الفدية التي تسمي منظمات هناك"), kind: "risk", value: rw ? T(`${rw.n90} in 90 days`, `${rw.n90} في 90 يومًا`) : T("none counted", "لا منشورات محتسبة"), magnitude: rw ? clamp01(rw.n90 / 60) : 0, scale: T("postings in 90 days; 60 or more counts as 1", "منشورات في 90 يومًا؛ 60 فأكثر تساوي 1"), conf: "low", src: "ransomware.live", asOf: ransom?.built?.slice(0, 10) ?? null });
    add({ id: "sector", dim: T("Commodity and sector dependency (UAE input or output sourced there)", "الاعتماد السلعي والقطاعي (مدخل أو مخرج إماراتي مصدره هناك)"), kind: "dependency", value: null, magnitude: null, scale: T("needs product-level trade", "يحتاج تجارة بمستوى المنتج"), conf: "unknown", src: "Not connected", asOf: null, note: T("Unknown, not zero: the desk holds no product-level trade, so this row lowers the confidence of the priority instead of lowering its score.", "غير معروف لا صفر: لا تحتفظ اللوحة بتجارة بمستوى المنتج فيخفض هذا الصف ثقة الأولوية لا درجتها.") });
    void P; exposure = { rows, priority: prioritise(rows) };
  }

  const counterpart = iso3 ? { gov: G[iso3] ?? null, partnership: part?.countries?.[iso3] ? { score: part.countries[iso3].score as number, rank: part.countries[iso3].rank as number, n: part.n as number } : null, quadrant: (lev?.countries?.[iso3]?.quadrant as string | undefined) ?? null, region: ((countries ?? []) as { iso3: string; region?: string }[]).find((c) => c.iso3 === iso3)?.region ?? null } : null;
  // predeclared peer benchmarks
  const METRICS: { key: string; en: string; ar: string; unit: string; pick: (iso: string) => { v: number; y: number } | null; ref: BenchRow["ref"]; better: boolean | null }[] = [
    { key: "growth", en: "Real GDP growth", ar: "نمو الناتج الحقيقي", unit: "%", pick: (i) => lastOf(O[i]?.growth, y0 - 1), ref: null, better: true },
    { key: "inflation", en: "Inflation", ar: "التضخم", unit: "%", pick: (i) => lastOf(O[i]?.inflation, y0 - 1), ref: { v: 2, en: "2%: a common price-stability reference, not a UAE target", ar: "2%: مرجع شائع لاستقرار الأسعار، لا هدف للإمارات" }, better: false },
    { key: "ca", en: "Current account", ar: "الحساب الجاري", unit: "% of GDP", pick: (i) => lastOf(O[i]?.ca, y0 - 1), ref: { v: 0, en: "0: balance", ar: "0: توازن" }, better: true },
    { key: "debt", en: "Government gross debt", ar: "الدين الحكومي الإجمالي", unit: "% of GDP", pick: (i) => lastOf(O[i]?.debt, y0 - 1), ref: { v: 60, en: "60% of GDP: a common reference level, not a UAE limit", ar: "60% من الناتج: مستوى مرجعي شائع لا حد للإمارات" }, better: false },
    { key: "credit", en: "Private credit", ar: "الائتمان الخاص", unit: "% of GDP", pick: (i) => finLast(F[i], "credit"), ref: null, better: null },
    { key: "npl", en: "Non-performing loans", ar: "القروض المتعثرة", unit: "% of loans", pick: (i) => finLast(F[i], "npl"), ref: { v: 5, en: "5%: a common watch level", ar: "5%: مستوى مراقبة شائع" }, better: false },
    { key: "resMonths", en: "Reserves, months of imports", ar: "الاحتياطيات بأشهر الواردات", unit: "months", pick: (i) => finLast(F[i], "resMonths"), ref: { v: 3, en: "3 months: a common adequacy reference", ar: "3 أشهر: مرجع كفاية شائع" }, better: true },
    { key: "rq", en: "Regulatory quality", ar: "جودة التنظيم", unit: "score 0-100", pick: (i) => (G[i]?.rq != null ? { v: G[i].rq, y: G[i].y } : null), ref: null, better: true },
    { key: "ge", en: "Government effectiveness", ar: "فاعلية الحكومة", unit: "score 0-100", pick: (i) => (G[i]?.ge != null ? { v: G[i].ge, y: G[i].y } : null), ref: null, better: true },
  ];
  const d3 = (i: string, key: string) => { const s = key === "credit" || key === "npl" || key === "resMonths" ? (F[i]?.[key]?.s as [number, number][] | undefined) : null; if (s?.length) { const l = s[s.length - 1]; const p = s.find((r) => r[0] === l[0] - 3); return p ? l[1] - p[1] : null; } const ser = O[i]?.[key] as Series | undefined; if (!ser || !["growth", "inflation", "ca", "debt"].includes(key)) return null; const a = lastOf(ser, y0 - 1); const b = a ? at(ser, a.y - 3) : null; return a && b != null ? a.v - b : null; };
  const benchSets = PEER_SETS.map((ps) => ({ id: ps.id, rows: METRICS.map((m): BenchRow => { const u = m.pick("ARE"); const peers = ps.members.map((i) => { const p = m.pick(i); return { iso: i, name: names[i] ?? i, v: p?.v ?? null, y: p?.y ?? null, d3: d3(i, m.key) }; }); const vs = peers.map((p) => p.v).filter((x): x is number => x != null).sort((a, b) => a - b); const med = vs.length ? (vs.length % 2 ? vs[(vs.length - 1) / 2] : (vs[vs.length / 2 - 1] + vs[vs.length / 2]) / 2) : null;
    return { key: m.key, en: m.en, ar: m.ar, unit: m.unit, uae: { v: u?.v ?? null, y: u?.y ?? null, d3: d3("ARE", m.key) }, peers, median: med, gap: u && med != null ? u.v - med : null, ref: m.ref, higherIsBetter: m.better }; }) }));

  // vintage store: how the IMF's projections moved between snapshots taken by this desk
  const snaps = (vint?.snapshots ?? []) as { taken: string; y0: number; data: Dict }[]; const revisions: Snapshot["vintage"]["revisions"] = [];
  if (snaps.length >= 2) { const a = snaps[snaps.length - 2]; const b = snaps[snaps.length - 1]; for (const k of ["growth", "inflation", "ca", "debt"]) { const sa = a.data?.ARE?.[k] as (number | null)[] | undefined; const sb = b.data?.ARE?.[k] as (number | null)[] | undefined; if (!sa || !sb || a.y0 !== b.y0) continue; for (let j = 0; j < 3; j++) if (sa[j] != null && sb[j] != null && sa[j] !== sb[j]) revisions.push({ key: k, year: b.y0 + j, from: sa[j]!, to: sb[j]!, d: Math.round((sb[j]! - sa[j]!) * 100) / 100, between: [a.taken, b.taken] }); } }

  // indicator readings (UAE, plus the chosen partner for trade)
  const R: Reading[] = []; const add = (id: string, display: string, value: number | null, asOf: string | null, st: State, note: string) => { const stale = asOf != null && /^\d{4}$/.test(asOf) && +asOf <= y0 - 3; R.push({ id, display, displayAr: toAr(display), value, asOf, state: stale ? "na" : st, note: stale ? `${note}; STALE: the latest observation is ${asOf}, so no alert state is given` : note }); };
  const A = macroA; const lg = lastOf(A.growth, y0 - 1); const zg = A.growth ? zOf(A.growth, y0 - 1) : null;
  if (lg) add("I01", `${f1(lg.v)}% real growth in ${lg.y}`, lg.v, String(lg.y), state(zg != null && Math.abs(zg) >= 2 || lg.v < 1, zg != null && Math.abs(zg) >= 1.5), `z-score against own history ${f1(zg)}; ${kindOf(lg.y, y0)}; non-oil split not connected`); else add("I01", "n/a", null, null, "na", "no IMF growth series");
  const li = lastOf(A.inflation, y0 - 1); if (li) add("I03", `${f1(li.v)}% inflation in ${li.y}`, li.v, String(li.y), state(li.v > 5, li.v > 3), "annual average CPI; components not connected");
  const lu = lastOf(A.unemployment, y0 - 1); if (lu) { const pv = at(A.unemployment, lu.y - 1); add("I05", `${f1(lu.v)}% unemployment in ${lu.y}`, lu.v, String(lu.y), state(pv != null && lu.v - pv > 1, false), "IMF series; participation, vacancies and skill gaps not connected"); }
  const ld = lastOf(A.debt, y0 - 1); if (ld) { const p2 = at(A.debt, ld.y - 2); add("I06", `${f1(ld.v)}% of GDP gross debt in ${ld.y}`, ld.v, String(ld.y), state(p2 != null && ld.v - p2 > 5, ld.v > 60), "gross, not net of government assets"); }
  const lc = lastOf(A.ca, y0 - 1); const rm = finLast(F.ARE, "resMonths"); if (lc || rm) add("I07", `${lc ? `${f1(lc.v)}% of GDP current account (${lc.y})` : "current account n/a"}; ${rm ? `${f1(rm.v)} months of import cover (${rm.y})` : "reserve cover n/a"}`, lc?.v ?? null, lc ? String(lc.y) : null, state((lc != null && lc.v < -3) || (rm != null && rm.v < 3), false), "reserves exclude sovereign wealth funds; external debt not connected");
  const cr = finLast(F.ARE, "credit"); if (cr) { const p2 = cr.s.find((r) => r[0] === cr.y - 2)?.[1]; add("I08", `${f1(cr.v)}% of GDP private credit in ${cr.y}`, cr.v, String(cr.y), state(p2 != null && Math.abs(cr.v - p2) > 10, false), "annual level; monthly growth not connected"); }
  const nl = finLast(F.ARE, "npl"); const cp = finLast(F.ARE, "capital"); if (nl || cp) { const pv = nl?.s.find((r) => r[0] === nl.y - 1)?.[1]; add("I09", `${nl ? `${f1(nl.v)}% non-performing loans (${nl.y})` : "NPL n/a"}; ${cp ? `${f1(cp.v)}% capital to assets (${cp.y})` : "capital n/a"}`, nl?.v ?? null, nl ? String(nl.y) : null, state(nl != null && (nl.v > 5 || (pv != null && nl.v - pv > 1)), false), "provision coverage not connected"); }
  const fxr = finLast(F.ARE, "fx"); if (fxr) { const p = fxr.s.find((r) => r[0] === fxr.y - 1)?.[1]; const chg = p ? (fxr.v / p - 1) * 100 : null; add("I12", `${fxr.v.toFixed(2)} AED per US$ in ${fxr.y}${chg != null ? ` (${chg >= 0 ? "+" : ""}${chg.toFixed(2)}% on the year)` : ""}`, fxr.v, String(fxr.y), state(chg != null && Math.abs(chg) > 1, false), "pegged; the real effective rate is not published for the UAE by the World Bank"); }
  if (tradeOut) { const w = trade!.world.ttm; const pw = trade!.world.prev ?? trade!.world.a[trade!.world.a.length - 2] ? { x: trade!.world.a[trade!.world.a.length - 2][1], m: trade!.world.a[trade!.world.a.length - 2][2] } : null; const last = trade!.world.a[trade!.world.a.length - 1];
    const gx = pw && last && pw.x > 0 ? (last[1] / pw.x - 1) * 100 : null; add("I19", `UAE goods exports US$${Math.round(last[1] / 1000)}bn, imports US$${Math.round(last[2] / 1000)}bn in ${last[0]}${gx != null ? `; exports ${gx >= 0 ? "+" : ""}${gx.toFixed(1)}% on the year` : ""}`, last[1], String(last[0]), state(gx != null && gx < -15, false), `customs basis including re-exports${w ? `; trailing four quarters exports US$${Math.round(w.x / 1000)}bn` : ""}`);
    const hx = tradeOut.xHhi.find((r) => r.year === tradeOut!.lastYear); const hm = tradeOut.mHhi.find((r) => r.year === tradeOut!.lastYear); const hp = tradeOut.xHhi.find((r) => r.year === tradeOut!.lastYear - 3);
    if (hx?.hhi != null) add("I21", `Partner HHI: exports ${Math.round(hx.hhi)} (${hhiBand(hx.hhi)}), imports ${hm?.hhi != null ? `${Math.round(hm.hhi)} (${hhiBand(hm.hhi)})` : "n/a"} in ${tradeOut.lastYear}`, hx.hhi, String(tradeOut.lastYear), state(hx.hhi > 2500, hx.hhi > 1500), `across ${hx.partners} partners${hp?.hhi != null ? `; exports HHI was ${Math.round(hp.hhi)} three years earlier` : ""}; partner concentration only, product concentration not connected`); }
  if (investOut?.worldUsd) { const ys = (inv!.world.series ?? []) as [number, number][]; const prevY = ys[ys.length - 2]; const chg = prevY ? (investOut.worldUsd / prevY[1] - 1) * 100 : null; add("I26", `UAE net outward investment position US$${(investOut.worldUsd / 1e9).toFixed(0)}bn in ${investOut.year}${chg != null ? ` (${chg >= 0 ? "+" : ""}${chg.toFixed(0)}% on the year)` : ""}`, investOut.worldUsd, String(investOut.year), state(chg != null && chg < -25, false), "a stock, not a flow; net of liabilities; announcements are held apart"); }
  const lastTwo = snaps.slice(-2); const maxRev = revisions.length ? Math.max(...revisions.map((r) => Math.abs(r.d))) : null;
  add("I34", snaps.length < 2 ? `Vintage store holds ${snaps.length} snapshot(s); a revision needs two` : `${revisions.length} revised value(s) between ${lastTwo[0].taken} and ${lastTwo[1].taken}${maxRev != null ? `, largest ${maxRev.toFixed(2)} pp` : ""}`, maxRev, lastTwo[lastTwo.length - 1]?.taken ?? null, snaps.length < 2 ? "na" : state(maxRev != null && maxRev > 1, false), "IMF live database snapshots taken by this desk");

  const finRank: Snapshot["fin"]["rank"] = {}; for (const k of Object.keys((fin?.indicators ?? {}) as Dict)) { const vals = Object.entries(F).filter(([, v]) => (v as Dict)[k]?.v != null).map(([iso, v]) => [iso, (v as Dict)[k].v as number] as const).sort((a, b) => b[1] - a[1]); const i = vals.findIndex((x) => x[0] === "ARE"); if (i >= 0) finRank[k] = { rank: i + 1, n: vals.length, pct: pct(i + 1, vals.length) }; }
  const builds = [["outlook.json", outlook?.built], ["finconditions.json", fin?.built], ["trade.json", trade?.built], ["governance.json", gov?.built], ["investment.json", inv?.built], ["leverage.json", lev?.built], ["deals.json", deals?.built], ["vintages/weo.json", snaps[snaps.length - 1]?.taken]].map(([file, built]) => ({ file: file as string, built: (built as string | undefined) ?? null }));
  return { asOf: now.toISOString(), y0, iso3, name, builds, macro: { ARE: macroA, other: macroB }, forecasts: { ARE: fcA, other: fcB }, fin: { ARE: F.ARE ?? null, other: iso3 ? F[iso3] ?? null : null, names: Object.fromEntries(Object.entries((fin?.indicators ?? {}) as Dict).map(([k, v]) => [k, (v as Dict).name])), coverage: fin?.coverage ?? {}, rank: finRank },
    trade: tradeOut, invest: investOut, exposure, counterpart, bench: { declared: PEERS_DECLARED, sets: benchSets }, readings: R, vintage: { n: snaps.length, taken: snaps.map((s) => s.taken), revisions }, names, gaps };
}
