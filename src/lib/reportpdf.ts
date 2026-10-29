import { parseReviews } from "./desk/core";
import { parseMission1, parseMission2 } from "./desk/embassy";
import { parseKing } from "./desk/king";
import { classification } from "./case/report";
import { briefingHtml } from "./dossier/export";
import { buildPdf, saveBlobAs } from "./pdf";
import { getFile, getMeta, putReport, type ArchiveMeta } from "./archive";
/** The layout version of the PDFs: a stored PDF made by an older layout is made again. */
export const PDF_FORMAT = "v2-annex";

// EVERY AI PRODUCT AS A PDF REPORT: a finished product (a council's brief, a strategy, a directive's answer, a dossier) becomes a PDF with a cover block, the independent auditors' red flags first, the consolidated brief (the long role-by-role annex is left out of the PDF and stays on the platform) and the sources, and is kept in the Archive.
// The conversion is free (no model): it reads what is already saved in this browser.
export type Group = "desk" | "case" | "influence" | "deep" | "falcon" | "dossier" | "other";
export const KINDS: Record<string, { en: string; ar: string; group: Group }> = {
  "mofa-council": { en: "The Ministry's Council: foreign policy brief", ar: "مجلس الوزارة: موجز السياسة الخارجية", group: "desk" },
  "king-council": { en: "THE KING's Council: decision brief", ar: "مجلس القرار النهائي: موجز القرار", group: "desk" },
  "agent-answer": { en: "Desk agent answer", ar: "إجابة وكيل المكتب", group: "other" },
  "president-brief": { en: "The President's brief", ar: "موجز الرئيس", group: "desk" },
  "country-full": { en: "Country brief (full)", ar: "موجز الدولة الكامل", group: "desk" },
  "emb-intel": { en: "Embassy intelligence brief", ar: "موجز استخبارات السفارة", group: "desk" },
  "emb-plan": { en: "Mission strategy and plans", ar: "استراتيجية البعثة وخططها", group: "desk" },
  directive: { en: "Directive or question: answer", ar: "توجيه أو سؤال: الإجابة", group: "desk" },
  architect: { en: "Statecraft Architect: country strategy", ar: "مهندس فن الحكم: استراتيجية الدولة", group: "case" },
  "case-council": { en: "Strategic Council: decision brief", ar: "المجلس الاستراتيجي: موجز القرار", group: "case" },
  "mach-council": { en: "Machiavellian council: strategy brief", ar: "المجلس الميكيافيلي: موجز الاستراتيجية", group: "influence" },
  "mach-strategy": { en: "Country strategy (influence)", ar: "استراتيجية الدولة (النفوذ)", group: "influence" },
  "mach-scenario": { en: "Scenario studio brief", ar: "موجز استوديو السيناريوهات", group: "influence" },
  "mach-interference": { en: "External influence brief", ar: "موجز التأثير الخارجي", group: "influence" },
  "deep-council": { en: "Deep Intelligence team: decision brief", ar: "فريق الاستخبارات المعمّقة: موجز القرار", group: "deep" },
  "deep-research": { en: "Deep Intelligence: research synthesis", ar: "الاستخبارات المعمّقة: تركيب الأبحاث", group: "deep" },
  "falcon-council": { en: "Falcon Council: assessment", ar: "مجلس الصقر: التقييم", group: "falcon" },
  dossier: { en: "Country dossier", ar: "ملف الدولة", group: "dossier" },
  "dossier-lab": { en: "Strategy lab brief", ar: "موجز مختبر الاستراتيجية", group: "dossier" },
  "dossier-redteam": { en: "Red team review", ar: "مراجعة الفريق الأحمر", group: "dossier" },
  "dossier-cp": { en: "Counterpart briefing", ar: "إحاطة عن الطرف المقابل", group: "dossier" },
  "dossier-inv": { en: "Investment brief", ar: "موجز استثماري", group: "dossier" },
  "dossier-fs": { en: "Foresight product", ar: "منتج استشرافي", group: "dossier" },
  "dossier-desk": { en: "Desk briefing", ar: "إحاطة المكتب", group: "dossier" },
  research: { en: "Stock research note", ar: "مذكرة بحث عن سهم", group: "other" },
  "country-brief": { en: "Country brief", ar: "موجز الدولة", group: "other" },
  "prep-pack": { en: "Meeting prep pack", ar: "حزمة التحضير للاجتماع", group: "other" },
  "world-brief": { en: "World brief", ar: "موجز العالم", group: "other" },
  stance: { en: "Media stance", ar: "موقف الإعلام", group: "other" },
  "case-report": { en: "Case File report", ar: "تقرير ملف الحالة", group: "case" },
  bird: { en: "Bird's eye view: strategic brief", ar: "نظرة الطائر: الموجز الاستراتيجي", group: "desk" },
};
export const GROUP_LABEL: Record<Group, { en: string; ar: string }> = { desk: { en: "The desks", ar: "المكاتب" }, case: { en: "Case File", ar: "ملف الحالة" }, influence: { en: "Influence", ar: "النفوذ" }, deep: { en: "Deep Intelligence", ar: "الاستخبارات المعمّقة" }, falcon: { en: "Falcon Eye", ar: "عين الصقر" }, dossier: { en: "Dossiers", ar: "الملفات" }, other: { en: "Other briefs", ar: "موجزات أخرى" } };

