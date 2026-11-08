// Tests for the illustrated embassy reports (the intelligence report and the plan): every field reaches the PDF, Arabic is right to left, a product cut off at the model's limit still draws, and the shared helpers do not invent anything.
import assert from "node:assert/strict";
import { headOf } from "./model";
import { ILLUSTRATORS } from "./registry";
import { parseMission1, parseMission2 } from "../desk/embassy";
import { INTEL_JSON, PLAN_JSON, intelReport, planReport } from "./fixtures-mission";
import { esc } from "./html";
import { countBy, flatInits, hasFigure, placeRisks, plain, powerGrid, scenarioGrid, skipStandardIntel, spectrum } from "./mission-model";
import { pdfHtml } from "../reportpdf";

// ---- the helpers read only what the product wrote
const m1 = parseMission1(intelReport())!; const m2 = parseMission2(planReport())!;
assert.equal(powerGrid(m1.power).reduce((a, r) => a + r.total, 0), m1.power.length, "the power grid counts every entry once"); assert.ok(powerGrid(m1.power).every((r) => r.total > 0));
assert.deepEqual(spectrum(m1.neighbours).map((s) => s.items.length), [1, 1, 1, 1, 1]); assert.deepEqual(scenarioGrid(m1.scenarios).desks, ["Economy", "Security", "Trade", "Consular"]);
const pr = placeRisks(m1.risks); assert.equal(pr.all.length, 5); assert.equal(pr.unplaced, 1, "the risk with no likelihood is listed but not placed"); assert.equal(pr.placed.length, 4);
assert.equal(flatInits(m2.plans).length, 10); assert.equal(flatInits(m2.plans)[0].horizon, "d30"); assert.equal(flatInits(m2.plans)[5].horizon, "y1"); assert.equal(hasFigure("not estimated"), false); assert.equal(hasFigure("USD 2 million"), true); assert.equal(countBy([{ a: "x" }, { a: "y" }, { a: "x" }], (z) => z.a)[0].n, 2);
assert.equal(plain("**Hold** the line [F1, F2] now, see [the note](http://x) [F3]."), "Hold the line now, see the note.");
assert.deepEqual(skipStandardIntel(intelReport(), true), ["scenarios"], "its own scenarios replace the standard ones"); assert.deepEqual(skipStandardIntel(intelReport(), false), []);
assert.deepEqual(skipStandardIntel(`${intelReport()}<standard>${JSON.stringify({ scenarios: [{ name: "A", summary: "b" }] })}</standard>`, true), [], "a standard block with scenarios of its own is drawn");

// ---- the intelligence PDF carries every field
const src = (kind: string, report: string, lang: "en" | "ar" = "en") => ({ kind, iso: "NOR", country: "Norway", report, at: new Date().toISOString(), usd: 0.6, lang, model: "test", sources: [{ url: "https://www.imf.org/x", title: "IMF" }] });
const ctx = (kind: string, report: string, L: "en" | "ar" = "en") => ({ kind, report, L, head: headOf(kind, report, { lang: L }), country: "Norway", iso: "NOR", sources: [] });
const ill = ILLUSTRATORS["emb-intel"](ctx("emb-intel", intelReport()))!; assert.ok(ill.bottomLine?.startsWith("TEST FIXTURE") && !ill.bottomLine.includes("[F1]")); assert.deepEqual(ill.skipStandard, ["scenarios"]);
const html = pdfHtml(src("emb-intel", intelReport()));
const J = INTEL_JSON();
const need: string[] = [];
for (const p of J.power) need.push(p.who, p.mandate, p.why, p.approach, p.source); for (const p of J.partners) need.push(p.name, p.winwin, p.uaeCounterpart, p.structure, p.firstStep, p.risk, ...p.dueDiligence);
for (const p of J.plays) need.push(p.vehicle, p.gap, p.why, p.partner, p.structure, p.protections, p.firstStep, p.risk, p.window); for (const g of J.gaps) need.push(g.gap, g.evidence, g.size, g.opportunity);
for (const x of J.sectorSupport) need.push(x.sector, x.economic, x.influence, x.instruments, x.risk); for (const c of J.inbound) need.push(c.company, c.why, c.route, c.uaeBenefit, c.firstStep); for (const x of J.sme) need.push(x.segment, x.idea, x.channel, x.measure);
for (const n of J.neighbours) need.push(n.country, n.note, n.uaeImplication); for (const s of J.scenarios) need.push(s.name, s.trigger, s.response, s.indicator, ...s.effects.map((x) => x.text)); for (const r of J.risks) need.push(r.name, r.trigger, r.mitigation, r.owner);
for (const w of J.watch) need.push(w.indicator, w.signal, w.threshold, w.source); for (const c of J.calendar) need.push(c.when, c.what, c.why, c.lead); for (const a of J.askedOfUs) need.push(a.ask, a.from, a["our position"], a.cost);
for (const n of need) assert.ok(html.includes(esc(n)), `the intel PDF carries "${n}"`);
for (const n of ["Prime Minister&#39;s Office", "power map", "<svg", "Likelihood", "Red flags raised", "As of", "So what for the UAE", "First 30 days: the call sheet", "Minister of Foreign Affairs"]) assert.ok(html.includes(n) || html.toLowerCase().includes(n.toLowerCase()), `the intel PDF has ${n}`);
assert.ok(!html.includes("<mission1>") && !html.includes("statecraft_review>"), "the machine-readable blocks never reach the page"); assert.ok((html.match(/Scenarios and tripwires/g) ?? []).length === 0, "the standard scenarios are not drawn a second time");

