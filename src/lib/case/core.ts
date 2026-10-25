import { INSTRUMENTS } from "../machiavelli/content";
import type { Profile } from "../machiavelli/profile-core";

// The Case File's pure statecraft layer: six lenses with a divergence check, eight value pillars to the UAE, a posture rule with a sensitivity test, an instrument matrix, and the measured part of the position toward UAE policy.
// Everything is arithmetic on held datasets with an evidence string, so it is reproducible and costs nothing. No lens or pillar is merged into a single score: the posture is a rule on three separate readings (value, ability, risk) and shows how stable it is.
// Thresholds are PROPOSED defaults awaiting owner approval, and the screens say so.
export type B = { en: string; ar: string };
export type Pt = [number, number];
export type Inputs = {
  iso3: string; name: string; nameAr: string | null; region: string; subregion: string | null;
  score: { overall: number; tier: string; dims: Record<string, { score: number | null }> } | null;
  part: { score: number; rank: number; n: number; c: Record<string, number>; raw: Record<string, number> } | null;
  lev: { theirs: number | null; ours: number | null; quadrant: string | null } | null;
  profile: Profile | null;
  rivals: { uae: { share: number; rank: number } | null; of: number; list: { c: string; share: number }[] } | null;
  tone: { n: number; g: number; coop: number; tone: number | null; trend: number | null } | null;
  un: { uae: number | null; usa: number | null; chn: number | null; rus: number | null };
  leaders: { state?: { name: string; start?: string; birth?: string }; gov?: { name: string; start?: string; birth?: string } } | null;
  dist: { part: number[]; score: number[]; composite: number[] };
  exposure: { score: number | null; band: string; confidence: number; known: number; unknown: number } | null;
  screen: { rank: number; of: number; stable: boolean; ranks: number[] } | null;
  growthOutlook: number | null; deals365: number | null; aid5Usd: number | null; now: number;
};
const b = (en: string, ar: string): B => ({ en, ar });
export const pctile = (v: number, arr: number[]) => (arr.length ? Math.round((arr.filter((x) => x <= v).length / arr.length) * 100) : null);
const mean = (x: (number | null | undefined)[]) => { const v = x.filter((y): y is number => y != null && isFinite(y)); return v.length ? v.reduce((a, c) => a + c, 0) / v.length : null; };
const r0 = (x: number) => Math.round(x);
const clamp = (x: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));

