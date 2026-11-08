// Run with: npx tsx src/lib/intel.test.ts
// Guards the trade, outlook and partnership snapshots and the maths that turns them into numbers on screen.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cepaEffect, exportDemand, outlookRank, tradeSummary, type OutlookData, type PartnershipData, type TradeData } from "./intel-client";
const read = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const iso = new Set((read("../../public/data/countries.json") as { iso3: string }[]).map((c) => c.iso3));
const t = read("../../public/data/trade.json") as TradeData, o = read("../../public/data/outlook.json") as OutlookData, p = read("../../public/data/partnership.json") as PartnershipData;

// trade
assert.ok(Object.keys(t.countries).length >= 120 && t.lastYear >= 2024, "trade snapshot looks thin or stale");
for (const [k, r] of Object.entries(t.countries)) { assert.ok(iso.has(k), `unknown country ${k}`); assert.ok(r.a.length > 0); for (const [y, x, m] of r.a) { assert.ok(y >= 2012 && y <= 2030 && x >= 0 && m >= 0, `${k}: bad row`); } }
const wTotal = t.world.a.at(-1)!; assert.ok(wTotal[1] + wTotal[2] > 5e5, "UAE world goods trade should exceed US$500bn");
const ind = tradeSummary(t, "IND")!; assert.ok(ind.total > 80_000 && ind.rank <= 3, `India should be a top-3 partner, got #${ind.rank}`); assert.ok(ind.share > 3 && ind.share < 20);
// CEPA effect: needs a full year after entry into force, otherwise it declines to judge
assert.equal(cepaEffect(t, "KOR", "2026-05-01"), null, "a CEPA from this year must not be judged");
const e = cepaEffect(t, "IND", "2022-05-01")!; assert.ok(e && e.baseYears.join() === "2020,2021" && Math.abs(e.effect - (e.partnerGrowth - e.worldGrowth)) < 1e-9, "CEPA effect arithmetic");

// outlook
assert.ok(Object.keys(o.countries).length >= 150, "outlook too thin"); for (const [k, r] of Object.entries(o.countries)) { assert.ok(iso.has(k)); if (r.growth) for (const v of Object.values(r.growth)) assert.ok(v > -60 && v < 80, `${k}: growth ${v} out of range`); }
assert.ok(o.countries.ARE.growth?.[2027] != null && (o.countries.ARE.gdp?.[2025] ?? 0) > 300_000, "UAE outlook missing"); const rk = outlookRank(o, "ARE", "growth", 2027); assert.ok(rk && rk.rank >= 1 && rk.rank <= rk.of);
const dem = exportDemand(t, o, [2026, 2027]); assert.ok(dem.coverage > 0.5, `export demand covers only ${dem.coverage}`); assert.ok(dem.weighted[2027] != null && Math.abs(dem.weighted[2027]!) < 15);

// partnership index
assert.equal(p.n, iso.size - 1, "one score per country except the UAE"); assert.equal(Object.values(p.weights).reduce((a, b) => a + b, 0), 100, "weights must sum to 100");
const rows = Object.values(p.countries); assert.ok(rows.every((r) => r.score >= 0 && r.score <= 100 && Object.values(r.c).every((v) => v >= 0 && v <= 100)), "scores out of range");
for (const [k, r] of Object.entries(p.countries)) assert.equal(r.rank, 1 + rows.filter((x) => x.score > r.score).length, `${k}: rank must be 1 + the number of higher scores (equal scores share a rank)`);
for (const [k, r] of Object.entries(p.countries)) { const calc = Math.round(Object.entries(r.c).reduce((s, [c, v]) => s + (p.weights[c] * v) / 100, 0)); assert.equal(r.score, calc, `${k}: score is not the weighted sum of its components`); }
assert.ok(["SAU", "IND", "CHN", "USA"].every((k) => p.countries[k].rank <= 8), "the UAE's biggest partners should rank near the top"); assert.ok(!p.countries.ARE);
console.log("intel: all assertions passed");
