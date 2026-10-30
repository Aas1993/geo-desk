import { parseReviews, type Lens, type Review } from "../desk/core";
import { assess, type Quality, type SourceMix } from "../quality/gate";

// THE SHARED HEAD OF EVERY REPORT: what the page header and the PDF cover both show (the bottom line, the confidence, the quality grade and the two auditors' verdicts, with their red flags). It is computed from the saved product itself, free, and shared by the screen and the PDF so they cannot disagree. Nothing here estimates anything: a figure the product does not carry is null and is not drawn.
export type Lang = "en" | "ar";
export type B = { en: string; ar: string };
export type Conf = "high" | "moderate" | "low";
export type Grade = "A" | "B" | "C" | "D";
export const WHO: Record<Lens, B> = { statecraft: { en: "Statecraft Auditor", ar: "مدقق فن الحكم" }, reality: { en: "Reality Auditor", ar: "مدقق الواقع" }, consistency: { en: "Consistency Auditor", ar: "مدقق الاتساق" }, decision: { en: "Independent reviewer", ar: "المراجع المستقل" } };
export const VERDICT_W: Record<Review["verdict"], B> = { approve: { en: "approve", ar: "اعتماد" }, revise: { en: "revise", ar: "مراجعة" }, reject: { en: "reject", ar: "رفض" } };
export const STANDING_W: Record<NonNullable<Review["standing"]>, B> = { sound: { en: "sound", ar: "سليم" }, mixed: { en: "mixed", ar: "متفاوت" }, unsound: { en: "unsound", ar: "غير سليم" } };
export const CONF_W: Record<Conf, B> = { high: { en: "high", ar: "مرتفعة" }, moderate: { en: "moderate", ar: "معتدلة" }, low: { en: "low", ar: "منخفضة" } };
export type Verdict = { lens: Lens; who: B; verdict: Review["verdict"]; standing: Review["standing"]; summary: string; issues: number; high: number; flags: number; partial: boolean };
export type FlagRow = { flag: string; severity: "critical" | "serious"; lens: Lens; who: B; where: string; why: string; ask: string };
export type ReportHead = { verdicts: Verdict[]; flags: FlagRow[]; critical: number; serious: number; grade: Grade | null; score: number | null; failed: B[]; sources: SourceMix | null; confidence: Conf | null; bottomLine: string };

export const verdictsOf = (reviews: Review[]): Verdict[] => reviews.map((r) => ({ lens: r.lens, who: WHO[r.lens], verdict: r.verdict, standing: r.standing, summary: r.summary, issues: r.issues.length, high: r.issues.filter((i) => i.severity === "high").length, flags: r.redFlags.length, partial: r.partial }));
export const flagsOf = (reviews: Review[]): FlagRow[] => reviews.flatMap((r) => r.redFlags.map((f) => ({ ...f, lens: r.lens, who: WHO[r.lens] }))).sort((a, z) => Number(z.severity === "critical") - Number(a.severity === "critical"));
const GATED = new Set<Quality["kind"]>(["king-council", "emb-intel", "emb-plan", "mofa-council"]);
/** The head of a saved product. The quality grade exists only for the four desk products that have a quality gate; for any other product it is null and the page shows the auditors' verdicts and flags instead. */
export function headOf(kind: string, report: string, o: { sources?: { url: string }[]; lang?: Lang | null; confidence?: Conf | null; bottomLine?: string } = {}): ReportHead {
  const reviews = parseReviews(report); const flags = flagsOf(reviews); const q = GATED.has(kind as Quality["kind"]) ? assess(kind as Quality["kind"], report, o.sources ?? [], o.lang ?? null) : null;
  return { verdicts: verdictsOf(reviews), flags, critical: flags.filter((f) => f.severity === "critical").length, serious: flags.filter((f) => f.severity !== "critical").length, grade: q?.grade ?? null, score: q?.score ?? null, failed: q ? q.failed.map((c) => ({ en: c.en, ar: c.ar })) : [], sources: q?.sources ?? null, confidence: o.confidence ?? null, bottomLine: (o.bottomLine ?? "").trim() };
}
/** The worst verdict among the auditors, for one chip: reject beats revise beats approve; null when nobody reviewed. */
export const worstVerdict = (v: Verdict[]): Review["verdict"] | null => (v.some((x) => x.verdict === "reject") ? "reject" : v.some((x) => x.verdict === "revise") ? "revise" : v.length ? "approve" : null);

// ---- reading likelihood and impact words as positions on a scale (so a risk can be placed on a matrix only when its own words say where)
/** 1 almost no chance … 5 almost certain, read from the ICD 203 likelihood words or a percentage in the text; null when the text says nothing the scale can use. */
export function likelihoodRank(text: string): 1 | 2 | 3 | 4 | 5 | null {
  const t = (text ?? "").toLowerCase().trim(); if (!t) return null;
  const pct = [...t.matchAll(/(\d{1,3}(?:\.\d+)?)\s*(?:%|percent|٪)/g)].map((m) => +m[1]).filter((n) => n >= 0 && n <= 100);
  if (pct.length) { const mid = pct.reduce((a, b) => a + b, 0) / pct.length; return mid < 10 ? 1 : mid < 30 ? 2 : mid <= 60 ? 3 : mid <= 85 ? 4 : 5; }
  if (/almost certain|virtually certain|highly probable|شبه مؤكد|مؤكد تقريبا|مؤكد تقريبًا/.test(t)) return 5;
  if (/very likely|highly likely|very probable|مرجح جدا|مرجح جدًا|محتمل جدا|محتمل جدًا/.test(t)) return 5;
  if (/almost no chance|remote|highly unlikely|very unlikely|نادر|بعيد جدا|بعيد جدًا|مستبعد جدا|مستبعد جدًا/.test(t)) return 1;
  if (/unlikely|improbable|low\b|مستبعد|ضعيف|منخفض/.test(t)) return 2;
  if (/even chance|roughly even|toss-?up|50[- ]?50|moderate|medium|possible|plausible|متوسط|معتدل|ممكن|فرصة متساوية/.test(t)) return 3;
  if (/likely|probable|high\b|elevated|مرجح|محتمل|مرتفع|عال/.test(t)) return 4;
  return null;
}
export const impactRank = (v: string): 1 | 2 | 3 => (v === "high" ? 3 : v === "medium" ? 2 : 1);
/** The matrix column of a likelihood rank: low 1-2, middle 3, high 4-5. */
export const likelihoodBand = (r: number | null): 0 | 1 | 2 | null => (r == null ? null : r <= 2 ? 0 : r === 3 ? 1 : 2);

// ---- small list helpers shared by screen and PDF
export function groupBy<T>(xs: T[], key: (x: T) => string): { key: string; items: T[] }[] { const out: { key: string; items: T[] }[] = []; for (const x of xs) { const k = key(x); const f = out.find((g) => g.key === k); if (f) f.items.push(x); else out.push({ key: k, items: [x] }); } return out; }
export const cutText = (t: string, n: number) => (t.length > n ? `${t.slice(0, t.lastIndexOf(" ", n) > n * 0.6 ? t.lastIndexOf(" ", n) : n).trimEnd()}…` : t);
/** A share (0-1) of a count in a total, safe against an empty total. */
export const share = (n: number, total: number) => (total > 0 ? Math.max(0, Math.min(1, n / total)) : 0);
