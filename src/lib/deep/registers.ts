import type { Snapshot } from "./snapshot";
import { METHODS } from "./econ-core";

// The registers of the Deep Intelligence desk (FALCON EYE capabilities 2 to 4): disagreements, decisions and outcomes, forecasts issued here, and the information-value queue.
// They are records kept in the reader's browser (the desk has no user accounts or database), so they are personal working records, not shared evidence, and the desk says so. Pure functions only: the screens call them and the tests check them.
export type Rec = { id: string; created: string; updated: string };

// 1. Decision and outcome register (FALCON EYE capability 3). A decision names the insight that informed it, the expected outcome, an owner, a review date and, later, the observed result.
// Contribution is not causation (FE-AC18): an outcome is reported as "association only" unless a counterfactual or comparison method is written down, and even then it is a claim to be reviewed, not a finding.
export type Attribution = "association" | "contribution" | "causal";
export type Decision = Rec & { decision: string; informedBy: string[]; expected: string; owner: string; review: string; milestones: { text: string; done: boolean }[]; observed: string; attribution: Attribution; method: string; status: "open" | "reviewed" | "dropped"; iso3?: string; source?: "manual" | "strategy" | "architect" | "council" | "gate"; ref?: string };
export const methodOk = (m: string) => m.trim().length >= 30 && /(counterfactual|comparison|control|pre-?trend|difference|synthetic|matched|baseline|before and after with|natural experiment)/i.test(m);
/** The attribution a record is allowed to display: "causal" needs a written method, otherwise it is shown as association only. */
export const attributionShown = (d: Pick<Decision, "attribution" | "method" | "observed">): Attribution => (!d.observed.trim() ? "association" : d.attribution === "causal" && !methodOk(d.method) ? "association" : d.attribution);
export const ATTR_LABEL: Record<Attribution, { en: string; ar: string }> = { association: { en: "Association only", ar: "ارتباط فقط" }, contribution: { en: "Contribution (informed the decision; not shown to cause the result)", ar: "إسهام (أفاد القرار؛ ولم يثبت أنه سبب النتيجة)" }, causal: { en: "Causal claim with a stated method (to be reviewed)", ar: "ادعاء سببي بطريقة معلنة (للمراجعة)" } };
export function followThrough(ds: Decision[], now: number) {
  const open = ds.filter((d) => d.status === "open"); const due = open.filter((d) => d.review && Date.parse(d.review) <= now); const overdue30 = open.filter((d) => d.review && now - Date.parse(d.review) > 30 * 86_400_000);
  const ms = ds.flatMap((d) => d.milestones); const done = ms.filter((m) => m.done).length; const observed = ds.filter((d) => d.observed.trim()).length;
  return { total: ds.length, open: open.length, due: due.length, overdue30: overdue30.length, milestones: ms.length, milestonesDone: done, observed, causalClaims: ds.filter((d) => attributionShown(d) === "causal").length, downgraded: ds.filter((d) => d.attribution === "causal" && attributionShown(d) !== "causal").length };
}

// 2. Disagreement register (capability 2): where sources and analysts differ, what kind of disagreement it is, and what evidence could settle it. A disagreement is never voted away.
export type DisType = "fact" | "assumption" | "mechanism" | "horizon" | "values";
export const DIS_TYPES: Record<DisType, { en: string; ar: string; settle: { en: string; ar: string } }> = {
  fact: { en: "Fact", ar: "واقعة", settle: { en: "Check the primary record or measurement.", ar: "فحص السجل الأولي أو القياس." } },
  assumption: { en: "Assumption", ar: "افتراض", settle: { en: "Test each assumption's effect on the UAE option; the data may not settle it.", ar: "اختبار أثر كل افتراض في الخيار الإماراتي؛ وقد لا تحسمه البيانات." } },
  mechanism: { en: "Mechanism", ar: "آلية", settle: { en: "Look for a case or a quasi-experiment that separates the mechanisms.", ar: "البحث عن حالة أو شبه تجربة تفصل بين الآليات." } },
  horizon: { en: "Time horizon", ar: "أفق زمني", settle: { en: "Align the horizons first; many such disagreements disappear.", ar: "مواءمة الآفاق أولًا؛ فكثير من هذه الخلافات يزول." } },
  values: { en: "Values", ar: "قيم", settle: { en: "Evidence will not settle it; make the trade-off explicit for the decision-maker.", ar: "لن تحسمه الأدلة؛ يُبيَّن المفاضلة صراحةً لصاحب القرار." } },
};
export type Disagreement = Rec & { topic: string; type: DisType; parties: { who: string; position: string }[]; resolves: string; affectsOption: boolean | null; status: "open" | "resolved"; origin: "user" | "auto" };
/** Disagreements the desk can find in its own numbers: a source projection that falls outside the interval a simple baseline gives (an assumption or horizon difference, never a verdict that either is wrong). */
export function autoDisagreements(s: Snapshot | null): Disagreement[] {
  if (!s) return []; const out: Disagreement[] = []; const t = s.asOf;
  for (const b of s.forecasts.ARE) for (const r of b.rows) {
    if (r.imf == null || r.point == null || r.lo == null || r.hi == null || b.method == null) continue; if (r.imf >= r.lo && r.imf <= r.hi) continue;
    out.push({ id: `AUTO-${b.key}-${r.year}`, created: t, updated: t, origin: "auto", status: "open", affectsOption: null, type: "assumption", topic: `UAE ${b.key} ${r.year}: IMF projection ${r.imf.toFixed(1)} against baseline ${r.point.toFixed(1)} (80% range ${r.lo.toFixed(1)} to ${r.hi.toFixed(1)}, ${r.n} backtest cases)`,
      parties: [{ who: "IMF live database", position: `${r.imf.toFixed(1)} for ${r.year}; it embeds a view of conditions that a trend baseline does not` }, { who: `Desk baseline (${METHODS[b.method].en})`, position: `${r.point.toFixed(1)}: continues the recent record` }], resolves: "The IMF's own assumptions for the year (commodity prices, policy path) and the first official estimate for the year when released." });
  }
  return out;
}

