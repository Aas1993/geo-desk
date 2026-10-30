// Tests for the influence ledger's pure logic: series maths, chart geometry, rivals, capture, the gaps and the PDF blocks.
import assert from "node:assert/strict";
import { CAP, biggestMove, captureRows, chartSvg, combinedSvg, geom, indexTo100, instrumentBars, ledgerBlocks, ledgerText, notHeld, rivalLedger, yoy } from "./lab/ledger";
import { uaeHistory } from "./desk/history";
import type { CaseData } from "./case/load";
import type { Pt } from "./case/core";

const sp = (name: string, series: Pt[]) => ({ met: { name }, has: true, series, proj: null, spine: { latest: null, change5: null, z: null, n: series.length }, region: null, uae: null });
const fixture = (over: Partial<CaseData> = {}): CaseData => ({
  asOf: "2026-10-30T00:00:00Z", iso3: "XXX", name: "Testland", nameAr: "تستلاند", flag: "", region: "R", subregion: null, deals: [{ d: "2026-01-01", t: "Deal <b>", by: ["A"], sector: null, u: "u" }], un: { uae: 0.8, usa: 0.3, chn: 0.7, rus: 0.6 }, partnership: { score: 50, rank: 10, n: 190, c: {}, raw: {} }, tone: null,
  instruments: [{ id: "trade", kind: "soft", name: { en: "Trade", ar: "التجارة" }, footprint: 3.2, headroom: 1.8, basis: { en: "b", ar: "ب" }, intensity: { en: "Maintain and test", ar: "أبقِ واختبر" } }, { id: "defence", kind: "hard", name: { en: "Defence", ar: "الدفاع" }, footprint: null, headroom: null, basis: { en: "b", ar: "ب" }, intensity: { en: "Measure first", ar: "قِس أولًا" } }],
  rivals: [{ iso: "CHN", share: 40 }, { iso: "IND", share: 20 }, { iso: "TUR", share: 6 }], uaeRank: { rank: 4, of: 14, share: 4.4 }, leverage: null,
  spine: [sp("Total and balance", [[2015, 100], [2016, 120], [2017, 90], [2018, 150]]), sp("UAE goods exports to the partner", [[2015, 60], [2018, 100]])],
  capture: { months: ["2026-10"], series: { ofac: [48], un: [2], dest: [4], deals12: [5], visits12: [20], ransom90: [64] } }, ...over } as unknown as CaseData);
const nameOf = (i: string) => ({ CHN: "China", IND: "India", TUR: "Türkiye", ARE: "UAE" })[i] ?? i;
let n = 0; const ok = (c: unknown, m: string) => { assert.ok(c, m); n++; };

// ---- series maths
assert.deepEqual(indexTo100([[2016, 20], [2015, 10], [2017, 5]]), [[2015, 100], [2016, 200], [2017, 50]]); n++;
assert.deepEqual(indexTo100([[2015, 0], [2016, 5], [2017, 10]]), [[2015, 0], [2016, 100], [2017, 200]], "a zero start is skipped for the base but the points are kept"); n++;
assert.deepEqual(indexTo100([[2015, 0], [2016, 0]]), []); n++;
const yy = yoy([[2015, 100], [2016, 150], [2017, 75]]); assert.equal(yy.length, 2); assert.equal(yy[0].pct, 50); assert.equal(yy[1].pct, -50); n += 3;
assert.deepEqual(yoy([[2015, 0], [2016, 5]]), [], "a zero base gives no percent"); n++;
const h = uaeHistory(fixture()); ok(h.series.some((s) => s.id === "trade"), "the trade series is built from the spine");
const tr = h.series.find((s) => s.id === "trade")!; assert.equal(tr.pts[0][1], 100 * 1e6, "trade is scaled from millions to dollars"); n++;
const bm = biggestMove(h.series); ok(bm && bm.id, "a biggest move is named"); assert.notEqual(bm!.id, "un", "the UN distance index is never the biggest percent move"); n++;
assert.equal(biggestMove([]), null); n++;

