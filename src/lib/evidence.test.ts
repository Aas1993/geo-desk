// Tests for the governance and society cross-checks: the agreement rules, the two built data files, and the evidence fact the councils read.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { govReading, socReading, position, latestPer, publishers, type GovData, type SocData, type Item } from "./evidence";
import { evidenceFact } from "./evidence-server";

// positions: the WGI score already is a percentile; other sources are placed by their published rank
assert.equal(position({ s: "wgi", v: 71.3, y: 2025 }), 71.3);
assert.equal(position({ s: "cpi", v: 89, y: 2025, r: 1, n: 182 }), 100); assert.equal(position({ s: "cpi", v: 9, y: 2025, r: 182, n: 182 }), 0);
assert.equal(position({ s: "cpi", v: 50, y: 2025 }), null, "no rank, no position: a gap stays a gap");

// governance agreement: within 15 points agree, within 30 close, beyond differ; one source cannot be cross-checked
const g = (...p: [string, number][]): Item[] => p.map(([s, rank]) => ({ s, v: 0, y: 2025, r: rank, n: 101 }));
assert.equal(govReading([]).verdict, "none"); assert.equal(govReading(undefined).verdict, "none");
assert.equal(govReading([{ s: "wgi", v: 40, y: 2025 }]).verdict, "single");
assert.equal(govReading([{ s: "wgi", v: 40, y: 2025 }, ...g(["a", 51])]).verdict, "agree", "40 vs 50 is within 15 points");
assert.equal(govReading([{ s: "wgi", v: 40, y: 2025 }, ...g(["a", 41])]).verdict, "close", "40 vs 60 is within 30 points");
assert.equal(govReading([{ s: "wgi", v: 20, y: 2025 }, ...g(["a", 41])]).verdict, "differ", "20 vs 60 is further apart");
assert.equal(govReading([{ s: "wgi", v: 40, y: 2025 }, { s: "x", v: 3, y: 2025 }]).used.length, 1, "an item with no rank is left out of the comparison, not read as zero");

// society agreement, in the metric's own unit, with older readings shown but not compared
const it = (s: string, v: number, y: number): Item => ({ s, v, y });
assert.equal(socReading("le", [it("wb", 83.1, 2024), it("undp", 82.9, 2023)]).verdict, "agree");
assert.equal(socReading("le", [it("wb", 83.1, 2024), it("fb", 79.9, 2024)]).verdict, "differ", "a 3.2-year gap in life expectancy is a difference worth showing");
assert.equal(socReading("le", [it("wb", 83.1, 2024), it("fb", 81.5, 2024)]).verdict, "close");
assert.equal(socReading("lit", [it("wb", 98.8, 2024), it("fb", 91, 2010)]).verdict, "single", "a reading more than 5 years older is listed, not compared");
assert.deepEqual(socReading("lit", [it("wb", 98.8, 2024), it("fb", 91, 2010)]).older, ["fb"]);
assert.equal(socReading("hdi", [it("undp", 0.94, 2023)]).verdict, "single");
assert.deepEqual(latestPer([it("a", 1, 2020), it("a", 2, 2023), it("b", 3, 2019)]).map((x) => `${x.s}${x.y}`).sort(), ["a2023", "b2019"]);
assert.equal(publishers(["vdem_elec", "vdem_lib", "cpi", "wgi"], { vdem_elec: { family: "vdem" }, vdem_lib: { family: "vdem" }, cpi: {}, wgi: {} } as never), 3, "four V-Dem indices are one publisher");

