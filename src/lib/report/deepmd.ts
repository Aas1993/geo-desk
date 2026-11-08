import { stripReviewJson } from "../review/pair";
import { stripMachine } from "./strip";

// READING A DEEP INTELLIGENCE REPORT: the analyst team's saved report is markdown (the chair's ten headings, a table of options, a challenger's dissent table, the verifier's claim audit, one section per analyst). This file reads the parts that are tables or labelled lines into plain data, for the page and the PDF alike, in English or Arabic. It estimates nothing: a part the report does not contain comes back empty, and the markdown itself is always kept whole beside it.
export type Table = { head: string[]; rows: string[][] };
export type Sec = { level: 1 | 2 | 3; title: string; body: string; h1: string };
export type Level = "high" | "medium" | "low";
export type Verdict = "supported" | "partly" | "unsupported" | "stale" | "other";
export type Change = "yes" | "partly" | "no" | "unknown";
export type CouncilOption = { title: string; fields: [string, string][]; feas: Level | null; feasText: string };
export type Claim = { n: string; claim: string; ref: string; verdict: Verdict; verdictText: string; correction: string };
export type DissentRow = { judgment: string; objection: string; evidence: string; changes: Change; changesText: string };
export type FollowRow = { title: string; fields: [string, string][] };
export type Analyst = { role: string; level: Level | null; confidence: string; conclusion: string; relevance: string; desk: string[]; text: string };
export type CouncilParsed = { mode: "full" | "research"; decision: { label: string; text: string }[]; summaryRest: string; sections: Sec[]; options: CouncilOption[]; challenge: DissentRow[]; challengeIntro: string; wrong: string; claims: Claim[]; criticalErrors: string; follow: FollowRow[]; analysts: Analyst[]; deskInputs: string[]; partial: boolean; optionsSec: number; followSec: number; leadIdx: number };

