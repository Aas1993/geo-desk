// Tests for the decision log's pure logic: parsing, edits, due marks, candidates from the products on file, merge without duplicates, CSV, JSON and iCalendar.
import assert from "node:assert/strict";
import { addDecision, addFollowUp, candidatesFrom, cleanDate, csvCell, decisionBlocks, decisionText, dueSoon, editFollowUp, icsFold, isOverdue, mergeCandidates, parseDecisions, removeDecision, removeFollowUp, sortDecisions, summary, timeline, toCsv, toggleFollowUp, toIcs, toJson, updateDecision, MAX_DECISIONS } from "./lab/decisions";
import type { PBrief } from "./desk/president";

const NOW = Date.parse("2026-10-30T10:00:00Z"); let n = 0; const ok = (c: unknown, m: string) => { assert.ok(c, m); n++; }; const eq = (a: unknown, b: unknown, m?: string) => { assert.deepEqual(a, b, m); n++; };

// ---- dates
eq(cleanDate("2026-10-30"), "2026-10-30"); eq(cleanDate("2026-02-30"), "", "an impossible date is empty"); eq(cleanDate("30/10/2026"), ""); eq(cleanDate(undefined), ""); eq(cleanDate("60 days"), "");

// ---- parse defensively
eq(parseDecisions("nope"), []); eq(parseDecisions([{ title: "no id" }, null, 5]), []);
const p = parseDecisions([{ id: "a", title: "  Build a <corridor>  ", status: "weird", source: "x", due: "bad", options: ["A", "", "B"], chosen: 1 }, { id: "a", title: "dup id" }, { id: "b", title: "T", chosen: 9, options: ["only"] }], NOW);
eq(p.length, 2, "duplicate ids are dropped"); eq(p[0].status, "open", "unknown status falls back to open"); eq(p[0].source, "manual"); eq(p[0].due, ""); eq(p[0].options, ["A", "B"]); eq(p[0].chosen, 1); eq(p[1].chosen, null, "an out-of-range choice is dropped");
const big = parseDecisions(Array.from({ length: 300 }, (_, i) => ({ id: `i${i}`, title: `t${i}` })), NOW); eq(big.length, MAX_DECISIONS, "capped at 200");

// ---- add, update, remove
let xs = addDecision([], { title: "Decide the corridor", owner: "Minister", due: "2026-11-05" }, NOW, "d1").list; eq(xs.length, 1); eq(xs[0].created, "2026-10-30T10:00:00.000Z");
eq(addDecision(xs, { title: "   " }, NOW, "d2").added, false, "a blank title is refused");
const k1 = addDecision(xs, { title: "From the brief", key: "pres:dec:x" }, NOW, "d2"); eq(k1.added, true); eq(addDecision(k1.list, { title: "From the brief again", key: "pres:dec:x" }, NOW, "d3").added, false, "the same key is added once");
xs = updateDecision(xs, "d1", { status: "in-progress", notes: "line 1\nline 2" }, NOW + 1000); eq(xs[0].status, "in-progress"); eq(xs[0].updated, "2026-10-30T10:00:01.000Z"); eq(xs[0].created, "2026-10-30T10:00:00.000Z", "created never changes"); eq(xs[0].notes, "line 1\nline 2");
eq(updateDecision(xs, "d1", { title: "" })[0].title, "Decide the corridor", "an invalid edit leaves the entry as it was");
eq(removeDecision(xs, "d1"), []); eq(removeDecision(xs, "zzz").length, 1);

// ---- follow-ups
xs = addFollowUp(xs, "d1", { text: "Brief the ambassador", owner: "MOFA", due: "2026-11-02" }, NOW, "f1"); eq(xs[0].followUps.length, 1); eq(xs[0].followUps[0].done, false);
eq(addFollowUp(xs, "d1", { text: "  " }, NOW, "f2")[0].followUps.length, 1, "a blank follow-up is refused");
xs = toggleFollowUp(xs, "d1", "f1", NOW); eq(xs[0].followUps[0].done, true); xs = editFollowUp(xs, "d1", "f1", { text: "Brief the ambassador in person", due: "garbage" }, NOW); eq(xs[0].followUps[0].text, "Brief the ambassador in person"); eq(xs[0].followUps[0].due, "");
xs = removeFollowUp(xs, "d1", "f1", NOW); eq(xs[0].followUps, []);

