// Tests for the Deep Intelligence reader (src/lib/report/deepmd.ts) and its two illustrated PDFs.
import assert from "node:assert/strict";
import { changeOf, labelled, levelOf, parseCouncil, plain, sectionsOf, tablesOf, verdictOf } from "./deepmd";
import { headOf } from "./model";
import { ILLUSTRATORS } from "./registry";
import { deepCouncilAr, deepCouncilEn, deepResearchEn, directiveAr, directiveEn } from "./fixtures-deep";
import { parseDirective } from "../desk/core";
import { pdfHtml } from "../reportpdf";

// ---- the small readers
assert.equal(levelOf("Low to medium. Few cards"), "low"); assert.equal(levelOf("Medium for sequencing, low for any outcome."), "medium"); assert.equal(levelOf("Not established"), null); assert.equal(levelOf("High"), "high"); assert.equal(levelOf("مرتفعة. بيانات"), "high"); assert.equal(levelOf("متوسطة إلى منخفضة"), "medium"); assert.equal(levelOf("منخفضة"), "low");
assert.equal(verdictOf("Unsupported / stale"), "unsupported"); assert.equal(verdictOf("Partly supported"), "partly"); assert.equal(verdictOf("Supported"), "supported"); assert.equal(verdictOf("Stale"), "stale"); assert.equal(verdictOf("غير مدعوم"), "unsupported"); assert.equal(verdictOf("مدعوم جزئيًا"), "partly"); assert.equal(verdictOf("مدعوم"), "supported"); assert.equal(verdictOf("???"), "other");
assert.equal(changeOf("Partly. Option A widens."), "partly"); assert.equal(changeOf("No. It supports"), "no"); assert.equal(changeOf("Yes. B is gated"), "yes"); assert.equal(changeOf("جزئيًا. يتسع"), "partly"); assert.equal(changeOf("لا. يدعم"), "no"); assert.equal(changeOf("see text"), "unknown");
assert.equal(plain("A [MoFA item](https://x.org/a) **bold** [F1]"), "A MoFA item bold [F1]");
assert.deepEqual(labelled("**Decision (Proposal):** Do it.\nplain line\n**Main trade-off:** Cost."), [{ label: "Decision (Proposal)", text: "Do it." }, { label: "Main trade-off", text: "Cost." }]);
assert.equal(tablesOf("x\n\n| a | b |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |\n\ny").length, 1); assert.equal(sectionsOf("# A\ntext\n## B\nmore").length, 2);

// ---- the analyst team's report in English
const en = deepCouncilEn(); const p = parseCouncil(en);
assert.equal(p.mode, "full"); assert.equal(p.partial, false); assert.equal(p.decision.length, 3, "decision, trade-off, next trigger"); assert.ok(p.decision[0].text.startsWith("TEST FIXTURE")); assert.equal(p.options.length, 4); assert.equal(p.options[0].feas, "high"); assert.equal(p.options[1].feas, "medium", "'Medium to low' is read by its first word"); assert.equal(p.options[3].feas, null, "'Not established' is not a level"); assert.equal(p.follow.length, 3); assert.equal(p.follow[1].title, "Counterparty screening");
assert.equal(p.challenge.length, 3); assert.deepEqual(p.challenge.map((c) => c.changes), ["partly", "no", "yes"]); assert.equal(p.claims.length, 5); assert.deepEqual(p.claims.map((c) => c.verdict), ["unsupported", "supported", "supported", "partly", "stale"]); assert.ok(p.wrong.startsWith("A signed rival")); assert.equal(p.criticalErrors, "None beyond claim 1.");
assert.equal(p.analysts.length, 3); assert.deepEqual(p.analysts.map((a) => a.level), ["low", "medium", "high"]); assert.equal(p.analysts[0].conclusion, "Stage the commitment behind a validation step."); assert.equal(p.deskInputs.length, 1, "the analysts' desk inputs"); assert.ok(p.deskInputs[0].startsWith("the agreement list"));
// ---- in Arabic the same parts are found
const pa = parseCouncil(deepCouncilAr()); assert.equal(pa.options.length, 3); assert.equal(pa.options[0].feas, "high"); assert.equal(pa.options[1].feas, "medium"); assert.equal(pa.claims.length, 3); assert.deepEqual(pa.claims.map((c) => c.verdict), ["unsupported", "supported", "partly"]); assert.equal(pa.challenge.length, 2); assert.deepEqual(pa.challenge.map((c) => c.changes), ["partly", "no"]); assert.equal(pa.follow.length, 2); assert.equal(pa.analysts.length, 1); assert.equal(pa.analysts[0].level, "high", "the nine labelled lines are read by position when the labels are in Arabic"); assert.equal(pa.decision.length, 3);
// ---- a team cut off before the chair finished, and a report with nothing to read
const cutRep = en.slice(0, en.indexOf("## Perspectives")); const pc = parseCouncil(cutRep); assert.equal(pc.partial, true); assert.equal(pc.options.length, 0); assert.doesNotThrow(() => parseCouncil("")); assert.doesNotThrow(() => parseCouncil(en.slice(0, 900)));

