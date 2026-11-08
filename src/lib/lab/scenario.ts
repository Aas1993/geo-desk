import { POSTURE, THRESHOLDS, instrIntensity, rule, type B, type Posture } from "../case/core";
import { riskMatrix, type Level } from "../case/risk";
import type { CaseData } from "../case/load";
import { LEVEL_C, MUTE, OK, POS_C, RISK, WARN, barBlock, card, cards, esc, h2, note, scoreC, statRow, tag } from "../report/html";

// THE SCENARIO SANDBOX: six shocks, each a transparent rule that reads one or two held inputs from the Case File and moves the three readings the posture rule uses (value to the UAE, UAE ability to act, risk). The shifted readings go through the SAME posture rule as the Case File (`rule`, `THRESHOLDS`, `instrIntensity` from case/core.ts), so the base case is the Case File's own answer and the shocked case differs only by the shifts shown.
// ILLUSTRATIVE RULE OUTPUT: the coefficients are PROPOSED DEFAULTS awaiting owner approval, not estimates of any real effect. A shock whose held input is missing has no effect and says so; an unknown risk cell is never turned into "low".
export type ShockId = "oil" | "sanctions" | "leadership" | "closure" | "donor" | "currency";
export type Shocks = Record<ShockId, number>;
export const SHOCK_IDS: ShockId[] = ["oil", "sanctions", "leadership", "closure", "donor", "currency"];
export const NO_SHOCK: Shocks = { oil: 0, sanctions: 0, leadership: 0, closure: 0, donor: 0, currency: 0 };
const b = (en: string, ar: string): B => ({ en, ar });
export type ShockDef = { id: ShockId; name: B; min: number; max: number; step: number; ask: B };
export const SHOCKS: ShockDef[] = [
  { id: "oil", name: b("Oil price", "سعر النفط"), min: -40, max: 40, step: 5, ask: b("Change in the oil price", "تغيّر سعر النفط") },
  { id: "sanctions", name: b("Sanctions event", "حدث عقوبات"), min: 0, max: 3, step: 1, ask: b("Severity of a new sanctions event on the country (0 none, 3 comprehensive)", "شدة حدث عقوبات جديد على الدولة (0 لا شيء، 3 شامل)") },
  { id: "leadership", name: b("Leadership change", "تغيّر القيادة"), min: 0, max: 2, step: 1, ask: b("Change of head of state (0 none, 1 orderly, 2 disorderly)", "تغيّر رئيس الدولة (0 لا شيء، 1 منظم، 2 غير منظم)") },
  { id: "closure", name: b("Port or Red Sea closure", "إغلاق ميناء أو البحر الأحمر"), min: 0, max: 3, step: 1, ask: b("Months of closure of the ports and sea lanes the country depends on", "أشهر إغلاق الموانئ والممرات البحرية التي تعتمد عليها الدولة") },
  { id: "donor", name: b("Donor cut", "خفض المانحين"), min: 0, max: 100, step: 10, ask: b("Share of donor funding withdrawn", "نسبة تمويل المانحين المسحوب") },
  { id: "currency", name: b("Currency fall", "هبوط العملة"), min: 0, max: 50, step: 5, ask: b("Fall of the currency against the dollar", "هبوط العملة أمام الدولار") },
];
const SEV: B[] = [b("none", "لا شيء"), b("listings widen", "اتساع القوائم"), b("major sectoral sanctions", "عقوبات قطاعية كبرى"), b("comprehensive sanctions", "عقوبات شاملة")];
const LEAD: B[] = [b("none", "لا شيء"), b("orderly change", "تغيير منظم"), b("disorderly change", "تغيير غير منظم")];
/** The slider's value as a phrase in the language asked. */
export function shockText(id: ShockId, v: number, L: "en" | "ar"): string {
  switch (id) {
    case "oil": return `${v > 0 ? "+" : ""}${v}%`;
    case "sanctions": return SEV[Math.max(0, Math.min(3, v))][L];
    case "leadership": return LEAD[Math.max(0, Math.min(2, v))][L];
    case "closure": return v === 0 ? (L === "ar" ? "لا إغلاق" : "none") : L === "ar" ? `${v} أشهر` : `${v} month${v > 1 ? "s" : ""}`;
    case "donor": return `${v}%`;
    case "currency": return v === 0 ? (L === "ar" ? "لا هبوط" : "none") : `−${v}%`;
  }
}
export type Shift = { value: number; ability: number; risk: number };
export type CatId = "political" | "economic" | "financial" | "operational" | "security" | "resource";
export type RuleOut = { id: ShockId; level: number; active: boolean; held: boolean; input: { label: B; display: string }[]; rule: B; formula: B; shift: Shift; cats: { id: CatId; steps: 1 | 2 }[]; note: B };
export type ScenarioInput = Pick<CaseData, "name" | "nameAr" | "posture" | "instruments" | "spine" | "axes" | "leaders" | "deep">;
const r1 = (x: number) => Math.round(x * 10) / 10; const clamp = (x: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));
const sgn = (x: number) => (x > 0 ? "+" : x < 0 ? "−" : "±");
const row = (d: ScenarioInput, name: string) => d.spine.find((s) => s.has && s.met.name === name && s.spine.latest) ?? null;
const lat = (d: ScenarioInput, name: string) => row(d, name)?.spine.latest ?? null;
const ZERO: Shift = { value: 0, ability: 0, risk: 0 };
const stepsOf = (x: number, one: number, two: number): 0 | 1 | 2 => (x >= two ? 2 : x >= one ? 1 : 0);
const cat = (id: CatId, n: 0 | 1 | 2): { id: CatId; steps: 1 | 2 }[] => (n ? [{ id, steps: n }] : []);

