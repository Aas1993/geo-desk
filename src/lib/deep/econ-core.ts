// Pure economics for the Deep Intelligence desk (FALCON EYE FE04, FE07, FE08): series typing, the nominal-versus-real guard, baselines and rolling-origin backtests,
// concentration and the trade opportunity screen. No fetching and no clock reads except where a year is passed in, so every figure is reproducible from the data it is given.
export type Series = Record<string, number>; // year -> value, as stored in outlook.json
export type SeriesKey = "growth" | "inflation" | "ca" | "debt" | "gdp" | "unemployment";
export const META: Record<SeriesKey, { en: string; ar: string; unit: string; basis: "real" | "nominal" | "ratio"; note: { en: string; ar: string } }> = {
  growth: { en: "Real GDP growth", ar: "نمو الناتج المحلي الحقيقي", unit: "% year on year", basis: "real", note: { en: "Constant prices; annual, calendar year.", ar: "بالأسعار الثابتة؛ سنوي بالسنة التقويمية." } },
  inflation: { en: "Inflation, consumer prices", ar: "التضخم، أسعار المستهلك", unit: "% year on year", basis: "ratio", note: { en: "Average annual CPI change, not a GDP deflator.", ar: "متوسط التغير السنوي لأسعار المستهلك، لا مخفّض الناتج." } },
  ca: { en: "Current account balance", ar: "رصيد الحساب الجاري", unit: "% of GDP", basis: "ratio", note: { en: "Share of nominal GDP.", ar: "نسبة من الناتج الاسمي." } },
  debt: { en: "General government gross debt", ar: "إجمالي الدين الحكومي العام", unit: "% of GDP", basis: "ratio", note: { en: "Central-bank reserves and sovereign wealth assets are not netted off.", ar: "لا تُخصم احتياطيات المصرف المركزي وأصول الثروة السيادية." } },
  gdp: { en: "Nominal GDP", ar: "الناتج المحلي الاسمي", unit: "US$ million, current prices", basis: "nominal", note: { en: "Current prices, current exchange rate: it moves with prices and the dollar, so it is not a measure of real growth.", ar: "بالأسعار والصرف الجاريين: يتحرك مع الأسعار والدولار فلا يقيس النمو الحقيقي." } },
  unemployment: { en: "Unemployment rate", ar: "معدل البطالة", unit: "% of labour force", basis: "ratio", note: { en: "Definitions differ between countries.", ar: "تختلف التعريفات بين الدول." } },
};
export type Kind = "observation" | "estimate" | "projection";
/** What a year in the IMF live database is. The IMF marks the current year onward as projections and the last year or so before it as estimates still open to revision; only earlier years are treated as observations (which can still be revised). */
export const kindOf = (year: number, y0: number): Kind => (year >= y0 ? "projection" : year === y0 - 1 ? "estimate" : "observation");
export const KIND_LABEL: Record<Kind, { en: string; ar: string }> = { observation: { en: "Observation (may be revised)", ar: "مرصود (قابل للمراجعة)" }, estimate: { en: "Estimate (latest year, open to revision)", ar: "تقدير (آخر سنة، قابل للمراجعة)" }, projection: { en: "IMF projection", ar: "إسقاط صندوق النقد" } };
export const years = (s: Series | undefined) => (s ? Object.keys(s).map(Number).sort((a, b) => a - b) : []);
export const at = (s: Series | undefined, y: number) => (s && s[y] != null && isFinite(s[y]) ? s[y] : null);