// ---- six lenses ----
export type Lens = { id: string; name: B; value: string; valueAr: string; scale: B; pos: number | null; basis: "percentile" | "scale"; note: B };
export function lenses(i: Inputs): Lens[] {
  const dims = i.score?.dims ?? {}; const cond = mean([dims.political?.score, dims.economic?.score, dims.financial?.score, dims.social?.score, dims.security?.score]);
  const L: Lens[] = [];
  L.push({ id: "relationship", name: b("Relationship strength", "قوة العلاقة"), value: i.part ? `${i.part.score}/100, #${i.part.rank} of ${i.part.n}` : "n/a", valueAr: i.part ? `${i.part.score}/100، #${i.part.rank} من ${i.part.n}` : "غير متاح", scale: b("Partnership index 0-100", "مؤشر الشراكة 0-100"), pos: i.part ? pctile(i.part.score, i.dist.part) : null, basis: "percentile", note: b("Trade, engagement, agreements, connectivity, investment, alignment.", "التجارة والتفاعل والاتفاقيات والربط والاستثمار والتوافق.") });
  L.push({ id: "scorecard", name: b("Overall scorecard", "بطاقة الدرجات الكلية"), value: i.score ? `${i.score.overall}/100, ${i.score.tier}` : "n/a", valueAr: i.score ? `${i.score.overall}/100، ${TIER_AR[i.score.tier] ?? i.score.tier}` : "غير متاح", scale: b("Scorecard 0-100", "بطاقة الدرجات 0-100"), pos: i.score ? pctile(i.score.overall, i.dist.score) : null, basis: "percentile", note: b("Relationship, the counterpart's condition and its weight in the world.", "العلاقة وأحوال الطرف المقابل ووزنه عالميًا.") });
  L.push({ id: "strategic", name: b("Strategic value", "القيمة الاستراتيجية"), value: i.profile ? `${i.profile.tier ?? "no tier"}, ${i.profile.composite}/5` : "n/a", valueAr: i.profile ? `${i.profile.tier ?? "بلا فئة"}، ${i.profile.composite}/5` : "غير متاح", scale: b("Module composite 0-5", "المركّب 0-5"), pos: i.profile ? pctile(i.profile.composite, i.dist.composite) : null, basis: "percentile", note: b("Radar composite: growth, corridor, durability, competition, capacity, ESG.", "مركّب الرادار: النمو والممرات والمتانة والمنافسة والقدرة والاستدامة.") });
  L.push({ id: "exposure", name: b("UAE exposure", "انكشاف الإمارات"), value: i.exposure ? `${i.exposure.score ?? "n/a"}, ${i.exposure.band}` : "n/a", valueAr: i.exposure ? `${i.exposure.score ?? "غير متاح"}، ${BAND_AR[i.exposure.band] ?? i.exposure.band}` : "غير متاح", scale: b("Priority 0-100 (confidence shown)", "الأولوية 0-100 (مع الثقة)"), pos: i.exposure?.score ?? null, basis: "scale", note: b(i.exposure ? `${i.exposure.known} known and ${i.exposure.unknown} unknown measures; unknown is not zero.` : "", i.exposure ? `${i.exposure.known} مقياسًا معروفًا و${i.exposure.unknown} غير معروف؛ وغير المعروف ليس صفرًا.` : "") });
  L.push({ id: "opportunity", name: b("Market opportunity", "فرصة السوق"), value: i.screen ? `rank ${i.screen.rank} of ${i.screen.of}${i.screen.stable ? "" : ", unstable"}` : "not on the screen", valueAr: i.screen ? `المرتبة ${i.screen.rank} من ${i.screen.of}${i.screen.stable ? "" : "، غير مستقرة"}` : "ليست في الفرز", scale: b("Trade screen rank", "ترتيب فرز التجارة"), pos: i.screen ? clamp(Math.round((1 - (i.screen.rank - 1) / Math.max(1, i.screen.of - 1)) * 100)) : null, basis: "percentile", note: b("Demand outlook, headroom, momentum and access; ranked under three weightings.", "آفاق الطلب ومساحة النمو والزخم والنفاذ؛ بترتيب تحت ثلاثة أوزان.") });
  L.push({ id: "condition", name: b("Counterpart condition", "أحوال الطرف المقابل"), value: cond != null ? `${r0(cond)}/100` : "n/a", valueAr: cond != null ? `${r0(cond)}/100` : "غير متاح", scale: b("Mean of five condition dimensions", "متوسط خمسة أبعاد"), pos: cond != null ? r0(cond) : null, basis: "scale", note: b("Political, economic, financial, social and security condition; low means fragile.", "الحالة السياسية والاقتصادية والمالية والاجتماعية والأمنية؛ المنخفض يعني هشاشة.") });
  return L;
}
export type Divergence = { flag: boolean; gap: number; hi: Lens | null; lo: Lens | null; text: B };
const HINTS: Record<string, B> = {
  "relationship|strategic": b("The UAE is well connected to a country the module ranks lower on strategic value: ties rest on politics and connectivity more than on capital, trade weight or hard power.", "الإمارات متصلة جيدًا بدولة تُقيَّم أدنى استراتيجيًا: فالعلاقة تقوم على السياسة والربط أكثر من رأس المال أو الوزن التجاري أو القوة الصلبة."),
  "relationship|exposure": b("Ties are strong but measured exposure is modest: the relationship is political and logistical rather than a financial dependency, and some exposures are unknown.", "الروابط قوية لكن الانكشاف المقيس متواضع: العلاقة سياسية ولوجستية لا اعتماد مالي، وبعض أوجه الانكشاف غير معروفة."),
  "relationship|condition": b("The UAE's ties are strong while the counterpart's own condition is fragile: counterparty risk rises with every commitment.", "علاقة الإمارات قوية بينما حال الطرف المقابل هشة: ترتفع مخاطر الطرف المقابل مع كل التزام."),
  "strategic|exposure": b("High strategic value with little existing exposure: the UAE has room to build, and its present weight is thin relative to the country's importance.", "قيمة استراتيجية عالية مع انكشاف قليل: أمام الإمارات مجال للبناء، ووزنها الحالي ضعيف قياسًا بأهمية الدولة."),
  "opportunity|exposure": b("A high market opportunity with little existing exposure: a growth bet, not a dependency.", "فرصة سوقية مرتفعة مع انكشاف قليل: رهان نمو لا اعتماد."),
  "opportunity|condition": b("The market looks attractive on the screen while the counterpart's condition is weak: verify before committing capital.", "يبدو السوق جذابًا في الفرز بينما أحوال الطرف المقابل ضعيفة: يلزم التحقق قبل ضخ رأس المال."),
  "strategic|condition": b("Strategic value and the counterpart's condition point in different directions: value is not the same as safety.", "تتجه القيمة الاستراتيجية وأحوال الطرف المقابل في اتجاهين مختلفين: القيمة ليست الأمان."),
};
export function divergence(ls: Lens[]): Divergence {
  const k = ls.filter((l) => l.pos != null); if (k.length < 2) return { flag: false, gap: 0, hi: null, lo: null, text: b("Too few lenses have data to compare.", "عدد العدسات ذات البيانات قليل للمقارنة.") };
  const hi = k.reduce((a, c) => (c.pos! > a.pos! ? c : a)); const lo = k.reduce((a, c) => (c.pos! < a.pos! ? c : a)); const gap = hi.pos! - lo.pos!;
  if (gap <= 40) return { flag: false, gap, hi, lo, text: b("The lenses broadly agree (within 40 points).", "العدسات متقاربة عمومًا (ضمن 40 نقطة).") };
  const key = `${hi.id}|${lo.id}`; const h = HINTS[key] ?? HINTS[`${lo.id}|${hi.id}`];
  return { flag: true, gap, hi, lo, text: b(`Lenses diverge by ${gap} points: ${hi.name.en} is high (${hi.pos}) but ${lo.name.en} is low (${lo.pos}). ${h?.en ?? "They measure different things; read both."}`, `تتباعد العدسات بمقدار ${gap} نقطة: ${hi.name.ar} مرتفعة (${hi.pos}) بينما ${lo.name.ar} منخفضة (${lo.pos}). ${h?.ar ?? "تقيس أشياء مختلفة؛ فاقرأ الاثنتين."}`) };
}