const cells = (row: string) => row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
const isSep = (r: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(r);
/** Markdown to plain text: emphasis and link syntax removed, fact ids kept. */
export const plain = (s: string) => s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1$2").replace(/`([^`]+)`/g, "$1").replace(/\s+/g, " ").trim();
export const cut = (t: string, n: number) => (t.length > n ? `${t.slice(0, t.lastIndexOf(" ", n) > n * 0.6 ? t.lastIndexOf(" ", n) : n).trimEnd()}…` : t);

/** The report split at its level 1 to 3 headings (the text before the first heading has an empty title). */
export function sectionsOf(md: string): Sec[] {
  const out: Sec[] = []; let cur: Sec = { level: 1, title: "", body: "", h1: "" }; let h1 = ""; const lines = stripMachine(stripReviewJson(md)).replace(/\r/g, "").split("\n");
  for (const line of lines) { const h = /^(#{1,3})\s+(.*)$/.exec(line); if (h) { out.push(cur); const level = h[1].length as 1 | 2 | 3; if (level === 1) h1 = h[2].trim(); cur = { level, title: h[2].trim(), body: "", h1 }; } else cur.body += `${line}\n`; }
  out.push(cur); return out.map((s) => ({ ...s, body: s.body.trim() })).filter((s) => s.title || s.body);
}
export function tablesOf(body: string): Table[] {
  const L = body.split("\n"); const out: Table[] = []; let i = 0;
  while (i < L.length) { if (L[i].includes("|") && i + 1 < L.length && isSep(L[i + 1])) { const head = cells(L[i]); const rows: string[][] = []; i += 2; while (i < L.length && L[i].includes("|") && L[i].trim()) { rows.push(cells(L[i])); i++; } out.push({ head, rows }); } else i++; }
  return out;
}
/** `**Label:** text` lines (the label may carry a bracket: "Decision (Proposal)"). */
export function labelled(body: string): { label: string; text: string }[] {
  const out: { label: string; text: string }[] = []; for (const line of body.split("\n")) { const m = /^\s*\*\*([^*]{2,60}?):?\*\*:?\s*(.*)$/.exec(line); if (m) out.push({ label: m[1].replace(/:$/, "").trim(), text: m[2].trim() }); } return out;
}
const AR_HIGH = /مرتفع|عالي|عال\b|عالٍ/, AR_MED = /متوسط|معتدل/, AR_LOW = /منخفض|ضعيف/;
/** The first of high, medium, low a text says (English or Arabic); null when it says none ("not established"). */
export function levelOf(t: string): Level | null {
  const s = t.toLowerCase(); const found: [number, Level][] = []; for (const [re, lv] of [[/\bhigh\b/, "high"], [/\bmedium\b|\bmoderate\b/, "medium"], [/\blow\b/, "low"], [AR_HIGH, "high"], [AR_MED, "medium"], [AR_LOW, "low"]] as [RegExp, Level][]) { const m = re.exec(s); if (m) found.push([m.index, lv]); }
  found.sort((a, z) => a[0] - z[0]); return found[0]?.[1] ?? null;
}
export function verdictOf(t: string): Verdict {
  const s = t.toLowerCase(); if (/unsupported|غير مدعوم|غير مسند|بلا سند|غير مثبت/.test(s)) return "unsupported"; if (/partly|partial|جزئي/.test(s)) return "partly"; if (/stale|قديم|متقادم|غير محدّث|غير محدث/.test(s)) return "stale"; if (/supported|مدعوم|مسند|مثبت/.test(s)) return "supported"; return "other";
}
export function changeOf(t: string): Change {
  const s = t.trim().toLowerCase(); if (/^(partly|partially|جزئي)/.test(s)) return "partly"; if (/^(yes|نعم)/.test(s)) return "yes"; if (/^(no\b|لا\b|لا،|لا\.)/.test(s)) return "no"; return "unknown";
}
const col = (head: string[], re: RegExp) => head.findIndex((h) => re.test(h));
const LABELS: [string, RegExp][] = [["mandate", /^(mandate|الولاية|المهمة|التكليف)/i], ["contribution", /^(distinct|الإسهام|المساهمة)/i], ["evidence", /^(evidence|الأدلة|الدليل)/i], ["assumptions", /^(assumption|الافتراضات)/i], ["conclusion", /^(conclusion|الاستنتاج|الخلاصة)/i], ["confidence", /^(confidence|الثقة|درجة الثقة)/i], ["contrary", /^(contrary|الأدلة المضادة|دليل مضاد)/i], ["relevance", /^(uae relevance|صلة|أهمية|الصلة)/i], ["unresolved", /^(unresolved|أسئلة|الأسئلة)/i]];
/** The labelled lines of one analyst section, each with the bullets or lines that follow it. A section whose labels are in another language is read by position (the nine lines come in a fixed order). */
function analystFields(body: string): Record<string, string> {
  const order = LABELS.map(([k]) => k); const lines = body.split("\n").map((l) => l.trim()).filter(Boolean); const lab = (l: string) => /^\*{0,2}([^:*\n|]{3,48})\*{0,2}:\*{0,2}\s*(.*)$/.exec(l);
  const run = (match: (name: string, n: number) => string | undefined) => { const out: Record<string, string> = {}; let cur = ""; let n = 0; for (const l of lines) { const m = /^\*\*/.test(l) || !/^[-*•\d]/.test(l) ? lab(l) : null; const key = m ? match(m[1].trim(), n) : undefined; if (m && key) { cur = key; n++; out[cur] = [out[cur], m[2]].filter(Boolean).join(" "); } else if (cur) out[cur] = `${out[cur] ?? ""} ${l.replace(/^[-*•]\s+/, "")}`.trim(); } return out; };
  const byName = run((name) => LABELS.find(([, re]) => re.test(name))?.[0]); if (byName.confidence) return byName;
  const bold = lines.filter((l) => /^\*\*[^*]+:?\*\*/.test(l)).length; return bold >= 7 ? run((_n, n) => order[n]) : byName;
}
const DESK = /DESK INPUT REQUIRED:?\s*([^\n]*)|مطلوب من المكتب:?\s*([^\n]*)|مدخلات المكتب[^:]*:\s*([^\n]*)/g;

export function parseCouncil(report: string): CouncilParsed {
  const secs = sectionsOf(report); const appendixAt = secs.findIndex((s) => s.level === 1 && /appendix|ملحق/i.test(s.title)); const chair = secs.filter((s, i) => s.level === 2 && (appendixAt < 0 || i < appendixAt));
  const research = secs.some((s) => s.level === 1 && /research synthesis|تركيب الأبحاث/i.test(s.title)); const mode = research ? "research" : "full";
  const first = mode === "full" ? chair[0] : undefined; const decision = first ? labelled(first.body).map((x) => ({ label: x.label, text: plain(x.text) })).filter((x) => x.text) : [];
  const summaryRest = first ? first.body.split("\n").filter((l) => !/^\s*\*\*[^*]{2,60}\*\*/.test(l) && l.trim()).join("\n") : "";
  // options: the table with a feasibility column, wherever the chair put it
  let options: CouncilOption[] = []; let optionsSec = -1; chair.forEach((s, si) => { for (const t of tablesOf(s.body)) { const f = col(t.head, /feasib|جدوى|الجدوى|إمكان/i); if (f >= 0 && !options.length) { optionsSec = si; options = t.rows.map((r) => ({ title: plain(r[0] ?? ""), fields: t.head.map((h, j) => [plain(h), plain(r[j] ?? "")] as [string, string]).slice(1).filter(([, v]) => v), feas: levelOf(r[f] ?? ""), feasText: plain(r[f] ?? "") })).filter((o) => o.title); } } });
  // follow-through: the last chair section holding a table
  let follow: FollowRow[] = []; let followSec = -1; for (let si = chair.length - 1; si >= 0; si--) { const t = tablesOf(chair[si].body)[0]; if (t && col(t.head, /feasib|جدوى/i) < 0) { followSec = si; follow = t.rows.map((r) => ({ title: plain(r[0] ?? ""), fields: t.head.map((h, j) => [plain(h), plain(r[j] ?? "")] as [string, string]).slice(1).filter(([, v]) => v) })).filter((x) => x.title); if (follow.length) break; followSec = -1; } }
  // the challenger's dissent table and the verifier's claim audit
  const challenge: DissentRow[] = []; let challengeIntro = ""; let wrong = ""; const claims: Claim[] = []; let criticalErrors = "";
  secs.forEach((s, i) => {
    if (appendixAt >= 0 && i > appendixAt && s.level === 2) {
      const t = tablesOf(s.body)[0]; const lines = s.body.split("\n").filter((l) => l.trim() && !l.includes("|"));
      if (t && col(t.head, /objection|اعتراض/i) >= 0) { const o = col(t.head, /objection|اعتراض/i), e = col(t.head, /evidence|source|دليل|الأدلة|مصدر/i), c = t.head.length - 1; challengeIntro = plain(lines.join(" ")); for (const r of t.rows) challenge.push({ judgment: plain(r[0] ?? ""), objection: plain(r[o] ?? ""), evidence: plain(r[e >= 0 ? e : 2] ?? ""), changes: changeOf(r[c] ?? ""), changesText: plain(r[c] ?? "") }); }
      else if (t && col(t.head, /verdict|الحكم|التقدير/i) >= 0) { const v = col(t.head, /verdict|الحكم|التقدير/i), cl = col(t.head, /claim|الادعاء|المقولة/i), rf = col(t.head, /fact id|source|المعرّف|المصدر/i), co = col(t.head, /correction|التصحيح/i); for (const r of t.rows) claims.push({ n: plain(r[0] ?? ""), claim: plain(r[cl >= 0 ? cl : 1] ?? ""), ref: plain(r[rf >= 0 ? rf : 2] ?? ""), verdict: verdictOf(r[v] ?? ""), verdictText: plain(r[v] ?? ""), correction: plain(r[co >= 0 ? co : t.head.length - 1] ?? "") }); }
      else if (/wrong|خاطئ|خطأ/i.test(s.title)) wrong = plain(s.body); else if (/critical|حرج|الأخطاء/i.test(s.title)) criticalErrors = plain(s.body);
    }
  });
  const analysts: Analyst[] = secs.filter((s) => s.level === 3 && /^(analyst|المحلل|محلل)/i.test(s.title)).map((s) => { const f = analystFields(s.body); return { role: plain(s.title.replace(/^(analyst|المحلل|محلل)\s*[:：]?\s*/i, "")), level: levelOf(f.confidence ?? ""), confidence: plain(f.confidence ?? ""), conclusion: plain(f.conclusion ?? ""), relevance: plain(f.relevance ?? ""), desk: [...s.body.matchAll(DESK)].map((m) => plain(m[1] ?? m[2] ?? m[3] ?? "")).filter(Boolean), text: s.body }; });
  const deskInputs = [...new Set(analysts.flatMap((a) => a.desk))];
  const partial = mode === "full" && (!decision.length || chair.length < 6 || /chair did not finish|لم يُنهِ الرئيس|لم ينته الرئيس/i.test(report));
  const leadIdx = Math.max(0, decision.findIndex((d) => !/question|سؤال/i.test(d.label)));
  return { mode, leadIdx, decision, summaryRest, sections: chair, options, challenge, challengeIntro, wrong, claims, criticalErrors, follow, analysts, deskInputs, partial, optionsSec, followSec };
}
export const tally = <T extends string>(xs: T[], keys: readonly T[]): Record<T, number> => { const o = {} as Record<T, number>; for (const k of keys) o[k] = xs.filter((x) => x === k).length; return o; };
/** The text with its tables removed (a page that draws the tables as cards keeps the words around them). */
export function dropTables(body: string): string {
  const L = body.split("\n"); const out: string[] = []; let i = 0;
  while (i < L.length) { if (L[i].includes("|") && i + 1 < L.length && isSep(L[i + 1])) { i += 2; while (i < L.length && L[i].includes("|") && L[i].trim()) i++; continue; } out.push(L[i]); i++; }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