/** What is needed to make one report. */
export type Source = { kind: string; iso: string; country: string; title?: string; report: string; at: string; usd: number | null; lang: "en" | "ar"; model?: string; sources?: { url: string; title?: string }[]; idPart?: string };
export const idOf = (s: Pick<Source, "kind" | "iso" | "at" | "idPart">) => `${s.kind}:${s.iso}:${s.at}${s.idPart ? `:${s.idPart}` : ""}`;
const arabic = (t: string) => (t.match(/[؀-ۿ]/g) ?? []).length > (t.match(/[A-Za-z]/g) ?? []).length;

// ---- reading what the browser holds
const FAMILIES: { re: RegExp; kind: (m: RegExpExecArray) => string; iso: (m: RegExpExecArray) => string; lang?: (m: RegExpExecArray) => "en" | "ar" | undefined }[] = [
  { re: /^gd-desk:(king-council|emb-intel|emb-plan|mofa-council|country-full|president-brief):([A-Z]{3})$/, kind: (m) => m[1], iso: (m) => m[2] },
  { re: /^gd-case-council:([A-Z]{3})$/, kind: () => "case-council", iso: (m) => m[1] },
  { re: /^gd-case-architect:([A-Z]{3})$/, kind: () => "architect", iso: (m) => m[1] },
  { re: /^gd-scouncil:([A-Z]{3})$/, kind: () => "mach-council", iso: (m) => m[1] },
  { re: /^gd-strat:([A-Z]{3}):\w+$/, kind: () => "mach-strategy", iso: (m) => m[1] },
  { re: /^gd-scen:([A-Z]{3})$/, kind: () => "mach-scenario", iso: (m) => m[1] },
  { re: /^gd-interf:([A-Z]{3})$/, kind: () => "mach-interference", iso: (m) => m[1] },
  { re: /^gd-deep-(council|research):([A-Z]{3}):\w+$/, kind: (m) => `deep-${m[1]}`, iso: (m) => m[2] },
  { re: /^gd-council:([A-Z]{3})$/, kind: () => "falcon-council", iso: (m) => m[1] },
  { re: /^gd-dossier:([A-Z]{3})$/, kind: () => "dossier", iso: (m) => m[1] },
  { re: /^gd-lab:([A-Z]{3})$/, kind: () => "dossier-lab", iso: (m) => m[1] },
  { re: /^gd-rt:([A-Z]{3})$/, kind: () => "dossier-redteam", iso: (m) => m[1] },
  { re: /^gd-cp:([A-Z]{3})$/, kind: () => "dossier-cp", iso: (m) => m[1] },
  { re: /^gd-inv:([A-Z]{3})$/, kind: () => "dossier-inv", iso: (m) => m[1] },
  { re: /^gd-fs:([A-Z]{3}):\w+$/, kind: () => "dossier-fs", iso: (m) => m[1] },
  { re: /^gd-desk:([A-Z]{3})$/, kind: () => "dossier-desk", iso: (m) => m[1] },
  { re: /^gd-research:\w+:([A-Z0-9.]+):(en|ar)$/, kind: () => "research", iso: () => "ARE", lang: (m) => m[2] as "en" | "ar" },
  { re: /^gd-brief2:([A-Z]{3}):(en|ar)$/, kind: () => "country-brief", iso: (m) => m[1], lang: (m) => m[2] as "en" | "ar" },
  { re: /^gd-prep:([A-Z]{3})/, kind: () => "prep-pack", iso: (m) => m[1] },
  { re: /^gd-world:(en|ar)$/, kind: () => "world-brief", iso: () => "WLD", lang: (m) => m[1] as "en" | "ar" },
  { re: /^gd-stance:([A-Z]{3}):(en|ar)$/, kind: () => "stance", iso: (m) => m[1], lang: (m) => m[2] as "en" | "ar" },
];
const SKIP = new Set(["facts", "usage", "model", "at", "cached", "options", "sources", "tiles", "snap", "type", "name", "gaps", "truncated", "costStopped", "manifest", "product", "agents", "roles", "seats", "state"]);
const words = (k: string) => k.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/^./, (c) => c.toUpperCase());
/** A readable markdown for a structured product (a brief or a prep pack kept as an object): headings from the keys, lists as bullets. */
export function objectToMarkdown(o: unknown, depth = 0): string {
  const out: string[] = []; const scalar = (v: unknown) => (typeof v === "string" || typeof v === "number" || typeof v === "boolean" ? String(v) : "");
  const walk = (v: unknown, level: number) => {
    if (Array.isArray(v)) { for (const x of v) { const s = scalar(x); if (s) out.push(`- ${s}`); else if (x && typeof x === "object") out.push(`- ${Object.entries(x as Record<string, unknown>).filter(([k]) => !SKIP.has(k)).map(([k, y]) => { const sy = scalar(y); return sy ? `${words(k)}: ${sy}` : ""; }).filter(Boolean).join("; ")}`); } out.push(""); return; }
    if (v && typeof v === "object") { for (const [k, y] of Object.entries(v as Record<string, unknown>)) { if (SKIP.has(k)) continue; const s = scalar(y); if (s) out.push(`**${words(k)}.** ${s}`, ""); else if (y && typeof y === "object") { out.push(`${"#".repeat(Math.min(4, level + 2))} ${words(k)}`, ""); walk(y, level + 1); } } }
  };
  walk(o, depth); return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
function toSource(key: string, raw: unknown): Source[] {
  for (const f of FAMILIES) {
    const m = f.re.exec(key); if (!m) continue; const j = raw as Record<string, unknown> | null; if (!j || typeof j !== "object") return [];
    const body = typeof j.report === "string" ? j.report : typeof j.brief === "string" ? j.brief : typeof j.text === "string" ? j.text : (j.brief && typeof j.brief === "object") ? objectToMarkdown(j.brief) : (j.prep && typeof j.prep === "object") ? objectToMarkdown(j.prep) : (j.stance && typeof j.stance === "object") ? objectToMarkdown(j.stance) : "";
    const at = typeof j.at === "string" ? j.at : ""; if (body.trim().length < 300 || !at) return [];
    const opt = (j.options ?? {}) as { lang?: string }; const lang = f.lang?.(m) ?? (opt.lang === "ar" ? "ar" : opt.lang === "en" ? "en" : arabic(body) ? "ar" : "en"); const usage = (j.usage ?? {}) as { usd?: number | null };
    return [{ kind: f.kind(m), iso: f.iso(m), country: typeof j.name === "string" && j.name ? j.name : f.iso(m), report: body, at, usd: typeof usage.usd === "number" ? usage.usd : null, lang, model: typeof j.model === "string" ? j.model : undefined, sources: Array.isArray(j.sources) ? (j.sources as { url: string; title?: string }[]).filter((s) => s && typeof s.url === "string") : undefined, title: key.startsWith("gd-research:") ? `${KINDS.research.en}: ${m[1]}` : undefined }];
  }
  const d = /^gd-desk-dir:(king|embassy|mofa):([A-Z]{3})$/.exec(key);
  if (d && Array.isArray(raw)) return (raw as Record<string, unknown>[]).filter((a) => a && typeof a.report === "string" && typeof a.at === "string" && (a.report as string).length > 300).map((a) => ({ kind: "directive", iso: d[2], country: d[2], report: a.report as string, at: a.at as string, usd: typeof a.usd === "number" ? a.usd : null, lang: a.lang === "ar" ? "ar" : "en", idPart: `${d[1]}-${String(a.id ?? "")}`, title: `${KINDS.directive.en} (${d[1] === "king" ? "THE KING" : d[1] === "embassy" ? "Embassy" : "Ministry"}): ${String(a.topic ?? "").slice(0, 90) || String(a.mode ?? "")}` }));
  return [];
}
/** Every product this browser holds, as sources for reports (a country's name is taken from the product itself when it carries one). */
export function readAllSources(): Source[] {
  const out: Source[] = [];
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i)!; if (!k.startsWith("gd-")) continue; if (!FAMILIES.some((f) => f.re.test(k)) && !k.startsWith("gd-desk-dir:")) continue; let raw: unknown; try { raw = JSON.parse(localStorage.getItem(k) ?? "null"); } catch { continue; } out.push(...toSource(k, raw)); } } catch { /* storage blocked */ }
  return out;
}
export function readSourceByKey(key: string): Source[] { try { return toSource(key, JSON.parse(localStorage.getItem(key) ?? "null")); } catch { return []; } }