// ---- chart geometry
assert.equal(geom([[2015, 1]]), null, "one point is not a line"); n++;
const g = geom([[2015, 10], [2016, 30], [2017, 5], [2018, 20]], 200, 60)!; assert.ok(g.path.startsWith("M")); assert.equal(g.dots.length, 4); n += 2;
assert.deepEqual(g.dots.find((d) => d.pt[1] === 30)!.kinds, ["peak"]); assert.deepEqual(g.dots.find((d) => d.pt[1] === 5)!.kinds, ["trough"]); n += 2;
const g2 = geom([[2015, 5], [2016, 9]])!; assert.deepEqual(g2.dots.find((d) => d.pt[0] === 2015)!.kinds.sort(), ["first", "trough"]); assert.deepEqual(g2.dots.find((d) => d.pt[0] === 2016)!.kinds.sort(), ["last", "peak"]); n += 2;
const gz = geom([[2015, -5], [2016, 5]])!; ok(gz.zeroY != null, "a series crossing zero gets a zero line");
for (const d of g.dots) ok(d.x >= 0 && d.x <= 200 && d.y >= 0 && d.y <= 60, "dots are inside the box");
const flat = geom([[2015, 3], [2016, 3]])!; ok(isFinite(flat.dots[0].y), "a flat series does not divide by zero");
ok(chartSvg([[2015, 1], [2016, 2]], "#000").includes("<path"), "the chart is an svg string"); assert.equal(chartSvg([[2015, 1]], "#000"), ""); n++;
ok(combinedSvg(h.series).includes("<svg"), "the combined chart draws"); assert.equal(combinedSvg([]), ""); n++;

// ---- instruments, rivals, capture
const bars = instrumentBars(fixture(), "en"); assert.equal(bars.length, 2); assert.equal(bars[1].footprint, null, "an unmeasured instrument stays null, not zero"); assert.equal(instrumentBars(fixture(), "ar")[0].name, "التجارة"); n += 3;
const rl = rivalLedger(fixture(), nameOf); assert.equal(rl.rows[0].name, "China"); assert.equal(rl.rows.find((r) => r.isUae)!.share, 4.4); assert.equal(rl.gap, 35.6, "gap to the leader in points"); assert.equal(rl.uaeRank, 4); n += 4;
const rl2 = rivalLedger(fixture({ rivals: [{ iso: "ARE", share: 50 }, { iso: "CHN", share: 10 }], uaeRank: { rank: 1, of: 14, share: 50 } }), nameOf); assert.equal(rl2.gap, null, "no gap when the UAE leads"); assert.equal(rl2.rows.filter((r) => r.isUae).length, 1, "the UAE is not listed twice"); n += 2;
assert.equal(rivalLedger(fixture({ rivals: [], uaeRank: null }), nameOf).rows.length, 0); n++;
const caps = captureRows(fixture().capture); assert.equal(caps.length, 6); assert.equal(caps[0].latest, 48); assert.equal(caps[0].line, false, "one month is not a line"); n += 3;
assert.deepEqual(captureRows(null), []); n++;
assert.equal(captureRows({ months: ["2026-09", "2026-10"], series: { ofac: [40, 48] } })[0].line, true); n++;

// ---- gaps
const gaps = notHeld(fixture(), h, "en"); ok(gaps.some((x) => /Rivals/.test(x.what)), "rival series are named as not held"); ok(gaps.some((x) => /Monthly signals/.test(x.what)), "a one-month capture is named a gap"); ok(gaps.some((x) => /investment position/.test(x.what)), "a missing investment stock is named");
ok(CAP >= 2, "the capture line needs several months"); ok(notHeld(fixture(), h, "ar").every((x) => /[؀-ۿ]/.test(x.what)), "gaps are in Arabic");

// ---- PDF blocks and text
const bl = ledgerBlocks(fixture(), h, "en", nameOf, false); ok(bl.length >= 6, "blocks are produced"); ok(bl.join("").includes("not held"), "the gaps are in the PDF"); ok(bl.join("").includes("China"), "rival names are in the PDF"); ok(!bl.join("").includes("Deal <b>"), "text is escaped");
ok(ledgerBlocks(fixture(), h, "en", nameOf, true).join("").includes("indexed to 100"), "the indexed view adds the combined chart"); ok(ledgerBlocks(fixture(), h, "ar", nameOf).join("").includes("سجل نفوذ الإمارات"), "Arabic title");
const tx = ledgerText(fixture(), h, "en", nameOf); ok(tx.includes("Testland") && tx.includes("rank #4") && tx.includes("Not held over time"), "the text carries the facts and the gaps");
const empty = fixture({ spine: [], deals: [], rivals: [], uaeRank: null, capture: null }); const he = uaeHistory(empty); ok(ledgerBlocks(empty, he, "en", nameOf).join("").includes("What is not held"), "an empty country still renders with its gaps");
console.log(`lab-ledger tests passed: ${n} assertions`);
