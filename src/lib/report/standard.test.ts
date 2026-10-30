// Tests for the standard parts of a report (as-of, so-what, angle matrix, scenarios, milestones, coalition, ledger): tolerant reading, nothing drawn when absent, nothing invented, and the PDF blocks.
import assert from "node:assert/strict";
import { daysSince, matchAngle, milestoneRows, readAngles, readSoWhat, readStandard } from "./standard";
import { standardBlocks, asOfHtml } from "./standardHtml";
import { kingReport } from "./fixtures";
import { pdfHtml } from "../reportpdf";

assert.equal(matchAngle("3"), "military"); assert.equal(matchAngle("gov"), "gov"); assert.equal(matchAngle("Political and governance"), "gov"); assert.equal(matchAngle("diplomatic"), "friends"); assert.equal(matchAngle("security"), "natsec"); assert.equal(matchAngle("nonsense"), null); assert.equal(matchAngle("15"), null);
assert.deepEqual(readAngles([{ angles: { gov: "covered", tech: { status: "not found", note: "gap" }, bogus: "covered" } }]).map((a) => [a.id, a.status]), [["gov", "covered"], ["tech", "notfound"]], "a map of angle to status is read; unknown angles are dropped");
assert.deepEqual(readAngles([{ coverage: [{ angle: 5, state: "thin" }, { id: "legal", coverage: "partial" }, { id: "info", status: "???" }] }]).map((a) => [a.id, a.status]), [["econ", "thin"], ["legal", "thin"]], "an unreadable status is not guessed");
assert.equal(readSoWhat("# So what for the UAE\n\nKeep the corridor alive.\n\n# Next\nx", []), "Keep the corridor alive."); assert.equal(readSoWhat("# Executive Brief\nx", []), "");
const none = readStandard("# Executive Brief\n\nProse only."); assert.equal(none.any, false, "a product that predates the standard carries none of it"); assert.deepEqual(standardBlocks("# x", "en", "not a date").front, []);
const std = readStandard(kingReport()); assert.ok(std.any && std.soWhat.startsWith("TEST FIXTURE") && std.angles.length === 6 && std.scenarios.length === 3 && std.milestones.length === 3 && std.coalition.length === 2 && std.ledger.length === 2);
assert.equal(std.milestones[0].horizon, "30d"); assert.equal(std.milestones[2].horizon, "1y"); assert.equal(std.scenarios.find((x) => x.kind === "downside")!.tripwires[0].threshold, "Under 3 months"); assert.equal(std.ledger[0].rivals.length, 2);
assert.equal(daysSince("2026-10-01T00:00:00Z", Date.parse("2026-10-31T00:00:00Z")), 30); assert.equal(daysSince("garbage"), null);
const g = milestoneRows(std.milestones); assert.equal(g.rows.length, 3); assert.equal(g.base, "2026-11-01"); assert.ok(g.months >= 10 && g.rows[0].s === 0); assert.equal(milestoneRows([{ ...std.milestones[0], start: "", end: "" }]).rows.length, 0, "a step with no dates is not put on the chart");
assert.ok(asOfHtml("2026-10-01T00:00:00Z", "en", Date.parse("2026-10-31T00:00:00Z")).includes("30 days old") && asOfHtml("2026-09-01T00:00:00Z", "en", Date.parse("2026-10-31T00:00:00Z")).includes("stale"));
const html = pdfHtml({ kind: "king-council", iso: "NOR", country: "Norway", report: kingReport(), at: "2026-10-30T10:00:00Z", usd: 0.6, lang: "en", model: "t" });
for (const needle of ["So what for the UAE", "The fourteen angles", "not found", "not stated", "Scenarios and tripwires", "Move to hold", "Implementation plan", "Review gate 31 March 2027", "Friends and coalition", "African Development Bank", "Influence ledger against rivals", "Ports and logistics", "As of 2026-10-30"]) assert.ok(html.includes(needle), `the PDF carries ${needle}`);
const ar = pdfHtml({ kind: "king-council", iso: "NOR", country: "Norway", report: kingReport(), at: "2026-10-30T10:00:00Z", usd: 0.6, lang: "ar", model: "t" }); assert.ok(ar.includes("تغطية الزوايا الأربع عشرة") && ar.includes("خطة التنفيذ") && ar.includes("حتى تاريخ"));
// ---- what changed
import { diffBlocks, keepBlocks } from "./diff"; import { whatChangedHtml } from "./standardHtml";
const old = kingReport().replace('"course":"staged","confidence":"moderate"', '"course":"hold","confidence":"low"').replace('"name":"Currency shock","likelihood":"likely (55-70%)","impact":"high"', '"name":"Currency shock","likelihood":"likely (55-70%)","impact":"medium"').replace('"name":"Reputational drift"', '"name":"Old risk"');
const kept = keepBlocks(old); assert.ok(kept.includes("<king>") && !kept.includes("Executive Brief") && kept.length < old.length, "only the JSON blocks are kept");
const df = diffBlocks(kept, kingReport()); assert.ok(df.moved.some((m) => m.label === "course" && m.from === "hold" && m.to === "staged"), "the course moved"); assert.ok(df.moved.some((m) => /Currency shock \(impact\)/.test(m.label) && m.from === "medium" && m.to === "high")); assert.ok(df.added.some((x) => x.label === "Reputational drift") && df.removed.some((x) => x.label === "Old risk")); assert.equal(df.same, false);
assert.equal(diffBlocks(keepBlocks(kingReport()), kingReport()).same, true, "the same product has nothing changed"); assert.equal(diffBlocks("", kingReport()).same, true, "no earlier blocks: nothing to compare");
assert.ok(whatChangedHtml(df, "2026-10-01T00:00:00Z", "en").join("").includes("hold") && whatChangedHtml(diffBlocks(kept, kept), "2026-10-01T00:00:00Z", "en").join("").includes("Nothing in the structured data changed"));
console.log("report standard: all checks passed");
