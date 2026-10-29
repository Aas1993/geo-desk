import type { CaseData } from "../case/load";
import type { Posture } from "../case/core";
import { parseReviews, headlineOf } from "../desk/core";
import { embSection, parseMission1, parseMission2 } from "../desk/embassy";
import { kingSection, parseKing } from "../desk/king";
import { mofaDigest, mofaSection, parseMofa } from "../desk/mofa";
import { assess, type Quality } from "../quality/gate";
import { progressOf, type Track } from "../mofa/track";

// THE BIRD'S EYE VIEW: one page that consolidates every tab's insight on a country into the top strategic view for a decision in the UAE's interest. It is built by rules from what is already saved in this browser and from the free Case File data: no model, no cost, nothing invented. Where a tab has not been run it says so and says which one to run.
// It never overrides a tab: every line carries the tab it came from, the auditors' red flags from every product are gathered at the top, and a readiness score says how much of the picture is actually on file, how fresh it is and whether it has been independently checked.
type B = { en: string; ar: string };
export type Prod = { report: string; at: string; usd: number | null; sources: { url: string }[]; lang: "en" | "ar" } | null;
export type Inputs = { iso: string; name: string; d: CaseData | null; track: Track; now: number; products: { king: Prod; mofa: Prod; intel: Prod; plan: Prod; architect: Prod; council: Prod; falcon: Prod; deep: Prod; mach: Prod } };
export type From = { tab: string; href: string };
export type Line = { text: string; sub?: string; from: From };
export type Bird = {
  iso: string; name: string;
  stance: { rows: { label: B; value: Posture | null; detail: string; from: From }[]; agreement: "aligned" | "split" | "partial" | "unknown"; note: B };
  insights: Line[]; interests: { rank: number; title: string; interest: string; progress: number | null; evidence: string[] }[]; opportunities: (Line & { kind: B })[]; risks: (Line & { level: string })[];
  redFlags: { flag: string; severity: "critical" | "serious"; lens: string; product: string; why: string; ask: string; from: From }[];
  triad: { label: B; headline: string; from: From }[]; actions: { when: string; what: string; owner: string; from: From }[]; watch: Line[];
  evidence: { id: string; label: B; from: From; onFile: boolean; ageDays: number | null; usd: number | null; grade: string | null; verdicts: string; flags: number }[];
  readiness: { score: number; checks: { ok: boolean; label: B }[] }; facts: { label: B; value: string }[];
};
const F = (tab: string, href: string): From => ({ tab, href });
const FROM = { king: F("THE KING", "/king"), mofa: F("The Ministry", "/mofa"), intel: F("The Ambassador: intelligence", "/ambassador"), plan: F("The Ambassador: strategy", "/ambassador"), arch: F("Case File: Architect", "/case"), council: F("Case File: Strategic Council", "/case"), falcon: F("Falcon Eye", "/falcon"), deep: F("Deep Intelligence", "/deep"), mach: F("Machiavellian", "/machiavelli"), case: F("Case File", "/case") };
const cut = (t: string, n: number) => { const x = t.replace(/\s+/g, " ").trim(); return x.length > n ? `${x.slice(0, x.lastIndexOf(" ", n) > n * 0.6 ? x.lastIndexOf(" ", n) : n)}…` : x; };
/** A header line such as "Prepared for: … | As of: … | Newest source: …" says who and when, not what the council found. */
const META = /^(prepared for|prepared by|as of|date|evidence cutoff)\b/i;
const firstPara = (md: string, n = 320) => { const body = md.replace(/<(\w+)>[\s\S]*?(?:<\/\1>|$)/g, ""); for (const l of body.split("\n")) { const s = l.replace(/^[#>*\-\s]+/, "").replace(/\*\*/g, "").trim(); if (s.length > 60 && !s.startsWith("|") && !META.test(s) && (s.match(/ \| /g) ?? []).length < 2) return cut(s, n); } return ""; };
const days = (at: string, now: number) => Math.max(0, Math.round((now - Date.parse(at)) / 86_400_000));
const POS: Record<string, B> = { deepen: { en: "deepen", ar: "تعميق" }, staged: { en: "staged", ar: "على مراحل" }, hedge: { en: "hedge", ar: "تحوّط" }, hold: { en: "hold", ar: "ترقّب" } };
const grade = (kind: Quality["kind"], p: Prod): Quality | null => (p ? assess(kind, p.report, p.sources, p.lang) : null);
const sevRank = (s: string) => (s === "critical" ? 0 : 1); const lvl = (s: string) => ({ high: 0, medium: 1, low: 2 })[s] ?? 1;

/** Fact ids such as F12 belong to the evidence pack of the run that wrote them, so they mean different things in different products: the consolidated brief quotes the tabs' words without them and names the tab instead. */
export const noIds = (s: string) => s.replace(/\s*[\[(]\s*F\d+(?:\s*[,–-]\s*F?\d+)*\s*[\])]/g, "").replace(/\bF\d{1,3}\b(?:\s*[,–]\s*F?\d{1,3}\b)*/g, "").replace(/\s{2,}/g, " ").replace(/\s+([.,;:])/g, "$1").trim();
function scrub(b: Bird): Bird {
  const s = (x: string) => noIds(x); const l = <T extends { text: string; sub?: string }>(xs: T[]): T[] => xs.map((x) => ({ ...x, text: s(x.text), sub: x.sub ? s(x.sub) : x.sub }));
  return { ...b, stance: { ...b.stance, rows: b.stance.rows.map((r) => ({ ...r, detail: s(r.detail) })) }, insights: l(b.insights), opportunities: l(b.opportunities), risks: l(b.risks), watch: l(b.watch), interests: b.interests.map((x) => ({ ...x, title: s(x.title), evidence: [] })), triad: b.triad.map((x) => ({ ...x, headline: s(x.headline) })), actions: b.actions.map((x) => ({ ...x, what: s(x.what) })), redFlags: b.redFlags.map((f) => ({ ...f, flag: s(f.flag), why: s(f.why), ask: s(f.ask) })) };
}
export function consolidate(i: Inputs): Bird {
  const { products: P, d } = i; const king = P.king ? parseKing(P.king.report) : null; const mofa = P.mofa ? parseMofa(P.mofa.report) : null; const m1 = P.intel ? parseMission1(P.intel.report) : null; const m2 = P.plan ? parseMission2(P.plan.report) : null;
  const qK = grade("king-council", P.king); const qM = grade("mofa-council", P.mofa); const qI = grade("emb-intel", P.intel); const qP = grade("emb-plan", P.plan);
  // ---- the stance: do the tabs that decide agree?
  const rows: Bird["stance"]["rows"] = [];
  rows.push({ label: { en: "Case File posture (free, from the data)", ar: "موقف ملف الحالة (مجاني من البيانات)" }, value: d?.posture.posture ?? null, detail: d?.posture.posture ? `${POS[d.posture.posture].en}${d.posture.value != null ? ` · value ${Math.round(d.posture.value)}` : ""}` : "not computed", from: FROM.case });
  rows.push({ label: { en: "THE KING's decision", ar: "قرار القرار النهائي" }, value: king?.decision.course ?? null, detail: king ? cut(king.decision.headline, 200) : "not run", from: FROM.king });
  rows.push({ label: { en: "The Ministry's posture", ar: "موقف الوزارة" }, value: mofa?.stance.posture ?? null, detail: mofa ? cut(mofa.stance.headline, 200) : "not run", from: FROM.mofa });
  const have = rows.map((r) => r.value).filter((v): v is Posture => !!v); const uniq = new Set(have);
  const agreement: Bird["stance"]["agreement"] = have.length < 2 ? "unknown" : uniq.size === 1 && have.length >= 3 ? "aligned" : uniq.size === 1 ? "partial" : uniq.size === have.length && have.length >= 3 ? "split" : "partial";
  const note: B = agreement === "aligned" ? { en: "All three decision readings agree on the course. Check the conditions below before acting.", ar: "القراءات الثلاث للقرار متفقة على المسار. تحقق من الشروط أدناه قبل التنفيذ." } : agreement === "partial" && uniq.size === 1 ? { en: `Only ${have.length} of the 3 decision readings are on file and they agree: the third has not been run, so this is not yet a full agreement.`, ar: `المحفوظ ${have.length} فقط من القراءات الثلاث للقرار وهي متفقة: لم تُشغَّل الثالثة فلا يُعدّ هذا اتفاقًا كاملًا.` } : agreement === "unknown" ? { en: "Fewer than two decision tabs are on file, so there is nothing to compare yet.", ar: "أقل من تبويبين للقرار محفوظان فلا شيء للمقارنة بعد." } : { en: "The tabs differ on the course. Read why before deciding: a split is a reason to look at the conditions and the red flags, not to average the answers.", ar: "تختلف التبويبات على المسار. اقرأ الأسباب قبل القرار: الانقسام سبب للنظر في الشروط والأعلام الحمراء لا لتوسيط الإجابات." };
  // ---- insights: the top lines each tab gives, ranked by how decisive they are
  const insights: Line[] = [];
  if (king) { insights.push({ text: `${king.decision.headline}`, sub: cut(king.decision.rationale, 260), from: FROM.king }); for (const j of king.judgments.filter((x) => ["high", "moderate"].includes(x.confidence)).slice(0, 3)) insights.push({ text: j.text, sub: `${j.band} · ${j.confidence} confidence`, from: FROM.king }); }
  if (mofa) insights.push({ text: mofa.stance.headline, sub: cut(mofa.stance.rationale, 240), from: FROM.mofa });
  if (P.intel) { const bl = embSection(P.intel.report, "Ambassador's Brief"); const b = /## Bottom line\s*\n([\s\S]*?)(?=\n## |$)/.exec(bl)?.[1]; if (b) insights.push({ text: cut(b, 300), from: FROM.intel }); }
  if (m2?.strategy.endState) insights.push({ text: m2.strategy.endState, sub: cut(m2.strategy.logic, 220), from: FROM.plan });
  if (P.architect) insights.push({ text: firstPara(P.architect.report), from: FROM.arch }); if (P.council) insights.push({ text: firstPara(P.council.report), from: FROM.council });
  for (const [p, f] of [[P.falcon, FROM.falcon], [P.deep, FROM.deep], [P.mach, FROM.mach]] as const) if (p) { const x = firstPara(p.report); if (x) insights.push({ text: x, from: f }); }
  // ---- interests ranked (the Ministry's priorities with progress)
  const interests = mofa ? mofa.priorities.slice(0, 6).map((p) => ({ rank: p.rank, title: p.title, interest: p.interest, progress: progressOf(mofa, i.track, p.id), evidence: p.evidence })) : [];
  // ---- opportunities and risks
  const opportunities: Bird["opportunities"] = [];
  for (const g of m1?.gaps.slice(0, 3) ?? []) opportunities.push({ kind: { en: g.kind === "trade" ? "Trade gap" : "Investment gap", ar: g.kind === "trade" ? "فجوة تجارية" : "فجوة استثمارية" }, text: g.gap, sub: g.opportunity, from: FROM.intel });
  for (const p of m1?.plays.slice(0, 2) ?? []) opportunities.push({ kind: { en: `UAE company: ${p.kind}`, ar: "شركة إماراتية" }, text: `${p.vehicle}: ${p.sector}`, sub: p.gap || p.why, from: FROM.intel });
  for (const s of m1?.sectorSupport.slice(0, 2) ?? []) opportunities.push({ kind: { en: "Sector to support", ar: "قطاع يُدعم" }, text: s.sector, sub: `${s.economic} — ${s.influence}`, from: FROM.intel });
  for (const c of m1?.inbound.slice(0, 2) ?? []) opportunities.push({ kind: { en: "Could set up in the UAE", ar: "قد تؤسس في الإمارات" }, text: `${c.company} (${c.sector})`, sub: `${c.uaeBenefit} · ${c.route}`, from: FROM.intel });
  for (const o of king?.options.filter((x) => x.course === king.decision.course).slice(0, 1) ?? []) opportunities.push({ kind: { en: "Recommended course", ar: "المسار الموصى به" }, text: o.summary, sub: o.firstMove, from: FROM.king });
  const risks: Bird["risks"] = [];
  for (const r of [...(king?.risks ?? [])].sort((a, z) => lvl(a.impact) - lvl(z.impact)).slice(0, 3)) risks.push({ text: r.name, sub: r.mitigation, level: r.impact, from: FROM.king });
  for (const r of [...(m1?.risks ?? [])].sort((a, z) => lvl(a.impact) - lvl(z.impact)).slice(0, 3)) risks.push({ text: r.name, sub: r.mitigation, level: r.impact, from: FROM.intel });
  if (king) risks.push({ text: king.decision.ifWrong, sub: "If the recommendation is wrong", level: "high", from: FROM.king });
  // ---- the auditors' red flags from every product, critical first
  const redFlags: Bird["redFlags"] = [];
  const prods: [string, Prod, From][] = [["THE KING", P.king, FROM.king], ["The Ministry", P.mofa, FROM.mofa], ["Embassy intelligence", P.intel, FROM.intel], ["Mission strategy", P.plan, FROM.plan], ["Architect", P.architect, FROM.arch], ["Strategic Council", P.council, FROM.council], ["Falcon", P.falcon, FROM.falcon], ["Deep", P.deep, FROM.deep], ["Machiavellian", P.mach, FROM.mach]];
  for (const [label, p, from] of prods) if (p) for (const r of parseReviews(p.report)) for (const f of r.redFlags) redFlags.push({ flag: f.flag, severity: f.severity, lens: r.lens, product: label, why: f.why, ask: f.ask, from });
  redFlags.sort((a, z) => sevRank(a.severity) - sevRank(z.severity));
  // ---- the security triad: what each council's expert said
  const triad: Bird["triad"] = []; const kj = (f: string) => king?.judgments.find((j) => j.field === f);
  for (const [id, label] of [["natsec", { en: "National security", ar: "الأمن الوطني" }], ["energysec", { en: "Energy security", ar: "أمن الطاقة" }], ["foodsec", { en: "Food security", ar: "الأمن الغذائي" }]] as [string, B][]) {
    const j = kj(id); if (j) triad.push({ label, headline: cut(j.text, 260), from: FROM.king });
    if (P.intel) { const name = id === "natsec" ? "National Security Assessment" : id === "energysec" ? "Energy Security Attaché" : "Food Security Attaché"; const sec = new RegExp(`^## ${name}[^\\n]*\\n([\\s\\S]*?)(?=^## |^# |$(?![\\s\\S]))`, "m").exec(P.intel.report)?.[1]; if (sec) triad.push({ label, headline: cut(headlineOf(sec), 260), from: FROM.intel }); }
    if (P.mofa) { const name = id === "natsec" ? "National Security Assessment Desk" : id === "energysec" ? "Energy Security Desk" : "Food Security Desk"; const sec = new RegExp(`^## ${name}[^\\n]*\\n([\\s\\S]*?)(?=^## |^# |$(?![\\s\\S]))`, "m").exec(P.mofa.report)?.[1]; if (sec) triad.push({ label, headline: cut(headlineOf(sec), 260), from: FROM.mofa }); }
  }
  // ---- the next moves and what to watch
  const actions: Bird["actions"] = [];
  for (const c of king?.decision.conditions.slice(0, 2) ?? []) actions.push({ when: "Before acting", what: c, owner: "Head of state's office (proposed)", from: FROM.king });
  for (const t of mofa?.mission.slice(0, 4) ?? []) actions.push({ when: t.when, what: t.task, owner: t.who, from: FROM.mofa });
  for (const c of m1?.calendar.slice(0, 3) ?? []) actions.push({ when: c.when, what: c.what, owner: c.lead, from: FROM.intel });
  const watch: Line[] = [...(king?.watch.slice(0, 3).map((w) => ({ text: w.indicator, sub: w.threshold, from: FROM.king })) ?? []), ...(mofa?.watch.slice(0, 3).map((w) => ({ text: w.indicator, sub: w.threshold, from: FROM.mofa })) ?? []), ...(m1?.watch.slice(0, 3).map((w) => ({ text: w.indicator, sub: w.threshold, from: FROM.intel })) ?? [])];
  // ---- the evidence base and how ready the decision is
  const ev = (id: string, label: B, from: From, p: Prod, q: Quality | null): Bird["evidence"][number] => { const rv = p ? parseReviews(p.report) : []; return { id, label, from, onFile: !!p, ageDays: p ? days(p.at, i.now) : null, usd: p?.usd ?? null, grade: q?.grade ?? null, verdicts: rv.map((r) => `${r.lens}: ${r.verdict}`).join("; "), flags: rv.reduce((a, r) => a + r.redFlags.length, 0) }; };
  const evidence: Bird["evidence"] = [ev("king", { en: "THE KING's Council", ar: "مجلس القرار النهائي" }, FROM.king, P.king, qK), ev("mofa", { en: "The Ministry's Council", ar: "مجلس الوزارة" }, FROM.mofa, P.mofa, qM), ev("intel", { en: "Embassy intelligence", ar: "استخبارات السفارة" }, FROM.intel, P.intel, qI), ev("plan", { en: "Mission strategy and plans", ar: "استراتيجية البعثة وخططها" }, FROM.plan, P.plan, qP), ev("arch", { en: "Statecraft Architect", ar: "مهندس فن الحكم" }, FROM.arch, P.architect, null), ev("council", { en: "Strategic Council", ar: "المجلس الاستراتيجي" }, FROM.council, P.council, null), ev("falcon", { en: "Falcon Council", ar: "مجلس الصقر" }, FROM.falcon, P.falcon, null), ev("deep", { en: "Deep Intelligence team", ar: "فريق الاستخبارات المعمّقة" }, FROM.deep, P.deep, null), ev("mach", { en: "Machiavellian council", ar: "المجلس الميكيافيلي" }, FROM.mach, P.mach, null)];
  const core = [P.king, P.mofa, P.intel, P.plan].filter(Boolean).length; const fresh = [P.king, P.mofa, P.intel, P.plan].filter((p) => p && days(p.at, i.now) <= 30).length; const graded = [qK, qM, qI, qP].filter((q): q is Quality => !!q); const crit = redFlags.filter((f) => f.severity === "critical").length;
  const checks: Bird["readiness"]["checks"] = [
    { ok: !!king, label: { en: "THE KING has decided on this country", ar: "أصدر مجلس القرار النهائي قراره في هذه الدولة" } }, { ok: !!mofa, label: { en: "The Ministry has set priorities, goals and mission tasks", ar: "وضعت الوزارة الأولويات والأهداف ومهام البعثة" } }, { ok: !!m1 && !!m2, label: { en: "The embassy has the intelligence brief and the strategy", ar: "لدى السفارة موجز الاستخبارات والاستراتيجية" } },
    { ok: core > 0 && fresh === core, label: { en: "Every decision product is under 30 days old", ar: "كل منتجات القرار أحدث من 30 يومًا" } }, { ok: graded.length > 0 && graded.every((q) => q.grade !== "D"), label: { en: "No decision product grades D on the quality check", ar: "لا منتج قرار بتقدير D في فحص الجودة" } },
    { ok: core > 0 && prods.slice(0, 4).filter(([, p]) => p).every(([, p]) => parseReviews(p!.report).length >= 2), label: { en: "Both independent auditors reviewed every decision product", ar: "راجع المدققان المستقلان كل منتجات القرار" } }, { ok: crit === 0 && core > 0, label: { en: "No critical red flag is open", ar: "لا علم أحمر حرجًا مفتوحًا" } }, { ok: agreement === "aligned", label: { en: "All three decision readings are on file and agree on the course", ar: "القراءات الثلاث للقرار محفوظة ومتفقة على المسار" } },
  ];
  const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
  // ---- the free facts the Case File holds
  const facts: Bird["facts"] = []; const add = (en: string, ar: string, v: string | null | undefined) => { if (v) facts.push({ label: { en, ar }, value: v }); };
  if (d) { add("Partnership index", "مؤشر الشراكة", d.partnership ? `${d.partnership.score} (rank ${d.partnership.rank} of ${d.partnership.n})` : null); add("National-interest scorecard", "بطاقة المصلحة الوطنية", d.scorecard ? `${Math.round(d.scorecard.overall)} (${d.scorecard.tier})` : null); add("UAE rank among partners", "ترتيب الإمارات بين الشركاء", d.uaeRank ? `${d.uaeRank.rank} of ${d.uaeRank.of} (${d.uaeRank.share.toFixed(1)}% share)` : null); add("Leverage", "النفوذ المتبادل", d.leverage?.quadrant ?? null); add("Region", "الإقليم", d.region); add("Deals in the feed", "الصفقات في التغذية", d.deals.length ? String(d.deals.length) : null); }
  const out = { iso: i.iso, name: i.name, stance: { rows, agreement, note }, insights: insights.filter((x) => x.text).slice(0, 9), interests, opportunities: opportunities.slice(0, 9), risks: risks.slice(0, 8), redFlags, triad, actions: actions.slice(0, 10), watch: watch.slice(0, 8), evidence, readiness: { score, checks }, facts };
  return scrub(out);
}
export const mofaPrioritiesText = (p: Prod) => (p ? mofaDigest(p.report, 1500) : "");
export const mofaBriefText = (p: Prod) => (p ? mofaSection(p.report, "Foreign Policy Brief") : "");
export const kingExec = (p: Prod) => (p ? kingSection(p.report, "Executive Brief") : "");

/** The bird's eye view as one markdown document (for the PDF), in the chosen language. */
export function birdMarkdown(b: Bird, lang: "en" | "ar"): string {
  const t = (x: B) => (lang === "ar" ? x.ar : x.en); const e = (en: string, ar: string) => (lang === "ar" ? ar : en); const out: string[] = [];
  out.push(`# ${e("Bird's eye view", "نظرة الطائر")}: ${b.name}`, "", `${e("Decision readiness", "جاهزية القرار")}: **${b.readiness.score}%**. ${t(b.stance.note)}`, "");
  out.push(`## ${e("The course", "المسار")}`, "", `| ${e("Source", "المصدر")} | ${e("Course", "المسار")} | ${e("Reading", "القراءة")} |`, "|---|---|---|", ...b.stance.rows.map((r) => `| ${t(r.label)} | ${r.value ? t(POS[r.value]) : "-"} | ${r.detail.replace(/\|/g, "/")} |`), "");
  if (b.redFlags.length) out.push(`## ${e("Red flags from the independent auditors", "أعلام حمراء من المدققين المستقلين")}`, "", ...b.redFlags.slice(0, 8).map((f) => `- **${f.severity === "critical" ? e("Critical", "حرج") : e("Serious", "جاد")} (${f.product}): ${f.flag}** ${f.why ? `${e("Why", "لماذا")}: ${f.why} ` : ""}${f.ask ? `${e("Before relying on it", "قبل الاعتماد عليه")}: ${f.ask}` : ""}`), "");
  const sec = (title: string, lines: string[]) => { if (lines.length) out.push(`## ${title}`, "", ...lines, ""); };
  sec(e("Top strategic insights", "أهم الرؤى الاستراتيجية"), b.insights.map((x) => `- ${x.text}${x.sub ? ` *(${x.sub})*` : ""} [${x.from.tab}]`));
  sec(e("The UAE's ranked interests here", "مصالح الإمارات هنا مرتبة"), b.interests.map((x) => `${x.rank}. **${x.title}** (${x.interest})${x.progress != null ? `: ${Math.round(x.progress * 100)}% ${e("progress", "تقدم")}` : ""}`));
  sec(e("Opportunities", "الفرص"), b.opportunities.map((x) => `- **${t(x.kind)}:** ${x.text}${x.sub ? `. ${x.sub}` : ""} [${x.from.tab}]`));
  sec(e("Risks", "المخاطر"), b.risks.map((x) => `- **${x.text}**${x.sub ? `: ${x.sub}` : ""} [${x.from.tab}]`));
  sec(e("Security triad", "الثالوث الأمني"), b.triad.map((x) => `- **${t(x.label)}:** ${x.headline} [${x.from.tab}]`));
  sec(e("Next moves", "الخطوات التالية"), b.actions.map((x) => `- **${x.when}:** ${x.what} (${x.owner}) [${x.from.tab}]`));
  sec(e("What to watch", "ما يجب رصده"), b.watch.map((x) => `- ${x.text}${x.sub ? `: ${x.sub}` : ""} [${x.from.tab}]`));
  out.push(`## ${e("Evidence base", "قاعدة الأدلة")}`, "", `| ${e("Product", "المنتج")} | ${e("On file", "محفوظ")} | ${e("Age (days)", "العمر (أيام)")} | ${e("Grade", "التقدير")} | ${e("Auditors", "المدققان")} | ${e("Red flags", "أعلام حمراء")} |`, "|---|---|---|---|---|---|", ...b.evidence.map((x) => `| ${t(x.label)} | ${x.onFile ? "✓" : "-"} | ${x.ageDays ?? "-"} | ${x.grade ?? "-"} | ${x.verdicts || "-"} | ${x.onFile ? x.flags : "-"} |`), "");
  sec(e("Readiness checks", "فحوص الجاهزية"), b.readiness.checks.map((c) => `- ${c.ok ? "✓" : "✗"} ${t(c.label)}`));
  sec(e("Free facts from the Case File", "حقائق مجانية من ملف الحالة"), b.facts.map((f) => `- **${t(f.label)}:** ${f.value}`));
  return out.join("\n");
}