/** Comparing two series: nominal levels and real growth cannot be set side by side (FE-AC05). Mixed bases are blocked unless a documented conversion applies. */
export type Compare = { ok: boolean; reason?: { en: string; ar: string }; method?: { en: string; ar: string } };
export function compareSeries(a: SeriesKey, b: SeriesKey): Compare {
  const A = META[a].basis; const B = META[b].basis; if (a === b) return { ok: true };
  if ((A === "nominal" && B === "real") || (A === "real" && B === "nominal")) return { ok: false, reason: { en: `${META.gdp.en} is in current prices and ${META.growth.en} is in constant prices; a nominal level and a real growth rate are different quantities.`, ar: "الناتج الاسمي بالأسعار الجارية ونمو الناتج الحقيقي بالأسعار الثابتة؛ المستوى الاسمي ومعدل النمو الحقيقي كميتان مختلفتان." },
    method: { en: "Convert first: take nominal GDP growth from the levels, then deflate it with inflation (nominalToReal). The result is approximate because consumer prices stand in for the GDP deflator.", ar: "حوّل أولًا: استخرج نمو الناتج الاسمي من المستويات ثم اقسمه على التضخم (nominalToReal). النتيجة تقريبية لأن أسعار المستهلك تقوم مقام مخفّض الناتج." } };
  if ((A === "nominal") !== (B === "nominal") && (A === "ratio" || B === "ratio")) return { ok: false, reason: { en: "A level in currency units and a ratio or rate cannot be compared directly.", ar: "لا يمكن مقارنة مستوى بوحدات نقدية مع نسبة أو معدل مباشرةً." } };
  return { ok: true };
}
/** Real growth derived from nominal levels and consumer-price inflation. Approximate by construction; the caller must label it as estimated. */
export const nominalToReal = (nominal: Series, infl: Series, year: number): number | null => { const a = at(nominal, year); const b = at(nominal, year - 1); const p = at(infl, year); if (a == null || b == null || b <= 0 || p == null) return null; return ((a / b) / (1 + p / 100) - 1) * 100; };
export const growthOf = (s: Series, year: number): number | null => { const a = at(s, year); const b = at(s, year - 1); return a != null && b != null && b > 0 ? (a / b - 1) * 100 : null; };

/** Baseline forecasters for an annual series. They are deliberately simple: a complex model has to beat these on held-out data before it earns operational status. */
export type Method = "naive" | "mean3" | "drift";
export const METHODS: Record<Method, { en: string; ar: string; f: (h: number[]) => number | null }> = {
  naive: { en: "Last observation", ar: "آخر قيمة", f: (h) => (h.length ? h[h.length - 1] : null) },
  mean3: { en: "Mean of the last three years", ar: "متوسط آخر ثلاث سنوات", f: (h) => (h.length >= 3 ? (h[h.length - 1] + h[h.length - 2] + h[h.length - 3]) / 3 : null) },
  drift: { en: "Linear drift over the last five years", ar: "انجراف خطي خلال آخر خمس سنوات", f: (h) => { if (h.length < 5) return null; const w = h.slice(-5); const n = w.length; const mx = (n - 1) / 2; const my = w.reduce((a, b) => a + b, 0) / n; let sxy = 0; let sxx = 0; w.forEach((y, i) => { sxy += (i - mx) * (y - my); sxx += (i - mx) ** 2; }); return my + (sxy / sxx) * (n - mx); } },
};
export type Backtest = { n: number; mae: Record<Method, number | null>; best: Method | null; mase: Record<Method, number | null>; errors: Record<Method, number[]>; from: number; to: number };
/** Rolling-origin backtest at horizon h years: at each origin the method sees only years before it. It runs on today's vintage of the data (revised history leaks in slightly) and treats the IMF's estimate for the latest year as observed; the vintage store lets this become point-in-time once it holds enough snapshots.
 *  MASE scales by the in-sample one-step naive error (undefined when that is zero). Each method needs its own minimum history, so the samples are small: they are reported with every figure drawn from them. */