// ---- due marks
ok(isOverdue({ status: "open", due: "2026-10-29" }, NOW), "yesterday is overdue"); ok(!isOverdue({ status: "open", due: "2026-10-30" }, NOW), "today is not overdue"); ok(!isOverdue({ status: "done", due: "2026-01-01" }, NOW), "done is never overdue"); ok(!isOverdue({ status: "open", due: "" }, NOW), "no date is never overdue"); ok(!isOverdue({ status: "dropped", due: "2026-01-01" }, NOW), "dropped is never overdue");
ok(dueSoon({ status: "open", due: "2026-11-06" }, NOW), "seven days ahead is soon"); ok(!dueSoon({ status: "open", due: "2026-11-07" }, NOW), "eight days is not"); ok(dueSoon({ status: "in-progress", due: "2026-10-30" }, NOW), "today is soon"); ok(!dueSoon({ status: "open", due: "2026-10-29" }, NOW), "overdue is not soon"); ok(!dueSoon({ status: "done", due: "2026-11-01" }, NOW), "done is not soon");

// ---- summary, sort, timeline
const mix = parseDecisions([{ id: "1", title: "a", due: "2026-10-01" }, { id: "2", title: "b", due: "2026-11-02", status: "in-progress" }, { id: "3", title: "c", status: "done", due: "2026-09-01" }, { id: "4", title: "d", status: "dropped" }, { id: "5", title: "e", followUps: [{ id: "f", text: "x", done: true }, { id: "g", text: "y" }] }], NOW);
const s = summary(mix, NOW); eq([s.total, s.open, s.inProgress, s.done, s.dropped, s.overdue, s.dueSoon, s.undated, s.followUps, s.followUpsDone], [5, 2, 1, 1, 1, 1, 1, 1, 2, 1]);
eq(sortDecisions(mix, NOW).map((x) => x.id), ["1", "3", "2", "4", "5"], "overdue first, then by due date, undated last");
const tl = timeline(mix, NOW)!; eq(tl.dots.length, 3, "dropped and undated are not on the strip"); eq(tl.dots.find((d) => d.id === "1")!.kind, "overdue"); eq(tl.dots.find((d) => d.id === "2")!.kind, "soon"); eq(tl.dots.find((d) => d.id === "3")!.kind, "done"); ok(tl.today >= 0 && tl.today <= 1, "today is on the strip"); eq(timeline([], NOW), null);

// ---- candidates from the products on file
const brief = { decisions: [{ decision: "Build the corridor?", options: ["Yes, staged", "No", "Wait"], recommendation: "Yes, staged", by: "Minister of State", ifNot: "Rivals move first" }, { decision: "Open a consulate?", options: [], recommendation: "", by: "", ifNot: "" }], recommendations: [{ action: "Sign the MoU", owner: "MOFA", when: "2026-12-01" }, { action: "Send a delegation", owner: "Embassy", when: "within 60 days" }] } as unknown as PBrief;
const cands = candidatesFrom({ president: brief, choice: { 0: 2 }, king: { decisionsAsked: ["Approve the opening move"] } }); eq(cands.length, 5);
eq(cands[0].chosen, 2, "the recorded choice is carried"); eq(cands[0].owner, "Minister of State"); ok(cands[0].notes.includes("Recommendation: Yes, staged"), "the recommendation is kept in the notes"); eq(cands[1].chosen, null); eq(cands[1].options, undefined); eq(cands[2].due, "2026-12-01"); eq(cands[3].due, ""); ok(cands[3].notes.includes("within 60 days"), "a free-text date is kept in the notes, not parsed"); eq(cands[4].source, "council");
eq(candidatesFrom({ president: brief, choice: { 0: 9 } })[0].chosen, null, "an out-of-range choice is not carried"); eq(candidatesFrom({}), []); eq(candidatesFrom({ president: null, king: null }), []);
const m1 = mergeCandidates([], cands, NOW); eq(m1.added, 5); eq(m1.skipped, 0); const m2 = mergeCandidates(m1.list, cands, NOW); eq(m2.added, 0, "nothing is added twice"); eq(m2.skipped, 5);
eq(candidatesFrom({ president: brief })[0].key, candidatesFrom({ president: { ...brief, decisions: [{ ...brief.decisions[0], recommendation: "changed" }] } as PBrief })[0].key, "the key follows the decision text, not its wording around it");
eq(mergeCandidates([], [cands[0], cands[0]], NOW).added, 1, "a repeated pick in one batch is added once");