// ---- the PDFs
const src = { kind: "deep-council", iso: "FIN", country: "Finland", report: en, at: "2026-10-30T10:00:00Z", usd: 0.5, lang: "en" as const, model: "test", sources: [{ url: "https://www.imf.org/x", title: "IMF" }] };
const ill = ILLUSTRATORS["deep-council"]({ kind: "deep-council", report: en, L: "en", head: headOf("deep-council", en), country: "Finland", iso: "FIN", sources: src.sources })!; assert.ok(ill && ill.front!.length > 3 && ill.annex!.length > 3, "the council draws its dashboard and its annex");
const html = pdfHtml(src);
for (const needle of ["The options and how feasible each is", "A: trace trade and counterparties", "Medium to low", "Not established", "Follow-through: what to watch and who owns it", "Counterparty screening", "Set at 3 months", "The verifier&#39;s claim audit", "Unsupported / stale", "The independent challenger&#39;s objections", "Strongest objection", "What would make the whole package wrong", "The analysts and how confident each is", "Research synthesis analyst", "What only the desk can supply", "the agreement list", "Statecraft Auditor: revise", "CRITICAL", "Decision Summary", "Claim Audit"]) assert.ok(html.includes(needle), `the council PDF carries ${needle}`);
assert.ok(!html.includes("statecraft_review>"), "the machine-readable review never reaches the page");
assert.ok(!html.includes("&lt;deep&gt;") && !html.includes("<deep>"), "the machine-readable standard block never reaches the page"); for (const needle of ["Slow gated progress", "Ports and logistics", "Request HS-level data"]) assert.ok(html.includes(needle), `the standard parts reach the council PDF: ${needle}`); assert.ok(parseCouncil(en).criticalErrors === "None beyond claim 1.", "the JSON block does not leak into the last section");
const ar = pdfHtml({ ...src, report: deepCouncilAr(), lang: "ar" }); for (const needle of ['dir="rtl"', "الخيارات ومدى جدوى كل منها", "أ: تتبّع التجارة والأطراف", "تدقيق المدقق للادعاءات", "اعتراضات المُحاجِج المستقل", "المحللون ودرجة ثقة كل منهم"]) assert.ok(ar.includes(needle), `the Arabic PDF carries ${needle}`);
assert.doesNotThrow(() => pdfHtml({ ...src, report: cutRep })); assert.doesNotThrow(() => pdfHtml({ ...src, report: "# Decision assessment\n\nOnly prose, long enough to be a report.\n" })); assert.ok(pdfHtml({ ...src, report: "# Decision assessment\n\nOnly prose, long enough to be a report.\n" }).includes("Only prose"), "no structured parts: still a cover and the text");
const hostile = en.replace("A: trace trade", "<script>alert(1)</script> A: trace trade"); assert.ok(!pdfHtml({ ...src, report: hostile }).includes("<script>alert"), "report text is escaped");

// ---- the research synthesis
const rs = deepResearchEn(); const pr = parseCouncil(rs); assert.equal(pr.mode, "research"); assert.equal(pr.options.length, 0); assert.equal(pr.claims.length, 3); assert.equal(pr.analysts.length, 2);
const rh = pdfHtml({ ...src, kind: "deep-research", report: rs }); for (const needle of ["Deep Intelligence: research synthesis", "The verifier&#39;s claim audit", "It is based in Oslo", "The analysts and how confident each is", "Research synthesis analyst"]) assert.ok(rh.includes(needle), `the research PDF carries ${needle}`);
assert.doesNotThrow(() => pdfHtml({ ...src, kind: "deep-research", report: rs.slice(0, 700) }));

// ---- the directive answer
const dsrc = { kind: "directive", iso: "FIN", country: "Finland", report: directiveEn(), at: "2026-10-30T10:10:00Z", usd: 0.3, lang: "en" as const, model: "test", sources: [] };
const dh = pdfHtml(dsrc);
for (const needle of ["Monitor and measure (recommended)", "Cheap and reversible", "Some lost deal flow", "Exposure is larger than assumed", "Reputational damage", "Cuts across the Ebola separation", "Request HS-level trade table", "Trade desk with Legal", "Days 0-30", "Establish the mineral share of trade.", "Another quota change", "Screen counterparties before any step", "MoFT customs data", "Who owns the first step?", "Ask next", "confidence: moderate", "TEST FIXTURE. Stage the commitment behind dated gates", "Slow gated progress"]) assert.ok(dh.includes(needle), `the directive PDF carries ${needle}`);
assert.ok(!dh.includes("&lt;directive&gt;") && !dh.includes("&quot;answer&quot;"), "the machine-readable JSON never reaches the page");
const da = pdfHtml({ ...dsrc, report: directiveAr(), lang: "ar" }); for (const needle of ['dir="rtl"', "الرصد والقياس (موصى به)", "سبيل المضي", "المخاطر", "الأيام 0-30"]) assert.ok(da.includes(needle), `the Arabic directive PDF carries ${needle}`);
assert.doesNotThrow(() => pdfHtml({ ...dsrc, report: directiveEn().slice(0, directiveEn().indexOf('"steps"') + 40) })); assert.ok(pdfHtml({ ...dsrc, report: "# Answer\n\nOnly prose and no directive block, long enough.\n" }).includes("Only prose"));
assert.ok(parseDirective(directiveEn())!.steps.length === 4);
console.log("report deep: all checks passed");
