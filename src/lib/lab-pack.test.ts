// Tests for the briefing-pack builder: ordering, the cover, the contents, section anchors, heading demotion, and the closing page that names what is not on file.
import assert from "node:assert/strict";
import { GROUP_LABEL, buildPack, demote, markdownSection, moveSection, productSection, type PackSection } from "./lab/pack";

const mk = (id: string, group: PackSection["group"], title: string, at: string | null = "2026-10-20T10:00:00Z"): PackSection => ({ id, group, title, sub: "", at, blocks: [`<p>body of ${id}</p>`] });
const xs = [mk("a", "playbook", "Playbook", null), mk("b", "products", "Council"), mk("c", "field", "Field updates")];
assert.deepEqual(moveSection(xs, "c", -1).map((x) => x.id), ["a", "c", "b"]); assert.deepEqual(moveSection(xs, "a", -1).map((x) => x.id), ["a", "b", "c"], "the top stays put"); assert.deepEqual(moveSection(xs, "zz", 1), xs);
assert.equal(demote("# One\n## Two\n### Three\n#### Four\ntext # not a heading"), "## One\n### Two\n#### Three\n#### Four\ntext # not a heading");
const pack = buildPack({ country: "Jordan", flag: "🇯🇴", L: "en", date: "2026-10-30", sections: xs, missing: ["The Ministry's Council"] });
assert.equal(pack.title, "Briefing pack: Jordan"); assert.ok(pack.blocks[0].includes("Jordan") && pack.blocks[0].includes("3 sections"));
const html = pack.blocks.join("\n"); assert.ok(html.includes('href="#pk-b"') && html.includes('id="pk-b"'), "the contents link to the section anchors"); assert.ok(html.indexOf("body of a") < html.indexOf("body of c"), "sections follow the order given");
assert.ok(html.includes("current") && html.includes("2026-10-20"), "a section shows its date, or 'current' for a rule-built one"); assert.ok(html.includes("Asked for but not on file") && html.includes("The Ministry&#39;s Council"), "the closing page names what is missing, escaped");
assert.equal((html.match(/<h1 class="part"/g) ?? []).length, 3 + 2, "contents, one per section and the closing page start pages");
assert.ok(buildPack({ country: "Jordan", L: "en", date: "d", sections: xs, missing: [] }).blocks.join("").includes("Everything asked for is in the pack"));
const ar = buildPack({ country: "الأردن", L: "ar", date: "2026-10-30", sections: xs, missing: [] }); assert.equal(ar.title, "حزمة إحاطة: الأردن"); assert.ok(ar.blocks.join("").includes(GROUP_LABEL.playbook.ar));
assert.ok(buildPack({ country: "X", L: "en", date: "d", sections: [], missing: [], purpose: "For the 4 November meeting" }).blocks[0].includes("For the 4 November meeting"), "a purpose line replaces the default bottom line");
const md = markdownSection({ id: "m", group: "bird", title: "Bird", sub: "", at: null, md: "# Heading\n\n- a point" }); assert.ok(md.blocks[0].includes("<h2") && !md.blocks[0].includes('<h1 class="part"'));
const ps = productSection({ id: "p", kind: "mofa-council", title: "The Ministry's Council", report: "# Foreign Policy Brief\n\nThe bottom line is clear.\n\n# Role Reports\n\nlong annex", at: "2026-10-01T09:00:00Z", usd: 0.84, lang: "en", L: "en" });
assert.equal(ps.group, "products"); const ph = ps.blocks.join(""); assert.ok(ph.includes("The bottom line is clear") && !ph.includes("long annex"), "the role-by-role annex is left out"); assert.ok(ph.includes("US$0.84") && !ph.includes('<h1 class="part"'));
console.log("lab-pack.test.ts: all assertions passed");
