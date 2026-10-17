// Run with: npx tsx src/lib/research/normalise.test.ts
import assert from "node:assert/strict";
import { normaliseNote } from "./normalise";
const note = (order: string[]) => "# T\n\nintro\n\n" + order.map((t) => `## ${t}\nbody of ${t}\n\n---\n`).join("\n") + "\n*disclaimer*\n";
const titles = (s: string) => [...s.matchAll(/^## (.*)$/gm)].map((m) => m[1]);
// the exact live failure: 6 written before 5
const bad = note(["1. A", "2. B", "4. D", "6. F", "5. E", "7. G", "Sources"]);
assert.deepEqual(titles(normaliseNote(bad)), ["1. A", "2. B", "4. D", "5. E", "6. F", "7. G", "Sources"]);
assert.ok(normaliseNote(bad).startsWith("# T\n\nintro")); assert.ok(normaliseNote(bad).includes("body of 5. E"));
// already in order -> byte-identical (idempotent)
const good = note(["1. A", "2. B", "Sources"]); assert.equal(normaliseNote(good), good); assert.equal(normaliseNote(normaliseNote(bad)), normaliseNote(bad));
// Sources written mid-note moves to the end; double-digit numbers sort numerically (10 after 9)
assert.deepEqual(titles(normaliseNote(note(["10. J", "Sources", "9. I", "1. A"]))), ["1. A", "9. I", "10. J", "Sources"]);
// nothing lost
assert.equal(normaliseNote(bad).match(/body of/g)!.length, 7);
// notes with fewer than two sections are untouched
assert.equal(normaliseNote("just text"), "just text");
console.log("normalise: all assertions passed");
