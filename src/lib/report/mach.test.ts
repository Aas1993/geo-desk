// Tests for the Machiavellian products' illustrated PDFs: the council, the country strategy, the scenario and the external-influence assessment. Every parsed field reaches the page, the outcome tree is drawn, Arabic is right to left, and a cut-off or structure-less product does not throw.
import assert from "node:assert/strict";
import { ILLUSTRATORS } from "./registry";
import { headOf } from "./model";
import { councilReport, interferenceReport, scenarioReport, strategyReport } from "./fixtures-mach";
import { pdfHtml } from "../reportpdf";
import { ringMapSvg, treeSvg } from "./html-fm";
import { parseStrategy } from "../machiavelli/strategy-parse";

const mk = (kind: string, report: string, lang: "en" | "ar" = "en") => ({ kind, iso: "NOR", country: "Norway", report, at: "2026-10-30T10:00:00Z", usd: 0.5, lang, model: "test", sources: [{ url: "https://www.imf.org/x", title: "IMF" }] });
const has = (html: string, needles: string[], what: string) => { for (const n of needles) assert.ok(html.includes(n), `${what} carries ${n}`); };
for (const k of ["mach-council", "mach-strategy", "mach-scenario", "mach-interference"]) { const r = k === "mach-council" ? councilReport() : k === "mach-strategy" ? strategyReport() : k === "mach-scenario" ? scenarioReport() : interferenceReport(); assert.equal(headOf(k, r, { lang: "en" }).grade, null, `${k} has no quality grade`); assert.ok(ILLUSTRATORS[k]({ kind: k, report: r, L: "en", head: headOf(k, r), country: "Norway", iso: "NOR", sources: [] }), `${k} is illustrated`); }

// ---- the tree and the ring
const nodes = parseStrategy(strategyReport()).pathway; assert.equal(nodes.length, 6);
const svg = treeSvg(nodes, { L: "en", stage: (s) => s, branch: (s) => s, conf: (s) => s }); assert.ok(svg.includes("<svg") && (svg.match(/<rect/g) ?? []).length >= 12 && svg.includes("P4") && svg.includes("<path"), "every node is a box and every parent link a curve"); assert.equal(treeSvg([], { L: "en", stage: (s) => s, branch: (s) => s, conf: (s) => s }), "");
assert.ok(ringMapSvg([{ from: "A", to: "B", status: "alleged" }], (s) => s).includes("stroke-dasharray") && ringMapSvg([], (s) => s) === "");

// ---- the council
const c = pdfHtml(mk("mach-council", councilReport()));
has(c, ["Final Council Strategy", "seat reports", "The seats", "Realist", "Economic", "TEST FIXTURE insight", "not established", "Council reading", "Short term", "Provenance first", "Role in peace tracks", "Position A", "Open items for human review", "Dissent: the Independent Challenger", "Dissenting finding", "Strongest competing explanation", "Weakest assumption", "Evidence Verifier: claim audit", "Heads of terms only", "Disputed", "Source quality", "Open gaps before publication", "Indicator dashboard", "MI04", "Limit and stage"], "the council PDF");
assert.ok(!/quality score/.test(c) && !/class="gr"/.test(c), "no grade on a council");
has(pdfHtml(mk("mach-council", councilReport(), "ar")), ['dir="rtl"', "المقاعد", "لوحة المؤشرات", "تدقيق الادعاءات", "الخلاف: المُحاجِج المستقل"], "the Arabic council PDF");

// ---- the strategy
const s = pdfHtml(mk("mach-strategy", strategyReport()));
has(s, ["Country strategy dossier", "Commercial presence", "The five outcomes", "Option appraisal", "Authority: pass", "Transparency: fail", "gate not passed", "O1 Staged port footprint", "Options in full", "Tranches behind gates", "Outcome pathway: the tree", "<svg", "Gated first tranche committed", "Stop condition", "Scenarios", "Failure or underperformance", "Material downside and dissent", "Preserved dissent", "Limit and stage"], "the strategy PDF");
has(pdfHtml(mk("mach-strategy", strategyReport(), "ar")), ['dir="rtl"', "تقييم الخيارات", "النتائج الخمس", "مسار النتائج", "الصلاحية: اجتاز"], "the Arabic strategy PDF");

// ---- the scenario
const n = pdfHtml(mk("mach-scenario", scenarioReport()));
has(n, ["Scenario builder", "Outcome tree", "outcome nodes", "Inputs recap", "Regional conflict", "Indicator shifts", "Favourable branch", "Adverse branch", "Re-exports dominate", "Recommended instrument sequencing", "Gate on terms", "Inputs to outputs", "Stranded capital", "Red team", "May be read as partial", "Uncertainty and evidence gaps"], "the scenario PDF");
has(pdfHtml(mk("mach-scenario", scenarioReport(), "ar")), ['dir="rtl"', "شجرة النتائج", "تحولات المؤشرات"], "the Arabic scenario PDF");

// ---- the external influence
const i = pdfHtml(mk("mach-interference", interferenceReport()));
has(i, ["External influence assessment", "Evidence versus inference", "Verified observation", "Attributed allegation", "Analytical inference", "Unresolved question", "Competing hypotheses", "Leading", "Plausible", "Untested", "Relationship map", "Documented", "Alleged", "Uncertain", "stroke-dasharray", "Mechanisms and consequences", "Hard-power dimension", "Impact pathway", "Public trust: Public trust dips", "Lawful resilience", "Funding transparency registry", "Indicators and what would change", "Unresolved and required specialist review", "ordinary commercial explanation"], "the influence PDF");
has(pdfHtml(mk("mach-interference", interferenceReport(), "ar")), ['dir="rtl"', "خريطة العلاقات", "الفرضيات المتنافسة"], "the Arabic influence PDF");

// ---- the standard parts come from the products' own JSON and are not drawn twice
assert.ok(c.includes("So what for the UAE") && c.includes("The fourteen angles"), "the standard parts reach a council PDF"); assert.ok(!s.includes("Scenarios and tripwires") && !n.includes("Scenarios and tripwires"), "a product that draws its own scenarios skips the standard ones");

// ---- cut off or structure-less products
for (const [k, r] of [["mach-council", councilReport()], ["mach-strategy", strategyReport()], ["mach-scenario", scenarioReport()], ["mach-interference", interferenceReport()]] as const) {
  for (const f of [0.15, 0.4, 0.7]) assert.doesNotThrow(() => pdfHtml(mk(k, r.slice(0, Math.floor(r.length * f)))), `${k} cut at ${f}`);
  const bare = pdfHtml(mk(k, "# Title\n\nOnly prose, long enough to be a document of its own.\n")); assert.ok(bare.includes("<html") && bare.includes("Only prose"), `${k} with no structure still gets a cover`);
}
console.log("report mach: all checks passed");
