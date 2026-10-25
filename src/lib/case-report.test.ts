// Tests for the reports: the building blocks, the templates, Arabic output, the missing-part rules and the Arabic name tables.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { METRIC_AR, DOMAIN_AR, metName, srcLabel, yearsLabel } from "./case/ar";
import { TREND_METRICS } from "./case/catalog";
import { composeDesk } from "./case/desk";
import { buildCase } from "./case/load";
import { BLOCK_BY, PRODUCTS, TEMPLATES, annexBlocks, band, buildReport, chairOf, classification, costToComplete, decisionsOf, langOf, type Ctx } from "./case/report";
import { REGION_AR, regionLabel, sectorLabel } from "./regions";
import type { SavedItem } from "./falcon/library";

const DASH = { initiatives: [{ id: "S1", name: "Exposure audit", horizon: "short", pillar: "economic", lead: "MoF (proposed)", partners: [], funding: "not estimated", status: "proposed", outcome: "o", kpi: "k", risk: "r", gate: "Audit before capital", gateDate: "2027-01", dependencies: [], startMonth: 0, endMonth: 3 }, { id: "M1", name: "Trade framework", horizon: "medium", pillar: "economic", lead: "MoET (proposed)", partners: [], funding: "not estimated", status: "proposed", outcome: "o", kpi: "k", risk: "r", gate: "Go or no-go", gateDate: "2028-10", dependencies: ["S1"], startMonth: 30, endMonth: 60 }], indicators: [{ name: "Pound gap", signal: "s", threshold: "above 20%", owner: "CBE" }], gates: [{ name: "12-month review", when: "2027-10", decision: "Continue or stop" }], risks: [{ name: "Currency break", likelihood: "unlikely", impact: "high", mitigation: "Staged tranches" }] };
const ARCH = `# Deliverable 1: Ministerial Strategic Brief\n\n**Bottom line.** Proceed in stages.\n\n**Decisions for senior consideration.**\n1. Task the exposure audit.\n2. Approve a CEPA study.\n\n**Key Judgments**\n- KJ1 moderate.\n\n# Deliverable 2: Comprehensive Country Statecraft Strategy\n\n## Part V: Short-Term Strategy (0 to 24 months)\nS1 text.\n\n## Part VIII: Strategic Options and Alternatives\nOption A. Option B. Option C.\n\n## Part X: Foresight and Scenarios\n1. **Stable.** x\n\n# Deliverable 3: Integrated Strategic Roadmap\n\n| id |\n|---|\n| S1 |\n\n# Deliverable 4: Soft Power, Hard Power and Economic Statecraft Matrix\n\n| p |\n|---|\n| e |\n\n# Deliverable 5: Council Debate and Red-Team Memorandum\n\nStrongest argument is delay.\n\n# Deliverable 6: Executive Decision Dashboard\n\n<dashboard>\n${JSON.stringify(DASH)}\n</dashboard>`;
const COUNCIL = `# Ministerial Executive Brief\n\n**Immediate decisions.**\n- Supply the Gate 0 inputs.\n- Hold new sovereign money.\n\n## Executive Judgment\nKJ1. We judge it likely that staged engagement wins.\n\n## Strategic Options\nA. Deepen. B. Staged.\n\n## Risks and Dissent\nC16 dissents.\n\n# Appendix: Seat Sections\n\n### C15 — Foresight\n**Judgment:** futures\nScenario text.\n`;

