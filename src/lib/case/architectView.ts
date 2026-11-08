import { ARCH_PILLARS, DELIVERABLES, HORIZONS, deliverableOf, parseDashboard, tradecraftChecks, type Check, type Dashboard, type Initiative } from "./architect";
import { confOf, mdSections, mdTables, plain, type Conf3 } from "./mdparse";
import { likelihoodBand, likelihoodRank } from "../report/model";

// THE STATECRAFT ARCHITECT, READ BACK FOR THE SCREEN AND THE PDF: the bottom line and the key judgments of the ministerial brief, the model's own table of the twelve interests, the six-pillar matrix, and the dashboard's initiatives, gates, indicators and risks. Nothing is estimated: a part the report does not hold is empty.
export type KeyJudgment = { n: number; text: string; confidence: Conf3 | null; reason: string };
export type InterestRead = { n: string; name: string; level: "high" | "medium" | "low" | "unknown"; levelText: string; why: string };
export type PillarRow = { pillar: string; id: string | null; cells: { label: string; text: string }[] };
export type ArchitectView = { bottomLine: string; judgments: KeyJudgment[]; interests: InterestRead[]; matrix: PillarRow[]; dash: Dashboard | null; checks: Check[]; present: number[] };

const levelOf = (t: string): InterestRead["level"] => { const s = plain(t).toLowerCase(); if (/^high|مرتفع|عالي/.test(s)) return "high"; if (/^medium|^moderate|متوسط|معتدل/.test(s)) return "medium"; if (/^low|منخفض/.test(s)) return "low"; return "unknown"; };
/** The bottom line of Deliverable 1, in the brief's own words. */
export function archBottomLine(report: string): string {
  const d1 = deliverableOf(report, 1); const m = /\*\*\s*(?:Bottom line|الخلاصة)[^*]*\*\*\s*([^\n]+)/i.exec(d1); if (m) return plain(m[1]);
  const para = d1.split(/\n\s*\n/).map((x) => x.trim()).find((x) => x && !/^[-*|#>]/.test(x)); return para ? plain(para) : "";
}
/** The numbered key judgments with the confidence each states ("Confidence: Moderate; the reason"). */
export function keyJudgments(report: string): KeyJudgment[] {
  const d1 = deliverableOf(report, 1); const i = d1.search(/\*\*\s*(?:Key Judgments?|الأحكام الرئيسية)[^*]*\*\*/i); if (i < 0) return []; const out: KeyJudgment[] = [];
  for (const line of d1.slice(i).split("\n").slice(1)) { const m = /^\s*(\d+)[.)]\s+(.*)$/.exec(line); if (m) { const body = plain(m[2]); const c = /(?:confidence|الثقة)\s*[:：]\s*([^;.]*)[;.]?\s*(.*)$/i.exec(body); out.push({ n: Number(m[1]), text: (c ? body.slice(0, c.index) : body).trim(), confidence: c ? confOf(c[1]) : null, reason: c ? c[2].trim() : "" }); } else if (out.length && line.trim() && !/^\s*\*\*/.test(line)) out[out.length - 1].reason += ` ${plain(line)}`; else if (out.length && /^\s*\*\*/.test(line)) break; }
  return out;
}
/** The model's own relevance table of the twelve national interests (Part I), when it wrote one. */
export function interestTable(report: string): InterestRead[] {
  const part = mdSections(report, [2]).find((s) => /^Part I\b|^الجزء\s*(?:الأول|I)\b/i.test(s.title) && !/^Part II/i.test(s.title)); const t = mdTables(part?.body ?? "")[0]; if (!t) return [];
  const li = t.head.findIndex((h) => /relevan|الصلة|الأهمية/i.test(h)); if (li < 0) return []; const ni = t.head.findIndex((h, i) => i !== li && /interest|dimension|البعد|المصلحة/i.test(h)); const wi = t.head.findIndex((h, i) => i > li && /why|السبب|الدليل/i.test(h));
  return t.rows.filter((r) => r.some(Boolean)).map((r, k) => ({ n: plain(r[0] ?? "") || String(k + 1), name: plain(r[ni >= 0 ? ni : 1] ?? ""), level: levelOf(r[li] ?? ""), levelText: plain(r[li] ?? ""), why: plain(r[wi >= 0 ? wi : t.head.length - 1] ?? "") }));
}
const PILLAR_WORDS: [string, string][] = [["diplomat|دبلوماس", "diplomatic"], ["soft|ناعم", "soft"], ["hard|صلب|عسكر|دفاع", "hard"], ["econom|اقتصاد", "economic"], ["tech|تقن", "technology"], ["regional|إقليم|اقليم|multilateral", "regional"]];
export const pillarOfText = (s: string): string | null => { for (const [re, id] of PILLAR_WORDS) if (new RegExp(re, "i").test(s)) return id; return null; };
/** The Deliverable 4 matrix: one row per pillar with every column the editor wrote. */
export function pillarMatrix(report: string): PillarRow[] {
  const t = mdTables(deliverableOf(report, 4))[0]; if (!t) return [];
  return t.rows.filter((r) => r.some(Boolean)).map((r) => ({ pillar: plain(r[0] ?? ""), id: pillarOfText(plain(r[0] ?? "")), cells: t.head.slice(1).map((h, i) => ({ label: plain(h), text: plain(r[i + 1] ?? "") })).filter((c) => c.text) }));
}
export function parseArchitect(report: string): ArchitectView {
  return { bottomLine: archBottomLine(report), judgments: keyJudgments(report), interests: interestTable(report), matrix: pillarMatrix(report), dash: parseDashboard(report), checks: tradecraftChecks(report), present: DELIVERABLES.map((d) => d.n).filter((n) => deliverableOf(report, n).trim().length > 0 || (n === 2 && /^# Deliverable 2:/m.test(report))) };
}

// ---- helpers over the dashboard, shared by the screen and the PDF
export const PILLAR_NAME = (id: string, ar: boolean) => { const p = ARCH_PILLARS.find((x) => x.id === id); return p ? (ar ? p.ar : p.en).replace(/ \(.*\)$/, "") : id; };
const PILLAR_SHORT: Record<string, [string, string]> = { diplomatic: ["Diplomatic", "الدبلوماسية"], soft: ["Soft power", "القوة الناعمة"], hard: ["Hard power", "القوة الصلبة"], economic: ["Economic", "الاقتصاد"], technology: ["Technology", "التقنية"], regional: ["Regional", "الإقليمي"] };
/** A one-or-two word pillar name for pills and chips; the full names stay in legends and headings. */
export const PILLAR_TAG = (id: string, ar: boolean) => PILLAR_SHORT[id]?.[ar ? 1 : 0] ?? id;
export const HORIZON_NAME = (id: string, ar: boolean) => { const h = HORIZONS.find((x) => x.id === id); return h ? (ar ? h.ar : h.en) : id; };
export const HORIZON_SHORT = (id: string, ar: boolean) => HORIZON_NAME(id, ar).split(/[:：]/)[0];
export const PILLAR_HEX: Record<string, string> = { diplomatic: "#378ADD", soft: "#1D9E75", hard: "#7F77DD", economic: "#BA7517", technology: "#D4537E", regional: "#639922" };
export const HORIZON_HEX: Record<string, string> = { short: "#1D9E75", medium: "#378ADD", long: "#7F77DD" };
export const isUnfunded = (i: Initiative) => /^not estimated/i.test(i.funding);
/** The months the chart axis must reach: the latest end month, at least two years. */
export const axisMonths = (ini: Initiative[]) => Math.max(24, ...ini.map((i) => i.endMonth));
export type GateRow = { when: string; sort: string; label: string; detail: string; id: string | null };
/** Every dated decision gate: the ones initiatives carry (a "YYYY-MM" date) and the dashboard's own gate list (free-text "when"), in date order with the undated ones last. */
export function gateRows(d: Dashboard): GateRow[] {
  const dated: GateRow[] = d.initiatives.filter((i) => i.gateDate).map((i) => ({ when: i.gateDate!, sort: i.gateDate!, label: `${i.id}: ${i.gate}`, detail: i.outcome, id: i.id }));
  const listed: GateRow[] = d.gates.map((g) => { const m = /\b(20\d{2})[-/](\d{2})\b/.exec(g.when); return { when: g.when, sort: m ? `${m[1]}-${m[2]}` : "9999", label: g.name, detail: g.decision, id: null }; });
  return [...dated, ...listed].sort((a, z) => (a.sort < z.sort ? -1 : a.sort > z.sort ? 1 : 0));
}
/** Risks placed on the three-by-three matrix only where their own likelihood words say where (the rest are listed unplaced). */
export function placeRisks(d: Dashboard) { return d.risks.map((r, k) => ({ n: k + 1, r, l: likelihoodBand(likelihoodRank(r.likelihood)), i: (r.impact === "high" ? 3 : r.impact === "medium" ? 2 : 1) as 1 | 2 | 3 })); }
