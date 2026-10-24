// Transparent country scoring for the Falcon Eye radar. Pure functions, shared by the server (which stores the 0-100 components) and the browser (which applies the user's weights),
// so the ranking can be re-weighted live and every number can be traced to its parts. Scores describe position among countries with data, not predictions and not objective measurements.

export const OPP_PARTS = ["growth", "market", "ties", "headroom", "momentum"] as const;
export const RISK_PARTS = ["governance", "fiscal", "security", "calendar", "drift"] as const;
export type OppPart = (typeof OPP_PARTS)[number]; export type RiskPart = (typeof RISK_PARTS)[number];
export type Weights = { opp: Record<OppPart, number>; risk: Record<RiskPart, number> };
export const DEFAULT_WEIGHTS: Weights = { opp: { growth: 25, market: 20, ties: 15, headroom: 25, momentum: 15 }, risk: { governance: 25, fiscal: 30, security: 15, calendar: 10, drift: 20 } };
/** What each part measures and where it comes from: shown next to every slider so the method is never hidden. */
export const PART_INFO: Record<string, { en: string; ar: string; how: { en: string; ar: string } }> = {
  growth: { en: "Growth outlook", ar: "آفاق النمو", how: { en: "IMF projected real growth, average of this year and the next two (0% scores 0, 8% scores 100).", ar: "نمو الناتج الحقيقي المتوقع من صندوق النقد، متوسط هذا العام والعامين التاليين (0% يعطي 0، و8% يعطي 100)." } },
  market: { en: "Market expansion", ar: "توسع السوق", how: { en: "IMF nominal GDP in five years against today (x1.0 scores 0, x2.0 scores 100).", ar: "الناتج الاسمي المتوقع بعد خمس سنوات مقارنة باليوم (×1.0 يعطي 0، و×2.0 يعطي 100)." } },
  ties: { en: "Existing ties", ar: "الروابط القائمة", how: { en: "The UAE Partnership Index (trade, engagement, agreements, connectivity, investment, alignment).", ar: "مؤشر الشراكة مع الإمارات (التجارة والتواصل والاتفاقيات والربط والاستثمار والتوافق)." } },
  headroom: { en: "Headroom", ar: "مجال النمو", how: { en: "Size of the economy (percentile) times how little the UAE already has at stake there.", ar: "حجم الاقتصاد (نسبة مئوية) مضروبًا في قلة ما للإمارات من حصة فيه حاليًا." } },
  momentum: { en: "Momentum", ar: "الزخم", how: { en: "UAE goods-trade growth year on year and the pace of UAE deal announcements.", ar: "نمو التجارة السلعية مع الإمارات على أساس سنوي ووتيرة إعلانات الصفقات الإماراتية." } },
  governance: { en: "Governance", ar: "الحوكمة", how: { en: "100 minus the World Bank political-stability percentile.", ar: "100 ناقص النسبة المئوية للاستقرار السياسي لدى البنك الدولي." } },
  fiscal: { en: "Fiscal and external stress", ar: "الضغط المالي والخارجي", how: { en: "Mean of debt (40% to 120% of GDP), inflation (3% to 25%) and current-account deficit (+2% to -10% of GDP), each scaled 0 to 100.", ar: "متوسط الدين (40% إلى 120% من الناتج) والتضخم (3% إلى 25%) وعجز الحساب الجاري (+2% إلى -10%)، كلٌّ على مقياس 0 إلى 100." } },
  security: { en: "Illicit-finance and cyber exposure", ar: "التعرض للتمويل غير المشروع والسيبراني", how: { en: "100 minus the scorecard's security percentile (sanctions-list entries and ransomware per unit of GDP).", ar: "100 ناقص النسبة المئوية الأمنية في بطاقة الدرجات (قوائم العقوبات وبرمجيات الفدية لكل وحدة ناتج)." } },
  calendar: { en: "Political calendar", ar: "التقويم السياسي", how: { en: "An election within 180 days scores 100, within a year 60, within two years 25.", ar: "انتخابات خلال 180 يومًا تعطي 100، وخلال سنة 60، وخلال سنتين 25." } },
  drift: { en: "Relationship drift", ar: "فتور العلاقة", how: { en: "Mean of falling bilateral event tone and days since the last minister-level contact (90 days scores 0, 540 days scores 100).", ar: "متوسط تراجع نبرة الأحداث الثنائية والأيام منذ آخر اتصال على مستوى الوزراء (90 يومًا يعطي 0 و540 يومًا يعطي 100)." } },
};
export type Components = { opp: Partial<Record<OppPart, number | null>>; risk: Partial<Record<RiskPart, number | null>>; exposure: number | null };
const clamp = (v: number) => Math.max(0, Math.min(100, v));
/** Linear 0-100 scale between two anchors (works for falling scales too). */
export const scale = (v: number, lo: number, hi: number) => clamp(((v - lo) / (hi - lo)) * 100);
/** Weighted mean of the parts that have a value, re-normalising the weights over the available parts; null when no part has data. Also returns how much of the weight was covered. */
export function weighted(parts: Record<string, number | null | undefined>, w: Record<string, number>): { score: number | null; coverage: number } {
  let num = 0, den = 0, all = 0; for (const [k, wt] of Object.entries(w)) { all += wt; const v = parts[k]; if (v != null && isFinite(v) && wt > 0) { num += v * wt; den += wt; } }
  return { score: den > 0 ? Math.round(num / den) : null, coverage: all > 0 ? Math.round((den / all) * 100) : 0 };
}
export function scoreCountry(c: Components, w: Weights) { const o = weighted(c.opp, w.opp), r = weighted(c.risk, w.risk); return { opp: o.score, risk: r.score, oppCoverage: o.coverage, riskCoverage: r.coverage }; }
/** UAE-relevant risk: how risky the country is, weighted by how much the UAE has at stake there. */
export const exposedRisk = (risk: number | null, exposure: number | null) => (risk == null ? null : Math.round((risk * (exposure ?? 0)) / 100));