// 3. Forecasts issued on this desk (the forecasting contract, section 9). A record is never edited: a revision is a new record that points at the one it revises. A forecast cannot be resolved before its resolution date.
export type FcRecord = Rec & { target: string; unit: string; geography: string; horizon: string; issuedAt: string; cutoff: string; vintage: string; model: string; assumptions: string; point: number | null; lo: number | null; hi: number | null; probability: number | null; resolution: string; resolveOn: string; owner: string; revises: string | null; ref: { key: string; year: number } | null; actual: number | null; outcome: 0 | 1 | null };
export const issueRecord = (x: Omit<FcRecord, "id" | "created" | "updated" | "actual" | "outcome" | "revises" | "ref"> & { revises?: string | null; ref?: FcRecord["ref"] }, now: Date, n: number): FcRecord => ({ ...x, revises: x.revises ?? null, ref: x.ref ?? null, actual: null, outcome: null, id: `FR-${now.toISOString().slice(0, 10)}-${String(n + 1).padStart(3, "0")}`, created: now.toISOString(), updated: now.toISOString() });
export const canResolve = (r: FcRecord, now: number) => Date.parse(r.resolveOn) <= now;
export function scoreRecords(rs: FcRecord[]) {
  const num = rs.filter((r) => r.point != null && r.actual != null); const bin = rs.filter((r) => r.probability != null && r.outcome != null); const withIv = num.filter((r) => r.lo != null && r.hi != null);
  return { resolved: num.length + bin.length, mae: num.length ? num.reduce((a, r) => a + Math.abs(r.point! - r.actual!), 0) / num.length : null, brier: bin.length ? bin.reduce((a, r) => a + (r.probability! - r.outcome!) ** 2, 0) / bin.length : null, coverage: withIv.length ? withIv.filter((r) => r.actual! >= r.lo! && r.actual! <= r.hi!).length / withIv.length : null, nBin: bin.length, nNum: num.length, open: rs.filter((r) => r.actual == null && r.outcome == null).length };
}

