// Run with: npx tsx src/lib/dossier.test.ts
// Guards the detailed ministerial briefing's input clamping, cache key and HTML export (which must never let model output inject markup).
import assert from "node:assert/strict";
import { BUDGET, cleanOptions, optionsKey } from "./dossier/options";
import { briefingHtml, mdToHtml } from "./dossier/export";
import { SYSTEM, userMessage } from "./dossier/prompt";

const d = cleanOptions({});
assert.equal(d.counterpart, "foreign-minister"); assert.equal(d.depth, "standard"); assert.deepEqual(d.focus, ["comprehensive"]); assert.equal(d.lang, "en");
const o = cleanOptions({ counterpart: "nonsense", depth: "comprehensive", meeting: "summit", lang: "ar", focus: ["security", "bogus", "economic"], meetingDate: "not a date", counterpartName: "  X".repeat(100), notes: { positions: "p".repeat(9000), previous: 5, objectives: "ok\u0000" } });
assert.equal(o.counterpart, "foreign-minister"); assert.equal(o.depth, "comprehensive"); assert.equal(o.lang, "ar"); assert.deepEqual(o.focus, ["security", "economic"]); assert.equal(o.meetingDate === "", true);
assert.ok(o.counterpartName.length <= 120 && o.notes.positions.length === 4000 && o.notes.previous === "" && o.notes.objectives === "ok");
assert.deepEqual(cleanOptions({ focus: ["comprehensive", "security"] }).focus, ["comprehensive"]);
// the key changes with every input that changes the briefing, and not with focus order
assert.equal(optionsKey("SAU", cleanOptions({ focus: ["security", "economic"] })), optionsKey("SAU", cleanOptions({ focus: ["economic", "security"] })));
for (const b of [{ depth: "executive" }, { counterpart: "head-of-state" }, { lang: "ar" }, { notes: { positions: "x" } }, { counterpartName: "Y" }, { meeting: "summit" }]) assert.notEqual(optionsKey("SAU", cleanOptions(b)), optionsKey("SAU", d), JSON.stringify(b));
assert.notEqual(optionsKey("SAU", d), optionsKey("IND", d));
// budgets grow with depth
assert.ok(BUDGET.executive.maxTokens < BUDGET.standard.maxTokens && BUDGET.standard.maxTokens < BUDGET.comprehensive.maxTokens && BUDGET.executive.searches < BUDGET.comprehensive.searches);
// the prompt carries the rules that stop fabrication, and the user message carries the options
for (const s of ["DESK INPUT REQUIRED", "# 1. Ministerial Executive Brief", "# 2. Strategic Country Intelligence Dossier", "# 3. Meeting Brief and Talking Points", "Never fabricate"]) assert.ok(SYSTEM.includes(s), s);
const m = userMessage({ facts: "[F1] x", asOf: "2026-10-18T00:00:00Z", country: "India", options: cleanOptions({ counterpartName: "A. B.", notes: { positions: "line" } }) });
assert.ok(m.includes("A. B.") && m.includes("approved UAE positions") && m.includes("Country: India") && m.includes("Today: 2026-10-18"));
assert.ok(userMessage({ facts: "", asOf: "2026-10-18T00:00:00Z", country: "India", options: d }).includes("(none supplied)"));
// export: tables, links and escaping
const html = mdToHtml("# 1. Part\n\n| A | B |\n|---|---|\n| <script>alert(1)</script> | [ok](https://x.org/a) |\n\n[bad](javascript:alert(1)) **bold**\n\n- one\n- two");
assert.ok(html.includes("<table>") && html.includes("&lt;script&gt;") && !html.includes("<script>") && html.includes('<a href="https://x.org/a">ok</a>') && !html.includes('href="javascript'));
assert.ok(html.includes("<b>bold</b>") && html.includes("<ul><li>one</li><li>two</li></ul>") && html.includes('<h1 class="part">'));
const doc = briefingHtml("# T", { title: "A & B", rtl: true, foot: "f", classification: "c" }, true);
assert.ok(doc.includes('dir="rtl"') && doc.includes("A &amp; B") && doc.includes("urn:schemas-microsoft-com:office:word"));
console.log("dossier: all assertions passed");
