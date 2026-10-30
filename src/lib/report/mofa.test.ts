// Tests for the illustrated Ministry's Council report: every field reaches the PDF, Arabic is right to left, a cut-off product still draws.
import assert from "node:assert/strict";
import { headOf } from "./model";
import { ILLUSTRATORS } from "./registry";
import { parseMofa } from "../desk/mofa";
import { MOFA_JSON, mofaReport } from "./fixtures-mofa";
import { esc } from "./html";
import { measured } from "./mission-model";
import { pdfHtml } from "../reportpdf";

const m = parseMofa(mofaReport())!; assert.equal(measured(m), 4, "a goal counts as measured only with a measure and a target");
const src = (report: string, lang: "en" | "ar" = "en") => ({ kind: "mofa-council", iso: "NOR", country: "Norway", report, at: new Date().toISOString(), usd: 0.6, lang, model: "test", sources: [{ url: "https://www.imf.org/x", title: "IMF" }] });
const ill = ILLUSTRATORS["mofa-council"]({ kind: "mofa-council", report: mofaReport(), L: "en", head: headOf("mofa-council", mofaReport(), { lang: "en" }), country: "Norway", iso: "NOR", sources: [] })!; assert.equal(ill.title, "Staged"); assert.ok(ill.bottomLine?.startsWith("TEST FIXTURE")); assert.ok(ill.heroExtra?.includes("scale"));
const html = pdfHtml(src(mofaReport())); const J = MOFA_JSON(); const need: string[] = [J.stance.headline, J.stance.rationale];
for (const p of J.priorities) need.push(p.title, p.why, p.owner); for (const g of J.goals) need.push(g.goal, g.measure, g.target); for (const x of J.mission) need.push(x.task, x.who); for (const p of J.plans) need.push(p.aim, ...p.actions.map((a) => a.action), ...p.risks);
for (const n of J.negotiation) need.push(n.track, n.aim, n.ask, n.offer, n.leverage, n.fallback, n.redLine); for (const v of J.visits) need.push(v.what, ...v.deliverables, ...v.prep); for (const t of J.talking) need.push(t.topic, t.point); for (const l of J.legal) need.push(l.instrument, l.aim);
need.push(...J.assumptions, ...J.gaps, ...J.decisionsAsked, ...J.reporting.map((r) => r.content), ...J.watch.map((w) => w.indicator));
for (const n of need) assert.ok(html.includes(esc(n)), `the Ministry PDF carries "${n}"`);
for (const n of ["domains planned", "This domain was not written", "Red flags raised", "So what for the UAE", "Legal and treaty agenda by status", "<svg"]) assert.ok(html.includes(n) || html.includes(n.replace("<svg", "<div class=\"scale\"")) , `the Ministry PDF has ${n}`);
assert.ok(!html.includes("<mofa>") && !html.includes("statecraft_review>"));
const cnt = (h: string, n: string) => h.split(n).length - 1; for (const n of ["Scenarios and tripwires", "Friends and coalition"]) assert.ok(cnt(html, n) <= 1, `${n} is drawn once, not twice`);
const ar = pdfHtml(src(mofaReport("ar"), "ar")); assert.ok(ar.includes('dir="rtl"') && ar.includes("خطط المجالات للسفارة") && ar.includes("تأمين ممر الموانئ والسكك") && ar.includes("مجالات مخططة"));
const cut = mofaReport().replace(/"mission":\[[\s\S]*$/, ""); assert.doesNotThrow(() => pdfHtml(src(cut))); assert.ok(pdfHtml(src(cut)).includes("Secure the port"));
assert.ok(pdfHtml(src("# Foreign Policy Brief\n\nOnly prose.\n")).includes("Only prose"));
console.log("report mofa: all checks passed");
