// Tests for the Coalition and vote map rules (pure logic over the held UN, organisation and partnership files).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { feature } from "topojson-client";
import { POLES, PDF_MAP, buildPaths, buildRows, coalitionBlocks, coalitionText, distanceTrend, focalOf, friendsToAdd, mapSvg, fillFor, sharedBlocs, sortRows, summarise, votesWith, weakest, whyWinnable, type Agree, type CoalitionInputs, type Feat, type Pole } from "./lab/coalition";

let n = 0; const ok = (c: unknown, m: string) => { assert.ok(c, m); n++; }; const eq = <T,>(a: T, b: T, m: string) => { assert.deepEqual(a, b, m); n++; };

// ---- unit rules on small inputs
eq(votesWith({ USA: 80, CHN: 60, RUS: 50 }), { who: "USA", closest: 80 }, "the highest power wins");
eq(votesWith({ USA: 70, CHN: 69, RUS: 50 }).who, "between", "within 2 points of the next is between");
eq(votesWith({ USA: null, CHN: 60, RUS: 40 }).who, "CHN", "a missing pole is skipped");
eq(votesWith({ USA: null, CHN: null, RUS: null }), { who: null, closest: null }, "no poles, no answer");
const ideal = { ARE: [[2010, 0], [2011, 0], [2012, 0], [2013, 0], [2014, 0], [2015, 0], [2016, 0], [2017, 0], [2018, 0], [2019, 0]], XXX: [[2010, 2], [2011, 2], [2012, 2], [2013, 2], [2014, 2], [2015, 1], [2016, 1], [2017, 1], [2018, 1], [2019, 1]] } as Record<string, [number, number][]>;
eq(distanceTrend(ideal, "XXX"), -1, "distance fell from 2 to 1: closer"); eq(distanceTrend(ideal, "ARE"), null, "the UAE has no distance to itself"); eq(distanceTrend({ ARE: ideal.ARE.slice(0, 4), XXX: ideal.XXX.slice(0, 4) }, "XXX"), null, "too short a series is unknown, not zero");
eq(sharedBlocs({ gcc: ["ARE", "SAU"], unga: ["ARE", "SAU"], eu: ["ARE", "SAU", ...Array.from({ length: 120 }, (_, i) => `C${i}`)], oic: ["SAU"] }, "SAU"), ["gcc"], "universal and over-broad bodies are not blocs");
eq(weakest({ score: 50, c: { trade: 40, engagement: 10, agreements: 30, connectivity: 90, investment: 20, alignment: 0 } })?.key, "engagement", "the weakest tie ignores the alignment component"); eq(weakest(undefined), null, "no partnership row, no need");
const small: CoalitionInputs = { countries: [{ iso3: "ARE", name: "UAE" }, ...Array.from({ length: 10 }, (_, i) => ({ iso3: `C0${i}`, name: `C${i}` })), { iso3: "USA", name: "US" }],
  agree: { ARE: Object.fromEntries([...Array.from({ length: 10 }, (_, i) => [`C0${i}`, 0.5 + i * 0.05]), ["USA", 0.5]]), USA: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`C0${i}`, 0.5 + i * 0.04])), CHN: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`C0${i}`, 0.3])), RUS: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`C0${i}`, 0.2])) } as Record<Pole, Agree>,
  ideal: null, orgs: { gcc: ["ARE", "C09"] }, part: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`C0${i}`, { score: i < 8 ? 60 : 10, c: { trade: 10, engagement: 50, agreements: 50, connectivity: 50, investment: 50, alignment: 0 } }])) };
const sr = buildRows(small); const top = sr.find((r) => r.iso === "C09")!; const mid = sr.find((r) => r.iso === "C07")!;
ok(top.uae === 95 && top.uaeRank === 1, "agreement is in points and ranked"); ok(top.ruleA && top.winnable, "high UAE agreement and a thin partnership is winnable (rule A)"); ok(!mid.ruleA, "a thick partnership is not rule A"); ok(!sr.find((r) => r.iso === "USA")!.winnable, "a pole is never winnable");
eq(top.need?.key, "trade", "the need names the weakest component"); ok(whyWinnable(top, 60).length === 1 && /Rule A/.test(whyWinnable(top, 60)[0].en), "the rule is shown"); eq(friendsToAdd(sr).map((r) => r.iso)[0], "C09", "friends are ranked by UAE agreement");
eq(sortRows(sr, "uae", -1)[0].iso, "C09", "sort by UAE agreement"); eq(sortRows(sr, "name")[0].name, "C0", "sort by name (ascending by default)");