// ---- the document
const ANNEX = ["Role Reports", "Country Team Reports", "Specialist Annex", "Desk Lines of Effort", "Appendix: Agent Reports", "Structured data", "Specialist Findings", "Role Findings", "Desk Findings"];
/** Drops the long role-by-role annex (it stays on the platform) so the PDF is the consolidated brief. */
export function dropAnnex(md: string): string {
  const lines = md.split("\n"); const keep: string[] = []; let skipping = false;
  for (const l of lines) { const h = /^# (.*)$/.exec(l); if (h) skipping = ANNEX.some((a) => h[1].trim().startsWith(a)); if (!skipping) keep.push(l); }
  return keep.join("\n").replace(/\n{3,}/g, "\n\n");
}
const e = (en: string, ar: string, lang: "en" | "ar") => (lang === "ar" ? ar : en);

// ---- the structured annex: the tables that live only in a product's structured data (the power map, the companies, the gaps, the plans) are part of the PDF
const cell = (v: unknown) => String(v ?? "").replace(/\|/g, "/").replace(/\s+/g, " ").trim() || "-";
const tbl = (head: string[], rows: unknown[][]) => (rows.length ? `| ${head.join(" | ")} |\n|${head.map(() => "---").join("|")}|\n${rows.map((r) => `| ${r.map(cell).join(" | ")} |`).join("\n")}` : "");
/** The structured data of a desk product as markdown tables, in the product's language. Empty when the product has none. */
export function structuredMarkdown(kind: string, report: string, L: "en" | "ar"): string {
  const sec = (title: string, body: string) => (body ? `## ${title}\n\n${body}` : ""); const parts: string[] = [];
  if (kind === "emb-intel") {
    const m = parseMission1(report); if (!m) return "";
    parts.push(sec(e("Trade and investment gaps", "فجوات التجارة والاستثمار", L), tbl([e("Kind", "النوع", L), e("Sector", "القطاع", L), e("Gap", "الفجوة", L), e("Evidence", "الدليل", L), e("Size", "الحجم", L), e("What the UAE can do", "ما تستطيع الإمارات فعله", L)], m.gaps.map((g) => [g.kind, g.sector, g.gap, g.evidence, g.size, g.opportunity]))));
    parts.push(sec(e("UAE companies that can expand here", "الشركات الإماراتية التي يمكنها التوسع", L), tbl([e("Company or vehicle", "الشركة أو الجهة", L), e("Move", "الخطوة", L), e("Sector", "القطاع", L), e("Gap it fills", "الفجوة التي تسدّها", L), e("Counterpart", "النظير", L), e("Structure", "الهيكل", L), e("Window", "النافذة", L)], m.plays.map((p) => [p.vehicle, p.kind, p.sector, p.gap || p.why, p.partner, p.structure, p.window]))));
    parts.push(sec(e("Sectors the UAE can support", "القطاعات التي تستطيع الإمارات دعمها", L), tbl([e("Sector", "القطاع", L), e("Economic", "اقتصاديًا", L), e("Influence", "النفوذ", L), e("Instruments", "الأدوات", L), e("Risk", "الخطر", L)], m.sectorSupport.map((s) => [s.sector, s.economic, s.influence, s.instruments, s.risk]))));
    parts.push(sec(e("Companies that could set up in the UAE", "شركات يمكنها التأسيس في الإمارات", L), tbl([e("Company", "الشركة", L), e("Sector", "القطاع", L), e("Why the UAE gains", "لماذا تكسب الإمارات", L), e("Route", "المسار", L), e("Due diligence", "العناية الواجبة", L)], m.inbound.map((c) => [c.company, c.sector, c.why, c.route, c.dueDiligence.join("; ")]))));
    parts.push(sec(e("SME promotion programme", "برنامج تشجيع المنشآت الصغيرة والمتوسطة", L), tbl([e("Direction", "الاتجاه", L), e("Segment", "الشريحة", L), e("Idea", "الفكرة", L), e("Channel", "القناة", L), e("Measure", "المقياس", L)], m.sme.map((x) => [x.direction, x.segment, x.idea, x.channel, x.measure]))));
    parts.push(sec(e("Private-sector companies to engage", "شركات القطاع الخاص المستهدفة", L), tbl([e("Company", "الشركة", L), e("Sector", "القطاع", L), e("UAE counterpart", "النظير الإماراتي", L), e("Win-win", "المكسب المشترك", L), e("Due diligence", "العناية الواجبة", L)], m.partners.map((p) => [p.name, p.sector, p.uaeCounterpart, p.winwin, p.dueDiligence.join("; ")]))));
    parts.push(sec(e("Who holds power", "من يملك القوة", L), tbl([e("Who", "من", L), e("Group", "المجموعة", L), e("Level", "المستوى", L), e("Why they matter", "لماذا يهمون", L), e("How to engage", "كيف نتعامل", L)], m.power.map((p) => [p.who, p.group, p.level, p.why, p.approach]))));
    parts.push(sec(e("Scenarios and risks", "السيناريوهات والمخاطر", L), `${tbl([e("Scenario", "السيناريو", L), e("Trigger", "المحفّز", L), e("Response", "الاستجابة", L), e("Indicator", "المؤشر", L)], m.scenarios.map((s) => [s.name, s.trigger, s.response, s.indicator]))}\n\n${tbl([e("Risk", "الخطر", L), e("Impact", "الأثر", L), e("Trigger", "المحفّز", L), e("Mitigation", "المعالجة", L)], m.risks.map((r) => [r.name, r.impact, r.trigger, r.mitigation]))}`.trim()));
    parts.push(sec(e("Next 90 days", "التسعون يومًا القادمة", L), tbl([e("When", "متى", L), e("What", "ماذا", L), e("Why", "لماذا", L), e("Lead", "المسؤول", L)], m.calendar.map((c) => [c.when, c.what, c.why, c.lead]))));
  } else if (kind === "emb-plan") {
    const m = parseMission2(report); if (!m) return "";
    parts.push(sec(e("Objectives", "الأهداف", L), tbl(["ID", e("Objective", "الهدف", L), e("Why", "لماذا", L), e("Measures", "المقاييس", L)], m.strategy.objectives.map((o) => [o.id, o.title, o.why, o.measures.join("; ")]))));
    for (const [h, xs] of [[e("First 100 days", "أول 100 يوم", L), m.plans.d100], [e("First year", "السنة الأولى", L), m.plans.y1], [e("Three years", "ثلاث سنوات", L), m.plans.y3]] as const) parts.push(sec(h, tbl(["ID", e("Initiative", "المبادرة", L), e("Desk", "المكتب", L), e("Owner", "المسؤول", L), "KPI", e("Gate", "البوابة", L), e("Due diligence", "العناية الواجبة", L)], xs.map((i) => [i.id, i.title, i.desk, i.owner, i.kpi, i.gate, i.dueDiligence.join("; ")]))));
    parts.push(sec(e("Decision gates", "بوابات القرار", L), tbl([e("Gate", "البوابة", L), e("When", "متى", L), e("Question", "السؤال", L), e("If no", "إن كانت لا", L)], m.gates.map((g) => [g.id, g.when, g.question, g.ifNo]))));
    parts.push(sec(e("Due-diligence register", "سجل العناية الواجبة", L), tbl([e("Subject", "الموضوع", L), e("Kind", "النوع", L), e("Checks", "الفحوص", L)], m.dueDiligence.map((x) => [x.subject, x.kind, x.checks.join("; ")]))));
  } else if (kind === "king-council") {
    const k = parseKing(report); if (!k) return "";
    parts.push(sec(e("The four courses", "المسارات الأربعة", L), tbl([e("Course", "المسار", L), e("Summary", "الملخص", L), e("Requires", "يتطلب", L), e("Reversibility", "قابلية العكس", L), e("First move", "أول خطوة", L)], k.options.map((o) => [o.course, o.summary, o.requires.join("; "), o.reversibility, o.firstMove]))));
    parts.push(sec(e("Key judgments", "الأحكام الرئيسية", L), tbl(["ID", e("Field", "الميدان", L), e("Judgment", "الحكم", L), e("Likelihood", "الاحتمال", L), e("Confidence", "الثقة", L), e("Evidence", "الدليل", L)], k.judgments.map((j) => [j.id, j.field, j.text, j.band, j.confidence, j.evidence.join(", ")]))));
    parts.push(sec(e("Risks and indicators", "المخاطر والمؤشرات", L), `${tbl([e("Risk", "الخطر", L), e("Impact", "الأثر", L), e("Trigger", "المحفّز", L), e("Mitigation", "المعالجة", L)], k.risks.map((r) => [r.name, r.impact, r.trigger, r.mitigation]))}\n\n${tbl([e("Indicator", "المؤشر", L), e("Threshold", "العتبة", L), e("Source", "المصدر", L)], k.watch.map((w) => [w.indicator, w.threshold, w.source]))}`.trim()));
  }
  const body = parts.filter(Boolean).join("\n\n"); return body ? `# ${e("Structured annex", "الملحق المنظم", L)}\n\n${body}` : "";
}

/** The cover block, the red flags, the brief and the sources, in the product's own language. */
export function pdfMarkdown(s: Source): string {
  const L = s.lang; const k = KINDS[s.kind]; const rv = parseReviews(s.report); const flags = rv.flatMap((r) => r.redFlags.map((f) => ({ ...f, by: r.lens })));
  const cover = [`| ${e("Detail", "البند", L)} | ${e("Value", "القيمة", L)} |`, "|---|---|", `| ${e("Country", "الدولة", L)} | ${s.country} |`, `| ${e("Product", "المنتج", L)} | ${s.title ?? (k ? (L === "ar" ? k.ar : k.en) : s.kind)} |`, `| ${e("Prepared", "أُعد في", L)} | ${s.at.slice(0, 16).replace("T", " ")} UTC |`, `| ${e("Model and cost", "النموذج والكلفة", L)} | ${s.model ?? "-"}${s.usd != null ? ` · US$${s.usd.toFixed(2)}` : ""} |`, `| ${e("Independent auditors", "المدققان المستقلان", L)} | ${rv.length ? rv.map((r) => `${r.lens === "statecraft" ? e("Statecraft", "فن الحكم", L) : r.lens === "reality" ? e("Reality", "الواقع", L) : e("Reviewer", "مراجع", L)}: ${r.verdict}${r.standing ? ` (${r.standing})` : ""}`).join("; ") : e("not reviewed", "لم يُراجع", L)} |`].join("\n");
  const fl = flags.length ? `\n\n## ${e("Red flags raised by the independent auditors", "أعلام حمراء رفعها المدققون المستقلون", L)}\n\n${flags.map((f) => `- **${f.severity === "critical" ? e("Critical", "حرج", L) : e("Serious", "جاد", L)}: ${f.flag}** ${f.why ? `${e("Why it matters", "لماذا يهم", L)}: ${f.why} ` : ""}${f.ask ? `${e("Before relying on it", "قبل الاعتماد عليه", L)}: ${f.ask}` : ""}`).join("\n")}` : "";
  const src = (s.sources ?? []).slice(0, 50); const refs = src.length ? `\n\n# ${e("Sources", "المصادر", L)}\n\n${src.map((x, i) => `${i + 1}. [${(x.title || x.url).replace(/[\[\]]/g, "").slice(0, 110)}](${x.url})`).join("\n")}` : "";
  const st = structuredMarkdown(s.kind, s.report, L);
  return `${cover}${fl}\n\n${dropAnnex(s.report)}${st ? `\n\n${st}` : ""}${refs}`;
}
export const pdfHtml = (s: Source): string => briefingHtml(pdfMarkdown(s), { title: s.title ?? `${KINDS[s.kind] ? (s.lang === "ar" ? KINDS[s.kind].ar : KINDS[s.kind].en) : s.kind}: ${s.country}`, rtl: s.lang === "ar", foot: `${s.model ?? "Geo Desk"} · ${s.at}`, classification: classification(s.lang) });
export const pdfName = (s: Source) => `${s.kind}-${s.iso}-${s.at.slice(0, 10)}.pdf`;
const metaOf = (s: Source, pages: number | null): Omit<ArchiveMeta, "size" | "savedAt"> => ({ id: idOf(s), iso: s.iso, country: s.country, kind: s.kind, title: s.title ?? `${KINDS[s.kind] ? (s.lang === "ar" ? KINDS[s.kind].ar : KINDS[s.kind].en) : s.kind}: ${s.country}`, lang: s.lang, at: s.at, usd: s.usd, pages, note: PDF_FORMAT });

/** Makes the PDF, keeps it in the Archive and returns it. An existing archive copy of the same report is reused. */
export async function archiveReport(s: Source, o: { onProgress?: (d: number, t: number) => void; force?: boolean } = {}): Promise<Blob> {
  const id = idOf(s); if (!o.force && (await getMeta(id))?.note === PDF_FORMAT) { const f = await getFile(id); if (f) return f; }
  const blob = await buildPdf(pdfHtml(s), { onProgress: o.onProgress }); await putReport(metaOf(s, null), blob); return blob;
}
/** The button's action: archive and download. */
export async function downloadReport(s: Source, o: { onProgress?: (d: number, t: number) => void } = {}): Promise<void> { saveBlobAs(await archiveReport(s, o), pdfName(s)); }

/** For a document that is assembled on screen rather than saved as a product (a Case File report, the bird's eye view): the finished HTML becomes a PDF, is kept in the Archive and downloaded. */
export async function downloadHtmlReport(html: string, meta: Omit<ArchiveMeta, "size" | "savedAt" | "pages">, filename: string, onProgress?: (d: number, t: number) => void, archiveOnly = false): Promise<void> {
  const blob = await buildPdf(html, { onProgress }); await putReport({ ...meta, pages: null, note: PDF_FORMAT }, blob); if (!archiveOnly) saveBlobAs(blob, filename);
}