// ---- eight value pillars ----
export type Part = { k: string; kAr: string; v: number; ev: string; evAr?: string };
const PART_K_AR: Record<string, string> = { "UN agreement": "اتفاق الأمم المتحدة", "Alignment index": "مؤشر التوافق", Engagement: "التفاعل", Agreements: "الاتفاقيات", "Political friends": "الأصدقاء السياسيون", "Business friends": "الأصدقاء التجاريون", Trade: "التجارة", "Growth outlook": "آفاق النمو", Investment: "الاستثمار", Deals: "الصفقات", "Corridor axis": "محور الممرات", Strategic: "الاستراتيجي", "Hard channel": "قناة القوة الصلبة", "Security condition": "الحالة الأمنية", "Soft channel": "قناة القوة الناعمة", "Social condition": "الحالة الاجتماعية", "World influence": "النفوذ العالمي", Durability: "المتانة", "Political condition": "الحالة السياسية", "Competitive position": "الموقف التنافسي" };
const PART_EV_AR: Record<string, string> = { "Partnership index alignment component": "مكوّن التوافق في مؤشر الشراكة", "Visits and engagement component": "مكوّن الزيارات والتفاعل", "Agreements component": "مكوّن الاتفاقيات", "Scorecard dimension": "بُعد في بطاقة الدرجات", "Trade component": "مكوّن التجارة", "Investment component": "مكوّن الاستثمار" };
export const TIER_AR: Record<string, string> = { weak: "ضعيف", mixed: "مختلط", strong: "قوي", thin: "محدود" }; export const BAND_AR: Record<string, string> = { high: "مرتفع", medium: "متوسط", low: "منخفض", unrated: "غير مصنّف" };
export type Pillar = { id: string; n: number; name: B; score: number | null; conf: "high" | "medium" | "low" | "none"; parts: Part[]; note: B };
export function pillars(i: Inputs): Pillar[] {
  const d = i.score?.dims ?? {}; const c = i.part?.c; const p = i.profile; const out: Pillar[] = [];
  const mk = (id: string, n: number, name: B, parts: (Part | null)[], note: B): Pillar => { const ps = parts.filter((x): x is Part => !!x && isFinite(x.v)); const sc = ps.length ? r0(ps.reduce((a, x) => a + x.v, 0) / ps.length) : null; return { id, n, name, score: sc, conf: !ps.length ? "none" : ps.length >= 3 ? "high" : ps.length === 2 ? "medium" : "low", parts: ps, note }; };
  const pt = (k: string, v: number | null | undefined, ev: string, evAr?: string): Part | null => (v == null ? null : { k, kAr: PART_K_AR[k] ?? k, v: clamp(v), ev, evAr: evAr ?? PART_EV_AR[ev] });
  out.push(mk("political", 1, b("Political and diplomatic alignment", "التوافق السياسي والدبلوماسي"), [pt("UN agreement", i.un.uae != null ? i.un.uae * 100 : null, `UN voting agreement with the UAE ${i.un.uae}`, `اتفاق التصويت في الأمم المتحدة مع الإمارات ${i.un.uae}`), pt("Alignment index", c?.alignment, "Partnership index alignment component"), pt("Engagement", c?.engagement, "Visits and engagement component"), pt("Agreements", c?.agreements, "Agreements component"), pt("Political friends", d.polfriends?.score, "Scorecard dimension")], b("Where the country stands with the UAE on votes, engagement and agreements.", "موقف الدولة من الإمارات في التصويت والتفاعل والاتفاقيات.")));
  out.push(mk("economic", 2, b("Economic and commercial benefit", "المنفعة الاقتصادية والتجارية"), [pt("Business friends", d.bizfriends?.score, "Scorecard dimension"), pt("Trade", c?.trade, "Trade component"), pt("Growth outlook", i.growthOutlook != null ? ((i.growthOutlook + 2) / 8) * 100 : null, `IMF real growth outlook ${i.growthOutlook?.toFixed(1)}% a year`, `آفاق نمو الناتج الحقيقي حسب الصندوق ${i.growthOutlook?.toFixed(1)}% سنويًا`)], b("Realised trade, commercial ties and the demand outlook.", "التجارة المتحققة والروابط التجارية وآفاق الطلب.")));
  out.push(mk("capital", 3, b("Capital and sovereign investment", "رأس المال والاستثمار السيادي"), [i.part && i.part.raw.investment > 0 ? pt("Investment", c?.investment, "Investment component") : null, pt("Deals", i.deals365 != null ? i.deals365 * 5 : null, `${i.deals365} announced deal headlines in 12 months (announcements, not completed)`, `${i.deals365} عنوان صفقة معلنة في 12 شهرًا (إعلانات لا إنجاز)`)], b("Positions held and the deal pipeline; an unknown stock lowers confidence.", "المراكز المحتفظ بها وخط الصفقات؛ والرصيد غير المعروف يخفض الثقة.")));
  out.push(mk("geography", 4, b("Geography, corridors and neighbours", "الجغرافيا والممرات والجوار"), [pt("Corridor axis", p ? p.axes.corridor.s * 20 : null, p?.axes.corridor.ev ?? ""), pt("Strategic", d.strategic?.score, "Scorecard dimension")], b("Corridor criticality, chokepoints and strategic position.", "أهمية الممرات ونقاط الاختناق والموقع الاستراتيجي.")));
  out.push(mk("security", 5, b("Security and hard power", "الأمن والقوة الصلبة"), [pt("Hard channel", p ? p.dims.hard.s * 20 : null, p?.dims.hard.ev ?? ""), pt("Security condition", d.security?.score, "Scorecard dimension")], b("Policy-level security cooperation and the counterpart's security condition.", "التعاون الأمني على مستوى السياسات وأحوال الأمن لدى الطرف المقابل.")));
  out.push(mk("soft", 6, b("Soft power and influence", "القوة الناعمة والنفوذ"), [pt("Soft channel", p ? p.dims.soft.s * 20 : null, p?.dims.soft.ev ?? ""), pt("Social condition", d.social?.score, "Scorecard dimension"), pt("World influence", d.uninfluence?.score, "Scorecard dimension")], b("Aid, education, culture, institutions and perception.", "المساعدات والتعليم والثقافة والمؤسسات والانطباع.")));
  out.push(mk("durability", 7, b("Decision-makers and durability", "صنّاع القرار والمتانة"), [pt("Durability", p ? p.dims.dur.s * 20 : null, p?.dims.dur.ev ?? ""), pt("Political condition", d.political?.score, "Scorecard dimension")], b("Institutional continuity; leadership tenure is shown beside it, not scored.", "الاستمرارية المؤسسية؛ ومدة القيادة تُعرض بجانبها دون درجة.")));
  out.push(mk("competition", 8, b("Standing against rivals", "المكانة أمام المنافسين"), [pt("Competitive position", p ? p.dims.comp.s * 20 : null, p?.dims.comp.ev ?? "")], b(`The UAE's rank in the partner's trade${i.rivals?.uae ? `: #${i.rivals.uae.rank} of ${i.rivals.of}` : ""}; low means rivals lead.`, `ترتيب الإمارات في تجارة الشريك${i.rivals?.uae ? `: #${i.rivals.uae.rank} من ${i.rivals.of}` : ""}؛ والمنخفض يعني تقدم المنافسين.`)));
  return out;
}

// ---- posture rule with a sensitivity test ----
export type Posture = "deepen" | "staged" | "hedge" | "hold";
export const POSTURE: Record<Posture, { name: B; sub: B }> = {
  deepen: { name: b("Deepen", "التعميق"), sub: b("Commit more, faster: value is high, the UAE can act and risk is low.", "التزام أكبر وأسرع: القيمة عالية والإمارات قادرة والمخاطر منخفضة.") },
  staged: { name: b("Selective and staged", "انتقائي ومتدرج"), sub: b("Commit in stages with gates and exit rights: value and ability are there but risk is not low.", "التزام على مراحل بنقاط قرار وحقوق خروج: القيمة والقدرة متوافرتان لكن المخاطر ليست منخفضة.") },
  hedge: { name: b("Hedge", "التحوط"), sub: b("Keep the relationship, diversify around it: value is there but the UAE's ability to act is limited.", "الإبقاء على العلاقة مع التنويع حولها: القيمة موجودة لكن قدرة الإمارات على الفعل محدودة.") },
  hold: { name: b("Hold and watch", "الإمساك والمراقبة"), sub: b("Maintain, monitor and buy information first: value is modest or risk is high.", "الإبقاء والرصد وشراء المعلومات أولًا: القيمة متواضعة أو المخاطر مرتفعة.") },
};
export const THRESHOLDS = { deepenValue: 65, deepenAbility: 60, deepenRisk: 40, stagedValue: 50, stagedAbility: 50, holdRisk: 60 };
const rule = (v: number, a: number, r: number): Posture => (v >= THRESHOLDS.deepenValue && a >= THRESHOLDS.deepenAbility && r <= THRESHOLDS.deepenRisk ? "deepen" : v >= THRESHOLDS.stagedValue && a >= THRESHOLDS.stagedAbility ? "staged" : v >= THRESHOLDS.stagedValue ? "hedge" : "hold");
export type PostureResult = { posture: Posture | null; value: number | null; ability: number | null; risk: number | null; stable: boolean; alternatives: Posture[]; reasons: B[]; thresholds: typeof THRESHOLDS };
export function posture(i: Inputs, ps: Pillar[]): PostureResult {
  const s = (id: string) => ps.find((p) => p.id === id)?.score ?? null; const value = mean([s("political"), s("economic"), s("geography"), s("soft")]); const d = i.score?.dims ?? {};
  const ability = i.lev?.ours ?? i.part?.score ?? null; const cond = mean([d.political?.score, d.financial?.score, d.security?.score]); const risk = cond != null ? 100 - cond : null;
  if (value == null || ability == null || risk == null) return { posture: null, value, ability, risk, stable: false, alternatives: [], reasons: [b("Not enough data to place the country: value, ability or risk is missing.", "لا بيانات كافية لتحديد الموقف: القيمة أو القدرة أو المخاطر ناقصة.")], thresholds: THRESHOLDS };
  const base = rule(value, ability, risk); const alts = new Set<Posture>(); for (const dv of [-10, 0, 10]) for (const da of [-10, 0, 10]) for (const dr of [-10, 0, 10]) alts.add(rule(value + dv, ability + da, risk + dr)); alts.delete(base);
  return { posture: base, value: r0(value), ability: r0(ability), risk: r0(risk), stable: alts.size === 0, alternatives: [...alts], thresholds: THRESHOLDS,
    reasons: [b(`Value to the UAE ${r0(value)}/100 (political, economic, geography, soft power).`, `القيمة للإمارات ${r0(value)}/100 (السياسي والاقتصادي والجغرافي والقوة الناعمة).`), b(`UAE ability to act ${r0(ability)}/100 (the UAE's leverage reading).`, `قدرة الإمارات على الفعل ${r0(ability)}/100 (قراءة نفوذ الإمارات).`), b(`Risk ${r0(risk)}/100, the inverse of the counterpart's political, financial and security condition.`, `المخاطر ${r0(risk)}/100، عكس الحالة السياسية والمالية والأمنية للطرف المقابل.`)] };
}

// ---- instruments: footprint, headroom and a stated intensity ----
export type InstrRow = { id: string; kind: "soft" | "hard" | "mixed"; name: B; footprint: number | null; headroom: number | null; basis: B; intensity: B };
const aidScore = (v: number | null) => (v == null || v <= 0 ? (v === 0 ? 0 : null) : v < 5e6 ? 1 : v < 25e6 ? 2 : v < 100e6 ? 3 : v < 500e6 ? 4 : 5);
export function instruments(i: Inputs, post: Posture | null): InstrRow[] {
  const c = i.part?.c; const f = (id: string): { fp: number | null; basis: B } => {
    switch (id) {
      case "diplomacy": return { fp: c ? c.engagement / 20 : null, basis: b("Engagement component of the partnership index", "مكوّن التفاعل في مؤشر الشراكة") };
      case "trade": return { fp: c ? c.trade / 20 : null, basis: b("Trade component of the partnership index", "مكوّن التجارة في مؤشر الشراكة") };
      case "development": { const a = aidScore(i.aid5Usd); return { fp: a, basis: b("UAE humanitarian funding reported to OCHA over five years", "التمويل الإنساني الإماراتي المبلغ عنه لأوتشا خلال خمس سنوات") }; }
      case "finance": return { fp: i.part && i.part.raw.investment > 0 && c ? c.investment / 20 : null, basis: b("Investment component; unknown when no IMF position is held", "مكوّن الاستثمار؛ ويكون غير معروف إن لم يتوافر مركز لدى الصندوق") };
      case "defence": return { fp: i.profile ? i.profile.dims.hard.s : null, basis: b("Hard-power channel of the strategic profile", "قناة القوة الصلبة في الملف الاستراتيجي") };
      default: return { fp: null, basis: b("Not measured: no dataset", "غير مقيس: لا مجموعة بيانات") };
    }
  };
  return INSTRUMENTS.map((x) => { const { fp, basis } = f(x.id); const head = fp == null ? null : Math.round((5 - fp) * 10) / 10; const intensity = fp == null ? b("Measure first", "قِس أولًا") : post === "hold" ? b("Maintain", "أبقِ") : head != null && head >= 2 ? b(post === "deepen" ? "Raise" : "Add one staged step", "ارفع") : head != null && head < 1 ? b("Saturated: sustain, do not add", "مشبع: حافظ ولا تضف") : b("Maintain and test", "أبقِ واختبر");
    return { id: x.id, kind: x.kind, name: typeof x.name === "string" ? b(x.name, x.name) : x.name, footprint: fp != null ? Math.round(fp * 10) / 10 : null, headroom: head, basis, intensity: post === "staged" && head != null && head >= 2 ? b("Add one staged step with a gate", "أضف خطوة متدرجة بنقطة قرار") : intensity }; });
}

// ---- measured position toward UAE policy ----
export type Measured = { k: string; name: B; value: number | null; display: string; note: B };
export function positionMeasured(i: Inputs): Measured[] {
  const m: Measured[] = [];
  m.push({ k: "un", name: b("UN voting agreement with the UAE", "اتفاق التصويت في الأمم المتحدة مع الإمارات"), value: i.un.uae != null ? i.un.uae * 100 : null, display: i.un.uae != null ? i.un.uae.toFixed(2) : "n/a", note: b("Share of General Assembly votes in agreement; latest session on file.", "حصة الأصوات المتفقة في الجمعية العامة؛ آخر دورة محفوظة.") });
  if (i.part) { m.push({ k: "align", name: b("Alignment index", "مؤشر التوافق"), value: i.part.c.alignment, display: String(i.part.c.alignment), note: b("Partnership index component.", "مكوّن في مؤشر الشراكة.") }); m.push({ k: "engage", name: b("Engagement", "التفاعل"), value: i.part.c.engagement, display: String(i.part.c.engagement), note: b("Visits and engagement component.", "مكوّن الزيارات والتفاعل.") }); m.push({ k: "agree", name: b("Agreements in force", "الاتفاقيات النافذة"), value: i.part.c.agreements, display: `${i.part.raw.agreements}`, note: b("Instruments in MOFA and MOFT lists (no signing dates held).", "الصكوك في قوائم الخارجية والتجارة (دون تواريخ توقيع).") }); }
  if (i.tone) m.push({ k: "tone", name: b("Reported event tone", "نبرة الأحداث المبلغ عنها"), value: clamp(50 + i.tone.g * 10), display: `${i.tone.g.toFixed(2)} (cooperative ${Math.round(i.tone.coop * 100)}%${i.tone.trend != null ? `, trend ${i.tone.trend > 0 ? "+" : ""}${i.tone.trend.toFixed(2)}` : ""})`, note: b("GDELT, machine-coded news over 45 days: reported events, not diplomacy.", "جديلت، أخبار مرمّزة آليًا خلال 45 يومًا: أحداث مبلغ عنها لا دبلوماسية.") });
  return m;
}
export const POSITION_ISSUES: { id: string; en: string; ar: string; ev: B }[] = [
  { id: "gulf", en: "Iran and Gulf security", ar: "إيران وأمن الخليج", ev: b("Official statements, summit communiqués, votes", "التصريحات الرسمية وبيانات القمم والتصويت") },
  { id: "horn", en: "Sudan and the Horn of Africa", ar: "السودان والقرن الأفريقي", ev: b("Positions on factions, mediation role, Red Sea", "المواقف من الأطراف ودور الوساطة والبحر الأحمر") },
  { id: "libya", en: "Libya", ar: "ليبيا", ev: b("Which actors each side backs, openly stated", "من تدعمهم كل جهة علنًا") },
  { id: "levant", en: "Gaza, Palestine and Israel ties", ar: "غزة وفلسطين والعلاقات مع إسرائيل", ev: b("Mediation role, crossings, normalisation stance", "دور الوساطة والمعابر وموقف التطبيع") },
  { id: "water", en: "Shared water and resources", ar: "المياه والموارد المشتركة", ev: b("Where the country expects Gulf backing", "حيث تتوقع الدولة دعمًا خليجيًا") },
  { id: "energy", en: "Energy and OPEC (the UAE left on 1 May 2026)", ar: "الطاقة وأوبك (خرجت الإمارات في 1 مايو 2026)", ev: b("Supply and financing needs, stated positions", "احتياجات الإمداد والتمويل والمواقف المعلنة") },
  { id: "finance", en: "Financing, debt and IMF", ar: "التمويل والدين وصندوق النقد", ev: b("Asks made of the UAE and conditions attached", "ما طُلب من الإمارات والشروط المرتبطة") },
  { id: "bloc", en: "Great-power alignment (US, China, Russia)", ar: "الاصطفاف بين القوى الكبرى", ev: b("Votes, agreements and visits by power", "التصويت والاتفاقيات والزيارات بحسب القوة") },
];
/** Years in office from a start date (a reading beside durability, never a score). */
export const tenureYears = (start: string | undefined, now: number) => (start ? Math.floor((now - Date.parse(start)) / (365.25 * 86_400_000)) : null);
export const ageYears = (birth: string | undefined, now: number) => (birth ? Math.floor((now - Date.parse(birth)) / (365.25 * 86_400_000)) : null);

// ---- trend maths for the spine ----
export type Spine = { latest: { y: number; v: number } | null; change5: number | null; z: number | null; n: number };
export function summarise(s: Pt[] | undefined, y0: number): Spine {
  const pts = (s ?? []).filter(([y]) => y < y0 + 0.5).sort((a, c) => a[0] - c[0]); if (!pts.length) return { latest: null, change5: null, z: null, n: 0 };
  const l = pts[pts.length - 1]; const p = pts.find((x) => x[0] === l[0] - 5); const hist = pts.slice(0, -1).map((x) => x[1]); const m = mean(hist); const sdv = hist.length >= 4 ? Math.sqrt(hist.reduce((a, c) => a + (c - m!) ** 2, 0) / (hist.length - 1)) : null;
  return { latest: { y: l[0], v: l[1] }, change5: p ? l[1] - p[1] : null, z: m != null && sdv ? (l[1] - m) / sdv : null, n: pts.length };
}
export const median = (x: number[]) => { const v = [...x].sort((a, c) => a - c); return v.length ? (v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2) : null; };