// the built files
const read = <T,>(f: string) => JSON.parse(readFileSync(new URL(`../../public/data/${f}`, import.meta.url), "utf8")) as T;
const iso = new Set(read<{ iso3: string }[]>("countries.json").map((c) => c.iso3));
const gov = read<GovData>("governance-sources.json"), soc = read<SocData>("society-sources.json"), wgi = read<{ year: number; countries: Record<string, Record<string, number>> }>("governance.json");
for (const [name, d] of [["governance", gov], ["society", soc]] as const) {
  assert.ok(Object.keys(d.countries).length >= 170, `${name}: coverage`);
  for (const [id, s] of Object.entries(d.sources)) {
    assert.equal(s.id, id); for (const k of ["name", "publisher", "url", "licence", "basis"] as const) assert.ok(typeof s[k] === "string" && s[k].length > 3, `${name}.${id}: ${k}`);
    assert.ok(/^https:\/\//.test(s.url) && s.year >= 2023 && s.rows >= 100 && (s.kind === "primary" || s.kind === "republisher"), `${name}.${id}: metadata`);
  }
  assert.ok(d.unavailable.length >= 2 && d.unavailable.every((u) => u.name && /^https:\/\//.test(u.url) && u.reason.length > 20), `${name}: unavailable sources carry a reason`);
  for (const [k, c] of Object.entries(d.countries)) { assert.ok(iso.has(k), `${name}: unknown country ${k}`); for (const [m, items] of Object.entries(c as Record<string, Item[]>)) for (const i of items) { assert.ok(d.sources[i.s], `${name}.${k}.${m}: unknown source ${i.s}`); assert.ok(Number.isFinite(i.v) && i.y >= 1970, `${name}.${k}.${m}.${i.s}: value`); } }
}
// governance: at least three independent publishers beyond the WGI, every dimension keeps the WGI, and the WGI copy equals governance.json
const govSources = Object.values(gov.sources).filter((s) => s.id !== "wgi");
assert.ok(publishers(govSources.map((s) => s.id), gov.sources) >= 3, "at least three publishers beside the World Bank");
for (const s of ["cpi", "rsf", "vdem_elec", "vdem_lib", "vdem_civ", "vdem_rule"]) assert.ok(gov.sources[s]?.rows >= 150, `governance source ${s} is held`);
for (const [k, c] of Object.entries(gov.countries)) for (const d of ["cc", "va", "rl"] as const) { const w = c[d]?.find((i) => i.s === "wgi"); if (w) assert.equal(w.v, wgi.countries[k][d], `${k} ${d}: WGI copy matches governance.json`); }
const are = gov.countries.ARE; assert.equal(are.cc!.find((i) => i.s === "cpi")!.v, 69, "UAE CPI 2025 is 69 as Transparency International published"); assert.ok(are.va!.length >= 4 && are.rl!.length >= 2);
for (const [k, c] of Object.entries(gov.countries)) for (const i of c.cc ?? []) if (i.s === "cpi") assert.ok(i.v >= 0 && i.v <= 100 && i.r! >= 1 && i.r! <= i.n!, `${k}: CPI in range`);
// society: the baseline plus at least three other publishers; life expectancy for the UAE is held by several, and the factbook gap is kept visible rather than smoothed
const socOthers = Object.values(soc.sources).filter((s) => s.id !== "wb"); assert.ok(socOthers.length >= 3, "at least three sources beside the World Bank");
assert.ok(soc.countries.ARE.le!.length >= 3 && soc.countries.ARE.lit!.length >= 2 && soc.countries.ARE.net!.length >= 2);
for (const c of Object.values(soc.countries)) { for (const i of c.le ?? []) assert.ok(i.v > 30 && i.v < 95, "life expectancy in range"); for (const m of ["lit", "net"] as const) for (const i of c[m] ?? []) assert.ok(i.v >= 0 && i.v <= 100.01, `${m} in range`); }

// the evidence fact the councils read
const run = async () => {
  const f = await evidenceFact("EGY", "Egypt"); assert.ok(f && f.kind === "evidence", "Egypt has an evidence fact");
  for (const w of ["Transparency International", "Reporters Without Borders", "V-Dem", "World Bank", "Life expectancy", "Not available", "Freedom House"]) assert.ok(f!.text.includes(w) || f!.src.includes(w), `fact mentions ${w}`);
  assert.ok(/political stability/i.test(f!.text) && /no independent source/.test(f!.text), "the single-source dimensions are named as gaps");
  assert.equal(await evidenceFact("ZZZ", "Nowhere"), null, "no data, no fact");
  console.log("evidence tests passed");
};
run();
