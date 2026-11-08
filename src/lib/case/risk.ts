import type { B } from "./core";
import type { CaseData } from "./load";

// A rule-based country risk matrix: six categories, each with a short-term view (the latest reading against fixed levels) and a long-term view (the five-year change or the IMF path). Thresholds are PROPOSED defaults, not approved levels; a cell with no data is "not available" and never counted as low risk.
export type Level = "high" | "medium" | "low" | "none";
export type Cell = { level: Level; text: B };
export type RiskRow = { id: string; name: B; short: Cell; long: Cell };
const v = (c: CaseData, name: string) => c.spine.find((s) => s.met.name === name);
const none = (en: string, ar: string): Cell => ({ level: "none", text: { en, ar } });
const cell = (level: Level, en: string, ar: string): Cell => ({ level, text: { en, ar } });
const lvl = (x: number, hi: number, md: number, rev = false): Level => (rev ? (x <= hi ? "high" : x <= md ? "medium" : "low") : x >= hi ? "high" : x >= md ? "medium" : "low");
export function riskMatrix(c: CaseData): RiskRow[] {
  const rows: RiskRow[] = []; const L = (s: ReturnType<typeof v>) => s?.spine.latest?.v ?? null; const d5 = (s: ReturnType<typeof v>) => s?.spine.change5 ?? null;
  const pv = v(c, "Political stability"); const ge = v(c, "Government effectiveness");
  rows.push({ id: "political", name: { en: "Political", ar: "السياسي" }, short: pv && L(pv) != null ? cell(lvl(L(pv)!, 40, 60, true), `Stability score ${L(pv)!.toFixed(0)}/100`, `درجة الاستقرار ${L(pv)!.toFixed(0)}/100`) : none("No governance score", "لا درجة حوكمة"),
    long: ge && d5(ge) != null ? cell(d5(ge)! <= -5 ? "high" : d5(ge)! < 0 ? "medium" : "low", `Government effectiveness ${d5(ge)! >= 0 ? "+" : ""}${d5(ge)!.toFixed(1)} over 5 years`, `فاعلية الحكومة ${d5(ge)! >= 0 ? "+" : ""}${d5(ge)!.toFixed(1)} خلال 5 سنوات`) : none("No 5-year governance trend", "لا اتجاه حوكمة لخمس سنوات") });
  const inf = v(c, "Inflation, consumer prices"); const debt = v(c, "Government gross debt, % of GDP"); const debtPath = debt?.proj?.length ? debt.proj[debt.proj.length - 1][1] - (debt.spine.latest?.v ?? 0) : null;
  rows.push({ id: "economic", name: { en: "Economic", ar: "الاقتصادي" }, short: inf && L(inf) != null ? cell(lvl(L(inf)!, 10, 5), `Inflation ${L(inf)!.toFixed(1)}%`, `التضخم ${L(inf)!.toFixed(1)}%`) : none("No inflation series", "لا سلسلة تضخم"),
    long: debt && debtPath != null ? cell(debtPath > 5 ? "high" : debtPath > -5 ? "medium" : "low", `Debt path to ${debt.proj![debt.proj!.length - 1][0]}: ${debtPath >= 0 ? "+" : ""}${debtPath.toFixed(0)} pp (${L(debt)!.toFixed(0)}% of GDP now)`, `مسار الدين حتى ${debt.proj![debt.proj!.length - 1][0]}: ${debtPath >= 0 ? "+" : ""}${debtPath.toFixed(0)} نقطة (${L(debt)!.toFixed(0)}% من الناتج الآن)`) : none("No debt path", "لا مسار دين") });
  const res = v(c, "Reserves, months of imports"); const cr = v(c, "Private credit, % of GDP");
  rows.push({ id: "financial", name: { en: "Financial", ar: "المالي" }, short: res && L(res) != null ? cell(lvl(L(res)!, 3, 5, true), `Reserves cover ${L(res)!.toFixed(1)} months`, `تغطية الاحتياطيات ${L(res)!.toFixed(1)} شهرًا`) : none("No reserves series", "لا سلسلة احتياطيات"),
    long: cr && d5(cr) != null ? cell(Math.abs(d5(cr)!) > 15 ? "high" : Math.abs(d5(cr)!) > 8 ? "medium" : "low", `Private credit ${d5(cr)! >= 0 ? "+" : ""}${d5(cr)!.toFixed(1)} pp of GDP over 5 years`, `الائتمان الخاص ${d5(cr)! >= 0 ? "+" : ""}${d5(cr)!.toFixed(1)} نقطة من الناتج خلال 5 سنوات`) : none("No credit trend", "لا اتجاه ائتمان") });
  const open = v(c, "Trade openness, % of GDP");
  rows.push({ id: "operational", name: { en: "Operational", ar: "التشغيلي" }, short: none("Partial: logistics, labour and crime data are not connected", "جزئي: لا بيانات لوجستية أو عمالة أو جريمة"), long: open && d5(open) != null ? cell(d5(open)! < -5 ? "medium" : "low", `Trade openness ${d5(open)! >= 0 ? "+" : ""}${d5(open)!.toFixed(1)} pp over 5 years (one input only)`, `الانفتاح التجاري ${d5(open)! >= 0 ? "+" : ""}${d5(open)!.toFixed(1)} نقطة خلال 5 سنوات (مدخل واحد)`) : none("Partial data", "بيانات جزئية") });
  const ex = c.deep?.exposure?.rows ?? []; const sn = ex.find((r) => r.id === "sanctions"); const cy = ex.find((r) => r.id === "cyber"); const mil = v(c, "Military spending, % of GDP");
  rows.push({ id: "security", name: { en: "Security", ar: "الأمني" }, short: sn ? cell(((sn.magnitude ?? 0) + (cy?.magnitude ?? 0)) / 2 >= 0.5 ? "high" : ((sn.magnitude ?? 0) + (cy?.magnitude ?? 0)) / 2 >= 0.2 ? "medium" : "low", `Sanctions: ${sn.value?.en ?? "n/a"}; cyber: ${cy?.value?.en ?? "n/a"}`, `العقوبات: ${sn.value?.ar ?? "غير متاح"}؛ السيبراني: ${cy?.value?.ar ?? "غير متاح"}`) : none("No security reading", "لا قراءة أمنية"),
    long: mil && d5(mil) != null ? cell(d5(mil)! > 1 ? "medium" : "low", `Military spending ${d5(mil)! >= 0 ? "+" : ""}${d5(mil)!.toFixed(1)} pp of GDP over 5 years; conflict history not connected`, `الإنفاق العسكري ${d5(mil)! >= 0 ? "+" : ""}${d5(mil)!.toFixed(1)} نقطة خلال 5 سنوات؛ سجل النزاعات غير مربوط`) : none("Conflict history not connected", "سجل النزاعات غير مربوط") });
  const wat = v(c, "Water withdrawal, % of resources"); const fi = v(c, "Food imports, % of merchandise");
  rows.push({ id: "resource", name: { en: "Resource and climate", ar: "الموارد والمناخ" }, short: wat && L(wat) != null ? cell(lvl(L(wat)!, 100, 40), `Freshwater withdrawal ${L(wat)!.toFixed(0)}% of resources`, `سحب المياه العذبة ${L(wat)!.toFixed(0)}% من الموارد`) : none("No water series", "لا سلسلة مياه"),
    long: fi && d5(fi) != null ? cell(d5(fi)! > 3 ? "medium" : "low", `Food imports ${d5(fi)! >= 0 ? "+" : ""}${d5(fi)!.toFixed(1)} pp of imports over 5 years`, `واردات الغذاء ${d5(fi)! >= 0 ? "+" : ""}${d5(fi)!.toFixed(1)} نقطة خلال 5 سنوات`) : none("No food trend", "لا اتجاه غذاء") });
  return rows;
}
