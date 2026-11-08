// Tests for the trade and investment cross-check: the reconciliation rules, and the built data file.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reconcile, latestPer, fresh, distinctPublishers, type Crosscheck } from "./crosscheck";

// agreement rules
assert.equal(reconcile([]).verdict, "none");
assert.equal(reconcile([{ s: "a", y: 2024, v: 100 }]).verdict, "single");
assert.equal(reconcile([{ s: "a", y: 2024, v: 100 }, { s: "b", y: 2024, v: 110 }]).verdict, "agree");
assert.equal(reconcile([{ s: "a", y: 2024, v: 100 }, { s: "b", y: 2024, v: 140 }]).verdict, "close");
assert.equal(reconcile([{ s: "a", y: 2024, v: 100 }, { s: "b", y: 2024, v: 340 }]).verdict, "differ");
const z = reconcile([{ s: "imf", y: 2024, v: 0 }, { s: "oecd", y: 2024, v: 2966 }, { s: "eu", y: 2024, v: 3033 }]);
assert.deepEqual(z.zero, [{ s: "imf", y: 2024 }], "a zero beside real figures is listed, not averaged in"); assert.equal(z.used.length, 2); assert.equal(z.verdict, "agree"); assert.equal(Math.round(z.median!), Math.round((2966 + 3033) / 2));
assert.equal(reconcile([{ s: "a", y: 2024, v: 0 }]).verdict, "single", "a lone zero is one source saying nothing, not a cross-check");
assert.equal(reconcile([{ s: "a", y: 2024, v: -5 }, { s: "b", y: 2024, v: null }]).verdict, "none", "negatives and gaps are ignored");
assert.equal(reconcile([{ s: "a", y: 1, v: 1 }, { s: "b", y: 1, v: 2 }, { s: "c", y: 1, v: 3 }]).median, 2); assert.equal(reconcile([{ s: "a", y: 1, v: 1 }, { s: "b", y: 1, v: 3 }]).median, 2);
assert.deepEqual(latestPer([{ s: "a", y: 2023 }, { s: "a", y: 2024 }, { s: "b", y: 2022 }]).map((x) => `${x.s}${x.y}`).sort(), ["a2024", "b2022"], "one reading per source, the latest");

assert.deepEqual(fresh([{ s: "a", y: 2010 }, { s: "b", y: 2023 }, { s: "c", y: 2024 }], 2024).map((x) => x.s), ["b", "c"], "a reading more than two years older than the target year is shown but not compared");

// the built file
const c = JSON.parse(readFileSync(new URL("../../public/data/crosscheck.json", import.meta.url), "utf8")) as Crosscheck;
const countries = new Set((JSON.parse(readFileSync(new URL("../../public/data/countries.json", import.meta.url), "utf8")) as { iso3: string }[]).map((x) => x.iso3));
const used = new Set<string>();
for (const [kind, block] of [["trade", c.trade], ["invest", c.invest]] as const) {
  for (const [iso, items] of Object.entries(block.countries)) {
    assert.ok(countries.has(iso) && iso !== "ARE", `${kind}: unknown country ${iso}`);
    for (const i of items) { used.add(i.s); assert.ok(c.sources[i.s], `${kind} ${iso}: source ${i.s} is not in the registry`); assert.equal(c.sources[i.s].measure, kind, `${i.s} filed under the wrong measure`); assert.ok(i.y >= 2000 && i.y <= 2026, `${kind} ${iso} ${i.s}: year ${i.y}`);
      // a net investment position can be negative; trade cannot
      for (const v of Object.values(i).filter((x) => typeof x === "number")) assert.ok(Number.isFinite(v) && (kind === "invest" || v >= 0), `${kind} ${iso} ${i.s}: bad value`); }
  }
  for (const w of block.world) { used.add(w.s); assert.ok(c.sources[w.s], `world source ${w.s} missing from the registry`); }
}
for (const s of Object.values(c.sources)) { assert.ok(/^https:\/\//.test(s.url), `${s.id}: needs an https link`); assert.ok(s.name && s.publisher && s.basis, `${s.id}: unlabelled`); if (s.status === "ok") assert.ok(s.rows > 0, `${s.id}: ok but no rows`); }
for (const id of used) assert.equal(c.sources[id].status, "ok", `${id} has data but is marked failed`);
for (const u of c.unavailable) assert.ok(u.name && u.reason && /^https:\/\//.test(u.url), `unavailable source ${u.name} needs a reason and link`);
assert.ok(distinctPublishers(c).length >= 8, `only ${distinctPublishers(c).length} publishers are in the file`);
assert.ok(Object.keys(c.trade.countries).length >= 150 && Object.keys(c.invest.countries).length >= 60, "too few countries");
// the headline series the app uses must sit in the file unchanged
const trade = JSON.parse(readFileSync(new URL("../../public/data/trade.json", import.meta.url), "utf8")) as { countries: Record<string, { a: number[][] }> };
const ind = c.trade.countries.IND.find((i) => i.s === "imts_uae")!; const ia = trade.countries.IND.a.find((a) => a[0] === ind.y)!; assert.equal(ind.x, ia[1]); assert.equal(ind.m, ia[2]);
// the totals must be the right order of magnitude (US$ millions)
for (const w of c.trade.world) for (const v of [w.x, w.m]) if (v != null) assert.ok(v > 100_000 && v < 1_500_000, `${w.s}: UAE goods trade ${v}m is implausible`);
for (const w of c.invest.world.filter((x) => x.kind === "stock")) for (const v of [w.out, w.in]) if (v != null) assert.ok(v > 100_000 && v < 1_000_000, `${w.s}: UAE FDI stock ${v}m is implausible`);
console.log(`crosscheck: all assertions passed (${distinctPublishers(c).length} publishers, ${Object.keys(c.trade.countries).length} trade and ${Object.keys(c.invest.countries).length} investment countries)`);
