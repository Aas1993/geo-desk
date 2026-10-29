import { DESK_COMMON, parseReviews, type Review } from "../desk/core";
import { BIRD_AUDITORS } from "../review/pair";
import type { Bird, Inputs } from "./consolidate";
import { kingExec, mofaBriefText, mofaPrioritiesText } from "./consolidate";
import { embSection } from "../desk/embassy";

// THE BIRD'S EYE AUDIT: before the brief is published as a PDF, three independent auditors read it: the Statecraft Auditor (does it serve the UAE's interest and is the course sound), the Reality Auditor (is every figure, date and name real and current, checked against the evidence on file) and the Consistency Auditor (does each line say exactly what the tab it names says, is anything important missing, do the tabs agree).
// They read the brief and a digest of the products it was built from; they write none of it, and they may red-flag it. The audit is kept with a fingerprint of the brief it audited, so a brief that has changed since is shown as not audited.
export const BIRD_SYSTEM = `THE BIRD'S EYE AUDIT
Three independent auditors of the UAE Geo Desk checking one consolidated brief before it is published

MISSION
The brief consolidates what the platform's councils and desks say about one country into a single strategic view for a decision in the UAE's interest. Before it is published it is audited: for the UAE's interest and the soundness of the course, for the reality of its data against the evidence on file, and for its faithfulness, completeness and consistency against the products it consolidates. You write none of it and you do not rewrite it: you say plainly what fails, why it matters to the UAE and what must be corrected, and you raise a red flag only for a real danger or a real falsehood.

${DESK_COMMON}`;
export const AUDIT_AGENTS = BIRD_AUDITORS;
export const AUDIT_EST_USD = 0.45;
export const auditKey = (iso: string) => `gd-bird-audit:${iso}`;
export type AuditSaved = { report: string; at: string; usd: number | null; hash: string; lang: "en" | "ar" };
/** A short fingerprint of the brief that was audited. */
export function briefHash(md: string): string { let h = 5381; for (let i = 0; i < md.length; i++) h = ((h << 5) + h + md.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
const cut = (t: string, n: number) => (t.length > n ? `${t.slice(0, n)}…` : t);
/** The products the brief was built from, trimmed to what an auditor needs to check a line against its source. */
export function sourceDigest(i: Inputs, b: Bird, max = 14_000): string {
  const P = i.products; const out: string[] = [];
  const add = (label: string, p: { at: string; usd: number | null } | null, body: string) => { if (p && body.trim()) out.push(`### ${label} (saved ${p.at.slice(0, 10)}${p.usd != null ? `, US$${p.usd.toFixed(2)}` : ""})\n${cut(body.trim(), 1800)}`); else if (!p) out.push(`### ${label}\nNOT ON FILE.`); };
  add("THE KING", P.king, kingExec(P.king)); add("The Ministry", P.mofa, `${mofaBriefText(P.mofa)}\n${mofaPrioritiesText(P.mofa)}`);
  add("Embassy intelligence", P.intel, P.intel ? `${embSection(P.intel.report, "Ambassador's Brief")}\n${embSection(P.intel.report, "Trade and Investment Gaps")}` : ""); add("Mission strategy", P.plan, P.plan ? embSection(P.plan.report, "Mission Strategy") : "");
  for (const [label, p] of [["Statecraft Architect", P.architect], ["Strategic Council", P.council], ["Falcon Council", P.falcon], ["Deep Intelligence", P.deep], ["Machiavellian council", P.mach]] as const) add(label, p, p ? p.report.replace(/<(\w+)>[\s\S]*?(?:<\/\1>|$)/g, "").slice(0, 1500) : "");
  out.push(`### Free Case File facts\n${b.facts.map((f) => `- ${f.label.en}: ${f.value}`).join("\n") || "none"}`);
  return cut(out.join("\n\n"), max);
}
export const verdictOf = (report: string) => { const rv = parseReviews(report); const flags = rv.flatMap((r) => r.redFlags); const crit = flags.filter((f) => f.severity === "critical").length; return { reviews: rv, flags: flags.length, critical: crit, rejected: rv.some((r) => r.verdict === "reject"), complete: rv.length >= BIRD_AUDITORS.length, ok: rv.length >= BIRD_AUDITORS.length && crit === 0 && !rv.some((r) => r.verdict === "reject") }; };
/** The audit as a section of the PDF: verdicts, red flags and the corrections the auditors asked for (or a plain notice that the brief was not audited). */
export function auditMarkdown(a: AuditSaved | null, currentHash: string, lang: "en" | "ar"): string {
  const e = (en: string, ar: string) => (lang === "ar" ? ar : en);
  if (!a) return `## ${e("Independent audit", "التدقيق المستقل")}\n\n> **${e("NOT AUDITED.", "لم يُدقَّق.")}** ${e("This brief was published without the independent audit of its three auditors.", "نُشر هذا الموجز دون التدقيق المستقل للمدققين الثلاثة.")}`;
  const v = verdictOf(a.report); const stale = a.hash !== currentHash; const name = (r: Review) => (r.lens === "statecraft" ? e("Statecraft", "فن الحكم") : r.lens === "reality" ? e("Reality", "الواقع") : e("Consistency", "الاتساق"));
  const issues = v.reviews.flatMap((r) => r.issues.filter((x) => x.severity !== "low").map((x) => ({ ...x, by: name(r) })));
  return [`## ${e("Independent audit", "التدقيق المستقل")}`, "", stale ? `> **${e("The brief changed after this audit.", "تغيّر الموجز بعد هذا التدقيق.")}**` : "", `${e("Audited", "دُقّق في")} ${a.at.slice(0, 16).replace("T", " ")} UTC · ${v.ok ? e("cleared for publication", "مُجاز للنشر") : e("NOT cleared: read the flags and corrections", "غير مُجاز: اقرأ الأعلام والتصحيحات")}`, "", `| ${e("Auditor", "المدقق")} | ${e("Verdict", "الحكم")} | ${e("Standing", "الوضع")} | ${e("Summary", "الخلاصة")} |`, "|---|---|---|---|", ...v.reviews.map((r) => `| ${name(r)} | ${r.verdict} | ${r.standing ?? "-"} | ${r.summary.replace(/\|/g, "/")} |`), "",
    ...(v.flags ? [`### ${e("Red flags", "أعلام حمراء")}`, "", ...v.reviews.flatMap((r) => r.redFlags.map((f) => `- **${f.severity === "critical" ? e("Critical", "حرج") : e("Serious", "جاد")} (${name(r)}): ${f.flag}** ${f.why ? `${e("Why", "لماذا")}: ${f.why} ` : ""}${f.ask ? `${e("Correct by", "التصحيح")}: ${f.ask}` : ""}`)), ""] : []),
    ...(issues.length ? [`### ${e("Corrections asked for", "التصحيحات المطلوبة")}`, "", ...issues.slice(0, 12).map((x) => `- **${x.where || "-"} (${x.by}):** ${x.problem} ${e("Fix", "الإصلاح")}: ${x.fix}`), ""] : [])].filter((x) => x !== undefined).join("\n");
}