export function backtest(s: Series, lastObs: number, h = 1): Backtest {
  const ys = years(s).filter((y) => y <= lastObs); const vals = ys.map((y) => s[y]); const errors: Record<Method, number[]> = { naive: [], mean3: [], drift: [] };
  for (let i = 5; i + h - 1 < ys.length; i++) for (const m of Object.keys(METHODS) as Method[]) { const f = METHODS[m].f(vals.slice(0, i)); if (f != null) errors[m].push(Math.abs(vals[i + h - 1] - f)); }
  const mae = Object.fromEntries((Object.keys(METHODS) as Method[]).map((m) => [m, errors[m].length ? errors[m].reduce((a, b) => a + b, 0) / errors[m].length : null])) as Record<Method, number | null>;
  let den = 0; let dn = 0; for (let i = 1; i < vals.length; i++) { den += Math.abs(vals[i] - vals[i - 1]); dn++; } const scale = dn ? den / dn : 0;
  const mase = Object.fromEntries((Object.keys(METHODS) as Method[]).map((m) => [m, mae[m] != null && scale > 0 ? mae[m]! / scale : null])) as Record<Method, number | null>;
  const ranked = (Object.keys(METHODS) as Method[]).filter((m) => mae[m] != null && errors[m].length >= 3).sort((a, b) => mae[a]! - mae[b]!);
  return { n: errors.naive.length, mae, best: ranked[0] ?? null, mase, errors, from: ys[5] ?? ys[0], to: ys[ys.length - 1] };
}
/** An empirical interval for a forecast: the point value plus and minus the chosen share of the method's own absolute backtest errors. With a handful of errors the interval is rough, and the sample size is reported beside it. */
export const interval = (point: number, errs: number[], level = 0.8): { lo: number; hi: number; n: number; level: number } | null => { if (errs.length < 4) return null; const e = [...errs].sort((a, b) => a - b); const k = Math.min(e.length - 1, Math.ceil(level * e.length) - 1); return { lo: point - e[k], hi: point + e[k], n: e.length, level }; };
/** Whether a candidate may be called operational: it must beat the retained baseline's held-out error on enough resolved cases; otherwise the baseline stays and the candidate is experimental (FE-AC10). */
export type Status = "operational" | "baseline-retained" | "experimental" | "unscored";
export const qualify = (candMae: number | null, baseMae: number | null, n: number, minN = 8): { status: Status; why: { en: string; ar: string } } => {
  if (candMae == null || baseMae == null || n < minN) return { status: "unscored", why: { en: `Only ${n} resolved case(s); at least ${minN} are needed before a model can be scored against the baseline.`, ar: `${n} حالة محسومة فقط؛ يلزم ${minN} على الأقل قبل تقييم نموذج مقابل خط الأساس.` } };
  return candMae < baseMae ? { status: "operational", why: { en: "Lower held-out error than the baseline.", ar: "خطأ أدنى من خط الأساس على بيانات محجوبة." } } : { status: "baseline-retained", why: { en: "Did not beat the baseline on held-out data, so the baseline is kept and the model stays experimental.", ar: "لم يتفوق على خط الأساس على بيانات محجوبة، فيُبقى خط الأساس ويظل النموذج تجريبيًا." } };
};
export const brier = (probs: number[], outcomes: (0 | 1)[]) => (probs.length && probs.length === outcomes.length ? probs.reduce((a, p, i) => a + (p - outcomes[i]) ** 2, 0) / probs.length : null);
export const mae = (f: number[], a: number[]) => (f.length && f.length === a.length ? f.reduce((s, x, i) => s + Math.abs(x - a[i]), 0) / f.length : null);

