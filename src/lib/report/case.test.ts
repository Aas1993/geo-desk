// Tests for the illustrated Strategic Council and Statecraft Architect: the readers of their markdown, the visuals of their PDFs, Arabic, cut-off products and products with nothing structured.
import assert from "node:assert/strict";
import { mdSections, mdTables, boldFields, confOf, num } from "../case/mdparse";
import { courseOf, parseCouncil, recommendedScore, seatsHeard } from "../case/councilView";
import { gateRows, keyJudgments, parseArchitect, placeRisks } from "../case/architectView";
import { ILLUSTRATORS } from "./registry";
import { headOf } from "./model";
import { architectReport, councilReport, STORE } from "./fixtures-case";
import { ringGauge, heatTable } from "./html-case";
import { pdfHtml } from "../reportpdf";

// ---- the markdown readers
assert.equal(mdTables("x\n\n**A**\n\n| a | b |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |\n\ntext")[0].before, "**A**"); assert.deepEqual(mdTables("| a | b |\n|---|---|\n| 1 | 2 |\n| 3")[0].rows, [["1", "2"], ["3"]], "a table cut off mid-row gives what is there");
assert.deepEqual(mdSections("# A\nx\n## B\ny\n### C\nz", [1, 2]).map((s) => s.title), ["A", "B"]); assert.equal(boldFields("**Judgment:** one\n**Facts:** two\nmore")[1].text, "two\nmore");
assert.equal(confOf("We judge (likely, moderate confidence) that"), "moderate"); assert.equal(confOf("Low. Gaps remain."), "low"); assert.equal(confOf("Confidence: High; the rule agrees"), "high"); assert.equal(confOf("nothing stated"), null); assert.equal(confOf("نرى (مرجّح، ثقة معتدلة)"), "moderate"); assert.equal(num("**74**"), 74); assert.equal(num("n/a"), null);
assert.equal(courseOf("Selective and staged"), "staged"); assert.equal(courseOf("Hold and watch"), "hold"); assert.equal(courseOf("Deepen"), "deepen"); assert.equal(courseOf("التحوّط"), "hedge"); assert.equal(courseOf("something else"), null);

// ---- the Council
const rep = councilReport(); const v = parseCouncil(rep);
assert.ok(v.bottomLine.startsWith("We judge") && v.confidence === "moderate", "bottom line and its stated confidence"); assert.equal(v.options.length, 4); assert.equal(v.recommended?.course, "staged"); assert.equal(v.recommended?.name, "Selective and staged"); assert.equal(v.options[0].fields[0].label, "Mechanism");
assert.deepEqual(v.score!.options.map((o) => o.total), [50, 74, 60, 60]); assert.equal(v.score!.rows.length, 4, "the totals row is not a criterion"); assert.equal(recommendedScore(v), 74);
assert.deepEqual(v.seats.map((s) => s.id), ["C1", "C3", "C5", "C13", "C6", "C14"]); assert.equal(v.seats[3].confidence, null, "a seat that states no confidence is not given one"); assert.equal(v.seats[0].confidence, "moderate"); assert.equal(v.seats[2].confidence, "high"); assert.equal(v.seats[1].stance, "Proposal: option 1."); assert.equal(v.seats[0].group, "A1");
assert.deepEqual(v.claims.map((c) => c.verdict), ["partly", "supported", "unsupported", "stale"], "'unsupported' is not read as 'supported'"); assert.ok(v.assessor && v.redTeam && v.executor, "C9, C16 and C20 are found"); assert.equal(seatsHeard(v), 9);
assert.equal(v.debate.length, 2); assert.deepEqual([v.debate[0].a, v.debate[0].b], ["C1", "C3"]); assert.equal(v.roadmap.length, 2); assert.equal(v.roadmap[0].moves.length, 4); assert.equal(v.roadmap[0].moves[0].lane, "0–12 months"); assert.ok(v.roadmap[0].moves[0].fields.some((f) => f.label.startsWith("Owner")), "the other columns come with each move"); assert.ok(v.roadmap[0].title.includes("Posture A"));
assert.ok(v.chair.some((s) => s.title === "Strategic Options") && v.chair[0].title === "Ministerial Executive Brief");
const vAr = parseCouncil(councilReport("ar")); assert.equal(vAr.recommended?.course, "staged", "Arabic options are read"); assert.equal(vAr.confidence, "moderate"); assert.equal(vAr.score?.options.length, 4); assert.equal(vAr.seats[0].confidence, "moderate"); assert.deepEqual(vAr.claims.map((c) => c.verdict), ["partly", "unsupported"]); assert.equal(vAr.roadmap[0].moves.length, 2);
const none = parseCouncil("Just text, nothing structured."); assert.equal(none.options.length, 0); assert.equal(none.score, null); assert.equal(none.seats.length, 0); assert.doesNotThrow(() => parseCouncil(rep.slice(0, 5000))); assert.doesNotThrow(() => parseCouncil(rep.slice(0, rep.indexOf("| 2 | Posture"))), "cut off inside the audit table");

