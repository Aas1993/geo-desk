// Tests for the technology data helpers, the source mix and the President's technology part.
import assert from "node:assert/strict";
import { complementarities, TECH_KEYS } from "./tech";
import { classifySource, sourceMix } from "./sourcemix";
import { parsePresident } from "./desk/president";
import { presidentHtml } from "./bird/presidentHtml";

const pt = (v: number, pct: number) => ({ v, y: 2024, pct });
const uae = { net: pt(100, 98), bb: pt(40, 90), mob: pt(200, 98), srv: pt(4000, 64), rd: pt(1.5, 81), res: pt(2600, 73), hte: pt(9, 60), pat: pt(278, 65) };
const gapC = { net: pt(60, 40), bb: pt(2, 20), mob: pt(90, 40), srv: pt(20, 10), rd: pt(0.2, 20), res: pt(100, 20), hte: pt(1, 10), pat: pt(2, 10) };
const g = complementarities(gapC, uae, "Gapland"); assert.ok(g.some((c) => c.kind === "uae-helps" && c.key.includes("bb")) && g.some((c) => c.kind === "uae-helps" && c.key.includes("rd")), "a connectivity gap and an innovation gap are leads for UAE help");
const strong = { ...uae, res: pt(5000, 95), hte: pt(40, 95), bb: pt(35, 85), srv: pt(3000, 60), mob: pt(180, 90) }; const s = complementarities(strong, uae, "Techland"); assert.ok(s.some((c) => c.kind === "country-helps" && c.key.includes("res")) && s.some((c) => c.kind === "country-helps" && c.key.includes("hte")), "research talent and tech exports above the UAE are leads for the country to help the UAE"); assert.ok(!s.some((c) => c.kind === "uae-helps"), "no gap, no UAE-helps lead");
assert.deepEqual(complementarities(null, uae, "x"), []); assert.equal(TECH_KEYS.length, 8); assert.ok(g.every((c) => c.en && c.ar), "bilingual");
// the source mix: what a run read, grouped by the domain
assert.equal(classifySource("https://www.imf.org/en/Publications/WEO"), "institution"); assert.equal(classifySource("https://www.chathamhouse.org/2026/x"), "thinktank"); assert.equal(classifySource("https://www.reuters.com/world/x"), "news"); assert.equal(classifySource("https://www.wam.ae/en/article/x"), "uae"); assert.equal(classifySource("https://planning.gov.jo/x"), "official"); assert.equal(classifySource("https://random-blog.example/x"), "other"); assert.equal(classifySource("not a url"), "other");
const m = sourceMix([{ url: "https://www.imf.org/a" }, { url: "https://www.imf.org/a" }, { url: "https://carnegieendowment.org/b" }, { url: "https://reuters.com/c" }]); assert.equal(m.total, 3, "duplicates count once"); assert.deepEqual(m.mix.map((x) => x.kind), ["institution", "thinktank", "news"]);
// the President's technology part
const base = { headline: "h", bottomLine: "b", scorecard: [{ dim: "technology", status: "mixed", reading: "r" }], technology: { level: "advanced", summary: "A fast-growing hub", dataCentres: "120 MW (2025)", aiReadiness: "strategy 2024", research: "r", connectivity: "c", uaeCanHelp: ["cloud"], countryCanHelp: ["talent"], exportImport: "export-controlled chips need a licence", companyMatches: [{ direction: "uae-in-country", uae: "G42", counterpart: "LocalCo", play: "build a data centre", status: "verified" }, { direction: "bogus", uae: "e&", counterpart: "", play: "p", status: "maybe" }] } };
const p = parsePresident(`<president>${JSON.stringify(base)}</president>`)!; assert.equal(p.scorecard[0].dim, "technology", "technology is a front of the scorecard"); assert.equal(p.technology!.companyMatches[1].direction, "uae-in-country", "an unknown direction falls back"); assert.equal(p.technology!.companyMatches[1].status, "candidate", "an unverified link is a candidate"); assert.equal(p.technology!.level, "advanced");
const html = presidentHtml(p, "en", { title: "T", country: "X", foot: "f", classification: "c", date: "d", choice: {}, directive: "" }); assert.equal((html.match(/class="pg"/g) ?? []).length, 4, "a technology annex page is added (no playbook here)"); assert.ok(html.includes("G42") && html.includes("candidate") && html.includes("120 MW"));
assert.equal(parsePresident(`<president>${JSON.stringify({ headline: "h" })}</president>`)!.technology, null, "no technology part, none shown");
console.log("tech: all checks passed");
