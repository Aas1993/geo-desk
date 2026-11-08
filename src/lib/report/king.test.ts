// Tests for the shared report head, the scales that read a risk's own words, and THE KING's illustrated PDF.
import assert from "node:assert/strict";
import { headOf, likelihoodBand, likelihoodRank, impactRank, worstVerdict, groupBy, cutText } from "./model";
import { ILLUSTRATORS } from "./registry";
import { esc, matrixSvg, ganttSvg, gauge, chipRow, flagBlocks, tag } from "./html";
import { kingReport } from "./fixtures";
import { pdfHtml } from "../reportpdf";

// ---- the words a risk uses place it on the scale only when they say where
assert.equal(likelihoodRank("almost certain"), 5); assert.equal(likelihoodRank("very likely (80-95%)"), 5); assert.equal(likelihoodRank("likely (55-70%)"), 4); assert.equal(likelihoodRank("roughly even chance"), 3); assert.equal(likelihoodRank("unlikely"), 2); assert.equal(likelihoodRank("very unlikely"), 1);
assert.equal(likelihoodRank("20-45%"), 3, "a percentage range is read by its middle"); assert.equal(likelihoodRank("5%"), 1); assert.equal(likelihoodRank(""), null); assert.equal(likelihoodRank("see annex"), null, "words the scale cannot read are not placed");
assert.equal(likelihoodBand(null), null); assert.equal(likelihoodBand(2), 0); assert.equal(likelihoodBand(3), 1); assert.equal(likelihoodBand(5), 2); assert.equal(impactRank("high"), 3); assert.equal(impactRank("low"), 1);
assert.deepEqual(groupBy([1, 2, 3, 4], (x) => (x % 2 ? "o" : "e")).map((g) => g.items), [[1, 3], [2, 4]]); assert.ok(cutText("one two three four five six", 12).endsWith("…")); assert.equal(cutText("short", 12), "short");

// ---- the head of a saved product
const report = kingReport(); const head = headOf("king-council", report, { sources: [{ url: "https://www.imf.org/x" }], lang: "en", confidence: "moderate", bottomLine: " Staged. " });
assert.equal(head.verdicts.length, 2, "both auditors' verdicts"); assert.equal(head.critical, 1); assert.equal(head.serious, 0); assert.equal(head.flags[0].who.en, "Statecraft Auditor"); assert.equal(head.bottomLine, "Staged."); assert.ok(head.grade && head.score != null, "a king product has a quality grade"); assert.equal(worstVerdict(head.verdicts), "revise");
const none = headOf("case-council", "no reviews here"); assert.equal(none.grade, null, "a product with no quality gate has no grade, never an invented one"); assert.equal(none.verdicts.length, 0); assert.equal(worstVerdict(none.verdicts), null);

// ---- the PDF kit escapes, and its pills carry an explicit height for html2canvas
assert.ok(esc("<b>&\"'") === "&lt;b&gt;&amp;&quot;&#39;"); assert.ok(tag("x", "#000").includes("class=\"tag\"")); assert.ok(gauge(150, "q").includes("stroke-dasharray") && gauge(-5, "q").includes(">0<"), "a gauge is clamped to 0-100");
assert.ok(chipRow(head, "en").includes("Statecraft Auditor: revise") && chipRow(headOf("x", ""), "ar").includes("لم يُراجع")); assert.equal(flagBlocks(head, "en").length, 2); assert.equal(flagBlocks(none, "en").length, 0);
assert.ok(matrixSvg([{ n: 1, l: 2, i: 3 }], "en").includes("<svg") && ganttSvg([{ label: "A", start: 0, end: 12, color: "#000" }], { months: 24, L: "en" }).includes("<rect"));

// ---- THE KING's PDF
const src = { kind: "king-council", iso: "NOR", country: "Norway", report, at: "2026-10-30T10:00:00Z", usd: 0.6, lang: "en" as const, model: "test", sources: [{ url: "https://www.imf.org/x", title: "IMF" }] };
const ill = ILLUSTRATORS["king-council"]({ kind: "king-council", report, L: "en", head, country: "Norway", iso: "NOR", sources: src.sources })!; assert.ok(ill.title === "Selective and staged" || /staged/i.test(ill.title ?? ""), "the call is the course"); assert.equal(ill.confidence, "moderate");
const html = pdfHtml(src);
for (const needle of ["The four courses", "recommended", "Key judgments", "J2", "Currency shock", "Reserve cover", "Port concession in a neighbour", "Lesson: Gate the tranches", "Terms of the rail concession", "Statecraft Auditor: revise", "Figure F5 is unsourced", "CRITICAL", "<svg", "Likelihood", "Executive Brief"]) assert.ok(html.includes(needle), `the PDF carries ${needle}`);
assert.ok(!html.includes("<king>") && !html.includes("statecraft_review>"), "the machine-readable blocks never reach the page");
const ar = pdfHtml({ ...src, lang: "ar" }); assert.ok(ar.includes('dir="rtl"') && ar.includes("المسارات الأربعة") && ar.includes("الأحكام الرئيسية"), "the Arabic PDF is right to left and in Arabic");
// a product cut off at the model's limit still draws what it has and does not invent the rest
const cut = report.replace(/"risks":\[[\s\S]*?\],"watch"/, '"watch"').replace(/"judgments":\[[\s\S]*?\],"risks"/, '"risks"'); assert.doesNotThrow(() => pdfHtml({ ...src, report: cut }));
const nostruct = pdfHtml({ ...src, report: "# Executive Brief\n\nOnly prose, long enough.\n" }); assert.ok(nostruct.includes("<html") && nostruct.includes("Only prose"), "a product with no structured data still gets a cover and its text");
console.log("report king: all checks passed");
