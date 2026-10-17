// Run with: npx tsx src/lib/flights.test.ts
// Guards the committed flights snapshot against a broken scrape or a bad merge.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { FlightData } from "./flights-client";
const read = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const d = read("../../public/data/flights.json") as FlightData; const iso = new Set((read("../../public/data/countries.json") as { iso3: string }[]).map((c) => c.iso3));
const e = Object.entries(d.countries); assert.ok(e.length >= 80, `only ${e.length} countries`);
const live = e.reduce((n, [, c]) => n + c.counts.active + c.counts.seasonal, 0); assert.ok(live >= 250, `only ${live} live destinations`);
for (const [k, c] of e) { assert.ok(iso.has(k), `unknown country ${k}`); assert.ok(!c.destinations.some((x) => !x.iata || !/^[A-Z]{3}$/.test(x.iata)), `${k}: bad IATA`); assert.equal(c.counts.active + c.counts.seasonal + c.counts.charter + c.counts.future + c.counts.suspended, c.destinations.length, `${k}: counts do not add up`); }
for (const k of ["IND", "GBR", "USA", "SAU", "PAK", "EGY"]) assert.ok((d.countries[k]?.counts.active ?? 0) >= 3, `${k} should have several active destinations`);
assert.ok(["DXB", "AUH", "SHJ"].every((a) => d.revisions[a]), "missing page revisions");
console.log("flights: all assertions passed");
