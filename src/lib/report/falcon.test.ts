// Tests for THE FALCON COUNCIL's illustrated PDF: every parsed field of the assessment reaches the page, the cover has no invented grade, Arabic is right to left, and a product cut off at the model's limit does not throw.
import assert from "node:assert/strict";
import { parseCouncil } from "../falcon/council-parse";
import { headOf } from "./model";
import { ILLUSTRATORS } from "./registry";
import { likelihoodMapSvg, mdText, dataTable } from "./html-fm";
import { falconReport } from "./fixtures-falcon";
import { pdfHtml } from "../reportpdf";

const report = falconReport(); const p = parseCouncil(report);
// ---- the parser reads what the fixture holds
assert.equal(p.judgments.length, 7); assert.deepEqual(p.judgments.map((j) => j.status).slice(0, 5), ["survived", "softened", "untested", "survived", "reversed"]); assert.equal(p.disagreements.length, 2); assert.equal(p.items.length, 5); assert.equal(p.options.length, 3);
assert.equal(p.audit.length, 6); assert.equal(p.challenges.length, 3); assert.deepEqual(p.scenarios.map((s) => s.weight), [50, 20, 30, null]); assert.equal(p.scenarios[3].wildcard, true); assert.equal(p.signposts.length, 4);
// ---- helpers
assert.equal(mdText("**Bold** [link](https://x.org/a) `c` [F3]"), "Bold link c [F3]"); assert.ok(dataTable(["A"], [["<b>x</b>"]]).includes("&lt;b&gt;"), "cells are escaped"); assert.equal(dataTable(["A"], []), "");
assert.ok(likelihoodMapSvg([{ n: 1, pct: 70, conf: "high", color: "#000" }, { n: 2, pct: null, conf: "low", color: "#000" }], "en").includes("<circle"), "a placed judgment is a dot"); assert.equal((likelihoodMapSvg([{ n: 2, pct: null, conf: "low", color: "#000" }], "en").match(/<circle/g) ?? []).length, 0, "a judgment without a likelihood is not drawn");
// ---- the illustrator
const head = headOf("falcon-council", report, { lang: "en" }); assert.equal(head.grade, null, "a Falcon Council has no quality grade");
const ill = ILLUSTRATORS["falcon-council"]({ kind: "falcon-council", report, L: "en", head, country: "Norway", iso: "NOR", sources: [] })!; assert.ok(ill && ill.bottomLine?.includes("compliance-screened") && ill.front!.length > 3 && ill.annex!.length > 8);
const src = { kind: "falcon-council", iso: "NOR", country: "Norway", report, at: "2026-10-30T10:00:00Z", usd: 0.7, lang: "en" as const, model: "test", sources: [{ url: "https://www.imf.org/x", title: "IMF" }] };
const html = pdfHtml(src);
for (const needle of ["Key judgments and the red team", "Survived the red team", "Softened", "Reversed", "Untested", "Likelihood against confidence", "Sanctions and provenance contagion", "Preserved disagreements", "Position A", "A logistics-and-convening", "UAE customs data by HS code", "Opportunities", "Exposures and risks", "Provenance-audited minerals stakes", "Options for decision", "Staged footprint behind a provenance gate", "Scenarios and signposts", "S2 Corridor and minerals partner", "20%", "Wildcard", "Signposts", "Red-team challenges", "Reversed: roughly even", "Verifier: claim audit", "Heads of terms only, not a concession", "Unverifiable", "Stale", "Automated quality gates", "Verification summary", "Unresolved", "Statecraft Auditor: revise", "CRITICAL", "<svg", "Council Assessment"]) assert.ok(html.includes(needle), `the PDF carries ${needle}`);
assert.ok(!html.includes("Agent Reports") && !html.includes("<statecraft_review>"), "the agent appendix and the review blocks stay out of the PDF");
assert.ok(!/quality score/.test(html) && !/class="gr"/.test(html), "no quality grade is drawn for a Falcon Council");
assert.ok(html.includes("So what for the UAE") && html.includes("The fourteen angles"), "the standard parts reach the Falcon PDF from the product's own JSON");
// ---- Arabic: right to left, the chrome in Arabic
const ar = pdfHtml({ ...src, lang: "ar" }); assert.ok(ar.includes('dir="rtl"') && ar.includes("الأحكام الرئيسية والفريق الأحمر") && ar.includes("تدقيق الادعاءات") && ar.includes("صمد أمام الفريق الأحمر") && ar.includes("خلافات محفوظة"), "the Arabic PDF is right to left and in Arabic");
// ---- cut off at the limit, no structure at all
const cut = report.slice(0, report.indexOf("## Where the Council Agrees") + 80); assert.doesNotThrow(() => pdfHtml({ ...src, report: cut })); assert.ok(pdfHtml({ ...src, report: cut }).includes("Key judgments and the red team"), "what exists is still drawn");
const mid = report.slice(0, report.indexOf("| 4 |") + 40); assert.doesNotThrow(() => pdfHtml({ ...src, report: mid }));
const none = pdfHtml({ ...src, report: "# Council Assessment: X\n\nOnly prose, long enough to be a document.\n" }); assert.ok(none.includes("<html") && none.includes("Only prose"), "a product with no structured data still gets a cover and its text");
console.log("report falcon: all checks passed");
