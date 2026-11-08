import type { CaseData } from "./case/load";
import { buildPlaybook, playbookMarkdown, type PbFiled } from "./case/playbook";
import { PLAYBOOK_HEADING, playbookSection } from "./case/playbookRole";
import { parseMission1, parseMission2 } from "./desk/embassy";
import { parseMofa } from "./desk/mofa";
import type { Source } from "./reportpdf";
import type { Standard } from "./desk/standard";

// THE PLAYBOOK AND THE EXTENDED STRUCTURED DATA IN THE PDF. A desk product's PDF carries the free rule-built UAE statecraft playbook for its country (with the chief's own enrichment inside it) and the tables of the structured data that the plain brief does not print: the call sheet, the stakeholder map, the engagement calendar, the budget, the tripwires, the negotiation tracks, the visit plan, the talking points and the legal agenda. Both are made from what this browser already holds plus the free Case File: no model call.
export const PLAYBOOK_KINDS = new Set(["emb-intel", "emb-plan", "mofa-council"]);
const KEYS: Record<keyof PbFiled, string> = { mofa: "mofa-council", embIntel: "emb-intel", embPlan: "emb-plan", kingBrief: "king-council", council: "", architect: "" };
/** The desk products saved in this browser for a country, as report texts. */
export function readFiledReports(iso: string): PbFiled {
  const out: PbFiled = {};
  try { for (const k of ["mofa", "embIntel", "embPlan", "kingBrief"] as const) { const j = JSON.parse(localStorage.getItem(`gd-desk:${KEYS[k]}:${iso}`) ?? "null") as { report?: string } | null; if (j?.report) out[k] = j.report; } for (const [k, key] of [["council", `gd-case-council:${iso}`], ["architect", `gd-case-architect:${iso}`]] as const) { const j = JSON.parse(localStorage.getItem(key) ?? "null") as { report?: string } | null; if (j?.report) out[k] = j.report; } } catch { /* storage blocked */ }
  return out;
}
const ANNEXES = ["Country Team Reports", "Desk Lines of Effort", "Role Reports", "Structured data"];
const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** The report with its own "UAE Statecraft Playbook" section replaced by the full playbook (rule-built baseline, then the product's enrichment). The section goes where the chief's was, or before the long annexes. */
export function injectPlaybook(report: string, d: CaseData, filed: PbFiled, lang: "en" | "ar"): string {
  const own = playbookSection(report); const md = playbookMarkdown(buildPlaybook(d, filed, lang), { level: 1, enrichment: own });
  const at = new RegExp(`^# ${esc(PLAYBOOK_HEADING)}[^\\n]*\\n[\\s\\S]*?(?=^# |$(?![\\s\\S]))`, "m");
  if (at.test(report)) return report.replace(at, `${md}\n\n`);
  const m = new RegExp(`^# (?:${ANNEXES.map(esc).join("|")})`, "m").exec(report); if (m) return `${report.slice(0, m.index)}${md}\n\n${report.slice(m.index)}`;
  return `${report.trimEnd()}\n\n${md}\n`;
}
/** A product ready for the PDF: the playbook for its country added when the Case File can be read. Any failure leaves the product as it was. */
export async function withPlaybook(s: Source): Promise<Source> {
  if (!PLAYBOOK_KINDS.has(s.kind) || !/^[A-Z]{3}$/.test(s.iso) || s.iso === "ARE" || typeof fetch !== "function") return s;
  try { const r = await fetch(`/api/case/${s.iso}`); if (!r.ok) return s; const d = (await r.json()) as CaseData; if (!d || !Array.isArray(d.instruments)) return s; return { ...s, report: injectPlaybook(s.report, d, { ...readFiledReports(s.iso) }, s.lang) }; } catch { return s; }
}

const cell = (v: unknown) => String(v ?? "").replace(/\|/g, "/").replace(/\s+/g, " ").trim() || "-";
const tbl = (head: string[], rows: unknown[][]) => (rows.length ? `| ${head.join(" | ")} |\n|${head.map(() => "---").join("|")}|\n${rows.map((r) => `| ${r.map(cell).join(" | ")} |`).join("\n")}` : "");
/** The shared keys of the standard (so-what, what changed, coalition, influence, scenarios) as markdown sections. */
function stdSections(std: Standard, L: "en" | "ar"): string[] {
  const e = (en: string, ar: string) => (L === "ar" ? ar : en); const sec = (title: string, body: string) => (body ? `## ${title}\n\n${body}` : ""); const out: string[] = [];
  if (std.soWhat || std.asOf || std.changed.length) out.push(sec(e("So what for the UAE, as of the date, and what changed", "الخلاصة لمصالح الإمارات وتاريخ الأدلة وما تغيّر"), [std.asOf && `**${e("As of", "بتاريخ")}:** ${std.asOf}`, std.soWhat && `**${e("So what", "الخلاصة")}:** ${std.soWhat}`, ...std.changed.map((x) => `- ${x}`)].filter(Boolean).join("\n\n")));
  out.push(sec(e("Coalition and friends plan", "خطة التحالف والأصدقاء"), tbl([e("Who", "من"), e("Kind", "النوع"), e("Offer", "العرض"), e("Ask", "الطلب"), e("Seat or vote", "المقعد أو التصويت"), e("Owner", "المسؤول")], std.coalition.map((c) => [c.who, c.kind, c.offer, c.ask, c.seat, c.owner]))));
  out.push(sec(e("Influence plan", "خطة النفوذ"), tbl([e("Lever", "الأداة"), e("Move", "الخطوة"), e("Owner", "المسؤول"), e("When", "متى"), e("Measure", "المقياس")], std.influence.map((x) => [x.lever, x.move, x.owner, x.when, x.measure]))));
  out.push(sec(e("Scenarios and tripwires", "السيناريوهات وأسلاك التنبيه"), tbl([e("Scenario", "السيناريو"), e("Likelihood", "الاحتمال"), e("What happens", "ما يحدث"), e("Trigger", "المحفّز"), e("Tripwire", "سلك التنبيه"), e("Response", "الاستجابة")], std.scenarios.map((x) => [x.kind, x.likelihood, x.summary, x.trigger, x.indicator, x.response]))));
  return out.filter(Boolean);
}
/** The extended structured data of a desk product as markdown sections (each starting `## `), in the product's language: what the older tables did not print. */
export function extendedStructured(kind: string, report: string, L: "en" | "ar"): string[] {
  const e = (en: string, ar: string) => (L === "ar" ? ar : en); const sec = (title: string, body: string) => (body ? `## ${title}\n\n${body}` : ""); const out: string[] = [];
  if (kind === "emb-intel") {
    const m = parseMission1(report); if (!m) return [];
    out.push(...stdSections(m.std, L));
    out.push(sec(e("First 30 days: the call sheet", "أول 30 يومًا: جدول الاتصالات"), tbl([e("Who", "من"), e("Lead (proposed)", "المسؤول (مقترح)"), e("When", "متى"), e("Format", "الصيغة"), e("Ask", "الطلب"), e("Offer", "العرض"), e("Prepare", "التحضير")], m.callSheet.map((c) => [c.who, c.level, c.when, c.format, c.ask, c.offer, c.prep]))));
    out.push(sec(e("What the desks could not establish", "ما لم تستطع المكاتب إثباته"), tbl([e("Gap", "الفجوة"), e("How to close it (open, lawful)", "كيف تُسدّ (علنًا وبوجه مشروع)"), e("Desk", "المكتب")], m.collection.map((c) => [c.gap, c.how, c.desk]))));
  } else if (kind === "emb-plan") {
    const m = parseMission2(report); if (!m) return [];
    out.push(...stdSections(m.std, L));
    out.push(sec(e("The first 30 days", "أول 30 يومًا"), tbl(["ID", e("Initiative", "المبادرة"), e("Owner", "المسؤول"), e("Start", "البدء"), e("Finish", "الانتهاء"), e("Milestone", "المعلم"), e("Gate", "البوابة")], m.plans.d30.map((i) => [i.id, i.title, i.owner, i.start, i.due, i.milestone, i.gate]))));
    out.push(sec(e("Objectives with owners, baselines, targets and dates", "الأهداف بمسؤوليها وخطوط أساسها وغاياتها وتواريخها"), tbl(["ID", e("Objective", "الهدف"), e("Owner (proposed)", "المسؤول (مقترح)"), e("Baseline", "خط الأساس"), e("Target", "الغاية"), e("By", "بحلول")], m.strategy.objectives.map((o) => [o.id, o.title, o.owner, o.baseline, o.target, o.by]))));
    out.push(sec(e("Milestones", "المعالم"), tbl([e("Horizon", "الأفق"), e("When", "متى"), e("Milestone", "المعلم"), e("Initiatives", "المبادرات"), e("Gate", "البوابة")], m.milestones.map((x) => [x.horizon === "d30" ? e("30 days", "30 يومًا") : x.horizon === "d100" ? e("100 days", "100 يوم") : x.horizon === "y1" ? e("1 year", "سنة") : e("3 years", "3 سنوات"), x.when, x.milestone, x.initiatives.join(", "), x.gate]))));
    out.push(sec(e("Stakeholder map (public roles and organisations)", "خريطة أصحاب المصلحة (أدوار ومؤسسات عامة)"), tbl([e("Who", "من"), e("Level", "المستوى"), e("Interest", "المصلحة"), e("Stance", "الموقف"), e("Engagement", "الارتباط"), e("Owner", "المسؤول")], m.stakeholders.map((x) => [x.who, x.level, x.interest, x.stance, x.engagement, x.owner]))));
    out.push(sec(e("Engagement calendar", "تقويم الارتباط"), tbl([e("When", "متى"), e("What", "ماذا"), e("Who", "من"), e("Objective", "الهدف"), e("Lead", "المسؤول")], m.calendar.map((x) => [x.when, x.what, x.who, x.objective, x.lead]))));
    out.push(sec(e("Budget (not estimated unless evidenced)", "الميزانية (غير مقدّرة ما لم تثبت)"), tbl([e("Line", "البند"), e("Horizon", "الأفق"), e("Amount", "المبلغ"), e("Basis", "الأساس"), e("Funder (proposed)", "الممول (مقترح)")], m.budget.map((x) => [x.line, x.horizon, x.amount, x.basis, x.funder]))));
    out.push(sec(e("What the mission asks of the ministry", "ما تطلبه البعثة من الوزارة"), tbl([e("Resource", "المورد"), e("Why", "لماذا"), e("Cost", "الكلفة"), e("Supplier", "الجهة الموفرة"), e("By", "بحلول")], m.resources.map((x) => [x.item, x.why, x.cost, x.owner, x.by]))));
    out.push(sec(e("Risks and tripwires", "المخاطر وأسلاك التنبيه"), `${tbl([e("Risk", "الخطر"), e("Impact", "الأثر"), e("Trigger", "المحفّز"), e("Mitigation", "المعالجة"), e("Owner", "المسؤول")], m.risks.map((r) => [r.name, r.impact, r.trigger, r.mitigation, r.owner]))}\n\n${tbl([e("Tripwire signal", "إشارة سلك التنبيه"), e("Threshold", "العتبة"), e("Response agreed in advance", "الاستجابة المتفق عليها"), e("Owner", "المسؤول"), e("Reviews", "يراجع")], m.tripwires.map((x) => [x.signal, x.threshold, x.response, x.owner, x.reviews]))}`.trim()));
    out.push(sec(e("Governance of the strategy", "حوكمة الاستراتيجية"), tbl([e("Forum", "المنتدى"), e("Cadence", "الوتيرة"), e("Chair (proposed)", "الرئيس (مقترح)"), e("Purpose", "الغرض")], m.governance.map((x) => [x.forum, x.cadence, x.chair, x.purpose]))));
  } else if (kind === "mofa-council") {
    const m = parseMofa(report); if (!m) return [];
    out.push(...stdSections(m.std, L));
    out.push(sec(e("Ranked priorities", "الأولويات المرتبة"), tbl(["#", e("Priority", "الأولوية"), e("Interest", "المصلحة"), e("Horizon", "الأفق"), e("Owner (proposed)", "المسؤول (مقترح)"), e("Evidence", "الدليل")], m.priorities.map((p) => [p.rank, p.title, p.interest, p.horizon, p.owner, p.evidence.join(", ")]))));
    out.push(sec(e("Goals and measures", "الأهداف والمقاييس"), tbl(["ID", e("Priority", "الأولوية"), e("Goal", "الهدف"), e("Measure", "المقياس"), e("Baseline", "خط الأساس"), e("Target", "الغاية"), e("By", "بحلول"), e("Owner", "المسؤول")], m.goals.map((g) => [g.id, g.priority, g.goal, g.measure, g.baseline, g.target, g.by, g.owner]))));
    out.push(sec(e("Mission tasks", "مهام البعثة"), tbl(["ID", e("Priority", "الأولوية"), e("Task", "المهمة"), e("Who (proposed)", "من (مقترح)"), e("When", "متى"), e("Measure", "المقياس"), e("Deliverable", "المخرج")], m.mission.map((t) => [t.id, t.priority, t.task, t.who, t.when, t.measure, t.deliverable]))));
    out.push(sec(e("Domain plans", "خطط المجالات"), m.plans.map((p) => `**${p.domain}.** ${p.aim}\n\n${tbl([e("Action", "الإجراء"), e("Owner", "المسؤول"), e("When", "متى"), e("Measure", "المقياس")], p.actions.map((a) => [a.action, a.owner, a.when, a.measure]))}`).join("\n\n")));
    out.push(sec(e("Negotiation tracks", "مسارات التفاوض"), tbl([e("Track", "المسار"), e("Aim", "الغاية"), e("Ask", "الطلب"), e("Offer", "العرض"), e("Leverage", "النفوذ"), e("Fallback", "البديل"), e("Red line", "الخط الأحمر"), e("Lead", "المسؤول"), e("When", "متى")], m.negotiation.map((x) => [x.track, x.aim, x.ask, x.offer, x.leverage, x.fallback, x.redLine, x.lead, x.when]))));
    out.push(sec(e("Visit plan, in sequence", "خطة الزيارات بالتسلسل"), tbl([e("When", "متى"), e("What", "ماذا"), e("Level", "المستوى"), e("Lead", "المسؤول"), e("Deliverables", "المخرجات"), e("Prepare first", "التحضير أولًا")], m.visits.map((x) => [x.when, x.what, x.level, x.lead, x.deliverables.join("; "), x.prep.join("; ")]))));
    out.push(sec(e("Talking points", "نقاط الحوار"), tbl([e("Topic", "الموضوع"), e("Point", "النقطة"), e("Evidence", "الدليل"), e("Avoid", "تجنب")], m.talking.map((x) => [x.topic, x.point, x.evidence, x.avoid]))));
    out.push(sec(e("Legal and treaty agenda", "الأجندة القانونية والمعاهداتية"), tbl([e("Instrument", "الصك"), e("Status", "الحالة"), e("Aim", "الغاية"), e("Steps", "الخطوات"), e("Owner", "المسؤول"), e("By", "بحلول"), e("Risk", "الخطر")], m.legal.map((x) => [x.instrument, x.status, x.aim, x.steps.join("; "), x.owner, x.by, x.risk]))));
    out.push(sec(e("Reporting and triggers for an updated brief", "التقارير ومحفزات الموجز المحدّث"), `${tbl([e("Cadence", "الوتيرة"), e("From", "من"), e("To", "إلى"), e("Content", "المحتوى")], m.reporting.map((x) => [x.cadence, x.from, x.to, x.content]))}\n\n${tbl([e("Indicator", "المؤشر"), e("Signal", "الإشارة"), e("Threshold", "العتبة"), e("Action", "الإجراء")], m.watch.map((x) => [x.indicator, x.signal, x.threshold, x.action]))}`.trim()));
  }
  return out.filter(Boolean);
}
