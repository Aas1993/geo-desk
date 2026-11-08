// The UAE exposure register (FALCON EYE capability 1). A row links a country (or a sector, route or institution) to a UAE dependency or opportunity, with a magnitude from 0 to 1 against a stated yardstick and a confidence.
// An exposure that cannot be measured is "unknown", which lowers the prioritisation CONFIDENCE and never appears as a zero (spec section 7). Announcements are kept apart from completed flows and never counted as exposure to the same degree.
export type Conf = "high" | "medium" | "low" | "unknown";
export type ExpRow = {
  id: string; dim: { en: string; ar: string }; kind: "dependency" | "opportunity" | "risk" | "presence";
  /** what was measured, in words, with its unit and year */
  value: { en: string; ar: string } | null;
  /** 0 to 1 against the yardstick named in `scale`; null when the exposure is unknown */
  magnitude: number | null; scale: { en: string; ar: string }; conf: Conf; src: string; asOf: string | null; note?: { en: string; ar: string };
};
export const CONF_W: Record<Conf, number> = { high: 1, medium: 0.8, low: 0.55, unknown: 0 };
export const CONF_LABEL: Record<Conf, { en: string; ar: string; c: string }> = { high: { en: "High", ar: "عالية", c: "var(--ok)" }, medium: { en: "Medium", ar: "متوسطة", c: "var(--c2)" }, low: { en: "Low", ar: "منخفضة", c: "var(--warn)" }, unknown: { en: "Unknown", ar: "غير معروفة", c: "var(--t2)" } };
export type Priority = { score: number | null; confidence: number; known: number; unknown: number; band: "high" | "medium" | "low" | "unrated"; why: { en: string; ar: string } };
/** Priority is the confidence-weighted mean of the KNOWN magnitudes of dependency, opportunity and risk rows; the share of rows that are unknown is reported as the confidence, so a country with little measured exposure is never ranked "low" by default. */
export function prioritise(rows: ExpRow[]): Priority {
  const rated = rows.filter((r) => r.kind !== "presence"); const known = rated.filter((r) => r.magnitude != null && r.conf !== "unknown"); const unknown = rated.length - known.length;
  const w = known.reduce((a, r) => a + CONF_W[r.conf], 0); const score = w > 0 ? known.reduce((a, r) => a + r.magnitude! * CONF_W[r.conf], 0) / w : null; const confidence = rated.length ? w / rated.length : 0;
  const band = score == null ? "unrated" : confidence < 0.45 ? "unrated" : score >= 0.5 ? "high" : score >= 0.25 ? "medium" : "low";
  return { score: score == null ? null : Math.round(score * 100), confidence: Math.round(confidence * 100) / 100, known: known.length, unknown, band,
    why: band === "unrated" ? { en: `${known.length} of ${rated.length} exposure measures are known: too few to rate priority. This is not a finding of low exposure.`, ar: `${known.length} من ${rated.length} مقياسًا للانكشاف معروفة: قليلة لتقدير الأولوية. وهذا ليس نتيجة بأن الانكشاف منخفض.` } : { en: `Confidence-weighted mean of ${known.length} known measures; ${unknown} unknown measure(s) lower the confidence, not the score.`, ar: `متوسط موزون بالثقة لـ ${known.length} مقياسًا معروفًا؛ و${unknown} غير معروف يخفض الثقة لا الدرجة.` } };
}
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