// ---- the held data
const rd = <T,>(f: string) => JSON.parse(readFileSync(`public/data/${f}`, "utf8")) as T;
const countries = rd<{ iso3: string; name: string; nameAr?: string; flag?: string; region?: string; num: string }[]>("countries.json");
const inp: CoalitionInputs = { countries, agree: Object.fromEntries(POLES.map((p) => [p, rd<Agree>(`un/agree/${p}.json`)])) as Record<Pole, Agree>, ideal: rd<Record<string, [number, number][]>>("un/ideal.json"), orgs: rd<{ orgs: Record<string, string[]> }>("orgs.json").orgs, part: rd<{ countries: CoalitionInputs["part"] }>("partnership.json").countries };
const rows = buildRows(inp); const sum = summarise(rows, inp); const friends = friendsToAdd(rows);
ok(rows.length >= 190 && rows.every((r) => r.iso !== "ARE"), "a row for every country but the UAE"); ok(sum.withUae >= 180, `most countries have a UAE share (${sum.withUae})`);
ok(rows.every((r) => r.uae == null || (r.uae >= 0 && r.uae <= 100)), "shares are percentages"); ok(sum.winnable > 0 && sum.winnable < rows.length / 2, `winnable is a minority (${sum.winnable})`); ok(friends.length === sum.friends, "friends equal the winnable list");
ok(friends.every((r, i) => i === 0 || friends[i - 1].uae! >= r.uae!), "friends are sorted"); ok(friends.every((r) => r.ruleA || r.ruleB), "every friend has a rule");
const sau = rows.find((r) => r.iso === "SAU")!; ok(sau.shared.includes("gcc") && sau.uae != null && sau.uae > 70, "Saudi Arabia shares the GCC and votes with the UAE");
const f = focalOf(rows, "SAU", inp.agree.USA ?? null, [{ iso: "QAT", name: "Qatar" }, { iso: "ARE", name: "UAE" }]); ok(f && f.neighbours.length === 1 && f.of > 150, "the focal card lists neighbours except the UAE"); ok(f!.sharedNames.includes("GCC"), "the focal card names shared blocs");
// the map
const topo = rd<never>("countries-50m.json"); const byNum = new Map(countries.map((c) => [c.num, c])); const fc = feature(topo, (topo as { objects: { countries: never } }).objects.countries) as unknown as { features: { id: string; geometry: Feat["geometry"] }[] };
const feats: Feat[] = fc.features.flatMap((x) => { const c = byNum.get(String(x.id).padStart(3, "0")); return c ? [{ properties: { iso3: c.iso3 }, geometry: x.geometry }] : []; });
const m = buildPaths(feats, PDF_MAP); const svg = mapSvg(m, fillFor(rows, "agree"), { outline: "SAU" });
ok(m.paths.size > 150 && m.paths.has("SAU") && m.paths.has("RUS"), "paths for the countries"); ok(svg.length < 150_000, `the PDF map is light (${Math.round(svg.length / 1000)} KB)`); ok(svg.startsWith("<svg") && svg.includes("stroke-width=\"1.4\""), "the focal country is outlined");
const blocks = coalitionBlocks({ L: "en", rows, sum, mapHtml: svg, focal: f, friends, mode: "agree" }); ok(blocks.length >= 6 && blocks.join("").includes("Friends the UAE could add"), "report blocks");
const ar = coalitionBlocks({ L: "ar", rows, sum, mapHtml: svg, focal: f, friends, mode: "votes" }); ok(ar.join("").includes("أصدقاء"), "Arabic blocks");
ok(/Coalition and vote map/.test(coalitionText({ rows, sum, focal: f, friends })) && /not a prediction/.test(coalitionText({ rows, sum, focal: null, friends })), "text for the agents carries the caveat");
console.log(`lab-coalition tests: ${n} passed; ${rows.length} countries, ${sum.winnable} winnable, svg ${Math.round(svg.length / 1000)} KB`);