// ---- the plan PDF
const planHtml = pdfHtml(src("emb-plan", planReport())); const P = PLAN_JSON();
const need2: string[] = []; for (const o of P.strategy.objectives) need2.push(o.title, o.why, ...o.measures, o.owner, o.target); for (const h of ["d30", "d100", "y1", "y3"] as const) for (const i of P.plans[h]) need2.push(i.id, i.title, i.owner, i.kpi, i.milestone, i.risk, ...i.actions, ...i.dueDiligence);
for (const g of P.gates) need2.push(g.question, g.evidence, g.ifNo, g.owner); for (const x of P.dueDiligence) need2.push(x.subject, ...x.checks, x.source, x.ownerDesk); for (const r of P.resources) need2.push(r.item, r.why, r.owner); for (const r of P.risks) need2.push(r.name, r.mitigation);
need2.push(...P.strategy.assumptions, ...P.strategy.notDoing, ...P.strategy.enablers, P.strategy.logic);
for (const n of need2) assert.ok(planHtml.includes(esc(n)), `the plan PDF carries "${n}"`);
assert.ok(planHtml.includes("Implementation plan") || planHtml.includes("Scenarios and tripwires"), "the standard parts a plan carries are drawn"); assert.ok(planHtml.includes("First 100 days") && planHtml.includes("First 30 days") && planHtml.includes("Open the channel with the foreign ministry"), "the 30-day lane is drawn");
const cnt = (h: string, n: string) => h.split(n).length - 1; for (const n of ["Scenarios and tripwires", "Implementation plan", "Friends and coalition"]) assert.ok(cnt(planHtml, n) <= 1, `${n} is drawn once, not twice`);

// ---- Arabic is right to left and in Arabic
const ar = pdfHtml(src("emb-intel", intelReport("ar"), "ar")); assert.ok(ar.includes('dir="rtl"') && ar.includes("من يملك القوة") && ar.includes("مكتب رئيس الوزراء") && ar.includes("خريطة القوة"));
const arp = pdfHtml(src("emb-plan", planReport("ar"), "ar")); assert.ok(arp.includes('dir="rtl"') && arp.includes("بوابات القرار") && arp.includes("سجل العناية الواجبة"));

// ---- a product cut off at the model's limit draws what it has; one with no structured data still gets a cover
const cut = intelReport().replace(/"risks":\[[\s\S]*$/, ""); assert.doesNotThrow(() => pdfHtml(src("emb-intel", cut))); assert.ok(pdfHtml(src("emb-intel", cut)).includes("Prime Minister"));
const cut2 = planReport().replace(/"dueDiligence":\[[\s\S]*$/, ""); assert.doesNotThrow(() => pdfHtml(src("emb-plan", cut2)));
assert.ok(pdfHtml(src("emb-intel", "# Ambassador's Brief\n\nOnly prose, long enough.\n")).includes("Only prose")); assert.ok(pdfHtml(src("emb-plan", "# Mission Strategy\n\nOnly prose.\n")).includes("<html"));
// text is escaped
const evil = intelReport().replace("Prime Minister's Office", "<img src=x onerror=1> & co"); assert.ok(!pdfHtml(src("emb-intel", evil)).includes("<img src=x"), "a name with markup is escaped");
console.log("report mission: all checks passed");