/** One shock as a rule: what it reads, the formula with its proposed coefficient, the shift it makes and the categories it steps up. */
export function ruleFor(d: ScenarioInput, id: ShockId, level: number): RuleOut {
  const active = level !== 0; const none = (label: B, why: B, formula: B, rl: B): RuleOut => ({ id, level, active, held: false, input: [{ label, display: "not held" }], rule: rl, formula, shift: { ...ZERO }, cats: [], note: why });
  switch (id) {
    case "oil": {
      const f = b("Importer (rents under 5% of GDP): risk shift = +1.0 × (price change ÷ 10) × (1 − rents ÷ 5). Exporter (rents 5% or more): risk shift = −0.75 × min(rents, 40) ÷ 10 × (price change ÷ 10).", "مستورد (الريوع أقل من 5٪ من الناتج): تغيّر المخاطر = +1.0 × (تغيّر السعر ÷ 10) × (1 − الريوع ÷ 5). مصدّر (الريوع 5٪ فأكثر): تغيّر المخاطر = −0.75 × أدنى (الريوع، 40) ÷ 10 × (تغيّر السعر ÷ 10).");
      const rl = b("A lower oil price strains an exporter's budget (risk up) and eases an importer's import bill (risk down); a higher price does the reverse.", "هبوط سعر النفط يضغط ميزانية المصدّر (المخاطر ترتفع) ويخفف فاتورة المستورد (المخاطر تنخفض)؛ والارتفاع يعكس ذلك.");
      const rt = lat(d, "Oil and gas rents, % of GDP"); const lb = b("Oil and gas rents, % of GDP", "ريوع النفط والغاز، ٪ من الناتج");
      if (!rt) return none(lb, b("No effect applied: the oil and gas rents series is not held for this country.", "لم يُطبَّق أثر: سلسلة ريوع النفط والغاز غير متوافرة لهذه الدولة."), f, rl);
      const s = level / 10; const exporter = rt.v >= 5; const risk = r1(exporter ? -0.75 * (Math.min(rt.v, 40) / 10) * s : 1.0 * s * (1 - rt.v / 5));
      const adverse = Math.max(0, risk);
      return { id, level, active, held: true, input: [{ label: lb, display: `${rt.v.toFixed(1)}% (${rt.y}) · ${exporter ? "exporter" : "importer"}` }], rule: rl, formula: f, shift: { value: 0, ability: 0, risk }, cats: [...cat("economic", stepsOf(adverse, 3, 6)), ...cat("financial", stepsOf(adverse, 6, 99))],
        note: b(`${exporter ? "Exporter" : "Importer"} reading. A relief (risk down) is shown in the shift but no risk category is stepped down.`, `قراءة ${exporter ? "المصدّر" : "المستورد"}. يظهر التخفيف (انخفاض المخاطر) في التغيّر لكن لا تُخفَّض أي فئة مخاطر.`) };
    }
    case "sanctions": {
      const f = b("Ability shift = −6 × severity; risk shift = +5 × severity × (1 + existing sanctions exposure, 0 to 1).", "تغيّر القدرة = −6 × الشدة؛ تغيّر المخاطر = +5 × الشدة × (1 + الانكشاف القائم على العقوبات، من 0 إلى 1).");
      const rl = b("New sanctions on the country limit what the UAE can do openly (ability down) and raise counterparty risk, more where listings already exist.", "العقوبات الجديدة على الدولة تحدّ مما تستطيع الإمارات فعله علنًا (القدرة تنخفض) وترفع مخاطر الطرف المقابل، أكثر حيث توجد قوائم قائمة.");
      const sn = d.deep?.exposure?.rows.find((r) => r.id === "sanctions"); const lb = b("Existing sanctions-list exposure", "الانكشاف القائم على قوائم العقوبات");
      if (!sn) return none(lb, b("No effect applied: the sanctions-list exposure reading is not held for this country.", "لم يُطبَّق أثر: قراءة الانكشاف على العقوبات غير متوافرة لهذه الدولة."), f, rl);
      const m = clamp(sn.magnitude ?? 0, 0, 1); const risk = r1(5 * level * (1 + m)); const ability = r1(-6 * level);
      return { id, level, active, held: true, input: [{ label: lb, display: `${sn.value?.en ?? "none counted"} (magnitude ${m.toFixed(2)})` }], rule: rl, formula: f, shift: { value: 0, ability, risk }, cats: [...cat("security", level >= 2 ? 2 : level >= 1 ? 1 : 0), ...cat("financial", level >= 2 ? 1 : 0)], note: b("Existing exposure multiplies the risk shift; the UAE's own compliance limits are what move ability.", "الانكشاف القائم يضاعف تغيّر المخاطر؛ وقيود الامتثال على الإمارات هي ما يحرّك القدرة.") };
    }
    case "leadership": {
      const f = b("Disruption weight w = 1.5 if the head of state has served 20 years or more, 1.0 if 10 or more, else 0.6. Risk shift = +4 × change × w; value shift = −2 × change × w.", "وزن الاضطراب w = 1.5 إذا خدم رئيس الدولة 20 سنة فأكثر، و1.0 إذا 10 فأكثر، وإلا 0.6. تغيّر المخاطر = +4 × التغيير × w؛ تغيّر القيمة = −2 × التغيير × w.");
      const rl = b("A change of head of state puts the understandings built with the incumbent at risk; the longer the tenure, the more depends on one person. The rule takes the cautious side: the real direction of value is unknown.", "تغيّر رئيس الدولة يعرّض التفاهمات المبنية مع شاغل المنصب للخطر؛ وكلما طالت المدة زاد الاعتماد على شخص واحد. تأخذ القاعدة الجانب الحذر: اتجاه القيمة الحقيقي غير معروف.");
      const t = d.leaders?.head?.tenure ?? null; const lb = b("Head of state's years in office", "سنوات رئيس الدولة في المنصب");
      if (t == null) return none(lb, b("No effect applied: the head of state's start date is not held for this country.", "لم يُطبَّق أثر: تاريخ تولي رئيس الدولة غير متوافر لهذه الدولة."), f, rl);
      const w = t >= 20 ? 1.5 : t >= 10 ? 1.0 : 0.6; const risk = r1(4 * level * w); const value = r1(-2 * level * w);
      return { id, level, active, held: true, input: [{ label: lb, display: `${t} years (w = ${w})` }], rule: rl, formula: f, shift: { value, ability: 0, risk }, cats: cat("political", level >= 2 ? 2 : level >= 1 ? 1 : 0), note: b("Value is shown moving down as a cautious reading; it could as well move up if the successor is closer to the UAE.", "تظهر القيمة منخفضة كقراءة حذرة؛ وقد ترتفع إن كان الخلف أقرب إلى الإمارات.") };
    }
    case "closure": {
      const f = b("Exposure x = corridor criticality ÷ 5 (× 1.25 if trade openness is 60% of GDP or more). Risk shift = +3 × months × x; ability shift = −4 × months × x.", "التعرّض x = أهمية الممر ÷ 5 (× 1.25 إذا كان الانفتاح التجاري 60٪ من الناتج فأكثر). تغيّر المخاطر = +3 × الأشهر × x؛ تغيّر القدرة = −4 × الأشهر × x.");
      const rl = b("A closure of the ports and sea lanes cuts the UAE's logistics reach into the country (ability down) and raises operating and supply risk, in proportion to how critical the country's corridor position is.", "إغلاق الموانئ والممرات يقطع وصول الإمارات اللوجستي إلى الدولة (القدرة تنخفض) ويرفع مخاطر التشغيل والإمداد بقدر أهمية موقعها في الممرات.");
      const ax = d.axes.find((a) => a.id === "corridor"); const op = lat(d, "Trade openness, % of GDP"); const lb = b("Corridor criticality (0 to 5)", "أهمية الممر (من 0 إلى 5)");
      if (!ax) return none(lb, b("No effect applied: the corridor-criticality reading is not held (no strategic profile).", "لم يُطبَّق أثر: قراءة أهمية الممر غير متوافرة (لا ملف استراتيجي)."), f, rl);
      const x = (ax.v / 5) * (op && op.v >= 60 ? 1.25 : 1); const risk = r1(3 * level * x); const ability = r1(-4 * level * x);
      return { id, level, active, held: true, input: [{ label: lb, display: ax.v.toFixed(1) }, { label: b("Trade openness, % of GDP (amplifier)", "الانفتاح التجاري، ٪ من الناتج (مضخّم)"), display: op ? `${op.v.toFixed(0)}% (${op.y})` : "not held (no amplifier)" }], rule: rl, formula: f, shift: { value: 0, ability, risk }, cats: cat("operational", stepsOf(level * x, 0.9, 2)), note: b("The corridor reading is a 0 to 5 profile score, not a measured traffic share.", "قراءة الممر درجة ملف من 0 إلى 5 لا حصة حركة مقيسة.") };
    }
    case "donor": {
      const f = b("Fragility = (6 − reserves cover in months) ÷ 6, limited to 0 to 1. Risk shift = +12 × (cut ÷ 100) × fragility.", "الهشاشة = (6 − تغطية الاحتياطيات بالأشهر) ÷ 6 ضمن 0 إلى 1. تغيّر المخاطر = +12 × (الخفض ÷ 100) × الهشاشة.");
      const rl = b("A withdrawal of donor funding hurts most where reserves are thin: a country with six months of import cover or more is treated as able to absorb it.", "سحب تمويل المانحين يؤذي أكثر حيث الاحتياطيات ضعيفة: الدولة التي لديها تغطية ستة أشهر استيراد فأكثر تُعدّ قادرة على استيعابه.");
      const rs = lat(d, "Reserves, months of imports"); const lb = b("Reserves, months of imports", "الاحتياطيات، أشهر الاستيراد"); const dev = d.instruments.find((i) => i.id === "development");
      if (!rs) return none(lb, b("No effect applied: the reserves-cover series is not held for this country.", "لم يُطبَّق أثر: سلسلة تغطية الاحتياطيات غير متوافرة لهذه الدولة."), f, rl);
      const fr = clamp((6 - rs.v) / 6, 0, 1); const risk = r1(12 * (level / 100) * fr);
      return { id, level, active, held: true, input: [{ label: lb, display: `${rs.v.toFixed(1)} (${rs.y}) · fragility ${fr.toFixed(2)}` }, { label: b("UAE development footprint (0 to 5)", "حضور الإمارات التنموي (من 0 إلى 5)"), display: dev?.footprint != null ? `${dev.footprint}` : "not held" }], rule: rl, formula: f, shift: { value: 0, ability: 0, risk }, cats: cat("financial", level >= 50 && fr >= 0.5 ? 2 : level >= 25 && fr >= 0.25 ? 1 : 0), note: b(dev?.headroom != null && dev.headroom >= 2 ? "The UAE's development instrument has headroom here, so a gap left by donors is also an opening (a choice, not a forecast)." : "Whether the UAE would step into a gap is a choice for the desk, not a result of this rule.", dev?.headroom != null && dev.headroom >= 2 ? "لدى أداة التنمية الإماراتية مجال هنا، فالفجوة التي يتركها المانحون فرصة أيضًا (خيار لا توقع)." : "ملء الإمارات للفجوة قرار للمكتب لا نتيجة لهذه القاعدة.") };
    }
    case "currency": {
      const f = b("Risk shift = +0.1 × fall % × (0.5 + min(debt ÷ 100, 1.5)), where debt is government gross debt, % of GDP.", "تغيّر المخاطر = +0.1 × نسبة الهبوط × (0.5 + أدنى (الدين ÷ 100، 1.5))، حيث الدين هو إجمالي الدين الحكومي ٪ من الناتج.");
      const rl = b("A currency fall raises the burden of debt, much of it in dollars, and feeds inflation; the heavier the debt, the larger the effect.", "هبوط العملة يرفع عبء الدين، وجزء كبير منه بالدولار، ويغذي التضخم؛ وكلما ثقل الدين كبر الأثر.");
      const db = lat(d, "Government gross debt, % of GDP"); const inf = lat(d, "Inflation, consumer prices"); const lb = b("Government gross debt, % of GDP", "إجمالي الدين الحكومي، ٪ من الناتج");
      if (!db) return none(lb, b("No effect applied: the government debt series is not held for this country.", "لم يُطبَّق أثر: سلسلة الدين الحكومي غير متوافرة لهذه الدولة."), f, rl);
      const risk = r1(0.1 * level * (0.5 + Math.min(db.v / 100, 1.5)));
      return { id, level, active, held: true, input: [{ label: lb, display: `${db.v.toFixed(0)}% (${db.y})` }, { label: b("Inflation, consumer prices (context)", "التضخم، أسعار المستهلك (سياق)"), display: inf ? `${inf.v.toFixed(1)}% (${inf.y})` : "not held" }], rule: rl, formula: f, shift: { value: 0, ability: 0, risk }, cats: [...cat("economic", stepsOf(risk, 3, 6)), ...cat("financial", stepsOf(risk, 4, 99))], note: b("Inflation is shown for context and does not enter the formula.", "التضخم للسياق ولا يدخل في المعادلة.") };
    }
  }
}
export type Reading = { posture: Posture | null; value: number; ability: number; risk: number; stable: boolean; alternatives: Posture[] };
/** The same 27-point sensitivity grid (±10 on each reading) that the Case File's posture() uses. */
export function alternativesOf(v: number, a: number, r: number): Posture[] {
  const base = rule(v, a, r); const alts = new Set<Posture>(); for (const dv of [-10, 0, 10]) for (const da of [-10, 0, 10]) for (const dr of [-10, 0, 10]) alts.add(rule(v + dv, a + da, r + dr)); alts.delete(base); return [...alts];
}
export const LEVELS: Level[] = ["none", "low", "medium", "high"];
/** Steps a risk level up; "none" (not available) stays none and is never turned into low. */
export const stepUp = (l: Level, n: number): Level => (l === "none" ? "none" : LEVELS[Math.min(3, LEVELS.indexOf(l) + n)]);
export type Cond = { id: string; key: "value" | "ability" | "risk"; op: ">=" | "<=" | "<"; limit: number; label: B };
const T = THRESHOLDS;
export const CONDS: Cond[] = [
  { id: "deepenValue", key: "value", op: ">=", limit: T.deepenValue, label: b("value for Deepen", "القيمة للتعميق") }, { id: "deepenAbility", key: "ability", op: ">=", limit: T.deepenAbility, label: b("ability for Deepen", "القدرة للتعميق") }, { id: "deepenRisk", key: "risk", op: "<=", limit: T.deepenRisk, label: b("risk ceiling for Deepen", "سقف المخاطر للتعميق") },
  { id: "stagedValue", key: "value", op: ">=", limit: T.stagedValue, label: b("value floor for staged or hedge", "حد القيمة للتدرج أو التحوط") }, { id: "stagedAbility", key: "ability", op: ">=", limit: T.stagedAbility, label: b("ability floor for staged", "حد القدرة للتدرج") },
];
const passes = (c: Cond, x: { value: number; ability: number; risk: number }) => (c.op === ">=" ? x[c.key] >= c.limit : c.op === "<=" ? x[c.key] <= c.limit : x[c.key] < c.limit);
/** What each posture needs from the three readings (the rule in core.ts, as conditions). */
export function needsOf(p: Posture): Pick<Cond, "key" | "op" | "limit">[] {
  switch (p) {
    case "deepen": return [{ key: "value", op: ">=", limit: T.deepenValue }, { key: "ability", op: ">=", limit: T.deepenAbility }, { key: "risk", op: "<=", limit: T.deepenRisk }];
    case "staged": return [{ key: "value", op: ">=", limit: T.stagedValue }, { key: "ability", op: ">=", limit: T.stagedAbility }];
    case "hedge": return [{ key: "value", op: ">=", limit: T.stagedValue }, { key: "ability", op: "<", limit: T.stagedAbility }];
    case "hold": return [{ key: "value", op: "<", limit: T.stagedValue }];
  }
}
const KEY_NAME: Record<string, B> = { value: b("value", "القيمة"), ability: b("ability", "القدرة"), risk: b("risk", "المخاطر") };
export type InstrOut = { id: string; name: B; footprint: number | null; headroom: number | null; base: B; shocked: B; changed: boolean };
export type CatOut = { id: CatId; name: B; base: Level; shocked: Level; steps: number; by: ShockId[]; text: B };
export type ScenarioResult = {
  placed: boolean; active: ShockId[]; rules: RuleOut[]; base: Reading | null; shocked: Reading | null; delta: Shift; baseRuleAgrees: boolean;
  instruments: InstrOut[]; cats: CatOut[]; crossed: { cond: Cond; was: boolean; now: boolean }[]; needs: B[]; course: { base: { name: B; sub: B } | null; shocked: { name: B; sub: B } | null; changed: boolean }; moves: B[]; line: B;
};
/** The whole scenario: base case (the Case File's own posture) against the shocked case. */
export function computeScenario(d: ScenarioInput, shocks: Shocks): ScenarioResult {
  const rules = SHOCK_IDS.map((id) => ruleFor(d, id, shocks[id] ?? 0)); const active = rules.filter((r) => r.active).map((r) => r.id);
  const p = d.posture; const placed = p.posture != null && p.value != null && p.ability != null && p.risk != null;
  const sum = rules.reduce((a, r) => ({ value: a.value + r.shift.value, ability: a.ability + r.shift.ability, risk: a.risk + r.shift.risk }), { ...ZERO });
  const none: ScenarioResult = { placed: false, active, rules, base: null, shocked: null, delta: { ...ZERO }, baseRuleAgrees: true, instruments: [], cats: [], crossed: [], needs: [], course: { base: null, shocked: null, changed: false }, moves: [], line: b("The Case File does not place this country (value, ability or risk is missing), so a shock has nothing to move. Add the missing data first.", "لا يحدد ملف الحالة موقف هذه الدولة (القيمة أو القدرة أو المخاطر ناقصة) فلا شيء تحرّكه الصدمة. أضف البيانات الناقصة أولًا.") };
  if (!placed) return none;
  const bv = p.value!, ba = p.ability!, br = p.risk!; const baseRule = rule(bv, ba, br);
  const base: Reading = { posture: p.posture, value: bv, ability: ba, risk: br, stable: p.stable, alternatives: p.alternatives };
  const sv = clamp(Math.round(bv + sum.value)), sa = clamp(Math.round(ba + sum.ability)), sr = clamp(Math.round(br + sum.risk));
  const moved = sv !== bv || sa !== ba || sr !== br; const sp: Posture = moved ? rule(sv, sa, sr) : p.posture!; const alt = alternativesOf(sv, sa, sr);
  const shocked: Reading = { posture: sp, value: sv, ability: sa, risk: sr, stable: moved ? alt.length === 0 : p.stable, alternatives: moved ? alt : p.alternatives };
  const instruments = d.instruments.map((i): InstrOut => { const fp = i.headroom == null ? null : 5 - i.headroom; /* the stored headroom was made from the unrounded footprint, so it is the exact input of the rule */ const bs = instrIntensity(fp, p.posture); const sh = instrIntensity(fp, sp); return { id: i.id, name: i.name, footprint: i.footprint, headroom: i.headroom, base: bs, shocked: sh, changed: bs.en !== sh.en }; });
  const NAME: Record<CatId, B> = { political: b("Political", "السياسي"), economic: b("Economic", "الاقتصادي"), financial: b("Financial", "المالي"), operational: b("Operational", "التشغيلي"), security: b("Security", "الأمني"), resource: b("Resource and climate", "الموارد والمناخ") };
  const matrix = riskMatrix(d as CaseData);
  const cats = matrix.map((m): CatOut => { const hit = rules.filter((r) => r.active && r.held).flatMap((r) => r.cats.filter((c) => c.id === m.id).map((c) => ({ id: r.id, steps: c.steps }))); const steps = hit.reduce((a, c) => a + c.steps, 0); const sh = stepUp(m.short.level, steps);
    return { id: m.id as CatId, name: NAME[m.id as CatId] ?? m.name, base: m.short.level, shocked: sh, steps, by: hit.map((h) => h.id), text: m.short.text }; });
  const crossed = CONDS.map((c) => ({ cond: c, was: passes(c, base), now: passes(c, shocked) })).filter((x) => x.was !== x.now);
  const needs: B[] = sp !== p.posture ? needsOf(p.posture!).filter((c) => !passes({ id: "", label: b("", ""), ...c }, shocked)).map((c) => { const cur = shocked[c.key]; const gap = c.op === ">=" ? c.limit - cur : c.op === "<=" ? cur - c.limit : Math.abs(cur - c.limit) + 1; const dirEn = c.op === ">=" ? `rise by ${gap}` : `fall by ${gap}`; const dirAr = c.op === ">=" ? `ترتفع ${gap}` : `تنخفض ${gap}`;
    return b(`To return to ${POSTURE[p.posture!].name.en}, ${KEY_NAME[c.key].en} would have to ${dirEn} points to ${c.op === "<" ? "below" : c.op === ">=" ? "at least" : "at most"} ${c.limit} (now ${cur}).`, `للعودة إلى ${POSTURE[p.posture!].name.ar} يجب أن ${KEY_NAME[c.key].ar} ${dirAr} نقطة إلى ${c.op === "<" ? "أقل من" : c.op === ">=" ? "ما لا يقل عن" : "ما لا يزيد على"} ${c.limit} (الآن ${cur}).`); }) : [];
  const course = { base: { name: POSTURE[p.posture!].name, sub: POSTURE[p.posture!].sub }, shocked: { name: POSTURE[sp].name, sub: POSTURE[sp].sub }, changed: sp !== p.posture };
  const ch = instruments.filter((i) => i.changed); const moves = ch.map((i) => b(`${i.name.en}: ${i.base.en} → ${i.shocked.en}`, `${i.name.ar}: ${i.base.ar} ← ${i.shocked.ar}`));
  const line = !active.length ? b("No shock is set: the shocked case is the base case.", "لا صدمة مضبوطة: الحالة المصدومة هي الحالة الأساسية.")
    : course.changed ? b(`The course moves from ${course.base.name.en} to ${course.shocked.name.en}: ${course.shocked.sub.en}${ch.length ? ` ${ch.length} instrument${ch.length > 1 ? "s change" : " changes"} intensity.` : ""}`, `يتحول المسار من ${course.base.name.ar} إلى ${course.shocked.name.ar}: ${course.shocked.sub.ar}${ch.length ? ` وتتغير شدة ${ch.length} من الأدوات.` : ""}`)
    : b(`The course stays ${course.base.name.en}${ch.length ? `, but ${ch.length} instrument${ch.length > 1 ? "s change" : " changes"} intensity` : ": no instrument changes intensity"}${shocked.stable !== base.stable ? "; the stability of the reading changes" : ""}.`, `يبقى المسار ${course.base.name.ar}${ch.length ? `، لكن تتغير شدة ${ch.length} من الأدوات` : ": ولا تتغير شدة أي أداة"}${shocked.stable !== base.stable ? "؛ ويتغير استقرار القراءة" : ""}.`);
  return { placed: true, active, rules, base, shocked, delta: { value: sv - bv, ability: sa - ba, risk: sr - br }, baseRuleAgrees: baseRule === p.posture, instruments, cats, crossed, needs, course, moves, line };
}
export const LABEL = b("Illustrative rule output. The coefficients are proposed defaults awaiting owner approval, not estimates of any real effect; every shift is shown with its rule. Shifts add up (no interaction between shocks is modelled).", "مخرجات قواعد توضيحية. المعاملات افتراضات مقترحة بانتظار اعتماد المالك لا تقديرات لأثر حقيقي؛ ويُعرض كل تغيّر مع قاعدته. تتراكم التغيّرات (ولا يُنمذج تفاعل بين الصدمات).");
const sh = (x: number, d = 1) => (x === 0 ? "0" : `${sgn(x)}${Math.abs(x).toFixed(Math.abs(x) % 1 ? d : 0)}`);
/** The scenario as plain text: for the agent write-up and the briefing pack. */
export function scenarioText(r: ScenarioResult, name: string, shocks: Shocks): string {
  const L = "en" as const; const out: string[] = [`Scenario sandbox for ${name}. ${LABEL.en}`];
  out.push(`Shocks set: ${r.active.length ? r.active.map((id) => `${SHOCKS.find((s) => s.id === id)!.name.en} ${shockText(id, shocks[id], L)}`).join("; ") : "none"}.`);
  if (!r.placed || !r.base || !r.shocked) { out.push(r.line.en); return out.join("\n"); }
  out.push(`Base case (the Case File's own reading): ${POSTURE[r.base.posture!].name.en}; value ${r.base.value}, ability ${r.base.ability}, risk ${r.base.risk}; ${r.base.stable ? "stable" : `not stable (also ${r.base.alternatives.map((a) => POSTURE[a].name.en).join(", ")})`}.`);
  out.push(`Shocked case: ${POSTURE[r.shocked.posture!].name.en}; value ${r.shocked.value} (${sh(r.delta.value)}), ability ${r.shocked.ability} (${sh(r.delta.ability)}), risk ${r.shocked.risk} (${sh(r.delta.risk)}); ${r.shocked.stable ? "stable" : `not stable (also ${r.shocked.alternatives.map((a) => POSTURE[a].name.en).join(", ")})`}.`);
  for (const x of r.rules.filter((q) => q.active)) out.push(`Rule, ${SHOCKS.find((s) => s.id === x.id)!.name.en} ${shockText(x.id, x.level, L)}: reads ${x.input.map((i) => `${i.label.en} = ${i.display}`).join("; ")}. ${x.formula.en} Shift: value ${sh(x.shift.value)}, ability ${sh(x.shift.ability)}, risk ${sh(x.shift.risk)}.${x.held ? "" : " " + x.note.en}`);
  out.push(`Thresholds crossed: ${r.crossed.length ? r.crossed.map((c) => `${c.cond.label.en} (${c.cond.op} ${c.cond.limit}) ${c.was ? "met" : "not met"} → ${c.now ? "met" : "not met"}`).join("; ") : "none"}.`);
  if (r.needs.length) out.push(...r.needs.map((n) => n.en));
  out.push(`Risk categories stepped up: ${r.cats.filter((c) => c.base !== c.shocked).map((c) => `${c.name.en} ${c.base} → ${c.shocked}`).join("; ") || "none"}.`);
  out.push(`Instrument intensity changes: ${r.moves.length ? r.moves.map((m) => m.en).join("; ") : "none"}.`);
  out.push(`Playbook line: ${r.line.en}`);
  return out.join("\n");
}
/** The scenario as PDF-ready blocks (each a top-level element). */
export function scenarioBlocks(r: ScenarioResult, name: string, shocks: Shocks, lang: "en" | "ar", writeup?: string): string[] {
  const e = (x: B) => x[lang]; const E = (en: string, ar: string) => (lang === "ar" ? ar : en); const out: string[] = [];
  out.push(note(esc(e(LABEL)), "warn"));
  out.push(h2(E("The shocks", "الصدمات")), `<table class="tbl"><thead><tr><th>${esc(E("Shock", "الصدمة"))}</th><th>${esc(E("Setting", "الضبط"))}</th><th>${esc(E("Reads (held input)", "يقرأ (مدخل محفوظ)"))}</th><th>${esc(E("Shift: value / ability / risk", "التغيّر: القيمة / القدرة / المخاطر"))}</th></tr></thead><tbody>${r.rules.map((x) => `<tr><td>${esc(e(SHOCKS.find((s) => s.id === x.id)!.name))}</td><td>${esc(shockText(x.id, x.level, lang))}</td><td>${x.input.map((i) => `${esc(e(i.label))}: ${esc(i.display)}`).join("<br>")}</td><td>${x.active ? `${sh(x.shift.value)} / ${sh(x.shift.ability)} / ${sh(x.shift.risk)}` : "—"}${x.active && !x.held ? `<br>${esc(e(x.note))}` : ""}</td></tr>`).join("")}</tbody></table>`);
  if (!r.placed || !r.base || !r.shocked) { out.push(note(esc(e(r.line)), "risk")); return out; }
  const pc = (p: Posture) => POS_C[p];
  out.push(h2(E("Base case against the shocked case", "الحالة الأساسية مقابل الحالة المصدومة")), statRow([{ n: e(POSTURE[r.base.posture!].name), label: E("base posture", "الموقف الأساسي"), color: pc(r.base.posture!) }, { n: e(POSTURE[r.shocked.posture!].name), label: E("shocked posture", "الموقف بعد الصدمة"), color: pc(r.shocked.posture!) }, { n: sh(r.delta.risk), label: E("risk shift (points)", "تغيّر المخاطر (نقاط)"), color: r.delta.risk > 0 ? RISK : r.delta.risk < 0 ? OK : MUTE }, { n: r.shocked.stable ? E("stable", "مستقر") : E("not stable", "غير مستقر"), label: E("stability of the shocked reading", "استقرار القراءة بعد الصدمة"), color: r.shocked.stable ? OK : WARN }]));
  const rd = (k: "value" | "ability" | "risk", label: B, good: "high" | "low") => [{ label: `${e(label)} · ${E("base", "أساس")}`, share: r.base![k] / 100, color: MUTE, text: String(r.base![k]) }, { label: `${e(label)} · ${E("shocked", "بعد الصدمة")}`, share: r.shocked![k] / 100, color: good === "high" ? scoreC(r.shocked![k]) : scoreC(100 - r.shocked![k]), text: `${r.shocked![k]} (${sh(r.delta[k])})` }];
  out.push(barBlock([...rd("value", b("Value to the UAE", "القيمة للإمارات"), "high"), ...rd("ability", b("UAE ability to act", "قدرة الإمارات على الفعل"), "high"), ...rd("risk", b("Risk", "المخاطر"), "low")]));
  out.push(note(`<b>${esc(E("Playbook line", "سطر الدليل"))}:</b> ${esc(e(r.line))}`, r.course.changed ? "warn" : ""));
  if (r.crossed.length) out.push(note(`<b>${esc(E("Thresholds crossed", "العتبات المتجاوزة"))}:</b> ${r.crossed.map((c) => esc(`${e(c.cond.label)} (${c.cond.op} ${c.cond.limit}): ${c.was ? E("met", "متحققة") : E("not met", "غير متحققة")} → ${c.now ? E("met", "متحققة") : E("not met", "غير متحققة")}`)).join("; ")}`));
  if (r.needs.length) out.push(note(`<b>${esc(E("What would have to be true", "ما الذي يجب أن يتحقق"))}:</b><br>${r.needs.map((n) => esc(e(n))).join("<br>")}`));
  out.push(h2(E("Instruments: intensity under each case", "الأدوات: الشدة في كل حالة")), `<table class="tbl"><thead><tr><th>${esc(E("Instrument", "الأداة"))}</th><th>${esc(E("Footprint / headroom", "الحضور / المجال"))}</th><th>${esc(E("Base", "الأساس"))}</th><th>${esc(E("Shocked", "بعد الصدمة"))}</th></tr></thead><tbody>${r.instruments.map((i) => `<tr><td>${esc(e(i.name))}</td><td>${i.footprint ?? "n/a"} / ${i.headroom ?? "n/a"}</td><td>${esc(e(i.base))}</td><td>${i.changed ? "<b>" : ""}${esc(e(i.shocked))}${i.changed ? "</b>" : ""}</td></tr>`).join("")}</tbody></table>`);
  out.push(h2(E("Risk categories (short-term view)", "فئات المخاطر (المدى القصير)")), cards(r.cats.map((c) => card({ title: e(c.name), pill: c.base === c.shocked ? c.base : `${c.base} → ${c.shocked}`, color: LEVEL_C[c.shocked] ?? MUTE, body: `<p class="sub">${esc(e(c.text))}</p>${c.by.length ? `<p>${c.by.map((id) => tag(e(SHOCKS.find((s) => s.id === id)!.name), WARN, { sm: true })).join(" ")}</p>` : ""}`, wide: 3 }))));
  out.push(h2(E("The rules behind each shift", "القواعد وراء كل تغيّر")), ...r.rules.filter((x) => x.active).map((x) => card({ title: e(SHOCKS.find((s) => s.id === x.id)!.name), pill: shockText(x.id, x.level, lang), color: x.held ? WARN : MUTE, body: `<p>${esc(e(x.rule))}</p><p class="sub">${esc(e(x.formula))}</p><p class="sub">${esc(e(x.note))}</p>`, wide: 1 })));
  if (writeup) out.push(h2(E("Agent write-up (from the rule table above; no figure added)", "كتابة الوكيل (من جدول القواعد أعلاه؛ دون إضافة أرقام)")), `<div>${writeup.split(/\n{2,}/).map((p) => `<p>${esc(p)}</p>`).join("")}</div>`);
  void name; void shocks; return out;
}
