// Tests for the country score: stated rules, gaps left out of the overall, weights that move it, an illustrated PDF block.
import assert from "node:assert/strict";
import { ANGLES, PRESETS, band, scoreCountry } from "./bird/score";
import { scoreHtml } from "./bird/scoreHtml";
import type { CaseData } from "./case/load";

const met = (name: string, v: number, y = 2025) => ({ met: { domain: "x", name }, has: true, series: [], proj: null, spine: { latest: { y, v }, change5: null }, region: null, uae: null });
const d = { partnership: { score: 80, rank: 5, n: 200, c: { trade: 60, engagement: 70, agreements: 50, connectivity: 90, investment: 40, alignment: 95 }, raw: {} }, un: { uae: 0.9, usa: 0.4, chn: 0.7, rus: 0.6 }, power: [{ id: "hard", v: 2, en: "", ar: "", ev: "" }, { id: "soft", v: 3, en: "", ar: "", ev: "" }], tone: { n: 10, g: 1, coop: 0.8, tone: -1, trend: 0 }, uaeRank: { rank: 5, of: 101, share: 4 }, leverage: { theirs: 60, ours: 70, quadrant: "mutual" }, scorecard: null,
  spine: [met("Political stability", 60), met("Government effectiveness", 50), met("Control of corruption", 40), met("Real GDP growth", 2.5), met("Inflation, consumer prices", 3), met("Government gross debt, % of GDP", 80), met("Rule of law", 60), met("Regulatory quality", 55), met("Internet users, % of population", 95)] } as unknown as CaseData;
const x = { flightsLive: 3, visits12: 15, agreements: 30, cepa: "in-force" as const, hasMission: true };
const s = scoreCountry(d, x);
assert.equal(ANGLES.length, 14); assert.equal(s.angles.length, 14, "every angle is listed");
assert.equal(s.angles.find((a) => a.id === "political")!.score, 50, "mean of three governance percentiles (60, 50, 40)"); assert.equal(s.angles.find((a) => a.id === "economic")!.score, Math.round((((2.5 + 2) / 9) * 100 + 100 + (100 - ((80 - 40) / 80) * 100)) / 3), "growth, inflation and debt are scaled by their stated rules and the missing ones are left out");
assert.equal(s.angles.find((a) => a.id === "climate")!.score, null, "an angle with no data is not scored"); assert.ok(s.angles.find((a) => a.id === "climate")!.gap, "and says why");
assert.ok(s.angles.find((a) => a.id === "security")!.indicators[0].proxy, "the security proxy is labelled a proxy"); assert.ok(s.angles.find((a) => a.id === "tech")!.indicators[0].proxy);
assert.equal(s.angles.find((a) => a.id === "legal")!.indicators.find((i) => i.label === "CEPA status")!.score, 100);
const scored = s.angles.filter((a) => a.score != null); assert.equal(s.overall, Math.round(scored.reduce((t, a) => t + (a.score as number), 0) / scored.length), "the overall is the mean of the scored angles only"); assert.ok(s.coverage > 0 && s.coverage < 1);
const sec = scoreCountry(d, x, PRESETS.find((p) => p.id === "security")!.w); assert.notEqual(sec.overall, s.overall, "weights move the overall"); assert.equal(scoreCountry(d, x, Object.fromEntries(ANGLES.map((a) => [a.id, 0]))).overall, null, "all weights zero scores nothing");
const bare = scoreCountry({ ...d, spine: [], un: {}, partnership: null, tone: null, uaeRank: null, leverage: null, power: [] } as unknown as CaseData, { flightsLive: null, visits12: null, agreements: null, cepa: null, hasMission: null }); assert.equal(bare.overall, null, "a country with nothing held has no overall score, not zero"); assert.equal(bare.coverage, 0);
assert.equal(band(80), "strong"); assert.equal(band(60), "solid"); assert.equal(band(45), "mixed"); assert.equal(band(10), "fragile"); assert.equal(band(null), "none");
const html = scoreHtml(s, "en"); assert.ok(html.includes("<svg") && html.includes("The country score") && html.includes("not scored: no data") && html.includes("proxy")); assert.ok(scoreHtml(s, "ar").includes("درجة الدولة"));
console.log("score: all checks passed");
