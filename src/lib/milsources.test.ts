// Tests for the military-spending corroboration: the comparison rules, and the built data file.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { compareMeasure, sameChain, wbItems, WB_SRC, independentPublishers, type MilSources, type MItem } from "./milsources";

const S = { a: { id: "a" }, b: { id: "b" }, imf_gfs: { id: "imf_gfs" }, eurostat_cofog: { id: "eurostat_cofog" } } as unknown as MilSources["sources"];
for (const k of Object.keys(S)) Object.assign(S[k], { name: k, publisher: k, basis: "", kind: "primary", url: "https://x", status: "ok", rows: 1 });
// agreement uses the same rules as the trade cross-check
assert.equal(compareMeasure([{ s: "a", y: 2024, usd: 100 }, { s: "b", y: 2024, usd: 108 }], S, "usd").reading.verdict, "agree");
assert.equal(compareMeasure([{ s: "a", y: 2024, usd: 100 }, { s: "b", y: 2024, usd: 300 }], S, "usd").reading.verdict, "differ");
assert.equal(compareMeasure([{ s: "a", y: 2024, usd: 100 }], S, "usd").reading.verdict, "single");
assert.equal(compareMeasure([], S, "usd").reading.verdict, "none");
// the year is the one with the most independent publishers, and a source in another year is listed but not compared
let r = compareMeasure([{ s: "a", y: 2025, usd: 120 }, { s: "a", y: 2024, usd: 100 }, { s: "b", y: 2024, usd: 104 }], S, "usd");
assert.equal(r.year, 2024); assert.equal(r.reading.verdict, "agree"); assert.equal(r.rows.filter((x) => x.counted).length, 2);
r = compareMeasure([{ s: "a", y: 2025, usd: 120 }, { s: "b", y: 2023, usd: 100 }], S, "usd"); assert.equal(r.year, 2025, "ties go to the latest year"); assert.equal(r.rows.find((x) => x.src.id === "b")!.why, "other-year");
// a measure one source does not carry is a gap, not a zero
r = compareMeasure([{ s: "a", y: 2024, usd: 100, gdp: 2 }, { s: "b", y: 2024, usd: 101 }], S, "gdp"); assert.equal(r.reading.verdict, "single"); assert.equal(r.rows.length, 1);
// the World Bank republishes SIPRI: shown, never counted
const wb = wbItems([{ y: 2024, v: 5_000_000_000 }, { y: 2010, v: 1 }], [{ y: 2024, v: 2.5 }]); assert.deepEqual(wb, [{ s: WB_SRC.id, y: 2024, usd: 5000, gdp: 2.5 }], "dollars become millions; old years are dropped");
r = compareMeasure([...wb, { s: "a", y: 2024, usd: 5000 }], S, "usd"); assert.equal(r.reading.verdict, "single", "one independent source beside a republisher is still one source"); assert.equal(r.rows.find((x) => x.src.id === WB_SRC.id)!.why, "republisher");
// the IMF and Eurostat carry the same data for EU members: the second is not a second opinion
const imf: MItem = { s: "imf_gfs", y: 2024, usd: 63409.1, gdp: 1.35 }, es: MItem = { s: "eurostat_cofog", y: 2024, usd: 63409.1, gdp: 1.4 };
assert.ok(sameChain(imf, es) && sameChain(es, imf)); assert.ok(!sameChain(imf, { ...es, usd: 80000 }), "a different amount is a different reading"); assert.ok(!sameChain(imf, { ...es, y: 2023 }));
r = compareMeasure([imf, es], S, "usd"); assert.equal(r.reading.verdict, "single"); assert.equal(r.rows.find((x) => x.src.id === "eurostat_cofog")!.why, "same");

// the built file
const m = JSON.parse(readFileSync(new URL("../../public/data/military-sources.json", import.meta.url), "utf8")) as MilSources;
const countries = new Set((JSON.parse(readFileSync(new URL("../../public/data/countries.json", import.meta.url), "utf8")) as { iso3: string }[]).map((x) => x.iso3));
const used = new Set<string>();
for (const [iso, items] of Object.entries(m.countries)) { assert.ok(countries.has(iso), `unknown country ${iso}`);
  for (const i of items) { used.add(i.s); assert.ok(m.sources[i.s], `${iso}: source ${i.s} is not in the registry`); assert.ok(i.y >= 2020 && i.y <= 2030, `${iso} ${i.s}: odd year ${i.y}`);
    assert.ok(i.usd == null || (Number.isFinite(i.usd) && i.usd >= 0 && i.usd < 2_000_000), `${iso} ${i.s} ${i.y}: US$${i.usd}m is implausible`); assert.ok(i.gdp == null || (i.gdp >= 0 && i.gdp < 40), `${iso} ${i.s} ${i.y}: ${i.gdp}% of GDP is implausible (a fraction not scaled to percent?)`); } }
for (const s of Object.values(m.sources)) { assert.ok(/^https:\/\//.test(s.url) && s.name && s.publisher && s.basis, `${s.id}: needs a name, publisher, basis and https link`); if (s.status === "ok") assert.ok(s.rows > 0, `${s.id}: ok but empty`); }
for (const id of used) assert.equal(m.sources[id].status, "ok", `${id} has data but is marked failed`);
for (const u of m.unavailable) assert.ok(u.name && u.reason && /^https:\/\//.test(u.url), `unavailable source ${u.name} needs a reason and link`);
assert.ok(independentPublishers(m).length >= 4, "fewer than four independent publishers");
assert.ok(Object.keys(m.countries).length >= 120, "too few countries");
// gaps stay gaps: SIPRI publishes no UAE figure, so none may appear, and the second reading is the IMF's
assert.ok(!m.countries.ARE.some((i) => i.s === "sipri"), "SIPRI has no UAE figure and none may be invented"); assert.ok(m.countries.ARE.some((i) => i.s === "imf_gfs" && i.usd! > 3000 && i.usd! < 30000), "the IMF holds a UAE defence figure");
assert.ok(m.gaps.ARE?.note, "the UAE gap is explained");
// spot checks against the sources' own published numbers: SIPRI's US figure is ~US$1.0 trillion in 2024, and the Treasury's FY2024 national-defense outlays were ~US$874bn
const us = m.countries.USA; assert.ok(Math.abs(us.find((i) => i.s === "sipri" && i.y === 2024)!.usd! / 1_000_000 - 1.0) < 0.05); assert.ok(Math.abs(us.find((i) => i.s === "ust_mts" && i.y === 2024)!.usd! - 874_041) < 5);
assert.ok(Math.abs(us.find((i) => i.s === "sipri" && i.y === 2024)!.gdp! - 3.43) < 0.1, "SIPRI's share of GDP is stored as a percent");
console.log(`milsources: all assertions passed (${independentPublishers(m).length} publishers, ${Object.keys(m.countries).length} countries)`);