/** Herfindahl-Hirschman index of a set of values: the sum of squared shares, on a 0-1 scale or 0-10,000. */
export function hhi(values: number[], scale: 1 | 10000 = 10000): number | null { const pos = values.filter((v) => v > 0); const t = pos.reduce((a, b) => a + b, 0); return t > 0 ? pos.reduce((a, v) => a + (v / t) ** 2, 0) * scale : null; }
export const hhiBand = (h: number | null) => (h == null ? null : h < 1500 ? "low" : h < 2500 ? "moderate" : "high");
/** Maximum drawdown of a price series: the minimum over time of price divided by its running peak, minus one. */
export function maxDrawdown(p: number[]): number | null { if (p.length < 2) return null; let peak = p[0]; let dd = 0; for (const x of p) { if (x > peak) peak = x; dd = Math.min(dd, x / peak - 1); } return dd; }
export const mean = (x: number[]) => (x.length ? x.reduce((a, b) => a + b, 0) / x.length : null);
export const sd = (x: number[]) => { const m = mean(x); return m == null || x.length < 3 ? null : Math.sqrt(x.reduce((a, b) => a + (b - m) ** 2, 0) / (x.length - 1)); };
/** A z-score of the latest value against the rest of the series. An anomaly signal only: it is not a crisis label, and persistence or corroboration should be required where the series is noisy. */
export function zOf(s: Series, year: number): number | null { const hist = years(s).filter((y) => y < year).map((y) => s[y]); const m = mean(hist); const d = sd(hist); const v = at(s, year); return m == null || d == null || d === 0 || v == null ? null : (v - m) / d; }
export const pct = (rank: number, n: number) => (n > 1 ? Math.round((1 - (rank - 1) / (n - 1)) * 100) : null);

// Trade (IMTS, UAE as reporter): [year, UAE exports to the partner, UAE imports from it], US$ million. Customs-based, so UAE re-exports are inside the exports.
export type TradeRow = { a: [number, number, number][]; ttm?: { x: number; m: number }; prev?: { x: number; m: number } };
export type TradeBook = { lastYear: number; asOfQuarter?: string; world: TradeRow; countries: Record<string, TradeRow> };
const col = (r: TradeRow, y: number, i: 1 | 2) => r.a.find((x) => x[0] === y)?.[i] ?? null;
export const partnerHhi = (t: TradeBook, year: number, flow: "x" | "m") => { const i = flow === "x" ? 1 : 2; const v = Object.values(t.countries).map((r) => col(r, year, i) ?? 0); const sum = v.reduce((a, b) => a + b, 0); const w = col(t.world, year, i); return { hhi: hhi(v), partners: v.filter((x) => x > 0).length, coverage: w && w > 0 ? sum / w : null, top: topShares(t, year, i) }; };
function topShares(t: TradeBook, year: number, i: 1 | 2) { const rows = Object.entries(t.countries).map(([iso, r]) => ({ iso, v: col(r, year, i) ?? 0 })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v); const s = rows.reduce((a, b) => a + b.v, 0); return rows.slice(0, 5).map((r) => ({ iso: r.iso, share: s ? r.v / s : 0 })); }
export const hhiSeries = (t: TradeBook, flow: "x" | "m") => years(Object.fromEntries(t.world.a.map((r) => [r[0], 1]))).map((y) => ({ year: y, ...partnerHhi(t, y, flow), top: undefined }));
export const cagr = (a: number | null, b: number | null, n: number) => (a != null && b != null && a > 0 && b > 0 && n > 0 ? ((b / a) ** (1 / n) - 1) * 100 : null);

/** The trade opportunity screen. For each partner: demand growth (the IMF's outlook for its real GDP), headroom (UAE exports as a share of its nominal GDP: low is room to grow), momentum (UAE export growth over three years) and a market-access proxy (its regulatory quality score).
 *  The weights are published and the screen also ranks under two alternative weightings, so an unstable placement shows. It is a SCREEN: customs data includes re-exports and has no product detail, so every row needs a product-level feasibility check before it is a thesis. */
