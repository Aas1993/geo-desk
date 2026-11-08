// Tests for the financial-conditions corroboration: the agreement rules, the row builder, and the built data file.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rowVerdict, buildRows, type FinSources, type FinItem, type WbDict } from "./finsources";

// agreement rules: percentage points for ratios, a share of the value for levels, points of year-on-year change for indices
assert.equal(rowVerdict("pp", []), "none"); assert.equal(rowVerdict("pp", [4]), "single");
assert.equal(rowVerdict("pp", [4.1, 4.4]), "agree"); assert.equal(rowVerdict("pp", [11.3, 13.0]), "close"); assert.equal(rowVerdict("pp", [4, 9]), "differ");
assert.equal(rowVerdict("pp", [-0.2, 0.2]), "agree", "negative rates are compared, not dropped");
assert.equal(rowVerdict("rel", [3.67, 3.6725]), "agree"); assert.equal(rowVerdict("rel", [3.67, 4.2]), "differ");
assert.equal(rowVerdict("yoy", [0.4, 0.2]), "agree"); assert.equal(rowVerdict("yoy", [0.4, 3.3]), "close");

// the row builder: same-year comparison, other years listed but not compared, IMF-only and BIS-only rows are single readings
const wb: WbDict = { capital: { v: 11.3, y: 2024 }, npl: { v: 4.1, y: 2024 }, cpi: { v: 1.3, y: 2025 }, fx: { v: 3.67, y: 2025 } };
const f: FinItem = { fsi: { capAssets: { a: [[2024, 13.02], [2025, 12.29]], q: [["2025-Q4", 12.29], ["2026-Q1", 12.1]] }, npl: { a: [[2024, 4.24], [2025, 2.98]] }, roa: { a: [[2025, 2.15]] } }, cpi: { y: 2025, v: 1.25 }, fx: { y: 2025, v: 3.6725 }, neerImf: { p: "2026-M08", v: 164, yoy: 0.4 }, neerBis: { p: "2026-09", v: 108.57, yoy: 0.2 }, reerBis: { p: "2026-09", v: 101.43, yoy: 3.3 }, policyBis: { p: "2026-09", v: 4.5 } };
const rows = buildRows(wb, f); const by = (id: string) => rows.find((r) => r.id === id)!;
assert.equal(by("capital").verdict, "close"); assert.deepEqual(by("capital").cells.map((c) => `${c.s}:${c.when}:${c.compared}`), ["wb:2024:true", "imf_fsi:2024:true", "imf_fsi:2026-Q1:false"], "the IMF's figure for the World Bank's year is compared; its newer quarter is shown, not compared");
assert.equal(by("npl").verdict, "agree"); assert.equal(by("cpi").verdict, "agree"); assert.equal(by("fx").verdict, "agree");
assert.equal(by("roa").verdict, "single"); assert.equal(by("policy").verdict, "single"); assert.equal(by("reer").verdict, "single"); assert.equal(by("neer").verdict, "agree");
assert.ok(by("capital").cells.filter((c) => c.s === "imf_fsi").every((c) => c.derived), "derived ratios are marked");
const off = buildRows({ ...wb, capital: { v: 11.3, y: 2023 } }, f); assert.equal(off.find((r) => r.id === "capital")!.cells.find((c) => c.s === "imf_fsi")!.compared, false, "a different year is not compared with the World Bank's");
assert.equal(buildRows(null, undefined).length, 0, "no data gives no rows, not zeros");

// the built file
const m = JSON.parse(readFileSync(new URL("../../public/data/fin-sources.json", import.meta.url), "utf8")) as FinSources;
const countries = new Set((JSON.parse(readFileSync(new URL("../../public/data/countries.json", import.meta.url), "utf8")) as { iso3: string }[]).map((x) => x.iso3));
for (const iso of Object.keys(m.countries)) assert.ok(countries.has(iso), `unknown country ${iso}`);
for (const s of Object.values(m.sources)) { assert.ok(/^https:\/\//.test(s.url) && s.name && s.publisher && s.basis, `${s.id}: needs a name, publisher, basis and https link`); if (s.status === "ok") assert.ok(s.rows > 0, `${s.id}: ok but empty`); }
for (const u of m.unavailable) assert.ok(u.name && u.reason && /^https:\/\//.test(u.url), `unavailable source ${u.name} needs a reason and link`);
assert.ok(new Set(Object.values(m.sources).map((s) => s.publisher)).size === 2, "the IMF and the BIS");
for (const [iso, c] of Object.entries(m.countries)) {
  for (const set of Object.values(c.fsi ?? {})) for (const p of (Array.isArray(set) ? [set as unknown as [number, number][]] : [(set as { a?: [number, number][] }).a ?? []])) for (const pt of p) assert.ok(Number.isFinite(pt[1]), `${iso}: bad FSI value`);
  for (const k of ["capAssets", "regCap", "t1", "liq"] as const) for (const [, v] of c.fsi?.[k]?.a ?? []) assert.ok(v > -50 && v <= 100, `${iso} ${k}: ${v}% is implausible`);
  for (const k of ["neerImf", "reerImf", "neerBis", "reerBis"] as const) { const x = c[k]; if (x) assert.ok(x.v > 0 && x.v < 10000 && /^\d{4}-(M)?\d{2}$/.test(x.p), `${iso} ${k}: ${x.v} ${x.p}`); }
}
// the UAE: what the World Bank lacks, and values near the published numbers
const u = m.countries.ARE; assert.ok(u.fsi?.capAssets?.a?.length && u.fsi.regCap?.q?.length, "the IMF holds the UAE's bank balance sheet, annual and quarterly");
const q = u.fsi!.regCap!.q!; assert.ok(q[q.length - 1][0] >= "2025-Q4", "the UAE's latest quarter is newer than the World Bank's 2024");
assert.ok(u.fsi!.regCap!.a!.every(([, v]) => v > 14 && v < 22), "the UAE regulatory capital ratio is in the high teens");
assert.ok(u.reerBis && u.reerBis.v > 80 && u.reerBis.v < 130, "the BIS holds a UAE real effective exchange rate"); assert.equal(u.reerImf, undefined, "the IMF has none for the UAE and none may be invented"); assert.equal(u.policyBis, undefined, "the BIS has no UAE policy rate and none may be invented");
assert.ok(Math.abs(u.fx!.v - 3.6725) < 0.001, "the dirham peg"); assert.ok(m.unavailable.some((x) => /IRFCL/.test(x.name)) && m.unavailable.some((x) => /policy rates/.test(x.name)), "what could not be read is listed");
// the World Bank's own file is unchanged and its UAE values sit where the comparison expects them
const fin = JSON.parse(readFileSync(new URL("../../public/data/finconditions.json", import.meta.url), "utf8")) as { countries: Record<string, Record<string, { v: number; y: number }>> };
const ru = buildRows(fin.countries.ARE as WbDict, u); const cap = ru.find((r) => r.id === "capital")!; assert.ok(cap.cells.some((c) => c.s === "wb") && cap.cells.some((c) => c.s === "imf_fsi"), "the UAE capital row carries both sources");
console.log(`finsources: all assertions passed (${Object.keys(m.countries).length} countries, ${Object.keys(m.sources).length} sources)`);