// ---- CSV
eq(csvCell('say "hi"'), '"say ""hi"""'); eq(csvCell("=HYPERLINK(\"x\")"), '"\'=HYPERLINK(""x"")"'); eq(csvCell("+1"), '"\'+1"'); eq(csvCell("-2"), '"\'-2"'); eq(csvCell("@sum"), '"\'@sum"'); eq(csvCell("a\nb"), '"a | b"'); eq(csvCell(null), '""'); eq(csvCell("2026-10-30"), '"2026-10-30"');
const csv = toCsv(m1.list, "en"); ok(csv.startsWith("﻿"), "a BOM for spreadsheets"); eq(csv.split("\r\n").length, 7, "header, five rows and the trailing break"); ok(csv.includes("Yes, staged") && csv.includes("Wait"), "options and the chosen one are in the CSV");
ok(toCsv([], "ar").includes("القرار"), "Arabic header");
const evil = parseDecisions([{ id: "e", title: "=cmd|' /C calc'!A0", owner: "@x" }], NOW); ok(toCsv(evil).includes(`"'=cmd`) && toCsv(evil).includes(`"'@x"`), "formula injection is neutralised");

// ---- JSON
const js = JSON.parse(toJson("XXX", mix, NOW)); eq(js.kind, "geo-desk-decision-log"); eq(js.decisions.length, 5); eq(js.exported, "2026-10-30T10:00:00.000Z");

// ---- ICS
const withFu = addFollowUp(parseDecisions([{ id: "q1", title: "Decide, then; act", due: "2026-11-05", owner: "Minister", notes: "line1\nline2" }, { id: "q2", title: "Dropped", due: "2026-11-06", status: "dropped" }, { id: "q3", title: "No date" }], NOW), "q1", { text: "Follow up", due: "2026-11-09" }, NOW, "ff");
const ics = toIcs("XXX", withFu, NOW); ok(ics.startsWith("BEGIN:VCALENDAR\r\n") && ics.endsWith("END:VCALENDAR\r\n"), "a calendar"); ok(!ics.includes("\n\n") && ics.split("\r\n").every((l) => !l.includes("\n")), "CRLF line ends");
eq((ics.match(/BEGIN:VEVENT/g) ?? []).length, 2, "one event for the dated decision and one for its follow-up; dropped and undated are left out");
ok(ics.includes("DTSTART;VALUE=DATE:20261105") && ics.includes("DTEND;VALUE=DATE:20261106"), "all-day event"); ok(ics.includes("UID:q1@geo-desk.XXX") && ics.includes("UID:q1-ff@geo-desk.XXX"), "stable UIDs"); ok(ics.includes("DTSTAMP:20261030T100000Z"), "UTC stamp"); ok(ics.includes("Decide\\, then\\; act"), "commas and semicolons are escaped"); ok(ics.includes("line1\\nline2"), "newlines are escaped");
eq(toIcs("XXX", withFu, NOW), toIcs("XXX", withFu, NOW), "deterministic");
const long = icsFold(`SUMMARY:${"é".repeat(80)}`); ok(long.length > 1 && long.every((l, i) => new TextEncoder().encode(l).length <= 75 && (i === 0 || l.startsWith(" "))), "folding at 75 octets, continuation lines start with a space"); eq(long.map((l, i) => (i ? l.slice(1) : l)).join(""), `SUMMARY:${"é".repeat(80)}`, "unfolding restores the line (no split character)");

// ---- PDF blocks and text
const bl = decisionBlocks(mix, NOW, "en", "Testland"); ok(bl.length >= 4 && bl.join("").includes("overdue"), "blocks"); ok(decisionBlocks([], NOW, "en", "T").join("").includes("No decisions are logged"), "an empty log says so"); ok(decisionBlocks(mix, NOW, "ar", "T").join("").includes("سجل القرارات"), "Arabic");
ok(!decisionBlocks(parseDecisions([{ id: "x", title: "<script>alert(1)</script>" }], NOW), NOW, "en", "T").join("").includes("<script>"), "titles are escaped");
ok(decisionText(m1.list, NOW, "Testland").includes("chosen: Wait"), "the text carries the choice"); ok(decisionText([], NOW, "T").includes("none logged"), "empty text");
console.log(`lab-decisions tests passed: ${n} assertions`);