// ---- the Architect
const arep = architectReport(); const a = parseArchitect(arep);
assert.ok(a.bottomLine.startsWith("Adopt")); assert.equal(a.dash!.initiatives.length, 8); assert.equal(keyJudgments(arep).length, 3); assert.deepEqual(a.judgments.map((j) => j.confidence), ["moderate", "low", "high"]); assert.equal(a.interests.length, 4); assert.deepEqual(a.interests.map((i) => i.level), ["low", "medium", "high", "unknown"]);
assert.deepEqual(a.matrix.map((m) => m.id), ["diplomatic", "soft", "hard", "economic", "technology", "regional"]); assert.ok(a.matrix[0].cells.some((c) => c.label === "Identified gap")); assert.equal(a.checks.length, 12); assert.deepEqual(a.present, [1, 2, 3, 4, 5, 6]);
const gr = gateRows(a.dash!); assert.equal(gr[0].sort, "2027-04"); assert.equal(gr.length, 4, "gates from initiatives and the dashboard's own list"); const pr = placeRisks(a.dash!); assert.equal(pr.filter((x) => x.l != null).length, 3, "a risk with no likelihood is not placed");
assert.equal(parseArchitect("# Deliverable 1: x\n\nNo dashboard here.").dash, null); assert.doesNotThrow(() => parseArchitect(arep.slice(0, arep.indexOf("<dashboard>") + 400)));
const aAr = parseArchitect(architectReport("ar")); assert.equal(aAr.interests.length, 3); assert.deepEqual(aAr.interests.map((i) => i.level), ["low", "medium", "high"]); assert.equal(aAr.judgments[0].confidence, "moderate"); assert.equal(aAr.matrix[0].id, "diplomatic");

// ---- the PDFs
assert.ok(ringGauge(75, "9/12", "checks").includes("9/12") && heatTable({ head: "C", cols: [{ label: "A", color: "#000" }], rows: [{ label: "r<b>", scores: [4, null] }] }).includes("r&lt;b&gt;"));
const src = (kind: string, report: string, lang: "en" | "ar" = "en") => ({ kind, iso: "NOR", country: "Norway", report, at: "2026-10-30T10:00:00Z", usd: 0.7, lang, model: "test", sources: [{ url: "https://www.imf.org/x", title: "IMF" }] });
const head = headOf("case-council", rep, { sources: [], lang: "en" }); assert.equal(head.grade, null, "the council has no quality gate: no grade is invented");
const ic = ILLUSTRATORS["case-council"]({ kind: "case-council", report: rep, L: "en", head, country: "Norway", iso: "NOR", sources: [] })!; assert.equal(ic.title, "Selective and staged"); assert.equal(ic.confidence, "moderate"); assert.ok(ic.gaugeHtml!.includes("74/100"));
const hc = pdfHtml(src("case-council", rep));
for (const needle of ["Selective and staged", "recommended", "74/100", "National-interest scorecard", "Weighted total", "The Grand Strategist", "Stance", "confidence: moderate", "confidence not stated", "Evidence audit: the verdict on each claim", "partly supported", "Execution roadmap by horizon", "0–12 months", "Posture B: hold", "Statecraft Auditor: revise", "CRITICAL", "Figure F5 is unsourced", "So what for the UAE", "Executive Judgment", "<svg"]) assert.ok(hc.includes(needle), `the council PDF carries ${needle}`);
assert.ok(!hc.includes("statecraft_review>"), "review JSON never reaches the page");
const hcAr = pdfHtml(src("case-council", councilReport("ar"), "ar")); assert.ok(hcAr.includes('dir="rtl"') && hcAr.includes("المقاعد: الحكم والموقف والثقة") && hcAr.includes("بطاقة المصالح الوطنية") && hcAr.includes("الانتقائي على مراحل"), "the Arabic council PDF is right to left and in Arabic");
const ia = ILLUSTRATORS.architect({ kind: "architect", report: arep, L: "en", head: headOf("architect", arep), country: "Norway", iso: "NOR", sources: [] })!; assert.deepEqual(ia.skipStandard, ["milestones"]); assert.ok(ia.title!.startsWith("8 initiatives")); assert.ok(ia.gaugeHtml!.includes("/12"));
const ha = pdfHtml(src("architect", arep));
for (const needle of ["Key judgments", "J1", "Initiatives by horizon", "Short term", "Terminal financial close", "months from now", "Every initiative", "US$40m (indicative)", "Decision gates, in date order", "G3 presence decision", "Early-warning indicators", "Sanctions screening", "Major risks", "Currency shock", "Intelligence-tradecraft check", "The twelve national interests as the Architect read them", "The six pillars: baseline, gap and initiatives", "No channel", "Statecraft Auditor: revise", "<svg", "So what for the UAE"]) assert.ok(ha.includes(needle), `the Architect PDF carries ${needle}`);
assert.equal((ha.match(/Implementation plan/g) ?? []).length, 0, "the standard milestones are skipped: the Architect draws its own plan");
const haAr = pdfHtml(src("architect", architectReport("ar"), "ar")); assert.ok(haAr.includes('dir="rtl"') && haAr.includes("الأحكام الرئيسية") && haAr.includes("كل مبادرة") && haAr.includes("الركائز الست"));
const cut = arep.slice(0, arep.indexOf('"indicators"') + 30); assert.doesNotThrow(() => pdfHtml(src("architect", cut))); assert.doesNotThrow(() => pdfHtml(src("case-council", rep.slice(0, 7000))));
for (const k of ["case-council", "architect"]) { const bare = pdfHtml(src(k, "# Brief\n\nOnly prose, long enough to be a product. ".repeat(2))); assert.ok(bare.includes("<html") && bare.includes("Only prose"), `${k} with no structured data still gets a cover and its text`); }
assert.deepEqual(Object.keys(STORE), ["gd-case-council:NOR", "gd-case-architect:NOR"]);
console.log("report case: all checks passed");
