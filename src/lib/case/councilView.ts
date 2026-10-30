import { GROUP_BY, SEAT_BY, SEATS, type Group, type SeatId } from "./seats";
import { boldFields, confOf, mdSections, mdTables, num, plain, type Conf3, type Field, type MdTable } from "./mdparse";

// THE STRATEGIC COUNCIL, READ BACK FOR THE SCREEN AND THE PDF: the Chair's brief, the options and the scorecard, the seat sections with their stance and confidence, the evidence audit's claim verdicts, the debate and the execution roadmap, taken out of the saved markdown report. Nothing here estimates anything: a part the report does not hold is empty, and a report cut off at the model's limit gives what was complete.
export type Course = "deepen" | "staged" | "hedge" | "hold";
export const COURSES: Course[] = ["deepen", "staged", "hedge", "hold"];
/** Which of the four courses a posture name stands for, from its own words (English or Arabic); null when the words are not one of them. */
export function courseOf(name: string): Course | null {
  const t = (name ?? "").toLowerCase();
  if (/deepen|تعميق|تعمّق|تعمق/.test(t)) return "deepen"; if (/hold|watch|wait|ترقب|ترقّب|انتظار/.test(t)) return "hold"; if (/hedge|تحوط|تحوّط/.test(t)) return "hedge"; if (/staged|selective|مراحل|انتقائي|مرحلي/.test(t)) return "staged";
  return null;
}
export type ChairSection = { id: string; title: string; body: string; level: 1 | 2 };
export type CouncilOption = { n: number; name: string; course: Course | null; recommended: boolean; text: string; fields: Field[] };
export type Scorecard = { options: { label: string; course: Course | null; total: number | null }[]; rows: { criterion: string; scores: (number | null)[] }[]; table: MdTable };
export type SeatView = { id: SeatId; name: string; group: Group; judgment: string; stance: string; confidence: Conf3 | null; fields: Field[]; text: string };
export type ClaimVerdict = "supported" | "partly" | "unsupported" | "stale" | "other";
export type Claim = { n: string; claim: string; verdict: ClaimVerdict; verdictText: string; audit: string };
export type DebatePair = { title: string; a: string | null; b: string | null; body: string };
export type Move = { lane: string; title: string; fields: Field[] };
export type RoadmapPlan = { title: string; moves: Move[] };
export type CouncilView = {
  chair: ChairSection[]; bottomLine: string; confidence: Conf3 | null;
  options: CouncilOption[]; recommended: CouncilOption | null; score: Scorecard | null;
  seats: SeatView[]; claims: Claim[]; redTeam: SeatView | null; assessor: SeatView | null; executor: SeatView | null; auditText: string;
  debate: DebatePair[]; debateText: string; roadmap: RoadmapPlan[]; roadmapText: string; split: { chair: string; seats: string; audit: string; debate: string; roadmap: string };
};
/** The Chair's two deliverables, then the appendices, split back out of the saved report (the same split the council tab uses). */
export function splitCouncil(report: string) { const parts = (report ?? "").split(/^# Appendix: /m); const find = (h: string) => parts.find((p) => p.startsWith(h))?.slice(h.length).trim() ?? ""; return { chair: (parts[0] ?? "").replace(/<(statecraft_review|reality_review|consistency_review|review)>[\s\S]*?(?:<\/\1>|$)/g, "").trim(), seats: find("Seat Sections"), audit: find("Evidence Audit and Red Team"), debate: find("Council Debate"), roadmap: find("Execution Roadmap") }; }

const RE = { options: /strategic options|الخيارات الاستراتيجية|الخيارات/i, score: /scorecard|بطاقة|المصالح الوطنية/i };
const slug = (s: string, i: number) => `${i}-${s.toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, "-").replace(/^-|-$/g, "").slice(0, 40)}`;
function chairSections(md: string): ChairSection[] {
  const secs = mdSections(md, [1, 2]); const out: ChairSection[] = [];
  secs.forEach((s, i) => { if (s.level === 1 && !s.body && secs[i + 1]?.level === 2) return; out.push({ id: slug(s.title, i), title: s.title, body: s.body, level: s.level as 1 | 2 }); });
  return out;
}
export function bottomLineOf(chair: string): string {
  const m = /\*\*\s*(?:Bottom line|الخلاصة|الخلاصة الأساسية|الخلاصة الجوهرية|الحكم النهائي)[^*]*\*\*\s*([^\n]+)/i.exec(chair);
  if (m) return plain(m[1]); const first = mdSections(chair, [1])[0]; const para = (first?.body ?? "").split(/\n\s*\n/).map((x) => x.trim()).find((x) => x && !/^[-*|#>]/.test(x)); return para ? plain(para) : "";
}
function parseOptions(sec: string): CouncilOption[] {
  const re = /^\*\*(\d+)\.\s*([^*\n]+?)\*\*[ \t]*/gm; const hits: { n: number; head: string; at: number; end: number }[] = []; let m: RegExpExecArray | null;
  while ((m = re.exec(sec))) hits.push({ n: Number(m[1]), head: m[2].trim(), at: m.index, end: m.index + m[0].length });
  return hits.map((h, i) => { const text = sec.slice(h.end, i + 1 < hits.length ? hits[i + 1].at : undefined).replace(/\n#{1,6}\s[\s\S]*$/, "").trim(); const rec = /\(\s*(?:recommended|موصى به|الموصى به|المفضل)\s*\)/i.test(h.head); const name = h.head.replace(/\([^)]*\)/g, "").replace(/[.:،]+$/g, "").trim();
    const fields: Field[] = []; for (const line of text.split("\n")) { const f = /^\s*[-*•]\s*\*([^*:\n]+):\*\s*(.*)$/.exec(line); if (f) fields.push({ label: f[1].trim(), text: f[2].trim() }); else if (fields.length && /^\s{2,}\S/.test(line)) fields[fields.length - 1].text += ` ${line.trim()}`; }
    const intro = text.split("\n").find((l) => l.trim() && !/^\s*[-*•]/.test(l)) ?? ""; return { n: h.n, name, course: courseOf(name), recommended: rec, text: plain(intro), fields }; });
}
function parseScorecard(chair: ChairSection[]): Scorecard | null {
  const numeric = (t: MdTable) => t.head.length >= 3 && t.rows.length >= 3 && t.rows.filter((r) => r.slice(1).some((c) => num(c) != null)).length >= 3;
  const secs = chair.filter((s) => RE.score.test(s.title)); const cand = [...secs, ...chair.filter((s) => !secs.includes(s))];
  for (const s of cand) { const t = mdTables(s.body).find(numeric); if (!t) continue; const isTotal = (r: string[]) => /total|المجموع|الإجمالي|مجموع/i.test(plain(r[0] ?? "")); const totalRow = t.rows.find(isTotal); const rows = t.rows.filter((r) => !isTotal(r)).map((r) => ({ criterion: plain(r[0] ?? ""), scores: t.head.slice(1).map((_, i) => num(r[i + 1] ?? "")) }));
    return { options: t.head.slice(1).map((h, i) => ({ label: plain(h), course: courseOf(h), total: totalRow ? num(totalRow[i + 1] ?? "") : null })), rows, table: t }; }
  return null;
}
const vclass = (t: string): ClaimVerdict => { const s = plain(t).toLowerCase(); if (/^partly|جزئي|مدعوم جزئ/.test(s)) return "partly"; if (/^unsupported|غير مدعوم|بلا دعم|غير مثبت/.test(s)) return "unsupported"; if (/^supported|^مدعوم|مثبت/.test(s)) return "supported"; if (/stale|قديم|متقادم|منتهي/.test(s)) return "stale"; return "other"; };
function parseClaims(audit: string): Claim[] {
  for (const t of mdTables(audit)) { const vi = t.head.findIndex((h) => /verdict|الحكم|التقييم|النتيجة/i.test(h)); if (vi < 0) continue; const ci = t.head.findIndex((h, i) => i !== vi && /claim|الادعاء|الدعوى|الزعم/i.test(h)); const ni = t.head.findIndex((h) => /^#$|رقم|no\.?$/i.test(h.trim())); const ai = t.head.findIndex((h, i) => i > vi && /audit|التدقيق|ملاحظ|note/i.test(h));
    return t.rows.filter((r) => r.some(Boolean)).map((r, k) => ({ n: ni >= 0 ? plain(r[ni] ?? "") : String(k + 1), claim: plain(r[ci >= 0 ? ci : 1] ?? ""), verdict: vclass(r[vi] ?? ""), verdictText: plain(r[vi] ?? ""), audit: plain(r[ai >= 0 ? ai : t.head.length - 1] ?? "") })); }
  return [];
}
function seatsOf(text: string): SeatView[] {
  const out: SeatView[] = []; const re = /^### (C\d{1,2}) — ([^\n]*)\n([\s\S]*?)(?=^#{1,3} |$(?![\s\S]))/gm; let m: RegExpExecArray | null;
  while ((m = re.exec(text ?? ""))) { const id = m[1] as SeatId; const seat = SEAT_BY.get(id); if (!seat) continue; const body = m[3].trim(); const fields = boldFields(body); const f = (re2: RegExp) => fields.find((x) => re2.test(x.label))?.text ?? "";
    const judgment = plain(f(/judg|الحكم|التقدير/i) || body.split("\n")[0] || ""); const conf = f(/confidence|الثقة/i); out.push({ id, name: m[2].trim(), group: seat.group, judgment, stance: plain(f(/recommend|التوصية|التوصيات/i)), confidence: (conf ? confOf(conf) : null) ?? confOf(judgment), fields, text: body }); }
  return out;
}
function parseDebate(text: string): DebatePair[] {
  return mdSections(text, [3]).map((s) => { const ids = /(C\d{1,2})\D+?(C\d{1,2})/.exec(s.title); return { title: s.title, a: ids?.[1] ?? null, b: ids?.[2] ?? null, body: s.body }; });
}
function parseRoadmap(text: string): RoadmapPlan[] {
  return mdTables(text).filter((t) => t.head.length >= 2 && t.rows.length).map((t) => { const li = Math.max(0, t.head.findIndex((h) => /horizon|الأفق|المدة|المرحلة|timeline/i.test(h))); const ti = t.head.findIndex((h, i) => i !== li && /move|action|initiative|الخطوة|الإجراء|المبادرة|ما يُفعل/i.test(h)); const tix = ti >= 0 ? ti : li === 0 ? 1 : 0;
    return { title: plain(t.before), moves: t.rows.filter((r) => r.some(Boolean)).map((r) => ({ lane: plain(r[li] ?? ""), title: plain(r[tix] ?? ""), fields: t.head.map((h, i) => ({ label: plain(h), text: plain(r[i] ?? "") })).filter((f, i) => i !== li && i !== tix && f.text) })) }; });
}
export function parseCouncil(report: string): CouncilView {
  const split = splitCouncil(report); const chair = chairSections(split.chair); const bottomLine = bottomLineOf(split.chair);
  const optSec = chair.find((s) => RE.options.test(s.title) && s.level === 2); const options = optSec ? parseOptions(optSec.body) : []; const recommended = options.find((o) => o.recommended) ?? null;
  const cut = (t: string) => t.split(/^# (?:Statecraft|Reality|Consistency) Review/m)[0].trim(); const seats = seatsOf(split.seats); const audSeats = seatsOf(cut(split.audit)); const roadText = cut(split.roadmap); const roadSeats = seatsOf(roadText);
  return { chair, bottomLine, confidence: confOf(bottomLine), options, recommended, score: parseScorecard(chair), seats, claims: parseClaims(cut(split.audit)), executor: roadSeats.find((s) => s.id === "C20") ?? roadSeats[0] ?? null, assessor: audSeats.find((s) => s.id === "C9") ?? null, redTeam: audSeats.find((s) => s.id === "C16") ?? null, auditText: split.audit,
    debate: parseDebate(cut(split.debate)), debateText: split.debate, roadmap: parseRoadmap(roadText), roadmapText: split.roadmap, split: { ...split } };
}
/** The seats that sat anywhere in the product (the independent sections, the review seats and the roadmap seat). */
export const seatsHeard = (v: CouncilView) => new Set([...v.seats, ...(v.assessor ? [v.assessor] : []), ...(v.redTeam ? [v.redTeam] : []), ...(v.executor ? [v.executor] : [])].map((s) => s.id)).size;
export const GROUP_ORDER: Group[] = ["A1", "A2", "A3", "A4", "review", "execution"];
export const groupName = (g: Group, ar: boolean) => { const x = GROUP_BY.get(g); return x ? (ar ? x.ar : x.en) : g; };
export const TOTAL_SEATS = SEATS.length;
/** The weighted total the Chair's scorecard gives the recommended course (a judgment, not data), when the report holds both. */
export function recommendedScore(v: CouncilView): number | null { if (!v.score || !v.recommended?.course) return null; return v.score.options.find((o) => o.course === v.recommended!.course)?.total ?? null; }
