// Run with: npx tsx src/lib/investment.test.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { InvestmentData } from "./investment-client";
const read = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const d = read("../../public/data/investment.json") as InvestmentData; const iso = new Set((read("../../public/data/countries.json") as { iso3: string }[]).map((c) => c.iso3));
const e = Object.entries(d.countries); assert.ok(e.length >= 80, `only ${e.length} countries`); assert.ok(d.world.usd > 5e10 && d.world.year >= 2022, "world total looks wrong");
for (const [k, c] of e) { assert.ok(iso.has(k), `unknown country ${k}`); for (const p of [c.outward, c.inward]) if (p) { assert.ok(Number.isFinite(p.usd) && p.year >= 2005 && p.year <= 2030, `${k}: bad position`); } }
const ranks = e.filter(([, c]) => c.outward?.rank).map(([, c]) => c.outward!.rank!).sort((a, b) => a - b); assert.deepEqual(ranks, ranks.map((_, i) => i + 1), "ranks must be 1..n");
assert.ok(!d.countries.ARE, "no position against itself");
console.log("investment: all assertions passed");
