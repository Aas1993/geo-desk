// Tests for the clip tray: add, de-dupe, cap, reorder, annotate, defensive parsing, the text and HTML the reports read.
import assert from "node:assert/strict";
import { MAX_CLIPS, MAX_NOTE, addClip, annotateClip, clipsFact, clipsHtml, clipsMarkdown, clipsText, moveClip, parseClips, removeClip, type Clip } from "./clips";

const mk = (id: string, over: Partial<Clip> = {}): Omit<Clip, "at" | "note"> => ({ id, iso: "JOR", text: `Item ${id}`, source: "Reuters", url: "https://example.com/a", date: "2026-10-28", angle: "economy", kind: "news", tone: "neutral", ...over });
const now = new Date("2026-10-30T10:00:00Z");
let xs: Clip[] = [];
for (const id of ["a", "b", "c"]) xs = addClip(xs, mk(id), now).list;
assert.deepEqual(xs.map((x) => x.id), ["a", "b", "c"]); assert.equal(xs[0].at, "2026-10-30T10:00:00.000Z");
assert.equal(addClip(xs, mk("a"), now).added, false, "the same item is never clipped twice"); assert.equal(addClip(xs, mk("a"), now).list.length, 3);
assert.deepEqual(moveClip(xs, "c", -1).map((x) => x.id), ["a", "c", "b"]); assert.deepEqual(moveClip(xs, "a", -1).map((x) => x.id), ["a", "b", "c"], "the end stays put"); assert.deepEqual(moveClip(xs, "c", 1), xs);
assert.deepEqual(removeClip(xs, "b").map((x) => x.id), ["a", "c"]);
assert.equal(annotateClip(xs, "b", "x".repeat(900)).find((x) => x.id === "b")!.note.length, MAX_NOTE, "a note is capped");
let big: Clip[] = []; for (let i = 0; i < MAX_CLIPS + 5; i++) big = addClip(big, mk(`k${i}`), now).list; assert.equal(big.length, MAX_CLIPS); assert.equal(addClip(big, mk("zz"), now).full, true);
// defensive parsing: junk, duplicates, bad urls and tones are dropped or cleaned
const parsed = parseClips([{ id: "a", text: "ok", source: "S", url: "javascript:alert(1)", date: "2026-01-01", angle: "security", tone: "weird" }, { id: "a", text: "dup" }, { text: "no id" }, null, "str", { id: "b", text: "  \u0000spaced   out  ", tone: "risk" }], "JOR");
assert.equal(parsed.length, 2); assert.equal(parsed[0].url, undefined, "a non-http link is dropped"); assert.equal(parsed[0].tone, undefined); assert.equal(parsed[1].text, "spaced out"); assert.equal(parsed[1].tone, "risk");
assert.deepEqual(parseClips("nope", "JOR"), []);
// the text for the agents
const t = clipsText(addClip(xs, { ...mk("d", { tone: "risk" }), note: "ask about this" }, now).list); assert.ok(t.includes("marked risk") && t.includes("Desk note: ask about this") && t.includes("https://example.com/a"));
const capped = clipsText(xs, 120); assert.ok(capped.includes("more clips not shown"), "the size cap says what it dropped"); assert.ok(capped.length < 260);
assert.equal(clipsFact([]), ""); assert.ok(clipsFact(xs).startsWith("Field updates clipped by the desk") && clipsFact(xs).includes("not verified by the platform"));
// the report sections: labelled, escaped, empty when there are no clips
assert.equal(clipsHtml([]), ""); const h = clipsHtml([{ ...xs[0], text: "<b>x</b> & y", note: "n<script>" }], "en"); assert.ok(h.includes("Field updates clipped by the desk") && h.includes("&lt;b&gt;x&lt;/b&gt; &amp; y") && !h.includes("<script>"));
assert.ok(clipsHtml(xs, "ar").includes("مستجدات ميدانية انتقاها المكتب")); assert.ok(clipsMarkdown(xs, "en", "Jordan").startsWith("# Field updates clipped by the desk: Jordan"));
console.log("clips.test.ts: all assertions passed");