export type Screen = { iso: string; exportsUsdM: number; momentum: number | null; demand: number | null; headroom: number | null; access: number | null; score: number; rank: number; stable: boolean; ranks: number[]; evidence: string[]; gaps: string[] };
export const WEIGHTS = { base: { demand: 0.35, headroom: 0.25, momentum: 0.25, access: 0.15 }, alt1: { demand: 0.5, headroom: 0.2, momentum: 0.2, access: 0.1 }, alt2: { demand: 0.2, headroom: 0.3, momentum: 0.2, access: 0.3 } };
export function opportunityScreen(t: TradeBook, outlook: Record<string, Record<string, Series>>, gov: Record<string, { rq?: number }>, year: number, minExportsUsdM = 100): Screen[] {
  const rows = Object.entries(t.countries).map(([iso, r]) => { const x = col(r, year, 1); const x0 = col(r, year - 3, 1); const o = outlook[iso]; const g = o?.growth; const demand = g ? mean([year + 1, year + 2, year + 3].map((y) => at(g, y)).filter((v): v is number => v != null)) : null; const gdp = at(o?.gdp, year);
    return { iso, x: x ?? 0, momentum: cagr(x0, x, 3), demand, headroom: x != null && gdp && gdp > 0 ? x / gdp : null, access: gov[iso]?.rq ?? null, gdp }; }).filter((r) => r.x >= minExportsUsdM);
  const norm = (vals: (number | null)[], invert = false) => { const v = vals.filter((x): x is number => x != null).sort((a, b) => a - b); return vals.map((x) => { if (x == null || v.length < 3) return null; const lo = v[Math.floor(v.length * 0.1)]; const hi = v[Math.ceil(v.length * 0.9) - 1]; const c = Math.min(hi, Math.max(lo, x)); const s = hi > lo ? (c - lo) / (hi - lo) : 0.5; return invert ? 1 - s : s; }); };
  const D = norm(rows.map((r) => r.demand)); const H = norm(rows.map((r) => r.headroom), true); const M = norm(rows.map((r) => r.momentum)); const A = norm(rows.map((r) => r.access));
  const scoreWith = (w: typeof WEIGHTS.base) => rows.map((_, i) => { const parts = [["demand", D[i]], ["headroom", H[i]], ["momentum", M[i]], ["access", A[i]]] as const; const have = parts.filter((p) => p[1] != null); const wsum = have.reduce((a, p) => a + w[p[0]], 0); return wsum ? have.reduce((a, p) => a + w[p[0]] * (p[1] as number), 0) / wsum : 0; });
  const sets = [scoreWith(WEIGHTS.base), scoreWith(WEIGHTS.alt1), scoreWith(WEIGHTS.alt2)]; const rankOf = (sc: number[]) => { const idx = sc.map((s, i) => [s, i] as const).sort((a, b) => b[0] - a[0]); const r: number[] = Array(sc.length); idx.forEach(([, i], k) => { r[i] = k + 1; }); return r; };
  const ranks = sets.map(rankOf);
  return rows.map((r, i) => ({ iso: r.iso, exportsUsdM: r.x, momentum: r.momentum, demand: r.demand, headroom: r.headroom, access: r.access, score: Math.round(sets[0][i] * 100), rank: ranks[0][i], ranks: ranks.map((k) => k[i]), stable: Math.max(...ranks.map((k) => k[i])) - Math.min(...ranks.map((k) => k[i])) <= 10,
    evidence: [`UAE goods exports US$${Math.round(r.x)}m (${year})`, r.demand != null ? `IMF real growth outlook ${r.demand.toFixed(1)}% a year (mean of ${year + 1}-${year + 3})` : "", r.headroom != null ? `UAE exports are ${(r.headroom * 100).toFixed(2)}% of its nominal GDP` : "", r.momentum != null ? `UAE exports grew ${r.momentum.toFixed(1)}% a year over three years` : "", r.access != null ? `regulatory quality score ${r.access.toFixed(0)}/100` : ""].filter(Boolean),
    gaps: [r.demand == null ? "no IMF growth outlook" : "", r.headroom == null ? "no GDP to size headroom" : "", r.momentum == null ? "export history under four years" : "", r.access == null ? "no regulatory-quality score" : ""].filter(Boolean) })).sort((a, b) => a.rank - b.rank);
}