// 4. Information-value queue (capability 4): which missing dataset or assessment could change a consequential decision. The ranking is a transparent heuristic, not a calculation of expected value: impact times uncertainty over cost, each scored 1 to 5 by a stated rule.
export type Gap = { id: string; what: { en: string; ar: string }; decision: { en: string; ar: string }; impact: number; uncertainty: number; cost: 1 | 2 | 3 | 4 | 5; route: { en: string; ar: string }; origin: "auto" | "user"; score: number };
export const gapScore = (impact: number, uncertainty: number, cost: number) => Math.round(((impact * uncertainty) / cost) * 10) / 10;
export const COST_LABEL = ["", { en: "Free and quick", ar: "مجاني وسريع" }, { en: "Low", ar: "منخفضة" }, { en: "Moderate (engineering or onboarding)", ar: "متوسطة (هندسة أو ربط)" }, { en: "High (licence or analyst time)", ar: "مرتفعة (ترخيص أو وقت محلل)" }, { en: "Very high (procurement and rights)", ar: "مرتفعة جدًا (شراء وحقوق)" }] as const;
type GapSeed = Omit<Gap, "score" | "origin">;
const SEEDS: GapSeed[] = [
  { id: "product-trade", what: { en: "Product-level bilateral trade with a consistent classification", ar: "تجارة ثنائية بمستوى المنتج بتصنيف متسق" }, decision: { en: "Which products to pursue in which market; the opportunity screen cannot name a product without it", ar: "أي المنتجات تُلاحَق في أي سوق؛ ولا يستطيع الفرز تسمية منتج دونه" }, impact: 5, uncertainty: 5, cost: 4, route: { en: "UN Comtrade (copyrighted for internal use: needs UNSD permission or a licensed subscription), or UAE customs by origin", ar: "كومتريد (محمية للاستخدام الداخلي: تحتاج إذن شعبة الإحصاء أو اشتراكًا مرخصًا) أو جمارك الإمارات بحسب المنشأ" }, },
  { id: "reexport", what: { en: "Split of UAE exports into domestic exports and re-exports", ar: "فصل صادرات الإمارات إلى محلية ومعاد تصديرها" }, decision: { en: "Whether trade growth is domestic value creation or logistics throughput", ar: "هل نمو التجارة خلق قيمة محلية أم حركة لوجستية" }, impact: 4, uncertainty: 4, cost: 3, route: { en: "FCSC and customs statistics by origin (S8)", ar: "إحصاءات المركز الاتحادي والجمارك بحسب المنشأ" } },
  { id: "rates", what: { en: "Policy, interbank and funding-rate series", ar: "سلاسل أسعار السياسة وما بين البنوك والتمويل" }, decision: { en: "Funding-cost transmission and refinancing timing", ar: "انتقال كلفة التمويل وتوقيت إعادة التمويل" }, impact: 4, uncertainty: 3, cost: 3, route: { en: "CBUAE research and statistics (S9); fixings may need a licence", ar: "بحوث وإحصاءات المصرف المركزي؛ وقد تحتاج الأسعار إلى ترخيص" } },
  { id: "nonoil", what: { en: "Non-oil GDP and sector contributions to growth", ar: "الناتج غير النفطي وإسهام القطاعات في النمو" }, decision: { en: "Whether growth reflects diversification; the headline growth figure mixes oil and non-oil", ar: "هل يعكس النمو التنويع؛ فرقم النمو العام يخلط النفط بغيره" }, impact: 5, uncertainty: 3, cost: 3, route: { en: "FCSC national accounts (S8)", ar: "الحسابات القومية للمركز الاتحادي" } },
  { id: "yields", what: { en: "Sovereign yields by tenor and currency", ar: "عوائد السندات السيادية بحسب الأجل والعملة" }, decision: { en: "Financing conditions and market pricing of risk", ar: "أحوال التمويل وتسعير السوق للمخاطر" }, impact: 3, uncertainty: 3, cost: 5, route: { en: "A licensed market-data distributor (a procurement decision)", ar: "موزّع بيانات سوق مرخص (قرار شراء)" } },
  { id: "arabic-research", what: { en: "Arabic-language and local-language research feeds", ar: "تغذيات بحثية بالعربية وباللغات المحلية" }, decision: { en: "Whether the research view misses local or Arabic-language arguments", ar: "هل يغفل المشهد البحثي حججًا محلية أو بالعربية" }, impact: 4, uncertainty: 4, cost: 2, route: { en: "Validate TRENDS and ECSSR ingestion; add local institutes per country after identity and rights checks", ar: "التحقق من استيعاب تريندز ومركز الإمارات للدراسات؛ وإضافة معاهد محلية لكل دولة بعد فحص الهوية والحقوق" } },
  { id: "freight", what: { en: "Freight rates and port dwell times", ar: "أسعار الشحن وأزمنة بقاء السفن" }, decision: { en: "Logistics continuity and cost under disruption", ar: "استمرارية الخدمات اللوجستية وكلفتها عند التعطل" }, impact: 3, uncertainty: 4, cost: 4, route: { en: "Port authorities or a freight-index provider", ar: "هيئات الموانئ أو مزوّد مؤشر شحن" } },
  { id: "adjudication", what: { en: "Adjudicated alert set for measuring warning lead time and false alarms", ar: "مجموعة إنذارات محكَّمة لقياس زمن الإنذار والإنذارات الكاذبة" }, decision: { en: "Whether monitoring improves readiness", ar: "هل يحسّن الرصد الجاهزية" }, impact: 3, uncertainty: 5, cost: 2, route: { en: "Analyst time to label past alerts against events", ar: "وقت محللين لتصنيف الإنذارات السابقة مقابل الأحداث" } },
];
export function infoValueQueue(s: Snapshot | null, extras: Gap[] = []): Gap[] {
  const exposure = s?.exposure?.rows.filter((r) => r.conf === "unknown").length ?? 0;
  const seeds = SEEDS.map((g) => ({ ...g, origin: "auto" as const, score: gapScore(g.impact, g.uncertainty, g.cost) }));
  return [...seeds.map((g) => (g.id === "product-trade" && exposure > 0 ? { ...g, uncertainty: 5 } : g)), ...extras.map((g) => ({ ...g, score: gapScore(g.impact, g.uncertainty, g.cost) }))].sort((a, b) => b.score - a.score);
}