async function main() {
  const egy = (await buildCase("EGY", new Date("2026-10-25T10:00:00Z")))!; const today = Date.parse("2026-10-25T10:00:00Z");
  const ctx = (o: Partial<Ctx> = {}): Ctx => ({ d: egy, council: null, arch: null, others: [], lang: "en", today, ...o });
  // ---- templates reference real blocks ----
  assert.equal(TEMPLATES.length, 5); for (const t of TEMPLATES) for (const b of t.blocks) assert.ok(BLOCK_BY.has(b), `${t.id}: ${b}`);
  assert.deepEqual(TEMPLATES.map((t) => t.id), ["president", "minister", "roadmap", "desk", "dossier"]);
  // ---- the President's page, with nothing paid for: data blocks written, strategy blocks missing, never silent ----
  const p0 = TEMPLATES[0]; const r0 = buildReport(p0.blocks, ctx(), { title: "President's one-page brief" });
  assert.ok(r0.md.startsWith("# President's one-page brief: Egypt") && r0.md.includes("WORKING ANALYSIS"), "title and the working-analysis banner");
  assert.equal(r0.parts.find((x) => x.id === "answer")!.state, "written"); assert.equal(r0.parts.find((x) => x.id === "readings")!.state, "written"); assert.equal(r0.parts.find((x) => x.id === "nextGates")!.state, "missing");
  assert.equal(r0.parts.find((x) => x.id === "decisions")!.state, "partial", "only the data trigger: partial, and it says so"); assert.deepEqual(r0.missing, ["architect"]); assert.equal(costToComplete(r0.missing), 0.79);
  assert.ok(r0.md.includes("US$0.79") && r0.md.includes("starts only when you click it"), "a missing part states the cost and that nothing runs by itself");
  assert.ok(!/Not yet written[^\n]*US\$0\.78/.test(r0.parts.find((x) => x.id === "nextGates")!.md), "the Architect's gap is not priced as the Council");
  // ---- with the Council and the Architect on file ----
  const r1 = buildReport(p0.blocks, ctx({ council: COUNCIL, arch: ARCH }), { title: "President's one-page brief" });
  assert.deepEqual(r1.missing, [], "nothing missing"); assert.ok(r1.md.includes("1. Task the exposure audit.") && r1.md.includes("2027-01"), "decisions from the Architect and the next dated gate");
  assert.ok(!r1.md.includes("Not yet written"));
  const m1 = buildReport(TEMPLATES[1].blocks, ctx({ council: COUNCIL, arch: ARCH }), { title: "Ministerial brief", reviewer: "A. Reviewer", preparedFor: "H.E. the Minister" });
  assert.ok(m1.md.includes("Reviewed by: A. Reviewer") && m1.md.includes("Prepared for: H.E. the Minister") && m1.md.includes("KJ1. We judge it likely"), "reviewer, audience and the Council's judgment");
  assert.equal(buildReport(TEMPLATES[1].blocks, ctx(), { title: "x" }).md.includes("not yet reviewed"), true, "an unreviewed report says so");
  // ---- decisions: Architect first, then the Council, then the data ----
  assert.deepEqual(decisionsOf({ d: egy, arch: ARCH, council: COUNCIL }), { items: ["Task the exposure audit.", "Approve a CEPA study."], from: "architect" });
  assert.deepEqual(decisionsOf({ d: egy, arch: null, council: COUNCIL }), { items: ["Supply the Gate 0 inputs.", "Hold new sovereign money."], from: "council" });
  assert.equal(decisionsOf({ d: egy, arch: null, council: null }).from, "data");
  // ---- the three readings in plain words ----
  assert.equal(band("value", 74), "high"); assert.equal(band("value", 55), "medium"); assert.equal(band("value", 30), "low"); assert.equal(band("risk", 70), "high"); assert.equal(band("risk", 20), "low"); assert.equal(band("ability", null), null);
  // ---- Arabic: the deterministic blocks are in Arabic, with Arabic names, and a block in the other language says so ----
  const ar = buildReport(TEMPLATES[1].blocks, ctx({ lang: "ar", council: COUNCIL, arch: ARCH }), { title: TEMPLATES[1].ar });
  assert.ok(ar.md.startsWith("# موجز الوزير: مصر") && ar.md.includes("## الجواب") && ar.md.includes("## ثلاث قراءات") && ar.md.includes("## المخاطر"), "Arabic title, country and headings");
  const ans = ar.parts.find((x) => x.id === "answer")!.md; assert.ok(!/\b(Stance|Biggest risk|Confidence)\b/.test(ans) && /الموقف/.test(ans), "no English labels in the Arabic answer");
  assert.ok(ar.parts.find((x) => x.id === "numbers")!.md.includes("نمو الناتج المحلي الحقيقي"), "metric names are Arabic"); assert.ok(ar.parts.find((x) => x.id === "judgment")!.md.includes("كُتب بالإنجليزية"), "an English council text in an Arabic report is marked");
  assert.equal(langOf("مرحبا بالعالم"), "ar"); assert.equal(langOf("hello world"), "en"); assert.ok(classification("ar").includes("غير مُراجَع") && classification("en").includes("NOT REVIEWED"));
  // ---- the desk brief in Arabic: 24 sections, Arabic titles, the Arabic 'not yet written' ----
  const dk = composeDesk(egy, null, null, "ar"); assert.equal(dk.length, 24); assert.ok(dk.every((s) => /[؀-ۿ]/.test(s.title)), "every title is Arabic"); assert.ok(dk.find((s) => s.n === 15)!.body.includes("لم يُكتب بعد") && !dk.find((s) => s.n === 15)!.body.includes("Not yet written"));
  assert.ok(dk.find((s) => s.n === 14)!.body.includes("الفئة") && !/\| Category \|/.test(dk.find((s) => s.n === 14)!.body), "table headers are Arabic"); assert.equal(composeDesk(egy, null).length, 24);
  // ---- the dossier carries other saved products as annexes, once ----
  const other: SavedItem = { key: "gd-strat:EGY:dossier", iso3: "EGY", kind: "strategy", at: "2026-10-20T00:00:00Z", usd: 0.3, words: 10, report: "# Strategy\n\nBody", model: "m" };
  assert.deepEqual(annexBlocks([other]).map((b) => b.id), ["annex:gd-strat:EGY:dossier"]); const dossier = TEMPLATES[4]; const ids = [...dossier.blocks.slice(0, -1), "annex:gd-strat:EGY:dossier", dossier.blocks[dossier.blocks.length - 1]];
  const full = buildReport(ids, ctx({ others: [other], council: COUNCIL, arch: ARCH }), { title: "Full dossier" }); assert.ok(full.md.includes("Country strategy dossier") && full.md.indexOf("Country strategy dossier") < full.md.indexOf("## Evidence and status"), "annex before the evidence note");
  assert.equal(chairOf(COUNCIL).includes("Appendix"), false); assert.ok(PRODUCTS.council.usd + PRODUCTS.architect.usd < 2);
  // ---- Arabic name tables cover everything the data carries ----
  for (const m of TREND_METRICS) { assert.ok(METRIC_AR[m.name], `metric: ${m.name}`); assert.ok(DOMAIN_AR[m.domain], `domain: ${m.domain}`); }
  assert.equal(metName("Rule of law", "ar"), "سيادة القانون"); assert.equal(metName("Rule of law", "en"), "Rule of law"); assert.equal(metName("Unknown thing", "ar"), "Unknown thing", "an unknown name is shown as written");
  assert.equal(srcLabel("World Bank WDI NY.GDP.PCAP.CD", "en"), "World Bank WDI"); assert.ok(/[؀-ۿ]/.test(srcLabel("World Bank WDI NY.GDP.PCAP.CD", "ar")) && !/NY\./.test(srcLabel("World Bank WDI NY.GDP.PCAP.CD", "ar"))); assert.equal(yearsLabel("45 days held", "ar"), "45 يومًا محفوظة"); assert.equal(yearsLabel("2015-2031", "ar"), "2015-2031");
  const countries = JSON.parse(readFileSync("public/data/countries.json", "utf8")) as { region: string }[]; type Reg = Record<string, { region?: string; subregion?: string }>; const regs = JSON.parse(readFileSync("public/data/regions.json", "utf8")) as { countries?: Reg };
  for (const r of new Set((Array.isArray(countries) ? countries : []).map((c) => c.region))) assert.ok(REGION_AR[r], `region: ${r}`);
  const src: Reg = regs.countries ?? (regs as unknown as Reg); for (const v of Object.values(src)) { if (v.region) assert.ok(REGION_AR[v.region], `UN region: ${v.region}`); if (v.subregion) assert.ok(REGION_AR[v.subregion], `UN subregion: ${v.subregion}`); }
  assert.equal(regionLabel("Africa", "ar"), "أفريقيا"); assert.equal(regionLabel("Mars", "ar"), "Mars"); assert.equal(sectorLabel("energy", "ar"), "الطاقة"); assert.equal(sectorLabel("energy", "en"), "energy");
  console.log("case-report: all checks passed");
}
main().catch((e) => { console.error(e); process.exit(1); });
