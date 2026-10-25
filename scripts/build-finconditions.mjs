// Builds public/data/finconditions.json: financial-conditions indicators per country from the World Bank World Development Indicators (source 2), latest value plus a short series.
// Source: World Bank WDI, open licence CC BY 4.0, via the World Bank API. Annual data published with a lag; a country with no value for an indicator simply has no entry for it (nothing is filled in).
// Indicators the Bank does not publish for the UAE (real interest rate, lending rate, external debt, real effective exchange rate) are NOT in this file and the desk shows them as "not connected".
// Usage: node scripts/build-finconditions.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { prevOf, thin } from "./prev.mjs";
const IND = {
  credit: ["FS.AST.PRVT.GD.ZS", "Domestic credit to the private sector, % of GDP"],
  npl: ["FB.AST.NPER.ZS", "Bank non-performing loans, % of gross loans"],
  capital: ["FB.BNK.CAPA.ZS", "Bank capital to assets, %"],
  fx: ["PA.NUS.FCRF", "Official exchange rate, local currency per US$ (period average)"],
  resMonths: ["FI.RES.TOTL.MO", "Total reserves in months of imports"],
  res: ["FI.RES.TOTL.CD", "Total reserves including gold, current US$"],
  money: ["FM.LBL.BMNY.GD.ZS", "Broad money, % of GDP"],
  cpi: ["FP.CPI.TOTL.ZG", "Inflation, consumer prices, annual %"],
};
const FROM = 2012;
const countries = JSON.parse(readFileSync(new URL("../public/data/countries.json", import.meta.url), "utf8")); const valid = new Set(countries.map((c) => c.iso3));
const out = {}; let year = 0; const cover = {};
for (const [k, [id]] of Object.entries(IND)) {
  // The bulk response is large and the Bank's API is slow at times, so it is read a page at a time, each page retried.
  const page = async (n) => { for (let t = 0; t < 4; t++) { try { const r = await fetch(`https://api.worldbank.org/v2/country/all/indicator/${id}?format=json&per_page=3000&page=${n}&date=${FROM}:${new Date().getUTCFullYear()}&source=2`, { signal: AbortSignal.timeout(90_000) }); if (r.ok) return await r.json(); } catch { /* retry */ } } throw new Error(`${id} page ${n} failed`); };
  const first = await page(1); let all = first[1] ?? []; for (let n = 2; n <= (first[0]?.pages ?? 1); n++) all = all.concat((await page(n))[1] ?? []);
  const rows = all.filter((x) => valid.has(x.countryiso3code) && x.value != null);
  const by = {}; for (const x of rows) { const s = (by[x.countryiso3code] ??= {}); const y = +x.date; if (!(y in s)) s[y] = x.value; }
  cover[k] = Object.keys(by).length;
  for (const [iso, s] of Object.entries(by)) {
    const ys = Object.keys(s).map(Number).sort((a, b) => a - b); const last = ys[ys.length - 1];
    const dp = k === "res" || k === "fx" ? 2 : 1; const round = (v) => (k === "res" ? Math.round(v) : Math.round(v * 10 ** dp) / 10 ** dp);
    (out[iso] ??= {})[k] = { v: round(s[last]), y: last, s: ys.map((y) => [y, round(s[y])]) }; year = Math.max(year, last);
  }
}
const n = Object.keys(out).length; const prev = prevOf("finconditions.json", (j) => Object.keys(j.countries).length);
if (n < 150 || thin(n, prev, 0.95) || year < 2023) { console.error(`REFUSING TO WRITE: ${n} countries, latest year ${year}`); process.exit(1); }
writeFileSync(new URL("../public/data/finconditions.json", import.meta.url), JSON.stringify({ built: new Date().toISOString(), year, n, coverage: cover, indicators: Object.fromEntries(Object.entries(IND).map(([k, [id, name]]) => [k, { id, name }])), source: { name: "World Bank World Development Indicators", url: "https://databank.worldbank.org/source/world-development-indicators", licence: "CC BY 4.0" }, countries: out }));
console.log("countries", n, "year", year, "| coverage", JSON.stringify(cover), "| ARE", JSON.stringify(Object.fromEntries(Object.entries(out.ARE ?? {}).map(([k, v]) => [k, `${v.v} (${v.y})`]))));
